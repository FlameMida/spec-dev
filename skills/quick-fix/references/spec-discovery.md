# Spec 发现与时效

> 阅读时机：嫌疑改动范围确定后，反查适用契约之前。

- **spec 反查**（防漂移的第一道视野拉入）：用嫌疑改动文件反查哪些 spec 拥有它。发现范围**必须与守卫逐字对齐**——Grep 这五条 glob：`.spec-dev/**/spec/*-design.md`、`.spec-dev/**/*-design.md`、`docs/**/spec/*-design.md`（历史位置）、`docs/**/*-design.md`（历史位置）、`.specs/**/*.md`，解析各文件 frontmatter，按 `covers` glob 命中嫌疑文件筛出相关 spec 并读取其 `status`——active 的把相关 Requirement/Scenario 读入上下文，其余状态按下述时效处理分流。**命中 spec 的时效处理**：status 为 `superseded` 的沿其 frontmatter `superseded_by` 跳转至 active 后继（跳转记录已访问路径集合，出现环即停下向用户报告环上文件清单；`superseded_by` 缺失或指向不存在的文件时按无后继处理——向用户报告并仅作历史参考，不阻塞修复）；正文带 `Superseded-pending` 标注的，以其指向的新 spec 为新工作依据、旧文为已实现行为描述，两者并陈说明。被 `Superseded` 标注的 Requirement 不作为"实现偏离 spec"的修复判据；诊断存量行为时可将已取代契约作为历史参考读取——排障允许读旧契约，修复方向以现行契约为准。同一行为面出现两份 active spec 矛盾且互无取代声明时，列出双方交用户裁决（此即升级门信号之一）。命中 `docs/` 历史位置的 spec-dev 产物时，默认先自动迁移到 `.spec-dev/`（有 `scripts/spec-dev/migrate-to-spec-dev.mjs` 则运行之，否则 `git mv` 等效迁移）并单独提交，再继续修复。这一步同时服务根因分析（spec 写着预期行为，帮判断是"实现偏离 spec"还是"spec 本身写错了"）。

- **不硬依赖 guardrail**：反查是本 skill 的指令层动作（纯 Grep + 读 frontmatter），不要求目标仓库装过 `check-spec-drift.mjs`；若恰好装了（`scripts/spec-dev/check-spec-drift.mjs` 存在），可顺带 `node scripts/spec-dev/check-spec-drift.mjs --files <改动文件>` 复核，属优雅降级。
