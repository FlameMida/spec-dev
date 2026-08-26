import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKILLS = [
  "exploring",
  "quick-fix",
  "executing-plans",
  "writing-plans",
  "acceptance-qa",
  "clarifying",
  "test-driven-development",
  "using-git-worktrees",
  "visual-preview",
  "test-strategy", // T20 新增；requirement-analysis 是条款定义点、不列入
];

for (const s of SKILLS) {
  test(`统一搜索条款存在于 ${s}`, () => {
    const text = readFileSync(path.join(repoRoot, `skills/${s}/SKILL.md`), "utf8");
    assert.match(text, /外部搜索统一入口/, `${s} 缺统一条款`);
    assert.match(text, /anysearch/, `${s} 未提及 anysearch`);
  });
}
