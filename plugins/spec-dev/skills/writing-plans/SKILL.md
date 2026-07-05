---
name: writing-plans
description: 编写实施计划——当已有 spec 或明确需求、准备开始多步骤开发任务、但尚未动代码时使用。把设计拆解为零上下文工程师也能执行的 bite-sized 任务（精确文件路径、完整代码、TDD 步骤、预期输出），落盘特性目录的 plan/ 子目录并交接 executing-plans 执行。通常由 requirement-analysis 在 spec 获批后调用；也可对既有 spec/需求单独触发。
---

# 编写实施计划

## 概述

假设执行计划的工程师**对我们的代码库零上下文、且品味存疑**：技术过硬，但几乎不了解我们的工具链和问题域，也未必懂好的测试设计。把他们需要知道的一切写进计划——每个任务动哪些文件、完整代码、怎么测试、参考哪些文档。DRY、YAGNI、TDD、频繁提交。

**开始时声明**：「我正在使用 writing-plans skill 编写实施计划。」

**计划保存至**：spec 所在特性目录的 `plan/<feature-name>-plan.md`（即 `docs/YYYY-MM-DD-<feature-name>/plan/<feature-name>-plan.md`，特性目录由 requirement-analysis 在写 spec 时创建）；无 spec 输入的独立触发则自建特性目录。用户对计划位置的偏好优先于此默认值。

**上下文**：编写计划阶段不建工作区——隔离以固定的「任务 0」写入每份计划，执行时才运行（见下方"任务 0"）。

## 范围检查

若 spec 覆盖多个独立子系统，本应在需求设计阶段就拆成子项目 spec；若没拆，建议按子系统拆成多份计划——每份计划独立产出可运行、可测试的软件。

## 文件结构先行

定义任务前，先画出将创建/修改的文件清单及各自职责——分解决策在这里锁定：

- 单元边界清晰、接口明确，每个文件一个职责
- 你对能一次装进上下文的代码推理得最好，文件聚焦时编辑也更可靠——偏向小而聚焦的文件
- 一起变化的代码放在一起：按职责拆分，不按技术分层拆分
- 既有代码库跟随既有模式；正在改的文件已经臃肿时，把拆分纳入计划是合理的，但不做无关重构

该结构决定任务分解：每个任务产出自包含、独立可理解的变更。

## 任务的粒度

**任务**是携带独立测试周期、值得一次独立审查的最小单元。划界时：把配置、脚手架、文档步骤折叠进需要它们的任务；只在"审查者可能拒绝一个任务而通过相邻任务"处切分。每个任务以一个可独立验证的交付物收尾。

**步骤**是一个动作（2-5 分钟）：

- 「写失败测试」——一步
- 「运行确认失败」——一步
- 「写最小实现」——一步
- 「运行确认通过」——一步
- 「提交」——一步

TDD 循环的完整纪律遵循 test-driven-development skill——计划里的每个任务显式内嵌上述五步。

**Scenario 直译为测试**：spec 行为规范里的每个 `#### Scenario:` 至少翻译成一个失败测试，映射固定：GIVEN→arrange（构造前置状态）、WHEN→act（触发动作）、THEN→assert（断言可观察结果）；测试名沿用 Scenario 名。规范到测试零翻译损耗——不要自己另编测试场景后把 Scenario 丢在一边。

## 计划文档头部

**每份计划必须以此头部开始**：

```markdown
# [功能名] 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行。步骤用复选框（`- [ ]`）语法跟踪。

**目标**：[一句话说明构建什么]

**Spec**：[对应 spec 文件路径]

**架构**：[2-3 句方案概述]

**技术栈**：[关键技术/库]

## 全局约束

[spec 的项目级要求——版本下限、依赖限制、命名与文案规则、平台要求——
每条一行，数值从 spec 逐字复制。每个任务的要求都隐含本节。]

---
```

## 任务 0：建立隔离工作区（每份计划固定生成）

头部之后、任务 1 之前，固定写入以下任务 0——计划文档因此自包含，脱离本插件也能按序执行；有 using-git-worktrees skill 或原生工具的环境按其完整纪律执行（已隔离检测、目录选择、沙箱降级都定义在该 skill）：

````markdown
### 任务 0：建立隔离工作区

- [ ] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [ ] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/<分支名> -b <分支名>` 并切换到该目录（分支名对齐计划，如 `plan/YYYY-MM-DD-<feature>`）。

- [ ] **步骤 3：安装依赖并验证基线**

按项目类型安装依赖（npm install / cargo build / pip install -r requirements.txt / go mod download），
运行测试套件确认基线全绿。基线测试失败 → 停下报告，先问再继续。
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

- [ ] **步骤 1：写失败测试**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pytest tests/path/test.py::test_name -v`
预期：FAIL，报 "function not defined"

- [ ] **步骤 3：写最小实现**

```python
def function(input):
    return expected
```

- [ ] **步骤 4：运行测试确认通过**

运行：`pytest tests/path/test.py::test_name -v`
预期：PASS

- [ ] **步骤 5：提交**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

**UI 功能的任务**：在验收步骤注明「由 executing-plans 收尾阶段触发 browser-qa 验收」，并写明验收点（页面、交互、预期状态）。

## 禁止占位符

每一步必须包含工程师需要的实际内容。以下是**计划失败**，绝不允许出现：

- "TBD"、"TODO"、"稍后实现"、"补充细节"
- "添加适当的错误处理" / "添加校验" / "处理边缘情况"
- "为上述代码写测试"（没有实际测试代码）
- "类似任务 N"（把代码重复写出来——工程师可能乱序阅读任务）
- 只说做什么不给怎么做的步骤（涉及代码的步骤必须有代码块）
- 引用任何任务中都未定义的类型、函数、方法

## 牢记

- 永远给精确文件路径
- 每步给完整代码——改代码的步骤必须展示代码
- 精确命令 + 预期输出
- DRY、YAGNI、TDD、频繁提交

## Self-Review

写完整份计划后，以新鲜眼光对照 spec 检查（自己跑清单，不派子代理）：

1. **Spec 覆盖**：逐条 Requirement 过——能指到实现它的任务吗？每个 Scenario 都有对应的失败测试步骤吗（GIVEN/WHEN/THEN → arrange/act/assert）？差量三节的 MODIFIED/REMOVED 有对应的改造/清理任务吗？列出缺口
2. **占位符扫描**：按"禁止占位符"清单搜索计划全文，发现即修
3. **类型一致性**：后续任务用到的类型、方法签名、属性名与前序任务定义一致吗？任务 3 叫 `clearLayers()`、任务 7 叫 `clearFullLayers()` 就是 bug

发现问题就地修复，无需复审；发现 spec 需求没有对应任务就补任务。

## 执行交接

保存计划后向用户交接：

> 「计划已完成并保存至 `docs/<特性目录>/plan/<feature>-plan.md`。执行时我会用 executing-plans 从任务 0（隔离工作区）开始逐任务执行（TDD + 每任务提交 + 收尾多维审查）。
>
> 现在开始执行，还是先 review 计划？」

用户确认执行后调用 executing-plans skill；用户要改计划则修订后重跑 Self-Review。

## Red Flags

- 步骤里出现"适当的""必要的""类似的" → 写出具体内容
- 计划缺任务 0（隔离工作区） → 按固定模板补上
- 一个任务超过 5 个实施步骤 → 任务过大，继续拆
- 测试步骤没有测试代码 → 补全
- 计划里没有一处精确文件路径 → 重写
- 想跳过 Self-Review 直接交接 → 三查跑完再交
