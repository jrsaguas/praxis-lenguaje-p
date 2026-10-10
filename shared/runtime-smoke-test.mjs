import assert from "node:assert/strict";

const base = process.env.PRAXIS_API_URL ?? "http://127.0.0.1:8788";
const healthResponse = await fetch(base + "/api/health");
assert.equal(healthResponse.status, 200, "health endpoint responds");
const health = await healthResponse.json();
assert.equal(health.service, "praxis-p-runtime");
assert.equal(health.specification, "shared/praxis-core.mjs");

async function execute(code) {
  const response = await fetch(base + "/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
  assert.equal(response.status, 200);
  return response.json();
}

const valid = await execute([
  'let objetivo = "validar"',
  "agent demo {",
  "  goal: objetivo",
  "  cycle: [observe, analyze, report]",
  "}",
  "run demo"
].join("\n"));
assert.equal(valid.ok, true, "valid program passes semantic validation");
assert.equal(valid.trace.find(event => event.event === "agent.started").goal, "validar");
assert.deepEqual(valid.trace.filter(event => event.event === "cycle.step").map(event => event.step), ["observe", "analyze", "report"]);

const syntaxInvalid = await execute('agent demo {\n goal: @\n}\nrun demo');
assert.equal(syntaxInvalid.ok, false);
assert.equal(syntaxInvalid.trace.some(event => event.event === "cycle.step"), false, "syntax errors block simulated execution");
assert.ok(syntaxInvalid.trace.some(event => event.event === "run.blocked"));

const dependencyInvalid = await execute("agent demo {\n requires: absent\n}\nrun demo");
assert.equal(dependencyInvalid.ok, false);
assert.equal(dependencyInvalid.trace.some(event => event.event === "cycle.step"), false, "semantic errors block simulated execution");

console.log(JSON.stringify({ endpoint: base, health: health.ok, checks: 8, status: "PASS" }, null, 2));
