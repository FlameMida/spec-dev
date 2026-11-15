---
description: 判断一个需求该走哪条流程（quick-fix / requirement-analysis / exploring / 报告通道）；只给建议，不写文件
---

# 需求分诊（Triage）

判断用户的一个需求该走哪条流程。用户已经点名某个 skill 时，直接用那个 skill，不必经过本命令。

## 输入

- `$ARGUMENTS` 非空：直接分析它。
- 为空：先问一句“要分诊什么需求”，得到答复后再判断。

## 先查已有上下文（只读）

提出建议前按 [context-reuse.md](../skills/requirement-analysis/references/context-reuse.md) 查是否已有实现、以前是否否决过，并读共享术语。查到的结果用来给建议，不因此直接拒绝请求，也不写文件。

## 怎么判断

具体判据写在各 skill 的 SKILL.md 里，这里只列看哪几点、指向哪个 skill。

1. **还没决定要不要做**（探索性的说法，没有承诺交付）→ **exploring**
2. **已决定要做，但交付物不是代码变更**（调研报告、方案对比、日志分析等）→ **报告通道**（定义和保存位置见 requirement-analysis SKILL.md 的入口判断）
3. **已决定要做的开发任务**：明显是做法没有争议的小修 → **quick-fix**（判据见其步骤 1）；明显需要设计（新功能、行为变更、技术选型落地）→ **requirement-analysis**
4. **拿不准大小**：已决定要做，但从措辞看不出是小修还是需要设计 → 建议先从 **quick-fix** 开始。查到根因后命中升级条件再转 requirement-analysis，已查到的内容会带过去

## 输出

用对话语言给出分诊结果，等用户确认：

- **判定**：一句话说明这个需求的性质（是否已决定要做、交付物是什么、有没有设计空间）。
- **建议路线**：推荐的放第一个，并说明理由。
- **依据**：命中了上面哪一条，为什么。
- **可选的四条路**：quick-fix、requirement-analysis、exploring、报告通道，用户可以改选任何一条。
- **拿不准时**：说明拿不准的原因，列出两个候选让用户挑，不硬给一个结论。

## 用户确认后

- **quick-fix、requirement-analysis、exploring**：调用对应的 skill，把请求原文和分诊依据交给它。
- **报告通道**：按 requirement-analysis 入口判断里的约定执行，同样交上请求原文和依据。

本命令不写任何文件，判定只留在对话里。用户改选时照用户选的走。
