import { BookOpen, Code2, Play, ShieldCheck, TerminalSquare } from "lucide-react";

const example = `let objetivo = "investigar"

agent investigador {
  role: "researcher"
  goal: objetivo
  cycle: [observe, analyze, verify, report]
}

tool buscador {
  permission: "web.read"
  limit: 5
}

evidence fuente {
  source: "documento"
  confidence: 0.9
}

run investigador`;

export default function Docs() {
  return <div className="page-stack docs-page">
    <div className="page-heading"><div><div className="eyebrow">Praxis-P · Developer documentation</div><h1>Documentación</h1><p>Aprende la sintaxis, crea programas y entiende cómo se ejecutan.</p></div></div>

    <div className="docs-grid">
      <section className="panel p-5"><BookOpen size={20}/><h2>¿Dónde programo?</h2><p>En <b>Playground</b>. Es el IDE integrado de Praxis-P: escribe archivos .prax, valida la sintaxis, inspecciona Tokens/AST/Graph y ejecuta contra el runtime local.</p><a className="btn-primary" href="/playground"><Code2 size={15}/> Abrir Playground</a></section>
      <section className="panel p-5"><TerminalSquare size={20}/><h2>¿Qué necesito?</h2><p>Node.js y npm para el runtime y las herramientas de desarrollo. La interfaz se sirve con Vite. El proyecto incluye scripts para construir y probar.</p><pre className="doc-terminal">{`npm install
npm run build
npm run preview`}</pre></section>
      <section className="panel p-5"><ShieldCheck size={20}/><h2>Principios</h2><p>Praxis-P declara agentes, herramientas, evidencia, permisos, límites y ciclos. La intención es que un programa sea trazable y auditable antes de conectarlo con servicios reales.</p></section>
      <section className="panel p-5"><Play size={20}/><h2>Flujo de trabajo</h2><ol><li>Escribe el programa.</li><li>Revisa Diagnóstico.</li><li>Inspecciona AST y Graph.</li><li>Pulsa Ejecutar.</li><li>Analiza el resultado del runtime.</li></ol></section>
    </div>

    <section className="panel docs-section"><h2>Sintaxis básica v0.3</h2><pre className="doc-code">{example}</pre></section>
    <section className="panel docs-section"><h2>Elementos del lenguaje</h2><div className="docs-table">
      <div><b>let</b><span>Define un valor reutilizable.</span></div>
      <div><b>agent</b><span>Declara un agente con rol, objetivo y ciclo.</span></div>
      <div><b>tool</b><span>Declara una capacidad externa con permisos y límites.</span></div>
      <div><b>evidence</b><span>Describe una fuente y su confianza.</span></div>
      <div><b>guard</b><span>Expresa una condición de seguridad o control.</span></div>
      <div><b>run</b><span>Solicita la ejecución de un agente u objetivo.</span></div>
    </div></section>
  </div>;
}
