# Acceptance Report: portability-hygiene

> Time: 2026-09-06 | Triggered by: executing-plans 接手收尾 | Tier: standard
> Spec: ../spec/portability-hygiene-design.md（active）
> Source: `b37c3b6d8dd3bcc8d47441348641e624d2c82e95`；主线基点 `05067de`。
> Evidence dir: `evidence/`。本轮未修改实现代码；下列结论来自本次命令和独立复核。

## Overview

T09 验收通过（附既有文档预期与运行环境警告）。Node 测试 **76/76 PASS，0 fail / skipped**，12 个测试文件；visual-path、技能、openai.yaml、插件及当前 plan-index 校验全部 exit 0。真实启动/停止与跨 cwd 检查通过。Claude Code 声明行由真实客户端加载后展开，已做独立证据审计。

| Dimension | Execution | Result | Notes |
|---|---|---|---|
| unit / docs regression | D | PASS | Node 76/76；visual-path PASS |
| integration | D | PASS | 跨 cwd 新旧命令对照、Codex 路径推导、三次真实 visual 启停、全部校验 |
| integration: Claude loader | D + independent audit | PASS | 真实 Claude Code 2.1.263；模型响应为本地夹具，断言的是客户端发出的完整 skill 正文 |
| docs: eval walkthrough | static review | WARN | 38 条逐项核对：35 一致、3 条基线陈旧；本次未新增失效预期；未运行模型 eval |
| review A / B-C / completeness | independent review | PASS | 0 新增 confirmed findings；13 Requirement / 29 Scenario 均有落点 |

## Requirement Coverage

| Matrix row / check item | Dimension | Status | Evidence |
|---|---|---|---|
| 单点解析、声明行、零裸路径、双引号、gist、映射、TDD 引用、README | docs | PASS | `evidence/node-tests.json`；plugin-root 19 项 |
| 区间展开、倒序/缺号/变体拦截、存量计划 | unit | PASS | `evidence/node-tests.json`；plan-index 10 项 |
| dry-run GITIGNORE 不落盘、无参数 /tmp 不输出 GITIGNORE | unit | PASS | `evidence/integration.json` 的 visual-path-suite |
| 用户项目 cwd 下新命令成功、旧裸路径失败 | integration | PASS | `evidence/integration.json`：absolute-plugin-root exit 0；old-relative-path exit 1 且 Cannot find module；目录名含空格 |
| Codex 变量未替换时由 skill base directory 上两级推导并执行 detect-env | integration | PASS | `evidence/integration.json`：codex-base-directory-fallback exit 0 |
| Claude Code 加载后声明行为绝对路径 | integration | PASS | `evidence/claude-local-load.json` 实际请求；`claude-load-assertions.json`；`claude-evidence-audit.json` |
| 会话文件被忽略、已有 .gitignore 不覆盖、写入失败只警告 | integration | PASS | `evidence/integration.json`：三次真实 start/stop；check-ignore；只读父目录 stderr 精确匹配单行 warn |
| validate-skills / check-openai-sync / check-plugin / node --test | integration | PASS | 对应四份 JSON，全部 exit 0；Node v22.22.2 |
| living docs 零残留 | docs | PASS | `evidence/integration.json`：两条 rg 均 exit 1、零命中 |
| 五份 evals.json 人工走查 | docs | WARN (baseline only) | `evidence/evals-walkthrough.md`：38 个 ID 逐项结论 |
| 当前计划结构与历史提交恢复一致性 | integration | PASS | `evidence/plan-index.json`；T00–T08 commit 均可解析、任务文件齐全 |

## Requirement Reconciliation

**13 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 SUPERSEDED / 0 ADDED-IN-FLIGHT**（本特性 13 条 Requirement；旧 spec 的部分取代另由 T10 回写）。

