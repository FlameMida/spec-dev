# Spec 模板（`.spec-dev/YYYY-MM-DD-NN-<feature>/spec/<feature>-design.md`）

> **Language / 语言**：叙述性内容跟随创建时的对话语言；结构标签（Requirement、Scenario、GIVEN、WHEN、THEN、frontmatter 键）保持英文。

> 篇幅以一页为宜。简单需求几句话加 1 到 2 条 Requirement 就够，不为凑结构而注水。

## 四个固定小节

```markdown
# [主题] 设计

## 目标与成功标准

[要解决什么问题、为什么现在做；1 到 3 句]

**成功标准**：[做到什么算完成]

## 非目标

[明确不做的事，防止范围蔓延；没有就写"无"。存在"即使功能完成也不可接受"的结果时写在这里，并落到下面的 Scenario]

## 关键决策

[澄清结论与方案选择，每条一行，带理由和来源：用户明确决定、项目既有约束，或授权范围内的代理选择。代理的默认值不能写成用户原话。]

- [决策]：[选择] —— [理由]
- [接口]：[调用方的正常用法与失败结果；签名或协议]
- [界面]：[采纳的定稿 HTML 路径与版本、适用的角色和状态、哪些结果是模拟的]

## 行为规范

### Requirement: [一句话命名一个行为]

[一条陈述、一个 SHALL。行为必须可观察：没读过代码的测试者也能判定通过与否。]

#### Scenario: [具体案例名，如"拒绝过期 token"]

- **GIVEN** [前置状态]
- **WHEN** [触发动作]
- **THEN** [可观察的结果]
```

写法要求：

- **Requirement**：系统做什么，用任何人都能检验的措辞，不写实现方式。"上传超过 10 MB 时 SHALL 显示错误横幅"可观察，"SHALL 优雅处理大文件"不可观察。一条只说一个行为，出现三个"并且"就拆成三条。MUST 和 SHALL 是硬性要求，SHOULD 允许有正当理由的例外，MAY 是真正可选；默认用 SHALL。
- **Scenario**：每条 Requirement 至少一个真正检验它的 Scenario，复述一遍需求的不算。重点覆盖边缘与错误场景（空输入、过期凭证、重复点击、并发），不只写正常路径。定稿前问自己：哪个场景坏了最难受？它要有一个命名的 Scenario。
- Scenario 的名字会直接成为测试名，起具体的名字，不写"场景 2"。
- 满足 ADR 三条件（难以逆转、缺上下文会费解、存在真实取舍）的决策另存到 `.spec-dev/adr/`，这里保留一行摘要和链接。

## 需要时才加的小节

下面的小节只在确实有内容时添加，标题自拟：术语（澄清中确定的规范名和要避免的别名）、参与者与适用行为、影响面、方案设计（架构与组件、数据流、关键接口、错误处理）、风险与边缘情况、开放问题。重大的未知项不留在开放问题里，回到澄清。

## 行为差量三节（修改既有功能时，替换「行为规范」）

改既有功能不重写全量规范，只写差量，让审查者一眼看清什么变了：

```markdown
## ADDED Requirements

[全新行为，此前不存在。格式同上]

## MODIFIED Requirements

[已存在且正在变化的行为：给出完整的新版本，标题后括注一句"改了什么"]

## REMOVED Requirements

[移除的行为：Requirement 标题加一行移除原因]
```

拿不准时先看当前实现：行为已存在就是 MODIFIED，不存在就是 ADDED。只写用到的节。

## 可选 frontmatter（仅在需要漂移守卫时）

默认不加 frontmatter。用户要求这块代码以后的改动必须同步 spec 时，在文件最顶部加上：

```yaml
---
spec_dev:
  version: 1
  feature: <feature-name>
  status: draft            # draft | active | superseded；实施期间保持 draft，交付时翻 active
  covers:                  # 本 spec 拥有的代码路径 glob
    - "src/<feature>/**"
  supersedes: []           # 本 spec 取代的旧 spec 路径（仓库根相对）；没有留空数组
  superseded_by: null      # 本 spec 被取代时填后继 spec 路径，与 status: superseded 成对出现
---
```

状态怎么流转见 requirement-analysis 的 `references/spec-lifecycle.md`。

## 交付后的标注

交付对账时没有交付的 Requirement，在其标题下标注一行（已交付的不标）：

`> **Delivery: DEFERRED (YYYY-MM-DD)** — 一句原因`

延后写 DEFERRED，放弃写 DROPPED。标注里的路径用裸文本，不加反引号或链接，方便检索。
