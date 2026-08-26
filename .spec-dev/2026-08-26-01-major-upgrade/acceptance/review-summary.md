# major-upgrade 收尾审查报告(ultracode 工作流)

- 编排:5 路维度审查(A/B1/B2/C1/C2)+ 2 路验收演练 + 逐条对抗复核 + completeness critic,共 20 个子代理、507 次工具调用、约 1.01M tokens
- 统计:原始发现 26 条 → 去重 24 条 → 对抗复核后 confirmed 24 条(被反驳 0);验收演练 2 路(acc-resume 过 / acc-evals 有 1 条 issue);critic 覆盖缺口见文末
- 主线程前置验收(D 组):AP schema 校验 ok:true(修正后)、MCP 残留零命中(修复 README 4 处+版本同步三→五处)、validate-skills/check-openai-sync/check-plugin/node --test 33/33 全绿、pi.dev 官方文档走查证实 pi.skills 字段格式(文档走查级证据)

## Confirmed 发现(按严重性)

### [1] 高/Bug (conf=85, A-correctness) skills/visual-preview/scripts/start-server.sh:142

- **描述**:新增的 --feature-dir 分支按原样使用调用方传入路径计算 SESSION_DIR（line 143），而脚本在 line 181 先 `cd "$SCRIPT_DIR"` 再以 `BRAINSTORM_DIR="$SESSION_DIR"` 启动 node（line 201/210），server.cjs:102 对 BRAINSTORM_DIR 无 path.resolve、fs 操作按 process.cwd（=插件 scripts 目录）解析。SKILL.md:41 明文要求传相对路径 `--feature-dir .spec-dev/<当日特性目录>`：照文档从项目根调用时，line 169 的 mkdir 在项目内建出空目录树，服务端实际把 content/state/server-info 写到 <插件>/skills/visual-preview/scripts/.spec-dev/<feature>/visual/<id>/ 下——T15『产物归位特性目录』的核心目标在文档化用法下失效，返回 JSON 的相对 screen_dir/state_dir 也与真实落位不符。已用 --dry-run 实测确认相对路径原样透传。
- **修复建议**:在参数解析后立即把 FEATURE_DIR（顺带 PROJECT_DIR）绝对化，例如 `case "$FEATURE_DIR" in /*) ;; *) FEATURE_DIR="$PWD/$FEATURE_DIR";; esac`，或在 line 181 `cd` 之前基于 $PWD 计算绝对 SESSION_DIR 再传给 node；同时把 SKILL.md:41 的示例改为绝对路径形态（`--feature-dir "$(pwd)/.spec-dev/<目录>"`）。补一条相对路径回归断言到 scripts/tests/visual-path.test.sh。

### [2] 中/Bug (conf=85, A-correctness) scripts/validate-output.mjs:81

- **描述**:validate() 只支持 type/required/properties/items/enum/minimum/maximum/minLength/if-then-else，而 T26 入库的官方 AP schema（scripts/schemas/agent-plugin-1.0.0.json）的关键约束全部依赖不支持的关键字：$schema 的 `const`、name 的 `pattern`/`maxLength`、顶层 `additionalProperties:false`。因此验收命令 `node scripts/validate-output.mjs agent-plugin-1.0.0 plugin.json` 的 ok:true 近乎空洞——$schema 值写错、name 违反 pattern、塞入多余键（比如把 plan 里原有的 "skills" 键加回去）都会照样通过。spec Requirement『Scenario: 官方 schema 校验通过（校验零错误）』实际未被强制执行，只是当前文件碰巧手工改对了。
- **修复建议**:给 validate() 补 const/pattern/maxLength/additionalProperties 四个关键字的最小实现（与 schemas/README.md 声明的子集同步更新）；或在校验入口检测 schema 含不支持关键字时显式报错拒绝，避免静默弱校验；长期可对官方 schema 换用完整 JSON Schema 实现。

### [3] 中/Bug (conf=88, A-correctness) scripts/doctor.mjs:77

- **描述**:spec『Requirement: doctor 诊断命令』要求 anysearch 域报告『可用性（含双副本歧义与版本滞后）』，但 report.anysearch 只有 embedded/duplicates/hint 三键，完全没有版本滞后检测（未读 SKILL.md 的 metadata.upstream-tag、未与上游最新 tag 比对）。计划 T7 的代码块同样缺失，属计划起草时对 spec Requirement 的静默缩水而非已确认决策（『已确认的关键决策』节未涉及此项）。
- **修复建议**:在 anysearch 节增加 lag 检测：读取 skills/anysearch/SKILL.md frontmatter 的 metadata.upstream-tag，子进程运行 `node scripts/update-vendored-skill.mjs --skill anysearch --check`（exit 1 即滞后），把结果写进 report.anysearch（如 { pinned, latest, lagging: bool }），--json 与人类可读两形态同步输出。

### [4] 中/规范 (conf=80, B1-style) scripts/doctor.mjs:77

- **描述**:spec 行为契约（.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md:124「doctor 诊断命令」Requirement）要求 doctor 报告六类状态，其中两处细节无对应实现：(1) anysearch「版本滞后」——实现只报 embedded 存在性与 duplicates 双副本（scripts/doctor.mjs:77-83），无任何版本比对（如复用 update-vendored-skill.mjs --check）；(2)「SessionStart hook 挂载」域——实现的第 4 节是注入决策回放（另一条 Requirement 的职责），hooks/hooks.json 的挂载状态从未被检查。commands/doctor.md 也未声明该范围裁剪，文档承诺与脚本能力不对齐。
- **修复建议**:在 anysearch 节调用 `node scripts/update-vendored-skill.mjs --skill anysearch --check`（退出码 1 时输出滞后提示），并补一项 hooks.json/SessionStart 挂载检测；若实施计划有意裁剪，则在 commands/doctor.md 明确注明两域不在检测范围。

### [5] 中/Bug (conf=96, B2-dry) scripts/validate-output.mjs:58

