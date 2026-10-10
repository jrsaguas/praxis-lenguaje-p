import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, toRuntimeProgram } from "../shared/praxis-core.mjs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = path.join(ROOT, "tools.json");
const PORT = Number(process.env.PORT || 8788);
const seedTools = [
 {name:"web.search",description:"Buscar fuentes públicas para una consulta.",input:"query: string",output:"results: SearchResult[]",required:"query",permission:"web.read",limit:"5 resultados por llamada",dependencies:"web connector",tests:"consulta normal; vacía; sin resultados",evidence:"URL y fecha por resultado",confidence:"0.75"},
 {name:"filesystem.read",description:"Leer un archivo autorizado.",input:"path: string",output:"content: string",required:"path",permission:"filesystem.read",limit:"Solo rutas autorizadas",dependencies:"sandbox de archivos",tests:"válida; inexistente; acceso denegado",evidence:"ruta y hash opcional",confidence:"0.95"},
 {name:"github.commit",description:"Crear un commit explícitamente autorizado.",input:"tree: FileChange[]",output:"commit: CommitRef",required:"tree",permission:"github.write",limit:"requiere confirmación",dependencies:"GitHub API",tests:"árbol válido; sin cambios; sin permisos",evidence:"SHA del commit",confidence:"0.9"},
 {name:"evidence.record",description:"Registrar una fuente y afirmación.",input:"source: URI, claim: string",output:"evidence_id: string",required:"source, claim",permission:"evidence.write",limit:"una afirmación por registro",dependencies:"registro de evidencias",tests:"fuente válida; claim vacío; duplicado",evidence:"URI, extracto, fecha",confidence:"0.9"},
 {name:"data.query",description:"Consultar un conjunto de datos permitido.",input:"query: string",output:"rows: object[]",required:"query",permission:"data.read",limit:"solo lectura; límite de filas",dependencies:"adaptador de datos",tests:"válida; inválida; sin filas",evidence:"consulta y conteo",confidence:"0.85"},
 {name:"shell.run",description:"Ejecutar un comando dentro de un entorno restringido.",input:"command: string",output:"stdout, stderr, exitCode",required:"command",permission:"shell.restricted",limit:"allowlist, timeout y aislamiento",dependencies:"runner aislado",tests:"permitido; bloqueado; timeout",evidence:"comando normalizado y exit code",confidence:"0.8"}
];
function loadTools(){try{const v=JSON.parse(fs.readFileSync(REGISTRY,"utf8"));return Array.isArray(v)?v:seedTools}catch{return seedTools}}
let tools=loadTools();
function saveTools(){fs.writeFileSync(REGISTRY,JSON.stringify(tools,null,2),"utf8")}
function parseProgram(code){return toRuntimeProgram(parse(code))}
function buildGraph(program){
 const nodes=program.blocks.map(b=>({id:b.name,kind:b.type,properties:b.properties})),edges=[];
 for(const r of program.trace.filter(x=>x.event==="run.requested")){const id="run:"+r.target+":"+r.line;nodes.push({id,kind:"execution",target:r.target});edges.push({from:id,to:r.target,relation:"targets"})}
 for(const b of program.blocks){for(const [key,relation] of [["requires","requires"],["steps","branch"]]){const refs=b.properties[key];if(refs!==undefined){for(const ref of (Array.isArray(refs)?refs:[refs])){const target=ref&&typeof ref==="object"&&ref.ref?ref.ref:String(ref);edges.push({from:b.name,to:target,relation})}}}}
 return {nodes,edges};
}
function execute(code){
 const program=parseProgram(code),graph=buildGraph(program),names=new Map(),errors=program.diagnostics.map(d=>"L"+d.line+":C"+d.column+" "+d.message),warnings=[],trace=[...program.trace];
 for(const b of program.blocks){if(names.has(b.name)&&!errors.some(e=>e.includes("Nombre duplicado: "+b.name)))errors.push("Nombre duplicado: "+b.name);names.set(b.name,b)}
 for(const e of graph.edges.filter(e=>e.relation==="requires"))if(!names.has(e.to))errors.push("Dependencia no resuelta: "+e.from+" requiere "+e.to);
 for(const r of trace.filter(x=>x.event==="run.requested")){
  const target=names.get(r.target);
  if(!target){r.status="error";if(!errors.some(e=>e.includes("Objetivo no resuelto: "+r.target)))errors.push("Objetivo no resuelto: "+r.target);continue}
  if(target.type!=="agent"){r.status="error";errors.push("run requiere un agente, no "+target.type+": "+r.target)}
 }
 for(const b of program.blocks.filter(b=>b.type==="tool")){
  const required=String(b.properties.required??"").split(/[ ,]+/).filter(Boolean),inputs=String(b.properties.input??"").split(/[ ,]+/).map(x=>x.split(":")[0]);
  for(const field of required)if(!inputs.includes(field))errors.push("Contrato "+b.name+": campo requerido '"+field+"' no aparece en input");
  if(!b.properties.permission)warnings.push("Contrato "+b.name+": falta declarar permission");
  if(!b.properties.output)warnings.push("Contrato "+b.name+": falta declarar output");
  const contractName=b.properties.contract;
  if(contractName){const contract=tools.find(t=>t.name===contractName);if(!contract)errors.push("Contrato registrado no encontrado: "+contractName);else{const registeredRequired=String(contract.required??"").split(/[ ,]+/).filter(Boolean);for(const field of registeredRequired)if(!inputs.includes(field))errors.push("Contrato registrado "+contractName+": falta el campo requerido '"+field+"' en input de "+b.name);if(b.properties.permission&&contract.permission&&b.properties.permission!==contract.permission)errors.push("Contrato "+b.name+": permiso "+b.properties.permission+" no coincide con "+contract.permission);trace.push({event:"tool.contract.resolved",tool:b.name,contract:contractName,permission:contract.permission??null,status:"ok"})}}
 }
 const cycleNodes=new Set(),deps=new Map(program.blocks.map(b=>[b.name,(Array.isArray(b.properties.requires)?b.properties.requires:b.properties.requires?[b.properties.requires]:[]).map(x=>x&&typeof x==="object"&&x.ref?x.ref:String(x))]));
 function visit(name,stack=[]){if(stack.includes(name)){stack.slice(stack.indexOf(name)).forEach(x=>cycleNodes.add(x));return}for(const to of deps.get(name)||[])if(names.has(to))visit(to,[...stack,name])}
 for(const name of names.keys())visit(name);
 if(cycleNodes.size)errors.push("Ciclo de dependencias detectado: "+[...cycleNodes].join(" -> "));
 const pendingRuns=trace.filter(x=>x.event==="run.requested");
 if(errors.length===0){
  for(const r of pendingRuns){
   const target=names.get(r.target);r.status="validated";
   const raw=target.properties.cycle;
   const steps=Array.isArray(raw)?raw.map(x=>x&&typeof x==="object"&&x.ref?x.ref:String(x)):["observe","analyze","verify","report"];
   trace.push({event:"agent.started",line:r.line,agent:target.name,goal:target.properties.goal??null,arguments:r.args??{},status:"running"});
   for(const step of steps)trace.push({event:"cycle.step",agent:target.name,step,status:"simulated",note:"Paso registrado; no invoca un modelo externo."});
   trace.push({event:"agent.completed",agent:target.name,status:"simulated",steps:steps.length});
  }
 }else{
  for(const r of pendingRuns)if(r.status==="pending"){r.status="blocked";trace.push({event:"run.blocked",line:r.line,target:r.target,status:"blocked",reason:"validation_failed"});}
 }
 trace.push({event:"validation.completed",status:errors.length?"error":"ok",errors:errors.length,warnings:warnings.length});
 return {ok:errors.length===0,language:"Praxis-P",version:"0.4.0",program:{lines:code.split(/\r?\n/).length,variables:program.variables,blocks:program.blocks},ast:program.ast,tokens:program.tokens,trace,graph,validation:{errors,warnings,resolved:errors.length===0,counts:{blocks:program.blocks.length,edges:graph.edges.length,trace:trace.length}}};
}
app.get("/api/health",(_,res)=>res.json({ok:true,service:"praxis-p-runtime",version:"0.4.0",port:PORT,tools:tools.length,specification:"shared/praxis-core.mjs"}));
app.get("/api/tools",(_,res)=>res.json({ok:true,tools}));
app.put("/api/tools",(req,res)=>{if(!Array.isArray(req.body?.tools))return res.status(400).json({ok:false,error:"tools debe ser un arreglo"});const seen=new Set();for(const t of req.body.tools){if(!t||typeof t.name!=="string"||!t.name.trim())return res.status(400).json({ok:false,error:"Cada contrato necesita name"});if(seen.has(t.name))return res.status(400).json({ok:false,error:"ID duplicado: "+t.name});seen.add(t.name)}tools=req.body.tools;saveTools();res.json({ok:true,count:tools.length,tools})});
app.post("/api/analyze",(req,res)=>{try{const code=String(req.body?.code??""),result=parse(code);res.json({ok:result.diagnostics.length===0,language:"Praxis-P",version:"0.4.0",...result})}catch(e){res.status(400).json({ok:false,error:String(e)})}});
app.post("/api/execute",(req,res)=>{try{res.json(execute(String(req.body?.code??"")))}catch(e){res.status(400).json({ok:false,error:String(e)})}});
app.listen(PORT,"0.0.0.0",()=>console.log("Praxis-P runtime listening on http://0.0.0.0:"+PORT));
