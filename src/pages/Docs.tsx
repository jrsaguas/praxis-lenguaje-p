import { BookOpen, Code2, Play, ShieldCheck, TerminalSquare, Wrench, LockKeyhole, Database, GitBranch, CircleAlert } from "lucide-react";
import { highlightGrammar, highlightPraxis } from "../language/syntaxHighlight";

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
  "program   ::= statement*",
  "statement ::= let | agent | tool | memory | evidence | guard | parallel | run",
  'let       ::= "let" IDENT "=" value',
  'agent     ::= "agent" IDENT "{" property* "}"',
  'tool      ::= "tool" IDENT "{" property* "}"',
  'memory    ::= "memory" IDENT "{" property* "}"',
  'evidence  ::= "evidence" IDENT "{" property* "}"',
  'guard     ::= "guard" IDENT "{" property* "}"',
  'parallel  ::= "parallel" [IDENT] "{" property* "}"',
  'run       ::= "run" IDENT ["with" object]',
  'property  ::= (IDENT | KEYWORD | STRING) ":" value',
  'value     ::= STRING | NUMBER | "true" | "false" | IDENT | KEYWORD | call | array | object',
  'call      ::= (IDENT | KEYWORD) "(" [value ("," value)*] ")"',
  'array     ::= "[" [value ("," value)*] "]"',
  'object    ::= "{" [pair (("," | NEWLINE) pair)*] "}"',
  'pair      ::= (IDENT | KEYWORD | STRING) ":" value'
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

