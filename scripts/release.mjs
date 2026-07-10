#!/usr/bin/env node
// 发布脚本：升级版本号、生成 CHANGELOG 草稿、创建 release 提交并打 tag。
// 用法：
//   node scripts/release.mjs <patch|minor|major|X.Y.Z> [--dry-run]   手动发布
//   node scripts/release.mjs --auto                                   由 post-commit 钩子调用：
//     根据上个 tag 以来的提交信息推断升级级别（feat!/BREAKING→major，feat→minor，其他→patch），
//     将版本号与 CHANGELOG 变更 amend 进当前提交并打 tag。
//     auto 模式带安全护栏：非 main 分支、rebase/cherry-pick/merge 进行中、暂存区有未提交改动、
//     目标 tag 已存在时静默跳过（exit 0），避免污染历史或卷入无关改动。
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginJsonPath = path.join(repoRoot, ".claude-plugin", "plugin.json");
const marketplaceJsonPath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const codexPluginJsonPath = path.join(repoRoot, ".codex-plugin", "plugin.json");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");
const versionedFiles = [pluginJsonPath, marketplaceJsonPath, codexPluginJsonPath, changelogPath];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const autoMode = args.includes("--auto");
const bumpArg = args.find((a) => !a.startsWith("--"));

if (!bumpArg && !autoMode) {
  console.error("Usage / 用法: node scripts/release.mjs <patch|minor|major|X.Y.Z|--auto> [--dry-run]");
  process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err.message ?? err);
  process.exit(1);
}

function main() {
  if (autoMode) {
    const skipReason = autoModeGuard();
    if (skipReason) {
      console.log(`release --auto: ${skipReason}, skipping auto release / 跳过自动发版`);
      process.exit(0);
    }
  }

  const plugin = JSON.parse(readFileSync(pluginJsonPath, "utf8"));
  const current = plugin.version;
  const bump = autoMode ? inferBumpSinceLastTag() : bumpArg;
  const next = resolveNextVersion(current, bump);
  const tag = `v${next}`;

  if (git(["tag", "-l", tag], true).trim()) {
    if (autoMode) {
      console.log(`release --auto: tag ${tag} already exists, skipping auto release / tag 已存在，跳过自动发版`);
      process.exit(0);
    }
    console.error(`tag ${tag} already exists, check the version number / tag 已存在，请检查版本号`);
    process.exit(1);
  }

  if (!autoMode && git(["status", "--porcelain"]).trim() && !dryRun) {
    console.error("Working tree not clean; commit or stash before releasing / 工作区不干净，请先提交或暂存当前修改再发布");
    process.exit(1);
  }

  const lastTag = git(["describe", "--tags", "--abbrev=0"], true).trim();
  const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
  const section = buildChangelogSection(next, range);

  // 任何写盘之前先完成全部校验，避免半途失败留下脏工作区
  const changelog = readFileSync(changelogPath, "utf8");
  const insertAt = changelog.indexOf("## [");
  if (insertAt === -1) {
    console.error("Cannot find '## [' section anchor in CHANGELOG.md / CHANGELOG.md 中找不到 '## [' 章节锚点");
    process.exit(1);
  }

  console.log(`Version / 版本: ${current} -> ${next}`);
  console.log("---- CHANGELOG draft / 草稿 ----");
  console.log(section);
  console.log("------------------------");

  if (dryRun) {
    console.log("(dry-run, nothing written / 未写入任何文件)");
    process.exit(0);
  }

  // 保存原文，git 步骤失败时回滚，保证工作区不残留半成品改动
  const originals = new Map(versionedFiles.map((p) => [p, readFileSync(p, "utf8")]));

  try {
    plugin.version = next;
    writeFileSync(pluginJsonPath, JSON.stringify(plugin, null, 2) + "\n");
    writeVersionField(marketplaceJsonPath, ["metadata", "version"], current, next);
    writeVersionField(codexPluginJsonPath, ["version"], current, next);
    writeFileSync(
      changelogPath,
      changelog.slice(0, insertAt) + section + "\n" + changelog.slice(insertAt)
    );

    git(["add", ...versionedFiles]);
    if (autoMode) {
      // --no-verify：本次提交已通过 pre-commit 完整校验，amend 无需重跑（pre-commit 也识别 RELEASE_HOOK_RUNNING 双保险）
      gitWithEnv(["commit", "--amend", "--no-edit", "--no-verify"], { RELEASE_HOOK_RUNNING: "1" });
      git(["tag", "-a", tag, "-m", `release ${tag}`]);
      console.log(`Merged version ${next} and CHANGELOG into the current commit, tag ${tag} created. / 已将版本 ${next} 与 CHANGELOG 合并进当前提交，并创建 tag ${tag}。`);
    } else {
      git(["commit", "-m", `release: ${tag}`]);
      git(["tag", "-a", tag, "-m", `release ${tag}`]);
      console.log(`Commit and tag ${tag} created; git push will publish (the pre-push hook carries the tag). / 已创建提交与 tag ${tag}。执行 git push（pre-push 钩子会自动带上 tag）即可发布。`);
    }
  } catch (err) {
    for (const [p, content] of originals) writeFileSync(p, content);
    git(["restore", "--staged", ...versionedFiles], true);
    console.error(`Release failed; version and CHANGELOG changes rolled back. Reason / 发布失败，已回滚版本号与 CHANGELOG 改动。原因：\n${err.message ?? err}`);
    process.exit(1);
  }
}

