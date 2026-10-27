# 任务 0：建立隔离工作区（每份计划固定生成）

> 阅读时机：生成 T00、普通行为或纯重构任务前。

## 任务 0：建立隔离工作区（每份计划固定生成）

导航表首行为任务 0，固定生成 `tasks/T00.md`——与结尾的最终任务（合并与清理）首尾对称，隔离工作区的生命周期在计划目录内闭合、脱离本插件也能按序执行；有 using-git-worktrees skill 或原生工具的环境按其完整纪律执行（已隔离检测、目录选择、沙箱降级都定义在该 skill）：

````markdown
### 任务 0：建立隔离工作区

**步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，只跳过步骤 2 的创建，仍执行下面的绑定、步骤 3 与完成状态保存。

在创建前记录实际来源工作区绝对路径、来源分支与 HEAD；创建后记录实际实施工作区与分支。复用时从原隔离机制的记录核对来源，不能由 common-dir 推算来源工作区、假定来源为 main 或把复用资源改为本计划所有。用现有 append-only `notes` 保存这些真实值、created/inherited 归属及移交方式；`resources` 中复用行写保留/移交回执，不能预填删除命令。无法核实的来源明确记未知，不能据此生成合并命令。

**步骤 2：建立 worktree**

先按 using-git-worktrees 核对执行能力与实际管理方式；优先可用的宿主原生 worktree 入口，入口不可用或创建失败且允许安全降级时自动使用 Git：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/<分支名> -b <分支名>` 并切换到该目录（分支名对齐计划，如 `plan/YYYY-MM-DD-NN-<feature>`）。

在现有 notes/resources 中记录宿主原生或 Git 管理、实际根/分支及恢复入口。一次 Bash 的 cd 不证明会话或其他文件工具已切换；首次绑定前核对实际工具 cwd。Git 降级后的普通会话不因恢复而无条件 EnterWorktree 接管，已有原生隔离会话也不自动移出。

**步骤 3：安装依赖并验证基线**

先读取项目声明的工具/命令、锁文件和已有环境；已就绪不强制重装。缺依赖时使用项目实际安装或构建命令，不仅因 package.json/pyproject.toml 存在就指定 npm/Poetry；存在冲突先核实，无法确定报告缺口。
然后按计划头部「相关测试范围」运行基线验证：有声明 → 只跑声明范围（声明为空 → 跳过测试并注明；
声明命令执行报错或工具不可用 → 改跑本特性自有测试文件——声明节列出的新增/修改测试，尚不存在则跳过——
并注明声明已失效、建议修订计划，**不回退完整测试套件**：完整套件在独立 final 验证票 F 首次执行，后续改动按影响补验）；
计划无该节（旧版计划）→ 跑该计划任务文件中出现的测试文件，同样不跑完整套件。
基线测试失败 → 停下报告，先问再继续。

将已验证的实际基线 SHA 写入 T00.commit，保存 T00 completed 检查点；步骤 2 跳过不意味着 T00 无需落盘。状态写入采用同目录临时文件 + rename，保留原 tasks/notes/resources；状态提交独立于它引用的实际基线提交。
````

降级：非 Git 仓库或无法创建隔离时，注明真实限制；仅在用户/计划已允许未隔离执行时原地继续。隔离为明确约束时停止依赖它的写入，不自动改到来源工作区实施。原生入口失败后仍保留获准的 Git worktree 自动降级。

## 任务结构

按文件/符号定位改动，写清接口、行为与验证；新增文件也不必预写全文。以下短代码仅演示有效业务红，实际任务可用具体输入、动作与断言描述；片段是否需要见 SKILL.md「计划体量」。

````markdown
### 任务 N：[可独立验证的交付行为或重构目标]

**交付与验证**：[本票完成后可观察的结果；对应 Requirement/Scenario 与获批 seam 来源。]

**文件**：
- 创建：`exact/path/to/file.py`
- 修改：`exact/path/to/existing.py:123-145`
- 测试：`tests/exact/path/to/test.py`

**接口**：
- 消费：[本任务使用的前序任务产物——精确签名]
- 产出：[后续任务将依赖的——精确函数名、参数与返回类型。
  任务执行者只看得到自己的任务；此块是他们了解相邻任务所用名称与类型的唯一途径。]

**步骤 1：写失败测试**

以下示例以前置模块 `app.pagination.parse_page` 已存在并返回 `{"page": value}` 为基线；实际计划填写真实公共接口和文件。先确认测试可运行，不为制造红提前实现目标校验。

```python
from app.pagination import parse_page

def test_rejects_nonpositive_page():
    assert parse_page(0) == {"error": "invalid-page"}
```

**步骤 2：运行测试确认失败**

运行：`pytest tests/test_pagination.py::test_rejects_nonpositive_page -v`
预期：测试已经运行到目标业务断言，FAIL 为 AssertionError：实际返回 {"page": 0}，期望 {"error": "invalid-page"}。NameError、导入/编译失败、环境缺件、零测试或 SKIP 只表示测试尚不能验证该行为，不算有效红。

**步骤 3：写最小实现**

修改 `app.pagination.parse_page(value)`：在现有返回之前拒绝 `value <= 0`，返回 `{"error": "invalid-page"}`；有效页码保持 `{"page": value}`。无需在计划中展开完整函数体。

**步骤 4：运行测试确认通过**

运行：`pytest tests/test_pagination.py::test_rejects_nonpositive_page -v`
预期：PASS

**步骤 5：提交**

```bash
git add tests/test_pagination.py app/pagination.py
git commit -m "feat(TN): add specific feature"
```
````

接口块同时写清本票为何需要这些前置、公共契约的来源及实际需要的错误/状态语义；无需重抄 spec 全文。不消费相邻票产物时不因编号相邻增加依赖。

任务模板的写入前置：按 [计划格式](plan-format.md#绑定与激活唯一定义点) 写全获批范围、静态版本、状态 checkpoint 与实际 bind/inspect 命令；共用协议集中到 index，本票以明确节名指针和实参调用，本票特有步骤就地展开。代码提交完成后先 clear 本地引用，再保存 completed 与既存实现 SHA、单独提交状态。行为变更同步 spec；TDD 例外只沿已有授权和 test-driven-development 单点清单处理。无 Git 的旧流程不得伪造新绑定。
