#!/usr/bin/env node
// spec-dev 会话上下文注入：SessionStart hook 调用（Claude Code 与 Codex 通用）。
// stdout 会作为附加上下文注入会话，让未安装 spec-dev 插件的接手者也知道本仓库的流程义务；
// 同时做守卫健康自检——git 闸门未启用时，明确要求会话内的 agent 当场修复（会话自愈）。
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

let root = "";
let specs = [];
try {
  root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  specs = execFileSync("git", ["ls-files", "docs/**/spec/*-design.md", ".specs/**/*.md"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
} catch {
  // 非 git 环境静默退出，不污染会话
  process.exit(0);
}

if (specs.length === 0) process.exit(0);

// —— 守卫健康自检 ——
const issues = [];
try {
  let hooksPath = "";
  try {
    hooksPath = execFileSync("git", ["config", "--get", "core.hooksPath"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    // 未设置
  }
  const normalized = hooksPath.replace(/^\.\//, "").replace(/\/+$/, "");
  if (existsSync(path.join(root, ".githooks", "pre-commit")) && normalized !== ".githooks") {
    issues.push(
      "git gate not enabled: versioned hooks (.githooks/) exist but core.hooksPath does not point to them; run `git config core.hooksPath .githooks` now, then continue. / git 闸门未启用：仓库带有版本化 hooks（.githooks/），但 core.hooksPath 未指向它。请立即执行 `git config core.hooksPath .githooks` 修复，再继续其他工作。",
    );
  }
  if (!existsSync(path.join(root, "scripts", "spec-dev", "check-spec-drift.mjs"))) {
    issues.push(
      "guard script scripts/spec-dev/check-spec-drift.mjs missing: drift guard incomplete; re-run the installer (node guardrail/install.mjs). / 守卫脚本 scripts/spec-dev/check-spec-drift.mjs 缺失：漂移守卫不完整，请重新运行安装器（node guardrail/install.mjs）。",
    );
  }
} catch {
  // 自检失败不阻塞上下文注入
}
const health = issues.length ? `\n${issues.map((i) => `- ⚠ ${i}`).join("\n")}` : "";

console.log(`[spec-dev workflow notice / spec-dev 流程提示] This repository uses spec-driven development / 本仓库采用 spec 驱动开发（spec-dev 工作流）:
- Existing spec/plan artifacts live under docs/ (${specs.length} spec(s)). / 现有 spec/plan 产物位于 docs/<日期-特性>/ 目录（共 ${specs.length} 份 spec）。
- Before changing code, check the owning feature's spec; behavior changes must update the spec (requirements + acceptance matrix) in the same commit. / 修改代码前，先查看其所属特性的 spec；行为变更必须同步更新 spec 的行为规范与验收矩阵，并与代码同一提交。
- The drift guard (PreToolUse/Stop hooks / pre-commit / pre-push / CI) blocks code changes that skip spec sync; update the spec first, then the code. / 漂移守卫（PreToolUse/Stop hook / pre-commit / pre-push / CI）会拦截"改代码不同步 spec"的操作；先改 spec 再改代码即放行。
- With the spec-dev plugin installed, use requirement-analysis / writing-plans / executing-plans; otherwise honor the sync obligations above. / 若安装了 spec-dev 插件，请用 requirement-analysis / writing-plans / executing-plans 工作流开展开发；未安装时，至少遵守上述同步义务。${health}`);
