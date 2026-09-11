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

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走下面的手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/<分支名> -b <分支名>` 并切换到该目录（分支名对齐计划，如 `plan/YYYY-MM-DD-NN-<feature>`）。

**步骤 3：安装依赖并验证基线**

先读取项目声明的工具/命令、锁文件和已有环境；已就绪不强制重装。缺依赖时使用项目实际安装或构建命令，不仅因 package.json/pyproject.toml 存在就指定 npm/Poetry；存在冲突先核实，无法确定报告缺口。
然后按计划头部「相关测试范围」运行基线验证：有声明 → 只跑声明范围（声明为空 → 跳过测试并注明，
最终任务全量验证照跑；声明命令执行报错或工具不可用 → 回退运行完整测试套件，并注明声明已失效、
建议修订计划）；计划无该节（旧版计划）→ 运行完整测试套件，行为与现状一致。
基线测试失败 → 停下报告，先问再继续。

将已验证的实际基线 SHA 写入 T00.commit，保存 T00 completed 检查点；步骤 2 跳过不意味着 T00 无需落盘。状态写入采用同目录临时文件 + rename，保留原 tasks/notes/resources；状态提交独立于它引用的实际基线提交。
````

降级：非 git 仓库、或沙箱拒绝创建 → 在执行记录中注明"未隔离"及原因，原地继续任务 1。

## 任务结构

````markdown
### 任务 N：[组件名]

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

```python
def parse_page(value):
    if value <= 0:
        return {"error": "invalid-page"}
    return {"page": value}
```

**步骤 4：运行测试确认通过**

运行：`pytest tests/test_pagination.py::test_rejects_nonpositive_page -v`
预期：PASS

**步骤 5：提交**

```bash
git add tests/test_pagination.py app/pagination.py
git commit -m "feat(TN): add specific feature"
```
````