- **描述**:T26 落盘的官方 Agent plugins 1.0.0 schema（scripts/schemas/agent-plugin-1.0.0.json）使用了 const、pattern、maxLength、additionalProperties:false 等关键字，但 validate-output.mjs 的校验子集只实现 type/required/properties/items/enum/min-max 系列（:58-59 自述），validate()（:81-148）对不支持的关键字静默跳过。实测：把 plugin.json 复制后注入顶层 bogus_key 并把 name 改为 'Bad Name!!'（同时违反 additionalProperties:false 与 name pattern），运行 node scripts/validate-output.mjs agent-plugin-1.0.0 <文件> 仍返回 {ok:true}。plan 第 2091 行将『官方 AP schema 校验 | node scripts/validate-output.mjs agent-plugin-1.0.0 plugin.json | ok:true』列为验收任务检查项，该门目前只校验『$schema/name 存在且为 string』，为无效 manifest 提供虚假放行，违背设计原则第 7 条『判断依赖缺少某能力前先查阅其文档』（应先确认自有校验器能否消费该 schema）。
- **修复建议**:在 validate() 中补齐 const/pattern/additionalProperties（maxLength 顺带）四个关键字的实现；或至少在加载 schema 时扫描未支持关键字并显式报错退出（fail loudly），把『schema 含未支持关键字』与『校验通过』区分开，避免验收命令空转。

### [6] 中/质量 (conf=88, B2-dry) skills/sequential-thinking/scripts/think.mjs:5

- **描述**:think.mjs 是 think.ts 的 183 行逐行手工副本（头注释自称 'logic mirrors think.ts line-for-line ... Keep in sync when upstream changes'），而实施计划 T2 步骤 3 明确规定『最小实现（esbuild 一次性转译，不手写端口）』（plan :205-216，技术栈也列了 esbuild），实际提交 67c4334 改为手工类型剥离且未在任何地方记录偏离理由。双副本的同步机制仅是一行注释：update-vendored-skill.mjs 的 snapshotSync（:228-232）对 scripts/think.mjs 只做存在性检查，上游 think.ts 更新被覆盖后既不再生成 think.mjs 也不告警；think-port.test.mjs 只覆盖 reset/submit/status 快乐路径，revision/branch/needsMoreThoughts 分支的 parity 无任何守护。未来任何一次 --skill sequential-thinking 同步都会让 think.mjs 静默落后于 think.ts（违背设计原则第 2 条最简实现——派生产物被手工副本取代，引入持续手工同步负担）。
- **修复建议**:回到计划的派生路线：snapshotSync 在覆盖上游文件后用 npx -y esbuild 重转译 think.mjs（或至少检测 think.ts 内容变化时输出显式告警『think.mjs 需重新端口』并以非零语义标记）；同时在 think-port.test.mjs 增加一条粗粒度 parity 断言（如剥离类型后两文件 token 序列一致或对 revision/branch 分支各跑一组同输入比对）。

### [7] 中/规范 (conf=95, C1-conventions) skills/sequential-thinking/evals/evals.json:2

- **描述**:新增的 sequential-thinking/evals/evals.json 顶层键为 {"skill": ..., "cases": [{id, input, expected_output}]}，偏离全仓既有惯例 skill_name + evals + prompt。逐一核验 17 个 evals JSON：其余 16 个（含本次分支新建的 test-strategy/evals/evals.json 与 test-strategy/evals/trigger-evals.json、以及 clarifying/exploring/requirement-analysis 的追加用例）全部使用 skill_name/evals/prompt 键，唯独此文件不同。该文件是仓库自有的本地适配产物而非上游原样文件（scripts/update-vendored-skill.mjs:49 将 evals/evals.json 列入 localFiles，同步时以本地版本为准），因此应遵循仓库约定。影响：任何按 skill_name/evals/prompt 统一解析 evals 的脚本或流程会静默跳过/漏读该 skill 的用例，人工按惯例 grep 也易漏；且同分支内 test-strategy 已按仓库惯例落地，两处新建文件 schema 不一致。
- **修复建议**:将 skills/sequential-thinking/evals/evals.json 的 "skill" 改为 "skill_name"、"cases" 改为 "evals"、各用例 "input" 改为 "prompt"（expected_output 与 id 保持不变）；若确需保留上游形态，则在文件内或 update-vendored-skill.mjs 的 localFiles 注释处显式记录该例外及原因。

### [8] 中/质量 (conf=85, C2-abstraction) skills/writing-plans/SKILL.md:287

- **描述**:spec「plan 分文件形态（阈值门控）」明文要求「writing-plans 预登记资源写入其初始 resources，最终任务清理步骤引用其清单」。但 writing-plans 侧未落地该分流：牢记节 :287 仍只说「写计划时就在最终任务的资源台账预登记对应行」，最终任务模板 :211 把复选框台账（`- [ ] <类型>: …`）嵌在计划任务文件内，形态分流条款 :24 也未提 resources；progressive-plan-format.md 的生成规则（:39-44）同样没有预登记条款（仅 :32 行内注释与 YAML 示例含 worktree 行）。消费端 progressive-execution.md:10 与 executing-plans SKILL.md:61 只遍历 progress.yaml 的 resources 键并声明「计划任务文件不编辑」——分文件形态下预登记资源（如 worktree 清理行，唯一必登项）的落点在产出方与消费方之间二义；且 format:11 要求删除 tasks 内「模板残留」复选框，与最终任务模板的功能性台账复选框行相冲突，清理步骤在分文件形态下缺少改写指引。
- **修复建议**:在 writing-plans SKILL.md:24 分流条款或 :287 牢记节补一句分流规则（「分文件形态：预登记资源写入 progress.yaml 的初始 resources，最终任务清理步骤遍历该清单、不在任务文件内嵌台账」），并在 progressive-plan-format.md 生成规则中新增对应条目（含最终任务清理步骤的分文件形态措辞），使 producer/consumer 键契约闭合。

### [9] 中/质量 (conf=88, C2-abstraction) skills/requirement-analysis/evals/evals.json:7

