import { useMemo, useState } from "react";
import { GitBranch, Split, ShieldCheck, CircleDot, Code2, Play } from "lucide-react";
import { parse, type Statement } from "../language/parser";
import GraphCanvas from "../components/GraphCanvas";

const initial = `agent planner {
  role: "planner"
  goal: "descomponer la tarea"
  requires: [researcher]
}
agent researcher {
  role: "researcher"
  goal: "reunir evidencia"
}
parallel trabajo {
  steps: [planner, researcher]
}
run planner with {task: "investigar una hipótesis"}`;

function refs(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(refs);
  if (value && typeof value === "object" && "ref" in value) {
    return [String((value as { ref: unknown }).ref)];
  }
  return [];
}

function propertyValue(statement: Statement, key: string): unknown {
  if (!("properties" in statement)) return undefined;
  return statement.properties.find((p) => p.key === key)?.value;
}

export default function Flows() {
  const [source, setSource] = useState(() => localStorage.getItem("praxis-p:source") || initial);
  const [showSource, setShowSource] = useState(false);
  const analysis = useMemo(() => parse(source), [source]);

  const declarations = analysis.ast.statements.filter((s) => "name" in s && s.type !== "Let");
  const runs = analysis.ast.statements.filter((s) => s.type === "Run");
  const nodes = [
    ...declarations.map((s) => ({ id: s.name, kind: s.type.toLowerCase() })),
    ...runs.map((s) => ({ id: "run:" + s.line, kind: "execution", target: s.target })),
  ];
  const edges = [
    ...runs.map((s) => ({ from: "run:" + s.line, to: s.target, relation: "targets" })),
    ...declarations.flatMap((s) => refs(propertyValue(s, "requires")).map((target) => ({
      from: s.name, to: target, relation: "requires",
    }))),
    ...declarations.filter((s) => s.type === "Parallel").flatMap((s) =>
      refs(propertyValue(s, "steps")).map((target) => ({ from: s.name, to: target, relation: "branch" })),
    ),
  ];

  function update(value: string) {
    setSource(value);
    localStorage.setItem("praxis-p:source", value);
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ORCHESTRATION · GRAPH</div>
          <h1>Flujos</h1>
          <p>Grafo derivado del mismo código fuente que usa Playground y Compilador.</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowSource((show) => !show)}>
          <Code2 size={14} /> {showSource ? "Ocultar fuente" : "Editar fuente"}
        </button>
      </div>

      {showSource && (
        <section className="panel docs-section">
          <label>Fuente .prax
            <textarea className="field-input code-input-flow" value={source} onChange={(e) => update(e.target.value)} spellCheck={false} />
          </label>
          <p className="section-lead">Los cambios se guardan localmente y se comparten con Playground y Compilador al abrir esas secciones.</p>
        </section>
      )}

      <section className="panel docs-section">
        <div className="flow-head">
          <span>programa_actual.prax</span>
          <span>{nodes.length} nodos · {edges.length} relaciones</span>
        </div>
        {analysis.diagnostics.length > 0 && (
          <div className="diagnostic-banner">
            {analysis.diagnostics.map((d) => `L${d.line}: ${d.message}`).join(" · ")}
          </div>
        )}
        <GraphCanvas nodes={nodes} edges={edges} />
      </section>

      <div className="feature-grid">
        <article className="panel feature-card">
          <div className="feature-icon"><GitBranch /></div>
          <div><h2>Declaraciones</h2><p>{declarations.length} agentes, herramientas, memorias y bloques de flujo.</p></div>
        </article>
        <article className="panel feature-card">
          <div className="feature-icon"><Split /></div>
          <div><h2>Paralelismo</h2><p>{declarations.filter((s) => s.type === "Parallel").length} bloques parallel detectados.</p></div>
        </article>
        <article className="panel feature-card">
          <div className="feature-icon"><ShieldCheck /></div>
          <div><h2>Diagnóstico</h2><p>{analysis.diagnostics.length === 0 ? "Sin errores de sintaxis." : `${analysis.diagnostics.length} problemas por revisar.`}</p></div>
        </article>
        <article className="panel feature-card">
          <div className="feature-icon"><Play /></div>
          <div><h2>Ejecuciones</h2><p>{runs.length} instrucciones run conectadas con sus objetivos.</p></div>
        </article>
      </div>
      <section className="panel docs-section">
        <div className="section-kicker">RELACIONES DETECTADAS</div>
        <h2>Dependencias y objetivos</h2>
        {edges.length ? edges.map((edge, i) => (
          <div className="tool-row" key={edge.from + edge.to + i}>
            <code>{edge.from}</code><span>{edge.relation}</span><b>{edge.to}</b>
          </div>
        )) : <p className="section-lead">El programa aún no declara relaciones. Añade run, requires o steps para construir el grafo.</p>}
      </section>
    </div>
  );
}
