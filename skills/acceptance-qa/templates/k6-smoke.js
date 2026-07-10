/**
 * k6 冒烟压测模板（perf-api 维度默认档）
 *
 * 使用方法:
 *   1. 复制到项目（建议 perf/ 或 tests/perf/ 目录），替换全部 {{占位符}}：
 *      - {{P95_BUDGET_MS}}  95 分位延迟预算，纯数字毫秒（来自验收矩阵）
 *      - {{/api/target}}    目标端点路径
 *      - {{data}}           响应中用于业务正确性抽查的关键字段
 *      占位符未替换时 k6 会在启动/运行期报语法错——这是有意为之的防呆
 *   2. 阈值以验收矩阵的预算为准——没有预算数字先回去确认，不要拍脑袋
 *   3. 运行: k6 run -e BASE_URL=http://localhost:3000 <本文件>
 *      退出码 0 = 阈值全过；非 0 = 存在阈值失败（验收 fail，附 THRESHOLDS 输出段作证据）
 *
 * 档位说明（默认 smoke；更高档位先获得目标环境的压测授权）:
 *   smoke:  vus: 5,  duration: '30s'   —— 每次交付验收
 *   load:   按预期均值流量配 stages    —— 矩阵含吞吐 SLO 时
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    // 错误率 < 1%
    http_req_failed: ['rate<0.01'],
    // 95 分位延迟（数字来自验收矩阵预算）
    http_req_duration: ['p(95)<{{P95_BUDGET_MS}}'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}{{/api/target}}`);

  // 业务正确性抽查：check 失败默认不挂 threshold，只进输出统计；
  // 需要作为硬门槛时映射到自定义 metric 再加 threshold
  check(res, {
    'status is 200': (r) => r.status === 200,
    '响应含关键字段': (r) => r.json('{{data}}') !== undefined,
  });

  sleep(1);
}
