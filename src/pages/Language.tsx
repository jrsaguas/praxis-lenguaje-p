import { highlightGrammar } from "../language/syntaxHighlight";

const items = [
  ["agent", "Entidad autónoma con rol, objetivo, memoria, política y ciclo."],
  ["run", "Inicia un agente o flujo con contexto."],
  ["tool", "Declara una capacidad externa mediante contrato."],
  ["memory", "Define memoria local, compartida o episódica."],
  ["cycle", "Expresa una secuencia: observe → analyze → verify → report."],
  ["evidence", "Registra fuentes, claims, confianza y trazabilidad."],
  ["parallel", "Ejecuta ramas independientes y reúne resultados."],
  ["guard", "Impone permisos, límites y condiciones."]
];

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
  html = html.replace(/(&quot;.*?&quot;)/g, match => `__STRING_${strings.push(match) - 1}__`);
  html = html.replace(/\b(program|statement|agent|tool|memory|evidence|guard|parallel|run|let|cycle|object|property|IDENT|KEYWORD|NEWLINE)\b/g, '<span class="tok-keyword">$1</span>');
  return html.replace(/__STRING_(\d+)__/g, (_, index: string) => `<span class="tok-string">${strings[Number(index)]}</span>`);
}

export default function Language() {
  return <div className="page-stack language-page">
    <div className="page-heading docs-hero"><div><div className="eyebrow">ESPECIFICACIÓN · V0.4</div><h1>Lenguaje Praxis-P</h1><p>Gramática y bloques fundamentales para construir sistemas agentivos trazables.</p></div><a className="btn-primary" href="/playground">▶ Probar sintaxis</a></div>
    <div className="language-grid">{items.map(([name, desc], i) => <article className="panel language-card" key={name}><div className="language-index">0{i+1}</div><code>{name}</code><p>{desc}</p></article>)}</div>
    <section className="panel docs-section"><div className="section-kicker">GRAMÁTICA FORMAL · NOTACIÓN EBNF</div><h2>Estructura de un programa</h2><p className="section-lead">Estas reglas describen el lenguaje; no son código que se ejecute. <code>::=</code> define una regla y <code>"="</code> representa el signo igual literal de Praxis-P.</p><div className="doc-code-shell"><div className="doc-code-head"><span className="file-dot" />grammar.prax<span className="doc-code-lang">EBNF · V0.4</span></div><pre className="doc-code"><code dangerouslySetInnerHTML={{__html: highlightGrammar(grammar)}} /></pre></div></section>
  </div>;
}
