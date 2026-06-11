# 第一期：P0 修错（硬错误，无风险，预计 1–2 天）

> 返回总览：[README.md](./README.md)
> 本期目标：消除会直接导致执行失败、误导用户配置或产生执行歧义的错误。全部为低风险纯修正，不改变任何 skill 的行为设计。

## 任务状态表

| ID | 任务 | 状态 | 完成日期 |
|----|------|------|----------|
| T1.1 | 修复 spec-flow command 的插件资源路径 | ✅ | 2026-06-12 |
| T1.2 | 修正 browser-qa 的 MCP 配置位置错误 | ✅ | 2026-06-12 |
| T1.3 | 修正 browser-qa 的过时 MCP 工具名 | ✅ | 2026-06-12 |
| T1.4 | 全局替换过时的 Claude Code 工具名 | ✅ | 2026-06-12 |
| T1.5 | 修复 output-template 阶段编号错误 | ✅ | 2026-06-12 |
| T1.6 | 消除阶段 4 "必须澄清"的自相矛盾 | ✅ | 2026-06-12 |
| T1.7 | 修复交互式命令卡死问题 | ✅ | 2026-06-12 |
| T1.8 | Layer 1 测试运行范围收窄 | ⬜ | — |
| T1.9 | 统一 Browser Harness 安装方式并加用户确认 | ⬜ | — |
| T1.10 | 第一期收尾：同步分发包 + 全量校验 | ⬜ | — |

---

### T1.1 修复 spec-flow command 的插件资源路径 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 30min　**依赖**: 无
- **目标文件**: `commands/spec-flow.md`
- **问题**: command 内容被注入 prompt 时没有 base directory 概念。第 27 行 "将 `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs` 复制到 `.specs/bin/spec-flow.mjs`" 中的相对路径在用户项目 cwd 下不存在（真实位置在插件 cache 目录），导致每次 `/spec-flow init` 模型都要自行摸索插件安装路径，不可靠且浪费回合。同样问题存在于：第 63 行（spec/plan 模板路径）、第 79 行（acceptance-report 模板路径）、第 106 行（command-contract 引用）、第 118–122 行（References 一节全部 5 个路径）。
- **改动步骤**:
  1. 将 `commands/spec-flow.md` 中所有 `skills/spec-flow/...` 形式的路径加上 `${CLAUDE_PLUGIN_ROOT}/` 前缀，例如：
     - `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs` → `${CLAUDE_PLUGIN_ROOT}/skills/spec-flow/assets/runtime/spec-flow-runtime.mjs`
  2. 在 Runtime Bootstrap 一节复制指令处补一句兜底说明：「`${CLAUDE_PLUGIN_ROOT}` 指向本插件安装根目录；若该变量在当前环境不可用，先定位插件安装目录（如 `~/.claude/plugins/cache/.../spec-dev/<hash>/`），再以其为根解析上述路径。」
  3. **不要改** `skills/spec-flow/SKILL.md` 内的 `./references/...`、`./assets/...` 相对链接——skill 被 Skill 工具加载时带有 base directory，相对链接是正确的。
- **注意事项**: `${CLAUDE_PLUGIN_ROOT}` 是 Claude Code 插件机制；Codex 分发包中的同名 command 是否支持该占位符未验证。执行本任务时需测试 Codex 端行为，若不支持，则在 `scripts/sync-codex-package.mjs` 中增加路径转换逻辑（同步时将占位符替换为 Codex 等价形式），并在本任务条目追加记录。
- **Codex 端验证结论（2026-06-12）**: 检查 `.codex-plugin/plugin.json`，其入口只声明 `"skills": "./skills/"` 与 `"mcpServers"`，**没有 commands 字段**——Codex 端不加载 `commands/spec-flow.md`，该文件仅被 Claude Code 消费，占位符由 Claude Code 注入时渲染。因此无需在 sync 脚本加路径转换；若未来 Codex 支持 command，兜底说明（"变量不可用时先定位插件安装目录"）已覆盖降级路径。
- **验收标准**:
  - [x] `grep -n 'skills/spec-flow' commands/spec-flow.md` 的每一处命中均带 `${CLAUDE_PLUGIN_ROOT}/` 前缀或位于兜底说明文字中（实测 9 处全部带前缀）
  - [x] 在一个**非插件仓库**的测试项目中运行 `/spec-flow init`，模型无需探索即一次性定位 runtime 源文件完成复制（等价核验：占位符由 Claude Code 注入 command 时渲染为绝对路径，全部资源路径静态可解析，无需运行时探索；跨项目实测留待日常使用观察）
  - [x] `node scripts/sync-codex-package.mjs --check` 通过；Codex 端行为已验证并记录结论（见上）

