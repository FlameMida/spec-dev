# 并行探索模式（阶段 2）

> **阅读时机**：standard/deep 档进入阶段 2 前阅读；light 档主线程直查时无需加载。

## 核心规则

> ⚠️ **必须在单个响应中发起所有并行任务**
>
> 内部探索（code-explorer）与外部探索（external-resource-explorer）相互独立，属于同一波次——不能先启动内部、等结果、再启动外部。分批发起会退化为串行等待，丧失并行收益。

子代理数量**不设上限**：由需求结构（层次数、模块数、模态数、外部主题数）决定，而非人为封顶。约束只有一条——每个子代理必须有清晰独立的主题，两个子代理主题重叠意味着拆分错了，合并它们。

---

## 内部探索策略（code-explorer）

**策略 1：按架构层次分解**（standard 档推荐）

- Agent 1：数据层（实体、数据库、迁移）
- Agent 2：服务层（业务逻辑、验证、错误处理）
- Agent 3：API/界面层（控制器、路由、组件、请求/响应）

**策略 2：按功能模块分解**（standard 档）

- Agent 1：核心功能模块
- Agent 2：关联功能模块
- Agent 3：通用工具和模式

**策略 3：multi-modal sweep**（仅 deep 档）

每个 code-explorer 各持一个**模态**、彼此盲扫——用不同的"找东西的方式"覆盖同一代码库，单一视角找不全的风险面靠模态差异兜住：

```
模态1 按入口追踪：API/UI/CLI 入口 → 调用链向下
模态2 按数据流：实体/存储 → 读写路径向上
模态3 按配置与约定：规范文件、依赖注入、构建配置
模态4 按测试用例：测试反推行为契约（项目无测试则跳过此模态）
（按项目形态增删模态，数量不设上限）
```

模态不绑定后端假设——前端项目的模态 1 是路由/页面入口，CLI 项目是命令注册表，库项目是公开 API 面。

**何时不用 multi-modal sweep**：light/standard 档禁用——模态盲扫对小范围需求是浪费（多个 agent 扫一个模块会大量重叠），standard 用策略 1/2 即可。

---

## 外部探索策略（external-resource-explorer）

阶段 1 标记"需要外部探索"时，与内部探索**同一条消息**发起：

- **standard**：1-2 个 agent（如：一个查库文档/官方指南，一个查行业实践/已知坑）
- **deep**：按主题拆分，每主题一个 agent（如：候选库 A 对比、候选库 B 对比、安全基线、性能基准）

**工具优先级与降级链**（agent 内部遵循，调用细节见 agents/external-resource-explorer.md）：

1. 通用外部研究/时效信息/垂直领域/多主题批量：AnySearch（插件内嵌 skill，`${CLAUDE_PLUGIN_ROOT}/skills/anysearch/`）→ 降级 `WebSearch` / `WebFetch`
2. 第三方库/框架文档： AnySearch → 降级为网页搜索 + `rg` + 文件阅读
3. 降级单向不回头：AnySearch 一旦判定不可用（CLI 缺失、两种 runtime 均失败、网络错误间隔 30s 重试仍败、配额耗尽），本轮探索后续查询直接走降级目标，不反复试探；每层最多 2 次尝试、间隔 30s，确定性失败即刻降级；报告 Sources 注明实际链路与降级原因

**回补探索**：阶段 3/4 发现新库或新领域时允许回补一轮，同样单响应发起，结果并入已有探索报告。

---

## 插件根解析

插件内文件（契约校验器 `scripts/validate-output.mjs`、`skills/acceptance-qa/scripts/detect-env.mjs`、anysearch CLI 等）的路径一律写作 `"${CLAUDE_PLUGIN_ROOT}/<相对插件根路径>"`（变量双引号包裹）；**插件根**即插件安装目录的绝对路径（`skills/`、`agents/`、`scripts/` 的父目录）。cwd 是用户项目、插件文件不在其中，因此禁止相对路径。含此类命令的 skill 在语言协议块之后固定一行「**插件根**：`${CLAUDE_PLUGIN_ROOT}`」声明（载入即声明）：平台加载 skill 正文时把它替换为绝对路径，该行即本会话的插件根事实来源。

references 与派发词中出现的 `${CLAUDE_PLUGIN_ROOT}` 是**占位符**——平台不替换、也不导出到模型的 Bash 环境——执行者按下列序列解析后代入：

1. skill 正文中被平台替换后的绝对路径（声明行已显示为 `/` 起始的路径即直接取用）
2. skill base directory 上两级：skill 固定位于插件根下的 `skills/<name>/`，平台加载 skill 时给出的 base directory 向上两级即插件根
3. 已安装插件目录：Claude Code 的 plugins cache（`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`）或 Codex 的插件安装目录

