import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doctor = path.join(repoRoot, "scripts/doctor.mjs");
const runIn = (cwd, env = {}) => {
  try {
    return { out: execFileSync("node", [doctor, "--json"], { cwd, encoding: "utf8", env: { ...process.env, ...env } }), code: 0 };
  } catch (e) {
    return { out: e.stdout ?? "", code: e.status ?? 1 };
  }
};

test("Scenario: 未安装 guardrail 的项目——明确判定与安装指引", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "doctor-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const { out, code } = runIn(dir);
    const r = JSON.parse(out);
    assert.equal(r.guardrail.installed, false);
    assert.match(r.guardrail.hint, /guardrail\/install\.mjs/);
    assert.equal(code, 1, "存在需修复项时退出码应为 1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Scenario: anysearch 双副本歧义提示", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "doctor-dup-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    mkdirSync(path.join(dir, "fake-home/.claude/skills/anysearch-skill-main"), { recursive: true });
    const { out } = runIn(dir, { DOCTOR_HOME: path.join(dir, "fake-home") });
    const r = JSON.parse(out);
    assert.ok(r.anysearch.duplicates.length >= 1, "应检出独立副本");
    assert.match(r.anysearch.hint, /standalone|独立副本/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sequential-thinking 运行时链探测有三态", () => {
  const { out } = runIn(repoRoot);
  const r = JSON.parse(out);
  assert.ok(["ts-runtime", "node-port", "prose-fallback"].includes(r.sequentialThinking.chain));
});

test("Scenario: SessionStart hook 挂载域——声明式 hooks.json 与注入回放", () => {
  const { out } = runIn(repoRoot);
  const r = JSON.parse(out);
  assert.ok(["ok", "declared-empty", "missing"].includes(r.hooks.declarative), "declarative 应为三态之一");
  assert.equal(r.hooks.declarative, "ok", "本插件自带 hooks/hooks.json，SessionStart 声明应判 ok");
  assert.ok(r.hooks.injectionReplay.length > 0, "注入决策回放不应为空");
});

test("Scenario: anysearch 版本滞后检测——三态且默认可判定", () => {
  const { out } = runIn(repoRoot);
  const r = JSON.parse(out);
  assert.ok(
    ["up-to-date", "lagging", "unknown"].includes(r.anysearch.lag),
    "lag 应为三态之一（unknown=离线/检查失败不阻塞诊断）"
  );
  if (r.anysearch.lag === "lagging") {
    assert.match(r.anysearch.hint, /滞后|lagging|update-vendored/);
  }
});
