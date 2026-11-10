import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const raw = f => readFileSync(path.join(root, f), 'utf8');
const policy = f => readPolicy(root, f).text;
const has = f => existsSync(path.join(root, f));
// 「旧格式计划」一节只描述如何读历史计划，不属于现行流程。
const current = text => text.split(/^## 旧格式计划/m)[0];

test('执行计划前不做基线检查', () => {
  for (const f of ['skills/using-git-worktrees/SKILL.md', 'skills/writing-plans/SKILL.md'])
    assert.doesNotMatch(policy(f), /基线|相关测试范围|残留只读报告/, f);
  const e = current(policy('skills/executing-plans/SKILL.md'));
  assert.doesNotMatch(e, /基线|相关测试范围|残留只读报告/);
  assert.match(e, /开工前不运行任何测试/);
});

test('计划模板：只有头部、导航、任务与执行记录', () => {
  const template = 'skills/writing-plans/references/plan-template.md';
  assert.ok(has(template));
  for (const old of ['plan-format', 'task-templates', 'delivery-templates', 'plan-review'])
    assert.ok(!has(`skills/writing-plans/references/${old}.md`), old);
  const t = raw(template);
  for (const pattern of [/### 任务 1/, /红转绿记录/, /收尾预先决定/, /测试命令/, /## 执行记录/]) assert.match(t, pattern);
  assert.doesNotMatch(policy('skills/writing-plans/SKILL.md'),
    /spec-dev-scopes|spec-dev-delivery|task-binding|authority|任务 0|T00|final 验证票|验收任务|资源台账|execution\/|集成组|回执/);
});

test('收尾回归与验收先问后做', () => {
  const e = raw('skills/executing-plans/SKILL.md');
  assert.match(e, /<HARD-GATE>[\s\S]*?未经用户当次明确同意[\s\S]*?不得[\s\S]*?<\/HARD-GATE>/);
  assert.match(e, /### 询问门/);
  assert.match(e, /不跑[\s\S]{0,20}受影响范围[\s\S]{0,20}全量/);
  assert.match(e, /按未同意处理/);
  assert.doesNotMatch(current(policy('skills/executing-plans/SKILL.md')),
    /独立 final|final 验证票|review-runner|validate-output|completeness critic|task-binding|spec-dev-scopes|authority|execution\/|回执|资源台账|集成组/);
});

test('acceptance-qa 只在用户直接调用或询问门同意后执行', () => {
  const a = raw('skills/acceptance-qa/SKILL.md');
  assert.match(a, /询问门/);
  assert.match(a, /不得自行/);
  assert.ok(has('skills/acceptance-qa/references/acceptance-checklist.md'));
  assert.ok(!has('skills/acceptance-qa/references/acceptance-matrix.md'));
  assert.doesNotMatch(policy('skills/acceptance-qa/SKILL.md'), /F 回执|execution\/|manual-pending|validate-output|验收矩阵|Lane/);
});

test('防跑偏规则与测试锁定写在执行入口', () => {
  const e = raw('skills/executing-plans/SKILL.md');
  for (const pattern of [/测试锁定/, /重读/, /任务外/, /红转绿记录/, /连续执行/]) assert.match(e, pattern);
});

test('恢复时勾选与提交对不上要重新验证，定位不了就报告', () => {
  const e = raw('skills/executing-plans/SKILL.md');
  assert.match(e, /勾选与提交对不上[\s\S]{0,80}重跑该任务的目标测试/);
  assert.match(e, /未提交的改动[\s\S]{0,40}不丢弃/);
  assert.match(e, /无法确定进行到哪个任务[\s\S]{0,30}报告[\s\S]{0,20}不猜/);
});

test('没有 spec 的计划按头部的验收标准执行', () => {
  assert.match(raw('skills/executing-plans/SKILL.md'), /没有 spec[\s\S]{0,60}验收标准[\s\S]{0,60}Requirement/);
});

test('停下时把命令和关键输出写进执行记录', () => {
  assert.match(raw('skills/executing-plans/SKILL.md'), /停下时[\s\S]{0,40}命令[\s\S]{0,20}输出[\s\S]{0,20}执行记录/);
});

test('被拒绝的操作不换个方式偷偷执行', () => {
  const w = raw('skills/using-git-worktrees/SKILL.md');
  assert.match(w, /被拒绝[\s\S]{0,60}(改名|换解释器)[\s\S]{0,60}(放宽安全设置|换会话)/);
  assert.match(w, /文件(不存在|找不到)[\s\S]{0,80}(文件名|项目根)/);
  assert.match(w, /EACCES|EPERM/);
});

test('test-strategy 已删除，测试处方随 TDD 分发', () => {
  assert.ok(!has('skills/test-strategy'));
  for (const name of ['db-testing', 'frontend-testing', 'ai-agent-testing'])
    assert.ok(has(`skills/test-driven-development/references/${name}.md`), name);
  assert.doesNotMatch(policy('skills/test-driven-development/SKILL.md'), /test-strategy|Lane|final 验证|集成组/);
});

test('spec 模板是一页契约，生命周期可选', () => {
  const s = raw('skills/requirement-analysis/assets/spec-template.md');
  for (const pattern of [/## 目标与成功标准/, /## 非目标/, /## 关键决策/, /## 行为规范/, /需要漂移守卫/]) assert.match(s, pattern);
  assert.doesNotMatch(s, /Lane|required|sync_commit|Superseded-pending|验收矩阵/);
});

test('requirement-analysis 四步、一次设计批准', () => {
  const r = raw('skills/requirement-analysis/SKILL.md');
  for (const pattern of [/理解与探索/, /逐题澄清/, /设计提案/, /落盘 spec/]) assert.match(r, pattern);
  assert.doesNotMatch(r, /阶段 [5-8]|对抗验证 \+ 提出/);
});

test('守卫在交付时激活，写计划前不翻 active', () => {
  assert.match(policy('skills/requirement-analysis/SKILL.md'), /实施期间[\s\S]{0,30}draft/);
  assert.match(raw('skills/executing-plans/SKILL.md'), /交付提交里把 `status` 翻为 `active`/);
  assert.doesNotMatch(policy('skills/writing-plans/SKILL.md'), /翻为 `active`/);
});

test('quick-fix：全量回归与专项验收先问，不再使用任务绑定', () => {
  assert.match(raw('skills/quick-fix/SKILL.md'), /全量回归和 acceptance-qa 专项验收一律先问/);
  assert.doesNotMatch(policy('skills/quick-fix/SKILL.md'), /task-binding|Spec-Task/);
});
