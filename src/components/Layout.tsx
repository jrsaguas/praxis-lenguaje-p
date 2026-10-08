import { NavLink } from "react-router-dom";

const nav = [
  ["/", "⌂ Inicio"], ["/playground", "▶ Playground"], ["/lenguaje", "{} Lenguaje"],
  ["/agentes", "◎ Agentes"], ["/herramientas", "◆ Herramientas"], ["/flujos", "◇ Flujos"],
  ["/compilador", "<> Compilador / AST"], ["/docs", "▤ Documentación"], ["/configuracion", "⚙ Configuración"]
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen app-shell">
    <aside className="fixed inset-y-0 left-0 w-64 border-r border-neutral-800 bg-neutral-950 p-4 sidebar">
      <div className="px-2 py-4 mb-5"><b className="brand">PRAXIS-P</b><div className="text-[11px] text-neutral-500">Agent Language · 0.3</div></div>
      <nav className="space-y-1">{nav.map(([to,label]) =>
        <NavLink key={to} to={to} className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}>{label}</NavLink>)}</nav>
      <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-500">
        <div className="text-neutral-300 font-semibold mb-1">Runtime</div><div>Local · Node.js</div><div>API · :8788</div><div>UI · Vite :5180</div>
      </div>
    </aside>
    <main className="md:ml-64 min-h-screen main">
      <header className="sticky top-0 z-20 topbar"><span>Praxis Agent Development Environment</span><span className="status-dot"><span/> local runtime ready</span></header>
      <div className="content">{children}</div>
    </main>
  </div>;
}