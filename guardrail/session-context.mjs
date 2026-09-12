#!/usr/bin/env node
// spec-dev 会话上下文注入：SessionStart hook 调用（Claude Code 与 Codex 通用）。
// stdout 会作为附加上下文注入会话，让未安装 spec-dev 插件的接手者也知道本仓库的流程义务；
// 同时做守卫健康自检——git 闸门未启用时，明确要求会话内的 agent 当场修复（会话自愈）。
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// --explain：去静默诊断模式（doctor 重放用）——输出一行注入决策与原因后退出，
// 不注入完整上下文；默认模式的静默语义（不污染会话）保持不变。
const EXPLAIN = process.argv.includes("--explain");
const decide = (decision, reason) => {
  if (EXPLAIN) console.log(`decision: ${decision} reason: ${reason}`);
  process.exit(0);
};

let root = "";
let specs = [];
let legacySpecs = [];
try {
  root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const lsSpecs = (patterns) =>
    execFileSync("git", ["ls-files", ...patterns], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  // 与 check-spec-drift.mjs loadActiveSpecs 的五条 glob 逐字对齐——注入侧与拦截侧对 spec 的认定必须一致
  specs = lsSpecs([
    ".spec-dev/**/spec/*-design.md",
    ".spec-dev/**/*-design.md",
    "docs/**/spec/*-design.md",
    "docs/**/*-design.md",
    ".specs/**/*.md",
  ]);
  legacySpecs = lsSpecs(["docs/**/spec/*-design.md", "docs/**/*-design.md"]);
} catch {
  // 非 git 环境静默退出，不污染会话（--explain 下给出原因）
  decide("skip", "not a git repo / 非 git 仓库");
}

if (specs.length === 0) decide("skip", "no tracked spec under .spec-dev|docs|.specs / 无已跟踪 spec");

// 同一会话去重：宿主以 stdin JSON 传 session_id；插件 hook 与仓库 hook 同时注册时只注入一次
let sessionId = "";
try {
  if (!process.stdin.isTTY) sessionId = String(JSON.parse(readFileSync(0, "utf8")).session_id || "");
} catch { /* 无 stdin 或非 JSON：不去重 */ }
if (/^[\w.-]{1,128}$/.test(sessionId)) {
  const marker = path.join(os.tmpdir(), `spec-dev-session-${sessionId}`);
  if (existsSync(marker)) decide("skip", "duplicate SessionStart in the same session / 同一会话重复注入");
  try { writeFileSync(marker, String(Date.now())); } catch { /* 写不了标记就不去重 */ }
}

// 状态细分计数：active 参与守卫，superseded 是历史层——接手会话第一眼需要知道两者都存在。
// 最小 frontmatter 读取（仅 status 一键），解析失败的文件不计入细分、仍在总数内。
const statusCount = { active: 0, superseded: 0 };
const unknownStatus = new Map(); // 非法枚举值 → 计数（draft 合法但不入细分；delivered/completed 等误用要显式告警）
for (const rel of specs) {
  try {
    // 只在顶部 frontmatter 块内匹配并容忍引号值——与 check-spec-drift.mjs 的 parseFrontmatter
    // 认定对齐（不以 --- 开头或无闭合线的文件整份忽略），防止正文 yaml 示例块被误计。
    const text = readFileSync(path.join(root, rel), "utf8");
    if (!text.startsWith("---")) continue;
    const end = text.indexOf("\n---", 3);
    if (end === -1) continue;
    const m = text.slice(0, end).match(/^\s{2}status:\s*["']?([\w-]+)["']?/m);
    if (!m) continue;
    if (statusCount[m[1]] !== undefined) statusCount[m[1]] += 1;
    else if (m[1] !== "draft") unknownStatus.set(m[1], (unknownStatus.get(m[1]) || 0) + 1);
  } catch {
    // 单文件读取失败不影响注入
  }
}

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
  const real = (p) => { try { return realpathSync(p); } catch { return p; } };
  const githooks = path.join(root, ".githooks");
  // worktree 中 hooksPath 常指向主工作区的 .githooks（git-common-dir 的上级），同样视为已启用
  let mainGithooks = githooks;
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: root, encoding: "utf8" }).trim();
    mainGithooks = path.join(path.dirname(common), ".githooks");
  } catch { /* 取不到 common dir 就只比较本工作区 */ }
  const resolved = real(path.resolve(root, hooksPath || ""));
  if (existsSync(path.join(githooks, "pre-commit")) && resolved !== real(githooks) && resolved !== real(mainGithooks)) {
    issues.push(
      "git gate not enabled: versioned hooks (.githooks/) exist but core.hooksPath does not point to them; run `git config core.hooksPath .githooks` now, then continue. / git 闸门未启用：仓库带有版本化 hooks（.githooks/），但 core.hooksPath 未指向它。请立即执行 `git config core.hooksPath .githooks` 修复，再继续其他工作。",
    );
  }
  const guardRel = "scripts/spec-dev/check-spec-drift.mjs";
  const referencesGuard = [".githooks/pre-commit", ".githooks/pre-push", ".claude/settings.json", ".codex/hooks.json"]
    .some((f) => existsSync(path.join(root, f)) && readFileSync(path.join(root, f), "utf8").includes(guardRel));
  if (referencesGuard && !existsSync(path.join(root, guardRel))) {
    issues.push(
      "guard script scripts/spec-dev/check-spec-drift.mjs missing: drift guard incomplete; re-run the installer (node guardrail/install.mjs). / 守卫脚本 scripts/spec-dev/check-spec-drift.mjs 缺失：漂移守卫不完整，请重新运行安装器（node guardrail/install.mjs）。",
    );
  }
  if (legacySpecs.length > 0) {
    const migrator = path.join(root, "scripts", "spec-dev", "migrate-to-spec-dev.mjs");
    issues.push(
      existsSync(migrator)
        ? `legacy spec-dev artifacts under docs/ (${legacySpecs.length} spec(s)): run \`node scripts/spec-dev/migrate-to-spec-dev.mjs\` now to auto-migrate them to .spec-dev/, then commit the move, then continue. / 检测到 docs/ 历史位置的 spec-dev 产物（${legacySpecs.length} 份 spec）：请立即运行 \`node scripts/spec-dev/migrate-to-spec-dev.mjs\` 自动迁移到 .spec-dev/ 并提交迁移，再继续其他工作。`
        : `legacy spec-dev artifacts under docs/ (${legacySpecs.length} spec(s)): migrate them to .spec-dev/ now (git mv the feature dirs plus docs/adr/, docs/explorations/, and rewrite in-file docs/ path references), commit, then continue. / 检测到 docs/ 历史位置的 spec-dev 产物（${legacySpecs.length} 份 spec）：请立即迁移到 .spec-dev/（git mv 特性目录及 docs/adr/、docs/explorations/，并重写文件内 docs/ 路径引用）并提交，再继续其他工作。`,
    );
  }
} catch {
  // 自检失败不阻塞上下文注入
}
if (unknownStatus.size > 0) {
  const detail = [...unknownStatus].map(([v, n]) => `${v}×${n}`).join(", ");
  issues.push(
    `unknown spec status value(s): ${detail} — not in draft|active|superseded, so these specs are NOT guarded. Fix them now: use active for current specs, or superseded (with superseded_by filled) for replaced ones. / 检测到未知 status 值（${detail}）——不在 draft|active|superseded 枚举内，这些 spec 不受守卫保护；请立即修正：现行 spec 用 active，已被取代的用 superseded 并填写 superseded_by。`,
  );
}
const health = issues.length ? `\n${issues.map((i) => `- ⚠ ${i}`).join("\n")}` : "";

