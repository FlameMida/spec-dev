#!/usr/bin/env node
// 发布脚本：升级版本号、生成 CHANGELOG 草稿、创建 release 提交并打 tag。
// 用法：
//   node scripts/release.mjs <patch|minor|major|X.Y.Z> [--dry-run]   手动发布
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginJsonPath = path.join(repoRoot, ".claude-plugin", "plugin.json");
const marketplaceJsonPath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const codexPluginJsonPath = path.join(repoRoot, ".codex-plugin", "plugin.json");
const rootPluginJsonPath = path.join(repoRoot, "plugin.json");
const packageJsonPath = path.join(repoRoot, "package.json");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");
const versionedFiles = [pluginJsonPath, marketplaceJsonPath, codexPluginJsonPath, rootPluginJsonPath, packageJsonPath, changelogPath];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bumpArg = args.find((a) => !a.startsWith("--"));

if (!bumpArg || args.includes("--auto")) {
  console.error("Usage / 用法: node scripts/release.mjs <patch|minor|major|X.Y.Z> [--dry-run]");
  process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(err.message ?? err);
  process.exit(1);
}

function main() {
  const plugin = JSON.parse(readFileSync(pluginJsonPath, "utf8"));
  const current = plugin.version;
  const lastTag = git(["describe", "--tags", "--abbrev=0"], true).trim();
  const next = resolveNextVersion(current, bumpArg);
  const tag = `v${next}`;

  if (git(["tag", "-l", tag], true).trim()) {
    console.error(`tag ${tag} already exists, check the version number / tag 已存在，请检查版本号`);
    process.exit(1);
  }

  if (git(["status", "--porcelain"]).trim() && !dryRun) {
    console.error("Working tree not clean; commit or stash before releasing / 工作区不干净，请先提交或暂存当前修改再发布");
    process.exit(1);
  }

  const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
  const section = buildChangelogSection(next, range);

  // 写盘前确认 CHANGELOG 锚点；更新版本后的包在创建提交前验证。
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

  // 保存原文，验证或 git 步骤失败时回滚版本文件。
  const originals = new Map(versionedFiles.map((p) => [p, readFileSync(p, "utf8")]));

  try {
    plugin.version = next;
    writeFileSync(pluginJsonPath, JSON.stringify(plugin, null, 2) + "\n");
    writeVersionField(marketplaceJsonPath, ["metadata", "version"], current, next);
    writeVersionField(codexPluginJsonPath, ["version"], current, next);
    writeVersionField(rootPluginJsonPath, ["version"], current, next);
    writeVersionField(packageJsonPath, ["version"], current, next);
    writeFileSync(
      changelogPath,
      changelog.slice(0, insertAt) + section + "\n" + changelog.slice(insertAt)
    );

    const validation = spawnSync(process.execPath, [path.join(repoRoot, "scripts/check-plugin.mjs"), "--codex-validate"], {
      cwd: repoRoot, stdio: "inherit",
    });
    if (validation.error) throw validation.error;
    if (validation.status !== 0) throw new Error("Release package validation failed / 发布包验证失败");

    git(["add", ...versionedFiles]);
    git(["commit", "-m", `release: ${tag}`]);
    git(["tag", "-a", tag, "-m", `release ${tag}`]);
    console.log(`Commit and tag ${tag} created; git push with push.followTags=true will publish them. / 已创建提交与 tag ${tag}；启用 push.followTags=true 后执行 git push 即可推送。`);
  } catch (err) {
    for (const [p, content] of originals) writeFileSync(p, content);
    git(["restore", "--staged", ...versionedFiles], true);
    console.error(`Release failed; version and CHANGELOG changes rolled back. Reason / 发布失败，已回滚版本号与 CHANGELOG 改动。原因：\n${err.message ?? err}`);
    process.exit(1);
  }
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
  const result = spawnSync("git", cmdArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0 && !allowFail) {
    throw new Error(`git ${cmdArgs.join(" ")} 失败\n${result.stderr}`);
  }
  return result.stdout ?? "";
}
