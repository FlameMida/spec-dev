import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseParallelBlock, normalizeWrite, resolveWrite, conflicting } from "../lib/parallel-plan.mjs";
const block = (write = "src/a.mjs") => ['```yaml spec-dev-parallel', 'parallel:', '  tasks:', '    T01:', '      writes:', `        - ${JSON.stringify(write)}`, '      resources: []', '```'].join("\n");
test("S01 普通计划保持串行可执行", () => assert.equal(parseParallelBlock("# normal", ["T01"]), null));
test("S02 并发声明损坏不可交付", () => {
  assert.deepEqual([...parseParallelBlock(block(), ["T01"]).tasks.T01.writes], ["src/a.mjs"]);
  for (const text of [block().replace("T01:", "T99:"), block()+"\n"+block(), block().replace('      resources: []', '      resources: []\n      resources: []'), block().replace('      resources: []', '    T01:\n      writes: []\n      resources: []')]) assert.throws(() => parseParallelBlock(text, ["T01"]));
  for (const p of ["/tmp/x", "../x", "a/../x", "C:/x", ".git/config", ".spec-dev/a", "a//b", "a\\b", "src/*.mjs"]) assert.throws(() => normalizeWrite(p));
});
test("S09 同写锁文件的票不并发", () => {
  const a = { writes: ["src/a.mjs", "package-lock.json"], resources: [] };
  assert.equal(conflicting(a, {writes:["package-lock.json"],resources:[]}), true);
  assert.equal(conflicting(a, {writes:["src/b.mjs"],resources:["db:shared"]}), false);
  assert.equal(conflicting({writes:["a"],resources:["db:shared"]},{writes:["b"],resources:["db:shared"]}), true);
});
test("S10 路径越界结果拒收：符号链接与新文件", () => {
  const root=mkdtempSync(path.join(tmpdir(),"parallel-path-"));
  const other=mkdtempSync(path.join(tmpdir(),"parallel-out-"));
  try {
    mkdirSync(path.join(root,"src")); symlinkSync(other,path.join(root,"escape"));
    assert.equal(resolveWrite(root,"src/new.mjs"),"src/new.mjs");
    assert.throws(()=>resolveWrite(root,"escape/new.mjs"));
    assert.throws(()=>resolveWrite(root,"src"));
    symlinkSync(path.join(other,"missing"),path.join(root,"dangling"));
    assert.throws(()=>resolveWrite(root,"dangling/new.mjs"));
  } finally { rmSync(root,{recursive:true,force:true}); rmSync(other,{recursive:true,force:true}); }
});
