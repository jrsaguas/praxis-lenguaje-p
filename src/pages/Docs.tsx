import { BookOpen, Code2, Play, ShieldCheck, TerminalSquare, Wrench, LockKeyhole, Database, GitBranch, CircleAlert } from "lucide-react";

const example = [
  'let objetivo = "investigar"',
  "",
  "agent investigador {",
  '  role: "researcher"',
  "  goal: objetivo",
  '  memory: local("research")',
  "  cycle: [observe, analyze, verify, report]",
  '  policy: "read-only"',
  "}",
  "",
  "tool buscador {",
  '  permission: "web.read"',
  "  limit: 5",
  "}",
  "",
  "evidence fuente {",
  '  source: "documento"',
  "  confidence: 0.9",
  "}",
  "",
  "guard validar {",
  "  condition: objetivo",
  "}",
  "",
  'run investigador with {task: "investigar una hipótesis"}'
].join("\n");

const grammar = [
  "program   := statement*",
  "statement := let | agent | tool | memory | evidence | guard | parallel | run",
  'let       := "let" IDENT "=" value',
  'agent     := "agent" IDENT "{" property* "}"',
  'tool      := "tool" IDENT "{" property* "}"',
  'memory    := "memory" IDENT "{" property* "}"',
  'evidence  := "evidence" IDENT "{" property* "}"',
  'guard     := "guard" IDENT "{" property* "}"',
  'parallel  := "parallel" IDENT? "{" property* "}"',
  'run       := "run" IDENT ("with" object)?',
  'property  := (IDENT | KEYWORD) ":" value',
  'value     := STRING | NUMBER | BOOLEAN | IDENT | call | array | object',
  'call      := IDENT "(" [value ("," value)*] ")"',
  'array     := "[" [value ("," value)*] "]"',
  'object    := "{" [pair (("," | NEWLINE) pair)*] "}"',
  'pair      := (IDENT | KEYWORD) ":" value'
].join("\n");

function highlight(source: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] ?? c));
  const strings: string[] = [];
  let html = esc(source);
  html = html.replace(/(\/\/.*)$/gm, '<span class="tok-comment">$1</span>');
  html = html.replace(/(&quot;.*?&quot;)/g, match => "__STRING_" + (strings.push(match) - 1) + "__");
  html = html.replace(/\b(agent|tool|memory|evidence|guard|parallel|run|let|role|goal|cycle|policy|permission|limit|source|confidence|condition|input|output|requires|test|claim|on|allow|deny|steps|mode|contract|KEYWORD|NEWLINE)\b/g, '<span class="tok-keyword">$1</span>');
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
  return html.replace(/__STRING_(\d+)__/g, (_, index: string) => '<span class="tok-string">' + strings[Number(index)] + '</span>');
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return <div className="doc-code-shell">
    <div className="doc-code-head"><span className="file-dot" />{label}<span className="doc-code-lang">PRAXIS-P</span></div>
    <pre className="doc-code"><code dangerouslySetInnerHTML={{ __html: highlight(code) }} /></pre>
  </div>;
}

