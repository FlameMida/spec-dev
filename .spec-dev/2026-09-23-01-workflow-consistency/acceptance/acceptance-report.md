# workflow-consistency 验收与交付对账

日期：2026-09-23。范围：获批 spec 与 T00–T16。正文记录合并前实现验收，真实交付另行追加。

审查基线：`5244a3989e68c4c740b1fc694c913c343d5fbacc`。关闭复审候选：`83001608178f59adfddd7093fca633f4825a3b52`。

## 主要可读性修改

| 位置 | 修改方案及结果 |
|---|---|
| [需求分析入口](../../../skills/requirement-analysis/SKILL.md) | 用决策图表达明确入口、交付目标、开发承诺与设计空间的路由，旁边保留同义短文 |
| [小修契约判断](../../../skills/quick-fix/SKILL.md) | 用流程图分开改变、不变与未知；强制细则同步区分有效、失效及无任务绑定 |
| [执行与恢复](../../../skills/executing-plans/SKILL.md) | 用流程图区分首次、当前票、组、并发与终端档案；旧单文件按明确任务恢复 |
| [spec生命周期](../../../skills/requirement-analysis/references/spec-lifecycle.md) | 用事件、状态、标注、下一步四列表区分激活与真实交付 |
| [计划入口](../../../skills/writing-plans/SKILL.md) | 用动作与必读资料表说明按需读取时机，字段只保留一个权威定义 |
| TDD、验收及中英文简介 | 简述行为红、重构保绿、授权例外；明确断言判定不等于每次结果相同，触发与职责保留在摘要 |

## 验证结果

**455/455通过，0失败、0跳过、0取消，实际exit_code=0。** 正式命令为完整展开的 `node --test scripts/tests/*.test.mjs`。

[最终回执](../execution/tasks/T15/final-r06-20260923T173117/record.json)、[原始输出](../execution/tasks/T15/final-r06-20260923T173117/stdout.log)、[当前候选核验](../execution/T15/review/round-3/final-for-review.json)。受测提交为 `bd72d9272c6282728d20f0f914559f430030b5dc`，之后仅保存进度检查点。

保留此前 418/420 失败尝试、来源对照、420/420 初审候选及438/438首次修复候选。每次红/绿原件独立保存，未覆盖失败或将非零回执改成成功。

正常代码/文档提交均经过插件包、官方 Codex 安装、15 技能、元数据同步及暂存 diff 检查。进度提交单独保存，未进行版本发布。

## 独立审查

初审采用 native large 五路 A/B质量/B简洁性/C/S，报告经 schema 校验，保留独立反驳与 mandatory critic。native 编排不声称具备受控运行器的写入隔离保证。原完整范围为98文件，修复和验收报告属于后继增量。

| 项 | 确认问题 | 修复与证据 |
|---|---|---|
| R1 | 非shell消息hook被注入shell，解释器名称后缀误识别 | 安装前预检与精确解释器名；真实Python/Node提交和原件保护 |
| R2 | 普通v1获准保留既有非零final后无法交付 | 原Receipt不变，增加处置引用；真实squash/transfer及拒绝反例 |
| R3 | 旧单文件把首个未勾选任务当续跑点 | 按绑定/task key/授权与执行记录定位，同步eval；问题限定为文档冲突 |
| R4 | quick-fix强制细则与有效绑定冲突 | 有效/失效/无绑定分流；宽例外不与Spec-Task并用 |
| R5 | 必要Git对象缺失时历史枚举先失败却返回成功 | 必要历史读取拒绝；authority/scope真实删除及原字节恢复对照 |
| R6 | 无.json后缀的已登记处置遗漏引用原件 | 按显式回执引用解析，真实squash后转存比较/裁决原件 |
| R7 | 未知原生报告的日志字段被误套正式路径协议 | 非正式文件按完整登记范围原样保留；正式Receipt/group/delivery仍严格核验 |
| R8 | 台账登记整个execution根目录被文件路径规则拒绝 | 仅对本特性真实目录展开，子项继续按路径和字节核验 |

8项确认问题均修复并经独立关闭复审。最后三路覆盖 A/B质量、B简洁性/C、S，报告均为0新增发现且通过schema校验；[S覆盖闭环](../execution/T15/review/round-3/S/coverage-closure.json)确认CG1及后继修复证据已补齐。没有实际结构摩擦触发D。原初审、反驳、补查及各轮未关闭结论均保留，不倒填历史。

R1/R4的跨维度重复按根因合并。R5来自critic的CG1补查，原覆盖缺口与后补证据分开保存。普通无关联合并的逐父差异规则作为原契约边界保留，未列为新增缺陷。