- **描述**:本 diff 向该文件新增了 ra-same-day-numbering 用例（:55-57，教授 `2026-08-26-02-<语义名>` 新命名与重扫防撞），但同文件既有用例的 expected_output 仍教授旧格式路径：:7（light 档用例）「spec 几句话级写入 .spec-dev/YYYY-MM-DD-<feature>/spec/<feature>-design.md」与 :47（报告通道用例）「落盘 .spec-dev/reports/YYYY-MM-DD-<topic>.md」。evals 是本插件的行为断言载体（spec 验收矩阵多行以 eval 断言为证据），同一文件内新旧命名并存使 ADDED Requirement「同日顺序编号」的行为教导自相矛盾——尤其 :47 的报告路径与 SKILL.md:109 刚更新的 `YYYY-MM-DD-NN-<topic>` 直接冲突。
- **修复建议**:将 :7 改为 `.spec-dev/YYYY-MM-DD-NN-<feature>/spec/<feature>-design.md`、:47 改为 `.spec-dev/reports/YYYY-MM-DD-NN-<topic>.md`（与 SKILL.md:109/:183 及 :57 新用例对齐）。

### [10] 低/Bug (conf=90, A-correctness) skills/visual-preview/scripts/start-server.sh:146

- **描述**:FEATURE_DIR 分支无条件用 `${PROJECT_DIR}` 拼 BRAINSTORM_PORT_FILE/BRAINSTORM_TOKEN_FILE；只传 --feature-dir 不传 --project-dir 时两变量变成根绝对路径 `/.spec-dev/visual/.last-port`。server.cjs:792-793 对写入是 best-effort try/catch，不会崩溃，但端口/密钥记忆静默失效（同端口重启、已开标签页重连能力丢失），且 /.spec-dev/visual 目录从未被创建。
- **修复建议**:FEATURE_DIR 分支的记忆文件根改为从 FEATURE_DIR 推导（如 `${FEATURE_DIR%/*}/visual/.last-port`），或在 PROJECT_DIR 为空时打印一行警告并跳过导出这两个变量；至少在 --dry-run 输出中暴露记忆文件路径便于发现问题。

### [11] 低/质量 (conf=90, B1-style) skills/sequential-thinking/evals/evals.json:2

- **描述**:新增的 sequential-thinking evals 文件使用 "skill"/"cases"/"input" 三个键名，而套件既有 5 个 skill（clarifying/exploring/requirement-analysis/acceptance-qa/quick-fix）与本次新增的 test-strategy/evals/evals.json 均用 "skill_name"/"evals"/"prompt"。同一交付内两套 schema 并存，破坏跨 skill 的 grep 与批处理一致性；该文件是本地适配文件（update-vendored-skill.mjs CONFIGS.localFiles 所列），非上游原文，属自研内容。
- **修复建议**:将键名统一为既有约定："skill"→"skill_name"、"cases"→"evals"、"input"→"prompt"。

### [12] 低/质量 (conf=85, B1-style) README.md:21

- **描述**:spec 术语表规定该概念规范名为 vendored skill、Avoid 捆绑/内置 skill。中文侧全部一致用「内嵌」，但英文侧多处用 bundled：README.md:21 "ships as a bundled skill"（同句已附 "(vendored)" 括注，头名词却仍是 avoid 族词）、README.md:213、.codex-plugin/plugin.json:40 "structured reasoning ships as a bundled skill"、guardrail/templates/CLAUDE.md.snippet:47 与 AGENTS.md.snippet:47 "(bundled with the spec-dev plugin)"。中英术语映射不对称：中文无违规，英文恰好落在 avoid 词的对应译名上。
- **修复建议**:英文侧统一改为 "vendored skill" / "vendored with the spec-dev plugin"（README.md:21 可直接以 vendored 为头名词、去掉冗余括注），使中英两侧均对齐术语表规范名。

### [13] 低/质量 (conf=85, B1-style) skills/acceptance-qa/SKILL.md:68

- **描述**:T13 将全套件日期前缀命名统一为 YYYY-MM-DD-NN-<名称>（requirement-analysis/SKILL.md:183、writing-plans/SKILL.md:22、executing-plans/SKILL.md:35、两个模板与两个 snippet 均已更新），但此处验收定位指令仍指向旧模式 .spec-dev/YYYY-MM-DD-<feature>/spec/——新建特性目录从该分支起不再匹配此形态，属交叉引用未同步的漏网。同类残留：README.md:29、README.md:162、README.zh-CN.md:29、README.zh-CN.md:162、skills/requirement-analysis/evals/evals.json:7 与 :47（旧 eval 期望文本，被本次命名变更转为过期）。
- **修复建议**:统一替换为 `.spec-dev/YYYY-MM-DD-NN-<feature>/spec/`（保留「存量旧命名按原样读取」语义一句即可），README 两处与 evals.json 两处同步。

### [14] 低/质量 (conf=85, B1-style) skills/requirement-analysis/references/exploration-patterns.md:86

- **描述**:同一条目内两种口径互相矛盾：前半句要求派发词内联写明 CLI 实路径 `${CLAUDE_PLUGIN_ROOT}/skills/anysearch/scripts/`，理由正是「不加载 agent 定义的环境（如 Codex spawn_agent）」；随后给出的固定模板却写「CLI 路径见 agents/external-resource-explorer.md」——把路径换成了指向 agent 定义文件的相对指针，在模板所针对的正是不加载该文件的环境，且相对路径在用户项目 cwd 下不可解析，模板自我消解。
- **修复建议**:模板中直接内联 `${CLAUDE_PLUGIN_ROOT}/skills/anysearch/scripts/`（与前半句一致），或注明「主线程从 external-resource-explorer.md 抄录实路径后填入模板」的占位符语义。

### [15] 低/质量 (conf=85, B1-style) skills/test-strategy/references/db-testing.md:21

- **描述**:「来源证据：…——详见特性 spec 引用的原始探索文档证据索引」是指向本特性目录探索产物的悬空指针：插件发布后，用户仓库中不存在该「特性 spec 引用的原始探索文档证据索引」，此句对任何外部消费者均不可解析，且未给出路径。作为随插件分发的 reference，出处追溯应自包含。
- **修复建议**:删除「详见…」从句，改为列出上游来源的稳定链接（Storj/pgtestdb/maragu 等原文 URL），或将该从句移入本特性目录的探索笔记而不进 skills/。

### [16] 低/质量 (conf=90, B1-style) scripts/tests/search-clause.test.mjs:8

