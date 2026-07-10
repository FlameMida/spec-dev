# 输出契约 Schemas

子代理（agent）输出的 JSON 契约定义。配合插件根 `scripts/validate-output.mjs` 做**确定性校验**——子代理输出落盘后由脚本校验，失败退回补全，而不是靠主进程模型目测。

## 用法

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs <schema-name> <json-file>
```

- `<schema-name>`：本目录下的文件名（不含 `.json`），如 `review-findings`
- `<json-file>`：子代理输出落盘的 JSON 文件路径
- 成功：stdout 输出 `{ok:true, schema, file}`，退出码 0
- 失败：stderr 输出 `{ok:false, schema, file, errors:[{path, expected, actual}]}`，退出码 1——把 `errors` 清单发回子代理补全一次；再失败由主进程接管

> `${CLAUDE_PLUGIN_ROOT}` 指向插件安装根目录；该变量不可用时，先定位插件安装目录再以其为根解析路径（Codex 端同理，skill 加载时以 skill base directory 推导插件根）。

## Schema 子集范围

只实现 JSON Schema 的以下关键字（够用即可，不实现完整规范）：

| 关键字 | 适用类型 | 说明 |
|--------|----------|------|
| `type` | 所有 | `object` / `array` / `string` / `number` / `boolean` |
| `required` | object | 必填字段名数组 |
| `properties` | object | 子字段 schema（递归） |
| `items` | array | 数组元素 schema（递归） |
| `enum` | 所有 | 枚举值数组 |
| `minimum` / `maximum` | number | 数值范围 |
| `minItems` / `maxItems` | array | 数组长度范围 |
| `minLength` | string | 字符串最小长度（`minLength: 1` 即禁止空串） |
| `if` / `then` / `else` | 所有 | 条件校验：`if` 子 schema 通过则应用 `then`，否则应用 `else`；子 schema 需显式写 `type` |

## 契约清单

| Schema | 用途 | 生产方 | 消费方 |
|--------|------|--------|--------|
| `exploration-report` | 探索报告 | code-explorer | requirement-analysis 阶段 2（deep 档 multi-modal sweep） |
| `review-findings` | 审查发现 | code-reviewer | executing-plans 收尾审查编排 |
| `acceptance-check-items` | 验收检查项 | acceptance-qa（Tier A 为主，D/X 结论并入） | 验收编排与复核、executing-plans 收尾审查 |

每个契约的 `coverage_note` 一律必填且非空——这是「no silent caps」纪律的落点：截断/未覆盖范围必须显式声明，不允许静默缩水。`acceptance-check-items` 另以 `if/then` 强制：`result` 为 `pass`/`fail` 的检查项，`evidence_ref` 不允许空串——没有证据就标 `unverified`，而不是通过。

## 新增 schema 的步骤

1. 在本目录创建 `<name>.json`，只使用上表关键字；
2. 顶层必须是 `{"type": "object", "required": [...], "properties": {...}}`；
3. 若输出可能被截断或缩小范围，加入必填的 `coverage_note: {"type": "string"}`；
4. 构造 1 个合法 + 若干非法样例，用 validate-output.mjs 跑通后再在 skill 文档中引用；
5. 在上方契约清单表中登记用途与消费方。
