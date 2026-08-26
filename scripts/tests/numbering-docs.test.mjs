import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(path.join(repoRoot, p), "utf8");

test("特性目录命名规则含同日序号 NN 与重扫防撞", () => {
  const ra = read("skills/requirement-analysis/SKILL.md");
  assert.match(ra, /YYYY-MM-DD-NN-<feature>/);
  assert.match(ra, /当日已有.*取最大加一|扫描当日已有/);
  assert.match(ra, /落盘前重扫/);
  assert.match(ra, /grandfather|不改名/);
});

test("writing-plans 与 executing-plans 引用新命名（executing 保留旧命名读取）", () => {
  assert.match(read("skills/writing-plans/SKILL.md"), /YYYY-MM-DD-NN-/);
  const ep = read("skills/executing-plans/SKILL.md");
  assert.match(ep, /YYYY-MM-DD-NN-/);
  assert.match(ep, /旧命名.*按原样读取|YYYY-MM-DD-<feature>.*原样/);
});

test("两个模板标题行使用新命名", () => {
  assert.match(read("skills/requirement-analysis/assets/spec-template.md"), /YYYY-MM-DD-NN-/);
  assert.match(read("skills/requirement-analysis/assets/roadmap-template.md"), /YYYY-MM-DD-NN-/);
});
