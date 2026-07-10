#!/usr/bin/env node
// spec-dev 漂移守卫：单一事实源，被 pre-commit / pre-push / CI / Claude·Codex 的工具面 hook 共用。
//
// 判定：仓库内每个 status=active 的 spec 用 frontmatter 的 `covers` glob 声明它拥有的代码。
// 若一批变更改动了某 active spec 覆盖的代码，却没有同时改动该 spec 本身，则判为"漂移"——
// 代码走了、文档没跟上，拦截并打印指引。
//
// 用法：
//   node check-spec-drift.mjs --staged            # pre-commit：暂存区 vs HEAD
//   node check-spec-drift.mjs --range <A>..<B>    # CI / 区间检查；识别 Spec-Guard: off trailer
//   node check-spec-drift.mjs --push              # pre-push：从 stdin 读 ref 行，逐 ref 检查待推送区间
//   node check-spec-drift.mjs --files <f1> <f2>…  # 显式文件清单（相对仓库根）
//   node check-spec-drift.mjs --hook              # PreToolUse hook：从 stdin 读 JSON，取其中的文件路径
//   node check-spec-drift.mjs --worktree          # Stop hook 收尾审计：整个工作区（暂存+未暂存+未跟踪）vs HEAD
//
// 退出码：0 通过 / 1 检出漂移（git/CI 场景）/ 2 用法错误；--hook 与 --worktree 模式下漂移退出 2
// （两家 CLI 的阻断约定）。--worktree 在 stop_hook_active（同回合已拦截过）时降级为告警放行，避免拦截死循环。
//
// 临时放行：
//   · 提交信息留 `Spec-Guard: off <原因>` trailer —— --range/--push 识别后放行该提交并打印计数；
//   · 环境变量 SPEC_DEV_GUARD=off —— 单次全局关闭（打印警告）。

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const MODE = process.argv[2];
const TRAILER_RE = /^spec-guard:\s*(off|skip)\b/im;
// 主流程在模块顶层立即执行，可变状态必须先于它声明（避免 TDZ）
let stdinCache = null;

if (process.env.SPEC_DEV_GUARD === "off") {
  warn("SPEC_DEV_GUARD=off —— 漂移守卫已临时关闭，跳过检查。请在提交信息留 `Spec-Guard: off <原因>` 便于追溯。");
  process.exit(0);
}

try {
  const repoRoot = gitRoot();
  const changed = await collectChangedFiles(repoRoot);
  if (changed.length === 0) process.exit(0);

  const specs = loadActiveSpecs(repoRoot);
  if (specs.length === 0) process.exit(0);

  // 触发集 changed 判定"这次动了哪些代码"；--hook 模式额外把工作区已有改动（暂存+未暂存+未跟踪）
  // 并入"spec 是否已同步"的认定：spec 先改好（尚未提交）后，对覆盖代码的后续编辑即放行。
  // 注意工作区脏文件不扩大触发集，避免编辑无关文件时被既有漂移误伤。
  const syncContext = MODE === "--hook" ? workingTreeDirty(repoRoot) : [];
  const changedSet = new Set(changed.map(normalize));
  const touchedSet = new Set([...changedSet, ...syncContext.map(normalize)]);
  const violations = [];

  for (const spec of specs) {
    if (spec.covers.length === 0) continue;
    // spec 自身是否已被同步（本批变更或工作区）
    const specTouched = touchedSet.has(normalize(spec.relPath));
    const hitCode = changed.filter((f) => f !== spec.relPath && spec.matches(f));
    if (hitCode.length > 0 && !specTouched) {
      violations.push({ spec: spec.relPath, feature: spec.feature, code: hitCode });
    }
  }

  if (violations.length > 0) {
    if (MODE === "--worktree" && stopHookActive()) {
      warn("工作区仍存在未同步的 spec 漂移（本回合已提示过，不再阻断收尾）——请尽快同步对应 spec。");
      process.exit(0);
    }
    report(violations);
    // Claude Code 与 Codex 的阻断 hook 约定一致：退出码 2 + stderr = 阻断并把 stderr 回灌给模型；
    // git/CI 场景沿用惯例退出码 1。
    process.exit(MODE === "--hook" || MODE === "--worktree" ? 2 : 1);
  }
  process.exit(0);
} catch (error) {
  // 守卫自身故障绝不应误伤提交流程：打印告警但放行，让真正的防线（CI）兜底。
  warn(`漂移守卫执行异常，已放行（请检查守卫脚本）：${error instanceof Error ? error.message : String(error)}`);
  process.exit(0);
}

