---
description: Explicit triage entry - judge commitment / task type / design space and route to the right lane (quick-fix / requirement-analysis / exploring / report lane); advisory only, zero files written / 显式分诊入口——判定承诺状态/任务类型/设计空间，把需求路由到正确通道（quick-fix / requirement-analysis / exploring / 报告通道）；判定仅为建议、全程零落盘
---

# 需求分诊（Triage）

把用户的一个需求判定到正确的处理通道。本命令是**可选的显式入口**：不调用它时，各 skill 的入口自检照常自动兜底；用户已点名某个 skill 的请求也不必经过本命令——显式调用优先级最高。

## 输入

- `$ARGUMENTS` 非空 → 直接对其分析；
- 为空 → 先问一句"要分诊什么需求"，得到答复后再判定。

## 判定（四维度）

**判据的权威定义在各 SKILL.md，本命令只列维度与指向、不复制判据细节**——判据在各 skill 中演进时，本命令无需同步修改。

1. **承诺状态**：还没决定要不要做（探索性措辞、无交付承诺）→ **exploring**（分界判据见 exploring 的 SKILL.md）
2. **任务类型**：已承诺交付、但交付物不是代码变更（调研报告、方案对比、日志分析等）→ **报告通道**（权威定义与落盘约定见 requirement-analysis SKILL.md 阶段 1 的任务类型检查）
3. **设计空间**：已承诺的开发任务——明显是无设计空间的小修 → **quick-fix**（判据见其入口分诊自检）；明显有设计空间（新功能、行为变更、技术选型落地）→ **requirement-analysis**
4. **大小拿不准**：已承诺的开发请求、无法从措辞判定大小/设计空间 → 默认建议 **quick-fix 起步**——升级便宜、降级浪费，其步骤 2.5 的证据式升级门（含上下文交接）是安全网

## 输出（语义模板，以对话语言表达）

呈现分诊结果并等待用户确认：

- **判定**：对需求的一句话定性（承诺状态 / 任务类型 / 设计空间）；
- **建议路线**：推荐的通道放首位并说明理由；
- **判定依据**：命中了哪个维度、为什么；
- **四出口确认**：quick-fix / requirement-analysis / exploring / 报告通道，用户可改选任意出口；
- **拿不准时**：说明拿不准的原因，列出两个候选出口供用户挑选，不硬判单一路线。

## 路由（用户确认后）

- **quick-fix / requirement-analysis / exploring** → 调用对应 skill，把**请求原文 + 分诊依据**作为其输入传递；
- **报告通道** → 按 requirement-analysis 阶段 1 任务类型检查定义的约定执行，传递同等上下文。

本命令全程**不落盘任何文件**，判定只存在于对话中；用户改选出口时照选，不坚持原判定。

## Codex 说明

Codex 端 `commands/` 不随插件加载、本命令不可见：同等分诊行为由各 SKILL.md 的入口自检兜底 + 插件 defaultPrompt 提示词引导承载。
