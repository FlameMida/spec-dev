# 查找相关 spec

> 阅读时机：确定了可能要改哪些文件之后、判断修复是否改变 spec 行为之前。

用可能要改的文件去找管着它们的 spec。spec 写着预期行为，可以用来判断是实现偏离了 spec，还是 spec 本身写错了。

1. 在这五个位置找 spec。范围必须与漂移守卫一致，一条不能少：`.spec-dev/**/spec/*-design.md`、`.spec-dev/**/*-design.md`、`docs/**/spec/*-design.md`（旧位置）、`docs/**/*-design.md`（旧位置）、`.specs/**/*.md`。
2. 读每份的 frontmatter，留下 `covers` 匹配到待改文件的 spec，按 `status` 分别处理：
   - `active`：读相关的 Requirement 和 Scenario，作为现行行为的依据。
   - `draft`：它对应的功能还在实施或尚未交付，不是现行行为的依据。告诉用户这些文件有一份进行中的 spec。
   - `superseded`：沿 `superseded_by` 找到 active 的后继，记下走过的路径。出现环就停下，把环上的文件列给用户；指针缺失或指向不存在的文件时告诉用户，这份只作历史参考，不阻塞修复。
3. 标了 Superseded 的 Requirement 不能用来判定“实现偏离 spec”。排查旧行为时可以读它，修复方向以现行 spec 为准。
4. 正文里有早期版本留下的 `Superseded-pending` 标注时：新工作以它指向的新 spec 为依据，旧文只说明已经实现的行为，两者都告诉用户。
5. 两份 active spec 对同一行为的规定矛盾、又没有取代声明：列出双方让用户决定。这是升级条件之一。
6. spec 在 `docs/` 旧位置时原地读写。修复不包含迁移目录；用户另外同意了迁移才迁。

项目装了守卫（`scripts/spec-dev/check-spec-drift.mjs` 存在）时，可以再运行 `node scripts/spec-dev/check-spec-drift.mjs --files <改动文件>` 复核；没装不影响以上步骤。
