# 计划分解与集成组 Spec 审查记录

- 日期：2026-09-07。
- 待审文件：[plan-decomposition-design.md](plan-decomposition-design.md)。
- 审查基线：`9a8bd71c3e121972465279ee6396b8f13c2da680`。
- 审查方式：原生独立子代理 `plan_decomposition_spec_review`，`fork_turns=none`，只读；按 requirement-analysis 的 spec-reviewer-prompt 和共享 design-principles 校准。
- 结论：**Approved**。23 条 Requirement / 33 个 Scenario；无阻塞问题、无需行为修订。
- 状态：用户已批准方案与完整设计；用户已于 2026-09-07 review 通过并同意开始编写实施计划；spec 已激活。本记录不授权实施。

## 主线程 inline 自检

- 检查占位符、内部一致性、范围、歧义与 Requirement 可测性；每条有 SHALL 和命名 Scenario。
- 用一次性只读 Python 检查 Scenario 编号唯一、S01—S33 连续、全部进入验收矩阵及相对链接有效，exit 0。
- 初稿提交前明确 task_roles 的单点位置、并发投影字段对应关系、修复重新进入点与未提交检查点不得解锁的规则；这些内容已包含在独立审查基线内。
- 文档设计包含组内/组外、成员/验证票、状态/Git/日志三类边界，不将临时失败、待验提交或检查点当作通过。

## 独立审查回报与处置

**原结论：Approved。** 未发现会导致实施计划出错的严重缺口，可进入 writing-plans。

| 维度 | 审查结果 |
|---|---|
| 完整性与可测性 | 23 条 Requirement 均有命名 Scenario，S01—S33 全部进入矩阵；五组模型冒烟仍逐 Scenario 对账，不以组数替代覆盖 |
| 状态与恢复 | 组内待验消费、全部外部前置、顺序约束、blocked 修复、组外出口闭合；完成原子更新与进度提交分离，未提交检查点不能解锁 |
| 排他与格式 | 同一 common-dir 特性锁；并发字段同次更新投影；v2 JSON 子集、未知协议拒绝、v1/单文件读取边界明确 |
| 外部一致性与范围 | 七项部分取代匹配旧 Requirement 主名；相关 active 条款与 ADR-0001/0002/0005/0006/0007/0008 无未声明冲突；本项没有隐藏实施周期或明显投机抽象 |

主线程接受结论，无问题需要否决或修复。审查后只追加本记录和审查状态说明，不改变候选行为合同。

## 实际验证与边界

初稿提交 `9a8bd71` 的 pre-commit 已实际运行并成功返回（提交命令 exit 0）：

- `node scripts/check-plugin.mjs --codex-validate`：插件包检查与官方 Codex CLI 安装检查通过。
- `node scripts/validate-skills.mjs`：14 个 skill 校验通过。
- `node scripts/check-openai-sync.mjs`：14 个 skill 元数据同步检查通过。
- `git diff --cached --check`：通过。

主线程另外运行 `node guardrail/check-spec-drift.mjs --staged` 与文档自检；命令通过不构成集成组的产品验证。文档提交使用 `SKIP_RELEASE_HOOK=1`，没有自动发版、push 或实施 worktree。

独立审查未执行代码、CLI、真实模型或恢复演练，未重搜生态或全量重做实现探索。结论仅表示可编写实施计划，**不是实现完成，也不是 33 个 Scenario 已通过**。plan-state 等新增入口尚未实现，模型与运行验收均 not_run。
