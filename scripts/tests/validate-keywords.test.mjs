import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/validate-output.mjs");
const good = JSON.parse(readFileSync(path.join(repoRoot, "plugin.json"), "utf8"));

const run = (data) => {
  const dir = mkdtempSync(path.join(tmpdir(), "vk-"));
  const file = path.join(dir, "plugin.json");
  writeFileSync(file, JSON.stringify(data));
  try {
    const out = execFileSync("node", [script, "agent-plugin-1.0.0", file], { encoding: "utf8" });
    rmSync(dir, { recursive: true, force: true });
    return { code: 0, out };
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    return { code: e.status ?? 1, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
};

test("Scenario: 官方 schema 的 const/pattern/additionalProperties 判别约束生效", () => {
  // 基线：真实 plugin.json 通过
  assert.equal(run(good).code, 0);
  // const 违反：$schema 值写错仍通过 = 校验空洞
  assert.equal(run({ ...good, $schema: "https://example.com/wrong" }).code, 1);
  // pattern 违反：name 含空格与大写
  assert.equal(run({ ...good, name: "Bad Name!!" }).code, 1);
  // additionalProperties:false 违反：塞入 schema 外的键
  assert.equal(run({ ...good, skills: "./skills" }).code, 1);
});

test("Scenario: maxLength 判别约束生效", () => {
  assert.equal(run({ ...good, name: "a".repeat(65) }).code, 1);
});