// —— 变更集采集 ——

async function collectChangedFiles(repoRoot) {
  if (MODE === "--staged") {
    return gitLines(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], repoRoot);
  }
  if (MODE === "--range") {
    const range = process.argv[3];
    if (!range) usage();
    return rangeChangedFiles(range, repoRoot);
  }
  if (MODE === "--files") {
    return process.argv.slice(3).map((f) => toRepoRel(f, repoRoot)).filter(Boolean);
  }
  if (MODE === "--hook") {
    const raw = readStdin();
    return extractHookFiles(raw).map((f) => toRepoRel(f, repoRoot)).filter(Boolean);
  }
  if (MODE === "--worktree") {
    return workingTreeDirty(repoRoot);
  }
  if (MODE === "--push") {
    return pushChangedFiles(repoRoot);
  }
  usage();
}

// Claude 与 Codex 的 PreToolUse 载荷结构不同，这里做宽松抽取：
// 扫描常见的文件路径字段，取到什么用什么。
function extractHookFiles(raw) {
  if (!raw.trim()) return [];
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const out = new Set();
  const KEYS = ["file_path", "filePath", "path", "notebook_path", "target_file"];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    for (const [k, v] of Object.entries(node)) {
      if (KEYS.includes(k) && typeof v === "string") out.add(v);
      else walk(v);
    }
  };
  walk(json);
  return [...out];
}

// 工作区全部改动（暂存 + 未暂存 + 未跟踪），路径相对仓库根。
function workingTreeDirty(repoRoot) {
  try {
    const out = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const tokens = out.split("\0").filter(Boolean);
    const files = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      files.push(t.slice(3));
      if (/[RC]/.test(t.slice(0, 2))) i++; // rename/copy 的下一个字段是原路径，跳过
    }
    return files;
  } catch {
    return [];
  }
}

// 区间变更集；识别提交信息中的 Spec-Guard: off/skip trailer，放行对应提交并打印计数。
// 无 trailer 时走端点 diff（一次 git 调用）；有 trailer 才逐提交聚合非放行提交的文件。
function rangeChangedFiles(range, repoRoot) {
  const endpointDiff = () => gitLines(["diff", "--name-only", "--diff-filter=ACMR", range], repoRoot);
  let raw;
  try {
    raw = execFileSync("git", ["log", "--format=%H%x00%B%x1e", range], { cwd: repoRoot, encoding: "utf8" });
  } catch {
    return endpointDiff();
  }
  const commits = raw
    .split("\x1e")
    .map((s) => s.replace(/^\s+/, ""))
    .filter(Boolean)
    .map((s) => {
      const [sha, ...body] = s.split("\0");
      return { sha: sha.trim(), body: body.join("\0") };
    })
    .filter((c) => c.sha);
  const waived = commits.filter((c) => TRAILER_RE.test(c.body));
  if (waived.length === 0) return endpointDiff();
  warn(
    `${waived.length} 个提交带 Spec-Guard: off 标记，已放行（请人工复核）：${waived
      .map((c) => c.sha.slice(0, 8))
      .join(" ")}`,
  );
  const files = new Set();
  for (const c of commits) {
    if (TRAILER_RE.test(c.body)) continue;
    for (const f of gitLines(
      ["diff-tree", "--no-commit-id", "--name-only", "-r", "--diff-filter=ACMR", c.sha],
      repoRoot,
    )) {
      files.add(f);
    }
  }
  return [...files];
}

