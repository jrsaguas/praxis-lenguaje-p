import { useMemo, useRef, useState } from "react";
import { Braces, ScanSearch, GitBranch, TerminalSquare, Play } from "lucide-react";
import { parse } from "../language/parser";
import { highlightJsonSyntax } from "../language/jsonHighlight";
import { highlightPraxis } from "../language/syntaxHighlight";

const stages = [
  ["Lexer", "tokens", "Convierte texto en unidades léxicas."],
  ["Parser", "AST", "Construye la estructura."],
  ["Validator", "diagnostics", "Expone diagnósticos del parser."],
  ["Graph", "execution plan", "Deriva nodos y relaciones."],
  ["Runtime", "trace", "Ejecuta el fuente contra la API local."]
];
const icons = [ScanSearch, Braces, Braces, GitBranch, TerminalSquare];
const example = 'let objetivo = "validar un programa"\nagent investigador {\n  role: "researcher"\n  goal: objetivo\n  cycle: [observe, analyze, verify, report]\n  policy: "read-only"\n}\nrun investigador';

export default function Compiler() {
  const [source, setSource] = useState(() => localStorage.getItem("praxis-p:source") || example);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const syncScroll = () => {
    const editor = editorRef.current;
    const mirror = editor?.previousElementSibling as HTMLElement | null;
    if (editor && mirror) {
      mirror.scrollTop = editor.scrollTop;
      mirror.scrollLeft = editor.scrollLeft;
    }
  };
  const [tab, setTab] = useState<"ast" | "tokens" | "graph" | "runtime">("ast");
  const [runtime, setRuntime] = useState("Todavía no se ha solicitado una ejecución.");
  const [busy, setBusy] = useState(false);
  const analysis = useMemo(() => parse(source), [source]);
  const named = analysis.ast.statements.filter(s => "name" in s);
  const runs = analysis.ast.statements.filter(s => s.type === "Run");

  async function execute() {
    setBusy(true);
    setTab("runtime");
    try {
      const base = localStorage.getItem("praxis-p:api") || ("http://" + window.location.hostname + ":8788");
      const response = await fetch(base.replace(/\/$/, "") + "/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: source })
      });
      setRuntime(JSON.stringify(await response.json(), null, 2));
    } catch {
      setRuntime("No se pudo conectar con el runtime. Comprueba Configuración y el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="page-stack">
    <div className="page-heading">
      <div><div className="eyebrow">LANGUAGE CORE · PIPELINE</div><h1>Compilador / AST</h1><p>Inspecciona el mismo código fuente a través de las fases del lenguaje.</p></div>
      <button className="btn-primary" onClick={execute} disabled={busy}><Play size={14}/>{busy ? "Ejecutando…" : "Ejecutar en runtime"}</button>
    </div>
    <section className="panel docs-section">
      <label>Fuente Praxis-P
        <div className="code-editor-flow-wrap">
          <pre className="code-editor-flow-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightPraxis(source) + "\n" }} />
          <textarea ref={editorRef} spellCheck={false} aria-label="Editor de fuente Praxis-P" className="field-input code-input-flow code-editor-flow-input" value={source}
            onScroll={syncScroll}
            onChange={event => { setSource(event.target.value); localStorage.setItem("praxis-p:source", event.target.value); }} />
        </div>
      </label>
      <div className="validation-list">
        <div><span>Versión del AST</span><b>0.4.0</b></div>
        <div><span>Instrucciones</span><b>{analysis.ast.statements.length}</b></div>
        <div><span>Diagnósticos</span><b className={analysis.diagnostics.length ? "status-bad" : "status-good"}>{analysis.diagnostics.length}</b></div>
      </div>
    </section>
    <div className="compiler-grid">
      {stages.map((stage, index) => {
        const Icon = icons[index];
        return <article className="panel compiler-stage" key={stage[0]}>
          <div className="stage-number">0{index + 1}</div><Icon/><h2>{stage[0]}</h2><code>{stage[1]}</code><p>{stage[2]}</p>
          <span className={index === 2 && analysis.diagnostics.length ? "status-bad" : "status-good"}>
            {index === 0 ? analysis.tokens.length + " tokens" : index === 1 ? analysis.ast.statements.length + " statements" : index === 2 ? analysis.diagnostics.length + " diagnostics" : index === 3 ? named.length + " nodes" : "API on demand"}
          </span>
        </article>;
      })}
    </div>
    <section className="panel docs-section">
      <div className="p-2 border-b border-neutral-800 flex flex-wrap gap-2">
        {([["ast", "AST"], ["tokens", "Tokens"], ["graph", "Graph"], ["runtime", "Runtime"]] as const).map(([id, label]) =>
          <button key={id} className={"tab-btn " + (tab === id ? "tab-active" : "")} onClick={() => setTab(id)}>{label}</button>
        )}
      </div>
      {tab === "ast" && <pre className="output-code json-output" dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(JSON.stringify(analysis.ast, null, 2)) }} />}
      {tab === "tokens" && <pre className="output-code json-output" dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(JSON.stringify(analysis.tokens, null, 2)) }} />}
      {tab === "graph" && <pre className="output-code json-output" dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(JSON.stringify({ nodes: named.map(s => ({ id: s.name, kind: s.type })), edges: runs.map(s => ({ from: "run:" + s.line, to: s.target, relation: "targets" })) }, null, 2)) }} />}
      {tab === "runtime" && <pre className="output-code json-output" dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(runtime) }} />}
    </section>
    {analysis.diagnostics.length > 0 && <section className="panel docs-section"><h2>Diagnósticos</h2>{analysis.diagnostics.map((diagnostic, index) =>
      <div className="tool-row" key={index}><span>L{diagnostic.line}:C{diagnostic.column}</span><b className="status-bad">{diagnostic.message}</b></div>
    )}</section>}
  </div>;
}