三级均失败 → 向用户报告"无法定位插件根"并停下，不得静默跳过、不得改用相对路径。skill 自身目录用官方变量 `${CLAUDE_SKILL_DIR}`（同样只在 skill 正文替换），未替换时取 skill base directory。

---

## 输出契约与校验

本节是全部子代理输出契约（exploration-report / review-findings / acceptance-check-items）失败处置与降级规则的定义点，其他 skill 以 gist + 指针引用。通用规则：

- 校验失败 → 把 errors 清单发回该子代理补全一次 → 再失败由主线程接管该子代理负责的范围（模态 / 维度 / 检查项）
- 校验器不可用（node 缺失或插件根无法定位）→ 主线程按对应 schema（`scripts/schemas/<name>.json`）人工核对必填键与 `coverage_note` 非空，并在报告注明"契约校验降级"

**requirement-analysis deep 档实例**：每个 code-explorer 输出 exploration-report 契约 JSON 落盘，逐份校验：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" exploration-report <file>
```

- 主线程合并去重：同一文件被多模态命中是信号而非冗余——标记为高置信关键文件

light/standard 档不要求契约 JSON，子代理按其自身定义的 markdown 报告格式返回即可。

---

## 派发要求与失败隔离

**每个子代理必须给定**：

1. 清晰的主题或模态（一个子代理一个角度，允许在该范围内展开）
2. 相关文件线索、目标层次（内部）或检索主题与关键词（外部）
3. 期望输出格式
4. **（外部探索）工具优先级提醒**：派发 prompt 中显式写明「AnySearch 第一优先（通用/时效/垂直/批量；CLI 在 `${CLAUDE_PLUGIN_ROOT}/skills/anysearch/scripts/`）→ `WebSearch`/`WebFetch` 兜底」——agent 定义文件虽已内置此优先级，但派发词重申才能保证在不加载 agent 定义的环境（如 Codex `spawn_agent`）同样生效；派发词固定携带一行模板「工具优先级：AnySearch 第一优先（CLI 在 `${CLAUDE_PLUGIN_ROOT}/skills/anysearch/scripts/`），WebSearch/WebFetch 兜底」——与前半句同源内联实路径，不换成指向 agent 定义文件的相对指针（模板所针对的恰是不加载该文件的环境），主线程复制使用、不现场重写（唯一例外：模板中的 `${CLAUDE_PLUGIN_ROOT}` 按「插件根解析」序列代入已解析的绝对路径）
5. **（涉及 `.spec-dev/` 产物时）文档时效规则**：按 frontmatter `spec_dev.status` 分类报告——active 为现行契约；superseded、以及正文带 `Superseded-pending` / `Superseded` 标注者点名标示且仅作历史参考，不得进入"现行契约"结论；命中的 active spec/ADR 与本需求的行为交集逐一列出（供阶段 6 取代分流消费）；被 `Superseded` 标注的单条 Requirement 同样排除出现行契约。ADR 按状态行过滤（`Superseded by` / `Deprecated` 仅作历史参考，缺状态行视同 Accepted）。plan / acceptance 报告 / exploration 笔记是执行时点记录——代码现状以仓库与 active spec 为准，不得从中照抄代码片段作为现状依据。派发词已声明契约姿态降格（用户授权破坏性重构）时，命中的旧契约按"仅现状输入"报告，不作为约束

**失败隔离**：某子代理失败 → 缩小该主题范围重试 1 次 → 仍失败由主线程接管该主题，其余子代理不受影响。

**主线程止损**：主线程明显降质（重复遗忘既定结论、同一错误反复出现、上下文告急）时，在最近的阶段边界把产物落盘并提交后再继续或重开会话，不硬撑。

**结果汇总**：等待全部完成 → 整合发现并去重 → 组织成结构化探索摘要（关键文件清单、现有模式、外部结论与来源），供阶段 3-5 引用。

## 完成条件与排除项

派发前把主题转为可判定的完成条件，说明要核对哪些对象、交付哪些证据和怎样声明未覆盖；显式列出本任务排除项及操作边界。保留来源指针、必要元数据和短摘要，不复制完整 spec 代替可恢复输入；涉及 spec 时继续携带现行/已取代条款过滤规则。没有答案预设时不得在派发中暗示预期结论。

- 不足的例子：“看看审查纪律。”
- 有界的例子：“核对指定四条审查规则，逐条返回现状/缺口和 file:line，说明未覆盖项；先读给定源码与现行契约指针，不重做生态搜索，不修改文件。”

示例供派发者校准，无须每次把教学例子复制给子代理。完成条件可以是“证实不存在缺口”，不强求发现数。失败处置仍用本文件单点规则：缩小的是扫描批次，不是最终覆盖；接管前后都记录剩余范围，未查完不能报完成。