| Requirement | Verdict | Evidence |
|---|---|---|
| 插件根解析序列单点定义 | DELIVERED | plugin-root + 独立文档复核 |
| 载入即声明 | DELIVERED | 四份声明断言 + Codex 真实命令 + Claude 客户端实际展开 |
| 插件根引用统一写法 | DELIVERED | 全局扫描 + 含空格用户项目 cwd 新旧命令对照 |
| 导航表依赖闭区间 | DELIVERED | plan-index 测试与存量计划实测 |
| 运行时依赖分级表 | DELIVERED | 双语 README 断言与人工核对 |
| 成熟度分区与发布纪律 | DELIVERED | 双语 README 断言与人工核对 |
| 主线程止损 | DELIVERED | 定义点断言 |
| visual 根自建 .gitignore | DELIVERED | dry-run 与三次真实服务测试 |
| 失败隔离单点化 | DELIVERED | gist / 变体断言与文档复核 |
| Codex 映射表单点化 | DELIVERED | 总表与引用断言 |
| quick-fix TDD 例外清单引用 | DELIVERED | 引用与自有例外断言 |
| visual-preview 产物归位特性目录 | DELIVERED | visual-path 与文案/归档继承核对 |
| README 漂移修正 | DELIVERED | 磁盘计数及双语断言 |

## Key Findings

- 独立正确性、文档 B/C 和 completeness 复核均无新增 confirmed 问题；既有四个 review 修正提交已包含在本轮范围。
- 3 条基线 eval 预期陈旧：`ra-clear-no-fake-questions` 路由未反映 quick-fix 建议；`ep-review-orchestration` 缺少只在有发现时征询的条件；`qf-small-bug-triggers` 仍写三条 glob（现为五条）。均对照 main 确认为既有，按 T09 约定只记录不修。
- 无孤儿测试。已取代的“悬空依赖被拦截”有 active 继承 Scenario；visual 落位/归档亦由本 spec 承接。

## Diagnosis Details

Claude 远端尝试识别到当前 worktree 插件，但连续 429，120 秒后终止（`claude-load.json`），未取得加载正文，因此该尝试不计通过。

随后以本地 HTTP 接收端接收真实 Claude 客户端请求。首次进程环境变量被用户 `settings.env` 服务地址覆盖：本地收到 0 个请求且 CLI 401；只检查了配置键名，没有读取或记录凭据值。隔离 setting sources 并显式设置进程内本地地址和 dummy key 后，接收端收到 `/v1/messages?beta=true`，CLI exit 0。未修改任何用户配置。

通过依据是请求内已经展开的 writing-plans 完整正文：声明值为当前 worktree 绝对路径，base directory 位于其 `skills/writing-plans`，校验器文件存在。独立审计逐字比对正文；本地模型响应不参与声明断言。夹具继承 stdin 导致 ARGUMENTS 附带夹具源码；审计明确分离正文和 ARGUMENTS，正文比对未受影响。后续复用夹具应传 `input=""`。

## Evidence Index

- `evidence/node-tests.json`、`validate-skills.json`、`openai-sync.json`、`check-plugin.json`、`plan-index.json`：命令、退出码、耗时、完整输出。
- `evidence/environment.json`：环境检测；未配置的浏览器/性能工具不在本 spec 适用维度内，无需安装。
- `evidence/integration.json`：跨 cwd、Codex、visual、扫描、资源清理证据。临时服务均停止，自建 `/tmp/ph-accept-*` 目录已清理。
- `evidence/claude-load.json`、`claude-local-load-first.json`：失败尝试与环境诊断；未将失败当 PASS。
- `evidence/claude-local-load.json`、`claude-load-assertions.json`：真实客户端加载请求与确定性断言。
- `evidence/review-correctness.json`、`review-docs.json`、`review-completeness.json`、`claude-evidence-audit.json`：独立复核，均通过 review-findings 契约校验。
- `evidence/evals-walkthrough.md`：38 个用例 ID 走查。

## coverage_note

未裁剪现行 spec 的验收 Scenario；无 UI、a11y、性能预算要求，因此这些维度不适用。未执行远端模型 eval，也未验证发布并重装后的缓存副本；Claude 的 PASS 仅指当前 worktree 插件的真实客户端加载机制，远端推理仍受 429 限制。

T09 原计划通过旧 8.1.0 缓存中的 acceptance-qa 命令间接验证替换，本轮改为直接加载当前 worktree 的 writing-plans 并捕获完整已展开正文，符合 spec 原 Scenario；执行性质从模型判读改为客户端确定性证据加独立审计。B/C 合并为一路独立文档审查，A 与 completeness 分别独立，职责均覆盖。

全量测试已在当前实现提交执行，后续只变更验收/进度/spec 状态记录；T10 安全网复用该次全量结果，提交前继续验证文档、契约及 Git diff，不重复相同代码测试。