R5的后继修复还覆盖spec blob/tree和多ref的提前读取失败。R7/R8经实际转存预检与独立样本发现；预检02最早失败实际属于R8，R7两类独立样本仍成立，归因追加说明与原件均保留。修复后的实际预检04已成功逐文件复制核验438份原件。

报告索引：[初审处置](../execution/T15/review/round-1/disposition-summary.json)、[critic](../execution/T15/review/round-1/critic/report.json)、[第一轮修复](../execution/T15/review/round-2/repair-index.json)。

## Requirement Reconciliation

**14 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 SUPERSEDED / 0 ADDED-IN-FLIGHT**，指获批程序及文档实现范围。明确的manual项仍未执行，不据静态检查声称模型语义PASS；本特性的真实合并、转存和清理另在实际交付节记录。

| Requirement | 场景 | 实现与核验范围 |
|---|---|---|
| A01 共用精确任务范围 | S01–S02 | task-scopes、绑定与并发范围共用定义 |
| A02 多入口核验任务绑定 | S03–S05 | worktree/index/commit/ref各视图及越界拒绝 |
| A03 可移植的提交关联 | S06 | 安装后真实提交/clone、缺必要历史对象拒绝 |
| M01 恢复先处理当前任务 | S07–S08 | current优先、blocked保留、完成证据核对 |
| M02 未完成旧计划局部补齐 | S09–S10 | 保持格式/历史、明确任务定位、复选框静态范围 |
| M03 final先于审查验收 | S11–S12 | F→审查→A/对账→D无环顺序 |
| M04 失败处置与修复返回验证 | S13–S14 | 非零来源比较/裁决原件，修复后补验复审 |
| M05 按实际版本与范围复用证据 | S15–S16 | 原件、命令、内容范围及严格审查快照 |
| M06 critic独立于反驳触发 | S17–S18 | large强制critic、拒绝矛盾配置 |
| M07 回执来源与验收审计条件 | S19–S20 | 真实回执导入封存、standard/deep边界 |
| M08 本地证据转存先于清理 | S21–S22 | ignored原件闭包、冲突/中断与原cwd保护 |
| M09 最终交付映射与来源历史 | S23–S24 | 来源与目标分离，ff/merge/squash及补验 |
| M10 准确表达TDD路径 | S25 | 行为红、纯重构保绿、授权例外分流 |
| M11 图表与精简文字保持唯一规则 | S26–S27 | 3幅流程图、状态/动作表、主文/细则/摘要同步 |

## Scenario Coverage

| Scenario | 检查范围 | 类型与边界 |
|---|---|---|
| S01 串并行消费同一范围 | common scope authority, duplicate writes and path cases | program |
| S02 实施前扩大范围 | modified spec/task/scope and staged scope view | program |
| S03 先提交 spec 后正常实施 | committed spec, bound commit, dangling local reference | program |
| S04 无效或越界绑定 | deletion/rename, path escape, invalid binding and parallel context | program |
| S05 多契约与多 ref 隔离 | all covers owners, per-commit reversals and independent refs | program |
| S06 新检出核验与关联缺失 | installed commit -> bare push -> fresh clone without source; missing association rejects | program |
| S07 未提交实现的中断 | current before independent pending, no completion SHA | program |
| S08 提交与状态之间中断 | existing implementation remains in_progress; blocked current stays blocked | program |
| S09 分文件补齐不重写历史 | binding/inspect leave progress unchanged; recovery instructions preserve completed history | program+static; actual model recovery behavior manual-pending |
| S10 单文件勾选与正文修订 | legacy checkbox state versus wording/code-fence changes | program |
| S11 final 验收行不再循环 | actual F -> A -> D validator and reversed cycle rejection | program+static |
| S12 无验收票与未完成组 | pending group gate and no-empty-acceptance F template | program+static; model task generation manual-pending |
| S13 全量或合并后发现回归 | changed target requires real verification; strict old review snapshot rejects | program+static; actual agent repair-routing behavior manual-pending |
| S14 既有失败归属 | actual v1 same nonzero baseline/final, explicit disposition artifacts, actual squash and transfer; missing/invalid disposition and regression controls reject | program+static; failure equivalence and real user-decision authenticity remain semantic review responsibilities |
| S15 代码、测试和契约各自失效 | code/check.py/spec changes invalidate old receipts | program |
| S16 仅进度与缺证据 | progress reuse in new run only; missing/corrupt originals reject | program |
| S17 零候选三种规模 | small/regular no candidates; large executes critic process | program; fake client validates orchestration, not model semantics |
| S18 大档冲突配置与候选被反驳 | large+on-findings rejected; rejected candidates still trigger critic | program |
| S19 伪形状或过期外部回执 | real import, self-reported hashes rejected, sealed bytes persist | program |
| S20 标准与深度验收 | light/standard evidence and deep pass-audit conditions | static; real Tier A model/browser auditing manual-pending |
| S21 ignore 下记录与清理后复核 | real ignored group recorder; transfer + squash + original worktree removal | program |
| S22 转存冲突或中断 | conflicting bytes, source corruption and partial publication permission failure | program |
| S23 最终 squash 保留票级约束 | real ff/merge/squash with history anchor; ticket ancestry remains strict | program |
| S24 错误目标与缺来源 | missing/wrong ref, target, orphan, cwd, bytes and changed source baseline reject | program |
| S25 重构与例外不冒充行为红 | behavior red versus refactor green versus authorized exceptions | static; real-model interpretation manual-pending |
| S26 图文与元数据的边界样本 | diagram branches, capacity, deterministic wording and metadata consistency | static; text fallback viewed; graphical Mermaid rendering unverified; model cases manual-pending |
| S27 移动规则与触发边界 | authority links, local reference closure and preserved trigger cases | static; real trigger evaluation manual-pending |

