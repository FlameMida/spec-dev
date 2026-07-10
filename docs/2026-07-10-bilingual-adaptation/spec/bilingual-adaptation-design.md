---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
# covers: 本特性为纯文档与指令文案改造，改动面横跨全仓库（skills/agents/README/scripts），
#         glob 等于整仓库会令守卫拦截一切后续改动，故留空跳过守卫。
spec_dev:
  version: 1
  feature: bilingual-adaptation
  status: draft
  covers: []
  sync_commit: null
---

# spec-dev 中英双语适配 设计

## 背景与目标

spec-dev 插件目前约 4600 行指令、7 处固定话术、全部 descriptions 与 README 均为中文：英文用户即使平台已具备语言感知能力（输入语言可见 + Claude Code `language` 设置注入系统指令），也会被硬编码中文输出面拽回中文。本特性让插件全链路输出语言自适应，并建立中英双版 README。

**成功标准**：英文会话下插件的对话输出、子代理回报、落盘产物均为英文且无中文夹杂（evals 与冒烟可观测）；中文会话行为不回归；GitHub 首页展示英文 README，两版一键互跳；现有校验链（validate-skills / check-openai-sync / check-plugin / pre-commit）全绿。

## 非目标

- 不翻译 SKILL.md / references 指令正文（约 4600 行保持中文，理由见 ADR-0001）
- 不翻译 CHANGELOG.md（发版档案）
- 不引入 i18n 框架、locale 资源文件或任何语言检测代码
- 不为中英之外的语言做专门适配或验证（模型天然能力自然覆盖，不设障碍）
- 不建 README 双版一致性的 CI 校验（接受人工同步）

## 术语表

- **对话语言（conversation language）**：当前会话应使用的输出语言，判定优先级：用户显式指定（含平台 `language` 设置注入的系统指令）> 用户近期消息语言 > 默认英语。_Avoid_：用户语言、locale、环境语言
- **语言协议块（Language Protocol block）**：内联于每个 SKILL.md 顶部的统一双语条款，声明输出语言规则与语义模板原则。_Avoid_：语言声明、语言指令
- **语义模板（semantic template）**：SKILL.md 中的固定话术定位——规定"要表达的意思"而非逐字文本，以对话语言现场表达。_Avoid_：硬编码话术、固定文案
- **播种文件（seeding snippet）**：guardrail/templates/ 下被安装进目标仓库 CLAUDE.md / AGENTS.md 的指令片段。

## 影响面

