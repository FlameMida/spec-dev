import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const cli = fileURLToPath(new URL("../validate-output.mjs", import.meta.url));
function run(value) {
  const dir = mkdtempSync(path.join(tmpdir(), "review-findings-"));
  try {
    const file = path.join(dir, "report.json");
    writeFileSync(file, JSON.stringify(value));
    const result = spawnSync(process.execPath, [cli, "review-findings", file], { encoding: "utf8" });
    assert.equal(result.error, undefined);
    return { code: result.status, body: JSON.parse(result.status === 0 ? result.stdout : result.stderr) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
function report(category = "Bug") {
  return { findings: [{ file: "src/cart.js", line: 3, severity: "中", confidence: 90, category,
    description: "spec.md:8 要求空集合返回零；src/cart.js:3 返回 null，偏离空集合 Scenario。",
    fix_suggestion: "按现行空集合契约返回零并验证公共入口。" }],
    coverage_note: "审查 src/cart.js 空集合 Scenario；测试证据 test.log；其余范围未审查。" };
}
test("S19 新旧类别均有效", () => {
  for (const category of ["Bug", "安全", "性能", "规范", "质量", "建议", "Spec符合性"]) {
    const result = run(report(category)); assert.equal(result.code, 0, category); assert.equal(result.body.ok, true);
  }
});
test("S20 未知类别或缺字段", () => {
  const missing = report(); delete missing.findings[0].description;
  for (const [input, field] of [[report("未知"), "$.findings[0].category"],
      [missing, "$.findings[0].description"], [{...report(), coverage_note: ""}, "$.coverage_note"]]) {
    const result = run(input); assert.equal(result.code, 1); assert.equal(result.body.ok, false);
    assert.ok(result.body.errors.some(error => error.path === field));
  }
});
test("S21 没有发现的合法报告", () => {
  assert.equal(run({ findings: [], coverage_note: "已审 cart.js，零发现；测试证据 cart-test.log。" }).code, 0);
  assert.equal(run({ findings: [], coverage_note: "" }).code, 1);
});
