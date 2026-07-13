# ADR 0002: quick-fix 做成独立 skill，而非 requirement-analysis 的执行档位

## 背景

spec-dev 管线缺少"已决定要修、但无设计空间"的小修复入口。备选方案：给 requirement-analysis 增加一个 hotfix 档位，或新增独立的 quick-fix skill。

## 决定

新增独立 skill（`skills/quick-fix/`），手动触发，与 exploring / requirement-analysis 构成"未承诺 / 已承诺无设计空间 / 已承诺有设计空间"的分诊三角。

## 理由

档位化的终态（直接修代码）与 requirement-analysis 的 HARD-GATE 及"档位不豁免任何 Checklist 项"原则正面冲突；且档位由模型分诊，存在边界需求系统性滑向"最省事档"的行为侵蚀压力。独立 skill 把触发判断权交还用户，升级门在看过代码根因后再判定，边界更准。被否方案：hotfix 档位——为省一个 skill 文件破坏核心不变量，不值。
