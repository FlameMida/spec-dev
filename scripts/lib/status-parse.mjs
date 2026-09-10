import {parseUniqueJson} from './integration-plan.mjs';
export const fault=(code,message)=>Object.assign(new Error(message),{code});
const need=(ok,message,code='invalid_format')=>{if(!ok)throw fault(code,message);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const put=(o,k,v)=>{need(!Object.hasOwn(o,k),'duplicate key: '+k);Object.defineProperty(o,k,{value:v,enumerable:true,writable:true,configurable:true});};
function uncomment(s){
 let q=null;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(q==='"'&&c==='\\'){i++;continue;}
  if(q==="'"&&c==="'"&&s[i+1]==="'"){i++;continue;}
  if(q){if(c===q)q=null;}else if((c==='"'||c==="'")&&(!s.slice(0,i).trim()||/[:\[{,]\s*$/.test(s.slice(0,i))||/^\s*-\s*$/.test(s.slice(0,i))))q=c;
  else if(c==='#'&&(i===0||/\s/.test(s[i-1])))return s.slice(0,i).trimEnd();
 }
 need(q===null,'unterminated quote');return s.trimEnd();
}
function inline(input){
 let i=0;
 const ws=()=>{while(/\s/.test(input[i]??'')&&i<input.length)i++;};
 const quoted=()=>{
  const q=input[i++];let out='';
  if(q==='"'){
   const start=i-1;while(i<input.length){if(input[i]==='\\'){i+=2;continue;}if(input[i++]==='"')return JSON.parse(input.slice(start,i));}
  }else{
   while(i<input.length){const c=input[i++];if(c==="'"){if(input[i]==="'"){out+="'";i++;}else return out;}else out+=c;}
  }throw fault('invalid_format','unterminated quote');
 };
 const scalar=s=>{
  s=s.trim();need(s.length,'empty scalar');
  need(!/^[&*!|>]/.test(s),'unsupported YAML syntax','unsupported_syntax');
  if(s==='null'||s==='~')return null;if(s==='true')return true;if(s==='false')return false;
  if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s))return Number(s);
  return s;
 };
 const value=()=>{
  ws();if(input[i]==='"'||input[i]==="'")return quoted();
  if(input[i]==='['){
   i++;ws();const a=[];if(input[i]===']'){i++;return a;}
   while(i<input.length){a.push(value());ws();const c=input[i++];if(c===']')return a;need(c===',','expected array comma');ws();}
   throw fault('invalid_format','unterminated array');
  }
  if(input[i]==='{'){
   i++;ws();const o={};if(input[i]==='}'){i++;return o;}
   while(i<input.length){
    let k;if(input[i]==='"'||input[i]==="'")k=quoted();else{const start=i;while(i<input.length&&input[i]!==':')i++;k=input.slice(start,i).trim();need(/^[\w.-]+$/.test(k),'invalid key');}
    ws();need(input[i++]===':','expected colon');put(o,k,value());ws();const c=input[i++];if(c==='}')return o;need(c===',','expected map comma');ws();
   }throw fault('invalid_format','unterminated map');
  }
  const start=i;while(i<input.length&&!/[\],}]/.test(input[i]))i++;
  return scalar(input.slice(start,i));
 };
 if(!/^[\[{"\']/.test(input.trimStart()))return scalar(input);
 const result=value();ws();need(i===input.length,'trailing scalar input');return result;
}
function parseRecordInput(text){
 const input=text.replace(/\r\n/g,'\n').trim();need(input,'empty record');
 if(input.startsWith('{')||input.startsWith('[')){
  try{return parseUniqueJson(input);}catch(e){throw fault('invalid_format',e.message);}
 }
 const lines=input.split('\n').flatMap((raw,n)=>{
  need(!/^\s*\t/.test(raw),'tabs in indentation');const s=uncomment(raw);
  if(!s.trim())return [];const indent=s.length-s.trimStart().length;
  return [{indent,text:s.trimStart(),line:n+1}];
 });let i=0;
 const block=depth=>{
  need(i<lines.length&&lines[i].indent===depth,'bad indentation');
  const sequence=/^-($|\s)/.test(lines[i].text),out=sequence?[]:{};
  while(i<lines.length&&lines[i].indent===depth){
   const row=lines[i++];let k,tail;
   if(sequence){need(/^-($|\s)/.test(row.text),'mixed map and sequence');tail=row.text.slice(1).trim();}
   else{
    const m=/^([\w.-]+|"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'):\s*(.*)$/.exec(row.text);
    need(m,'expected mapping on line '+row.line);k=/^["']/.test(m[1])?inline(m[1]):m[1];tail=m[2];
   }
   let v;
   if(tail){v=inline(tail);need(i===lines.length||lines[i].indent<=depth,'unexpected nested value');}
   else v=i<lines.length&&lines[i].indent>depth?block(lines[i].indent):null;
   if(sequence)out.push(v);else put(out,k,v);
  }return out;
 };
 need(lines.length&&lines[0].indent===0,'root indentation');const result=block(0);need(i===lines.length,'unconsumed indentation');return result;
}
export function parseRecord(text){try{return parseRecordInput(text);}catch(e){throw fault(e.code??'invalid_format',e.message);}}
export function outsideFences(text){
 let fence=null;const out=[];
 for(const line of text.replace(/\r\n/g,'\n').split('\n')){
  const m=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if(!fence&&m){fence={char:m[1][0],size:m[1].length};continue;}
  if(fence){if(m&&m[1][0]===fence.char&&m[1].length>=fence.size&&!m[2].trim())fence=null;continue;}
  out.push(line);
 }return out.join('\n');
}
export function parseMeta(text,kind){
 const m=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
 need(m,'missing or unclosed frontmatter');const root=parseRecord(m[1]);
 const key=kind==='roadmap'?'spec_dev_roadmap':'spec_dev';need(object(root)&&object(root[key]),'missing '+key);return root[key];
}
function cells(line){
 let escaped=false,cell='',out=[];
 for(const c of line.trim()){
  if(escaped){cell+=c;escaped=false;}else if(c==='\\')escaped=true;
  else if(c==='|'){out.push(cell.trim());cell='';}else cell+=c;
 }out.push(cell.trim());return out.slice(1,-1);
}
export function parseRoadmap(text){
 const meta=parseMeta(text,'roadmap'),lines=outsideFences(text).split('\n');
 const start=lines.findIndex(l=>/^##\s+(?:子项目|Subprojects|Sub-projects)\s*$/i.test(l));need(start>=0,'missing subprojects section');
 const end=lines.findIndex((l,i)=>i>start&&/^##\s/.test(l)),section=lines.slice(start+1,end<0?undefined:end);
 const table=section.filter(l=>/^\s*\|/.test(l));need(table.length>=2,'missing subprojects table');
 need(cells(table[0]).length===6&&cells(table[1]).every(c=>/^:?-+:?$/.test(c)),'invalid subprojects header');
 const ids=new Set(),rows=[];
 for(const line of table.slice(2)){
  const c=cells(line);need(c.length===6,'expected six columns');const [id,name,scope,deps,status,target]=c;
  need(id&&!ids.has(id),'duplicate or empty row id');ids.add(id);
  const link=/^\[[^\]]*\]\(([^)]+)\)$/.exec(target);
  rows.push({id,name,scope,deps,status,target:['—','-',''].includes(target)?null:link?link[1]:target.replace(/^`|`$/g,''),link:Boolean(link)});
 }return {meta,rows};
}
