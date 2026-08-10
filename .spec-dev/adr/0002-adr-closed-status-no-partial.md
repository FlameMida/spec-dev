# ADR-0002: ADR 封闭三态与禁止部分推翻

**Status**: Accepted (2026-08-10)

## 背景

为 ADR 引入状态机制时需要定枚举与推翻粒度。业界（Nygard/MADR/adr-tools）保留开放枚举与"部分推翻"关系行（`Partially obsoleted by`），因为人写文档贵、重述成本高。

## 决定

状态为**封闭三态**：`Accepted (日期)` / `Deprecated (日期) — 原因（强制）` / `Superseded by ADR-NNNN (日期)`（编号强制）。**禁止部分推翻**：要推翻一条 ADR 的任何部分，新 ADR 必须完整重述仍然有效的结论并整体取代旧 ADR。判据一句话：有替代决策用 Superseded，无替代者（决策语境消失）用 Deprecated。Accepted 后正文不可变（仅 status 行、错别字、坏链可改）。

## 理由

封闭枚举才可被审查机器校验（mdbook-lint ADR007/ADR010 教训）；spec-dev 的 ADR 由 AI 撰写，完整重述成本趋零，而"部分推翻后哪部分还有效"的读取歧义由后续每一次 AI 消费承担——成本结构与人类团队相反，故与业界惯例反向选择。被否方案：`Partially superseded by` 关系行 + scope 注记——被读取歧义成本否决；`Proposed`/`Rejected` 态——ADR 在方案裁决后才落盘，二者是死枚举值。