export default function Docs() {
  return <div className="page-stack docs-page">
    <div className="page-heading docs-hero">
      <div><div className="eyebrow">PRAXIS-P · DEVELOPER DOCUMENTATION</div><h1>Documentación</h1><p>La referencia para escribir, validar y ejecutar programas Praxis-P con una sintaxis trazable y orientada a agentes.</p></div>
      <a className="btn-primary" href="/playground"><Code2 size={15}/> Abrir Playground</a>
    </div>
    <div className="docs-grid docs-overview">
      <section className="panel docs-card"><div className="icon-tile"><BookOpen size={19}/></div><div><h2>¿Dónde programo?</h2><p>En <b>Playground</b>. Es el IDE integrado: escribe .prax, recibe diagnóstico en tiempo real, inspecciona Tokens/AST/Graph y ejecuta contra el runtime local.</p></div></section>
      <section className="panel docs-card"><div className="icon-tile"><TerminalSquare size={19}/></div><div><h2>Entorno</h2><p>Node.js ejecuta el runtime y Vite sirve la interfaz.</p><pre className="doc-terminal">{"npm install\nnpm run build\nnpm run preview"}</pre></div></section>
      <section className="panel docs-card"><div className="icon-tile"><ShieldCheck size={19}/></div><div><h2>Principio central</h2><p>Un programa declara intención, capacidades, evidencia, permisos y controles antes de conectar servicios reales.</p></div></section>
      <section className="panel docs-card"><div className="icon-tile"><Play size={19}/></div><div><h2>Flujo de trabajo</h2><ol><li>Escribe el programa.</li><li>Corrige Diagnóstico.</li><li>Inspecciona AST y Graph.</li><li>Ejecuta.</li><li>Analiza la traza y el resultado.</li></ol></div></section>
    </div>
    <section className="panel docs-section"><div className="section-kicker">01 · PRIMER PROGRAMA</div><h2>Sintaxis básica v0.4</h2><p className="section-lead">Variable, agente, herramienta, evidencia, guard y ejecución.</p><CodeBlock code={example} label="main.prax" /></section>
    <section className="panel docs-section"><div className="section-kicker">02 · GRAMÁTICA</div><h2>Cómo leer la gramática</h2><p className="section-lead">Estas líneas describen las reglas de escritura del lenguaje; no son código que debas copiar en un programa.</p><CodeBlock code={grammar} label="gramática · notación EBNF" /><div className="grammar-key" aria-label="Significado de los símbolos de gramática"><div><code>:=</code><span>«se define como»: presenta una regla.</span></div><div><code>|</code><span>Alternativa: puede ser una forma u otra.</span></div><div><code>*</code><span>Cero o más repeticiones del elemento anterior.</span></div><div><code>?</code><span>Elemento opcional: puede aparecer una vez o no aparecer.</span></div><div><code>IDENT</code><span>Nombre definido por el programa, como <code>investigador</code>.</span></div><div><code>KEYWORD</code><span>Palabra reservada usada en propiedades, como <code>role</code>, <code>goal</code> o <code>cycle</code>.</span></div><div><code>NEWLINE</code><span>Separador de propiedades en objetos multilínea.</span></div></div><p className="grammar-note">Ejemplo: <code>statement*</code> significa «cero o más instrucciones». El asterisco es notación gramatical, no un carácter que debas escribir al ejecutar Praxis-P.</p></section>
    <section className="panel docs-section"><div className="section-kicker">03 · REFERENCIA</div><h2>Elementos del lenguaje</h2><div className="docs-reference">
      <div><b>let</b><span>Define un valor reutilizable.</span><code>let objetivo = "investigar"</code></div>
      <div><b>agent</b><span>Declara un agente con rol, objetivo, ciclo, memoria y política.</span><code>{"agent investigador { role: \"researcher\" }"}</code></div>
      <div><b>tool</b><span>Declara una capacidad externa y su contrato de acceso.</span><code>{"tool buscador { permission: \"web.read\" }"}</code></div>
      <div><b>memory</b><span>Representa memoria que puede asociarse a un agente o flujo.</span><code>{"memory contexto { mode: \"local\" }"}</code></div>
      <div><b>evidence</b><span>Registra fuente, claims y nivel de confianza.</span><code>{"evidence fuente { confidence: 0.9 }"}</code></div>
      <div><b>guard</b><span>Impone una condición o política antes de continuar.</span><code>{"guard validar { condition: objetivo }"}</code></div>
      <div><b>parallel</b><span>Declara ramas independientes que pueden procesarse en paralelo.</span><code>{"parallel ramas { steps: [a, b] }"}</code></div>
      <div><b>run</b><span>Solicita una ejecución con argumentos opcionales.</span><code>{"run investigador with {task: \"investigar\"}"}</code></div>
    </div></section>
    <section className="panel docs-section"><div className="section-kicker">04 · CONTRATOS</div><h2>Propiedades y permisos</h2><div className="contract-grid">
      <article><Wrench/><h3>permission</h3><p>Define la capacidad que una herramienta puede ejercer. Ejemplos: <code>web.read</code>, <code>filesystem.read</code> o <code>data.query</code>. En v0.4 se registra y valida como contrato; no concede acceso real por sí solo.</p><div className="contract-example">permission: "web.read"</div></article>
      <article><LockKeyhole/><h3>policy</h3><p>Expresa la política operacional de un agente. <code>read-only</code> comunica una operación limitada a lectura dentro del runtime autorizado.</p><div className="contract-example">policy: "read-only"</div></article>
      <article><CircleAlert/><h3>limit</h3><p>Marca un límite cuantitativo de la capacidad declarada: llamadas, resultados, pasos o recursos, según el contrato.</p><div className="contract-example">limit: 5</div></article>
      <article><Database/><h3>source · confidence</h3><p><code>source</code> identifica el origen de una evidencia y <code>confidence</code> expresa una confianza numérica entre 0 y 1.</p><div className="contract-example">source: "documento" · confidence: 0.9</div></article>
      <article><GitBranch/><h3>requires</h3><p>Declara dependencias que deben existir o resolverse antes de utilizar un bloque. El validador detecta referencias no resueltas y ciclos.</p><div className="contract-example">requires: [buscador]</div></article>
    </div></section>
    <section className="panel docs-section docs-note"><div className="section-kicker">05 · ESTADO ACTUAL</div><h2>¿Qué significa que Run diga “planned”?</h2><p>En v0.4 el runtime analiza la declaración, resuelve referencias, construye el grafo y registra la traza. <b>planned</b> indica que la ejecución fue planificada; todavía no significa que una herramienta externa real haya sido invocada.</p></section>
  </div>;
}
