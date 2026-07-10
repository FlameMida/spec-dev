#!/usr/bin/env node
// spec-dev 漂移守卫安装器：把守卫全套装进目标仓库（默认当前仓库）。
//
//   node install.mjs [--repo <path>] [--no-git-hook] [--no-ci]
//
// 装什么：
//   scripts/spec-dev/check-spec-drift.mjs   核心校验器
//   scripts/spec-dev/session-context.mjs    会话上下文注入脚本（含守卫健康自检）
//   .claude/settings.json                   合并 PreToolUse + Stop + SessionStart hooks（Claude Code）
//   .codex/hooks.json                       合并 PreToolUse + SessionStart hooks（Codex）
//   CLAUDE.md / AGENTS.md                    追加/更新守卫软提示段（标记块内幂等替换）
//   .githooks/{pre-commit,pre-push}          版本化 git hooks + git config core.hooksPath（除非 --no-git-hook；
//                                            已设 core.hooksPath 时写入既有目录，不改配置）
//   package.json                             注入 prepare 脚本自动启用 hooksPath（仅当 .githooks 由本安装器启用）
//   .github/workflows/spec-dev-drift-guard.yml  CI 兜底（除非 --no-ci）
//
// 幂等：可重复运行；软提示段与 hook 条目按标记/键去重，不重复堆叠。

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.join(HERE, "templates");
// 主流程在模块顶层立即执行，常量必须先于它声明（避免 TDZ）
const PREPARE_CMD = "git config core.hooksPath .githooks";
const args = process.argv.slice(2);
const opt = (name) => args.includes(name);
const val = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};

const repo = path.resolve(val("--repo") || detectRepo());
log(`Target repo / 目标仓库：${repo}`);

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
done.push(".claude/settings.json (hooks merged / hooks 已合并)");

// 3) Codex hooks.json —— 深合并 hooks
const codexTpl = readJson(path.join(TPL, "codex-hooks.json"));
mergeJsonHooks(path.join(repo, ".codex", "hooks.json"), codexTpl.hooks, codexTpl.description);
done.push(".codex/hooks.json (hooks merged / hooks 已合并)");

// 4) 软提示段
if (mergeSnippet(path.join(repo, "CLAUDE.md"), readFileSync(path.join(TPL, "CLAUDE.md.snippet"), "utf8")))
  done.push("CLAUDE.md (guard section written / 守卫段已写入)");
if (mergeSnippet(path.join(repo, "AGENTS.md"), readFileSync(path.join(TPL, "AGENTS.md.snippet"), "utf8")))
  done.push("AGENTS.md (guard section written / 守卫段已写入)");

// 5) git hooks（版本化 pre-commit + pre-push）
if (!opt("--no-git-hook")) {
  const res = installGitHooks(repo);
  if (res) {
    done.push(`${res.hooksDir}/{pre-commit,pre-push} (guard installed / 守卫已安装)`);
    if (res.configured) done.push("git config core.hooksPath .githooks (set / 已设置)");
    if (installPrepareScript(repo, res)) done.push("package.json prepare script (auto-enables hooksPath on install / install 时自动启用 hooksPath)");
  }
}

// 6) CI
if (!opt("--no-ci")) {
  const wfDir = path.join(repo, ".github", "workflows");
  mkdirSync(wfDir, { recursive: true });
  copyFileSync(path.join(TPL, "github-workflow.yml"), path.join(wfDir, "spec-dev-drift-guard.yml"));
  done.push(".github/workflows/spec-dev-drift-guard.yml");
}

log("\n✓ Install complete / 安装完成：");
for (const d of done) log(`  · ${d}`);
log("\nNote: the guard only activates when spec frontmatter has spec_dev.covers filled and status: active. / 提示：确保 spec 的 frontmatter 填了 spec_dev.covers 且 status: active，守卫才会生效。");

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
// 标记残缺（只剩单侧）或顺序颠倒时拒绝改写：盲目追加会让下次重装误切标记之间的用户内容。
function mergeSnippet(file, snippet) {
  const START = "<!-- spec-dev:guardrail:start";
  const END = "spec-dev:guardrail:end -->";
  const body = existsSync(file) ? readFileSync(file, "utf8") : "";
  const s = body.indexOf(START);
  const e = body.indexOf(END);
  if ((s === -1) !== (e === -1) || (s !== -1 && e < s)) {
    log(`  ! ${path.relative(repo, file)} : guard markers incomplete or out of order; file skipped — restore paired start/end markers and reinstall. / 守卫标记不完整或顺序异常，已跳过该文件；请手工恢复成对的 start/end 标记后重装`);
    return false;
  }
  let next;
  if (s !== -1 && e !== -1) {
    next = body.slice(0, s) + snippet.trim() + body.slice(e + END.length);
  } else {
    next = (body.trimEnd() + "\n\n" + snippet.trim() + "\n").replace(/^\n+/, "");
  }
  writeFileSync(file, next.endsWith("\n") ? next : next + "\n");
  return true;
}

