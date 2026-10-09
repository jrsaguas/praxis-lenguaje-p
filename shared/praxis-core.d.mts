export type Token = { kind: "keyword" | "identifier" | "string" | "number" | "symbol" | "newline" | "eof" | "invalid"; value: string; line: number; column: number };
export type Diagnostic = { message: string; line: number; column: number; severity: "error" | "warning" };
export type Statement = { type: string; name?: string; target?: string; value?: unknown; args?: unknown; line: number; properties?: Array<{key:string;value:unknown;line:number;column:number}> };
export type Parsed = { ast: { type: "Program"; version: "0.4.0"; statements: Statement[] }; diagnostics: Diagnostic[]; tokens: Token[] };
export function tokenize(source: string): Token[];
export function parse(source: string): Parsed;
export function toRuntimeProgram(parsed: Parsed): { variables: Record<string, unknown>; blocks: Array<{type:string;name:string;properties:Record<string,unknown>;line:number}>; trace: Array<Record<string,unknown>>; diagnostics: Diagnostic[]; ast: Parsed["ast"]; tokens: Token[] };
