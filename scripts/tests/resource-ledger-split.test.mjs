import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(path.join(repoRoot, p), "utf8");

test("writing-plans 资源预登记锚定 progress.yaml resources(唯一形态)", () => {
  const wp = read("skills/writing-plans/SKILL.md");
  assert.match(wp, /resources[^\n]*键[^\n]*预登记|预登记[^\n]*progress\.yaml[^\n]*resources/, "预登记应锚定 progress.yaml resources");
  assert.match(wp, /\*\*资源台账规范定义点\*\*/, "台账规范定义点应锚定 progress.yaml 键结构节");
});

test("executing-plans 登记落点为 progress.yaml resources(存量单文件兼容句在位)", () => {
  const ep = read("skills/executing-plans/SKILL.md");
  assert.match(ep, /登记进 progress\.yaml 的 `?resources`? 键/);
  assert.match(ep, /存量单文件[^\n]*台账行/, "存量兼容句应在位");
});

test("外围指针不悬空(quick-fix/acceptance-qa 不再定位到最终任务模板)", () => {
  assert.doesNotMatch(read("skills/quick-fix/SKILL.md"), /最终任务模板的资源台账定义/);
  assert.doesNotMatch(read("skills/acceptance-qa/SKILL.md"), /writing-plans 最终任务模板/);
  assert.match(read("skills/quick-fix/SKILL.md"), /writing-plans 的资源台账定义/);
});
