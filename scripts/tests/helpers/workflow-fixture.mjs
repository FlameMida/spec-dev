import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export function workflowFixture(t){
  const outer=realpathSync(mkdtempSync(path.join(tmpdir(),'workflow-contract-'))),root=path.join(outer,'repo');
  mkdirSync(root);t.after(()=>rmSync(outer,{recursive:true,force:true}));
  const git=(...a)=>execFileSync('git',['-C',root,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const put=(rel,text)=>{const p=path.join(root,rel);mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,text);};
  const commit=(message='fixture')=>{git('add','.');git('commit','-qm',message);return git('rev-parse','HEAD');};
  git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('config','core.hooksPath','/dev/null');
  put('src/app.mjs','export const value = 1;\n');const base=commit('base');
  const feature='.spec-dev/fixture',plan=feature+'/plan/index.md',spec=feature+'/spec/fixture-design.md';
  put('.gitignore','.spec-dev/**/execution/\n');
  put(spec,'---\nspec_dev:\n  version: 1\n  feature: fixture\n  status: active\n  covers:\n    - "src/**"\n---\n# fixture\n');
  const index='# fixture\n\n| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n| T00 | — | none | base |\n| T01 | T00 | base | code |\n| T02 | T01 | code | verified |\n| T03 | T02 | verified | delivered |\n';
  const scopes={version:1,final_task:'T02',acceptance_tasks:[],tasks:{T01:{writes:['src/app.mjs'],specs:[spec],authorization_ref:'fixture-explicit-execution'}}};
  const setScopes=(value,extra='')=>put(plan,index+'\n```json spec-dev-scopes\n'+JSON.stringify(value,null,2)+'\n```\n'+extra);
  setScopes(scopes);
  for(const id of ['T00','T01','T02','T03'])put(feature+'/plan/tasks/'+id+'.md','# '+id+'\n');
  const state={format_version:1,current:'T01',tasks:{T00:{status:'completed',commit:base},T01:{status:'in_progress'},T02:{status:'pending'},T03:{status:'pending'}},resources:[],notes:[]};
  const save=()=>{put(feature+'/plan/progress.yaml',JSON.stringify(state,null,2)+'\n');return commit();};save();
  const run=(script,args=[],options={})=>spawnSync(process.execPath,[path.join(projectRoot,script),...args],{cwd:root,encoding:'utf8',...options});
  return {outer,root,feature,plan,spec,state,scopes,index,setScopes,put,git,commit,save,run};
}
