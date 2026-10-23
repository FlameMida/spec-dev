# 按实际模型启用协作增强 / Model-scoped collaboration

行为规则只有一份：[model-collaboration.md](../skills/requirement-analysis/references/model-collaboration.md)。增强将目标理解、必要工作、独立判断、局部阻塞、恢复与交付遗漏检查接入现有阶段，不增加审批门，也不自动扩大授权。

## 启用范围

| 实际模型 / Resolved model | 任意已适配宿主 / Supported host |
|---|---|
| GPT / Codex | 启用 / enabled |
| Kimi / Moonshot / GLM | 启用 / enabled |
| Claude（含 Opus / Sonnet / Haiku / Fable 别名） | 排除 / excluded |
| 未识别 ID、缺失模型、损坏映射 | 不启用 / disabled |

Claude Code 和 Codex 是工具宿主，不是模型判据。脚本只消费宿主报告的 ID 及明确映射，不探测远端，不读取密钥，不根据 endpoint、工具名称或模型自称推断家族。新增家族需要更新解析器和用例，不把任意“非 claude 字符串”当成可启用模型。

Only the receiving agent's current `spec-dev collaboration: enabled` status activates the policy. Claude and unknown models remain excluded on both hosts. Authorization, design approval and task scope remain unchanged.

## 模型别名

Claude Code 报告 `sonnet` 等家族别名时，可读取对应 `ANTHROPIC_DEFAULT_SONNET_MODEL` 等映射；报告具体模型 ID 时，以该 ID 为准，不用启动时的 `ANTHROPIC_MODEL` 覆盖会话内切换结果。

代理把 Claude 名称映射到 Kimi/GLM 时，在**对应启动配置**中提供精确映射，例如：

```sh
export SPEC_DEV_MODEL_ALIASES='{"claude-sonnet-4-6":"glm-4.7","gateway-kimi":"kimi-k2.5"}'
```

这是 `原始模型 ID → 实际模型 ID` 的 JSON 对象，键区分大小写，支持链式别名并拒绝环。仅记录已确认的真实路由；不要把只适用于某个代理的映射设成所有宿主通用配置。endpoint 本身不足以确认模型，远端隐藏路由或每轮自动 fallback 无法由插件保证识别。

`SPEC_DEV_COLLABORATION=off` 可显式关闭；默认值为 `auto`，没有绕过 Claude 排除的 `on` 模式。非法配置按不启用处理。配置值不产生任何执行、发布或清理授权。

Use exact, launcher-scoped alias mappings for gateways. Hidden routing and unreported one-turn fallbacks are outside the adapter's visibility; there is no claim of backend attestation.

## 加载与切换

- Codex 0.164.0 须从 Git `dist` 安装：其源码 [loader.rs](https://github.com/openai/codex/blob/rust-v0.164.0/codex-rs/core-plugins/src/loader.rs#L973) 对 Agent Plugins 格式直接跳过 hooks。Git 包省略根级 plugin.json，通用归档仍保留该清单；只增加 extensions.com.openai.hooks 不能绕过这一版本的限制。Hook JSON 顶层使用 description/hooks，不能放入 $comment。
- 插件：Claude Code 使用 `hooks/hooks.json`；Codex 清单显式指向 `hooks/codex-hooks.json`。两份保留原 spec 流程提示，分别接入模型上下文。Hooks 须被宿主启用、允许或信任；安装成功不等于 hook 已执行。
- 仓库安装器：`node guardrail/install.mjs --repo <目标仓库>` 复制脚本和规则副本，幂等合并两端 hooks。副本来自唯一规则文件，更新插件后重新运行安装器更新。增强不新增 git/Stop 闸门。
- 新项目：模型上下文与原 `session-context.mjs` 的 spec 发现独立；没有 Git/spec 也能启用。
- Claude Code：`SessionStart.model` 建立本代理状态，`PostModelSwitch.to_model` 更新；`UserPromptSubmit` 仅复用同一代理已观察状态。`PostModelSwitch` 需要 2.1.251+，较旧宿主不能保证会话内切换及时生效，应关闭增强或升级后使用。
- Codex：启动及每次 `UserPromptSubmit` 都按 hook 的 `model` 重新判断；缺失时不沿用旧启用状态。
- 压缩恢复：重新注入完整规则，不使用原 spec notice 的 60 秒去重窗口。Claude 的 compact 事件缺模型时可消费同一会话已观察状态；startup/resume/clear/fork 缺模型时不推定旧模型仍有效。
- 停用：切回 Claude 或模型变成未知时发送停用标记。历史文本不能从对话中删除；标记使先前增强失效，不撤销原用户请求和项目约定。

官方接口依据：[Claude hooks](https://code.claude.com/docs/en/hooks#common-input-fields)、[Claude 模型切换](https://code.claude.com/docs/en/hooks#postmodelswitch)、[Codex hooks](https://learn.chatgpt.com/docs/hooks)、[Codex 插件 hooks](https://developers.openai.com/plugins/build/plugins)。这些是接口依据，不是所有宿主版本的运行证明。

## 子代理

主代理与子代理使用独立状态。`SubagentStart` 有本子代理实际模型时独立判定；没有时输出该子代理的停用标记，不照搬父代理启用结论。Claude Code 当前 `SubagentStart` 契约不提供模型，因而此路径保守不启用；不能把 Agent 的请求模型或 `model: inherit` 当作实际解析结果。宿主提供可核验的子代理模型后再按相同解析器启用。

派发内容若带有增强正文，必须保留其模型/角色适用条件。子代理的完成目标始终是获派任务，不是整个主线程项目。

Subagents never inherit activation from the parent. Claude Code's model-less `SubagentStart` cannot establish child identity, so it is conservatively disabled. Hosts supplying child identity evaluate every child separately.

## 诊断与验证

`--explain` 从 stdin 接收 hook JSON，只报告判定与原因，不写缓存或注入规则：

```sh
printf '%s\n' '{"session_id":"diagnostic","hook_event_name":"SessionStart","source":"startup","model":"glm-4.7"}' | node guardrail/model-context.mjs --host claude --explain
node --test scripts/tests/model-collaboration.test.mjs
```

缓存默认位于系统临时目录的 `spec-dev-collaboration-<uid>/`，按宿主、会话和代理隔离，目录 0700、文件 0600；只保存模型和注入状态，不保存用户消息、目标或任务完成状态。`SPEC_DEV_COLLABORATION_STATE_DIR` 可指定独立缓存位置。不可写或缺失状态不阻断任务，但缺模型事件不能凭空启用。删除缓存后由下一次带模型信息的事件恢复。

`node scripts/check-plugin.mjs --codex-validate` 在隔离安装后读取真实 Codex 的 hooks/list 和 plugin/read，要求四个 hooks 被运行时与插件页一致识别且保持未信任；不发起模型请求或修改用户的 hook 信任。CLI/配置测试另验证模型路由、切换、恢复、安装副本与分发完整性。真实模型评测应另行对照首次交付、重复提问、目标遗漏、局部阻塞与越界情况；文件/测试通过不证明模型理解能力改善。
