# 单元 / 集成 / API 验收（Tier D）

> **阅读时机**：矩阵含 unit/integration 行、或意图路由到这两个维度时。
>
> **与 test-driven-development 的边界**：TDD skill 管"开发中怎么写测试"（红绿循环），本文件管"交付后怎么验收测试面"。验收发现缺失测试需要补写时，补写过程遵循 TDD skill。

## 多栈命令表（检测结果 → 执行命令）

| 栈 | 测试命令 | 覆盖率 |
|----|---------|--------|
| node (vitest) | `npx vitest run [pattern]` | `npx vitest run --coverage` |
| node (jest) | `npx jest [pattern]` | `npx jest --coverage` |
| python (pytest) | `pytest [path] -v` | `pytest --cov=<pkg> --cov-report=term` |
| go | `go test ./... -run <pattern>` | `go test ./... -cover` |
| rust | `cargo test [pattern]`（有 nextest 用 `cargo nextest run`） | `cargo llvm-cov`（已安装时） |
| java | `mvn test` / `gradle test` | jacoco（项目已配置时） |

包管理器以 detect-env.mjs 输出为准（pnpm/yarn/npm 对应替换）。monorepo 先定位目标 package 再执行，不在根上盲跑。

## 执行范围规则

1. **先跑本次变更涉及的测试**（按变更文件映射测试文件 / `--related` 类机制 / 包路径过滤）→ 这是验收的主判定
2. **再跑全量套件**→ 用于发现回归外溢；报告中**区分「本次新增失败」与「既有失败」**——既有失败不属于本次验收范围但必须列出，混为一谈会污染结论
3. 全量套件超长（>10 分钟）时可只跑受影响 package + 抽样全量，缩减写入 coverage_note

## 断言什么

- **退出码**是主判定；输出中的 fail/error 摘录进证据
- **测试真的存在**：矩阵中标注「任务内 TDD」的行，验收时核对对应测试文件确实存在且包含该 Scenario 的断言（防"计划里有、实施时漏写"）——只核对存在性与断言指向，不重复审查测试质量（那是收尾代码审查维度 A 的活）
- **输出干净**：通过但刷屏 warning/deprecation 的记 warn

## 覆盖率门槛

- **只在两种情况下断言覆盖率**：项目已配置门槛（vitest `coverage.thresholds`、jest `coverageThreshold`、`--cov-fail-under` 等）→ 按项目配置执行；或矩阵行明确写了覆盖率要求 → 按矩阵执行
- 两者都没有 → 报告覆盖率数字**仅作参考**，不作 pass/fail 判定——验收时单方面发明全局覆盖率线是反模式（数字好看≠测得对，逼出来的是断言空洞的凑数测试）
- Vitest 阈值语法备忘：正数=最低百分比（`functions: 90`），负数=最多未覆盖数（`lines: -10`）

## API 集成验收

### Playwright request（项目已用 Playwright 时零新增依赖）

```typescript
import { test, expect } from '@playwright/test';

test('POST /api/orders 创建订单', async ({ request }) => {
  const res = await request.post('/api/orders', { data: { sku: 'A1', qty: 2 } });
  expect(res.status()).toBe(201);                       // 1. 状态码
  const body = await res.json();
  expect(body).toMatchObject({ sku: 'A1', qty: 2 });    // 2. 业务字段
  expect(typeof body.id).toBe('string');                // 3. 契约形态
});
```

**三层断言缺一不可**：状态码、业务字段值、契约形态（字段存在与类型）。只断言 200 的接口测试形同虚设。错误路径（400/401/404/409）至少各一条——错误体的 message/code 也要断言。

### 其他形态

- node 服务内测试：supertest（项目已有则沿用其模式）
- python：pytest + httpx/requests，模式同三层断言
- **认证接口**：token 经环境变量注入，测试代码不落明文凭据

## 深档选配（不默认执行，deep 档或用户点名时提议）

| 工具 | 定位 | 成本警告 |
|------|------|---------|
| StrykerJS / mutmut | 变异测试——检验"测试真的能抓 bug"，对关键算法/金额计算类模块最值 | 运行时间随代码量爆炸，只对矩阵点名的核心模块跑，全仓跑是浪费 |
| Schemathesis | 基于 OpenAPI 规格的模糊测试——项目有 openapi.json 时低成本高收益 | 需要规格文件与可承受随机流量的测试环境 |
| Pact | 消费者驱动契约测试——多团队/多服务边界 | 引入是团队级决策，验收只在项目已有 Pact 时复跑验证 |
