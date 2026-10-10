const KEYWORDS = new Set("agent run let role goal memory cycle tool evidence policy parallel guard input output permission limit source claim confidence condition on allow deny steps mode requires test contract required true false with".split(" "));
const BLOCK_TYPES = { agent: "Agent", tool: "Tool", memory: "Memory", evidence: "Evidence", guard: "Guard", parallel: "Parallel" };
const isIdentifierStart = (c) => /[A-Za-z_]/.test(c ?? "");
const isIdentifierPart = (c) => /[A-Za-z0-9_-]/.test(c ?? "");

export function tokenize(source) {
  const tokens = [];
  let i = 0, line = 1, column = 1;
  const push = (kind, value, tokenLine = line, tokenColumn = column) =>
    tokens.push({ kind, value, line: tokenLine, column: tokenColumn });

  while (i < source.length) {
    const c = source[i];
    if (" \t\r".includes(c)) { i++; column++; continue; }
    if (c === "\n") { push("newline", "\n"); i++; line++; column = 1; continue; }
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") { i++; column++; }
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c, startLine = line, startColumn = column;
      let value = "", closed = false;
      i++; column++;
      while (i < source.length) {
        const current = source[i];
        if (current === quote) { i++; column++; closed = true; break; }
        if (current === "\n") { line++; column = 1; value += "\n"; i++; continue; }
        if (current === "\\" && i + 1 < source.length) {
          const next = source[i + 1];
          const escapes = { n: "\n", r: "\r", t: "\t", "\\": "\\", '"': '"', "'": "'" };
          value += Object.prototype.hasOwnProperty.call(escapes, next) ? escapes[next] : next;
          i += 2; column += 2; continue;
        }
        value += current; i++; column++;
      }
      push("string", value, startLine, startColumn);
      if (!closed) push("invalid", "Cadena sin cerrar", startLine, startColumn);
      continue;
    }
    if (/[0-9]/.test(c)) {
      const startColumn = column, startLine = line;
      let value = "";
      while (i < source.length && /[0-9.]/.test(source[i])) { value += source[i++]; column++; }
      push("number", value, startLine, startColumn);
      if (!/^(?:\d+)(?:\.\d+)?$/.test(value)) push("invalid", "Número no válido: " + value, startLine, startColumn);
      continue;
    }
    if (isIdentifierStart(c)) {
      const startColumn = column, startLine = line;
      let value = "";
      while (i < source.length && isIdentifierPart(source[i])) value += source[i++], column++;
      push(KEYWORDS.has(value) ? "keyword" : "identifier", value, startLine, startColumn);
      continue;
    }
    if ("{}[]():,=".includes(c)) { push("symbol", c); i++; column++; continue; }
    push("invalid", "Carácter no reconocido: " + c);
    i++; column++;
  }
  push("eof", "");
  return tokens;
}

