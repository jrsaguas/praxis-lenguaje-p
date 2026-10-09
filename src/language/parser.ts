import { parse as parseCore, tokenize as tokenizeCore } from "../../shared/praxis-core.mjs";

export type Value = unknown;
export type Property = { key: string; value: Value; line: number; column: number };
export type BlockType = "Agent" | "Tool" | "Memory" | "Evidence" | "Guard" | "Parallel";
export type Statement =
  | { type: "Let"; name: string; value: Value; line: number }
  | { type: BlockType; name: string; properties: Property[]; line: number }
  | { type: "Run"; target: string; args?: Value; line: number };
export type Program = { type: "Program"; version: "0.4.0"; statements: Statement[] };
export type ParseDiagnostic = { message: string; line: number; column: number; severity: "error" | "warning" };
export type Token = { kind: "keyword" | "identifier" | "string" | "number" | "symbol" | "newline" | "eof" | "invalid"; value: string; line: number; column: number };
export function tokenize(source: string): Token[] { return tokenizeCore(source) as Token[]; }
export function parse(source: string): { ast: Program; diagnostics: ParseDiagnostic[]; tokens: Token[] } {
  return parseCore(source) as { ast: Program; diagnostics: ParseDiagnostic[]; tokens: Token[] };
}
