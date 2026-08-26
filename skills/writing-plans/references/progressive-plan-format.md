# 分文件计划形态（阈值门控）

> **阅读时机**：预估任务数 >8 或计划正文预估 >25KB 时加载并采用本形态；低于阈值维持单文件形态、无需读本文。

## 结构

```
.spec-dev/<特性目录>/plan/
├── index.md        # 头部 + 全局约束 + 相关测试范围 + 设计原则块 + 任务导航表；不复制任务正文
├── tasks/T01.md …  # 每任务一文件，正文结构与单文件形态的任务模板逐字一致（文件块/接口块/TDD 五步）
└── progress.yaml   # 唯一运行时状态；本形态不使用复选框跟踪（index 与 tasks 内的复选框仅为模板残留时须删除）
```

## index.md 任务导航表（机器可校验的调度依据）

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T01 <名称> | — | — | `funcA(x: string): Y` |
| T02 <名称> | T01 | `funcA` | `TypeB` |

规则：任务 ID 形如 `T\d\d` 全局唯一且与 tasks/ 文件名一一对应；依赖只引用表内 ID；禁止环；接口列写精确签名（执行者只读自己的任务文件 + 依赖行的产出接口，不读其它任务正文）。

## progress.yaml 键结构

```yaml
format_version: 1
current: T03            # 当前指针（null=未开始）
tasks:
  T01: { status: completed, commit: <sha>, tests: pass }
  T02: { status: completed, commit: <sha>, tests: pass, deviations: ["路径笔误就地修正"] }
  T03: { status: in_progress }
resources:              # 资源台账（本形态唯一登记处；最终任务清理步骤遍历此清单）
  - "worktree: .worktrees/<分支> —— git worktree remove …"
notes: []               # 偏差与备注，append-only
```

状态枚举：pending | in_progress | completed | blocked。写入纪律：每任务完成后原子更新（整文件重写）并随任务提交；worktree 合并不携带本文件冲突——它是执行档案，最终任务把它随特性目录归档。

## 生成规则（writing-plans 侧）

1. 阈值判定：分解出任务清单后统计——任务数 >8 或按单文件预估正文 >25KB → 本形态。
2. index.md 头部 = 单文件形态的计划文档头部（含设计原则块）+「全局约束」+「相关测试范围」+ 导航表；任务 0 与最终任务同样是 tasks/ 下的文件（T00、以及最大号）。
3. 生成后运行 `node scripts/validate-output.mjs plan-index <plan目录>`（结构校验：文件↔导航表一致、依赖存在、无环），失败不得交付执行。
4. Self-Review 三查对本形态逐任务文件执行，另加第 4 查：导航表接口列与任务文件接口块逐条一致。
5. 资源预登记：生成 progress.yaml 时把已知持久资源（worktree 必有行、以及任务步骤将创建的容器/测试库/临时目录/后台服务）写入初始 `resources` 键——最终任务模板内嵌的复选框台账在本形态不出现，清理步骤遍历 resources 清单；执行期新增资源由 executing-plans 当场追加（见 progressive-execution.md 渐进加载纪律）。