- **描述**:统一搜索条款断言的 SKILLS 列表只有 9 个 skill，遗漏了 test-strategy——其 SKILL.md:9 含同款「外部搜索统一入口」条款（rg 全库命中 10 个文件，测试只锁 9 个）。T20 后新增的带条款文件未被回归网覆盖，后续若被误删测试仍绿，与验收矩阵「全 skill 统一条款覆盖 · rg 断言逐文件命中」意图不符。
- **修复建议**:在 SKILLS 数组补 "test-strategy"（requirement-analysis 是定义点、可不列，但宜加一行注释说明取舍）。

### [17] 低/质量 (conf=90, B1-style) skills/requirement-analysis/assets/spec-template.md:111

- **描述**:双语对照不对称：中文新增「每行可标注 Lane 归属（fast/PR/nightly，见 test-strategy skill），含 DB/LLM 的行按其处方写执行方式」，英文镜像仅补 "each row may carry a lane tag"，丢失「含 DB/LLM 的行按 test-strategy 处方写执行方式」这半句——恰是 spec Requirement「计划任务标注 Lane 归属」中 DB 处方引用的关键半句。
- **修复建议**:英文侧补齐为 "; each row may carry a lane tag (fast/PR/nightly, per the test-strategy skill); DB/LLM rows follow its stack prescriptions"。

### [18] 低/质量 (conf=80, B1-style) hooks/hooks.json:2

- **描述**:双语注释不对称：中文三个语义点（安装插件即自动注册、无需先手动运行 guardrail 安装器、两者互补），英文只译出两点，丢失「无需先手动运行安装器」与「两者互补」——而「无需手动安装」正是本 hook 区别于旧安装路径的关键用户语义。本仓库注释惯例是中英逐句镜像（对照同 diff 中 guardrail/install.mjs 的两处 skip 日志均成对）。
- **修复建议**:英文补齐："... no manual guardrail install needed for injection; guardrail/install.mjs still provides the git gate and PreToolUse/Stop guards — the two are complementary."

### [19] 低/质量 (conf=80, B1-style) skills/exploring/SKILL.md:41

- **描述**:「你不必做的事」一节的枚举整体挂在标题动词短语下，本次在首项前加的「非分岔时」限定词按句子结构会辖及整个枚举——读作「非分岔时才不必产出特定文档/得出结论/保持简短」，反推「分岔期需要产出文档与结论」，与关键分岔漏斗的实际契约（仅切逐题澄清、仍不要求产出文档或收敛结论）相悖；实际意图只是豁免「照脚本提问」一项。
- **修复建议**:把限定词收进单项，如「照脚本提问（关键分岔漏斗期除外）、每次问同样的问题、产出特定文档……」。

### [20] 低/质量 (conf=85, B2-dry) scripts/doctor.mjs:51

- **描述**:doctor.mjs 重新实现了 install.mjs/session-context.mjs 已有的解析知识而非复用：标记字面量 '<!-- spec-dev:guardrail:start' / 'spec-dev:guardrail:end -->' 与 install.mjs:146-147 的 START/END 常量重复（仅靠 :45 注释『字面量对齐』维系）；hooksPath 归一化 replace(/^\.\//,'').replace(/\/+$/,'')（doctor:38）与 session-context.mjs:75 逐字重复；守卫脚本路径 scripts/spec-dev/check-spec-drift.mjs 在 doctor:32 与 session-context.mjs:81 两处独立维护。且副本已经出现严格度分叉：install.mjs:151 对『END 先于 START 的顺序颠倒』拒绝改写，而 doctor.mjs:53 的 markerState 只查双侧存在、同样输入会报 "ok"——doctor 恰恰漏掉它该诊断的破损形态，是重复实现诱发行为漂移的实证。
- **修复建议**:把 START/END 字面量与 hooksPath 归一化函数提取到 plugin 侧共享模块（doctor.mjs 与 install.mjs 均不随安装器复制到目标仓库，可安全共享；session-context.mjs 因需单文件自包含可保留注释锚定）；markerState 补上 e<s 顺序检查与 install 的判定语义对齐。

### [21] 低/质量 (conf=82, B2-dry) skills/writing-plans/SKILL.md:24

- **描述**:分文件计划形态的触发阈值『任务数 >8 或正文 >25KB』在三处独立陈述：writing-plans/SKILL.md:24（分流门）、progressive-plan-format.md:3（阅读时机）与 :41（生成规则第 1 条），当前措辞一致但无任何同步守护。对照同批引入的同日命名规则（YYYY-MM-DD-NN）专门配了 numbering-docs.test.mjs 锁多副本一致，阈值这个同样跨文件重复的裁决参数没有任何等价 tripwire；一旦某处调整阈值（如 >8 改 >10），SKILL.md 的分流门与 reference 的生成规则将静默分叉，产出形态判定随加载路径不同而不同。
- **修复建议**:任选其一：(a) 以 SKILL.md:24 为唯一权威，progressive-plan-format.md:3/:41 改为『阈值见 writing-plans SKILL.md 形态分流节』不再复述数字；(b) 仿照 numbering-docs.test.mjs，在既有测试中加一条断言三处阈值文本（>8 / >25KB）一致。

### [22] 低/建议 (conf=88, B2-dry) scripts/update-vendored-skill.mjs:36

- **描述**:CONFIGS.anysearch.localFiles 声明了 ["agents/openai.yaml"]，但该字段唯一的消费点在 snapshotSync 内的存在性检查（:228-232），而 snapshotSync 只在 cfg.mode === "snapshot"（sequential-thinking）路径被调用（:138-140）；anysearch 走 subtree 分支，其 localFiles 永不被读取，属于当前无消费者的推测性配置（设计原则第 2 条：避免推测性配置）。它还误导读者以为 subtree 同步也会校验本地适配文件存活——实际 subtree 模式下 agents/openai.yaml 被上游合并删改并无任何检测。
- **修复建议**:二选一：删掉 anysearch 的 localFiles 键（留注释说明 subtree 模式不消费）；或把存在性检查从 snapshotSync 提到 main() 同步完成后的公共收尾路径，使两种模式对本地适配文件有一致的丢失检测。

### [23] 低/质量 (conf=85, C2-abstraction) README.md:162

- **描述**:本 diff 大幅改写双语 README（MCP 清零、平台矩阵、五处版本同步），但 :29 管线概览「requirement-analysis (design → .spec-dev/YYYY-MM-DD-<feature>/spec/<feature>-design.md)」与 :162 流程详述「The spec lands in the feature directory `.spec-dev/YYYY-MM-DD-<feature>/spec/…`」保留旧路径模式；README.zh-CN.md:29、:162 同样。README 在 spec covers 清单内且本次被编辑过，两处旧模式与 Requirement「同日顺序编号」形成文档级漂移，读者会从 README 学到过时命名。
- **修复建议**:四处（README.md:29/:162、README.zh-CN.md:29/:162）统一改为 `.spec-dev/YYYY-MM-DD-NN-<feature>/` 形态，与 requirement-analysis SKILL.md:183 权威定义一致。

### [24] 低/规范 (conf=80, C2-abstraction) skills/requirement-analysis/SKILL.md:183

- **描述**:NN 分配算法的唯一定义处写「扫描 `.spec-dev/` 下当日已有的日期前缀**目录**取最大加一」，而 :109（reports）、:111（roadmap）、:183（特性目录）三处均声明「同一 NN 序列全/由全部 `.spec-dev/` 日期前缀**产物**共用」。reports 与 roadmaps 的日期前缀产物是文件且嵌在 `.spec-dev/reports/`、`.spec-dev/roadmaps/` 子目录下，不在顶层目录扫描面内——「共用」条款缺操作化支撑：同日先落盘 report/roadmap（占用 02）再建特性目录时，按字面目录扫描会重号 02。三站点表述未互洽。
- **修复建议**:把 :183 的扫描口径改为「扫描 `.spec-dev/` 下当日已有的日期前缀产物（顶层特性目录 + `reports/`、`roadmaps/` 下的日期前缀文件）取最大加一」，使算法覆盖其自身声明的共用范围。

## 验收演练(A 组)

### acc-evals: passed=False

- 证据摘要:A 组 eval 断言走查结果（8 用例，7 全承载，1 条子断言无承载）。磁盘 evals.json 与实施计划内定义逐字一致（plan major-upgrade-plan.md:118-137/1201-1210/1330-1336/1421-1431/1608-1623）。

1) st-degrade-no-runtime（skills/sequential-thinking/evals/evals.json:5-7）——部分承载：
- 「不中断流程」→ skills/requirement-analysis/SKILL.md:152（阶段 4：「该 skill 及其运行时均不可用时降级为在回复中显式分点推演，不得因工具缺失跳过分析」）。
- 「显式分点推演（信息质询→冲突消解→方案对比）完成对抗验证」→ skills/requirement-analysis/references/codex-compat.md:69（显式三段结构「降级为在回复中显式分点推演（信息质询 → 冲突消解 → 方案对比）」）；Claude Code 路径同语义由阶段 4 结构承载（SKILL.md:154-158 第一步信息对抗验证、:160 冲突未消解前不进入方案设计、:162-168 第二步 2-3 方案）。
- 「并注明工具降级原因」→ 无承载（见 issues）。

