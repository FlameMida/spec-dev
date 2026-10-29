# 性能验收（perf-web / perf-api / 客户端）

> **阅读时机**：矩阵含 perf-* 行、或意图路由到性能维度时。

## 预算先行（无数字不验收）

性能验收的第一步是确认**预算**（阈值数字），来源优先级：验收矩阵中的阈值 > 项目既有配置（`lighthouserc.*`、k6 脚本 thresholds、budget.json）> 下方默认阈值。三处都没有且用户未给 → 先向用户确认预算再执行；"性能要好"不可判定。

**采样纪律**：lab 数据受环境噪声影响大——同一指标至少采样 3 次取**中位数**，报告附全部原始值；本地采样结论标注"本机 lab 数据，非生产 RUM"。

## perf-web：前端性能

### 现行 Core Web Vitals 阈值（good/poor 分界，来源 GoogleChrome/web-vitals）

| 指标 | good ≤ | poor > | 说明 |
|------|--------|--------|------|
| LCP | 2500ms | 4000ms | 最大内容绘制 |
| INP | 200ms | 500ms | 交互到下一帧（已取代 FID） |
| CLS | 0.1 | 0.25 | 累积布局偏移 |
| TTFB | 800ms | 1800ms | 辅助指标 |
| FCP | 1800ms | 3000ms | 辅助指标 |

默认验收线取 good 阈值；矩阵可覆盖。

### 路径 A（默认）：ego-lite 复现与实际指标取证

1. 按 [浏览器接入](browser-setup.md) 读取官方 `ego-browser` skill，执行并完整读取 `ego-browser skill`；在同一 TaskSpace 中打开目标并复现关键交互。
2. 优先使用项目已有的性能采集入口和 `web-vitals` 数据，通过官方 `page.evaluate()` 读取可观察指标；需要低层取证时先核对当前官方 `page.cdp()` / 事件能力。加载前需启用的采集器先准备，再导航/重载；不能假定导航后的一次读取已覆盖全部指标。
3. 记录每个指标的采集来源、单位、页面版本、视口、采样窗口、缓存与节流条件。原始导航/资源时序和通用 CDP metrics 不等于 LCP/INP/CLS；没有可靠采集器的指标标记 `unverified`，不能用 0 或加载时间替代。
4. 同一条件至少采样 3 次，保存全部原始值并取中位数；预算内为 pass，超线为 fail。弱环境复现只使用官方通道实际支持的设置，记录并恢复本次设置，未执行的环境不泛化结论。
5. 需要完整 trace、性能审计或归因而当前能力不足时，使用项目已有的对应工具；否则明确缺口。ego-browser 不承诺提供现成的 Web Vitals 报告或自动 insight 分析。

### 路径 B（项目要持久化性能门禁进 CI）：Lighthouse CI

```bash
npm i -D @lhci/cli && npx lhci autorun --collect.url=<url> --collect.numberOfRuns=3
```

`lighthouserc` 断言用 eslint 风格，聚合方法选 `median` 抗噪：

```jsonc
{
  "ci": {
    "collect": { "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500, "aggregationMethod": "median" }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1, "aggregationMethod": "median" }]
      }
    }
  }
}
```

验收一次性跑用路径 A；项目提出"以后每次构建都要卡性能"才引入路径 B 并把配置提交进仓库。

### 补充

- 项目已有 Lighthouse CLI/CI 的审计报告可作为对应维度证据，记录实际审计配置和覆盖范围；不把页面截图当成性能报告
- INP 的 lab 复现需要可靠采集器和真实交互：采集期间执行矩阵中的关键操作（点击/输入），没有交互或有效样本时不能把缺值当 0
- RUM（真实用户数据）不在验收范围内，但报告可提示接入 `web-vitals` 库作为长期观测

## perf-api：后端性能

### 工具：k6（thresholds 失败 → 非零退出码，天然确定性验收门）

最小验收剧本（模板 [templates/k6-smoke.js](../templates/k6-smoke.js)）：

```javascript
import http from 'k6/http';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],    // 错误率 < 1%
    http_req_duration: ['p(95)<300'],  // 95 分位 < 300ms（以矩阵预算为准）
  },
};

export default function () {
  http.get(`${__ENV.BASE_URL}/api/target`);
}
```

运行：`k6 run -e BASE_URL=http://localhost:3000 script.js` → 退出码 0=通过，非 0=fail（附 THRESHOLDS 输出段作证据）。

### 测试类型选择（默认只跑 smoke 档）

| 类型 | 负载 | 时长 | 何时进验收 |
|------|------|------|-----------|
| smoke | 低（个位数 VU） | 秒-分钟 | **默认**：每次交付验收 |
| load | 预期均值 | 5-60 分钟 | 矩阵含吞吐 SLO 时 |
| stress / spike | 超均值/突刺 | 分钟级 | 用户明确要求容量验证 |
| soak | 均值 | 小时级 | 只在用户要求时（验收不默认跑长测） |
| breakpoint | 递增到崩 | 不定 | "能扛多少 QPS"类问题 |

load 及以上必须先和用户确认目标环境——**对生产或共享环境压测须获得明确授权**，默认只压本地/专用测试环境。

### 降级与边界

- k6 未安装且用户不便安装 → Node 项目可用 `autocannon`（npx 即用）做 smoke 档替代，报告注明工具差异；无任何压测工具 → perf-api 标 unverified
- 断言层次：错误率与延迟分位是底线；业务正确性抽查（响应体关键字段）用 k6 `check` 补充，但 check 失败默认不挂 threshold——要挂就映射到自定义 metric 并加 threshold

## 客户端性能（Electron / 移动端）

- **Electron 启动时间**：Playwright `_electron.launch()` 计时到首窗口 `domcontentloaded`；采样 3 次取中位数；预算来自矩阵（常见 2-5s 档）
- **Electron 内存**：启动稳定后经 `app.evaluate(() => process.memoryUsage())` 读主进程 RSS；渲染进程经 CDP `Performance.getMetrics`
- **移动端**：性能验收不默认纳入（工具链重）；用户要求时经 mobile-mcp 采启动耗时截图证据，并声明精度限制

## 诊断联动（性能 fail 时）

1. 对照实际采集的指标与时序，定位慢在服务器响应、资源加载还是渲染；没有足够证据时保留假设
2. 经 ego-browser 官方 CDP/事件能力或项目已有原件检查大响应、串行请求和资源传输，不能编造瀑布
3. 在有能力且可比较的节流条件下复现，区分"环境慢"与"代码慢"
4. 后端：k6 结果按时间轴分层（错误率何时开始抬升、p95 拐点对应的 VU 数）→ 对照服务端日志/慢查询
5. 根因写入报告前按铁律 3 做假设验证
