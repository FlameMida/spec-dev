#!/usr/bin/env node
// 统一同步 vendored skills 到上游：配置驱动，支持两种模式。
//   subtree  — tag-pinned git subtree（anysearch：上游有稳定 tag）
//   snapshot — SHA-pinned 子目录快照（sequential-thinking：上游无 tag，取子目录）
//
// 本地对上游的持久适配（更新时均无需人工干预）：
//   1. SKILL.md frontmatter 规范化（非白名单键折进 metadata）——幂等重建；
//      配置声明 enhancedDescription 的 skill 在此步注入增强 description，
//      因此上游同步覆盖后重跑 normalize 即恢复增强（增强永不丢失）；
//   2. 本地适配文件（agents/openai.yaml、scripts/think.mjs、NOTICE 等，上游无此路径）；
//   3. LICENSE / NOTICE。
//
// 用法:
//   node scripts/update-vendored-skill.mjs --skill anysearch                # 同步到最新稳定 tag
//   node scripts/update-vendored-skill.mjs --skill anysearch --check       # 仅检查，有新版退出码 1
//   node scripts/update-vendored-skill.mjs --skill anysearch --tag v3.1.0  # 同步到指定 tag
//   node scripts/update-vendored-skill.mjs --skill sequential-thinking --check
//   node scripts/update-vendored-skill.mjs --skill sequential-thinking --sha <sha>
//   node scripts/update-vendored-skill.mjs --skill <name> --normalize      # 仅重跑规范化（幂等）
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CONFIGS = {
  anysearch: {
    mode: "subtree",
    upstream: "https://github.com/anysearch-ai/anysearch-skill.git",
    prefix: "skills/anysearch",
    licenseDefault: "Apache-2.0",
    refRe: /^v\d+\.\d+\.\d+$/,
    refHint: "稳定版格式 vX.Y.Z",
    localFiles: ["agents/openai.yaml"],
    // normalize 每次重建 description 为增强版：上游同步覆盖后自动重放
    enhancedDescription:
      "Real-time web search, vertical domain search, parallel batch search, and URL content extraction via vendored CLI (no MCP). Use when you need to search the web, look up library/framework docs or current best practices, verify time-sensitive facts, batch-research multiple topics, or extract page content. Preferred first-choice search tool; fall back to WebSearch/WebFetch only when unavailable. / 实时网页搜索、垂直领域检索、并行批量检索与 URL 正文抽取（内嵌 CLI、无需 MCP）。当需要联网搜索、查库/框架文档与最新实践、核实时效信息、多主题批量调研或抽取网页正文时使用；搜索首选入口，不可用时才降级 WebSearch/WebFetch。",
  },
  "sequential-thinking": {
    mode: "snapshot",
    upstream: "https://github.com/thedotmack/sequential-thinking-skill.git",
    upstreamSubdir: "sequential-thinking",
    prefix: "skills/sequential-thinking",
    licenseDefault: "MIT",
    refRe: /^[0-9a-f]{7,40}$/,
    refHint: "commit SHA（7-40 位十六进制）",
    localFiles: ["agents/openai.yaml", "scripts/think.mjs", "NOTICE", "evals/evals.json"],
    enhancedDescription: null, // 上游 description 保留原文
  },
};

// quick_validate.py 的 frontmatter 顶层键白名单（metadata 单独处理）
const ALLOWED_TOP_KEYS = ["name", "description", "license", "allowed-tools"];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const skillArg = valueOf("--skill");
const explicitTag = valueOf("--tag");
const explicitSha = valueOf("--sha");

for (const flag of flags) {
  if (!["--check", "--tag", "--sha", "--normalize", "--help", "--skill"].includes(flag)) {
    console.error(`Unknown option: ${flag}`);
    printUsage();
    process.exit(2);
  }
}

if (flags.has("--help")) {
  printUsage();
  process.exit(0);
}

if (!skillArg || !CONFIGS[skillArg]) {
  console.error(`--skill 必填且取值限于: ${Object.keys(CONFIGS).join(" | ")}（得到: ${skillArg ?? "空"}）`);
  process.exit(2);
}
const cfg = CONFIGS[skillArg];
const SKILL_MD = path.join(repoRoot, cfg.prefix, "SKILL.md");