// pre-push：stdin 每行 "<local_ref> <local_sha> <remote_ref> <remote_sha>"，逐 ref 计算待推送区间。
// 远端 sha 全零（新分支）时以 origin 默认分支的 merge-base 为界；解析不出则放行该 ref（fail-open）。
function pushChangedFiles(repoRoot) {
  const files = new Set();
  const lines = readStdin().split("\n").map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const [, localSha, , remoteSha] = line.split(/\s+/);
    if (!localSha || /^0+$/.test(localSha)) continue; // 删除远端分支，无需检查
    let range;
    if (!remoteSha || /^0+$/.test(remoteSha)) {
      const base = mergeBaseWithDefault(localSha, repoRoot);
      if (!base) continue;
      range = `${base}..${localSha}`;
    } else {
      range = `${remoteSha}..${localSha}`;
    }
    for (const f of rangeChangedFiles(range, repoRoot)) files.add(f);
  }
  return [...files];
}

function mergeBaseWithDefault(sha, repoRoot) {
  const candidates = [
    gitLines(["symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"], repoRoot)[0],
    "origin/main",
    "origin/master",
  ].filter(Boolean);
  for (const ref of candidates) {
    const base = gitLines(["merge-base", sha, ref], repoRoot)[0];
    if (base) return base;
  }
  return null;
}

// —— spec 加载与匹配 ——

function loadActiveSpecs(repoRoot) {
  const files = gitLines(
    ["ls-files", "docs/**/spec/*-design.md", "docs/**/*-design.md", ".specs/**/*.md"],
    repoRoot,
  );
  const seen = new Set();
  const specs = [];
  for (const relPath of files) {
    if (seen.has(relPath)) continue;
    seen.add(relPath);
    const abs = path.join(repoRoot, relPath);
    if (!existsSync(abs)) continue;
    const meta = parseFrontmatter(readFileSync(abs, "utf8"));
    if (!meta || !meta.spec_dev) continue;
    const sd = meta.spec_dev;
    if (sd.status !== "active") continue;
    const covers = Array.isArray(sd.covers) ? sd.covers.filter((c) => typeof c === "string" && c.trim()) : [];
    specs.push({
      relPath,
      feature: sd.feature || path.basename(relPath),
      covers,
      matches: (f) => covers.some((g) => globMatch(g, f)),
    });
  }
  return specs;
}

// 极简 YAML frontmatter 解析：只认本模板产出的形状（spec_dev: 下的 version/feature/status/covers/sync_commit）。
// 不引第三方 YAML 库，保持零依赖。
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end).split("\n");
  const root = {};
  let inSpecDev = false;
  let inCovers = false;
  const sd = {};
  for (const line of block) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (/^spec_dev:\s*$/.test(line)) {
      inSpecDev = true;
      inCovers = false;
      root.spec_dev = sd;
      continue;
    }
    if (inSpecDev && /^\s{2}covers:\s*(\[\s*\])?\s*$/.test(line)) {
      sd.covers = [];
      inCovers = true;
      continue;
    }
    if (inCovers) {
      const m = line.match(/^\s{4,}-\s*["']?([^"'#]+?)["']?\s*(#.*)?$/);
      if (m) {
        sd.covers.push(m[1].trim());
        continue;
      }
      inCovers = false; // covers 列表结束
    }
    if (inSpecDev) {
      const m = line.match(/^\s{2}(\w+):\s*(.*)$/);
      if (m) {
        const key = m[1];
        let val = stripComment(m[2]).trim();
        if (key === "covers") continue;
        if (val === "null" || val === "~" || val === "") sd[key] = null;
        else sd[key] = val.replace(/^["']|["']$/g, "");
        continue;
      }
      if (/^\S/.test(line)) inSpecDev = false; // 回到顶层键
    }
  }
  return root;
}

function stripComment(s) {
  // 去掉行内 # 注释，但不误伤引号内的 #
  let inQ = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === inQ) inQ = null;
    } else if (c === '"' || c === "'") inQ = c;
    else if (c === "#") return s.slice(0, i);
  }
  return s;
}

// —— glob 匹配：支持 **、*、?，路径以 / 分隔 ——

function globMatch(glob, file) {
  const re = globToRegExp(glob);
  return re.test(file);
}

