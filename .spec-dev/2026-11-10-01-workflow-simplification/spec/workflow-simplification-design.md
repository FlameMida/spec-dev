# 工作流简化 设计

## 目标与成功标准

用最少的流程开销制定长任务的执行计划，并让长任务高质量、不跑偏地完成。此前执行一份计划要经过基线、每任务绑定、独立 final、多路审查、验收和交付核验，规则本身成了主要成本。

**成功标准**：

- 执行计划前不运行任何测试；回归和验收只在用户选择后执行。
- 一个功能从需求到交付只停三次：批准设计、批准计划、询问门。
- 只同步 `skills/` 目录的装法能完整走完流程。
- 规则体量明显下降：计划与执行主链从 141KB 降到 50KB，requirement-analysis 从 99KB 降到 47KB，skill 从 14 个减到 13 个。

## 非目标

- 不改模型上下文注入、doctor、anysearch、wtf 和 visual-preview 的脚本。
- 不发版、不推送、不修改用户的 magpie 配置。
- 不迁移历史计划，不改写旧 spec 的正文。
- 不可接受的结果：未经询问自行运行全量测试或验收；没有独立执行者却声称做过独立审查。

## 关键决策

- 去除执行前的基线检查 —— 用户明确要求。
- final 测试与验收先问后做；任务内的目标测试和项目已有的 typecheck、lint 仍自动运行 —— 用户明确要求，并确认了后半句。
- 移除任务范围绑定 —— 用户决定。
- 独立审查自动执行，默认一路、大变更两路；worktree 默认隔离并保留为独立的小 skill —— 用户采纳推荐。
- spec 改为一页契约，生命周期默认不用 —— 用户采纳。
- 验证前移、测试锁定、红转绿记录、回归三档、验收清单收尾时生成、用户判断、可预先回答 —— 用户整体采纳。
- 兼容 Codex、Pi、Grok Build 等宿主 —— 用户要求；做法是按能力降级、宿主专有工具名只出现在 host-compat、skill 只依赖 `skills/` 内的文件，随完整计划获批。
- 删除 `agents/` 并迁为 skill 内的 brief、守卫改到交付时激活、冻结 19 份过期的 active spec —— 代理提出的三个默认，用户以“做吧”接受。
- 本 spec 不带 frontmatter，本仓库不再用 covers 守卫自己的 skill，改由下面以 Scenario 命名的测试守护 —— 代理选择，沿用新的默认。
- 架构决策见 ADR-0013（.spec-dev/adr/0013-workflow-simplification.md），它取代 ADR-0001、0005、0006、0009、0011、0012。

Scenario 与测试同名，分布在 `scripts/tests/` 的 workflow-simplify、host-compat、drift-guard、guard-install、status-plan、status-collect。

## ADDED Requirements

### Requirement: 收尾的回归与验收先问后做

全部任务完成后，工作流 SHALL 先取得用户的选择，再运行回归测试、验收或交付。

#### Scenario: 收尾回归与验收先问后做

- **GIVEN** 计划的全部任务已完成 **WHEN** 进入收尾 **THEN** 执行入口用 HARD-GATE 禁止自行运行全量、回归、E2E、浏览器或性能验收，并在询问门给出回归三档、验收逐项和交付方式；拿不到回复按未同意处理。

#### Scenario: acceptance-qa 只在用户直接调用或询问门同意后执行

- **GIVEN** 工作流的其他环节想触发验收 **WHEN** 读取 acceptance-qa **THEN** 入口只有用户直接调用和询问门选中两个，结果并排给出预期与实际，由用户判断。

#### Scenario: quick-fix：全量回归与专项验收先问，不再使用任务绑定

- **GIVEN** 小修已完成并回放了原症状 **WHEN** 考虑全量回归或专项验收 **THEN** 先问用户，未获同意不执行。

### Requirement: 执行期防跑偏

执行入口 SHALL 在一处写明每个任务的防跑偏规则。

#### Scenario: 防跑偏规则与测试锁定写在执行入口

- **GIVEN** 正在执行某个任务 **WHEN** 读取执行入口 **THEN** 能读到：开工重读计划头部、只做任务写明的事、已提交的断言不得修改、三档偏差处理、恢复只认计划文件和 git log。

### Requirement: skill 自包含并按能力适配宿主

skill SHALL 只依赖 `skills/` 目录里的文件，并按能力而不是按宿主描述动作。

#### Scenario: skill 不依赖 skills/ 之外的插件文件

- **GIVEN** 只同步了 `skills/` 目录 **WHEN** 检查各 skill 的链接与命令 **THEN** 没有指向 `scripts/`、`agents/`、`guardrail/` 的引用，站内链接都能解析。

#### Scenario: agents 目录已删除，brief 随 skill 分发

- **GIVEN** 需要派发探索、外部研究或审查 **WHEN** 查找角色定义 **THEN** 三份 brief 位于 skill 目录内，仓库不再有 `agents/`。

#### Scenario: 宿主专有工具名只出现在 host-compat

- **GIVEN** 任意 skill 正文 **WHEN** 搜索宿主专有的工具名 **THEN** 只在 host-compat 里出现。

