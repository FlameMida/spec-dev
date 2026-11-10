# Spec 落盘与生命周期

> 阅读时机：设计获批后、写 spec 文件之前；要启用漂移守卫或涉及取代旧 spec 时。

## 落盘

- **特性目录**：`.spec-dev/YYYY-MM-DD-NN-<feature>/`，所有产物统一收在项目根的 `.spec-dev/` 下。NN 是当日两位序号：扫描当日已有的日期前缀产物（特性目录，以及 `reports/`、`roadmaps/` 下的文件名）取最大加一，从 01 起步；落盘前重扫一次，发现同号已被占用就顺延。feature 取需求主题的短语义名。存量的旧命名目录不改名（grandfather）。
- **文件**：把批准的设计写入 `spec/<feature>-design.md`，结构按 [spec 模板](../assets/spec-template.md)。后续的计划放在同一特性目录的 `plan/` 下。用户对位置有偏好时以用户为准。
- **行为需求**用 Requirement 加 Scenario 表达，它们是后续测试和验收的直接来源；修改既有功能时改用差量三节。
- **共享术语**：本次获批的跨特性术语按 [context-reuse.md](context-reuse.md) 与 spec 同次保存；没有就不创建空词汇表。
- **ADR**：满足三条件的决策按 [跨技能文档规范](document-conventions.md) 另存为 ADR，spec 里留一行摘要和链接。
- **roadmap**：本特性是某个 roadmap 的子项目时，把特性目录回填到对应行，状态置为 `in-progress`。
- **提交**：只提交本次实际写入的文件；非 git 仓库跳过并告诉用户。

## 默认：一次性契约

spec 默认不带 frontmatter。它是本次变更的契约：实施期间是判断跑偏的参照，交付后冻结成历史，不要求持续维护成"现行文档"。长期有效的行为由以 Scenario 命名的测试守护。没有 frontmatter 的 spec 不参与漂移守卫。

## 可选：启用漂移守卫

用户要求这块代码以后的改动必须同步 spec，且项目装了守卫时，按模板加上 frontmatter 并填 `covers`。此时按下表管理状态：

| 时点 | 本 spec | 受影响的旧 spec |
|---|---|---|
| 设计获批并落盘 | `draft` | 不动 |
| 实施期间（特性分支） | 保持 `draft` | 特性分支的第一次提交处理，见下 |
| 交付 | 交付提交里翻 `active` | 暂时改回 draft 的一并翻回 `active` |
| 计划被放弃 | 保持 `draft` 或删除 | 特性分支上的改动随分支丢弃 |

守卫只对 `active` 生效，所以实施期间的任务提交不会被拦；这些状态改动都在特性分支上，主分支在合并前保持原样。

特性分支的第一次提交这样处理旧 spec：

- **完全取代**：旧 spec 置为 `superseded`，同一提交填 `superseded_by` 指向本 spec；本 spec 的 `covers` 要接管旧 spec 里仍然存在的路径。
- **部分取代或直接修订**：旧 spec 暂时改回 `draft`，在每条被取代的 Requirement 标题下加标注 `> **Superseded (YYYY-MM-DD)** — by <本 spec 的仓库根相对路径>；原文保留仅作历史参考。`
- **分面共存**（同一批文件的不同行为切面，互不冲突）：不动旧 spec，各自声明 covers。

取代关系在设计时判断，写进 spec 的「关键决策」和 frontmatter 的 `supersedes`。`superseded` 是终态，不是绕过守卫的手段：读到 superseded 的 spec 要沿 `superseded_by` 找后继，指针缺失或成环时报告，不猜现行契约。特性被整体删除且没有新行为承接时，写一份只含 REMOVED Requirements 的轻量 spec 作为后继。
