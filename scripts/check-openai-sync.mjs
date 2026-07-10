#!/usr/bin/env node
// openai.yaml 漂移 tripwire：openai.yaml 是 SKILL.md description 的 Codex 端手工副本，
// 无法自动校验语义一致，但可以确定性地拦住"改了 SKILL 忘了 openai.yaml"的脱节。
// 检查项：
//   1. 每个 skills/<name>/ 必须有 agents/openai.yaml，且含必需结构键
//   2. 暂存改动包含某 SKILL.md 而未同时暂存其 openai.yaml 时报错
// 豁免第 2 项（确认本次 SKILL 改动不影响触发描述时）：SKIP_OPENAI_SYNC_CHECK=1
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(repoRoot, "skills");

const REQUIRED_KEYS = [
  "interface:",
  "display_name:",
  "short_description:",
  "default_prompt:",
  "policy:",
  "allow_implicit_invocation:",
];

const problems = [];
let skillCount = 0;

for (const entry of readdirSync(skillsDir)) {
  const skillDir = path.join(skillsDir, entry);
  if (!statSync(skillDir).isDirectory()) continue;
  if (!existsSync(path.join(skillDir, "SKILL.md"))) continue;
  skillCount += 1;

  const yamlPath = path.join(skillDir, "agents", "openai.yaml");
  if (!existsSync(yamlPath)) {
    problems.push(`skills/${entry}: 缺少 agents/openai.yaml（Codex 平台接口文件）`);
    continue;
  }
  const content = readFileSync(yamlPath, "utf8");
  for (const key of REQUIRED_KEYS) {
    if (!content.includes(key)) {
      problems.push(`skills/${entry}/agents/openai.yaml: 缺少必需键 ${key.replace(/:$/, "")}`);
    }
  }
}

if (process.env.SKIP_OPENAI_SYNC_CHECK !== "1") {
  const staged = spawnSync("git", ["diff", "--cached", "--name-only"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (staged.status === 0) {
    const files = new Set(
      staged.stdout
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    for (const f of files) {
      const m = f.match(/^skills\/([^/]+)\/SKILL\.md$/);
      if (m && !files.has(`skills/${m[1]}/agents/openai.yaml`)) {
        problems.push(
          `skills/${m[1]}/SKILL.md 已暂存修改，但同 skill 的 agents/openai.yaml 未同步。` +
            `请核对 Codex 端触发描述是否需要更新；确认无需同步可用 SKIP_OPENAI_SYNC_CHECK=1 跳过`
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error("openai.yaml 同步检查未通过：");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`openai.yaml sync checks passed (${skillCount} skills).`);
