#!/usr/bin/env node
// spec-dev 漂移守卫：单一事实源，被 pre-commit / CI / Claude·Codex 的 preToolUse hook 共用。
//
// 判定：仓库内每个 status=active 的 spec 用 frontmatter 的 `covers` glob 声明它拥有的代码。
// 若一批变更改动了某 active spec 覆盖的代码，却没有同时改动该 spec 本身，则判为"漂移"——
// 代码走了、文档没跟上，拦截并打印指引。
//
// 用法：
//   node check-spec-drift.mjs --staged            # pre-commit：暂存区 vs HEAD
//   node check-spec-drift.mjs --range <A>..<B>    # CI：提交区间
//   node check-spec-drift.mjs --files <f1> <f2>…  # hook：显式文件清单（相对仓库根）
//   node check-spec-drift.mjs --hook              # hook：从 stdin 读 JSON，取其中的文件路径
//
// 退出码：0 通过 / 1 检出漂移（git/CI 场景）/ 2 用法错误；--hook 模式下漂移退出 2（两家 CLI 的阻断约定）。
// 环境变量 SPEC_DEV_GUARD=off 可临时全局关闭（打印警告，退出 0）。

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const MODE = process.argv[2];

if (process.env.SPEC_DEV_GUARD === "off") {
  warn("SPEC_DEV_GUARD=off —— 漂移守卫已临时关闭，跳过检查。");
  process.exit(0);
}

try {
  const repoRoot = gitRoot();
  const changed = await collectChangedFiles(repoRoot);
  if (changed.length === 0) process.exit(0);

  const specs = loadActiveSpecs(repoRoot);
  if (specs.length === 0) process.exit(0);

  const changedSet = new Set(changed.map(normalize));
  const violations = [];

  for (const spec of specs) {
    if (spec.covers.length === 0) continue;
    // spec 自身是否在本次变更里被一同改动
    const specTouched = changedSet.has(normalize(spec.relPath));
    const hitCode = changed.filter((f) => f !== spec.relPath && spec.matches(f));
    if (hitCode.length > 0 && !specTouched) {
      violations.push({ spec: spec.relPath, feature: spec.feature, code: hitCode });
    }
  }

  if (violations.length > 0) {
    report(violations);
    // Claude Code 与 Codex 的 preToolUse hook 约定一致：退出码 2 + stderr = 阻断本次工具调用；
    // git/CI 场景沿用惯例退出码 1。
    process.exit(MODE === "--hook" ? 2 : 1);
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
    return gitLines(["diff", "--name-only", "--diff-filter=ACMR", range], repoRoot);
  }
  if (MODE === "--files") {
    return process.argv.slice(3).map((f) => toRepoRel(f, repoRoot)).filter(Boolean);
  }
  if (MODE === "--hook") {
    const raw = readStdin();
    return extractHookFiles(raw).map((f) => toRepoRel(f, repoRoot)).filter(Boolean);
  }
  usage();
}

// Claude PreToolUse 与 Codex preToolUse 的载荷结构不同，这里做宽松抽取：
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
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// —— 输出 ——

function report(violations) {
  const R = (s) => `\x1b[31m${s}\x1b[0m`;
  const B = (s) => `\x1b[1m${s}\x1b[0m`;
  const lines = [];
  lines.push(R(B("✗ spec-dev 漂移守卫：改动了 active spec 覆盖的代码，但对应 spec 未同步。")));
  lines.push("");
  for (const v of violations) {
    lines.push(`  ${B("特性")} ${v.feature}  —  spec: ${v.spec}`);
    for (const f of v.code) lines.push(`    · ${f}`);
    lines.push("");
  }
  lines.push(B("如何解除："));
  lines.push(`  1) 同步更新对应 spec（行为规范/验收矩阵），并把它一并纳入本次变更；`);
  lines.push(`  2) 若本次改动确不影响该 spec 的行为契约，在提交信息注明并临时设 ${B("SPEC_DEV_GUARD=off")} 放行；`);
  lines.push(`  3) 该 spec 已作废时，把其 frontmatter 的 ${B("status")} 改为 superseded。`);
  lines.push("");
  lines.push(`  未安装 spec-dev 插件也应遵守：产物在 docs/<日期-特性>/，改代码即需同步同目录 spec。`);
  process.stderr.write(lines.join("\n") + "\n");
}

function usage() {
  process.stderr.write(
    "用法: check-spec-drift.mjs --staged | --range <A>..<B> | --files <f…> | --hook\n",
  );
  process.exit(2);
}

function warn(msg) {
  process.stderr.write(`\x1b[33m[spec-dev guard] ${msg}\x1b[0m\n`);
}
