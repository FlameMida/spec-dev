#!/usr/bin/env node
// 同步 skills/anysearch 到上游最新稳定版(tag vX.Y.Z,排除预发布)。
//
// 机制:git subtree pull --squash 拉上游 tag,然后重跑 frontmatter 规范化。
// 本地对上游的持久适配只有三类,更新时均不需要人工干预:
//   1. SKILL.md frontmatter 规范化(非白名单键折进 metadata)——本脚本幂等重建,
//      因此 SKILL.md 冲突时直接取上游版本再重跑规范化即可收敛;
//   2. agents/openai.yaml(Codex 端接口,上游无此路径,永不冲突);
//   3. LICENSE / NOTICE(上游 main 已有,后续 tag 带上后自然合并)。
//
// 注意:subtree pull 的合并提交保持默认 "Merge ..." 消息,post-commit 发版钩子
// 按 Merge* 跳过;规范化提交才是常规提交,由钩子正常自动发版。
//
// 用法:
//   node scripts/update-anysearch.mjs              # 检查并同步到最新稳定 tag
//   node scripts/update-anysearch.mjs --check      # 仅检查,有新版则退出码 1
//   node scripts/update-anysearch.mjs --tag v2.2.0 # 同步到指定 tag
//   node scripts/update-anysearch.mjs --normalize  # 仅重跑 frontmatter 规范化
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UPSTREAM = "https://github.com/anysearch-ai/anysearch-skill.git";
const PREFIX = "skills/anysearch";
const SKILL_MD = path.join(repoRoot, PREFIX, "SKILL.md");
// quick_validate.py 的 frontmatter 顶层键白名单(metadata 单独处理)
const ALLOWED_TOP_KEYS = ["name", "description", "license", "allowed-tools"];
const STABLE_TAG_RE = /^v\d+\.\d+\.\d+$/;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const tagArgIndex = args.indexOf("--tag");
const explicitTag = tagArgIndex >= 0 ? args[tagArgIndex + 1] : null;

for (const flag of flags) {
  if (!["--check", "--tag", "--normalize", "--help"].includes(flag)) {
    console.error(`Unknown option: ${flag}`);
    printUsage();
    process.exit(2);
  }
}

if (flags.has("--help")) {
  printUsage();
  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function main() {
  if (flags.has("--normalize")) {
    const changed = normalizeFrontmatter(explicitTag);
    console.log(changed ? "frontmatter 已规范化(有改动,待提交)。" : "frontmatter 已是规范形态,无改动。");
    return;
  }

  const current = readCurrentTag();
  const target = explicitTag ?? latestStableTag();
  if (explicitTag && !STABLE_TAG_RE.test(explicitTag)) {
    throw new Error(`--tag 期望稳定版格式 vX.Y.Z,得到:${explicitTag}`);
  }
  console.log(`当前引入:${current}  上游目标:${target}`);

  if (flags.has("--check")) {
    if (current === target) {
      console.log("已是最新稳定版。");
      return;
    }
    console.log(`发现新稳定版:${current} → ${target},运行 node scripts/update-anysearch.mjs 同步。`);
    process.exit(1);
  }

  if (current === target) {
    console.log("已是最新稳定版,无需同步。");
    return;
  }

  if (run("git", ["status", "--porcelain"]).trim() !== "") {
    throw new Error("工作区不干净:git subtree 要求干净的工作区,请先提交或暂存当前改动。");
  }

  const descBefore = readDescriptionBlock();

  console.log(`subtree pull ${target} ...`);
  const pull = spawnSync(
    "git",
    ["subtree", "pull", `--prefix=${PREFIX}`, UPSTREAM, target, "--squash"],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "inherit", "inherit"] },
  );

  if (pull.status !== 0) {
    const conflicted = run("git", ["diff", "--name-only", "--diff-filter=U"])
      .split("\n")
      .filter(Boolean);
    const onlySkillMd = conflicted.length === 1 && conflicted[0] === `${PREFIX}/SKILL.md`;
    if (!onlySkillMd) {
      throw new Error(
        `subtree pull 产生冲突,需人工处理:\n  ${conflicted.join("\n  ") || "(未检出冲突文件,请检查 git status)"}\n` +
          `解决后 git add 并 git commit --no-edit 完成合并,再运行 --normalize 重跑规范化。`,
      );
    }
    // 唯一冲突是 SKILL.md:本地改动只有可重建的 frontmatter 规范化,取上游后重跑即可
    console.log("SKILL.md 冲突:取上游版本并重跑规范化 ...");
    run("git", ["checkout", "--theirs", `${PREFIX}/SKILL.md`]);
    normalizeFrontmatter(target);
    run("git", ["add", `${PREFIX}/SKILL.md`]);
    // 合并提交沿用默认 MERGE_MSG(Merge* 开头,发版钩子跳过);
    // 此时暂存含 SKILL.md 而无 openai.yaml,须豁免同步绊线,description 变化在末尾统一提示
    const commit = spawnSync("git", ["commit", "--no-edit"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, SKIP_OPENAI_SYNC_CHECK: "1" },
    });
    if (commit.status !== 0) {
      throw new Error("完成合并提交失败,请根据上方输出处理后重试。");
    }
    finish(descBefore, target, /* normalizedCommitted */ true);
    return;
  }

  // 无冲突:合并提交已由 subtree 完成,规范化作为一个常规提交(触发自动发版)
  const changed = normalizeFrontmatter(target);
  if (!changed) {
    console.log("上游未触碰 frontmatter,规范化无改动。");
    finish(descBefore, target, true);
    return;
  }
  run("git", ["add", `${PREFIX}/SKILL.md`]);
  const descAfter = readDescriptionBlock();
  if (descAfter !== descBefore) {
    console.log(
      "\n⚠ 上游修改了 SKILL.md 的 description。openai.yaml 的 short_description 是它的 Codex 端副本,\n" +
        `  请核对并更新 ${PREFIX}/agents/openai.yaml 后,将两者一并提交:\n` +
        `  git add ${PREFIX} && git commit(提交信息建议:chore(anysearch): sync upstream ${target})`,
    );
    return;
  }
  const commit = spawnSync(
    "git",
    ["commit", "-m", `chore(anysearch): sync upstream ${target}`],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, SKIP_OPENAI_SYNC_CHECK: "1" },
    },
  );
  if (commit.status !== 0) {
    throw new Error("规范化提交失败(多半是 pre-commit 校验未过),请根据上方输出处理。");
  }
  finish(descBefore, target, true);
}

