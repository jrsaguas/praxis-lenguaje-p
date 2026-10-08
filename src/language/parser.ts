import { tokenize, type Token } from "./tokenizer";

export type Value = unknown;
export type Property = { key: string; value: Value; line: number; column: number };
export type BlockType = "Agent" | "Tool" | "Memory" | "Evidence" | "Guard" | "Parallel";
export type Statement =
  | { type: "Let"; name: string; value: Value; line: number }
  | { type: BlockType; name: string; properties: Property[]; line: number }
  | { type: "Run"; target: string; args?: Value; line: number };
export type Program = { type: "Program"; version: "0.3.0"; statements: Statement[] };
export type ParseDiagnostic = { message: string; line: number; column: number; severity: "error" | "warning" };

export function parse(source: string): { ast: Program; diagnostics: ParseDiagnostic[]; tokens: Token[] } {
  const tokens = tokenize(source);
  const diagnostics: ParseDiagnostic[] = [];
  const statements: Statement[] = [];
  let i = 0;

  const blockTypes: Record<string, BlockType> = {
    agent: "Agent", tool: "Tool", memory: "Memory", evidence: "Evidence", guard: "Guard", parallel: "Parallel"
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
    const t = current();
    if (!t) return null;
    if (t.kind === "string") { i++; return t.value; }
    if (t.kind === "number") { i++; return Number(t.value); }
    if (t.value === "true" || t.value === "false") { i++; return t.value === "true"; }
    if (t.value === "[") {
      i++;
      const values: Value[] = [];
      skip();
      while (current() && current().value !== "]" && current().kind !== "eof") {
        values.push(readValue());
        skip();
        if (current()?.value === ",") { i++; skip(); } else break;
      }
      expect("]");
      return values;
    }
    if (t.kind === "identifier" || t.kind === "keyword") { i++; return { ref: t.value }; }
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
      i++;
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
        i++;
        // Praxis-P acepta ambas formas: key: value y key value.
        if (current()?.value === ":") i++;
        const value = readValue();
        properties.push({ key, value, line: keyToken?.line ?? t.line, column: keyToken?.column ?? t.column });
        skip();
      }
      expect("}");
      statements.push({ type: blockType, name, properties, line: t.line } as Statement);
      continue;
    }

    if (t.value === "run") {
      i++;
      const target = current()?.value ?? "";
      if (!target) diag("Se esperaba el objetivo de run");
      i++;
      let args: Value | undefined;
      if (current()?.value === "with") { i++; args = readValue(); }
      statements.push({ type: "Run", target, ...(args === undefined ? {} : { args }), line: t.line });
      continue;
    }

    diag(`Instrucción desconocida: ${t.value}`);
    while (current() && current()?.kind !== "newline" && current()?.kind !== "eof") i++;
  }

  const names = new Map<string, Statement>();
  for (const s of statements) {
    if ("name" in s) {
      if (names.has(s.name)) diagnostics.push({ message: `Nombre duplicado: ${s.name}`, line: s.line, column: 1, severity: "error" });
      names.set(s.name, s);
    }
  }
  for (const s of statements) {
    if (s.type === "Run" && !names.has(s.target)) diagnostics.push({ message: `Objetivo no resuelto: ${s.target}`, line: s.line, column: 1, severity: "error" });
  }

  return { ast: { type: "Program", version: "0.3.0", statements }, diagnostics, tokens };
}
