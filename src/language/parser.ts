import { tokenize, type Token } from "./tokenizer";

export type Property = { key: string; value: unknown };
export type Statement =
  | { type: "Let"; name: string; value: unknown }
  | { type: "Agent"; name: string; properties: Property[] }
  | { type: "Run"; agent: string; with?: Record<string, unknown> };
export type Program = { type: "Program"; statements: Statement[] };
export type ParseDiagnostic = { message: string; line: number; column: number; severity: "error" | "warning" };

export function parse(source: string): { ast: Program; diagnostics: ParseDiagnostic[]; tokens: Token[] } {
  const tokens = tokenize(source);
  const diagnostics: ParseDiagnostic[] = [];
  const statements: Statement[] = [];
  let i = 0;

  const skip = () => { while (tokens[i]?.kind === "newline") i++; };
  const current = () => tokens[i];

  const expect = (value: string) => {
    if (current()?.value === value) { i++; return true; }
    const t = current() ?? tokens[tokens.length - 1];
    diagnostics.push({ message: `Se esperaba "${value}" y se encontró "${t.value || "fin"}"`, line: t.line, column: t.column, severity: "error" });
    return false;
  };

  const readValue = (): unknown => {
    const t = current();
    if (!t) return null;
    if (t.kind === "string" || t.kind === "number") { i++; return t.kind === "number" ? Number(t.value) : t.value; }
    if (t.kind === "identifier" || t.kind === "keyword") {
      if (t.value === "true" || t.value === "false") { i++; return t.value === "true"; }
      if (t.value === "[") return readList();
      i++; return { ref: t.value };
    }
    if (t.value === "[") return readList();
    diagnostics.push({ message: `Valor no válido: ${t.value}`, line: t.line, column: t.column, severity: "error" });
    i++; return null;
  };

  const readList = () => {
    const values: unknown[] = [];
    expect("[");
    while (current() && current().value !== "]") {
      values.push(readValue());
      if (current()?.value === ",") i++; else if (current()?.value !== "]") break;
    }
    expect("]");
    return values;
  };

  while (i < tokens.length && current()?.kind !== "eof") {
    skip();
    const t = current();
    if (!t || t.kind === "eof") break;

    if (t.value === "let") {
      i++;
      const name = current()?.value ?? "";
      if (current()?.kind !== "identifier") diagnostics.push({ message: "Se esperaba un identificador después de let", line: t.line, column: t.column, severity: "error" });
      i++;
      expect("=");
      statements.push({ type: "Let", name, value: readValue() });
      continue;
    }

    if (t.value === "agent") {
      i++;
      const name = current()?.value ?? "";
      if (current()?.kind !== "identifier") diagnostics.push({ message: "Se esperaba el nombre del agente", line: t.line, column: t.column, severity: "error" });
      i++;
      expect("{");
      const properties: Property[] = [];
      while (current() && current().value !== "}" && current().kind !== "eof") {
        skip();
        if (current()?.value === "}") break;
        const key = current()?.value ?? "";
        i++;
        properties.push({ key, value: readValue() });
        skip();
      }
      expect("}");
      statements.push({ type: "Agent", name, properties });
      continue;
    }

    if (t.value === "run") {
      i++;
      const agent = current()?.value ?? "";
      i++;
      let withValue: Record<string, unknown> | undefined;
      if (current()?.value === "with") {
        i++;
        const v = readValue();
        if (v && typeof v === "object" && !Array.isArray(v) && "ref" in v) withValue = { value: v };
      }
      statements.push({ type: "Run", agent, ...(withValue ? { with: withValue } : {}) });
      continue;
    }

    diagnostics.push({ message: `Instrucción desconocida: ${t.value}`, line: t.line, column: t.column, severity: "error" });
    while (current() && current()?.kind !== "newline" && current()?.kind !== "eof") i++;
  }

  return { ast: { type: "Program", statements }, diagnostics, tokens };
}