function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // ** 跨目录；吞掉可能紧随的 /
        re += ".*";
        i++;
        if (glob[i + 1] === "/") i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") re += "[^/]";
    else if (".+^${}()|[]\\".includes(c)) re += "\\" + c;
    else re += c;
  }
  return new RegExp(re + "$");
}

// —— git 辅助 ——

function gitRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

function gitLines(args, cwd) {
  try {
    const out = execFileSync("git", args, { cwd, encoding: "utf8" });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function toRepoRel(file, repoRoot) {
  const abs = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  // 解析符号链接后再求相对路径：git 顶层目录常是 realpath（如 macOS /tmp→/private/tmp），
  // 而 hook 载荷可能给出未解析的路径，直接 relative 会误判为仓库外。
  const rel = path.relative(realpath(repoRoot), realpath(abs));
  if (rel.startsWith("..")) return null; // 仓库外，忽略
  return normalize(rel);
}

function realpath(p) {
  try {
    return realpathSync(p);
  } catch {
    // 文件可能尚不存在（如即将新建）：逐段回退，解析最深的已存在祖先目录。
    const dir = path.dirname(p);
    if (dir === p) return p;
    try {
      return path.join(realpathSync(dir), path.basename(p));
    } catch {
      return p;
    }
  }
}

function normalize(p) {
  return p.split(path.sep).join("/");
}

function readStdin() {
  if (stdinCache !== null) return stdinCache;
  try {
    // 终端手工运行时（TTY）不读 stdin，避免阻塞等待输入
    stdinCache = process.stdin.isTTY ? "" : readFileSync(0, "utf8");
  } catch {
    stdinCache = "";
  }
  return stdinCache;
}

// Stop hook 二次触发标记：Claude Code 在因 Stop hook 阻断后继续、再次收尾时载荷带 stop_hook_active=true。
function stopHookActive() {
  try {
    return JSON.parse(readStdin())?.stop_hook_active === true;
  } catch {
    return false;
  }
}

// —— 输出 ——

function report(violations) {
  const R = (s) => `\x1b[31m${s}\x1b[0m`;
  const B = (s) => `\x1b[1m${s}\x1b[0m`;
  const lines = [];
  lines.push(R(B("✗ spec-dev drift guard: code covered by an active spec changed without syncing the spec. / spec-dev 漂移守卫：改动了 active spec 覆盖的代码，但对应 spec 未同步。")));
  lines.push("");
  for (const v of violations) {
    lines.push(`  ${B("Feature / 特性")} ${v.feature}  —  spec: ${v.spec}`);
    for (const f of v.code) lines.push(`    · ${f}`);
    lines.push("");
  }
  lines.push(B("How to resolve / 如何解除："));
  lines.push(`  1) Update the owning spec (requirements / acceptance matrix) and include it in this change. / 同步更新对应 spec（行为规范/验收矩阵），并把它一并纳入本次变更；`);
  lines.push(
    `  2) If this change truly does not affect the spec's behavior contract, leave a ${B("Spec-Guard: off <reason>")} trailer in the commit message (range checks pass it), or set ${B("SPEC_DEV_GUARD=off")} temporarily. / 若本次改动确不影响该 spec 的行为契约，在提交信息留该 trailer（区间检查会放行），或临时设该环境变量；`,
  );
  lines.push(`  3) If the spec is obsolete, set its frontmatter ${B("status")} to superseded. / 该 spec 已作废时，把其 frontmatter 的 status 改为 superseded。`);
  lines.push("");
  lines.push(`  This applies without the spec-dev plugin too: artifacts live in docs/<date-feature>/; changing code means syncing the sibling spec. / 未安装 spec-dev 插件也应遵守：产物在 docs/<日期-特性>/，改代码即需同步同目录 spec。`);
  process.stderr.write(lines.join("\n") + "\n");
}

function usage() {
  process.stderr.write(
    "Usage / 用法: check-spec-drift.mjs --staged | --range <A>..<B> | --push | --files <f…> | --hook | --worktree\n",
  );
  process.exit(2);
}

function warn(msg) {
  process.stderr.write(`\x1b[33m[spec-dev guard] ${msg}\x1b[0m\n`);
}
