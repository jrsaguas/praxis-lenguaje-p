import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function parseProgram(code) {
  const lines = code.split(/\r?\n/);
  const variables = {};
  const blocks = [];
  const trace = [];
  let active = null;
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n].trim();
    if (!line || line.startsWith("//")) continue;
    const letMatch = line.match(/^let\s+([A-Za-z_][\w-]*)\s*=\s*(.+)$/);
    if (letMatch) { variables[letMatch[1]] = normalizeValue(letMatch[2]); trace.push({ type: "let", line: n + 1, name: letMatch[1] }); continue; }
    const blockMatch = line.match(/^(agent|tool|memory|evidence|guard|parallel)(?:\s+([A-Za-z_][\w-]*))?\s*\{?/);
    if (blockMatch) { active = { type: blockMatch[1], name: blockMatch[2] || "parallel_" + (blocks.length + 1), properties: {}, line: n + 1 }; blocks.push(active); trace.push({ type: "block.declare", line: n + 1, block: active.type, name: active.name }); continue; }
    if (line === "}") { active = null; continue; }
    if (active) {
      const prop = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.+)$/);
      if (prop) { active.properties[prop[1]] = normalizeValue(prop[2]); trace.push({ type: "property", line: n + 1, block: active.name, key: prop[1] }); continue; }
    }
    const runMatch = line.match(/^run\s+([A-Za-z_][\w-]*)/);
    if (runMatch) trace.push({ type: "run", line: n + 1, agent: runMatch[1], status: "planned" });
  }
  return { variables, blocks, trace };
}
function normalizeValue(value) {
  const v = String(value).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v === "true" || v === "false") return v === "true";
  if (!Number.isNaN(Number(v))) return Number(v);
  if (v.startsWith("[") && v.endsWith("]")) return v.slice(1, -1).split(",").map(x => normalizeValue(x));
  return { ref: v };
}
function buildGraph(program) {
  const nodes = program.blocks.map(b => ({ id: b.name, kind: b.type, properties: b.properties }));
  const edges = [];
  for (const run of program.trace.filter(x => x.type === "run")) {
    nodes.push({ id: "run:" + run.agent + ":" + run.line, kind: "execution", target: run.agent });
    edges.push({ from: "run:" + run.agent + ":" + run.line, to: run.agent, relation: "targets" });
  }
  for (const b of program.blocks) {
    const deps = b.properties.requires;
    if (deps) for (const ref of Array.isArray(deps) ? deps : [deps]) {
      const target = typeof ref === "object" && ref.ref ? ref.ref : String(ref);
      edges.push({ from: b.name, to: target, relation: "requires" });
    }
  }
  return { nodes, edges };
}
function execute(code) {
  const program = parseProgram(code);
  const graph = buildGraph(program);
  const names = new Set(program.blocks.map(b => b.name));
  const duplicateNames = program.blocks.map(b => b.name).filter((name, idx, all) => all.indexOf(name) !== idx);
  const errors = [
    ...graph.edges.filter(e => e.relation === "requires" && !names.has(e.to)).map(e => "Dependencia no resuelta: " + e.from + " requiere " + e.to),
    ...program.trace.filter(e => e.type === "run" && !names.has(e.agent)).map(e => "Objetivo no resuelto: " + e.agent),
    ...duplicateNames.map(name => "Nombre duplicado: " + name)
  ];
  return { ok: errors.length === 0, language: "Praxis-P", version: "0.3.0", program: { lines: code.split(/\r?\n/).length, variables: program.variables, blocks: program.blocks }, trace: program.trace, graph, validation: { errors, resolved: errors.length === 0, counts: { blocks: program.blocks.length, edges: graph.edges.length } } };
}
app.get("/api/health", (_, res) => res.json({ ok: true, service: "praxis-p-runtime", version: "0.3.0", port: PORT }));
app.post("/api/execute", (req, res) => {
  try { res.json(execute(String(req.body?.code ?? ""))); }
  catch (error) { res.status(400).json({ ok: false, error: String(error) }); }
});
app.post("/api/analyze", (req, res) => {
  try {
    const code = String(req.body?.code ?? "");
    const result = parseProgram(code);
    res.json({ ok: true, language: "Praxis-P", version: "0.3.0", ...result });
  } catch (error) { res.status(400).json({ ok: false, error: String(error) }); }
});
const PORT = Number(process.env.PORT || 8788);
app.listen(PORT, () => console.log(`Praxis-P runtime listening on http://localhost:${PORT}`));