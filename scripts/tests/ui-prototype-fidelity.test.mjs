import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const text = f => existsSync(path.join(root, f)) ? readFileSync(path.join(root, f), 'utf8') : '';
const all = (f, patterns) => { for (const pattern of patterns) assert.match(text(f), pattern, `${f} 缺 ${pattern}`); };

const CONVENTIONS = 'skills/visual-preview/references/project-ui-conventions.md';
const CONTRACT = 'skills/visual-preview/references/ui-prototype-contract.md';
const GUIDE = 'skills/visual-preview/references/preview-guide.md';
const PREVIEW = 'skills/visual-preview/SKILL.md';
const REQUIREMENT = 'skills/requirement-analysis/SKILL.md';
const PLANNING = 'skills/writing-plans/SKILL.md';
const EXECUTING = 'skills/executing-plans/SKILL.md';

test('画稿前盘点项目界面约定并留证据', () => {
  all(CONVENTIONS, [/技术栈/, /组件库/, /设计令牌/, /公共封装组件/, /布局壳/, /参照页面/, /证据路径/, /不问用户/, /约定摘要/]);
  all(PREVIEW, [/\(references\/project-ui-conventions\.md\)/, /画第一版界面原型前/]);
  all(CONTRACT, [/\(project-ui-conventions\.md\)/]);
  all(REQUIREMENT, [/visual-preview\/references\/project-ui-conventions\.md/]);
});

test('定稿按三档降级渲染并附组件映射表', () => {
  all(CONVENTIONS, [/真实组件/, /同库静态/, /等价演示/, /取第一个可行/, /不改生产文件/, /已知偏差/,
    /组件映射表/, /\*\*复用\*\*、\*\*扩展\*\*、\*\*新增\*\*/, /还原要点/]);
  all(CONTRACT, [/组件映射/, /已知偏差/]);
  all('skills/requirement-analysis/assets/spec-template.md', [/界面约定/, /组件映射/]);
});

test('草稿可以用线框，线框不当定稿', () => {
  assert.doesNotMatch(text(GUIDE), /mockup 保持简单/);
  all(GUIDE, [/草稿保持简单/, /不拿线框当定稿/, /\(project-ui-conventions\.md\)/, /\/files\/<相对路径>/, /不触发媒体查询/]);
  all(CONVENTIONS, [/线框不当定稿/, /完整 HTML 文档/]);
});

test('没有前端时先盘问并推荐技术栈', () => {
  all(CONVENTIONS, [/没有前端/, /先自查/, /一次一题/, /整套推荐/, /备选/, /外部搜索[\s\S]{0,40}核实/, /来源与日期/,
    /ADR/, /假设/, /不搭生产脚手架/]);
  all(PREVIEW, [/没有前端[\s\S]{0,60}技术栈/]);
  all(REQUIREMENT, [/没有前端[\s\S]{0,60}技术栈/]);
  all('skills/clarifying/references/ui-clarification.md', [/visual-preview\/references\/project-ui-conventions\.md/, /技术栈/]);
  all('skills/exploring/SKILL.md', [/技术栈[\s\S]{0,20}假设/]);
});

test('原型主动打开给用户，不只发链接', () => {
  all(PREVIEW, [/主动展示/, /不只发链接/, /start-server\.sh" --project-dir \S+ --open/, /没有自动打开/]);
  all('skills/requirement-analysis/references/host-compat.md', [/向用户打开页面/]);
  for (const script of ['start-server.sh', 'server.cjs'])
    assert.doesNotMatch(text(`skills/visual-preview/scripts/${script}`), /after the user approves/, script);
});

test('请求批准设计前完成定稿审查', () => {
  all(PREVIEW, [/^## 定稿审查$/m, /定稿总览屏/, /先自检/, /不单设批准门/]);
  all(CONTRACT, [/定稿审查/, /不单设批准门/]);
  all(CONVENTIONS, [/^## 定稿自检$/m]);
  all(REQUIREMENT, [/定稿审查/, /定稿还没有展示[\s\S]{0,30}不请求批准/]);
});

test('计划的界面任务带定稿、组件映射与还原自查', () => {
  all('skills/writing-plans/references/plan-template.md', [/\*\*界面定稿\*\*/, /\*\*界面还原\*\*/, /步骤 5：还原自查/]);
  all(PLANNING, [/界面任务带上定稿/, /组件映射/, /还原自查/]);
  all('skills/writing-plans/references/task-boundaries.md', [/界面定稿/, /组件映射/]);
});

test('执行界面任务时按组件映射实现并做还原自查', () => {
  all(EXECUTING, [/\*\*界面任务\*\*/, /组件映射/, /还原自查/, /未自查/, /不产生验收结论/,
    /<HARD-GATE>[\s\S]*?还原自查不受此限[\s\S]*?<\/HARD-GATE>/]);
  assert.doesNotMatch(text(CONTRACT), /不在任务内自行做页面对照/);
  all(CONTRACT, [/还原自查/]);
  all('skills/test-driven-development/references/frontend-testing.md', [/界面定稿/]);
});

test('收尾审查检查界面还原', () => {
  all('skills/executing-plans/references/reviewer-brief.md', [/\*\*界面还原\*\*/, /组件映射/, /硬编码/, /不启动应用/]);
  all(EXECUTING, [/派发词[\s\S]{0,200}组件映射/]);
});

test('验收对照定稿与组件映射', () => {
  all('skills/acceptance-qa/SKILL.md', [/组件映射/]);
  all('skills/acceptance-qa/references/acceptance-checklist.md', [/组件映射/]);
  all('skills/acceptance-qa/references/visual-a11y.md', [/组件映射/, /还原自查[\s\S]{0,40}不[\s\S]{0,10}验收证据/]);
});
