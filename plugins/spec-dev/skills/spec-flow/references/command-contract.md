# Runtime Command Contract

工作区 runtime 的固定路径是 `.specs/bin/spec-flow.mjs`。

始终使用：

```bash
node .specs/bin/spec-flow.mjs <command> [flags]
```

## Commands

### `init`

初始化 `.specs/` 目录和 `registry.json`。

```bash
node .specs/bin/spec-flow.mjs init
```

### `new`

创建新 spec。

```bash
node .specs/bin/spec-flow.mjs new \
  --title "用户认证系统" \
  --domain software \
  --mode active
```

可选参数：

- `--mode active|draft`

### `status`

查询一个 spec 或全部活跃 spec。

```bash
node .specs/bin/spec-flow.mjs status
node .specs/bin/spec-flow.mjs status --spec-id spec-20260409-001
```

### `checkpoint`

更新当前 action、运行态和进度。

```bash
node .specs/bin/spec-flow.mjs checkpoint \
  --spec-id spec-20260409-001 \
  --action implement \
  --run-state in_progress \
  --current-step B.3 \
  --completed-steps A.1,A.2,B.1,B.2 \
  --completion-percent 45 \
  --resume-action implement \
  --resume-step B.3
```

可选参数：

- `--blocked-reason "..."`  
- `--last-command "/spec-flow implement spec-20260409-001"`
- `--evidence "<desc>::<path-or-command>"`（可重复）——把可验证证据登记进 `progress.evidence[]`，每条记录 `{step, desc, ref, at}`，`step` 取当前 `currentStep`。示例：

```bash
node .specs/bin/spec-flow.mjs checkpoint \
  --spec-id spec-20260409-001 \
  --evidence "B.3 单测通过::npm test 输出见 .specs/active/spec-20260409-001/evidence/b3-test.txt" \
  --evidence "B.3 构建通过::npm run build 退出码 0"
```

### `amend`

记录一次 spec 变更并自动升版。

```bash
node .specs/bin/spec-flow.mjs amend \
  --spec-id spec-20260409-001 \
  --type major \
  --summary "调整索引策略" \
  --reason "实施中发现原方案不适配多租户查询" \
  --approved-by-user true
```

### `accept`

写入验收结果。

```bash
node .specs/bin/spec-flow.mjs accept \
  --spec-id spec-20260409-001 \
  --result pass \
  --report-path .specs/active/spec-20260409-001/acceptance-report.md
```

结果值：

- `pass`
- `changes_required`
- `blocked`

### `archive`

归档单个 spec。

```bash
node .specs/bin/spec-flow.mjs archive \
  --spec-id spec-20260409-001
```

可选参数：

- `--force`
- `--summary-path .specs/active/spec-20260409-001/archive-summary.md`

### `resume`

返回恢复建议。

```bash
node .specs/bin/spec-flow.mjs resume
node .specs/bin/spec-flow.mjs resume --spec-id spec-20260409-001
```

### `doctor`

检查 registry 与 `.specs/active|archive` 实际目录的一致性。默认只读；`--fix` 只执行安全修复。

```bash
node .specs/bin/spec-flow.mjs doctor          # 只读检查，输出 issues 清单与建议
node .specs/bin/spec-flow.mjs doctor --fix    # 安全修复（drift 回写 + 孤儿目录重建）
```

检查项（6 类）：registry 记录的目录缺失、status 与目录位置不一致、progress.json 缺失、progress.json 损坏、registry 与 progress 字段漂移（currentAction/runState/status/version）、验收报告路径失效、孤儿目录（目录存在但 registry 无记录）。

`--fix` 仅修复两类**安全项**：字段漂移以 progress.json 为准回写 registry（progress 更接近执行现场）；带合法 progress.json 的孤儿目录按其内容重建 registry 条目。目录缺失、文件损坏、报告缺失一律不自动修，输出人工处理建议——自动"修复"这些场景等于掩盖数据丢失。

## Output Contract

- 成功时输出 JSON，至少包含 `ok: true`、`command` 和核心结果字段。
- 失败时输出 JSON，至少包含 `ok: false`、`command`、`message`，并以非零退出码结束。

## Timestamps

- spec-id 中的日期戳（`spec-YYYYMMDD-NNN`）使用**本地时区**日期——符合用户对"今天创建的 spec"的直觉。
- `createdAt`、`updatedAt` 等时间戳字段为 **UTC ISO 8601** 格式。
- 两者基准不同是有意为之，跨时区协作时以 ISO 时间戳为准。

## Concurrency

runtime 无文件锁，设计为**单会话顺序调用**。多会话并行写同一 `.specs/` 可能丢失更新（后写覆盖先写）；跨会话场景先运行 `status` 确认无其他活跃会话再操作。
