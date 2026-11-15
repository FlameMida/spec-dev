# spec-dev 仓库说明（给 AI 代理）

spec-dev 是给 AI 编程代理用的插件：`skills/` 下 13 个 skill、`commands/` 下 3 个命令、`guardrail/` 的 spec 漂移守卫，以及 `scripts/` 的校验与发版脚本。仓库根就是插件根；`main` 是源码，`dist` 分支由 CI 在打 tag 后生成，不手改。

## 命令

| 用途 | 命令 |
|---|---|
| 全量测试（约 15 秒） | `npm test` |
| 单个测试文件 | `node --test scripts/tests/<名称>.test.mjs` |
| 静态校验 | `node scripts/check-plugin.mjs`、`node scripts/validate-skills.mjs --size-only`、`node scripts/check-openai-sync.mjs` |
| 启用本仓库的 Git hooks | `node scripts/install-git-hooks.mjs` |

改动后运行 `npm test` 和静态校验，在回复里给出实际输出。测试失败时修改动，不改已有断言；确实要改变被断言的行为时，先向用户说明。发版（`scripts/release.mjs`）、打 tag 和推送只在用户明确要求时做。

## 约定

- **skill 只依赖 `skills/` 里的文件。** skill 文档里的链接不指向 `skills/` 之外，不写 `${CLAUDE_PLUGIN_ROOT}`；运行自己目录下的脚本写 `"${CLAUDE_SKILL_DIR}/..."`，带双引号。
- **一条规则只写在一处**，其他地方链接过去。宿主专有的工具名只出现在 `skills/requirement-analysis/references/host-compat.md`；各 skill 文首的“宿主适配”一行逐字相同，要改就一起改。
- **`SKILL.md` 小于 20000 字节。** 只在特定情况才用到的细节放进 `references/`。
- **改 `SKILL.md` 时一并检查同目录的 `agents/openai.yaml`。** pre-commit 要求两者一起暂存；description 没变时用 `SKIP_OPENAI_SYNC_CHECK=1` 提交。改了 description 还要同步 `evals/trigger-evals.json` 的 `description_under_test`。
- **两份 README 一起改。** `README.md` 与 `README.zh-CN.md` 内容对应。
- **不手改的内容**：`skills/anysearch/`（上游内嵌，用 `node scripts/update-vendored-skill.mjs --skill anysearch` 同步）、`skills/visual-preview/scripts/vendor/`、五处版本号和 CHANGELOG（由 `scripts/release.mjs` 更新）。
- **本仓库自己的 spec、计划和 ADR 在 `.spec-dev/`。** 行为变更在同一次改动里更新所属 spec。
- **提交信息**用 `类型(范围): 中文说明`，例如 `fix(quick-fix): …`。

## 容易出错的地方

- `scripts/tests/` 里有不少测试用正则断言 skill 文档的措辞。改文字前先 `rg` 一下要改的短语，看有没有测试依赖它。
- 在 `skills/` 或 `commands/` 的文档里写 `node scripts/...` 这类裸路径命令会让 `plugin-root.test.mjs` 失败。
- 新增 skill 要同时登记 `.claude-plugin/marketplace.json` 的 `skills[]`、补 `agents/openai.yaml`、更新两份 README 的目录结构。
- `status` 默认只执行 `git rev-parse` 和 `git worktree list`，有测试保证这一点；需要读提交历史的功能做成显式选项。
- `evals.json` 没有运行器，只是设计意图说明。测试全过只说明结构和措辞没坏，不说明模型行为没变。

同一个错误出现第二次时，把纠正办法补进本节。