export function parse(source) {
  const tokens = tokenize(source), diagnostics = [], statements = [];
  let i = 0;
  const current = () => tokens[i];
  const skipNewlines = () => { while (current()?.kind === "newline") i++; };
  const diagnose = (message, token = current()) => {
    const at = token ?? tokens[tokens.length - 1];
    diagnostics.push({ message, line: at.line, column: at.column, severity: "error" });
  };
  const expect = (value) => {
    if (current()?.value === value) { i++; return true; }
    diagnose('Se esperaba "' + value + '" y se encontró "' + (current()?.value || "fin de archivo") + '"');
    return false;
  };

  for (const token of tokens) if (token.kind === "invalid") diagnose(token.value, token);

  function parseValue() {
    skipNewlines();
    const token = current();
    if (!token || token.kind === "eof") { diagnose("Se esperaba un valor", token); return null; }
    if (token.kind === "string") { i++; return token.value; }
    if (token.kind === "number") { i++; return Number(token.value); }
    if (token.value === "true" || token.value === "false") { i++; return token.value === "true"; }
    if (token.value === "[") {
      i++; const values = []; skipNewlines();
      while (current() && current().value !== "]" && current().kind !== "eof") {
        const before = i;
        values.push(parseValue()); skipNewlines();
        if (current()?.value === ",") { i++; skipNewlines(); }
        else if (current()?.value !== "]") {
          diagnose('Se esperaba "," o "]" en la lista');
          while (current() && current().kind !== "newline" && current().value !== "]" && current().kind !== "eof") i++;
        }
        if (i === before) i++;
      }
      expect("]"); return values;
    }
    if (token.value === "{") {
      i++; const object = {}; skipNewlines();
      while (current() && current().value !== "}" && current().kind !== "eof") {
        const key = current();
        if (!["identifier", "keyword", "string"].includes(key.kind)) {
          diagnose("Se esperaba una propiedad en el objeto", key); i++; skipNewlines(); continue;
        }
        i++;
        if (current()?.value === ":") i++; else diagnose('Se esperaba ":" después de la propiedad', current());
        if (Object.prototype.hasOwnProperty.call(object, key.value)) diagnose("Propiedad duplicada: " + key.value, key);
        object[key.value] = parseValue(); skipNewlines();
        if (current()?.value === ",") { i++; skipNewlines(); }
        else if (current()?.value !== "}" && current()?.kind !== "eof") {
          diagnose('Se esperaba "," o "}" después del valor');
          while (current() && current().kind !== "newline" && current().value !== "}" && current().kind !== "eof") i++;
          skipNewlines();
        }
      }
      expect("}"); return object;
    }
    if (token.kind === "identifier" || token.kind === "keyword") {
      i++;
      if (current()?.value === "(") {
        i++; const args = []; skipNewlines();
        while (current() && current().value !== ")" && current().kind !== "eof") {
          const before = i; args.push(parseValue()); skipNewlines();
          if (current()?.value === ",") { i++; skipNewlines(); }
          else if (current()?.value !== ")") {
            diagnose('Se esperaba "," o ")" en argumentos');
            while (current() && current().kind !== "newline" && current().value !== ")" && current().kind !== "eof") i++;
          }
          if (i === before) i++;
        }
        expect(")"); return { call: token.value, args };
      }
      return { ref: token.value };
    }
    diagnose("Valor no válido: " + token.value, token); i++; return null;
  }

  while (i < tokens.length && current()?.kind !== "eof") {
    skipNewlines();
    const token = current();
    if (!token || token.kind === "eof") break;
    if (token.value === "let") {
      i++; const nameToken = current(), name = nameToken?.value ?? "";
      if (nameToken?.kind !== "identifier") diagnose("Se esperaba un identificador después de let", nameToken);
      else i++;
      expect("=");
      statements.push({ type: "Let", name, value: parseValue(), line: token.line });
      continue;
    }
    if (BLOCK_TYPES[token.value]) {
      i++; let name = token.value + "_" + (statements.length + 1);
      if (current()?.value !== "{") {
        const nameToken = current();
        if (nameToken?.kind === "identifier") { name = nameToken.value; i++; }
        else if (token.value !== "parallel") diagnose("Se esperaba el nombre para " + token.value, nameToken);
      }
      expect("{");
      const properties = [];
      while (current() && current().value !== "}" && current().kind !== "eof") {
        skipNewlines();
        if (current()?.value === "}" || current()?.kind === "eof") break;
        const key = current();
        if (!["identifier", "keyword"].includes(key.kind)) {
          diagnose("Se esperaba el nombre de una propiedad", key);
          while (current() && current().kind !== "newline" && current().value !== "}" && current().kind !== "eof") i++;
          continue;
        }
        i++;
        if (current()?.value === ":") i++; else diagnose('Se esperaba ":" después del nombre de propiedad');
        const value = parseValue();
        if (properties.some(property => property.key === key.value)) diagnose("Propiedad duplicada: " + key.value, key);
        properties.push({ key: key.value, value, line: key.line, column: key.column });
        skipNewlines();
      }
      expect("}");
      statements.push({ type: BLOCK_TYPES[token.value], name, properties, line: token.line });
      continue;
    }
    if (token.value === "run") {
      i++; const targetToken = current(), target = targetToken?.value ?? "";
      if (!target || targetToken?.kind === "eof" || targetToken?.kind === "newline") diagnose("Se esperaba el objetivo de run", targetToken);
      else i++;
      let args;
      if (current()?.value === "with") { i++; args = parseValue(); }
      statements.push({ type: "Run", target, ...(args === undefined ? {} : { args }), line: token.line });
      continue;
    }
    diagnose("Instrucción desconocida: " + token.value, token);
    while (current() && current().kind !== "newline" && current().kind !== "eof") i++;
  }

  const declarations = new Map();
  for (const statement of statements) if ("name" in statement) {
    if (declarations.has(statement.name)) diagnose("Nombre duplicado: " + statement.name, { line: statement.line, column: 1 });
    else declarations.set(statement.name, statement);
  }
  for (const statement of statements) if (statement.type === "Run" && !declarations.has(statement.target)) {
    diagnose("Objetivo no resuelto: " + statement.target, { line: statement.line, column: 1 });
  }
  return { ast: { type: "Program", version: "0.4.0", statements }, diagnostics, tokens };
}

function resolveValue(value, variables) {
  if (Array.isArray(value)) return value.map(item => resolveValue(item, variables));
  if (value && typeof value === "object") {
    if (typeof value.ref === "string" && Object.prototype.hasOwnProperty.call(variables, value.ref)) return variables[value.ref];
    if (value.ref) return value;
    if (value.call) return { call: value.call, args: resolveValue(value.args ?? [], variables) };
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, variables)]));
  }
  return value;
}

export function toRuntimeProgram(parsed) {
  const variables = {}, blocks = [], trace = [];
  for (const statement of parsed.ast.statements) {
    if (statement.type === "Let") {
      variables[statement.name] = resolveValue(statement.value, variables);
      trace.push({ event: "variable.set", line: statement.line, name: statement.name, status: "ok" });
      continue;
    }
    if (statement.type === "Run") {
      trace.push({ event: "run.requested", line: statement.line, target: statement.target, args: resolveValue(statement.args ?? {}, variables), status: "pending" });
      continue;
    }
    const type = statement.type.toLowerCase();
    const properties = Object.fromEntries(statement.properties.map(property => [property.key, resolveValue(property.value, variables)]));
    blocks.push({ type, name: statement.name, properties, line: statement.line });
    trace.push({ event: "block.declared", line: statement.line, block: type, name: statement.name, status: "ok" });
    for (const property of statement.properties) trace.push({ event: "property.read", line: property.line, block: statement.name, key: property.key, status: "ok" });
  }
  return { variables, blocks, trace, diagnostics: parsed.diagnostics, ast: parsed.ast, tokens: parsed.tokens };
}
