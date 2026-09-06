# 验收报告：公共测试落点与红绿纪律

2026-09-06T19:31:05+08:00；executing-plans 收尾触发，standard。

Spec：`../spec/tdd-seam-design.md`，active；原 portability 条款已按 Requirement 级回写部分取代；实际合并与清理证据见 delivery.json。原始 base：`1fd4981a7fd2e99ecd47c92ac869469028abd234`。

## Overview

| Check | Result | Evidence |
|---|---|---|
| 24 Scenario 静态规则 | 24 STATIC_MATCH | eval-review.md |
| Node 全量 | 91/91 PASS，0 fail/skip | final-check-0.log、final-checks.json |
| 技能/插件/元数据/计划结构 | PASS | final-checks.json、checks.json |
| PR 真实模型 | 5/5 核心检查 PASS；S07 可写动作 PASS | check-items.json、model-*-audit.json |
| 独立代码审查 | 2 项中严重性发现均修复并复审；无遗留 | review-findings.json、review-resolution.md |
| nightly 全24多轮模型 | unverified，非阻塞 | 本轮未执行 |

实际模型均为 `glm-5.3-flash`（请求别名 haiku）；候选加载依据是插件绝对路径、角色原文及哈希，不凭版本号。

## Requirement Coverage

| Scenario | Dimension | Status | Evidence |
|---|---|---|---|
| S01 复用一个公共接口覆盖多个行为 | integration | STATIC_MATCH | eval-review.md#s01；对应入口/输入/预期及行号 |
| S02 并发消费者无需读取前票正文 | integration | STATIC_MATCH | eval-review.md#s02；对应入口/输入/预期及行号 |
| S03 显式声明直接开工 | integration | STATIC_MATCH | eval-review.md#s03；对应入口/输入/预期及行号 |
| S04 存量接口唯一提取 | integration | STATIC_MATCH | eval-review.md#s04；对应入口/输入/预期及行号 |
| S05 即兴修复并入原确认环节 | integration | STATIC_MATCH | eval-review.md#s05；对应入口/输入/预期及行号 |
| S06 spec 与计划冲突 | integration | STATIC_MATCH | eval-review.md#s06；对应入口/输入/预期及行号 |
| S07 implementer 不越权修正 | integration | STATIC_MATCH | eval-review.md#s07；对应入口/输入/预期及行号 |
| S08 拒绝同构自证 | integration | STATIC_MATCH | eval-review.md#s08；对应入口/输入/预期及行号 |
| S09 重构后脆弱测试失败 | integration | STATIC_MATCH | eval-review.md#s09；对应入口/输入/预期及行号 |
| S10 数据库测试边界对照 | integration | STATIC_MATCH | eval-review.md#s10；对应入口/输入/预期及行号 |
| S11 有 typecheck 命令 | integration | STATIC_MATCH | eval-review.md#s11；对应入口/输入/预期及行号 |
| S12 无适用命令 | integration | STATIC_MATCH | eval-review.md#s12；对应入口/输入/预期及行号 |
| S13 编译失败不充当红证据 | integration | STATIC_MATCH | eval-review.md#s13；对应入口/输入/预期及行号 |
| S14 内部实现与外部替身对照 | integration | STATIC_MATCH | eval-review.md#s14；对应入口/输入/预期及行号 |
| S15 四类依赖与集成信心 | integration | STATIC_MATCH | eval-review.md#s15；对应入口/输入/预期及行号 |
| S16 三个私有函数不制造三份测试 | integration | STATIC_MATCH | eval-review.md#s16；对应入口/输入/预期及行号 |
| S17 绿后发现重复代码 | integration | STATIC_MATCH | eval-review.md#s17；对应入口/输入/预期及行号 |
| S18 各入口与图示一致 | integration | STATIC_MATCH | eval-review.md#s18；对应入口/输入/预期及行号 |
| S19 纯重构复用已有保护 | integration | STATIC_MATCH | eval-review.md#s19；对应入口/输入/预期及行号 |
| S20 缺少保护先刻画 | integration | STATIC_MATCH | eval-review.md#s20；对应入口/输入/预期及行号 |
| S21 并发红绿协议不被豁免 | integration | STATIC_MATCH | eval-review.md#s21；对应入口/输入/预期及行号 |
| S22 已授权纯措辞调整 | integration | STATIC_MATCH | eval-review.md#s22；对应入口/输入/预期及行号 |
| S23 技能行为不是纯文案 | integration | STATIC_MATCH | eval-review.md#s23；对应入口/输入/预期及行号 |
| S24 单点迁移及旧断言处置 | integration | STATIC_MATCH | eval-review.md#s24；对应入口/输入/预期及行号 |