function CodeBlock({ code, label, kind = "praxis" }: { code: string; label: string; kind?: "praxis" | "grammar" }) {
  const highlighted = kind === "grammar" ? highlightGrammar(code) : highlightPraxis(code);
  return <div className="doc-code-shell">
    <div className="doc-code-head"><span className="file-dot" />{label}<span className="doc-code-lang">{kind === "grammar" ? "EBNF · NOTACIÓN" : "PRAXIS-P"}</span></div>
    <pre className="doc-code"><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
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
    <section className="panel docs-section"><div className="section-kicker">SEMÁFORO DE COLORES</div><h2>Cómo leer el código coloreado</h2><p className="section-lead">Los colores ayudan a distinguir la función de cada parte del código. El color es una ayuda visual; no cambia el significado del programa.</p><div className="syntax-color-legend"><div><i className="legend-swatch swatch-keyword"/><code>agent · run · let</code><span>Palabras clave y propiedades reconocidas</span></div><div><i className="legend-swatch swatch-string"/><code>"texto"</code><span>Cadenas de texto</span></div><div><i className="legend-swatch swatch-identifier"/><code>investigador</code><span>Nombres e identificadores</span></div><div><i className="legend-swatch swatch-number"/><code>10 · 0.9</code><span>Números</span></div><div><i className="legend-swatch swatch-symbol"/><code>{`{ } [ ] ( ) : , =`}</code><span>Signos y delimitadores</span></div><div><i className="legend-swatch swatch-comment"/><code>// comentario</code><span>Comentarios que no se ejecutan</span></div><div><i className="legend-swatch swatch-json"/><code>claves · valores</code><span>En AST, Tokens y JSON, las claves y valores también se distinguen por color</span></div></div></section><section className="panel docs-section"><div className="section-kicker">01 · PRIMER PROGRAMA</div><h2>Sintaxis básica v0.4</h2><p className="section-lead">Variable, agente, herramienta, evidencia, guard y ejecución.</p><CodeBlock code={example} label="main.prax" /></section>
    <section className="panel docs-section"><div className="section-kicker">02 · GRAMÁTICA</div><h2>Cómo leer la gramática</h2><p className="section-lead">Esto es una descripción formal de la sintaxis, no código Praxis-P ejecutable. Las reglas explican qué formas acepta el analizador.</p><CodeBlock code={grammar} label="gramática · notación EBNF" kind="grammar" /><div className="grammar-key" aria-label="Significado de los símbolos de gramática"><div><code>::=</code><span>«Se define como»: operador de definición de una regla gramatical. Se escribe junto, con tres caracteres consecutivos y sin espacios: <code>::=</code>. Solo aparece en la descripción formal, no en un programa Praxis-P.</span></div><div><code>:=</code><span>Es otra convención que se encuentra en algunas gramáticas o lenguajes, pero <b>no es el operador que usamos aquí</b>. En esta gramática escribimos <code>::=</code>, no <code>:=</code> ni <code>: :=</code>.</span></div><div><code>"="</code><span>El signo igual literal que sí se escribe en Praxis-P, por ejemplo <code>let limite = 10</code>.</span></div><div><code>":"</code><span>Dos puntos literales: separan una propiedad de su valor en Praxis-P, por ejemplo <code>role: "researcher"</code>. En la gramática, <code>":"</code> entre comillas significa ese carácter escrito en el programa; no es lo mismo que <code>::=</code>.</span></div><div><code>"let"</code><span>Las comillas indican texto literal: en el programa se escribe <code>let</code>, sin comillas para la palabra clave.</span></div><div><code>"(" y ")"</code><span>Entre comillas significan los paréntesis literales que sí aparecen en Praxis-P, por ejemplo <code>local("research")</code>. En esa gramática, <code>(IDENT | KEYWORD)</code> usa paréntesis de notación para agrupar alternativas; esos paréntesis exteriores no se escriben.</span></div><div><code>"[" y "]"</code><span>Entre comillas describen los corchetes literales de una lista, como <code>[observe, analyze]</code>. En cambio, <code>["with" object]</code> usa corchetes de notación para decir que todo ese fragmento es opcional: puedes escribir <code>run investigador</code> o <code>run investigador with {`{task: "investigar"}`}</code>.</span></div><div><code>","</code><span>Entre comillas representa la coma literal que escribes entre elementos, como en <code>[observe, analyze, verify]</code>. En <code>value ("," value)*</code>, la coma separa un valor del siguiente y el asterisco permite repetir ese par de coma más valor. La coma no significa «o»; esa función corresponde a <code>|</code>.</span></div><div><code>|</code><span>Alternativa: puede ser una forma u otra.</span></div><div><code>*</code><span>Cero o más repeticiones del elemento anterior.</span></div><div><code>?</code><span>Es complementario y no aparece como operador en las reglas actuales de Praxis-P. En expresiones regulares, por ejemplo <code>a?</code>, suele significar «cero o una <code>a</code>». En algunas variantes de EBNF, <code>? ... ?</code> delimita una secuencia especial definida fuera de la gramática. El significado depende de la notación; aquí usamos <code>[ ]</code> para indicar opcionalidad.</span></div><div><code>[ ] sin comillas</code><span>En la notación EBNF, hace opcional todo lo que está dentro. Ejemplo: <code>["with" object]</code> permite omitir <code>with object</code> por completo.</span></div><div><code>( ) sin comillas</code><span>En la notación EBNF, agrupa elementos para que se interpreten como una unidad. Ejemplo: <code>(IDENT | KEYWORD)</code> agrupa dos alternativas; no se escriben esos paréntesis exteriores.</span></div><div><code>IDENT</code><span>Nombre definido por el programa, como <code>investigador</code>.</span></div><div><code>KEYWORD</code><span>Palabra reservada admitida en ciertos contextos, como <code>role</code>, <code>goal</code> o <code>cycle</code>.</span></div><div><code>NEWLINE</code><span>Salto de línea que separa propiedades de objetos multilínea.</span></div></div><p className="grammar-note">Ejemplo: <code>statement*</code> significa «cero o más instrucciones». El símbolo <code>::=</code> define una regla; el signo <code>=</code> entre comillas representa el operador real de Praxis-P. Ninguno de los símbolos de notación se agrega automáticamente al programa.</p></section>
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
