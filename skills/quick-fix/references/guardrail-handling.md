# 契约不变修复的守卫处理

> 阅读时机：命中相关编辑或提交守卫后，首次受影响动作之前；不用摘要代替完整机制。

### 步骤 5b：TDD 修复 + trailer 放行（契约不变）

- **强制 TDD** 同 5a。
- **不改 spec**（契约没变，spec 没说谎）。
- **提交按守卫安装情况分两种**：
  - 改动**未命中**任何 active spec 的 covers → 普通提交即可，无需环境变量或 trailer。
  - 改动**命中**某 active spec 的 covers → 提交用 `SPEC_DEV_GUARD=off git commit` 执行（该环境变量注入 commit 进程，令其 pre-commit 的提交期 `--staged` 闸放行——`--staged` 不识别 trailer，只认这个变量），并在 message 留 `Spec-Guard: off <原因>` trailer（trailer 才是 pre-push 与 CI 区间闸的放行凭证）。环境变量管本地提交期闸、trailer 管 push/CI 区间闸，二者配合、缺一不可。
- **编辑期 hook 单独处理**：装了 guardrail 编辑期 hook（`--hook`）的仓库，因 hook 只认"文件是否命中 covers"、不认"契约是否改变"，用 Edit 类工具改 covers 覆盖文件会在**编辑动作发生时**就被拦。机制事实（决定放行手段）：编辑闸只检查**工具载荷里的文件路径字段**（Claude 只匹配 Edit/Write/NotebookEdit；Codex 虽匹配全部工具，但 shell 载荷提取不出文件路径），且 hook 进程的环境变量由平台设定——**给写入命令加 `SPEC_DEV_GUARD=off` 前缀影响不到 hook 进程，不是放行手段**。被拦时向用户说明"这是契约不变的内部修复"，经确认后二选一：
    - **改用 shell 写入落盘改动**（agent 可自主执行；编辑闸天然不检查 shell 写入）。注意 Claude 的 Stop 收尾审计仍会对工作区漂移拦一次——说明后继续即可，本分支的 `SPEC_DEV_GUARD=off git commit` 完成后工作区变干净、审计自然通过。Codex 无 Stop 审计，此路径在 Codex 侧编辑期零拦截，更要靠 trailer 留痕。
    - **请用户在会话/hook 进程环境层面设 `SPEC_DEV_GUARD=off`**（能同时覆盖编辑闸与 Stop 审计；需在启动会话的环境中设置，用完即撤，避免长期关闸）。

    **不静默绕过、不伪造 spec 同步。**
