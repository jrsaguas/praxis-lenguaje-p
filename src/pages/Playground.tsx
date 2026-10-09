import { useMemo, useRef, useState } from "react";
import { Braces, Bug, CheckCircle2, GitBranch, Play, RotateCcw, Terminal, WandSparkles, AlertTriangle, CircleX } from "lucide-react";
import { parse } from "../language/parser";

type Tab = "result" | "tokens" | "ast" | "graph" | "json";
type RuntimeResult = {
  ok?: boolean;
  language?: string;
  version?: string;
  program?: { lines?: number; variables?: Record<string, unknown>; blocks?: Array<{ type: string; name: string; line?: number }> };
  graph?: { nodes?: Array<{ id: string; kind: string; target?: string }>; edges?: Array<{ from: string; to: string; relation: string }> };
  trace?: Array<{ event?: string; status?: string; [key: string]: unknown }>;
  validation?: { errors?: string[]; warnings?: string[]; resolved?: boolean; counts?: { blocks?: number; edges?: number; trace?: number } };
  error?: string;
};

function highlight(source: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] ?? c));
  let html = esc(source);
  html = html.replace(/(\/\/.*)$/gm, '<span class="tok-comment">$1</span>');
  html = html.replace(/(&quot;.*?&quot;)/g, '<span class="tok-string">$1</span>');
  html = html.replace(/\b(agent|tool|memory|evidence|guard|parallel|run|let|role|goal|cycle|policy|permission|limit|source|confidence|condition|input|output|requires|test|claim|on|allow|deny|steps|mode|contract)\b/g, '<span class="tok-keyword">$1</span>');
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
  return html;
}

function highlightJson(source: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] ?? c));
  let html = esc(source);
  html = html.replace(/(&quot;(?:\\.|[^&])*?&quot;)(\s*:)/g, '<span class="json-key">$1</span>$2');
  html = html.replace(/(:\s*)(&quot;(?:\\.|[^&])*?&quot;)/g, '$1<span class="json-string">$2</span>');
  html = html.replace(/\b(true|false|null)\b/g, '<span class="json-literal">$1</span>');
  html = html.replace(/(:\s*)(-?\d+(?:\.\d+)?)(?=\s*[,}\]])/g, '$1<span class="json-number">$2</span>');
  return html;
}

const sample = `let objetivo = "analizar una hipótesis"
agent investigador {
  role: "researcher"
  goal: objetivo
  cycle: [observe, analyze, verify, report]
  policy: "read-only"
}
tool buscador {
  contract: "web.search"
  input: "query: string"
  required: "query"
  output: "results: SearchResult[]"
  permission: "web.read"
  limit: 5
}
evidence fuente {
  source: "documento"
  confidence: 0.9
}
guard validar {
  condition: objetivo
}
run investigador`;