## 验证边界与偏差记录

- 真实模型指令/触发评估属明确的manual范围，本次未执行；eval文件保存案例与预期。没有独立验收任务，按矩阵完成证据对账，不制造空任务。
- 三幅Mermaid图的文本退路已在浏览器实际查看；图形渲染未验证，未为此下载新工具。
- 真实远端PR、托管策略和发布未执行；本次只交付本地分支。夹具中的owned bare push与squash不代替远端验收。
- failure-disposition字段/hash只证明引用和内容一致。实际来源、失败等价性和用户裁决真实性仍由主线程及独立审查核对，不因相同退出码自动批准例外。
- 历史普通组回执实际为9字段；沿原形保留，未按计划的“十字段”文字误补字段。
- T04早期提交钩子因空白失败后，状态工具误带暂存文件提交；后续正常代码提交修正并通过完整precommit，历史未重写。控制工具现要求空index。
- 测试夹具及元数据措辞错误在预期行为断言前暴露后，先修正再取得有效证据；失败尝试全部保留，不算产品TDD红。
- 第四/五次final为445/446、448/449，均在R06终止确认断言失败。当前和精确来源的隔离对照各7/7；后续独立窄诊断捕获killpg信号0的EPERM打断finally。原full日志未捕获该errno，不反推其瞬时组成员。
- 经独立核对补充保守终止证明：仅leader已退出且成功完整进程表确认无活跃成员时收尾，其余继续blocked。6个故障边界、13个R06、60个控制器用例及最终455项均通过；旧run和原件未改。首次新增测试误以incomplete退出码为0，纠正为原有1后对精确旧模块重新取得有效红。
- 诊断资料：[结论](../execution/T15/R06-diagnosis/diagnosis.json)、[独立核对](../execution/T15/R06-diagnosis/independent-S.json)。含Git对象的临时夹具已归档并逐项核对1980文件hash，确认70个登记组无成员后清理。
- 七份旧active spec共16项部分取代标记已准备；其余契约保留，随真实交付生效。
- 来源工作区原有hooks/hooks.json脏改动未纳入本次提交；实际交付前后再次核对原hash。

## 实际交付

已在本地 `main` 完成 ff-only 合并；来源与目标均为 `4b53335528e3baa41fdddd525d7870addcf92d2f`，`verified_target` 同此提交。来源历史保留在 `refs/spec-dev/archive/workflow-consistency/source`。

- [真实Git操作回执](../execution/delivery/ed3abdc9-8924-4e9e-bd25-4457807c5ee8/record.json)保存原始argv、cwd、退出码和输出。
- [转存清单](../execution/T16/transfer-manifest-02.json)：678份原件逐文件hash及源/目标字节比对通过，历史cwd保持原值。第一次因交付目录只在存活目标创建而失败，随后对实际Git回执作同字节镜像并幂等转存，失败回执保留。
- [清理回执](../execution/T16/cleanup-operations.json)：本次created/manual工作区和临时分支已正常移除；未使用强制清理。23项证据/历史引用登记保留，未创建的受控审查目录占位已退役。
- `sync_commit` 指向上述实际目标；单字段锚定提交为 `000560410d9fdc17f9cd39e55656432dd0489200`。[清理后交付核验](../execution/T16/proof-after-cleanup.json)通过。
- 合并后仅保存进度、单一sync_commit字段和本实际交付节；记录性提交使用明确的包检查跳过开关，不当作新的产品测试证据。
- 用户原有 `hooks/hooks.json` 内容哈希仍为 `89fae26d666a0d183794e0785a64b2361a82657959caa25035fa1258164a5020`。该未提交改动保留，未纳入本次隔离提交树验证。

未执行推送、打tag或发布；真实模型评估和Mermaid图形渲染的未验证边界仍如正文所列。
