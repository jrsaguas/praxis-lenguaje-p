import { useMemo, useState } from "react";
import { GitBranch, Info, X } from "lucide-react";
type Node = { id: string; kind: string; target?: string };
type Edge = { from: string; to: string; relation: string };
const lane = (n: Node) => /run|execution/i.test(n.kind + " " + n.id) ? 0 : /agent|parallel|cycle/i.test(n.kind + " " + n.id) ? 1 : /tool/i.test(n.kind + " " + n.id) ? 2 : 3;
const labels = ["EJECUCIÓN", "AGENTES", "HERRAMIENTAS", "RECURSOS"];
const colors = ["#d4a45b", "#9c8ae8", "#78b7db", "#86c994"];
export default function GraphCanvas({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const graph = useMemo(() => {
    const counts = [0, 0, 0, 0];
    const placed = nodes.map(n => { const l = lane(n); return { ...n, lane: l, x: [112,345,578,811][l], y: 65 + counts[l]++ * 105 }; });
    const index = new Map(placed.map(n => [n.id,n]));
    const links = edges.flatMap((e,i) => { const a=index.get(e.from), b=index.get(e.to); if(!a||!b)return[]; const x1=a.x+84,y1=a.y+25,x2=b.x+84,y2=b.y+25,bend=Math.max(32,Math.abs(x2-x1)*.4); return [{...e,key:e.from+e.to+i,path:`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`}]; });
    return { placed, links, height: Math.max(220,...counts.map(c=>65+c*105)) };
  },[nodes,edges]);
  const node = graph.placed.find(n=>n.id===selected);
  const incoming = node ? edges.filter(e=>e.to===node.id) : [];
  const outgoing = node ? edges.filter(e=>e.from===node.id) : [];
  return <div className="graph-canvas-wrap">
    <div className="graph-canvas-toolbar"><div><span className="graph-live-dot"/> Grafo del programa <small>{nodes.length} nodos · {graph.links.length} relaciones visibles</small></div><span className="graph-hint"><Info size={12}/> Selecciona un nodo para inspeccionarlo</span></div>
    {!nodes.length ? <div className="graph-empty"><GitBranch size={24}/><strong>El grafo está vacío</strong><p>Define agentes, herramientas y recursos para construir relaciones.</p></div> : <div className="graph-canvas-scroll"><svg className="graph-svg" viewBox={`0 0 970 ${graph.height+35}`} role="img" aria-label="Grafo interactivo de Praxis-P">
      <defs><marker id="praxis-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9d845e"/></marker></defs>
      {labels.map((label,i)=><g key={label}><text x={[112,345,578,811][i]} y="22" textAnchor="middle" className="graph-lane-label">{label}</text><line x1={[112,345,578,811][i]} y1="33" x2={[112,345,578,811][i]} y2={graph.height+5} className="graph-lane-line"/></g>)}
      {graph.links.map(e=><path key={e.key} d={e.path} className={node&&(e.from===node.id||e.to===node.id)?"graph-svg-edge edge-highlight":"graph-svg-edge"} markerEnd="url(#praxis-arrow)"/>)}
      {graph.links.map(e=><text key={"label"+e.key} x="485" y="0" className="graph-edge-label">{e.relation}</text>)}
      {graph.placed.map(n=><g key={n.id} className={`graph-svg-node ${selected===n.id?"node-selected":""}`} role="button" tabIndex={0} aria-pressed={selected===n.id} aria-label={`Seleccionar ${n.kind} ${n.id}`} onClick={()=>setSelected(s=>s===n.id?null:n.id)} onKeyDown={ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();setSelected(s=>s===n.id?null:n.id)}}}>
        <rect x={n.x} y={n.y} width="168" height="50" rx="9" style={{stroke:colors[n.lane]}}/><circle cx={n.x+15} cy={n.y+16} r="4" style={{fill:colors[n.lane]}}/><text x={n.x+27} y={n.y+19} className="graph-svg-kind">{n.kind.toUpperCase()}</text><text x={n.x+12} y={n.y+37} className="graph-svg-name">{n.id.length>21?n.id.slice(0,18)+"…":n.id}</text>
      </g>)}
    </svg></div>}
    <div className="graph-legend">{labels.map((label,i)=><span key={label}><i style={{background:colors[i]}}/>{label[0]+label.slice(1).toLowerCase()}</span>)}</div>
    {node&&<section className="graph-node-details"><div className="graph-node-title"><div><span className="graph-detail-kicker">NODO SELECCIONADO</span><strong>{node.id}</strong><small>{node.kind}</small></div><button onClick={()=>setSelected(null)} aria-label="Cerrar detalles"><X size={15}/></button></div><div className="graph-detail-stats"><div><span>Entrantes</span><strong>{incoming.length}</strong></div><div><span>Salientes</span><strong>{outgoing.length}</strong></div><div><span>Total</span><strong>{incoming.length+outgoing.length}</strong></div></div><div className="graph-neighbor-grid"><div><h4>Conexiones entrantes</h4>{incoming.length?incoming.map((e,i)=><p key={e.from+i}><code>{e.from}</code><span> · {e.relation}</span></p>):<small>Sin conexiones entrantes.</small>}</div><div><h4>Conexiones salientes</h4>{outgoing.length?outgoing.map((e,i)=><p key={e.to+i}><code>{e.to}</code><span> · {e.relation}</span></p>):<small>Sin conexiones salientes.</small>}</div></div></section>}
    {nodes.length>0&&graph.links.length===0&&<p className="graph-integrity-note">Los nodos se conservan aunque no haya relaciones con extremos coincidentes; consulta el JSON original para verificar el runtime.</p>}
  </div>;
}
