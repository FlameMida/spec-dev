import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wp = readFileSync(path.join(repoRoot, "skills/writing-plans/SKILL.md"), "utf8");

test("Scenario: 小计划也产分文件——writing-plans 无按规模分流判定", () => {
  // 注意:验收矩阵表头的"阈值/预期""阈值数字"是合法用法,正则只锁门控条款措辞
  assert.doesNotMatch(wp, /形态分流|阈值门控|任务数\s*>?\s*8|正文预估[^。]*25KB|低于阈值维持/, "不应存在阈值门控条款");
  assert.doesNotMatch(wp, /单文件形态[^\n]*默认|默认[^\n]*单文件形态/, "不应有单文件默认表述");
  assert.match(wp, /plan\/index\.md/, "应声明 index.md");
  assert.match(wp, /plan\/progress\.yaml/, "应声明 progress.yaml");
});

test("Scenario: 阈值条款不复存在 + reference 已并入本体", () => {
  assert.ok(!existsSync(path.join(repoRoot, "skills/writing-plans/references/progressive-plan-format.md")), "reference 应已删除");
  assert.doesNotMatch(wp, /progressive-plan-format/, "SKILL.md 不应再引用该 reference");
  assert.match(wp, /任务导航表/, "导航表规则应并入本体");
  assert.match(wp, /format_version/, "progress.yaml 键结构应并入本体");
});

test("Scenario: 任务文件无复选框(步骤标题式)", () => {
  assert.match(wp, /「?\*\*步骤 N:\*\*」?标题式/, "应声明步骤标题式");
  assert.doesNotMatch(wp, /步骤用复选框|用复选框（`- \[ \]`）语法跟踪/, "不应保留复选框跟踪语义");
});

test("Scenario: 资源台账规范定义点在 progress.yaml 键结构节", () => {
  assert.match(wp, /resources[^\n]*键[^\n]*台账|资源台账[^\n]*progress\.yaml[^\n]*resources/, "台账定义点应锚定 progress.yaml resources");
});