#### Scenario: 宿主适配段在各入口逐字一致

- **GIVEN** 要提问或派发子代理的 skill 入口 **WHEN** 比较它们的宿主适配段 **THEN** 逐字相同。

#### Scenario: 计划与执行主链不用跨 skill 文件链接

- **GIVEN** writing-plans 与 executing-plans **WHEN** 检查链接 **THEN** 只按名称引用其他 skill。

#### Scenario: 外部搜索条款按 skill 名称引用 anysearch

- **GIVEN** 带外部搜索条款的 skill **WHEN** 读取条款 **THEN** 按名称加载 anysearch，不链接到别的 skill 的文件。

## MODIFIED Requirements

### Requirement: 计划是只含头部、导航、任务与执行记录的单个文件（去掉了任务 0、final、验收、交付任务、写集合块和资源台账）

writing-plans SHALL 产出单个计划文件，复选框是唯一的进度状态。

#### Scenario: 计划模板：只有头部、导航、任务与执行记录

- **GIVEN** 计划模板 **WHEN** 检查结构 **THEN** 含四种测试命令、收尾预先决定、四列导航、五步任务和执行记录，不含隔离、final、验收、交付任务和绑定内容。

#### Scenario: 现行单文件计划：复选框即进度，执行记录不计入任务

- **GIVEN** 一份新格式计划 **WHEN** status 读取它 **THEN** 按任务节的复选框计数，执行记录里的复选框不计入。

### Requirement: spec 是一页契约，生命周期可选（原先固定带 frontmatter 和验收矩阵）

spec SHALL 默认只有四个固定小节且不带 frontmatter。

#### Scenario: spec 模板是一页契约，生命周期可选

- **GIVEN** spec 模板 **WHEN** 检查结构 **THEN** 固定小节是目标与成功标准、非目标、关键决策、行为规范，frontmatter 只在需要漂移守卫时添加。

#### Scenario: 一页 spec 没有 frontmatter 时不算读取错误

- **GIVEN** 没有 frontmatter 的 spec **WHEN** status 汇总 **THEN** 正常列出，不报诊断。

#### Scenario: 没有 frontmatter 的一页 spec 不参与守卫

- **GIVEN** 没有 frontmatter 的 spec **WHEN** 改动同目录特性的代码 **THEN** 守卫放行。

### Requirement: requirement-analysis 四步、一次设计批准（原先八阶段、开始执行前停四次）

requirement-analysis SHALL 只要求用户批准一次设计。

#### Scenario: requirement-analysis 四步、一次设计批准

- **GIVEN** 已承诺且有设计空间的需求 **WHEN** 走需求设计 **THEN** 依次是理解与探索、逐题澄清、设计提案、落盘 spec，批准设计后直接进入 writing-plans。

### Requirement: 漂移守卫在交付时激活（原先写计划前激活，靠任务绑定放行）

守卫 SHALL 只拦截 active 的 spec，spec 在实施期间保持 draft。

#### Scenario: 守卫在交付时激活，写计划前不翻 active

- **GIVEN** 启用了守卫的 spec **WHEN** 读取生命周期规则 **THEN** 落盘为 draft，交付提交翻 active。

#### Scenario: 实施期间 spec 保持 draft，任务提交不被拦

- **GIVEN** draft 的 spec 覆盖 `src/**` **WHEN** 任务提交只改代码 **THEN** 暂存、编辑和区间检查都放行。

#### Scenario: 交付提交翻 active 后，后续改动重新受守卫保护

- **GIVEN** 交付提交已把 spec 翻为 active **WHEN** 之后只改代码不改 spec **THEN** 区间检查拦截。

#### Scenario: 历史上带 Spec-Task 的提交告警放行，不再核验绑定

- **GIVEN** 历史提交带 `Spec-Task` trailer **WHEN** 区间或推送检查经过它 **THEN** 给出告警并放行。

#### Scenario: reinstall removes the message guards and scripts left by task binding

- **GIVEN** 目标仓库装过带任务绑定的旧守卫 **WHEN** 重跑安装器 **THEN** 移除它写入消息 hook 的守卫段和绑定脚本副本，用户自己的 hook 内容保留。

## REMOVED Requirements

### Requirement: 执行前的基线验证

移除原因：用户要求。改为遇到与任务无关的失败时，只把该用例在分支起点复跑一次。对应测试：执行计划前不做基线检查。

### Requirement: 任务范围绑定与 Spec-Task 提交关联

移除原因：每任务三条绑定命令和两次提交是流程开销的主要来源；范围纪律改由每任务自检和收尾审查承担。

### Requirement: 独立 final 验证任务、验收任务与交付任务

移除原因：并入询问门，由用户选择后执行。

### Requirement: test-strategy skill 与 fast / final / manual 三 Lane

移除原因：任务内只跑目标测试和快检，其余由用户在询问门决定；测试处方迁入 test-driven-development。对应测试：test-strategy 已删除，测试处方随 TDD 分发。

### Requirement: 受控审查运行器、执行回执、交付证明、并发与集成组协议

移除原因：它们证明的是流程被执行过。审查改为按 brief 派通用只读子代理，证据改为每个 Scenario 的红转绿记录。