- **skills/**：8 个 SKILL.md（协议块 + frontmatter description）、8 个 agents/openai.yaml（default_prompt）、requirement-analysis 与 acceptance-qa 的产物模板、visual-preview 的 preview-guide、3 个 skill 的 trigger-evals.json
- **agents/**：3 个 agent 定义（语言条款）
- **commands/**：check-mcp.md（description）
- **清单**：.claude-plugin/plugin.json、.claude-plugin/marketplace.json、.codex-plugin/plugin.json（descriptions）
- **文档**：README.md（转英文）、新增 README.zh-CN.md、guardrail/README.md（同构双版）
- **guardrail/**：templates/ 两个播种 snippet、3 个 .mjs 脚本文案
- **scripts/**：6 个 .mjs 脚本的 console 文案
- 无运行时代码逻辑变更；校验链脚本本身的逻辑不动，仅其输出文案双语化

## 已确认的关键决策

- **实现策略**：指令正文保持中文 + 内联双语语言协议块，不做全面英文化 —— 确定性中文源（话术/模板/descriptions）的清除覆盖绝大部分收益；概率性语言拖拽由平台 `language` 设置与协议块双信号压制；方案为全面英文化的真子集，可增量升级不返工（详见 `../../adr/0001-keep-chinese-instructions-inline-language-protocol.md`）
- **产物语言**：跟随创建时对话语言，增量修改保持产物既有语言 —— 用户裁决，规则最简；防半中半英文档
- **README 组织**：README.md 转英文、中文迁至 README.zh-CN.md、H1 下互跳 —— 业界主流（Vue/Ant Design/Dify 惯例），GitHub 首页面向国际用户
- **descriptions 写法**：中英拼接、英前中后、英文侧为压缩版 —— 平台无本地化字段（官方证实），拼接是唯一双语可行解；压缩控制列表展示长度
- **话术处理**：协议块统一声明语义模板原则，不逐处附英文对照 —— 话术短、现场翻译漂移风险低，保持 SKILL.md 清爽，evals 兜底观测
- **脚本文案**：同行拼接 `English / 中文`，不做 LANG 检测 —— 约 35 条文案不值得 i18n 机制（YAGNI）
- **7 处固定话术清单**（供实施定位）：requirement-analysis L198（spec 审查门）、writing-plans L12 与 L234-236（开场/交接）、executing-plans L14（开场）、using-git-worktrees L14 与 L40（开场/就绪报告）、visual-preview L14（JIT 提议）

## ADDED Requirements

### Requirement: 对话输出语言自适应

skill 运行期间的对话输出 SHALL 使用对话语言（判定优先级见术语表）；用户显式指定与近期消息均无法判定语言时 SHALL 默认英语。

#### Scenario: 英文会话全英文交互
- **GIVEN** 用户未设置平台 `language`，以英文输入触发 requirement-analysis
- **WHEN** skill 执行开场声明、澄清提问、方案对比
- **THEN** 全部对话输出为英文，无中文句子或词组夹杂

#### Scenario: 平台语言设置优先于输入语言
- **GIVEN** 用户平台 `language` 设为中文，但当前消息用英文书写
- **WHEN** skill 产生对话输出
- **THEN** 输出为中文（显式设置压过输入语言）

#### Scenario: 对话中途切换语言
- **GIVEN** 会话以中文开始，skill 流程进行中
- **WHEN** 用户改用英文继续对话
- **THEN** 后续对话输出切换为英文

### Requirement: 产物语言跟随创建时对话语言

写入仓库的产物（spec/plan/验收报告/探索笔记/ADR）SHALL 使用创建该产物时的对话语言；对既有产物的增量修改 SHALL 保持产物既有语言。

#### Scenario: 英文会话产出英文 spec
- **GIVEN** 英文会话走完 requirement-analysis
- **WHEN** spec 落盘
- **THEN** spec 正文为英文（Requirement/Scenario 等结构标签本就是英文）

#### Scenario: 切换语言后增量修改不改产物语言
- **GIVEN** 中文会话创建的 spec 已落盘，用户转用英文对话
- **WHEN** 用户要求补充该 spec 的一节
- **THEN** 新增内容仍为中文（与产物既有语言一致），对话解释为英文

### Requirement: 子代理回报语言跟随派发语言

3 个 agent（code-explorer、code-reviewer、external-resource-explorer）SHALL 以派发任务 prompt 的语言回报；JSON 契约的字段名 SHALL 保持英文，字段值语言跟随派发语言。

#### Scenario: 英文派发英文回报
- **GIVEN** 主线程以英文 prompt 派发 code-explorer
- **WHEN** 子代理完成探索并回报
- **THEN** 回报正文为英文，JSON 契约字段名仍为英文原名

### Requirement: README 中英双版互跳

仓库 SHALL 提供英文 README.md 与中文 README.zh-CN.md，内容语义等价；两版 H1 之后第一行 SHALL 含指向对方的链接（当前语言不作链接）。guardrail/README.md 同构处理。

#### Scenario: 两版互跳可达
- **GIVEN** 读者打开任一语言版 README
- **WHEN** 点击顶部语言链接
- **THEN** 跳转到另一语言版本，且该文件真实存在于仓库

#### Scenario: 英文版指向中文 CHANGELOG 有标注
- **GIVEN** 读者阅读英文 README.md
- **WHEN** 到达 CHANGELOG 链接处
- **THEN** 链接旁标注内容为中文（如 "(Chinese)"）

### Requirement: 英文触发可验证

requirement-analysis、exploring、visual-preview 的 trigger-evals.json SHALL 各含至少 2 条英文触发正例与 1 条英文边界负例，格式沿用现有可判定结构。

#### Scenario: 英文正例期望触发
- **GIVEN** trigger-evals 含英文用例 "Design a bilingual switch for the settings page"
- **WHEN** 按用例判定 requirement-analysis 是否应触发
- **THEN** 期望值为触发，且用例格式通过现有 evals 结构校验

## MODIFIED Requirements

### Requirement: 固定话术以语义模板表达（改：逐字中文 → 对话语言表达）

8 个 SKILL.md SHALL 在 frontmatter 后、正文前内联统一的双语语言协议块；7 处固定话术保留中文原文作为语义锚，模型 SHALL 以对话语言表达其含义而非逐字照搬。

#### Scenario: 英文会话下开场声明为英文
- **GIVEN** 英文会话触发 writing-plans
- **WHEN** skill 要求做出"我正在使用 writing-plans skill 编写实施计划"的开场声明
- **THEN** 输出为该话术的英文表达（如 "I'm using the writing-plans skill to write the implementation plan."），语义完整

#### Scenario: 中文会话话术不回归
- **GIVEN** 中文会话触发 using-git-worktrees
- **WHEN** skill 执行开场声明与就绪报告
- **THEN** 输出为中文，语义与原话术一致

### Requirement: descriptions 中英拼接（改：纯中文 → 英前中后拼接）

8 个 SKILL.md、plugin.json、marketplace.json、3 个 agent、check-mcp 的 description SHALL 为"英文压缩版 / 中文全版"拼接（英前中后）；8 个 openai.yaml 的 default_prompt SHALL 补齐中文侧成同构拼接。英文压缩版 SHALL 含触发意图与适用/不适用边界。

#### Scenario: 英文输入正常触发 skill
- **GIVEN** descriptions 已拼接，用户以英文表达需求交付意图
- **WHEN** 模型依据 description 判断是否触发 requirement-analysis
- **THEN** 正常触发（由新增英文 evals 正例判定）

#### Scenario: 中文触发精度不回归
- **GIVEN** descriptions 已拼接
- **WHEN** 以现存中文 trigger-evals 用例回归
- **THEN** 全部用例判定结果与改动前一致

### Requirement: 产物模板双语指引（改：中文注释 → 双语指引+英文结构）

spec-template.md 与 acceptance-report.md SHALL 在顶部含双语填写指示（内容跟随对话语言）；填写说明注释 SHALL 为中英对照；结构标签、表头 SHALL 统一英文；占位符名 SHALL 为英文。preview-guide.md SHALL 声明示例中文文案仅为结构示意、实际 mockup 文案用对话语言。

#### Scenario: 英文会话产出的验收报告无中文残留
- **GIVEN** 英文会话执行 acceptance-qa 并按模板生成报告
- **WHEN** 检查报告正文
- **THEN** 表头/结构为英文，填写内容为英文，无未替换的中文占位符

### Requirement: 播种文件双语并列（改：纯中文 → 英前中后双节）

CLAUDE.md.snippet 与 AGENTS.md.snippet SHALL 为英文节在前、中文节在后的双语并列结构，两节语义等价；guardrail/session-context.mjs 注入会话的提示文本 SHALL 同构双语。

#### Scenario: 播种进英文团队仓库可直读
- **GIVEN** guardrail 安装到一个英文团队的仓库
- **WHEN** 成员或模型读取植入的 CLAUDE.md 片段
- **THEN** 首先呈现完整英文指令节，中文节紧随其后，语义一致

### Requirement: 脚本文案同行双语（改：中文 → English / 中文 拼接）

scripts/ 与 guardrail/ 下 .mjs 脚本面向用户的 console 输出与报错 SHALL 为 `English / 中文` 同行拼接；脚本逻辑与退出码 SHALL 不变。

#### Scenario: 校验失败信息双语可读
- **GIVEN** openai.yaml 与 SKILL.md 不同步
- **WHEN** 运行 check-openai-sync.mjs
- **THEN** 报错行同时含英文与中文描述，退出码与改前一致

## REMOVED Requirements

无。

## 方案设计

### 架构与组件

单一机制贯穿：**语言协议块**（统一双语文本，逐字内联到 8 个 SKILL.md）声明对话语言判定优先级、产物语言规则、语义模板原则。其余组件均为该协议的配套输出面清理：descriptions 拼接（触发与展示）、agent 语言条款（子代理链路闭环）、模板双语指引（产物面）、README/snippet/脚本文案双语化（静态文档面）。协议块文本在 spec 定稿后由 writing-plans 固化为唯一版本，8 处逐字一致（便于日后统一升级，grep 可齐改）。

### 数据流（语言信号流）

用户输入(L) → 平台 `language` 设置（若有）注入系统指令 → skill 展开（中文正文 + 双语协议块）→ 对话输出 L → 主线程以 L 撰写子代理 prompt → 子代理按语言条款以 L 回报 → 产物以 L 落盘。Codex 侧无 `language` 设置，信号退化为输入语言 + 协议块，同一实现双平台生效，无平台分支。

### 关键接口

- 语言协议块：双语两段（英前中后），见已批准设计文本；插入位置为 frontmatter 结束后第一个空行处
- 互跳行（英文版）：`English | [简体中文](README.zh-CN.md)`；中文版：`[English](README.md) | 简体中文`
- descriptions 拼接格式：`<English condensed> / <中文全版>`；default_prompt 同构
- 脚本文案格式：`<English> / <中文>` 单行

### 错误处理

- 协议块被局部改动导致 8 处不一致：validate-skills.mjs 现有结构校验不覆盖此项，接受（协议逐字一致仅为维护便利，非正确性前提）
- 英文压缩 description 意外破坏 frontmatter YAML（引号/冒号）：check-plugin.mjs 与 validate-skills.mjs 会拦截
- 翻译后的 README 相对链接失效：验收清单逐链核对

## 测试与验收策略

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| 英文正例期望触发 / 中文触发精度不回归 | evals | 任务内校验 | trigger-evals 全部用例判定符合期望 |
| descriptions/yaml/frontmatter 结构完好 | integration | 任务内校验 | validate-skills、check-openai-sync、check-plugin、pre-commit 全绿 |
| 校验失败信息双语可读 | integration | 任务内校验 | 脚本输出含双语且退出码不变 |
| 两版互跳可达 + 相对链接有效 | docs | 验收任务 (D) | 链接逐条核对记录 |
| 英文会话全英文交互 / 开场声明英文表达 | ai-acceptance | 验收任务 (D) | 英文会话冒烟记录：requirement-analysis 开场、worktree 声明、spec 片段均为英文无夹杂 |
| 中文会话话术不回归 | ai-acceptance | 验收任务 (D) | 中文会话冒烟记录与现行为一致 |

## 风险与边缘情况

- **残余中英夹杂**（概率性）：中文正文对英文输出的拖拽由平台设置 + 协议块双信号压制；evals 与冒烟观测；若频发，升级路径为指令英文化（本方案为其真子集，不返工）
- **README 双版漂移**：接受人工同步，纪律为"改 README 的 PR 须同步另一版或在 CHANGELOG Docs 条目注明未同步"
- **descriptions 拼接后过长**：英文压缩版规则控制；实施时逐条目检展示效果
- **中英混合输入**：按近期消息主导语言由模型裁量，不设机械规则，不纳入 evals（无可判定标准）
- **平台 `language` 设置存在性差异**：Codex 无此机制，协议块优先级链的第一级在 Codex 侧自然落空，降级为输入语言判定——行为仍正确

## 开放问题

- 英文 README 中 ASCII 管线图内的中文节点名如何处理（直译 vs 音译保留）——实施时按图幅裁量
- guardrail install.mjs 的长段安装引导文案（约 8 条）拼接后单行过长时，允许改为相邻双行——实施裁量