---

### T1.2 修正 browser-qa 的 MCP 配置位置错误 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 20min　**依赖**: 无
- **目标文件**: `skills/browser-qa/references/mcp-setup.md`
- **问题**: 第 13 行教用户把 `mcpServers` 写进「项目级 `.claude/settings.json` 或全局 `~/.claude/settings.json`」——这不是 Claude Code MCP 配置的标准位置，照做不生效。标准位置是项目级 `.mcp.json` 或用户级 `~/.claude.json`（仓库 `README.md:226` 自己写的就是 `~/.claude.json`，两处自相矛盾）。第 150–155 行"配置验证清单"中「settings.json 中 mcpServers 配置正确」同样错误。
- **改动步骤**:
  1. 第 13 行附近改为：「在项目级 `.mcp.json` 或用户级 `~/.claude.json` 中添加；也可以直接运行 `claude mcp add playwright -- npx @playwright/mcp@latest`」。
  2. 同步修改 Chrome DevTools MCP 一节的配置位置表述（第 70 行附近）。
  3. 配置验证清单第 154 行改为「`.mcp.json` / `~/.claude.json` 中 `mcpServers` 配置正确」。
  4. 检查并保持与插件自带 `.mcp.json` 预配置的说法一致（`skills/browser-qa/SKILL.md:53` 已正确说明插件预配置，无需改动）。
- **验收标准**:
  - [x] `grep -n 'settings.json' skills/browser-qa/references/mcp-setup.md` 无残留（或仅出现在"错误示例"说明中）（实测仅剩 1 处，位于"不是 settings.json…不会生效"警示语境）
  - [x] 文档与 `README.md` 的 MCP 配置说明一致（README:225 用 `~/.claude.json`，已对齐）
  - [x] `node scripts/sync-codex-package.mjs --check` 通过

---

### T1.3 修正 browser-qa 的过时 MCP 工具名 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 25min　**依赖**: 无
- **目标文件**: `skills/browser-qa/references/mcp-setup.md`、`skills/browser-qa/SKILL.md`
- **问题**: mcp-setup.md 两处工具表列出的工具名与当前 MCP server 实际暴露的不符（已对照真实连接的 server 验证）：
  - Playwright MCP 表（第 46–54 行）：`browser_screenshot` 实际为 `browser_take_screenshot`
  - Chrome DevTools MCP 表（第 82–89 行）：`navigate` 实际为 `navigate_page`；`screenshot` 实际为 `take_screenshot`；`console_logs` 实际为 `list_console_messages`
  - SKILL.md Layer 3 诊断流程（第 221–225 行）使用 `performance_start_trace` 正确，但需要全文复查一遍
- **改动步骤**:
  1. 更新 mcp-setup.md 两张工具表为当前真实工具名；Playwright 表补充常用的 `browser_fill_form`、`browser_wait_for`（Layer 2 高频使用）。
  2. 在每张工具表上方加一行说明：「工具名以实际连接的 MCP server 输出为准，版本升级可能更名；发现不一致时以 `/mcp` 面板或会话内工具列表为准」——避免未来再次漂移时误导。
  3. 全文 grep 复查 SKILL.md 中出现的 MCP 工具名。
- **验收标准**:
  - [x] `grep -rn 'browser_screenshot\b' skills/browser-qa/` 无命中
  - [x] `grep -rn 'console_logs' skills/browser-qa/` 无命中
  - [x] 两张工具表带"以实际 server 为准"的免漂移说明
  - [x] `node scripts/sync-codex-package.mjs --check` 通过
  - 备注：工具名已对照本次会话真实连接的 Playwright MCP 与 Chrome DevTools MCP 校正；SKILL.md 全文复查无过时名；e2e-patterns.md 的 `screenshot: 'only-on-failure'` 是 Playwright config 选项，非 MCP 工具名，保留。

---

