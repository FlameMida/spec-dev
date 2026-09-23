# Spec 生成与生命周期

> 阅读时机：完整设计获批后、生成 spec 或变更状态之前。

## 生命周期事件

| 事件 | 新 spec 状态 | 旧 spec 标注 | 下一步 |
|---|---|---|---|
| 完整设计获批并落盘 | draft | 原样保留 | 完成适用 spec 审查 |
| 定稿并取得计划编写授权 | active | 同提交写 Superseded-pending（如有） | writing-plans |
| 实施与验证中 | active | pending 保留，现行/待取代边界仍可见 | 按获批计划推进 |
| 真实交付完全取代 | active | 旧 spec superseded，superseded_by 指向后继 | 接管仍存在的 covers，旧 sync_commit 冻结 |
| 真实交付部分取代 | active | 只标被取代的 Requirement；旧 spec 仍 active | 其余契约继续有效 |
| 废弃未交付计划 | 按裁决记录 | 回收本次 pending | 保留已有历史与裁决 |

Superseded-pending 只是正文标注，不是 status 状态枚举。激活发生在计划交接，取代回写随真实交付生效；读到 superseded 必须沿 superseded_by 找可达后继，缺失或成环不能猜当前契约。完整标注形制沿 spec 模板，不在表中另造格式。

## 阶段 6: 写 spec 并提交

- 为本需求创建特性目录 `.spec-dev/YYYY-MM-DD-NN-<feature>/`（所有 spec-dev 产物统一收纳在项目根目录 `.spec-dev/` 下；NN 为当日两位序号——扫描 `.spec-dev/` 下当日已有的日期前缀产物（特性目录，及 `reports/`、`roadmaps/` 下的文件名）取最大加一、01 起步，**落盘前重扫一次防并发撞号**：发现同号已被占则顺延并同步修正自引路径；feature 取需求主题的短语义名，跟随项目语言；存量旧命名 `YYYY-MM-DD-<feature>` 目录不改名（grandfather）；同一 NN 序列由全部 `.spec-dev/` 日期前缀产物共用），将批准的设计写入其 `spec/<feature>-design.md`（用户对 spec 位置的偏好优先于此默认值）
- 按 [context-reuse.md](context-reuse.md) 将本次获批共享术语与 spec 同次保存和范围提交；无共享术语不创建空 glossary，特性局部术语只留 spec。
- spec 与后续 writing-plans 的计划（同目录 `plan/` 分文件形态：index.md + tasks/ + progress.yaml）共用这一个特性目录——一个需求的全部产物收纳在一处
- **决策分流（ADR）**：按 [跨技能文档规范](document-conventions.md) 的三条件、统一编号和生命周期处理；满足条件时在实际写入前读取全文，缺一不建。
- **取代分流（supersede triage）**：对阶段 2 探索命中的每份行为相交 active spec 做三分类判定并写入 spec——**完全取代**（新 spec 整体替换旧特性）与**部分取代**（替换旧 spec 的部分 Requirement）登记进 frontmatter `supersedes`（仓库根相对路径）与正文「取代与共存」节（部分取代必须列出被取代的具体 Requirement 标题清单，每条附一句取代理由）；**分面共存**（同文件不同行为切面、无冲突）不登记 supersedes，记一行判定理由并各自声明 covers。节模板与标注形制见 [spec-template.md](../assets/spec-template.md)。用户要求删除整个特性且无新行为承接时，产出仅含 REMOVED Requirements 的轻量 spec 作为后继（记录删除理由，交付时按完全取代回写旧 spec）。spec 的取代回写随交付生效（executing-plans 最终任务），与 ADR 的即时回写构成双轨
- 结构参考 [spec-template.md](../assets/spec-template.md)，按需增删节；**行为需求必须用 Requirement + Scenario 结构表达**（`### Requirement:` 一条一个 SHALL 且可观察，`#### Scenario:` 用 GIVEN/WHEN/THEN——它们是后续 TDD 测试与验收的直接锚点）；修改既有功能时行为部分改用差量三节（ADDED/MODIFIED/REMOVED Requirements，见模板）
- **漂移守卫锚点（必填）**：落盘时保留模板顶部的 `spec_dev` frontmatter，填写 `feature` 与 `covers`（本特性拥有的代码路径 glob；纯文档特性留空数组 `[]`）——此阶段 `status` 保持 `draft`。该 frontmatter 是 pre-commit / CI 漂移守卫的锚点，缺失或永停 draft 意味着该特性代码不受"改了代码却没同步 spec"的拦截保护
- 新建/本次更新胶囊指针时使用一句用途/适用边界摘要 + 精确来源路径；摘要不能替代续接读取原文，旧胶囊没有摘要仍正常读，不全库回填。
- **roadmap 回填（仅当本特性是某 active roadmap 的子项目）**：把特性目录路径回填至 roadmap 对应子项目行、状态置 `in-progress`；不属于任何 roadmap 则无此步
- git commit 该 spec、本次按获批设计更新的 glossary、新增 ADR 与 roadmap 回填（仅本次实际修改的这些文件；非 git 仓库则跳过并向用户说明）


## 阶段 8: 交接 writing-plans

- **前置确认**：须持有用户对「开始编写实施计划」的明确同意——阶段 7 的确认话术已包含此询问；用户仅认可 spec、未表态是否继续时，先问「现在开始编写实施计划吗？」，同意后才交接
- **激活漂移守卫**：交接前把 spec frontmatter 的 `status: draft` 翻为 `active` 并 commit（仅 `active` 参与漂移拦截——不翻转则守卫对本特性静默失效）
- **打取代预告（仅当 spec 的 `supersedes` 非空）**：翻 active 的同一提交内，向每份被指向的旧 spec H1 标题下写入 Superseded-pending 标注（形制见 spec-template「取代标注形制」节；部分取代写明将被取代的 Requirement 标题）——窗口期的双 active 状态由此对全部消费方显式可判定；后续该计划若被废弃，由 executing-plans 意图级偏差收尾回收此标注
- 调用 writing-plans skill，基于已批准的 spec 生成实施计划
- **不得调用任何其他 skill**——writing-plans 是本流程唯一的下一步；实施纪律（worktree 隔离、TDD、审查编排）由 writing-plans → executing-plans 链路承接

---
