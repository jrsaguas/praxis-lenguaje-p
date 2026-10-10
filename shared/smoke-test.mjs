import assert from "node:assert/strict";
import { parse, tokenize, toRuntimeProgram } from "./praxis-core.mjs";

const source = [
  'let objetivo = "validar un programa"',
  'agent demo {',
  '  role: "researcher"',
  '  goal: objetivo',
  '  cycle: [observe, analyze, verify, report]',
  '  options: {mode: "safe", enabled: true, retries: 3}',
  '}',
  'run demo with {task: "revisar", dryRun: true}'
].join("\n");
const parsed = parse(source);
assert.deepEqual(parsed.diagnostics, [], "programa válido sin diagnósticos");
assert.equal(parsed.ast.statements.length, 3);
assert.equal(parsed.ast.version, "0.4.0");
const runtime = toRuntimeProgram(parsed);
assert.equal(runtime.blocks.length, 1);
assert.equal(runtime.blocks[0].properties.goal, "validar un programa", "resuelve referencias a variables");
assert.deepEqual(runtime.blocks[0].properties.cycle.map(step => step.ref), ["observe", "analyze", "verify", "report"]);
assert.deepEqual(runtime.blocks[0].properties.options, { mode: "safe", enabled: true, retries: 3 });
assert.equal(runtime.trace.find(event => event.event === "run.requested").args.task, "revisar");

assert.ok(parse("run missing").diagnostics.some(d => d.message.includes("Objetivo no resuelto")));
assert.ok(parse('agent a {\n role: "ok"\n role: "duplicado"\n}').diagnostics.some(d => d.message.includes("Propiedad duplicada")));
assert.ok(parse("agent a {}\nagent a {}").diagnostics.some(d => d.message.includes("Nombre duplicado")));
assert.ok(parse('agent a {\n goal: "sin cerrar\n}').diagnostics.some(d => d.message.includes("Cadena sin cerrar")));
assert.ok(parse("agent a {\n goal: 1.2.3\n}").diagnostics.some(d => d.message.includes("Número no válido")));
assert.ok(parse("agent a {\n goal: @\n}").diagnostics.some(d => d.message.includes("Carácter no reconocido")));
assert.equal(tokenize('let x = "a\\n"')[3].value, "a\n", "decodifica escape de nueva línea");

console.log(JSON.stringify({
  version: parsed.ast.version,
  statements: parsed.ast.statements.length,
  tokens: parsed.tokens.length,
  blocks: runtime.blocks.length,
  checks: 9,
  status: "PASS"
}, null, 2));
