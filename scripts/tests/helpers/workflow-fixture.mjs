import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const specText=(status,extra='')=>'---\nspec_dev:\n  version: 1\n  feature: fixture\n  status: '+status+'\n  covers:\n    - "src/**"\n'+extra+'---\n# fixture\n';
// A throwaway repository with one source file and one spec that covers src/**.
export function workflowFixture(t,{status='active'}={}){
  const outer=realpathSync(mkdtempSync(path.join(tmpdir(),'workflow-contract-'))),root=path.join(outer,'repo');
  mkdirSync(root);t.after(()=>rmSync(outer,{recursive:true,force:true}));
  const git=(...a)=>execFileSync('git',['-C',root,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const put=(rel,text)=>{const p=path.join(root,rel);mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,text);};
  const commit=(message='fixture')=>{git('add','.');git('commit','-qm',message);return git('rev-parse','HEAD');};
  git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('config','core.hooksPath','/dev/null');
  put('src/app.mjs','export const value = 1;\n');commit('base');
  const feature='.spec-dev/fixture',spec=feature+'/spec/fixture-design.md';
  put(spec,specText(status));commit('spec');
  const run=(script,args=[],options={})=>spawnSync(process.execPath,[path.join(projectRoot,script),...args],{cwd:root,encoding:'utf8',...options});
  return {outer,root,feature,spec,put,git,commit,run};
}
