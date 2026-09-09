import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
test("S26 不因同名搬移用户文档",()=>{
 for(const target of [false,true]){
  const dir=mkdtempSync(path.join(tmpdir(),"ec-glossary-"));
  try {
   mkdirSync(path.join(dir,"docs"));writeFileSync(path.join(dir,"docs/glossary.md"),"USER_GLOSSARY\n");
   if(target){mkdirSync(path.join(dir,".spec-dev"));writeFileSync(path.join(dir,".spec-dev/glossary.md"),"TARGET_KEEP\n");}
   for(const flags of [["--dry-run"],[]]){
    const result=spawnSync(process.execPath,[path.join(root,"guardrail/migrate-to-spec-dev.mjs"),"--repo",dir,...flags],{encoding:"utf8"});
    assert.equal(result.status,0,result.stderr);
    assert.equal(readFileSync(path.join(dir,"docs/glossary.md"),"utf8"),"USER_GLOSSARY\n");
    if(target)assert.equal(readFileSync(path.join(dir,".spec-dev/glossary.md"),"utf8"),"TARGET_KEEP\n");
    else assert.equal(existsSync(path.join(dir,".spec-dev/glossary.md")),false);
   }
  } finally { rmSync(dir,{recursive:true,force:true}); }
 }
});
