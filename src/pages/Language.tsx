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

const grammar = \`program := statement*
statement := let | agent | tool | memory | evidence | guard | parallel | run
agent := "agent" IDENT "{" property* "}"
run := "run" IDENT ("with" object)?
cycle := "[" IDENT ("," IDENT)* "]"
object := "{" pair* "}"\`;

function highlight(source: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] ?? c));
  let html = esc(source);
  html = html.replace(/(&quot;.*?&quot;)/g, '<span class="tok-string">$1</span>');
  html = html.replace(/\b(program|statement|agent|tool|memory|evidence|guard|parallel|run|let|cycle|object|property|IDENT)\b/g, '<span class="tok-keyword">$1</span>');
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
  return html;
}

export default function Language() {
  return <div className="page-stack language-page">
    <div className="page-heading docs-hero"><div><div className="eyebrow">ESPECIFICACIÓN · V0.3</div><h1>Lenguaje Praxis-P</h1><p>Gramática y bloques fundamentales para construir sistemas agentivos trazables.</p></div><a className="btn-primary" href="/playground">▶ Probar sintaxis</a></div>
    <div className="language-grid">{items.map(([name, desc], i) => <article className="panel language-card" key={name}><div className="language-index">0{i+1}</div><code>{name}</code><p>{desc}</p></article>)}</div>
    <section className="panel docs-section"><div className="section-kicker">GRAMÁTICA CONCEPTUAL</div><h2>Estructura de un programa</h2><div className="doc-code-shell"><div className="doc-code-head"><span className="file-dot" />grammar.prax<span className="doc-code-lang">BNF · V0.3</span></div><pre className="doc-code"><code dangerouslySetInnerHTML={{__html: highlight(grammar)}} /></pre></div></section>
  </div>;
}
