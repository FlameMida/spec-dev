# ADR-0001: 取代生效时点双轨制（spec 随交付、ADR 随裁决）

**Status**: Accepted (2026-08-10)

## 背景

引入 spec/ADR 取代生命周期机制时，"何时把旧文档翻成 superseded"存在真实备选：新 spec 获批激活时立即翻转，或交付合并时才翻转。

## 决定

双轨：**spec 的取代回写在 executing-plans 交付收尾执行**（与 sync_commit 锚定同一提交组）；**ADR 的取代回写在 requirement-analysis 阶段 6 落盘新 ADR 时立即执行**。实施窗口期以旧 spec 上的 Superseded-pending 标注显式化。

## 理由

spec 契约描述可观察行为——实施期间代码仍是旧行为，提前翻转造成守卫真空并误导并行会话（RFC/OpenSpec/RAC 三先例均在"发布/归档"时点生效）；ADR 记录的是已经用户两道门裁决的决策，决策即时生效、无实施依赖。被否方案：激活时统一翻转——被守卫真空与"旧行为失去现行描述"否决。

