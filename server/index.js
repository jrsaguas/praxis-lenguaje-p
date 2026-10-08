import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function parseProgram(code) {
  const lines = code.split(/\r?\n/);
  const variables = {};
  const agents = [];
  const trace = [];
  let active = null;

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const raw = lines[lineNo];
    const line = raw.trim();
    if (!line) continue;

    const letMatch = line.match(/^let\s+(\w+)\s*=\s*(.+)$/);
    if (letMatch) {
      variables[letMatch[1]] = letMatch[2].replace(/^["']|["']$/g, "");
      trace.push({ type: "let", line: lineNo + 1, name: letMatch[1], value: variables[letMatch[1]] });
      continue;
    }

    const agentMatch = line.match(/^agent\s+(\w+)\s*\{?/);
    if (agentMatch) {
      active = { name: agentMatch[1], properties: {} };
      agents.push(active);
      trace.push({ type: "agent.declare", line: lineNo + 1, agent: active.name });
      continue;
    }

    if (line === "}") { active = null; continue; }

    if (active) {
      const prop = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (prop) {
        active.properties[prop[1]] = prop[2];
        trace.push({ type: "agent.property", line: lineNo + 1, agent: active.name, key: prop[1] });
        continue;
      }
    }

    const runMatch = line.match(/^run\s+(\w+)/);
    if (runMatch) {
      trace.push({ type: "run", line: lineNo + 1, agent: runMatch[1], status: "planned" });
      continue;
    }
  }

  return { variables, agents, trace };
}

function execute(code) {
  const program = parseProgram(code);
  const plan = program.agents.map(agent => ({
    agent: agent.name,
    steps: ["observe", "reason", "act", "verify", "report"],
    policy: agent.properties.policy ?? "unspecified",
    status: "planned"
  }));
  return {
    ok: true,
    language: "Praxis-P",
    version: "0.2.0",
    program: { lines: code.split(/\r?\n/).length, variables: program.variables, agents: program.agents },
    trace: program.trace,
    plan
  };
}

app.get("/api/health", (_, res) => res.json({ ok: true, service: "praxis-p-runtime", version: "0.2.0" }));
app.post("/api/execute", (req, res) => {
  try { res.json(execute(String(req.body?.code ?? ""))); }
  catch (error) { res.status(400).json({ ok: false, error: String(error) }); }
});
app.post("/api/analyze", (req, res) => {
  try {
    const code = String(req.body?.code ?? "");
    const result = parseProgram(code);
    res.json({ ok: true, language: "Praxis-P", version: "0.2.0", ...result });
  } catch (error) { res.status(400).json({ ok: false, error: String(error) }); }
});
app.listen(8787, () => console.log("Praxis-P runtime listening on http://localhost:8787"));