// auto 模式安全护栏：返回跳过原因字符串，安全时返回 null
function autoModeGuard() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], true).trim();
  if (branch !== "main") return `当前分支为 ${branch}，仅 main 分支自动发版`;

  for (const marker of ["rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD", "MERGE_HEAD", "REVERT_HEAD"]) {
    const p = git(["rev-parse", "--git-path", marker], true).trim();
    if (p && existsSync(path.resolve(repoRoot, p))) {
      return `检测到 ${marker}（rebase/cherry-pick/merge/revert 进行中）`;
    }
  }

  const staged = git(["diff", "--cached", "--name-only"], true).trim();
  if (staged) {
    return `暂存区存在 ${staged.split("\n").length} 个未提交文件，避免被 amend 卷入发布提交`;
  }
  return null;
}

// JSON 解析后定点写版本号字段；字段缺失或与当前版本不符时报错，杜绝字符串替换静默 no-op
function writeVersionField(filePath, keyPath, current, next) {
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  let node = data;
  for (const key of keyPath.slice(0, -1)) {
    if (typeof node?.[key] !== "object" || node[key] === null) {
      throw new Error(`${filePath} 缺少 ${keyPath.join(".")} 字段，无法写入版本号`);
    }
    node = node[key];
  }
  const leaf = keyPath[keyPath.length - 1];
  if (typeof node[leaf] !== "string") {
    throw new Error(`${filePath} 缺少 ${keyPath.join(".")} 字段，无法写入版本号`);
  }
  if (node[leaf] !== current) {
    throw new Error(
      `${filePath} 的 ${keyPath.join(".")} 为 ${node[leaf]}，与 plugin.json 当前版本 ${current} 不一致，请先手工对齐`
    );
  }
  node[leaf] = next;
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function inferBumpSinceLastTag() {
  const last = git(["describe", "--tags", "--abbrev=0"], true).trim();
  const subjects = git(["log", last ? `${last}..HEAD` : "HEAD", "--pretty=%s", "--no-merges"], true)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  let level = "patch";
  for (const s of subjects) {
    if (/^\w+(\([^)]*\))?!:/.test(s) || /BREAKING CHANGE/.test(s)) return "major";
    if (/^feat(\([^)]*\))?:/.test(s)) level = "minor";
  }
  return level;
}

function resolveNextVersion(cur, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  const [maj, min, pat] = cur.split(".").map(Number);
  if (bump === "major") return `${maj + 1}.0.0`;
  if (bump === "minor") return `${maj}.${min + 1}.0`;
  if (bump === "patch") return `${maj}.${min}.${pat + 1}`;
  console.error(`Unrecognized version argument / 无法识别的版本参数: ${bump}`);
  process.exit(1);
}

function buildChangelogSection(version, logRange) {
  const raw = git(["log", logRange, "--pretty=%s", "--no-merges"], true)
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("release:"));

  const groups = {
    feat: { title: "### ✨ 新增 (Added)", items: [] },
    fix: { title: "### 🔧 修复 (Fixed)", items: [] },
    refactor: { title: "### ♻️ 重构 (Changed)", items: [] },
    docs: { title: "### 📝 文档 (Docs)", items: [] },
    other: { title: "### 🧹 其他 (Misc)", items: [] },
  };

  for (const subject of raw) {
    const m = subject.match(/^(\w+)(\([^)]*\))?!?:\s*(.+)$/);
    const type = m && groups[m[1]] ? m[1] : "other";
    const scope = m?.[2] ? `**${m[2].slice(1, -1)}**：` : "";
    groups[type].items.push(`- ${scope}${m ? m[3] : subject}`);
  }

  const date = new Date().toISOString().slice(0, 10);
  let out = `## [${version}] - ${date}\n\n`;
  for (const g of Object.values(groups)) {
    if (g.items.length) out += `${g.title}\n\n${g.items.join("\n")}\n\n`;
  }
  return out;
}

function git(cmdArgs, allowFail = false) {
  return runGit(cmdArgs, {}, allowFail);
}

function gitWithEnv(cmdArgs, extraEnv) {
  return runGit(cmdArgs, extraEnv, false);
}

function runGit(cmdArgs, extraEnv, allowFail) {
  const result = spawnSync("git", cmdArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0 && !allowFail) {
    throw new Error(`git ${cmdArgs.join(" ")} 失败\n${result.stderr}`);
  }
  return result.stdout ?? "";
}
