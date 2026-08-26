import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(path.join(repoRoot, p), "utf8");

test("writing-plans 资源预登记按计划形态分流（progress.yaml resources 为分文件唯一登记处）", () => {
  const wp = read("skills/writing-plans/SKILL.md");
  // 牢记节与分流条款至少各有一处提及 progress.yaml resources
  assert.match(wp, /预登记[^\n]*progress\.yaml[^\n]*resources|resources[^\n]*progress\.yaml[^\n]*预登记/, "牢记/分流条款未落地 progress.yaml resources 分流");
  // 最终任务模板的台账小节声明分文件形态改走 progress.yaml
  assert.match(wp, /资源台账[^\n]*\n[^\0]*?分文件形态[^\n]*progress\.yaml|分文件形态[^\n]*progress\.yaml[^\n]*resources/, "最终任务模板未声明分文件形态的台账载体");
});

test("progressive-plan-format 生成规则含资源预登记条款", () => {
  const ppf = read("skills/writing-plans/references/progressive-plan-format.md");
  assert.match(ppf, /预登记/, "生成规则未提预登记");
  assert.match(ppf, /resources/, "生成规则未接 resources 键");
});

test("executing-plans 消费端分流已在位（防回归）", () => {
  const ep = read("skills/executing-plans/SKILL.md");
  assert.match(ep, /分文件形态登记进 progress\.yaml 的 resources 键/);
});
