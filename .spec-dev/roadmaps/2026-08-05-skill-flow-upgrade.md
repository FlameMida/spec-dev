---
spec_dev_roadmap:
  version: 1
  project: skill-flow-upgrade
  status: active
---

# Skill 流程改进 Roadmap

## 目标

把 spec-dev 套件的分诊与收尾能力补齐：澄清纪律独立成可复用 skill、分诊默认倾向翻转为"拿不准先 quick-fix"并补升级交接、非开发任务获得报告出口、测试资源复用与台账驱动清理落入执行链路。改动面覆盖新增 2 个 + 修改 6 个文件，一半任务可独立交付，故拆分。

## 分解边界

按"交付独立性 + 引用依赖"拆：①是被②引用的共享件，必须先行；②是流程骨架（分诊/路由/报告出口）改造；③是执行与验收链路的资源纪律，与①②零耦合可并行。每个子项目的 spec 各自小而可审，任一子项目返工不拖累其余。

## 子项目

| # | 子项目 | 范围（一句话） | 依赖 | 状态 | 特性目录 |
|---|--------|--------------|------|------|---------|
| 1 | clarifying-skill | 新建 skills/clarifying/（grilling 式逐题澄清 + 三出口 + 可独立调用），requirement-analysis 阶段 3 与 quick-fix 步骤 3 改为引用去重 | — | delivered | .spec-dev/2026-08-05-clarifying-skill/ |
| 2 | triage-routing | 新增 commands/triage.md 薄命令（引用不复制分诊判据）；quick-fix 补升级上下文交接 + "拿不准档优先 quick-fix"默认倾向；requirement-analysis 阶段 1 加任务类型检查与报告通道出口（.spec-dev/reports/ 落盘约定） | #1 | in-progress | .spec-dev/2026-08-08-triage-routing/ |
| 3 | resource-ledger | acceptance-qa 环境检测加复用策略（能隔离才复用，无法隔离则新建兜底）；writing-plans 最终任务模板加台账清理步骤；executing-plans / quick-fix 收尾接台账；共享缓存默认保留 | — | pending | — |

## 备注

- 已裁决的全局约定：报告通道=分流出口 + 落盘约定（不独立成 skill）；台账载体=plan 最终任务清理清单动态追加（无 plan 流程对话内记账）；共享缓存（~/.cargo、pnpm store 等）默认保留，仅用户显式要求时清理；套件保持"一次一题"铁律，batch-grill 的 frontier 模式不引入。
- 保留不动：exploring skill（与 clarifying 发散/收敛互补，不合并）、HARD-GATE、TDD 铁律、spec 漂移守卫、分诊三角的双向建议式转介。
- 风险：clarifying 被两处引用，后续修改需同步检查引用方语境（见子项目①设计）。