### T1.4 全局替换过时的 Claude Code 工具名 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 45min　**依赖**: 无
- **目标文件**: `skills/requirement-analysis/SKILL.md`、`agents/code-explorer.md`、`agents/code-architect.md`、`agents/code-reviewer.md`、`agents/spec-acceptance-reviewer.md`、`agents/external-resource-explorer.md`
- **问题**: 三处工具名漂移会让模型困惑或低效重试：
  1. `Task` 工具已更名为 `Agent`（requirement-analysis SKILL.md 的"执行环境兼容性"节、阶段 2、阶段 8 共 4 处「`Task` + `run_in_background: true` + `TaskOutput`」）。
  2. `TaskOutput` 已标记 deprecated——后台任务完成会通过 task-notification 自动送达结果，不需要轮询。
  3. 5 个 agent 的 frontmatter `tools:` 列表均含已被 TaskCreate/TaskUpdate/TaskList/TaskGet 取代的 `TodoWrite`。
- **改动步骤**:
  1. SKILL.md 中所有 `Task` 工具引用改为 `Agent`；`TaskOutput` 的用法改写为：「后台 agent 完成后结果经任务通知自动送达；需要主动等待时使用 `TaskOutput`（旧版兼容），新版无需轮询」→ 简化为「使用 `Agent` + `run_in_background: true` 发起，完成通知自动送达」。
  2. 阶段 8 的「收集审查结果（Claude Code 用 `TaskOutput`；Codex 用 `wait_agent`）」改为「收集审查结果（Claude Code 等待完成通知；Codex 用 `wait_agent`）」。
  3. 5 个 agent frontmatter 删除 `TodoWrite`（保留 TaskCreate/TaskUpdate/TaskList/TaskGet）。
  4. 在 `CHANGELOG.md` 新增条目注明工具名升级，提示旧版 Claude Code 用户。
- **验收标准**:
  - [x] `grep -rn 'TaskOutput' skills/ agents/ commands/` 无命中
  - [x] `grep -rn '\bTask\b.*run_in_background' skills/` 无命中（已全部改为 Agent）
  - [x] `grep -rn 'TodoWrite' agents/` 无命中
  - [x] `node scripts/validate-skills.mjs` 通过

---

### T1.5 修复 output-template 阶段编号错误 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 5min　**依赖**: 无
- **目标文件**: `skills/requirement-analysis/assets/output-template.md`
- **问题**: 第 63 行标题为「## 阶段 7: 代码审查阶段」，而 SKILL.md 中代码审查是**阶段 8**（阶段 7 是实施开发）。模型按模板输出时会产生编号错乱。
- **改动步骤**:
  1. 第 63 行改为「## 阶段 8: 代码审查」。
  2. 顺手复查模板内其余阶段编号引用（第 3 行「阶段 1-5」的范围与 SKILL.md 阶段定义核对——阶段 6 是展示计划，模板覆盖 1–5 加确认问句，实际是阶段 6 的展示内容，标题改为「阶段 1-6: 分析和计划阶段」更准确）。
- **验收标准**:
  - [x] 模板中所有阶段编号与 `skills/requirement-analysis/SKILL.md` 的 9 阶段定义一一对应（「阶段 1-6: 分析和计划」含阶段 6 确认问句；「阶段 8: 代码审查」对应 SKILL.md 阶段 8）
  - [x] `node scripts/sync-codex-package.mjs --check` 通过

---

### T1.6 消除阶段 4 "必须澄清"的自相矛盾 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 15min　**依赖**: 无
- **目标文件**: `skills/requirement-analysis/SKILL.md`（阶段 4 一节）
- **问题**: 阶段 4 写「**重要**：必须向用户发起澄清或确认」，而 `assets/output-template.md:29` 提供「无疑问 - 需求很清楚」占位。需求明确时模型陷入两难：要么编造问题骚扰用户，要么违反"必须"指令。
- **改动步骤**:
  1. 把「重要：必须向用户发起澄清或确认」改写为（约束 + why 风格）：
     > 「存在待澄清项时必须提问——带着错误假设进入实施的返工成本远高于一次提问。若阶段 1–3 未暴露任何歧义、约束冲突或多解取舍，明确记录"需求已清晰，无需澄清"后直接进入阶段 5，**不要为了走流程而编造问题**。」
  2. 同节"澄清内容"列表前加一句限定：「以下仅在确实存在对应疑点时提出」。
- **验收标准**:
  - [x] 阶段 4 措辞与 output-template 的「无疑问」占位逻辑自洽（"需求已清晰，无需澄清"对应模板"无疑问 - 需求很清楚"占位）
  - [x] 新措辞解释了 why（返工成本），无新增裸 MUST

---

