# spec-dev 插件改进计划 — 总览与进度看板

> 创建日期：2026-06-12
> 来源：基于对 `skills/spec-flow`、`skills/requirement-analysis`、`skills/browser-qa` 三个 skill 的深度审查（skill-creator 准则 + Workflow 编排方法论视角）
> 计划文档：本目录下 `phase-1-fixes.md` / `phase-2-restructure.md` / `phase-3-orchestration.md`

---

## 一、方案总目标

1. **修掉硬错误**：路径缺陷、过时工具名、配置位置错误、内部编号矛盾（第一期）。
2. **结构减重与一致性**：SKILL.md 瘦身、复杂度分档、agent 映射对齐、双入口去重（第二期）。
3. **内化 Workflow 编排方法论**：把契约化输出、对抗复核、枯竭循环、失败隔离、覆盖声明等编排模式翻译为 **prompt 层伪代码 + 确定性脚本** 写进 skill，**不依赖调用 Workflow 工具**，保持 Claude Code 与 Codex 双环境一致（第三期）。

### 关键设计决策（执行中不要推翻，除非记录新决策）

| ID | 决策 | 理由 |
|----|------|------|
| D1 | 学习 Workflow 的**编排方法**，不调用 Workflow 工具 | 工具无关 → Codex 兼容天然成立；无 opt-in 与 token 成本争议；skill 本质就是教方法 |
| D2 | 机械性编排下沉为脚本，认知性编排用伪代码写进 SKILL.md | 状态写入/校验/环境检测要确定性；审查/反驳/枯竭判断归模型 |
| D3 | 对抗验证只落在三个质量关口（spec-flow accept、requirement-analysis 阶段 8、browser-qa Layer 2），按 severity 分级触发 | 价值密度 = 错误代价 × 单点不可靠度 ÷ token 成本；中间产物已有人工确认点 |
| D4 | 三档执行模式：light / standard / deep | 9 阶段一刀切是过度流程；deep 档才启用 judge panel、multi-modal sweep 等完整编排 |
| D5 | browser-qa Layer 2 永远串行执行 | Playwright MCP 是单浏览器有状态会话，多 agent 并行驱动会互相破坏状态 |

### 不建议做清单（防过度工程，执行中遇到类似想法直接放弃）

- ❌ 全盘 ultracode 化或把重编排设为默认路径（成本转嫁给所有用户）
- ❌ 给 explore 摘要、plan 文档等中间产物加 N-skeptic 投票（人工确认点已存在）
- ❌ 把 browser-qa Layer 2 并行化（见 D5）
- ❌ 为 Codex 写 Workflow 模拟器（编排方法是工具无关的，不需要模拟器）

---

## 二、总进度看板

> ⚠️ 每完成/开始/跳过一个任务，必须同步更新：① 对应 phase 文档中的任务状态表与任务标题状态；② 本看板的计数与"最近更新"。

| 阶段 | 文档 | 任务数 | ✅ 完成 | 🔄 进行中 | ⏭️ 跳过 | 完成率 | 阶段状态 |
|------|------|--------|---------|-----------|---------|--------|----------|
| 第一期：P0 修错 | [phase-1-fixes.md](./phase-1-fixes.md) | 10 | 10 | 0 | 0 | 100% | ✅ 完成 |
| 第二期：结构重构 | [phase-2-restructure.md](./phase-2-restructure.md) | 12 | 12 | 0 | 0 | 100% | ✅ 完成 |
| 第三期：编排方法论增强 | [phase-3-orchestration.md](./phase-3-orchestration.md) | 16 | 2 | 0 | 0 | 13% | 🔄 进行中 |
| **总计** | — | **38** | **24** | **0** | **0** | **63%** | — |

**最近更新**：2026-06-12（T3.2 完成）

### 里程碑

- [x] M1：第一期全部完成 → 插件无已知硬错误，可放心日常使用（2026-06-12 达成）
- [x] M2：第二期全部完成 → 三个 skill 结构达标（行数、分档、agent 对齐、触发边界）（2026-06-12 达成）
- [ ] M3：T3.1–T3.6 完成 → 三个质量关口具备对抗复核与契约校验
- [ ] M4：第三期全部完成 → 编排方法论完全内化，evals 基线建立

---

## 三、进度追踪规则（强制）

状态图例：`⬜ 待办` / `🔄 进行中` / `✅ 完成` / `⏭️ 跳过` / `🚫 受阻`

1. **开始任务时**：把 phase 文档中该任务的状态表行和任务标题后缀改为 🔄，并更新本文件看板的"进行中"计数。
2. **完成任务时**：
   - 勾掉该任务全部"验收标准"checkbox（必须逐项核实，不允许未验证就勾选）；
   - 状态改为 ✅ 并在状态表"完成日期"列填入日期；
   - 更新本看板计数、完成率与"最近更新"；
   - 执行一次 git commit（提交信息格式：`fix(plan): T1.1 修复 spec-flow command 路径`，pre-commit hook 会自动同步并校验 Codex 分发包）。
3. **跳过任务时**：状态改 ⏭️，必须在任务条目末尾追加一行 `跳过原因: ...`。
4. **受阻时**：状态改 🚫，追加 `受阻原因: ...`，并继续做无依赖的其他任务。
5. **发现新问题时**：在对应 phase 文档末尾追加新任务（沿用编号序列），同步更新本看板任务数。
6. **验收标准均可执行**：含命令的标准必须实际运行命令确认（如 `wc -l`、`grep -c`、`node scripts/sync-codex-package.mjs --check`）。
7. **会话内任务列表（TaskList）同步**：本目录文档是任务状态的唯一持久层（跨会话、git 可追溯）；TaskList 仅是会话层的实时视图。开始执行某一期时，先用 TaskCreate 把该期**未完成**任务批量建入会话任务列表（subject 以任务 ID 开头，如 `T1.1 修复 spec-flow command 路径`），执行中文档与 TaskList 同步更新；新会话恢复时以文档状态表为准重建 TaskList，不依赖上个会话的列表留存。

---

## 四、全局工作规则（每个任务都适用）

1. **唯一源码在根目录**：只修改 `skills/`、`agents/`、`commands/`、`scripts/`；`plugins/spec-dev/` 是生成产物，**严禁手改**。
2. **每次源码改动后**运行 `node scripts/sync-codex-package.mjs` 同步分发包；提交前 `node scripts/sync-codex-package.mjs --check` 与 `node scripts/validate-skills.mjs` 必须通过。
3. **改 SKILL.md frontmatter（name/description）时**：跑一遍 `node scripts/validate-skills.mjs` 确认结构合法。
4. **双环境意识**：所有改动须自问"Codex 路径是否仍然成立"；涉及 `${CLAUDE_PLUGIN_ROOT}` 的改动须按任务内的注意事项验证 Codex 行为。
5. **措辞规范**（来自 skill-creator 准则）：新写入的指令尽量"约束 + why"，避免新增无解释的全大写 MUST/NEVER。
6. **任务粒度**：一个任务一次提交；同一文件被多个任务触及时，按任务顺序分次提交，便于回滚。

---

## 五、执行顺序建议

```
第一期（T1.1 → T1.10，顺序基本无依赖，可按任意顺序，建议按编号）
   ↓ M1
第二期（先 T2.1→T2.2→T2.3 主线，T2.4–T2.6 与 T2.7–T2.11 两条支线可交错）
   ↓ M2
第三期（T3.1→T3.2 是地基，必须最先；之后 T3.3/T3.4/T3.5 三个关口改造可并行推进；
        T3.7–T3.10 runtime 系列一组；T3.11–T3.16 收尾）
   ↓ M3, M4
```
