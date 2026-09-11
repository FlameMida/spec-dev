import {readFileSync,existsSync,realpathSync} from 'node:fs';
import path from 'node:path';
export function readPolicy(root,entry) {
  const base=realpathSync(root);
  const initial=path.resolve(base,entry);
  const rel=path.relative(base,initial).split(path.sep);
  if(rel[0]!=='skills'||rel.length<3) throw new Error('policy entry must be inside skills/<name>');
  if(['anysearch','sequential-thinking'].includes(rel[1])) throw new Error('excluded policy');
  const owner=path.join(base,'skills',rel[1]);
  const seen=new Set(), documents=[];
  function visit(file) {
    const physical=realpathSync(file);
    const r=path.relative(owner,physical);
    if(r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r)) throw new Error('policy path escape');
    if(seen.has(physical)) return;
    seen.add(physical);
    const text=readFileSync(physical,'utf8');
    documents.push({file:path.relative(base,physical).split(path.sep).join('/'),text});
    let fence=null;
    for(const line of text.split('\n')) {
      const match=line.match(/^\s*(`{3,}|~{3,})/);
      if(match) {
        if(fence===null) fence=match[1];
        else if(match[1][0]===fence[0]&&match[1].length>=fence.length) fence=null;
        continue;
      }
      if(fence!==null) continue;
      const visible=line.replace(/(`+).*?\1/g,'');
      for(const link of visible.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
        const url=link[1];
        if(/^[a-zA-Z]+:/.test(url)||url.startsWith('#')||url.startsWith('/')) continue;
        const target=path.resolve(path.dirname(physical),decodeURIComponent(url.split('#')[0]));
        const within=path.relative(owner,target);
        if(within==='..'||within.startsWith('..'+path.sep)||path.isAbsolute(within)) continue;
        if(!target.endsWith('.md')) continue;
        if(!existsSync(target)) throw new Error('missing policy link: '+url);
        visit(target);
      }
    }
  }
  visit(initial);
  return {documents,text:documents.map(d=>d.text).join('\n')};
}
