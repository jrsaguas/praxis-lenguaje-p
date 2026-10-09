import { parse, toRuntimeProgram } from "./praxis-core.mjs";
const source = [
  'let objetivo = "validar"',
  'agent demo {',
  '  role: "researcher"',
  '  goal: objetivo',
  '  cycle: [observe, analyze]',
  '}',
  'run demo'
].join("\n");
const parsed = parse(source);
const runtime = toRuntimeProgram(parsed);
console.log(JSON.stringify({ diagnostics: parsed.diagnostics, statements: parsed.ast.statements.length, tokens: parsed.tokens.length, blocks: runtime.blocks.length, runEvents: runtime.trace.filter(e => e.event === "run.requested").length }, null, 2));
if (parsed.diagnostics.length || runtime.blocks.length !== 1 || !runtime.trace.some(e => e.event === "run.requested")) process.exit(1);
const invalid = parse("run missing");
if (!invalid.diagnostics.some(d => d.message.includes("Objetivo no resuelto"))) process.exit(2);
console.log("PASS: valid program and invalid target checks");