function finish(descBefore, target, committed) {
  console.log(`\n同步完成:${PREFIX} → ${target}`);
  console.log(run("git", ["log", "--oneline", "-3"]));
  if (readDescriptionBlock() !== descBefore) {
    console.log(
      `⚠ description 有变化,请核对 ${PREFIX}/agents/openai.yaml 的 short_description 是否需要同步。`,
    );
  } else if (committed) {
    console.log("确认无误后 git push(pre-push 钩子会带上自动发版的 tag)。");
  }
}

function readCurrentTag() {
  const fm = frontmatterOf(readFileSync(SKILL_MD, "utf8"));
  const match = fm.match(/^\s+upstream-tag:\s*(\S+)\s*$/m);
  if (!match) {
    throw new Error(`无法从 ${PREFIX}/SKILL.md 读取 metadata.upstream-tag,请先运行 --normalize。`);
  }
  return match[1];
}

function readDescriptionBlock() {
  const blocks = splitTopBlocks(frontmatterOf(readFileSync(SKILL_MD, "utf8")));
  return (blocks.find((b) => b.key === "description")?.lines ?? []).join("\n");
}

function latestStableTag() {
  const out = run("git", ["ls-remote", "--tags", "--refs", UPSTREAM]);
  const tags = out
    .split("\n")
    .map((line) => line.split("\t")[1])
    .filter(Boolean)
    .map((ref) => ref.replace("refs/tags/", ""))
    .filter((tag) => STABLE_TAG_RE.test(tag));
  if (tags.length === 0) {
    throw new Error("上游没有任何稳定版 tag(vX.Y.Z)。");
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

// frontmatter 规范化(幂等):非白名单顶层键整块折进 metadata,
// 维护 metadata.upstream / metadata.upstream-tag,缺失时补 license。
// tag 传 null 时沿用文件中已有的 upstream-tag(--normalize 独立入口)。
// 返回是否产生了实际改动。
function normalizeFrontmatter(tag) {
  const content = readFileSync(SKILL_MD, "utf8");
  const fm = frontmatterOf(content);
  const effectiveTag = tag ?? fm.match(/^\s+upstream-tag:\s*(\S+)\s*$/m)?.[1];
  if (!effectiveTag) {
    throw new Error(
      "frontmatter 中没有 metadata.upstream-tag,无法确定当前上游版本;" +
        "请用 --normalize --tag vX.Y.Z 指定(即本次引入/同步的上游 tag)。",
    );
  }
  const blocks = splitTopBlocks(fm);

  const keep = [];
  const metadataChildren = [];
  const folded = [];
  for (const block of blocks) {
    if (block.key === "metadata") {
      // 剔除由脚本管理的两个单行键,其余子行原样保留
      metadataChildren.push(
        ...block.lines.slice(1).filter((line) => !/^\s+upstream(-tag)?:/.test(line)),
      );
    } else if (ALLOWED_TOP_KEYS.includes(block.key)) {
      keep.push(block);
    } else {
      folded.push(...block.lines.map((line) => `  ${line}`));
    }
  }

  const ordered = [];
  for (const key of ALLOWED_TOP_KEYS) {
    const block = keep.find((b) => b.key === key);
    if (block) ordered.push(...block.lines);
    else if (key === "license") ordered.push("license: Apache-2.0");
  }
  ordered.push("metadata:");
  ordered.push(`  upstream: ${UPSTREAM.replace(/\.git$/, "")}`);
  ordered.push(`  upstream-tag: ${effectiveTag}`);
  ordered.push(...metadataChildren, ...folded);

  const next = content.replace(fmWrapRe(), `---\n${ordered.join("\n")}\n---`);
  if (next === content) return false;
  writeFileSync(SKILL_MD, next);
  return true;
}

function frontmatterOf(content) {
  const match = content.match(fmWrapRe());
  if (!match) {
    throw new Error(`${PREFIX}/SKILL.md 缺少 YAML frontmatter。`);
  }
  return match[1];
}

function fmWrapRe() {
  return /^---\n([\s\S]*?)\n---/;
}

// 按顶层键行(无缩进的 "key:")把 frontmatter 切成块,块内含其全部缩进子行
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
  console.log(`Usage: node scripts/update-anysearch.mjs [--check] [--tag vX.Y.Z] [--normalize]

同步 skills/anysearch(subtree)到上游最新稳定版 tag。

  (无参数)     有新稳定版则 subtree pull + frontmatter 规范化 + 提交
  --check      仅检查是否有新稳定版;有则退出码 1(可接 CI/定时任务)
  --tag vX.Y.Z 同步到指定稳定版(升级验证或回退)
  --normalize  仅重跑 frontmatter 规范化(幂等),不拉取上游`);
}