// 版本化 git hooks：尊重既有 core.hooksPath（写入该目录，不动配置）；
// 未设置时启用仓库内 .githooks/ 并写入本地 git config。模板 hook 会串联 .git/hooks 里的历史 hook。
function installGitHooks(repo) {
  try {
    execFileSync("git", ["-C", repo, "rev-parse", "--git-dir"], { encoding: "utf8" });
  } catch {
    log("  ! not a git repo, skipping git hooks / 非 git 仓库，跳过 git hooks");
    return null;
  }
  let hooksPath = "";
  try {
    hooksPath = execFileSync("git", ["-C", repo, "config", "--get", "core.hooksPath"], {
      encoding: "utf8",
    }).trim();
  } catch {
    // 未设置 core.hooksPath
  }
  const own = !hooksPath;
  if (own) hooksPath = ".githooks";
  const dir = path.isAbsolute(hooksPath) ? hooksPath : path.join(repo, hooksPath);
  mkdirSync(dir, { recursive: true });
  for (const name of ["pre-commit", "pre-push"]) {
    const target = path.join(dir, name);
    if (existsSync(target)) {
      const cur = readFileSync(target, "utf8");
      if (!cur.includes("check-spec-drift.mjs")) {
        // 守卫行注入到 shebang 之后而非文件末尾：legacy hook 若以 exit 0 结尾，尾部追加的守卫永远执行不到
        const guard = "\n# spec-dev 漂移守卫（前置注入，避免被 legacy hook 的 exit 旁路）\n" + guardLine(name) + "\n";
        let next;
        if (cur.startsWith("#!")) {
          const nl = cur.indexOf("\n");
          next = nl === -1 ? cur + guard : cur.slice(0, nl + 1) + guard + cur.slice(nl + 1);
        } else {
          next = "#!/bin/sh\n" + guard + "\n" + cur;
        }
        writeFileSync(target, next);
      }
    } else {
      copyFileSync(path.join(TPL, name), target);
    }
    chmodSync(target, 0o755);
  }
  let configured = false;
  if (own) {
    try {
      execFileSync("git", ["-C", repo, "config", "core.hooksPath", ".githooks"]);
      configured = true;
    } catch {
      log("  ! cannot write git config (read-only sandbox?); run manually: git config core.hooksPath .githooks / 无法写 git config（沙箱只读？），请手工执行：git config core.hooksPath .githooks");
    }
  }
  return { hooksDir: hooksPath.replace(/\/+$/, ""), own, configured };
}

function guardLine(name) {
  const guard = '"$(git rev-parse --show-toplevel)/scripts/spec-dev/check-spec-drift.mjs"';
  return name === "pre-push"
    ? `node ${guard} --push || exit 1`
    : `node ${guard} --staged || exit 1`;
}

// package.json prepare —— 仅当 .githooks 由本安装器启用时注入，
// 让 npm/pnpm/yarn install 自动设置 core.hooksPath，新 clone 即带闸门。
function installPrepareScript(repo, res) {
  if (!res.own) return false; // 已有自定义 hooksPath（如 husky），交由原机制管理
  const pkgPath = path.join(repo, "package.json");
  if (!existsSync(pkgPath)) return false;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    log("  ! package.json 解析失败，跳过 prepare 注入");
    return false;
  }
  pkg.scripts = pkg.scripts || {};
  const cur = pkg.scripts.prepare;
  if (typeof cur === "string" && cur.includes(PREPARE_CMD)) return false; // 已注入
  pkg.scripts.prepare = cur ? `${cur} && ${PREPARE_CMD}` : PREPARE_CMD;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return true;
}

function log(msg) {
  process.stdout.write(msg + "\n");
}
