import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readPolicy} from './helpers/policy-documents.mjs';
function fixture(body,run) {
 const root=mkdtempSync(path.join(tmpdir(),'policy-documents-'));
 try {
  mkdirSync(path.join(root,'skills/demo/references'),{recursive:true});
  writeFileSync(path.join(root,'skills/demo/SKILL.md'),body);
  writeFileSync(path.join(root,'skills/demo/references/rules.md'),'# Rules\n[back](../SKILL.md)\nRESOURCE_OWNERSHIP\n');
  run(root);
 } finally {rmSync(root,{recursive:true,force:true});}
}
test('S42 显式本地引用可达且循环只取一次',()=>fixture('[rules](references/rules.md)\n',root=>{
 const r=readPolicy(root,'skills/demo/SKILL.md');
 assert.equal(r.documents.length,2);assert.match(r.text,/RESOURCE_OWNERSHIP/);
}));
test('S42 丢失的适用引用显式失败',()=>fixture('[missing](references/missing.md)\n',root=>{
 assert.throws(()=>readPolicy(root,'skills/demo/SKILL.md'),/missing policy link/);
}));
test('S43 代码示例和其他技能不扩成实际读取',()=>fixture('`[inline](references/missing.md)`\n```md\n[x](references/nonexistent.md)\n```\n[x](../anysearch/SKILL.md)\n',root=>{
 assert.equal(readPolicy(root,'skills/demo/SKILL.md').documents.length,1);
 assert.throws(()=>readPolicy(root,'skills/anysearch/SKILL.md'),/excluded/);
}));