2) ts-lane-annotation（skills/test-strategy/evals/evals.json:5-8）——全承载：
- integration 行标注 PR lane → skills/test-strategy/SKILL.md:45（「integration 行默认 PR」）。
- writing-plans 翻译引用 db-testing 处方、运行命令归入 PR lane → skills/test-strategy/SKILL.md:46（「失败测试步骤继承该行 Lane 归属并写明运行命令所属 lane；DB/容器类测试步骤引用 references/db-testing.md 处方」）+ skills/writing-plans/SKILL.md:66（「矩阵行标注的 lane 直接继承；DB 类步骤对照其 references/db-testing.md，不得出现每测试一容器」）。
- 「job 级一容器 + 模板克隆/事务回滚」→ skills/test-strategy/references/db-testing.md:11（「拓扑：job 级一个容器」）、:13（速1 事务回滚 / 速2 模板克隆）。
- 「不出现每测试一容器」→ test-strategy/SKILL.md:46、:51 + db-testing.md:19 + writing-plans/SKILL.md:66。

3) ts-governance-order（evals.json:10-13）——全承载：
- 「flaky→时长→选择劝阻」→ skills/test-strategy/SKILL.md:25-27（「治理顺序铁律：flaky → 时长 → 选择……先清 flaky，再治时长……最后才考虑选择系统」）。
- 「拓扑/磁盘/并行」→ :27（「拓扑>磁盘>并行」）。
- 「选择系统仅在人数/时长触发条件满足后引入」→ :23（「选择/分片只在触发条件满足时引入（>15-20 人或 PR lane >15min，先榨干单机并行）」）+ :54 Red Fla
- issues:
  - st-degrade-no-runtime 子断言「并注明工具降级原因」无任何承载文本 | 文件: /Users/maverick/feature-dev/.worktrees/plan-2026-08-26-01-major-upgrade/skills/sequential-thinking/evals/evals.json:7 | 严重性: 中 | 置信度: 95 | 类别: 质量（eval-文档契约不一致）| 描述: 全库 4 处 sequential-thinking 降级文本（skills/requirement-analysis/SKILL.md:152、skills/requirement-analysis/references/codex-compat.md:69、skills/clarifying/SKILL.md:67、skills/quick-fix/SKILL.md:105）与行为契约 spec（.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md:150、358、364）均只规定「降级为回复内分点推演、不得中断」，无一要求向用户注明降级原因；而库内其他降级点普遍带「向用户说明/注明」条款（codex-compat.md:37、62、87；exploration-patterns.md:58「报告 Sources 注明实际链路与降级原因」），唯独此处缺失。按计划验收矩阵（major-upgrade-plan.md:2096「全运行时缺失降级不中断……eval 断言成立」）严格走查，该子句不可通过文档追溯，遵循文档的执行者不会主动注明降级原因。次要观察：该 eval 挂在 sequential-thinking 技能下，但 skills/sequential-thinking/SKILL.md 本身无任何降级节（仅 :16「use scripts/think.ts……Do not reason in prose」），承载完全依赖 requirement-analysis 侧，属设计选择而非缺陷。 | 修复建议: 在 skills/requirement-analysis/SKILL.md:152 与 skills/requirement-analysis/references/codex-compat.md:69 的降级句追加「并向用户注明工具降级原因」（与库内其他降级点的『向用户说明』惯例对齐）；或反向收敛——删除 eval 中该子句，二选一使 eval 断言与承载文本一致。

