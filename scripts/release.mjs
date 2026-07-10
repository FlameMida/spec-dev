#!/usr/bin/env node
// 发布脚本：升级版本号、生成 CHANGELOG 草稿、创建 release 提交并打 tag。
// 用法：node scripts/release.mjs <patch|minor|major|X.Y.Z> [--dry-run]
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginJsonPath = path.join(repoRoot, ".claude-plugin", "plugin.json");
const marketplaceJsonPath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bumpArg = args.find((a) => !a.startsWith("--"));

if (!bumpArg) {
  console.error("用法: node scripts/release.mjs <patch|minor|major|X.Y.Z> [--dry-run]");
  process.exit(1);
}

const plugin = JSON.parse(readFileSync(pluginJsonPath, "utf8"));
const current = plugin.version;
const next = resolveNextVersion(current, bumpArg);
const tag = `v${next}`;

if (git(["tag", "-l", tag]).trim()) {
  console.error(`tag ${tag} 已存在，请检查版本号`);
  process.exit(1);
}

if (git(["status", "--porcelain"]).trim() && !dryRun) {
  console.error("工作区不干净，请先提交或暂存当前修改再发布");
  process.exit(1);
}

const lastTag = git(["describe", "--tags", "--abbrev=0"], true).trim();
const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
const section = buildChangelogSection(next, range);

console.log(`版本: ${current} -> ${next}`);
console.log("---- CHANGELOG 草稿 ----");
console.log(section);
console.log("------------------------");

if (dryRun) {
  console.log("(dry-run，未写入任何文件)");
  process.exit(0);
}

// 写版本号
plugin.version = next;
writeFileSync(pluginJsonPath, JSON.stringify(plugin, null, 2) + "\n");
const marketplace = readFileSync(marketplaceJsonPath, "utf8");
writeFileSync(
  marketplaceJsonPath,
  marketplace.replace(`"version": "${current}"`, `"version": "${next}"`)
);

// 在首个 "## [" 之前插入新章节
const changelog = readFileSync(changelogPath, "utf8");
const insertAt = changelog.indexOf("## [");
if (insertAt === -1) {
  console.error("CHANGELOG.md 中找不到 '## [' 章节锚点");
  process.exit(1);
}
writeFileSync(
  changelogPath,
  changelog.slice(0, insertAt) + section + "\n" + changelog.slice(insertAt)
);

git(["add", pluginJsonPath, marketplaceJsonPath, changelogPath]);
git(["commit", "-m", `release: ${tag}`]);
git(["tag", "-a", tag, "-m", `release ${tag}`]);
console.log(`已创建提交与 tag ${tag}。执行 git push（pre-push 钩子会自动带上 tag）即可发布。`);
console.log("提示：commit 之前可先手工润色 CHANGELOG 草稿，再 git add 后重新运行本脚本前请回退版本改动。");

function resolveNextVersion(cur, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  const [maj, min, pat] = cur.split(".").map(Number);
  if (bump === "major") return `${maj + 1}.0.0`;
  if (bump === "minor") return `${maj}.${min + 1}.0`;
  if (bump === "patch") return `${maj}.${min}.${pat + 1}`;
  console.error(`无法识别的版本参数: ${bump}`);
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
  const result = spawnSync("git", cmdArgs, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0 && !allowFail) {
    console.error(`git ${cmdArgs.join(" ")} 失败\n${result.stderr}`);
    process.exit(result.status ?? 1);
  }
  return result.stdout ?? "";
}
