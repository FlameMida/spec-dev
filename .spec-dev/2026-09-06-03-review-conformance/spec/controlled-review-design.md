---
spec_dev:
  feature: review-conformance
  status: active
  covers:
    - "scripts/review-runner.py"
    - "scripts/lib/review_*.py"
    - "scripts/tests/controlled-review.test.mjs"
    - "skills/executing-plans/references/review-orchestration.md"
    - "README.md"
    - "README.zh-CN.md"
    - ".codex-plugin/plugin.json"
  sync_commit: null
---

# 受控审查运行修正

用户要求“用一个能一次性解决所有问题的方案进行修正”，在明确告知需要运行控制器且超出旧“不新增自动审查调度器”范围后回复“继续”。本修正统一解决证据保管、执行者核验和中断收尾，不承诺模型语义零错误或任意服务延迟下300秒全部完成。

## 方案与边界

采用宿主运行控制器与受控工具接口。继续堆提示词无法阻止文件覆盖；仅增加事后验收可发现问题但不能保证产品运行路径，均不作为交付方案。控制器固定审查快照、维度、容量及依赖，worker仅分析；身份来自宿主派发，测试由worker实际请求，宿主执行固定命令并保存原始结果。报告与证据分离，worker不拥有任意Bash/Write或修改控制目录的工具。保留用户设置、认证及现有模型；不采用restricted/bare/空setting-sources或改全局设置。

首个生产执行入口为Python3标准库CLI，调用本机Claude CLI；内嵌stdio MCP仅作受控工具传输，不增加外部服务/第三方依赖。其他客户端现有提示词入口仍可使用，但不能宣称已获得同等机器保证；本次不提前造多客户端适配抽象。

## 与旧计划关系

本次明确扩展原设计第44/348行的非目标，允许生产审查运行器；原28个Scenario和审查判断仍有效。review-findings现有字段、类别与通用validator不变，新的运行记录是独立外层协议。原T05保留in_progress，T06需本修正与原验收均完成后再开始。旧50条模型证据全部保留，不改写历史结果。

用户在明确询问“每段30分钟、仍最多3段、费用不限”后回复“可以”。一次执行片段默认且最多1800秒，可显式指定更短预算；到期停止活动worker并归档。恢复只继续同一run未完成任务，固定scope/候选哈希，完成任务不重跑。最多3个显式启动片段，总5400秒；不自动延长本轮、不无限重试。新指标与旧整例300秒、旧三片段900秒分别记账，不改写旧超时结果。Claude CLI不设置费用上限，模型、认证与本机配置保持继承。

### Requirement: 证据由宿主管理

控制器 SHALL 从实际子进程保存完整stdout/stderr、实际退出码、命令、cwd、开始结束、run/actor/call及哈希。模型只能引用证据ID，无输出路径和身份参数。A或A+S必须实际调用本轮测试；引用父线程日志不满足独立复跑。

#### Scenario: R01 原件不可由报告覆盖
GIVEN 测试产生证据 WHEN worker提交同名或伪造字段 THEN 报告单独归档且原件字节不变，越权参数拒绝。

#### Scenario: R02 冒用执行者
GIVEN B取得测试回执 WHEN A引用该回执且未复跑 THEN A提交被拒绝，未完成门保留。

### Requirement: 快照引用和独立复核

控制器 SHALL 将引用绑定固定源码路径、行号及实际原文，并校验现有findings schema；高/中候选只有不同actor的实际独立复核完成后可确认。critic核查完整覆盖和证据清单；机器只证明引用内容/动作/身份，不代替语义判断。

#### Scenario: R03 虚构或越界引用
GIVEN 固定快照 WHEN worker提交不存在或错误原文的引用或请求目录外文件 THEN 返回明确错误，不完成任务。

#### Scenario: R04 未完成不能出绿
GIVEN 缺少A复跑、独立反驳、critic回执或有覆盖缺口 WHEN 汇总 THEN 状态incomplete且列缺项；finding数量为零无豁免。

### Requirement: 有界运行及恢复

控制器 SHALL 按实际指定容量派发全部维度，保留真实进程开始退出与工具记录。每片段1800秒上限，最多3片段，不跨run借用成功结果；快照变化拒绝恢复。确认发现与审查通过分开报告。

#### Scenario: R05 容量和中断
GIVEN 容量2且多于2个任务 WHEN 运行或超时 THEN 活动worker不超过2，已完成结果保存，超时明确incomplete。

#### Scenario: R06 同run恢复
GIVEN 部分完成且原始scope未变 WHEN 显式再次run THEN 只派剩余任务；篡改证据、快照或耗尽片段次数时拒绝放行。

## 验证与交付

