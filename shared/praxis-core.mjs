const KEYWORDS = new Set("agent run let role goal memory cycle tool evidence policy parallel guard input output permission limit source claim confidence condition on allow deny steps mode requires test contract required true false with".split(" "));
export function tokenize(source) {
 const out=[]; let i=0,line=1,column=1; const push=(kind,value,l=line,c=column)=>out.push({kind,value,line:l,column:c});
 while(i<source.length){const c=source[i]; if(" \t\r".includes(c)){i++;column++;continue} if(c==="\n"){push("newline","\\n");i++;line++;column=1;continue}
 if(c==="/"&&source[i+1]==="/"){while(i<source.length&&source[i]!=="\n"){i++;column++}continue}
 if(c==='"'||c==="'"){const q=c,l=line,col=column;let v="",closed=false;i++;column++;while(i<source.length){if(source[i]==="\\"&&i+1<source.length){v+=source[i+1];i+=2;column+=2;continue}if(source[i]===q){i++;column++;closed=true;break}if(source[i]==="\n"){line++;column=1;v+="\n";i++;continue}v+=source[i++];column++}push("string",v,l,col);if(!closed)push("invalid","Cadena sin cerrar",l,col);continue}
 if(/[0-9]/.test(c)){const col=column;let v="";while(i<source.length&&/[0-9.]/.test(source[i])){v+=source[i++];column++}push("number",v,line,col);continue}
 if(/[A-Za-z_]/.test(c)){const col=column;let v="";while(i<source.length&&/[A-Za-z0-9_-]/.test(source[i])){v+=source[i++];column++}push(KEYWORDS.has(v)?"keyword":"identifier",v,line,col);continue}
 if("{}[]():,=".includes(c)){push("symbol",c);i++;column++;continue}push("invalid","Carácter no reconocido: "+c);i++;column++}
 push("eof","");return out;
}
export function parse(source){
 const tokens=tokenize(source),diagnostics=[],statements=[];let i=0;
 const types={agent:"Agent",tool:"Tool",memory:"Memory",evidence:"Evidence",guard:"Guard",parallel:"Parallel"};
 const cur=()=>tokens[i],skip=()=>{while(cur()?.kind==="newline")i++};
 const diag=(message,t=cur())=>{t=t||tokens[tokens.length-1];diagnostics.push({message,line:t.line,column:t.column,severity:"error"})};
 const expect=v=>{if(cur()?.value===v){i++;return true}diag('Se esperaba "'+v+'" y se encontró "'+(cur()?.value||"fin")+'"');return false};
 for(const t of tokens)if(t.kind==="invalid")diag(t.value,t);
 function value(){skip();const t=cur();if(!t||t.kind==="eof"){diag("Se esperaba un valor",t);return null}
 if(t.kind==="string"){i++;return t.value}if(t.kind==="number"){i++;const n=Number(t.value);if(!Number.isFinite(n))diag("Número no válido: "+t.value,t);return n}
 if(t.value==="true"||t.value==="false"){i++;return t.value==="true"}
 if(t.value==="["){i++;const a=[];skip();while(cur()&&cur().value!=="]"&&cur().kind!=="eof"){const before=i;a.push(value());skip();if(cur()?.value===","){i++;skip()}else if(cur()?.value!=="]"){diag('Se esperaba "," o "]" en la lista');if(i===before)i++;break}}expect("]");return a}
 if(t.value==="{"){i++;const o={};skip();while(cur()&&cur().value!=="}"&&cur().kind!=="eof"){skip();if(cur()?.value==="}")break;const k=cur();if(!["identifier","keyword","string"].includes(k.kind)){diag("Se esperaba una propiedad en el objeto",k);i++;continue}i++;if(cur()?.value===":")i++;else diag('Se esperaba ":" después de la propiedad');o[k.value]=value();skip();if(cur()?.value===","){i++;skip()}else if(cur()?.value!=="}"&&cur()?.kind!=="newline"&&cur()?.line===k.line)diag('Se esperaba "," o "}" después del valor')}expect("}");return o}
 if(t.kind==="identifier"||t.kind==="keyword"){i++;if(cur()?.value==="("){i++;const a=[];skip();while(cur()&&cur().value!==")"&&cur().kind!=="eof"){a.push(value());skip();if(cur()?.value===","){i++;skip()}else if(cur()?.value!==")"){diag('Se esperaba "," o ")" en argumentos');break}}expect(")");return {call:t.value,args:a}}return {ref:t.value}}
 diag("Valor no válido: "+t.value,t);i++;return null}
 while(i<tokens.length&&cur()?.kind!=="eof"){skip();const t=cur();if(!t||t.kind==="eof")break;
 if(t.value==="let"){i++;const n=cur();const name=n?.value||"";if(n?.kind!=="identifier")diag("Se esperaba un identificador después de let",n);else i++;expect("=");statements.push({type:"Let",name,value:value(),line:t.line});continue}
 if(types[t.value]){i++;let name=t.value+"_"+(statements.length+1);if(cur()?.value!=="{"){const n=cur();if(n?.kind==="identifier"){name=n.value;i++}else if(t.value!=="parallel")diag("Se esperaba el nombre para "+t.value,n)}expect("{");const properties=[];while(cur()&&cur().value!=="}"&&cur().kind!=="eof"){skip();if(cur()?.value==="}")break;const k=cur();if(!["identifier","keyword"].includes(k.kind)){diag("Se esperaba el nombre de una propiedad",k);while(cur()&&cur().kind!=="newline"&&cur().value!=="}"&&cur().kind!=="eof")i++;continue}i++;if(cur()?.value===":")i++;else diag('Se esperaba ":" después del nombre de propiedad');properties.push({key:k.value,value:value(),line:k.line,column:k.column});skip()}expect("}");statements.push({type:types[t.value],name,properties,line:t.line});continue}
 if(t.value==="run"){i++;const n=cur(),target=n?.value||"";if(!target||n?.kind==="eof")diag("Se esperaba el objetivo de run",n);else i++;let args;if(cur()?.value==="with"){i++;args=value()}statements.push({type:"Run",target,...(args===undefined?{}:{args}),line:t.line});continue}
 diag("Instrucción desconocida: "+t.value,t);while(cur()&&cur().kind!=="newline"&&cur().kind!=="eof")i++}
 const names=new Map();for(const s of statements)if("name"in s){if(names.has(s.name))diagnostics.push({message:"Nombre duplicado: "+s.name,line:s.line,column:1,severity:"error"});names.set(s.name,s)}
 for(const s of statements)if(s.type==="Run"&&!names.has(s.target))diagnostics.push({message:"Objetivo no resuelto: "+s.target,line:s.line,column:1,severity:"error"});
 return {ast:{type:"Program",version:"0.4.0",statements},diagnostics,tokens}
}
export function toRuntimeProgram(parsed){const variables={},blocks=[],trace=[];for(const s of parsed.ast.statements){if(s.type==="Let"){variables[s.name]=s.value;trace.push({event:"variable.set",line:s.line,name:s.name,status:"ok"});continue}if(s.type==="Run"){trace.push({event:"run.requested",line:s.line,target:s.target,args:s.args??{},status:"pending"});continue}const type=s.type.toLowerCase(),properties=Object.fromEntries(s.properties.map(p=>[p.key,p.value]));blocks.push({type,name:s.name,properties,line:s.line});trace.push({event:"block.declared",line:s.line,block:type,name:s.name,status:"ok"});for(const p of s.properties)trace.push({event:"property.read",line:p.line,block:s.name,key:p.key,status:"ok"})}return {variables,blocks,trace,diagnostics:parsed.diagnostics,ast:parsed.ast,tokens:parsed.tokens}}
