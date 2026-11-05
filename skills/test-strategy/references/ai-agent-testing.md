# AI Agent 测试处方（eval 分级细则）

> **阅读时机**：被测系统含 LLM/Agent 行为、spec 验收矩阵含 eval 行时加载。

## AI Agent 测试骨架（模型边界是唯一不可逆决策）

一根窄接口隔离模型，模型是它之外唯一的依赖；边界以下全确定性：

- L0 静态 + 工具 JSON Schema 校验（schema 漂移是工具类头号故障）
- L1 harness 单测（fast）：fake model 按序弹响应；测循环控制、路由、重试、预算、护栏
- L1.5 prompt 快照（fast）：快照装配后的最终 prompt（确定性），不是模型输出
- L2 工具契约（fast）：工具=普通函数单测
- L3 回放（fast）：录制回放（脱敏），周期性重录
- L4 廉价模型冒烟（manual，仅 agent 相关变更且有明确授权）：小模型 + 严格 schema 断言
- L5 完整 eval（manual）：真实模型、多 trial、pass^k、按维度隔离 judge

断言纪律：`temperature=0` 不是确定性——断言面向结构与 schema，永不面向精确文本；评结果不评路径（精确工具序列断言脆弱）。

## eval 细则

- **grader 分级**：确定性优先（end-state 断言、工具调用形状、直接跑测试套件）→ LLM judge 只兜主观余量（每维度独立 judge、给 Unknown 出口、与人工标注校准）→ 评结果不评路径。
- **pass@k vs pass^k**：一次成功即可（生成类）用 pass@k；一致性要求（k 次全过）用 pass^k——单次 75% 时 pass^3≈42%，单跑 eval 全是噪声，20-50 任务起步。
- **golden 数据集是代码**：文件化进仓库走 PR；回归套件（应近 100%）与能力套件（应从低分爬坡）分开维护。
- **Lane 归属**：L0-L3 fast、L4/L5 manual；执行条件与交付必需程度沿 [验证归属](verification-scope.md)，必需项未验证时保持未完成，不因 manual 自动放行。
