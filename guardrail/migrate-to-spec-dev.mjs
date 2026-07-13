#!/usr/bin/env node
// spec-dev 历史产物自动迁移：把历史位置（docs/ 下）的 spec-dev 产物统一搬到项目根目录 .spec-dev/。
//
//   node migrate-to-spec-dev.mjs [--repo <path>] [--dry-run]
//
// 迁移范围（仅 spec-dev 自有约定的历史位置；`.specs/` 属外部约定的兼容位置，不迁移）：
//   docs/YYYY-MM-DD-<feature>/   → .spec-dev/YYYY-MM-DD-<feature>/   （须含 spec/、plan/ 或 acceptance/ 子目录，
//                                                                       避免误搬用户自己的日期命名文档）
//   docs/explorations/           → .spec-dev/explorations/
//   docs/adr/                    → .spec-dev/adr/
//
// 行为：
//   · git 仓库优先 `git mv`（保留历史），失败或非 git 环境降级为文件系统 rename；
//   · 迁移后重写被迁 .md 文件内的历史路径引用（docs/<日期-特性>/、docs/adr/、docs/explorations/ → .spec-dev/ 前缀）；
//   · 目标已存在同名目录时跳过并告警（不覆盖、不合并）；
//   · docs/ 迁空后顺手删除空目录；
//   · 不自动 commit——迁移完成后由调用方（安装器提示 / 会话内 agent）提交。
//
// 幂等：无历史产物时静默退出 0；可重复运行。守卫脚本仍识别 docs/ 旧位置兜底（未迁移的旧分支/CI 不失守）。

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const repoIdx = args.indexOf("--repo");
const root = path.resolve(repoIdx !== -1 ? args[repoIdx + 1] : detectRoot());

const docsDir = path.join(root, "docs");
const targetRoot = path.join(root, ".spec-dev");
const FEATURE_DIR_RE = /^\d{4}-\d{2}-\d{2}-[^/]+$/;
const SUBDIR_MARKERS = ["spec", "plan", "acceptance"];

const moves = [];
if (existsSync(docsDir) && statSync(docsDir).isDirectory()) {
  for (const name of readdirSync(docsDir)) {
    const src = path.join(docsDir, name);
    if (!statSync(src).isDirectory()) continue;
    const isFeatureDir =
      FEATURE_DIR_RE.test(name) && SUBDIR_MARKERS.some((d) => existsSync(path.join(src, d)));
    if (isFeatureDir || name === "explorations" || name === "adr") {
      moves.push({ name, src, dst: path.join(targetRoot, name) });
    }
  }
}

if (moves.length === 0) process.exit(0); // 无历史产物，静默通过

log(`[spec-dev migrate] ${moves.length} legacy artifact dir(s) under docs/ → .spec-dev/ / 检测到 ${moves.length} 个历史产物目录，迁移到 .spec-dev/：`);
let moved = 0;
for (const m of moves) {
  const relSrc = `docs/${m.name}`;
  const relDst = `.spec-dev/${m.name}`;
  if (existsSync(m.dst)) {
    log(`  ! ${relSrc} skipped: ${relDst} already exists — merge manually / 目标已存在，跳过（请手工合并）`);
    continue;
  }
  if (DRY) {
    log(`  · [dry-run] ${relSrc} → ${relDst}`);
    continue;
  }
  mkdirSync(targetRoot, { recursive: true });
  try {
    execFileSync("git", ["-C", root, "mv", relSrc, relDst], { stdio: "pipe" });
  } catch {
    // 非 git 仓库 / 目录未跟踪：降级为文件系统迁移
    renameSync(m.src, m.dst);
  }
  rewriteRefs(m.dst);
  log(`  · ${relSrc} → ${relDst}`);
  moved++;
}

if (!DRY && moved > 0) {
  try {
    // 只剩 .DS_Store 之类系统垃圾文件时一并清掉，让空 docs/ 目录可删除
    const leftovers = readdirSync(docsDir);
    if (leftovers.every((n) => n === ".DS_Store" || n === "Thumbs.db")) {
      for (const n of leftovers) unlinkSync(path.join(docsDir, n));
      rmdirSync(docsDir);
    }
  } catch {
    // docs/ 还有别的内容或删除失败，保留即可
  }
  log(`[spec-dev migrate] done — review and commit (suggested: chore(spec-dev): migrate artifacts to .spec-dev/). / 迁移完成，请检查后提交。`);
}

// 重写被迁 .md 文件内的历史路径引用；只动迁走的文件，不碰仓库其余文件。
function rewriteRefs(dir) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) {
      rewriteRefs(p);
      continue;
    }
    if (!entry.endsWith(".md")) continue;
    const body = readFileSync(p, "utf8");
    const next = body
      .replace(/docs\/(?=\d{4}-\d{2}-\d{2}-)/g, ".spec-dev/")
      .replaceAll("docs/adr/", ".spec-dev/adr/")
      .replaceAll("docs/explorations/", ".spec-dev/explorations/");
    if (next !== body) writeFileSync(p, next);
  }
}

function detectRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
}

function log(msg) {
  process.stdout.write(msg + "\n");
}
