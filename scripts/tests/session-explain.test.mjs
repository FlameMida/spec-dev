import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "guardrail/session-context.mjs");

test("Scenario: 非 git 目录的静默跳过去静默化（--explain 给出原因）", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nogit-"));
  try {
    const out = execFileSync("node", [script, "--explain"], { cwd: dir, encoding: "utf8" });
    assert.match(out, /decision: skip/);
    assert.match(out, /not a git repo|非 git 仓库/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("git 仓库但无已跟踪 spec 时给出跳过原因", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nospec-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const out = execFileSync("node", [script, "--explain"], { cwd: dir, encoding: "utf8" });
    assert.match(out, /decision: skip/);
    assert.match(out, /no tracked spec|无已跟踪 spec/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("合成仓库有已跟踪 spec 时 --explain 报告 inject 决策而不输出完整注入文本", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "tracked-spec-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const rel = ".spec-dev/demo/spec/demo-design.md";
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), "---\nspec_dev:\n  status: active\n---\n# Synthetic spec\n");
    execFileSync("git", ["add", "--", rel], { cwd: dir });
    const out = execFileSync("node", [script, "--explain"], { cwd: dir, encoding: "utf8" });
    assert.match(out, /decision: inject/);
    assert.ok(!out.includes("[spec-dev workflow notice"), "--explain 不应输出完整注入文本");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("默认模式行为不变（非 git 静默退出 0 且零输出）", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "silent-"));
  try {
    const out = execFileSync("node", [script], { cwd: dir, encoding: "utf8" });
    assert.equal(out, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