## Requirement Reconciliation

13 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 SUPERSEDED / 0 ADDED-IN-FLIGHT。行为及必需验收均已完成；本地合并与资源清理由 T06 记录实际证据。

- 上游测试落点声明
- 计划中的落点传递
- 既有落点决定的直接消费
- 缺失或冲突落点的裁决
- 独立真值断言
- 公共边界内的测试位置
- 静态快检命令及节奏
- mock 准入与策略分层（改了什么：把隐含准入具体化并补四类策略）
- 公共行为覆盖检查（改了什么：替换逐函数或泛化新代码覆盖导向）
- 红绿循环与重构分离（改了什么：移除循环内重构并交收尾承接）
- 收尾纯重构的行为保护（改了什么：区分行为修复与不变行为的结构调整）
- TDD 例外统一定义（改了什么：加入纯措辞例外并明确授权复用）
- quick-fix TDD 例外清单引用（改了什么：纯文案迁入 canonical，删除自有例外复述）

## Key Findings

- B-1：默认提示的无条件红与纯重构冲突，独立反驳确认后修复；B 复审通过。
- S11：真实模型错误把最终全量前置为票内解锁条件，独立反驳确认；澄清既有时序并用未完成/已完成两种输入对照，最终审计支持修复。最初附加 Lane 推断与时序失败输出保留，不把历史回答全部包装为正确。

## Diagnosis Details

- 计划 eval 初始缺 WHEN/expected_output，逐票从批准 spec 恢复；T04 元数据遗漏原分文件入口，存量测试失败后补回。
- 模型两次超时与输入混入：仅调用级覆盖继承 ultracode、显式注入候选原文并隔离 stdin 后可执行；未改全局配置。
- S07 首轮绑定误读、工具拒绝及无 TAP 夹具使证据无效；r2 使用公开 ID 文件、真实 Node 测试及精确命令，绑定正确、无拒绝，主动在写实现前因 seam 缺失 blocked。
- 最终全量曾因本验收并发写日志触发工作区只读断言（90/91）；停止证据写入者后单独重跑91/91。保留 full-suite-concurrent-archive，不更改测试断言。

## Evidence Index

- `check-items.json` 与 `eval-review.md`：矩阵及逐项输入/预期。
- `review-a/b/c.json`、`critic-b.json`、`review-b-recheck.json`、`critic-s11.json`、`review-s11-recheck.json`、`completeness.json`：独立审查。
- `model-smoke/README.md`：最终模型证据与早轮失败索引。
- `model-decision-audit.json`、`model-action-audit.json`、`model-s11-final-audit.json`：独立证据审计。
- `candidate-files.json`：27 产品文件哈希。

## coverage_note

没有裁剪本特性必需矩阵。静态符合不等于真实遵循；只读探针不证明实际业务实现，S07 才额外验证写权限下的动作。S11 原输入最后回答较短，没有完整展开顺序，解锁时序由正向对照独立补证。单次冒烟不证明稳定性，nightly 24场景多轮未验证。UI、可访问性及负载不适用，未安装相关工具。代理线程上限下复用三位只读审查者，实现和修复始终由主线程完成。
