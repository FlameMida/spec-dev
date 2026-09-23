// Pure record parsing shared by plugin and independently installed guard.
const own=(x,k)=>Object.hasOwn(x,k);
const jsonNeed=(v,m)=>{if(!v)throw new Error(m);};
// Recursive JSON reader preserves object-key uniqueness before JSON.parse can erase it.
export function parseUniqueJson(text){
  let i=0; const ws=()=>{while(/\s/.test(text[i]??'') && i<text.length)i++;};
  const string=()=>{
    const start=i++; while(i<text.length){
      if(text[i]==='\\'){i+=2;continue;}
      if(text[i++]==='"') return JSON.parse(text.slice(start,i));
    } throw new Error('unterminated JSON string');
  };
  const value=()=>{
    ws();
    if(text[i]==='"') return string();
    if(text[i]==='{'){
      i++;ws(); const result=Object.create(null);
      if(text[i]==='}'){i++;return result;}
      while(i<text.length){
        jsonNeed(text[i]==='"','JSON object key at '+i);const k=string();
        jsonNeed(!own(result,k),'duplicate JSON key: '+k);ws();jsonNeed(text[i++]===':','expected colon');
        result[k]=value();ws();const end=text[i++];if(end==='}')return result;
        jsonNeed(end===',','expected comma');ws();
      }
    }else if(text[i]==='['){
      i++;ws();const result=[];if(text[i]===']'){i++;return result;}
      while(i<text.length){result.push(value());ws();const end=text[i++];if(end===']')return result;jsonNeed(end===',','expected comma');}
    }else{
      const m=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
      jsonNeed(m,'invalid JSON value at '+i);i+=m[0].length;return JSON.parse(m[0]);
    }
    throw new Error('unterminated JSON value');
  };
  const result=value();ws();jsonNeed(i===text.length,'trailing JSON at '+i);return result;
}
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
