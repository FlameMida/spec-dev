# AI Agent 测试处方（eval 分级细则）

> **阅读时机**：被测系统含 LLM/Agent 行为、spec 验收矩阵含 eval 行时加载。

- **grader 分级**：确定性优先（end-state 断言、工具调用形状、直接跑测试套件）→ LLM judge 只兜主观余量（每维度独立 judge、给 Unknown 出口、与人工标注校准）→ 评结果不评路径。
- **pass@k vs pass^k**：一次成功即可（生成类）用 pass@k；一致性要求（k 次全过）用 pass^k——单次 75% 时 pass^3≈42%，单跑 eval 全是噪声，20-50 任务起步。
- **golden 数据集是代码**：文件化进仓库走 PR；回归套件（应近 100%）与能力套件（应从低分爬坡）分开维护。
- **确定性纪律**：断言结构与 schema、永不断言精确文本；快照只快照装配后的 prompt。
- **Lane 归属**：L0-L2 fast、L3 fast/PR、L4 PR（仅 agent 变更触发）、L5 nightly 永不阻塞 PR。