公共测试落点：实际CLI/stdio工具协议、真实临时Git仓库和测试子进程；不对提示词做镜像正则。外部LLM调用的确定性协议测试使用明确标注的进程替身，仅验证调度，不计模型行为证据。真实验收直接运行生产入口，在同run核对各维度、A独立测试、独立反驳、critic、最终结果和完整哈希；恢复运行单列。保留失败及不支持客户端边界。相关回归为scripts/tests/controlled-review.test.mjs，最终运行全部scripts/tests/*.test.mjs及既有技能/plugin/openai校验。

## 实施前独立边界核对

保留本机hooks/认证/配置意味着信任其宿主扩展；broker不是OS沙箱。固定测试仍执行获批仓库代码，前后核对快照，不能宣称测试无写入能力。控制器在实际init检查模型工具清单，不符立即终止。stdio避免每次工具操作重启CLI的上下文和延迟成本；README两种语言和Codex元数据将明确“无外部MCP服务依赖”，Python/Claude只为新入口必需。

D既可由输入实际证据触发，也可由维度报告提出真实结构引用后追加；具体结构语义仍由独立审查核实。同根因合并不得因同一行自动合并；独立反驳和critic保留来源。固定测试每actor每run一次，恢复从已有真实回执复用，不会把另一actor的测试冒充本actor；若调用已开始而无完整回执，则标记未知且不自动重放有副作用测试。

## 外层协议与状态补充

submit_report外层为report、citations、coverage、evidence_ids、d_request；refute附decisions及可选merge_groups，critic附gaps。citations绑定finding_index、file、line、quote；coverage逐scenario声明reviewed/gap及引用。actor/run由宿主填写，未知字段拒绝。高/中候选ID绑定具体报告哈希及finding索引，独立决策为confirmed/rejected/insufficient；完成回执不等于成立。低发现保留在observations，不静默删除。合并组保留所有来源及因果说明，critic核查因果，不能凭同一位置合并。

critic缺口最多派一轮对应维度supplement并用critic-2补核；D可来自所有已完成报告，追加后旧critic覆盖依据失效。任意末轮/反驳新高或中候选没有对应独立裁决时，最终仍为incomplete，不无限加轮。报告记录实际context所见前置报告哈希，过期必须重读。

同run以文件锁互斥，片段额度在派发前持久化。报告、对象、完成记录采用原子写，真实CLI成功result、退出码、工具清单与报告版本同时匹配才记completed。终止清理worker/broker及测试进程组；异常中断前片段无终止确认则blocked，不擅自重放。除被审快照、规则外，固定runner/broker/store/process、validator/schema及其现有导入依赖哈希，变动必须新run。

## 真实因果误合并后的保守限定

旧g3-small-r1在恢复完成后，将empty返回错误和invalid未抛异常误合并；只修其中一项仍不能消除另一项，独立判读确认这是有效语义红，旧记录保留FAIL。受控入口的合并仅允许各成员对应的真实现行Scenario集合非空且完全相同；身份按契约文件、Requirement位置、Scenario位置区分，不能只比标题或组引用并集。相同集合只是必要条件，独立因果说明和critic语义核查仍必需。原A缺Scenario引用时，反驳者可用逐成员member_citations补足真实依据；不能给已有不同Scenario补不相关引用凑集合。

此入口对不同Scenario或无Scenario的纯质量候选保守分列，不宣称已证明根因不同。S22同Scenario同缺陷的A/S重复仍可合并并保留来源。原生入口原有因果合并规则保留；受控入口对“同根因只保留一条”的适用范围按本节收窄。机器门不能证明任意模型语义判断均正确。

## 实测传输截断后的修正

真实g4-mechanical-r1的Claude工具回执将67.5KB context转为persisted-output，仅前2KB可见，文件路径超出受控worker能力；测试ID和diff因而不可达。原运行停止并保留incomplete，不继续消耗恢复额度。所有受控工具响应超过8KB时在内部按UTF-8字节分页；context允许固定resource/cursor读取全部原JSON片段，资源绑定本run/actor及内容哈希。源码、报告和测试原件完整保留；仅紧凑源码包减少重复内容。critic/refute的context依据须全部页已实际交付后才写入，首段不算已读。

完成回执绑定对应attempt的stdout和stderr实际文件哈希；修改或缺失任一原件均blocked。测试取消由宿主片段预算统一控制，删除未经约定的30秒局部截断；中断仍封存不完整回执且禁止自动重跑。AS明确兼查B/C显著问题；仅Spec越界或Bug不触发D，需具体结构边界摩擦证据。该语义要求仍需真实模型独立判读，机器只验证引用真实性。

分页资源及送达记录绑定当前broker/worker进程身份；新片段的新进程不能继承已读页或旧basis。成功与错误响应均经过同一大小边界。初审维度保留完整共同事实和自身恢复数据，不读取其他初审结论；D另给触发来源actor/report ID及结构引用。反驳/critic只读取实际依赖报告与所引用测试；supplement依赖原维度报告和critic缺口，未实际读取不得提交。旧small-r3新增的“若未来批准保留越界接口则缺测试”误报为有效语义红：当前已要求删除的代码，其假设保留后的覆盖/文档缺口只作附属说明，不作为当前独立发现。

受控入口的干净HEAD、明确spec/plan、非空固定测试前置条件不替代原生输入恢复；无spec历史计划及空diff预检按原生流程处理。不能声称控制器单独实现全部28个原场景；验收分别标注原生语义证据、程序协议回归和具体版本真实运行。

## 协议重试与重复输入修正

复杂真实运行再次耗尽预算后，原始日志显示嵌套schema未公开导致字段猜测重试，固定输入重复传输且原生Markdown模板混入受控提交。工具现在公开完整嵌套引用、发现、coverage、决策与合并契约，并按角色要求decisions/gaps；D引用仅file/line/quote，摩擦说明放coverage_note。changed_files独立于全部快照files。context参数保持客户端兼容的简单object；宿主继续要求空对象或完整resource/cursor配对。

原始测试对象保留全部字节和编码；模型视图只移除可由完整UTF-8文本无损还原的base64，非UTF-8仍附原编码。spec/plan在context仅提供一次原文。分页按JSON转义后字节限定6000内容字节，仍逐页送达、全部交付才写依赖basis；允许模型同轮请求剩余页。worker消费原文公共规则和自身维度，围栏感知排除原生Markdown输出及任意工具模板，反驳和critic保留全部维度判据。

协议开销修正当时保留300秒片段，后续按本文件前述用户授权调整为1800秒；最多3片段、全diff与原件、身份与独立复核门不变。不启用会话继承或更换本机模型。上述修正减少已观测开销，不承诺任意服务延迟下完成。新增真实run重验，不修改历史run。
