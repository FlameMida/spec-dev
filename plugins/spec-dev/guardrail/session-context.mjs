#!/usr/bin/env node
// spec-dev 会话上下文注入：SessionStart hook 调用（Claude Code 与 Codex 通用）。
// stdout 会作为附加上下文注入会话，让未安装 spec-dev 插件的接手者也知道本仓库的流程义务。
import { execFileSync } from "node:child_process";

let specs = [];
try {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
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

console.log(`[spec-dev 流程提示] 本仓库采用 spec 驱动开发（spec-dev 工作流）：
- 现有 spec/plan 产物位于 docs/<日期-特性>/ 目录（共 ${specs.length} 份 spec）。
- 修改代码前，先查看其所属特性的 spec；行为变更必须同步更新 spec 的行为规范与验收矩阵，并与代码同一提交。
- 漂移守卫（preToolUse hook / pre-commit / CI）会拦截"改代码不同步 spec"的操作。
- 若安装了 spec-dev 插件，请用 requirement-analysis / writing-plans / executing-plans 工作流开展开发；未安装时，至少遵守上述同步义务。`);
