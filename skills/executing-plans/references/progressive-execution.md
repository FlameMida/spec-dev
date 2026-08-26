# 分文件计划的渐进执行与恢复

> **阅读时机**：计划目录存在 `plan/tasks/` 子目录（分文件形态）时加载；单文件计划无需读本文。

## 渐进加载纪律

- 启动只读：`index.md` + `progress.yaml`（+ 同特性目录 spec）。**不读任何 tasks/ 正文**。
- 执行 TN 时只读：`tasks/TN.md` + 导航表中 TN 依赖行的「产出接口」列。不提前读无关后继任务正文。
- 任务完成条件（全部满足才置 completed）：依赖全 completed、TDD 步骤完成、测试通过、commit 可解析、接口块与导航表一致、progress.yaml 已原子更新并随任务提交。
- 资源登记：创建计划未预登记的持久资源时**当场**写入 progress.yaml 的 resources（计划任务文件不编辑）；最终任务清理步骤遍历 resources 清单。
- 偏差处理沿用主文件三级纪律；契约级偏差冻结受影响后继（导航表依赖闭包），修订 index 接口行与相关任务文件后再继续。

## 恢复执行（resume）

检测到 `progress.yaml` 存在且有非 completed 任务时：
1. 校验一致性：worktree/分支存在、`current`/completed 各任务的 commit 可 `git cat-file -e` 解析、progress 引用的任务文件都存在。任一不成立 → 停下向用户报告不一致，不猜测继续。
2. 从下一 ready 任务（依赖全 completed 的最小编号 pending）续跑；同前只读该任务文件与依赖接口行。
3. 恢复不重跑已 completed 任务的测试（最终任务的全量验证是安全网）。

## 单文件形态的轻量恢复（对照）

单文件计划无 progress.yaml：按复选框判读——首个含未勾选步骤的任务即续跑点；勾选状态与 git log 的 `feat(TN)` 提交对照，不一致时以提交为准并报告。
