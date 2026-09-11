# 输出契约与校验

> 阅读时机：接收需要契约校验的结果前。

## 输出契约与校验

本节是全部子代理输出契约（exploration-report / review-findings / acceptance-check-items）失败处置与降级规则的定义点，其他 skill 以 gist + 指针引用。通用规则：

- 校验失败 → 把 errors 清单发回该子代理补全一次 → 再失败由主线程接管该子代理负责的范围（模态 / 维度 / 检查项）
- 校验器不可用（node 缺失或插件根无法定位）→ 主线程按对应 schema（`scripts/schemas/<name>.json`）人工核对必填键与 `coverage_note` 非空，并在报告注明"契约校验降级"

**requirement-analysis deep 档实例**：每个 code-explorer 输出 exploration-report 契约 JSON 落盘，逐份校验：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" exploration-report <file>
```

- 主线程合并去重：同一文件被多模态命中是信号而非冗余——标记为高置信关键文件

light/standard 档不要求契约 JSON，子代理按其自身定义的 markdown 报告格式返回即可。

---
