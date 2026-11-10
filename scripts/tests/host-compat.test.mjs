import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillsDir = path.join(root, 'skills');
const raw = f => readFileSync(path.join(root, f), 'utf8');
// anysearch 是上游内嵌 skill，不纳入本仓库的措辞约定。
const skills = readdirSync(skillsDir).filter(n => n !== 'anysearch' && existsSync(path.join(skillsDir, n, 'SKILL.md')));
const HOST_COMPAT = 'skills/requirement-analysis/references/host-compat.md';
const PLUGIN_ROOT = 'skills/requirement-analysis/references/plugin-root.md';

function markdownFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (['evals', 'vendor', 'node_modules'].includes(name)) continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) out.push(...markdownFiles(file));
    else if (name.endsWith('.md')) out.push(file);
  }
  return out;
}
const rel = file => path.relative(root, file).split(path.sep).join('/');
const docs = skill => markdownFiles(path.join(skillsDir, skill));

// 只看正文里的链接：围栏代码块与行内代码是示例，不是引用。
function links(text) {
  const out = [];
  let fence = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (fence === null) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence !== null) continue;
    for (const link of line.replace(/(`+).*?\1/g, '').matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
      const url = link[1];
      if (/^[a-zA-Z]+:/.test(url) || url.startsWith('#') || url.startsWith('/')) continue;
      out.push(decodeURIComponent(url.split('#')[0]));
    }
  }
  return out;
}

test('skill 不依赖 skills/ 之外的插件文件', () => {
  for (const skill of skills) for (const file of docs(skill)) {
    const name = rel(file);
    if (name === PLUGIN_ROOT) continue;
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /CLAUDE_PLUGIN_ROOT/, name);
    assert.doesNotMatch(text, /\bagents\/[a-z-]+\.md/, name);
    assert.doesNotMatch(text, /validate-output|review-runner|execution-evidence|task-binding|scripts\/status\.mjs/, name);
    for (const target of links(text)) {
      const resolved = path.resolve(path.dirname(file), target);
      const inside = path.relative(skillsDir, resolved);
      assert.ok(!inside.startsWith('..') && !path.isAbsolute(inside), `${name} 链接到 skills/ 之外：${target}`);
      assert.ok(existsSync(resolved), `${name} 链接失效：${target}`);
    }
  }
});

test('agents 目录已删除，brief 随 skill 分发', () => {
  assert.ok(!existsSync(path.join(root, 'agents')));
  for (const brief of [
    'skills/executing-plans/references/reviewer-brief.md',
    'skills/requirement-analysis/references/explorer-brief.md',
    'skills/requirement-analysis/references/external-research-brief.md',
  ]) assert.ok(existsSync(path.join(root, brief)), brief);
});

test('宿主专有工具名只出现在 host-compat', () => {
  for (const skill of skills) for (const file of docs(skill)) {
    const name = rel(file);
    if (name === HOST_COMPAT) continue;
    assert.doesNotMatch(readFileSync(file, 'utf8'),
      /AskUserQuestion|TaskCreate|TaskUpdate|update_plan|spawn_agent|wait_agent|EnterWorktree|subagent_type/, name);
  }
});

test('宿主适配段在各入口逐字一致', () => {
  const canonical = raw(HOST_COMPAT).split('\n').find(line => line.startsWith('> **宿主适配**：'));
  assert.ok(canonical, 'host-compat.md 缺宿主适配段');
  for (const pattern of [/提问/, /子代理/, /进度/, /按名称加载/]) assert.match(canonical, pattern);
  for (const skill of ['requirement-analysis', 'writing-plans', 'executing-plans', 'using-git-worktrees', 'quick-fix', 'acceptance-qa', 'exploring', 'clarifying'])
    assert.ok(raw(`skills/${skill}/SKILL.md`).split('\n').includes(canonical), skill);
});

test('计划与执行主链不用跨 skill 文件链接', () => {
  for (const skill of ['writing-plans', 'executing-plans', 'using-git-worktrees', 'test-driven-development']) {
    const own = path.join(skillsDir, skill);
    for (const file of docs(skill)) for (const target of links(readFileSync(file, 'utf8'))) {
      const inside = path.relative(own, path.resolve(path.dirname(file), target));
      assert.ok(!inside.startsWith('..'), `${rel(file)} 跨 skill 链接：${target}`);
    }
  }
});

test('外部搜索条款按 skill 名称引用 anysearch', () => {
  for (const skill of skills) {
    const text = raw(`skills/${skill}/SKILL.md`);
    if (!/外部搜索/.test(text)) continue;
    assert.match(text, /anysearch/, skill);
    assert.doesNotMatch(text, /exploration-patterns\.md|agent-dispatch\.md/, skill);
  }
});

test('skill 自己的脚本目录变量在 host-compat 有定义，用到的地方带兜底', () => {
  const compat = raw(HOST_COMPAT);
  assert.match(compat, /\$\{CLAUDE_SKILL_DIR\}/);
  assert.match(compat, /单个文件[\s\S]{0,40}相对路径[\s\S]{0,60}按名称加载/);
  for (const skill of skills) for (const file of docs(skill)) {
    const text = readFileSync(file, 'utf8');
    if (rel(file) === HOST_COMPAT || rel(file) === PLUGIN_ROOT || !text.includes('${CLAUDE_SKILL_DIR}')) continue;
    assert.match(text, /(未替换|没有替换)时/, rel(file));
  }
});
