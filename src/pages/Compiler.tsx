import{Braces,TreePine,GitCommitVertical}from"lucide-react";export default function Compiler(){return <div className="space-y-6"><div><div className="eyebrow">Language core</div><h1 className="text-3xl font-bold">Compilador / AST</h1></div><div className="grid md:grid-cols-3 gap-4">{[["Lexer","tokens",Braces],["Parser","AST",TreePine],["Runtime","trace",GitCommitVertical]].map(([a,b,I])=><div className="panel p-5" key={a as string}><I className="text-blue-400"/><div className="code text-lg mt-4">{a as string}</div><div className="text-xs text-blue-300">{b as string}</div></div>)}</div><div className="panel p-6"><div className="eyebrow">AST</div><pre className="code text-xs text-slate-300 mt-4">{`Program
├─ Let objetivo → String
├─ Agent investigador
│  ├─ role: researcher
│  ├─ goal: objetivo
│  └─ cycle: [observe, analyze, verify, report]
└─ Run investigador`}</pre></div></div>}