### acc-resume: passed=True

- 证据摘要:A 组验收演练（恢复与登记纪律两场景）全部符合预期，/tmp 演练目录已清理。逐条证据：

【演练 1：分文件计划 plan-index 结构校验】
1. 构造：/tmp/rw-plan/{index.md, tasks/T01..T05.md, progress.yaml}。index.md 导航表按 progressive-plan-format.md:16-21 的四列契约（任务|依赖|消费接口|产出接口）写 T01-T05 五行，其中三行带依赖（T02→T01；T04→T02,T03 多依赖；T05→T04），满足「两行依赖」要求；progress.yaml 按 :25-37 键结构标 T01-T04 completed、T05 pending。
2. 通过路径：`node .../scripts/validate-output.mjs plan-index /tmp/rw-plan` 输出 {"ok":true,"schema":"plan-index","file":"/tmp/rw-plan"}，exit 0。多依赖行（T04 的 "T02, T03"）被 deps 正则正确解析（validate-output.mjs:169-173），无环检测通过（:184-198）。
3. 拦截路径：`rm /tmp/rw-plan/tasks/T03.md` 后复跑，stderr 输出 {"ok":false, errors:[{"path":"tasks/T03.md","expected":"file for table row","actual":"missing"}]}，exit 1（validate-output.mjs:180 文件↔导航表一致性检查生效）。错误定位精确到缺失文件。
4. 恢复判读对照（验收矩阵行，major-upgrade-plan.md:2102「从 T05 续跑、缺文件时停下报告」）：progress.yaml T01-T04 completed、T05 pending 且其依赖 T04 completed → 下一 ready 任务 = T05，与 progressive-execution.md:15-17 的 resume 规则（依赖全 completed 的最小编号 pending）判读一致；缺文件场景（T03.md 删除）对应 progressive-execution.md:16「progress 引用的任务文件都存在」一致性检查 → 停下报告，且被 plan-index 校验器以 exit 1 机器拦截。注：plan-index 模式按 T25 范围（major-upgrade-plan.md:1953-1957）只校验 index↔tasks/悬空依赖/环，不读 progress.yaml——与 progressive-plan-format.md:43 的声明（结构校验：文件↔导航表一致、依赖存在、无环）一致，非缺口。

【演练 2：单文件计划首个未勾选任务判读】
1. 构造：/tmp/rw-single/demo-plan.md，任务 1 三步全勾（- [x]×3）、任务 2 两步勾一步未勾（:15 `- [ ] 步骤 3`）、任务 3 全未勾。
2. 判读：按 progressive-execution.md:22「首个含未勾选步骤的任务即续跑点」机械应用（顺序扫描任务头+未勾选步骤）→ 续跑点 = 任务 2：任务粒度判读（部分完成的任务即续跑点，而非下一个全未勾任务），与该行文字严格一

## Completeness critic 覆盖缺口

### 未覆盖文件

- .gitignore（唯一变更为新增 **/.think_state.json；五个维度 coverage_note 均未点名，仅 B1 的"通读全部文件"兜底覆盖）
- agents/code-explorer.md（T10 白名单加 Bash——不在 A 的锚点 grep 任务列表 T4/T11/T13/T14/T16-T24 内，B2 清单不含 agents/，C2 五锚域不含；仅 B1 兜底。注：本次审查中我已独立核实 :4 tools 行确含 Bash，残余风险低但属覆盖洞）
- agents/external-resource-explorer.md（T10 加粗闭合修复，同上仅 B1 兜底）
- commands/doctor.md（A 覆盖了 doctor.mjs 与 hooks.json 参数但未点名命令文档；其引用的脚本路径/--json/退出码语义未被任何维度专项核对，仅 B1 兜底）
- skills/sequential-thinking/NOTICE（本地撰写的署名/同步说明文件；B2 未覆盖清单只点名 anysearch SKILL.md 正文与 sequential-thinking SKILL.md/example-session.md，NOTICE 的内容正确性无人认领）
- skills/sequential-thinking/LICENSE（B1 仅作快照镜像抽查，与上游 MIT 原文的一致性未验证）
- skills/sequential-thinking/SKILL.md 与 skills/sequential-thinking/references/example-session.md（上游原文保真未逐行审——B1/B2 均声明为快照仅镜像抽查；vendored 快照与 pinned SHA 的一致性无网络核对）
- skills/sequential-thinking/scripts/think.ts（A 做了 think.mjs 与它的本地逐行比对，但它自身与上游仓库 pinned SHA 的一致性未验证）
- skills/anysearch/SKILL.md（B2 明示上游正文未逐行审；normalize 通道改动之外的上游内容保真无人覆盖）
- scripts/schemas/agent-plugin-1.0.0.json（各维度只做了"plugin.json 对它校验通过 + $schema const 匹配"的内部一致性验证；该文件系 T26 经 curl 下载落盘，是否忠实于官方 schema（无截断/无篡改）无人验证）
- skills/writing-plans/references/design-principles.md（C2 明示内容审查不属其锚域且"属其他维度"，但 A 只做 T19 接线锚点 grep、B2 只做 diff 通读——八条原则与 spec 条文的实质对应及语境注解正确性无人认领）

### 未覆盖 Requirement/证据缺口