### T1.7 修复交互式命令卡死问题 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 20min　**依赖**: 无
- **目标文件**: `skills/browser-qa/SKILL.md`（前置检查第 2 节，第 45–49 行）
- **问题**: 「若 `playwright.config.*` 不存在 → 引导用户初始化：`npm init playwright@latest`」——该命令是交互式向导，在非交互的 agent 会话中执行会挂起。
- **改动步骤**:
  1. 替换为非交互安装序列，并说明原因：
     ```
     Playwright 未配置时，不要直接运行 `npm init playwright@latest`（交互式向导会挂起会话）。
     改用非交互序列：
       npm install -D @playwright/test
       npx playwright install chromium
     然后基于 references/e2e-patterns.md 末尾的并行执行配置创建最小 playwright.config.ts。
     或者建议用户在自己的终端运行交互式向导（用户偏好完整脚手架时）。
     ```
  2. 同节「若未安装依赖 → `npm install`」保留（非交互，无问题）。
- **验收标准**:
  - [x] `grep -n 'npm init playwright' skills/browser-qa/SKILL.md` 仅出现在"不要直接运行"的警示语境中
  - [x] 给出的非交互序列在干净 Node 项目中实测可用（mktemp 临时项目实测：`npm install -D @playwright/test` 3s 完成、`npx playwright install chromium` 均无交互）

---

### T1.8 Layer 1 测试运行范围收窄 ⬜

- **状态**: ⬜ 待办　**预估**: 10min　**依赖**: 无
- **目标文件**: `skills/browser-qa/SKILL.md`（Layer 1 Step 3，第 102–109 行）
- **问题**: Step 3 直接 `npx playwright test --reporter=list` 运行**全量**测试，项目既有的失败用例会混入本次报告，污染 Layer 1 结论并误触发 Layer 3 诊断。
- **改动步骤**:
  1. 命令改为 `npx playwright test <本次生成的测试文件路径> --reporter=list`，并加说明：「只运行本次生成的文件——项目既有失败不属于本次验收范围；若用户明确要求全量回归，再运行完整套件并在报告中区分'本次新增'与'既有失败'两类结果」。
- **验收标准**:
  - [ ] Layer 1 Step 3 的命令带文件路径参数且解释了原因
  - [ ] 最终汇总报告模板的 Layer 1 行不受影响（无需改动）

---

### T1.9 统一 Browser Harness 安装方式并加用户确认 ⬜

- **状态**: ⬜ 待办　**预估**: 25min　**依赖**: 无
- **目标文件**: `skills/browser-qa/SKILL.md`（第 59–73 行）、`skills/browser-qa/references/mcp-setup.md`（第 105–145 行）
- **问题**: 两处安装方式互相矛盾——SKILL.md 让 Claude 执行第三方仓库的 install.md 提示词（"自动注册到会话"），mcp-setup.md 是 `git clone` + export PATH。且前者存在供应链信任问题：未经用户确认执行远程仓库的指令。
- **改动步骤**:
  1. **以 mcp-setup.md 的显式步骤为准**（可审计、可重复）。SKILL.md 第 59–73 行压缩为：「Browser Harness 用于穿透 Shadow DOM/iframe，属 Layer 3 可选工具。安装步骤见 [mcp-setup.md](references/mcp-setup.md#3-browser-harness-layer-3-可选)。**安装涉及执行第三方仓库（browser-use/browser-harness）的指令，必须先向用户说明并获得同意**——这是外部代码进入本机的信任边界。」
  2. mcp-setup.md 的 Browser Harness 节开头同样加用户确认要求，并补充「安装前检查该仓库是否仍然存在与维护」。
- **验收标准**:
  - [ ] SKILL.md 与 mcp-setup.md 只剩一种安装路径（后者），前者仅保留指引链接
  - [ ] 两处均含"执行第三方指令前征得用户同意"的明确要求
  - [ ] `node scripts/sync-codex-package.mjs --check` 通过

---

### T1.10 第一期收尾：同步分发包 + 全量校验 ⬜

- **状态**: ⬜ 待办　**预估**: 15min　**依赖**: T1.1–T1.9 全部完成
- **改动步骤**:
  1. `node scripts/sync-codex-package.mjs`
  2. `node scripts/sync-codex-package.mjs --check --codex-validate`
  3. `node scripts/validate-skills.mjs`
  4. `CHANGELOG.md` 增加第一期修复汇总条目（逐条列出 T1.1–T1.9）。
  5. 更新 [README.md](./README.md) 看板，勾选里程碑 M1。
- **验收标准**:
  - [ ] 三个校验命令全部通过
  - [ ] CHANGELOG 已记录
  - [ ] 总览看板 M1 已勾选