export default function Playground() {
  const [code, setCode] = useState(sample);
  const [tab, setTab] = useState<Tab>("result");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  const analysis = useMemo(() => parse(code), [code]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const result = useMemo<RuntimeResult | null>(() => { try { return out.trim().startsWith("{") ? JSON.parse(out) as RuntimeResult : null; } catch { return null; } }, [out]);
  const traceEvents = result?.trace ?? [];
  const errors = result?.validation?.errors ?? [];
  const warnings = result?.validation?.warnings ?? [];
  const graph = result?.graph ?? {
    nodes: analysis.ast.statements.filter(s => "name" in s).map(s => ({ id: s.name, kind: s.type })),
    edges: analysis.ast.statements.filter(s => s.type === "Run").map(s => ({ from: "run:" + s.line, to: s.target, relation: "targets" }))
  };
  const graphNodes = graph.nodes ?? [];
  const graphEdges = graph.edges ?? [];

  const syncScroll = () => {
    const el = editorRef.current;
    const mirror = el?.previousElementSibling as HTMLElement | null;
    if (el && mirror) { mirror.scrollTop = el.scrollTop; mirror.scrollLeft = el.scrollLeft; }
  };

  async function run() {
    setBusy(true);
    setRan(true);
    try {
      const r = await fetch("http://" + window["location"]["hostname"] + ":8788/api/execute", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code })
      });
      const payload = await r.json() as RuntimeResult;
      setOut(JSON.stringify(payload, null, 2));
      setTab("result");
    } catch {
      setOut(JSON.stringify({ ok: false, error: "Runtime no disponible. Ejecuta npm run dev:server." }, null, 2));
      setTab("result");
    } finally { setBusy(false); }
  }

  function reset() { setCode(sample); setOut(""); setRan(false); setTab("result"); }

  const tabs = [
    ["result", "Resultado", CheckCircle2],
    ["tokens", "Tokens", Braces],
    ["ast", "AST", Bug],
    ["graph", "Grafo", GitBranch],
    ["json", "JSON", Terminal]
  ] as const;

  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div><div className="eyebrow">IDE · Praxis-P</div><h1 className="text-3xl font-bold">Playground</h1><p className="text-slate-400 mt-2">Escribe, analiza y ejecuta programas Praxis-P con diagnóstico visible.</p></div>
      <div className="flex gap-2 flex-wrap"><button className="btn-secondary" onClick={reset}><RotateCcw size={15}/> Restablecer</button><button className="btn-primary" onClick={run} disabled={busy}><Play size={15}/>{busy ? "Ejecutando…" : "Ejecutar programa"}</button></div>
    </div>

    <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-4">
      <div className="panel overflow-hidden">
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between gap-2"><span className="code text-xs">main.prax</span><span className="badge"><WandSparkles size={11}/> {analysis.ast.statements.length} instrucciones</span></div>
        <div className="code-editor">
          <pre className="syntax-layer" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlight(code) + "\n" }} />
          <textarea ref={editorRef} spellCheck={false} value={code} onChange={e => setCode(e.target.value)} onScroll={syncScroll} className="code-input" aria-label="Editor de código Praxis-P" />
        </div>
        <div className="editor-foot"><span>Praxis-P · UTF-8</span><span>{code.split(/\r?\n/).length} líneas · {code.length} caracteres</span></div>
      </div>

      <div className="panel overflow-hidden result-panel">
        <div className="result-panel-head"><div><div className="eyebrow">Inspector</div><h2>Salida del programa</h2></div>{ran && result && <span className={result.ok ? "result-pill result-good" : "result-pill result-bad"}>{result.ok ? "Válido" : "Revisar"}</span>}</div>
        <div className="result-tabs" role="tablist" aria-label="Vistas de salida">
          {tabs.map(([id, label, Icon]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? "tab-active" : ""}`}><Icon size={14}/>{label}</button>)}
        </div>

        {tab === "result" && <div className="result-content">
          {!ran ? <div className="empty-result"><Terminal size={25}/><strong>Listo para ejecutar</strong><p>La salida, validación y métricas aparecerán aquí. También puedes inspeccionar Tokens, AST y Grafo antes de ejecutar.</p><button className="btn-primary" onClick={run} disabled={busy}><Play size={14}/> Ejecutar muestra</button></div> :
            result ? <>
              <div className="result-status-row"><span className={result.ok ? "result-status-icon good" : "result-status-icon bad"}>{result.ok ? <CheckCircle2 size={19}/> : <CircleX size={19}/>}</span><div><strong>{result.ok ? "Ejecución validada" : "Se encontraron incidencias"}</strong><p>{result.language ?? "Praxis-P"} · Runtime {result.version ?? "local"}</p></div></div>
              <div className="result-metrics">
                <div><span>Bloques</span><strong>{result.validation?.counts?.blocks ?? result.program?.blocks?.length ?? 0}</strong></div>
                <div><span>Conexiones</span><strong>{result.validation?.counts?.edges ?? result.graph?.edges?.length ?? 0}</strong></div>
                <div><span>Eventos</span><strong>{result.validation?.counts?.trace ?? traceEvents.length}</strong></div>
              </div>
              {errors.length > 0 && <section className="result-issues"><h3><CircleX size={14}/> Errores · {errors.length}</h3>{errors.map((item, i) => <p key={i}>{item}</p>)}</section>}
              {warnings.length > 0 && <section className="result-issues warning-issues"><h3><AlertTriangle size={14}/> Advertencias · {warnings.length}</h3>{warnings.map((item, i) => <p key={i}>{item}</p>)}</section>}
              {errors.length === 0 && warnings.length === 0 && <div className="result-clean"><CheckCircle2 size={15}/> No se detectaron errores ni advertencias de validación.</div>}
              <div className="result-blocks"><h3>Elementos detectados</h3>{(result.program?.blocks ?? []).map((block, i) => <div key={block.name + i}><span className="block-kind">{block.type}</span><code>{block.name}</code><small>Línea {block.line ?? "—"}</small></div>)}</div>
              <p className="simulation-note">Nota: el runtime valida la estructura y registra los pasos del ciclo; los pasos del agente son simulados y no llaman a modelos externos.</p>
            </> : <pre className="output-code">{out || "Sin salida."}</pre>}
        </div>}

        {tab === "tokens" && <div className="inspector-content"><div className="inspector-caption">Tokens producidos por el analizador léxico</div><pre className="output-code json-output">{JSON.stringify(analysis.tokens, null, 2)}</pre></div>}
        {tab === "ast" && <div className="inspector-content"><div className="inspector-caption">Árbol de sintaxis abstracta · AST</div><pre className="output-code json-output" dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(analysis.ast, null, 2)) }}/></div>}
        {tab === "graph" && <div className="inspector-content"><div className="inspector-caption">Nodos y relaciones detectados en el programa</div>
          <div className="graph-summary"><span><i/> {graphNodes.length} nodos</span><span><i/> {graphEdges.length} conexiones</span></div>
          <div className="graph-lists"><section><h3>Nodos</h3>{graphNodes.length ? graphNodes.map((node, i) => <div className="graph-row" key={node.id + i}><span className="graph-node-dot"/><div><code>{node.id}</code><small>{node.kind}</small></div></div>) : <p className="muted-small">No se detectaron nodos.</p>}</section>
          <section><h3>Conexiones</h3>{graphEdges.length ? graphEdges.map((edge, i) => <div className="graph-edge-row" key={edge.from + edge.to + i}><code>{edge.from}</code><span>→</span><code>{edge.to}</code><small>{edge.relation}</small></div>) : <p className="muted-small">No se detectaron relaciones.</p>}</section></div>
          <details className="json-disclosure"><summary>Ver grafo completo en JSON</summary><pre className="output-code json-output" dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(graph, null, 2)) }}/></details>
        </div>}
        {tab === "json" && <div className="inspector-content"><div className="inspector-caption">Respuesta íntegra del runtime, formateada y coloreada</div><pre className="output-code json-output" dangerouslySetInnerHTML={{ __html: highlightJson(out || "{\n  \"info\": \"Ejecuta el programa para obtener JSON\"\n}") }}/></div>}
      </div>
    </div>

    <div className={`panel p-4 ${analysis.diagnostics.length ? "border-red-900/80" : ""}`}>
      <div className="flex items-center gap-2 text-sm font-semibold"><Bug size={15}/> Diagnóstico del editor <span className="badge">{analysis.diagnostics.length} errores</span></div>
      {analysis.diagnostics.length === 0 ? <p className="text-xs text-emerald-400 mt-2">Sin errores detectados por el parser local.</p> :
        <div className="mt-3 space-y-1">{analysis.diagnostics.map((d, i) => <div key={i} className="text-xs text-red-300 code">L{d.line}:C{d.column} · {d.message}</div>)}</div>}
    </div>

    <details className="panel overflow-hidden">
      <summary className="trace-summary"><span><Terminal size={15}/> Traza de ejecución</span><span className="badge">{traceEvents.length} eventos · desplegable</span></summary>
      {traceEvents.length ? <div className="trace-list">{traceEvents.map((event, index) => <details key={index} className="trace-event">
        <summary><span className="trace-index">{String(index + 1).padStart(2, "0")}</span><code>{event.event ?? "evento"}</code><span className={`trace-status ${event.status === "error" ? "status-bad" : event.status === "simulated" ? "trace-simulated" : ""}`}>{event.status ?? "info"}</span></summary>
        <pre className="trace-detail" dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(event, null, 2)) }}/>
      </details>)}</div> : <p className="trace-empty">Ejecuta un programa para inspeccionar cada evento. Cada fila se puede desplegar para consultar sus datos.</p>}
    </details>
  </div>;
}