if (EXPLAIN) {
  decide(
    "inject",
    `${specs.length} spec(s), ${statusCount.active} active, ${statusCount.superseded} superseded${issues.length ? `, ${issues.length} health issue(s)` : ""}`,
  );
}

console.log(`[spec-dev workflow notice / spec-dev 流程提示] This repository uses spec-driven development / 本仓库采用 spec 驱动开发（spec-dev 工作流）:
- Existing spec/plan artifacts live under .spec-dev/ (${specs.length} spec(s): ${statusCount.active} active, ${statusCount.superseded} superseded); legacy ones under docs/ are auto-migrated there. / 现有 spec/plan 产物位于 .spec-dev/<日期-特性>/ 目录（共 ${specs.length} 份 spec：${statusCount.active} active, ${statusCount.superseded} superseded）；docs/ 历史位置的产物会被自动迁移过去。
- Before changing code, check the owning feature's spec; behavior changes must update the spec (requirements + acceptance matrix) in the same commit. / 修改代码前，先查看其所属特性的 spec；行为变更必须同步更新 spec 的行为规范与验收矩阵，并与代码同一提交。
- The drift guard (PreToolUse/Stop hooks / pre-commit / pre-push / CI) blocks code changes that skip spec sync; update the spec first, then the code. / 漂移守卫（PreToolUse/Stop hook / pre-commit / pre-push / CI）会拦截"改代码不同步 spec"的操作；先改 spec 再改代码即放行。
- With the spec-dev plugin installed, use requirement-analysis / writing-plans / executing-plans; otherwise honor the sync obligations above. / 若安装了 spec-dev 插件，请用 requirement-analysis / writing-plans / executing-plans 工作流开展开发；未安装时，至少遵守上述同步义务。${health}`);