if (explicitTag && cfg.mode !== "subtree") {
  console.error(`--tag 仅 subtree 模式（anysearch）可用；${skillArg} 请用 --sha。`);
  process.exit(2);
}
if (explicitSha && cfg.mode !== "snapshot") {
  console.error(`--sha 仅 snapshot 模式（sequential-thinking）可用；${skillArg} 请用 --tag。`);
  process.exit(2);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function main() {
  if (flags.has("--normalize")) {
    const changed = normalizeFrontmatter(explicitTag ?? explicitSha);
    console.log(changed ? "frontmatter 已规范化（有改动，待提交）。" : "frontmatter 已是规范形态，无改动。");
    return;
  }

  const current = readPinnedRef();
  const target = explicitTag ?? explicitSha ?? latestTarget();
  const explicitRef = explicitTag ?? explicitSha;
  if (explicitRef && !cfg.refRe.test(explicitRef)) {
    throw new Error(`期望${cfg.refHint}，得到:${explicitRef}`);
  }
  console.log(`当前引入:${current}  上游目标:${target}`);

  if (flags.has("--check")) {
    if (current === target) {
      console.log("已是最新。");
      return;
    }
    console.log(`发现新版本:${current} → ${target}，运行 node scripts/update-vendored-skill.mjs --skill ${skillArg} 同步。`);
    process.exit(1);
  }

  if (current === target) {
    console.log("已是最新，无需同步。");
    return;
  }

  if (run("git", ["status", "--porcelain"]).trim() !== "") {
    throw new Error("工作区不干净：同步前请先提交或暂存当前改动。");
  }

  const descBefore = readDescriptionBlock();

  if (cfg.mode === "snapshot") {
    console.log(`snapshot sync ${target} ...`);
    snapshotSync(target);
    run("git", ["add", cfg.prefix]);
    const commit = spawnSync(
      "git",
      ["commit", "-m", `chore(${skillArg}): sync upstream ${target.slice(0, 7)}`],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, SKIP_OPENAI_SYNC_CHECK: "1" } },
    );
    if (commit.status !== 0) {
      throw new Error("快照同步提交失败（多半是 pre-commit 校验未过），请根据上方输出处理。");
    }
    finish(descBefore, target, true);
    return;
  }

  console.log(`subtree pull ${target} ...`);
  const pull = spawnSync(
    "git",
    ["subtree", "pull", `--prefix=${cfg.prefix}`, cfg.upstream, target, "--squash"],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "inherit", "inherit"] },
  );

  if (pull.status !== 0) {
    const conflicted = run("git", ["diff", "--name-only", "--diff-filter=U"])
      .split("\n")
      .filter(Boolean);
    const onlySkillMd = conflicted.length === 1 && conflicted[0] === `${cfg.prefix}/SKILL.md`;
    if (!onlySkillMd) {
      throw new Error(
        `subtree pull 产生冲突，需人工处理:\n  ${conflicted.join("\n  ") || "(未检出冲突文件，请检查 git status)"}\n` +
          `解决后 git add 并 git commit --no-edit 完成合并，再运行 --normalize 重跑规范化。`,
      );
    }
    // 唯一冲突是 SKILL.md：本地改动只有可重建的 frontmatter 规范化（含增强 description），取上游后重跑即可
    console.log("SKILL.md 冲突：取上游版本并重跑规范化 ...");
    run("git", ["checkout", "--theirs", `${cfg.prefix}/SKILL.md`]);
    normalizeFrontmatter(target);
    run("git", ["add", `${cfg.prefix}/SKILL.md`]);
    const commit = spawnSync("git", ["commit", "--no-edit"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, SKIP_OPENAI_SYNC_CHECK: "1" },
    });
    if (commit.status !== 0) {
      throw new Error("完成合并提交失败，请根据上方输出处理后重试。");
    }
    finish(descBefore, target, true);
    return;
  }

  // 无冲突：合并提交已由 subtree 完成，规范化作为一个常规提交
  const changed = normalizeFrontmatter(target);
  if (!changed) {
    console.log("上游未触碰 frontmatter，规范化无改动。");
    finish(descBefore, target, true);
    return;
  }
  run("git", ["add", `${cfg.prefix}/SKILL.md`]);
  const descAfter = readDescriptionBlock();
  if (descAfter !== descBefore) {
    console.log(
      "\n⚠ description 有变化。openai.yaml 的 short_description 是它的 Codex 端副本，\n" +
        `  请核对并更新 ${cfg.prefix}/agents/openai.yaml 后，将两者一并提交:\n` +
        `  git add ${cfg.prefix} && git commit（提交信息建议: chore(${skillArg}): sync upstream ${target}）`,
    );
    return;
  }
  const commit = spawnSync(
    "git",
    ["commit", "-m", `chore(${skillArg}): sync upstream ${target}`],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, SKIP_OPENAI_SYNC_CHECK: "1" } },
  );
  if (commit.status !== 0) {
    throw new Error("规范化提交失败（多半是 pre-commit 校验未过），请根据上方输出处理。");
  }
  finish(descBefore, target, true);
}

