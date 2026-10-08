import { useMemo, useRef, useState } from "react";
import { Braces, Bug, GitBranch, Play, RotateCcw, Terminal, WandSparkles } from "lucide-react";
import { parse } from "../language/parser";

function highlight(source: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] ?? c));
  let html = esc(source);
  html = html.replace(/(\/\/.*)$/gm, '<span class="tok-comment">$1</span>');
  html = html.replace(/(&quot;.*?&quot;)/g, '<span class="tok-string">$1</span>');
  html = html.replace(/\b(agent|tool|memory|evidence|guard|parallel|run|let|role|goal|cycle|policy|permission|limit|source|confidence|condition|input|output|requires|test|claim|on|allow|deny|steps|mode)\b/g, '<span class="tok-keyword">$1</span>');
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
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
  const [tab, setTab] = useState<"runtime" | "tokens" | "ast" | "graph">("runtime");
  const [out, setOut] = useState("Listo para ejecutar.");
  const [busy, setBusy] = useState(false);
  const analysis = useMemo(() => parse(code), [code]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const syncScroll = () => {
    const el = editorRef.current;
    const mirror = el?.previousElementSibling as HTMLElement | null;
    if (el && mirror) { mirror.scrollTop = el.scrollTop; mirror.scrollLeft = el.scrollLeft; }
  };

  async function run() {
    setBusy(true);
    try {
      const r = await fetch("http://" + window["location"]["hostname"] + ":8788/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      setOut(JSON.stringify(await r.json(), null, 2));
      setTab("runtime");
    } catch {
      setOut("Runtime no disponible. Ejecuta npm run dev:server.");
    } finally { setBusy(false); }
  }

  function reset() { setCode(sample); setOut("Restablecido."); }

  const view = tab === "tokens" ? analysis.tokens : tab === "ast" ? analysis.ast : tab === "graph" ? { nodes: analysis.ast.statements.filter(s => "name" in s).map(s => ({ id: s.name, kind: s.type })), edges: analysis.ast.statements.filter(s => s.type === "Run").map(s => ({ from: "run:" + s.line, to: s.target, relation: "targets" })) } : out;
  const traceEvents = useMemo((): Array<{ event?: string; status?: string; [key: string]: unknown }> => { try { const result = JSON.parse(out) as { trace?: Array<{ event?: string; status?: string; [key: string]: unknown }> }; return Array.isArray(result.trace) ? result.trace : []; } catch { return []; } }, [out]);

  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div><div className="eyebrow">IDE · Praxis-P</div><h1 className="text-3xl font-bold">Playground</h1><p className="text-slate-400 mt-2">Escribe, analiza y ejecuta programas Praxis-P con diagnóstico visible.</p></div>
      <div className="flex gap-2 flex-wrap"><button className="btn-secondary" onClick={reset}><RotateCcw size={15}/> Restablecer</button><button className="btn-primary" onClick={run} disabled={busy}><Play size={15}/>{busy ? "Ejecutando…" : "Ejecutar"}</button></div>
    </div>

    <div className="grid xl:grid-cols-[1.15fr_.85fr] gap-4">
      <div className="panel overflow-hidden">
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between"><span className="code text-xs">main.prax</span><span className="badge"><WandSparkles size={11}/> {analysis.ast.statements.length} instrucciones</span></div>
        <div className="code-editor">
          <pre className="syntax-layer" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlight(code) + "\n" }} />
          <textarea ref={editorRef} spellCheck={false} value={code} onChange={e => setCode(e.target.value)} onScroll={syncScroll} className="code-input" aria-label="Editor de código Praxis-P" />
        </div>
      </div>
      <div className="panel overflow-hidden">
        <div className="p-2 border-b border-neutral-800 flex gap-1">
          {([["runtime","Runtime",Terminal],["tokens","Tokens",Braces],["ast","AST",Bug],["graph","Graph",GitBranch]] as const).map(([id,label,Icon]) =>
            <button key={id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? "tab-active" : ""}`}><Icon size={14}/>{label}</button>
          )}
        </div>
        <pre className="output-code">{JSON.stringify(view, null, 2)}</pre>
      </div>
    </div>

    <div className={`panel p-4 ${analysis.diagnostics.length ? "border-red-900/80" : ""}`}>
      <div className="flex items-center gap-2 text-sm font-semibold"><Bug size={15}/> Diagnóstico <span className="badge">{analysis.diagnostics.length} errores</span></div>
      {analysis.diagnostics.length === 0 ? <p className="text-xs text-emerald-400 mt-2">Sintaxis estructural válida para el parser v0.3.</p> :
        <div className="mt-3 space-y-1">{analysis.diagnostics.map((d, i) => <div key={i} className="text-xs text-red-300 code">L{d.line}:C{d.column} · {d.message}</div>)}</div>}
    </div>

    <details className="panel overflow-hidden">
      <summary className="trace-summary"><span><Terminal size={15}/> Traza de ejecución</span><span className="badge">{traceEvents.length} eventos · desplegable</span></summary>
      {traceEvents.length ? <div className="trace-list">{traceEvents.map((event, index) => <details key={index} className="trace-event">
        <summary><span className="trace-index">{String(index + 1).padStart(2, "0")}</span><code>{event.event ?? "evento"}</code><span className={`trace-status ${event.status === "error" ? "status-bad" : event.status === "simulated" ? "trace-simulated" : ""}`}>{event.status ?? "info"}</span></summary>
        <pre className="trace-detail">{JSON.stringify(event, null, 2)}</pre>
      </details>)}</div> : <p className="trace-empty">Ejecuta un programa para inspeccionar cada evento. Cada fila se puede desplegar para consultar sus datos.</p>}
    </details>
  </div>;
}
