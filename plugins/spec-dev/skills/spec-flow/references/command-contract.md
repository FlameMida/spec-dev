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

## Output Contract

- 成功时输出 JSON，至少包含 `ok: true`、`command` 和核心结果字段。
- 失败时输出 JSON，至少包含 `ok: false`、`command`、`message`，并以非零退出码结束。