// SHA 快照同步：下载 tarball、覆盖上游文件、保留本地适配文件、重跑规范化
function snapshotSync(targetSha) {
  const tmp = mkdtempSync(path.join(tmpdir(), "vendored-"));
  try {
    run("bash", [
      "-c",
      `curl -sL ${cfg.upstream.replace(/\.git$/, "")}/archive/${targetSha}.tar.gz | tar xz -C ${tmp} --strip-components=1`,
    ]);
    run("bash", ["-c", `cp -R ${tmp}/${cfg.upstreamSubdir}/. ${path.join(repoRoot, cfg.prefix)}/`]);
    run("bash", ["-c", `cp ${tmp}/LICENSE ${path.join(repoRoot, cfg.prefix)}/LICENSE`]);
    for (const f of cfg.localFiles) {
      if (!existsSync(path.join(repoRoot, cfg.prefix, f))) {
        throw new Error(`本地适配文件丢失：${cfg.prefix}/${f}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  normalizeFrontmatter(targetSha);
}

function finish(descBefore, target, committed) {
  console.log(`\n同步完成:${cfg.prefix} → ${target}`);
  console.log(run("git", ["log", "--oneline", "-3"]));
  if (readDescriptionBlock() !== descBefore) {
    console.log(
      `⚠ description 有变化，请核对 ${cfg.prefix}/agents/openai.yaml 的 short_description 是否需要同步。`,
    );
  } else if (committed) {
    console.log("确认无误后 git push。");
  }
}

function readPinnedRef() {
  const fm = frontmatterOf(readFileSync(SKILL_MD, "utf8"));
  const match = fm.match(/^\s+upstream-tag:\s*(\S+)\s*$/m);
  if (!match) {
    throw new Error(`无法从 ${cfg.prefix}/SKILL.md 读取 metadata.upstream-tag，请先运行 --normalize 并指定 --tag/--sha。`);
  }
  return match[1];
}

function readDescriptionBlock() {
  const blocks = splitTopBlocks(frontmatterOf(readFileSync(SKILL_MD, "utf8")));
  return (blocks.find((b) => b.key === "description")?.lines ?? []).join("\n");
}

// 上游目标：subtree 模式取最新稳定 tag；snapshot 模式取远端 HEAD SHA
function latestTarget() {
  if (cfg.mode === "snapshot") {
    const out = run("git", ["ls-remote", cfg.upstream, "HEAD"]);
    const sha = out.split("\t")[0]?.trim();
    if (!sha || !cfg.refRe.test(sha)) {
      throw new Error("无法从上游读取 HEAD SHA。");
    }
    return sha;
  }
  const out = run("git", ["ls-remote", "--tags", "--refs", cfg.upstream]);
  const tags = out
    .split("\n")
    .map((line) => line.split("\t")[1])
    .filter(Boolean)
    .map((ref) => ref.replace("refs/tags/", ""))
    .filter((tag) => cfg.refRe.test(tag));
  if (tags.length === 0) {
    throw new Error("上游没有任何稳定版 tag（vX.Y.Z）。");
  }
  tags.sort(compareSemver);
  return tags[tags.length - 1];
}

function compareSemver(a, b) {
  const pa = a.slice(1).split(".").map(Number);
  const pb = b.slice(1).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// frontmatter 规范化（幂等）：非白名单顶层键整块折进 metadata，
// 维护 metadata.upstream / metadata.upstream-tag，缺失时补 license（默认值按配置），
// 配置声明 enhancedDescription 时重建 description 块为增强版。
// ref 传 null 时沿用文件中已有的 upstream-tag（--normalize 独立入口）。
// 返回是否产生了实际改动。
function normalizeFrontmatter(ref) {
  const content = readFileSync(SKILL_MD, "utf8");
  const fm = frontmatterOf(content);
  const effectiveRef = ref ?? fm.match(/^\s+upstream-tag:\s*(\S+)\s*$/m)?.[1];
  if (!effectiveRef) {
    throw new Error(
      "frontmatter 中没有 metadata.upstream-tag，无法确定当前上游版本；" +
        "请用 --normalize 搭配 --tag vX.Y.Z（subtree）或 --sha <sha>（snapshot）指定。",
    );
  }
  const blocks = splitTopBlocks(fm);

  const keep = [];
  const metadataChildren = [];
  const folded = [];
  for (const block of blocks) {
    if (block.key === "metadata") {
      metadataChildren.push(
        ...block.lines.slice(1).filter((line) => !/^\s+upstream(-tag)?:/.test(line)),
      );
    } else if (ALLOWED_TOP_KEYS.includes(block.key)) {
      keep.push(block);
    } else {
      folded.push(...block.lines.map((line) => `  ${line}`));
    }
  }

  if (cfg.enhancedDescription) {
    const enhanced = ["description: >-", `  ${cfg.enhancedDescription}`];
    const desc = keep.find((b) => b.key === "description");
    if (desc) desc.lines = enhanced;
    else keep.push({ key: "description", lines: enhanced });
  }

  const ordered = [];
  for (const key of ALLOWED_TOP_KEYS) {
    const block = keep.find((b) => b.key === key);
    if (block) ordered.push(...block.lines);
    else if (key === "license") ordered.push(`license: ${cfg.licenseDefault}`);
  }
  ordered.push("metadata:");
  ordered.push(`  upstream: ${cfg.upstream.replace(/\.git$/, "")}`);
  ordered.push(`  upstream-tag: ${effectiveRef}`);
  ordered.push(...metadataChildren, ...folded);

  const next = content.replace(fmWrapRe(), `---\n${ordered.join("\n")}\n---`);
  if (next === content) return false;
  writeFileSync(SKILL_MD, next);
  return true;
}

function frontmatterOf(content) {
  const match = content.match(fmWrapRe());
  if (!match) {
    throw new Error(`${cfg.prefix}/SKILL.md 缺少 YAML frontmatter。`);
  }
  return match[1];
}

function fmWrapRe() {
  return /^---\n([\s\S]*?)\n---/;
}

// 按顶层键行（无缩进的 "key:"）把 frontmatter 切成块，块内含其全部缩进子行
function splitTopBlocks(fm) {
  const blocks = [];
  let current = null;
  for (const line of fm.split("\n")) {
    const top = line.match(/^([A-Za-z][A-Za-z0-9_-]*):/);
    if (top) {
      current = { key: top[1], lines: [line] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return blocks;
}

function run(command, cmdArgs) {
  const result = spawnSync(command, cmdArgs, { cwd: repoRoot, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Failed: ${command} ${cmdArgs.join(" ")}\n${output}`);
  }
  return result.stdout;
}

function printUsage() {
  console.log(`Usage: node scripts/update-vendored-skill.mjs --skill <name> [--check] [--tag vX.Y.Z] [--sha <sha>] [--normalize]

统一同步 vendored skills 到上游。--skill 取值: ${Object.keys(CONFIGS).join(" | ")}

  (无其它参数)  有新版本则同步（subtree pull / snapshot 覆盖）+ frontmatter 规范化 + 提交
  --check       仅检查是否有新版本；有则退出码 1（可接 CI/定时任务）
  --tag vX.Y.Z  subtree 模式同步到指定稳定 tag
  --sha <sha>   snapshot 模式同步到指定 commit
  --normalize   仅重跑 frontmatter 规范化（幂等，含增强 description 重放），不拉取上游`);
}
