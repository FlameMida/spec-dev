#!/usr/bin/env node
// spec-dev 漂移守卫安装器：把守卫全套装进目标仓库（默认当前仓库）。
//
//   node install.mjs [--repo <path>] [--no-git-hook] [--no-ci]
//
// 装什么：
//   scripts/spec-dev/check-spec-drift.mjs   核心校验器
//   scripts/spec-dev/session-context.mjs    会话上下文注入脚本
//   .claude/settings.json                   合并 PreToolUse + SessionStart hooks（Claude Code）
//   .codex/hooks.json                       合并 PreToolUse + SessionStart hooks（Codex）
//   CLAUDE.md / AGENTS.md                    追加/更新守卫软提示段（标记块内幂等替换）
//   .git/hooks/pre-commit                    追加守卫调用（除非 --no-git-hook）
//   .github/workflows/spec-dev-drift-guard.yml  CI 兜底（除非 --no-ci）
//
// 幂等：可重复运行；软提示段与 hook 条目按标记/键去重，不重复堆叠。

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.join(HERE, "templates");
const args = process.argv.slice(2);
const opt = (name) => args.includes(name);
const val = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};

const repo = path.resolve(val("--repo") || detectRepo());
log(`目标仓库：${repo}`);

const done = [];

// 1) 脚本
const scriptsDir = path.join(repo, "scripts", "spec-dev");
mkdirSync(scriptsDir, { recursive: true });
copyFileSync(path.join(HERE, "check-spec-drift.mjs"), path.join(scriptsDir, "check-spec-drift.mjs"));
copyFileSync(path.join(HERE, "session-context.mjs"), path.join(scriptsDir, "session-context.mjs"));
done.push("scripts/spec-dev/{check-spec-drift,session-context}.mjs");

// 2) Claude settings.json —— 深合并 hooks
mergeJsonHooks(
  path.join(repo, ".claude", "settings.json"),
  readJson(path.join(TPL, "claude-settings.json")).hooks,
);
done.push(".claude/settings.json (hooks 已合并)");

// 3) Codex hooks.json —— 深合并 hooks
const codexTpl = readJson(path.join(TPL, "codex-hooks.json"));
mergeJsonHooks(path.join(repo, ".codex", "hooks.json"), codexTpl.hooks, codexTpl.description);
done.push(".codex/hooks.json (hooks 已合并)");

// 4) 软提示段
mergeSnippet(path.join(repo, "CLAUDE.md"), readFileSync(path.join(TPL, "CLAUDE.md.snippet"), "utf8"));
mergeSnippet(path.join(repo, "AGENTS.md"), readFileSync(path.join(TPL, "AGENTS.md.snippet"), "utf8"));
done.push("CLAUDE.md / AGENTS.md (守卫段已写入)");

// 5) git pre-commit
if (!opt("--no-git-hook")) {
  installPreCommit(repo);
  done.push(".git/hooks/pre-commit (守卫调用已追加)");
}

// 6) CI
if (!opt("--no-ci")) {
  const wfDir = path.join(repo, ".github", "workflows");
  mkdirSync(wfDir, { recursive: true });
  copyFileSync(path.join(TPL, "github-workflow.yml"), path.join(wfDir, "spec-dev-drift-guard.yml"));
  done.push(".github/workflows/spec-dev-drift-guard.yml");
}

log("\n✓ 安装完成：");
for (const d of done) log(`  · ${d}`);
log("\n提示：确保 spec 的 frontmatter 填了 spec_dev.covers 且 status: active，守卫才会生效。");

// —— helpers ——

function detectRepo() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

// 把模板 hooks 深合并进目标 settings：同事件下按 command 去重，避免重装堆叠。
function mergeJsonHooks(file, newHooks, description) {
  mkdirSync(path.dirname(file), { recursive: true });
  const cur = existsSync(file) ? readJson(file) : {};
  if (description && !cur.description) cur.description = description;
  cur.hooks = cur.hooks || {};
  for (const [event, groups] of Object.entries(newHooks)) {
    cur.hooks[event] = cur.hooks[event] || [];
    for (const group of groups) {
      const cmds = new Set(
        cur.hooks[event].flatMap((g) => (g.hooks || []).map((h) => h.command)),
      );
      const fresh = (group.hooks || []).filter((h) => !cmds.has(h.command));
      if (fresh.length === 0) continue;
      // 复用同 matcher 的已有 group，否则新建
      const existing = cur.hooks[event].find((g) => g.matcher === group.matcher);
      if (existing) existing.hooks.push(...fresh);
      else cur.hooks[event].push({ ...group, hooks: fresh });
    }
  }
  writeFileSync(file, JSON.stringify(cur, null, 2) + "\n");
}

// 在标记块之间幂等替换软提示段；无标记则追加到文件末尾。
function mergeSnippet(file, snippet) {
  const START = "<!-- spec-dev:guardrail:start";
  const END = "spec-dev:guardrail:end -->";
  const body = existsSync(file) ? readFileSync(file, "utf8") : "";
  const s = body.indexOf(START);
  const e = body.indexOf(END);
  let next;
  if (s !== -1 && e !== -1) {
    next = body.slice(0, s) + snippet.trim() + body.slice(e + END.length);
  } else {
    next = (body.trimEnd() + "\n\n" + snippet.trim() + "\n").replace(/^\n+/, "");
  }
  writeFileSync(file, next.endsWith("\n") ? next : next + "\n");
}

function installPreCommit(repo) {
  let hooksPath;
  try {
    hooksPath = execFileSync("git", ["-C", repo, "rev-parse", "--git-path", "hooks"], {
      encoding: "utf8",
    }).trim();
  } catch {
    log("  ! 非 git 仓库，跳过 pre-commit");
    return;
  }
  const abs = path.isAbsolute(hooksPath) ? hooksPath : path.join(repo, hooksPath);
  mkdirSync(abs, { recursive: true });
  const target = path.join(abs, "pre-commit");
  const LINE = 'node "$(git rev-parse --show-toplevel)/scripts/spec-dev/check-spec-drift.mjs" --staged || exit 1';
  if (existsSync(target)) {
    const cur = readFileSync(target, "utf8");
    if (cur.includes("check-spec-drift.mjs")) return; // 已装
    writeFileSync(target, cur.trimEnd() + "\n\n# spec-dev 漂移守卫\n" + LINE + "\n");
  } else {
    copyFileSync(path.join(TPL, "pre-commit"), target);
  }
  chmodSync(target, 0o755);
}

function log(msg) {
  process.stdout.write(msg + "\n");
}