- Requirement: 根级 Agent plugins 1.0.0 manifest / Scenario: 既有平台装载不回归——需 Claude Code/Codex 实装安装/升级日志，无测试无证据（同时违反 spec 成功标准"Claude Code 与 Codex 实际装载验证通过"）
- Requirement: pi 平台分发清单 / Scenario: pi 装载发现 skills——无 pi 实测，且矩阵允许的"官方文档清单走查替代+证据等级标注"也未落盘任何走查记录（grok 兼容清单走查同此）
- Requirement: vendored skill 统一同步脚本 / Scenario: 上游新版本检测（--check 退出码 1 并输出目标版本）——update-vendored.test.mjs 无 --check 用例（已核实），网络实跑被 A 声明未覆盖，测试与证据双缺
- Requirement: 设计原则声明块 / Scenario: 方案对比引用原则裁决——无任何 eval 用例（已核实 requirement-analysis/evals/evals.json 无原则裁决 case），无阶段 4 演练记录
- Requirement: roadmap 上下文胶囊 / Scenario: 交付回写追加后继注意事项——无 eval 用例（已核实），无演练记录（仅 executing-plans 文本接线经 C2 核对）
- Requirement: 渐进执行与断点恢复 / Scenario: 新会话恢复执行 + Scenario: 状态与文件不一致——矩阵明列"恢复走查记录"为验收证据，临时目录构造 progress.yaml 的恢复演练从未执行
- Requirement: 资源登记纪律（按计划形态分流）/ Scenario: 单文件形态创建即登记 + Scenario: 分文件形态登记进 progress——无 eval、无"模拟创建资源"演练记录（矩阵明列两者为证据）
- Requirement: 结构化推理消费点改写 / Scenario: 无 MCP 环境的对抗验证——改写本身经 rg 零残留验证，但该 Scenario 要求的"requirement-analysis 阶段 4 无 MCP 演练记录"缺失
- Requirement: sequential-thinking vendored skill / Scenario: 全部运行时缺失——eval st-degrade-no-runtime 已定义但从未执行（仓库无 eval runner，无任何跑分记录），验收证据为空
- Requirement: test-strategy skill / Scenario: 计划任务标注 Lane 归属——eval ts-lane-annotation 已定义未执行，且"阶段 4 演练"缺失（矩阵行半数证据为空）
- Requirement: 澄清核心纪律（新增第 0 条自我披露）/ Scenario: 被引用模式自动继承披露——eval cl-disclosure-before-first-question 已定义未执行
- Requirement: exploring 姿态 / Scenario: 互斥选型转漏斗 + Scenario: 非分岔不审讯（near-miss）——evals ex-fork-funnel/ex-no-fork-no-funnel 已定义未执行（矩阵要求"evals 全绿"）
- Requirement: anysearch description 触发增强（normalize 通道）/ Scenario: 上游同步后增强保留——normalize 注入半边有测试，"上游同步后自动重放"半边无测试无同步演练 diff（需外网，被 A 声明未覆盖）

### 截断声明

- 文件覆盖判定基准说明：B1 的"通读全部 73 个文件 diff"为兜底声明，故本报告的 uncovered_files 指"无任何维度专项核对"而非"完全未被读"；实际变更文件为 74 个（给定清单一致，任务描述中的 73 为笔误）。
- agents/code-explorer.md 的 tools 白名单含 Bash 与 external-resource-explorer.md:40 的加粗闭合，我在本次 completeness 审查中已直接核实（tools 行为 `LSP, Glob, Grep, LS, Read, Bash, NotebookRead, WebFetch, WebSearch`），该缺口已现场补验。
- vendored 上游保真与 --check 网络实跑需外网访问，本环境无法代为补验；README 平台矩阵事实准确性需对照 grok/pi/Codex 官方文档，同样超出本次静态审查能力。
- eval 执行缺口的根因是仓库无 eval runner 基础设施（已核实 scripts/ 下无任何脚本引用 evals.json/trigger-evals.json），这些矩阵行在任何本地复跑中都无法变绿，只能靠模型跑分或人工演练补证。
- 任务 27（合并/清理/supersede 回写/sync_commit）未执行不在本次 diff 审查范围内，但它是上述 Superseded-pending 标注转正与验收闭环的前置，已在 summary 中提示。

### critic 总结

completeness 审查结论（对照 74 个变更文件——给定清单与实际 diff 完全一致——与五维度 coverage_note、spec 现行 Requirement 清单、spec 验收矩阵与计划任务 26 矩阵）：\n\n【一、文件/风险面覆盖缺口】没有任何文件处于\"完全未被读\"状态（B1 声明通读全部文件 diff），但存在两类实质缺口：(a) 11 个文件仅靠 B1 兜底、无任何维度的专项核对（见 uncovered_files：.gitignore、agents/ 两文件、commands/doctor.md、NOTICE/LICENSE、四份 vendored 上游正文、agent-plugin-1.0.0.json 的来源保真、design-principles.md 内容实质）；其中 agents/code-explorer.md 的 Bash 白名单我已在本次审查中独立复核通过，残余风险低。(b) 五个跨维度的风险面被所有维度共同声明未覆盖且无人补位：① 真实平台装载实测（Claude Code/Codex/grok/pi 安装与会话注入——直接对应 spec 成功标准）；② evals/trigger-evals 模型跑分（仓库根本不存在 eval runner，全部\"docs\"维度矩阵行的证据依赖它）；③ vendored 快照与上游 pinned SHA/tag 的保真核对（需网络）；④ update-vendored-skill 的上游同步/--check 网络实跑；⑤ README 平台矩阵的事实准确性（grok/pi/Codex 声明 vs 官方文档）。次要：server.cjs（未变更但消费新 FEATURE_DIR 路径）仅静态读、运行时行为未测。\n\n【二、Requirement/Scenario 证据缺口】spec 全部 12 条 ADDED + 7 条 MODIFIED Requirement 中（本 spec 自身无 Superseded 标注，全部属交付对象），13 条 Scenario 既无有效测试也无验收证据（见 uncovered_requirements）：其中 8 条为\"测试与证据双缺\"（平台装载回归、pi/grok 走查、--check 退出码、原则裁决行、交付回写追加、渐进恢复两场景、资源登记两场景、无 MCP 对抗验证演练）；5 条为\"eval 已定义但从未执行\"（全运行时缺失、Lane 归属、披露继承、分岔转漏斗/near-miss、上游同步后增强保留的重放半边）。其余 Scenario 均有可复现证据（node --test 33/33、visual-path PASS、四条校验命令、rg 断言——经 A/B2/C1 独立复跑或我本次复核）。\n\n【三、验收矩阵执行证据缺口】最重磅发现：任务 26（验收）从未产出验收报告——特性目录只有 plan/ 与 spec/，计划第 2086 行明确要求\"报告与证据落盘特性目录 acceptance/ 子目录\"，该目录不存在；369912f 仅含验收中发现的修复（schema 落盘/plugin.json 修正/README 清残留），不含任何证据落盘。任务 26 矩阵 13 行中 9 行证据为空（装载回归、pi/grok 走查、全运行时缺失、无 MCP 对抗验证、Lane/原则裁决、胶囊、披露/分岔/near-miss、登记纪律、新会话恢复），4 行有据（AP schema 校验、MCP 残留 rg、四条命令、双语 README 同步）。spec 验收矩阵 24 行中约 12 行证据为空或半空（normalize 幂等有据但 --check 半边无据；同日编号的规则文本有据但 eval 未跑）。\n\n【其他完整性观察】任务 27（合并/清理/supersede 回写/sync_commit 锚定）尚未执行——spec frontmatter sync_commit 仍为 null、resource-ledger 的 Superseded-pending 标注待回写，属合并前必办；C1 已报的 Node v22 下 `node --test scripts/tests/` 目录形式失败问题仅存在于 main 上的计划文档，本次交付文件未用该形式，但任务 27 步骤 1 原样引用了这条坏命令，执行时会踩坑。

