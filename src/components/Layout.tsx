import { NavLink } from "react-router-dom";
import { Activity, Bot, Braces, ChevronRight, Code2, FileCode2, GitBranch, Home, Settings, ShieldCheck, Wrench } from "lucide-react";

const nav = [
  ["/", "Inicio", Home], ["/playground", "Playground", Code2], ["/lenguaje", "Lenguaje", Braces],
  ["/agentes", "Agentes", Bot], ["/herramientas", "Herramientas", Wrench], ["/flujos", "Flujos", GitBranch],
  ["/compilador", "Compilador / AST", FileCode2], ["/docs", "Documentación", ShieldCheck], ["/configuracion", "Configuración", Settings]
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen app-shell">
    <aside className="fixed inset-y-0 left-0 w-64 sidebar">
      <div className="brand-block"><div className="brand-mark">P</div><div><b className="brand">PRAXIS-P</b><div className="brand-sub">AGENT LANGUAGE · 0.3</div></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{nav.map(([to,label,Icon]) =>
        <NavLink key={to} to={to} className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <Icon size={15}/><span>{label}</span>{to === "/playground" && <span className="nav-live">LIVE</span>}<ChevronRight className="nav-chevron" size={13}/>
        </NavLink>)}</nav>
      <div className="runtime-card"><div className="runtime-head"><span className="runtime-pulse"/><b>RUNTIME ONLINE</b></div><div className="runtime-row"><span>Node.js API</span><code>:8788</code></div><div className="runtime-row"><span>Vite UI</span><code>:5180</code></div><div className="runtime-foot"><Activity size={12}/> local development</div></div>
    </aside>
    <main className="md:ml-64 min-h-screen main">
      <header className="sticky top-0 z-20 topbar"><div className="crumb"><span>PRAXIS-P</span><i>/</i><b>DEVELOPMENT ENVIRONMENT</b></div><span className="status-dot"><span/> runtime ready</span></header>
      <div className="content">{children}</div>
    </main>
  </div>;
}
