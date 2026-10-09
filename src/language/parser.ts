import { tokenize, type Token } from "./tokenizer";

export type Value = unknown;
export type Property = { key: string; value: Value; line: number; column: number };
export type BlockType = "Agent" | "Tool" | "Memory" | "Evidence" | "Guard" | "Parallel";
export type Statement =
  | { type: "Let"; name: string; value: Value; line: number }
  | { type: BlockType; name: string; properties: Property[]; line: number }
  | { type: "Run"; target: string; args?: Value; line: number };
export type Program = { type: "Program"; version: "0.4.0"; statements: Statement[] };
export type ParseDiagnostic = { message: string; line: number; column: number; severity: "error" | "warning" };

export function parse(source: string): { ast: Program; diagnostics: ParseDiagnostic[]; tokens: Token[] } {
  const tokens = tokenize(source);
  const diagnostics: ParseDiagnostic[] = [];
  const statements: Statement[] = [];
  let i = 0;

  const blockTypes: Record<string, BlockType> = {
    agent: "Agent", tool: "Tool", memory: "Memory", evidence: "Evidence", guard: "Guard", parallel: "Parallel",
  };
  const current = () => tokens[i];
  const skip = () => { while (current()?.kind === "newline") i++; };
  const diag = (message: string, token = current()) => {
    const t = token ?? tokens[tokens.length - 1];
    diagnostics.push({ message, line: t.line, column: t.column, severity: "error" });
  };
  const expect = (value: string) => {
    if (current()?.value === value) { i++; return true; }
    diag(`Se esperaba "${value}" y se encontró "${current()?.value || "fin"}"`);
    return false;
  };

  const readValue = (): Value => {
    skip();
    const t = current();
    if (!t || t.kind === "eof") return null;
    if (t.kind === "string") { i++; return t.value; }
    if (t.kind === "number") { i++; return Number(t.value); }
    if (t.value === "true" || t.value === "false") { i++; return t.value === "true"; }

    if (t.value === "[") {
      i++;
      const values: Value[] = [];
      skip();
      while (current() && current().value !== "]" && current().kind !== "eof") {
        const before = i;
        values.push(readValue());
        skip();
        if (current()?.value === ",") { i++; skip(); }
        else if (current()?.value !== "]") {
          diag('Se esperaba "," o "]" en la lista');
          if (i === before) i++;
          break;
        }
      }
      expect("]");
      return values;
    }

    if (t.value === "{") {
      i++;
      const value: Record<string, Value> = {};
      skip();
      while (current() && current().value !== "}" && current().kind !== "eof") {
        const before = i;
        const keyToken = current();
        if (keyToken.kind !== "identifier" && keyToken.kind !== "keyword" && keyToken.kind !== "string") {
          diag("Se esperaba el nombre de una propiedad en el objeto");
          i++;
          skip();
          continue;
        }
        const key = keyToken.value;
        i++;
        if (current()?.value === ":") i++;
        else diag('Se esperaba ":" después de la propiedad', current());
        value[key] = readValue();
        skip();
        if (current()?.value === ",") { i++; skip(); }
        else if (current()?.value !== "}") {
          // Newlines may separate object properties; commas are optional between lines.
          if (current()?.line === keyToken.line) {
            diag('Se esperaba "," o "}" después del valor');
            if (i === before) i++;
          }
        }
      }
      expect("}");
      return value;
    }

    if (t.kind === "identifier" || t.kind === "keyword") {
      i++;
      if (current()?.value === "(") {
        i++;
        const args: Value[] = [];
        skip();
        while (current() && current().value !== ")" && current().kind !== "eof") {
          const before = i;
          args.push(readValue());
          skip();
          if (current()?.value === ",") { i++; skip(); }
          else if (current()?.value !== ")") {
            diag('Se esperaba "," o ")" en los argumentos');
            if (i === before) i++;
            break;
          }
        }
        expect(")");
        return { call: t.value, args };
      }
      return { ref: t.value };
    }

    diag(`Valor no válido: ${t.value}`);
    i++;
    return null;
  };

  while (i < tokens.length && current()?.kind !== "eof") {
    skip();
    const t = current();
    if (!t || t.kind === "eof") break;

    if (t.value === "let") {
      i++;
      const name = current()?.value ?? "";
      if (current()?.kind !== "identifier") diag("Se esperaba un identificador después de let");
      if (current()?.kind !== "eof") i++;
      expect("=");
      statements.push({ type: "Let", name, value: readValue(), line: t.line });
      continue;
    }

    const blockType = blockTypes[t.value];
    if (blockType) {
      i++;
      const name = current()?.value ?? `${t.value}_${statements.length + 1}`;
      if (blockType !== "Parallel" && current()?.kind !== "identifier") diag(`Se esperaba el nombre para ${t.value}`);
      if (current()?.kind === "identifier") i++;
      expect("{");

      const properties: Property[] = [];
      while (current() && current().value !== "}" && current().kind !== "eof") {
        skip();
        if (current()?.value === "}") break;
        const keyToken = current();
        const key = keyToken?.value ?? "";
        if (!keyToken || keyToken.kind === "eof") break;
        i++;
        if (current()?.value === ":") i++;
        else diag('Se esperaba ":" después del nombre de propiedad', current());
        const value = readValue();
        properties.push({ key, value, line: keyToken.line, column: keyToken.column });
        skip();
      }
      expect("}");
      statements.push({ type: blockType, name, properties, line: t.line } as Statement);
      continue;
    }

    if (t.value === "run") {
      i++;
      const targetToken = current();
      const target = targetToken?.value ?? "";
      if (!target) diag("Se esperaba el objetivo de run");
      if (targetToken?.kind !== "eof") i++;
      let args: Value | undefined;
      if (current()?.value === "with") { i++; args = readValue(); }
      statements.push({ type: "Run", target, ...(args === undefined ? {} : { args }), line: t.line });
      continue;
    }

    diag(`Instrucción desconocida: ${t.value}`);
    while (current() && current()?.kind !== "newline" && current()?.kind !== "eof") i++;
  }

  const names = new Map<string, Statement>();
  for (const statement of statements) {
    if ("name" in statement) {
      if (names.has(statement.name)) diagnostics.push({ message: `Nombre duplicado: ${statement.name}`, line: statement.line, column: 1, severity: "error" });
      names.set(statement.name, statement);
    }
  }
  for (const statement of statements) {
    if (statement.type === "Run" && !names.has(statement.target)) {
      diagnostics.push({ message: `Objetivo no resuelto: ${statement.target}`, line: statement.line, column: 1, severity: "error" });
    }
  }

  return { ast: { type: "Program", version: "0.4.0", statements }, diagnostics, tokens };
}
