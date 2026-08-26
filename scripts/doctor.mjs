#!/usr/bin/env node
// spec-dev doctor：平台 / guardrail / 注入标记 / SessionStart hook 挂载（含注入决策回放）/ anysearch（含双副本歧义与版本滞后）/ sequential-thinking 六域健康诊断。
// 用法：node scripts/doctor.mjs [--json]   退出码：0 健康或仅提示；1 存在需修复项。
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = process.env.DOCTOR_HOME || homedir();
const cwd = process.cwd();
const json = process.argv.includes("--json");
const report = {};
let needsFix = false;

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd, ...opts });
  return r.status === 0 ? (r.stdout ?? "").trim() : null;
};

// 1. platform（本机可见的 agent 平台目录）
report.platform = {
  claudeCode: existsSync(path.join(HOME, ".claude")),
  codex: existsSync(path.join(HOME, ".codex")),
  grok: existsSync(path.join(HOME, ".grok")),
  pi: existsSync(path.join(HOME, ".pi")),
};

// 2. guardrail 安装状态（针对 cwd 项目）
const gitRoot = sh("git", ["rev-parse", "--show-toplevel"]);
const guardScript = gitRoot ? path.join(gitRoot, "scripts/spec-dev/check-spec-drift.mjs") : null;
const hooksPath = gitRoot ? (sh("git", ["config", "--get", "core.hooksPath"]) ?? "") : "";
const installed = Boolean(gitRoot && guardScript && existsSync(guardScript));
report.guardrail = {
  gitRepo: Boolean(gitRoot),
  installed,
  hooksPathEnabled: hooksPath.replace(/^\.\//, "").replace(/\/+$/, "") === ".githooks",
  hint: installed
    ? ""
    : "未安装：在项目内运行 node <spec-dev 插件目录>/guardrail/install.mjs 完成安装（写入 CLAUDE.md/AGENTS.md 标记块并挂 SessionStart hook）。/ Not installed: run node <plugin dir>/guardrail/install.mjs in the project.",
};
if (gitRoot && !installed) needsFix = true;

// 3. 注入标记块完整性（MARKER_START/MARKER_END 与 guardrail/install.mjs 的 START/END 字面量
//    双源维护——doctor.test.mjs 的标记同步测试锁定两处一致，改标记时两文件联动改）
const MARKER_START = "<!-- spec-dev:guardrail:start";
const MARKER_END = "spec-dev:guardrail:end -->";
const markerState = (file) => {
  if (!gitRoot) return "n/a";
  const p = path.join(gitRoot, file);
  if (!existsSync(p)) return "missing";
  const text = readFileSync(p, "utf8");
  const begin = text.includes(MARKER_START);
  const end = text.includes(MARKER_END);
  return begin && end ? "ok" : begin || end ? "broken" : "absent";
};
report.markers = { "CLAUDE.md": markerState("CLAUDE.md"), "AGENTS.md": markerState("AGENTS.md") };
if (Object.values(report.markers).includes("broken")) needsFix = true;

// 4. SessionStart hook 挂载：声明式 hooks.json 状态 + 会话注入决策回放（重放 session-context --explain：同输入同决策）
let declarative = "missing";
try {
  const hooksJson = JSON.parse(readFileSync(path.join(pluginRoot, "hooks/hooks.json"), "utf8"));
  const sessionStart = hooksJson?.hooks?.SessionStart;
  declarative = Array.isArray(sessionStart) && sessionStart.length > 0 ? "ok" : "declared-empty";
} catch {
  declarative = existsSync(path.join(pluginRoot, "hooks/hooks.json")) ? "declared-empty" : "missing";
}
const explain = spawnSync("node", [path.join(pluginRoot, "guardrail/session-context.mjs"), "--explain"], {
  cwd,
  encoding: "utf8",
});
report.hooks = {
  declarative,
  injectionReplay: ((explain.stdout || "") + (explain.stderr || "")).trim() || "（--explain 未实现或无输出 / no output）",
  hint:
    declarative === "ok"
      ? ""
      : "插件级 hooks/hooks.json 缺失或 SessionStart 声明为空：装载平台（Claude Code / Grok Build）不会自动注入会话上下文——重装插件恢复；git 闸门不受影响（guardrail/install.mjs 独立提供）。/ Plugin-level SessionStart hook missing or empty; reinstall the plugin. The git gate is unaffected (provided by guardrail/install.mjs).",
};
if (declarative !== "ok") needsFix = true;

// 5. anysearch：内嵌可用性 / 独立副本歧义 / 版本滞后
const embedded = path.join(pluginRoot, "skills/anysearch");
const duplicates = [];
for (const base of [".claude/skills", ".codex/skills"]) {
  const p = path.join(HOME, base);
  if (!existsSync(p)) continue;
  try {
    for (const d of readdirSync(p)) if (/anysearch/i.test(d)) duplicates.push(path.join(p, d));
  } catch {
    // 目录不可读不阻塞诊断
  }
}
// 版本滞后检测：复用 update-vendored-skill --check（0=最新；1 且输出含"发现新版本"=滞后；
// 其余含网络失败——它同样 exit 1 但无该标记——归 unknown，离线不阻塞诊断）
let lag = "unknown";
try {
  const check = spawnSync(
    "node",
    [path.join(pluginRoot, "scripts/update-vendored-skill.mjs"), "--skill", "anysearch", "--check"],
    { cwd: pluginRoot, encoding: "utf8", timeout: 20000 }
  );
  if (check.status === 0) lag = "up-to-date";
  else if (check.status === 1 && /发现新版本/.test((check.stdout ?? "") + (check.stderr ?? ""))) lag = "lagging";
} catch {
  // 超时/无法启动 → unknown
}
const dupHint = duplicates.length
  ? "检测到插件内嵌版之外的独立副本（standalone）：两者 description 相近会造成 skill 选择歧义，建议移除独立副本或知悉取舍。/ Standalone anysearch copies detected; consider removing them to avoid skill-selection ambiguity."
  : "";
const lagHint =
  lag === "lagging"
    ? "内嵌 anysearch 落后上游：运行 node scripts/update-vendored-skill.mjs --skill anysearch 同步。/ Embedded anysearch lags upstream; run update-vendored-skill to sync."
    : "";
report.anysearch = {
  embedded: existsSync(path.join(embedded, "SKILL.md")),
  duplicates,
  lag,
  hint: [dupHint, lagHint].filter(Boolean).join(" "),
};

// 6. sequential-thinking 运行时链：bun/tsx → node 端口 → 纯推演
const hasBun = spawnSync("bun", ["--version"], { encoding: "utf8" }).status === 0;
const hasTsx = spawnSync("tsx", ["--version"], { encoding: "utf8" }).status === 0;
const nodePort = existsSync(path.join(pluginRoot, "skills/sequential-thinking/scripts/think.mjs"));
report.sequentialThinking = {
  chain: hasBun || hasTsx ? "ts-runtime" : nodePort ? "node-port" : "prose-fallback",
  hint: hasBun || hasTsx || nodePort ? "" : "无可用运行时：工作流将降级为回复内分点推演（不中断）。/ No runtime; falls back to in-reply reasoning.",
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const [k, v] of Object.entries(report)) {
    console.log(`\n== ${k} ==`);
    for (const [kk, vv] of Object.entries(v)) {
      console.log(`  ${kk}: ${typeof vv === "object" ? JSON.stringify(vv) : vv}`);
    }
  }
  console.log(`\n${needsFix ? "✗ 存在需修复项（见各节 hint） / issues found" : "✓ 健康 / healthy"}`);
}
process.exit(needsFix ? 1 : 0);