## 各维度 coverage_note

- **A-correctness**:已覆盖：scripts/ 下全部涉改 .mjs（update-vendored-skill/doctor/validate-output plan-index 分支/check-plugin/release）与 start-server.sh --feature-dir/--dry-run 分支的全文逐行核对（对照计划接口块与 think.ts 上游源码逐行比对端口 parity）；guardrail 注入链（session-context --explain 三分支、install.mjs 跳过分支日志、模板标记字面量与 doctor 对齐）、hooks/hooks.json 参数、五处 manifest 版本同步、MCP 零残留 rg；独立复跑 node --test 33/33 全过 + visual-path.test.sh PASS + 四条校验命令全 exit 0，无不可复现声明；markdown 指令文本（T4/T11/T13/T14/T16-T24 接线）经锚点 grep 与仓库结构测试抽验。未覆盖：真实平台装载实测（Claude Code/Codex/grok/pi 安装与会话注入）、evals/trigger-evals 的模型实际跑分、server.cjs 运行时行为（仅路径解析静读）、update-vendored 对上游网络同步的实跑（--check 需外网）。

- **B1-style**:已通读 main...HEAD 全部 73 个文件的 diff 并深读新增脚本（doctor.mjs、update-vendored-skill.mjs、validate-output.mjs plan-index、think.mjs 及其与上游 think.ts 的逐行镜像、start-server.sh、hooks.json）、全部 skills 文档/模板/references/evals 新增段落、双语 README、manifests 与 guardrail 改动，术语逐一对照 spec 术语表（中文侧 avoid 词零误用，英文侧 bundled 已上报），并独立重跑 node --test scripts/tests/*.test.mjs（33 pass）与 visual-path.test.sh（PASS）；未覆盖：vendored 上游原文（sequential-thinking SKILL.md 正文、think.ts、LICENSE）按设计视为快照仅作镜像一致性抽查，维度 A 的功能/边界 bug（如 normalize 的 string-replace $ 转义、--feature-dir 缺 --project-dir 时的空前缀路径）与 pi/grok/Codex 实装行为未在本维度深查。

- **B2-dry**:已覆盖：全部 scripts/*.mjs 新增/修改（doctor/update-vendored-skill/validate-output/check-plugin/release/check-openai-sync 对照 install/session-context 的重复面）、hooks.json 与三 manifest+package.json、guardrail 双模板、全部 13 个 skill 的 SKILL.md/references/assets diff（搜索条款 10 副本 md5 比对、披露条/命名规则/阈值/progressive 双文档锚定核对）、9 个新测试脚本、并实测运行了 plan-index/agent-plugin-1.0.0 校验与 doctor --json；未覆盖：vendored 上游正文（anysearch SKILL.md 正文、sequential-thinking SKILL.md/example-session.md 为上游原文未逐行审）、README 双语全文仅抽查 MCP 清理与版本同步段、未变更的既有文件（check-spec-drift.mjs/validate-skills.mjs）仅作为重复对照读取。

- **C1-conventions**:已覆盖 C1 全部五项：五处 manifest 版本一致（均 7.21.6，check-plugin.mjs 校验五处、release.mjs 同步 bump 五处、scripts/tests/manifests.test.mjs 断言五处一致），marketplace.json skills[] 与 skills/ 目录双向一致（13/13，含 test-strategy 与 sequential-thinking），根 plugin.json 通过 vendored 官方 AP 1.0.0 schema 校验（$schema const 精确匹配）；evals/trigger-evals JSON 结构逐文件比对既有惯例；openai.yaml interface+policy 键结构核验（check-openai-sync 13 skill 通过）；测试命名与放置（8 个 *.test.mjs + 计划内 visual-path.test.sh，node 测试 33/33 与 shell 测试独立复跑均通过）；提交信息 T1-T25 feat(TN)/T26 fix(TN) 全合规。未覆盖：.spec-dev 计划/spec 文档不在本次 diff 内（main 上已提交）；两处范围外观察——计划验收门命令 `node --test scripts/tests/`（目录形式）在当前 Node v22.22.2 下报 MODULE_NOT_FOUND（目录参数不再被扫描，需用 `node --test 'scripts/tests/*.test.mjs'`），以及 T1 之

- **C2-abstraction**:已按 5 个指定锚域逐锚 rg 核对：1) 命名规则在 ra:109/111/183、writing-plans:22/35、executing-plans:35、spec-template:1、roadmap-template:1、两 snippet 双语行表述一致（阈值外错漏另报），兼容读取语义确认仅在 executing-plans+snippet 集中声明（grandfather 属 ra:183 创建侧，符合计划），模板对「阶段 6」的指锚经标题结构核实有效；2) test-strategy 四个正向挂载（writing-plans:66、acceptance-qa:71/187、acceptance-matrix:36/39、spec-template:111）与 SKILL.md:45-47 三个反向分工角色双向可达，db/frontend/ai-agent 三份 references 均存在、无悬空；3) clarifying:27 第 0 条三段 ↔ ra:139、quick-fix:54 锚定语、exploring:24 开场披露措辞一致，核心纪律七条、分界「嵌套而非对立」（clarifying:52/exploring:27）三条件判定均吻合 spec；4) 阈值（>8/25KB）、导航表四列、T\\d\\d、progress.yaml 键（format_version/current/tasks.{status,commit,tests,deviations}/resources/notes）与状态枚举在 progressive-plan-format/