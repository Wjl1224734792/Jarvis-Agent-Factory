---
name: test-perf
description: 性能测试指令——k6/Artillery 负载测试，对比基线，定位性能瓶颈
model: inherit
argument-hint: [测试目标端点或场景描述]
tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit", "Skill", "WebFetch", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__gate_jump", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce"]
---

# 性能测试

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("test-driven-development")
Skill("perf-testing")
```

**引擎会话注册**（硬约束——引擎确保测试操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "auto" })`
- `mcp__jarvis-engine__gate_jump({ gate: "Gate C2" })`
- **每个 Gate 开始时**调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 上下文
- 生成测试前调用 `mcp__jarvis-engine__gate_check({ operation: "spawn_test" })`

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

## 步骤 1：定义性能测试目标（不可绕过）

明确性能成功标准：

| 指标 | 门禁阈值 | 说明 |
|------|---------|------|
| **P50 延迟** | < 200ms | 中位数响应时间 |
| **P95 延迟** | < 500ms | 95% 请求响应时间 |
| **P99 延迟** | < 1000ms | 长尾请求响应时间 |
| **吞吐量(RPS)** | > 目标值 | 每秒可处理请求数 |
| **错误率** | < 0.1% | 失败请求占比 |
| **并发连接数** | > 目标值 | 最大并发连接 |

从需求文档或系统设计提取目标值。如无明确基线，使用通用 Web 应用标准。

## 步骤 2：选择测试工具

| 工具 | 适用场景 | 脚本语言 |
|------|---------|---------|
| **k6** | API 负载测试、复杂场景 | JavaScript |
| **Artillery** | HTTP/WebSocket 负载测试 | YAML + JS |
| **autocannon** | 快速 HTTP 基准测试 | CLI |

### k6 安装（如需要）
```bash
# macOS
brew install k6
# Linux
sudo apt-get install k6
# 或 Docker
docker pull grafana/k6
```

### Artillery 安装（如需要）
```bash
npm install -g artillery
```

## 步骤 3：编写负载测试脚本

### k6 示例
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // 爬升到 20 VU
    { duration: '1m',  target: 20 },  // 保持 20 VU
    { duration: '30s', target: 0 },   // 降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/users');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Artillery 示例
```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 20
scenarios:
  - flow:
    - get:
        url: "/api/users"
```

## 步骤 4：建立基线（首次运行）

对当前系统版本运行基准测试：

```bash
# k6
k6 run --out json=baseline.json load-test.js

# Artillery
artillery run --output baseline.json load-test.yml
```

保存基线数据到 `.jarvis/YYYY-MM-DD/testing/perf-baseline-YYYY-MM-DD.json`。

**基线 Gate 完成**：调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 推进到负载测试阶段。

## 步骤 5：执行性能测试

```bash
# k6（带实时输出）
k6 run --summary-export=results.json load-test.js

# Artillery（生成 HTML 报告）
artillery run --output results.json load-test.yml
artillery report results.json
```

**对比基线**：
- 与基线对比每个指标的 delta
- P95 劣化 > 20% → 必须定位根因
- P99 劣化 > 30% → 阻塞发布

**负载测试 Gate 完成**：调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 推进到瓶颈分析阶段。

## 步骤 6：定位性能瓶颈

若性能劣化，按优先级排查：

1. **数据库查询**：慢查询日志、N+1 查询、缺失索引
2. **外部调用**：第三方 API 超时、未使用连接池
3. **序列化**：大 JSON 序列化/反序列化开销
4. **内存**：内存泄漏、GC 压力
5. **网络**：带宽限制、DNS 解析延迟

**瓶颈分析 Gate 完成**：调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 推进到报告阶段。

## 闭环图示
```
定义目标 → 选择工具 → 编写脚本 → 建立基线
                              ↓
                        执行负载测试
                              ↓
                    对比基线 ─ 达标 → ✅ 完成
                              ↓
                         不达标 → 定位瓶颈 → 修复 → 重测(最多2轮)
```

## 步骤 7：生成性能测试报告

汇总测试结果：
- 基线指标 vs 当前指标
- 各阶段对比数据
- 瓶颈分析结论
- 修复建议

将报告输出到 `.jarvis/YYYY-MM-DD/testing/perf-report-YYYY-MM-DD.md`。

**报告 Gate 完成**：调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 完成性能测试全流程。

## 红线
- 对生产环境直接做负载测试（必须在 staging/测试环境）
- 不设性能基线就宣称"通过"（无对比指标的测试 = 无效）
- 只测单一并发级别（必须测试多级并发以发现拐点）
- 忽略长尾延迟（P50 达标但 P99 劣化 = 部分用户严重受损）
- 性能测试数据污染正常业务指标（测试流量需可区分）
- 不清理测试产生的数据（数据库膨胀影响后续测试）
