# `/test-perf` — 性能测试流程图

```mermaid
flowchart TD
    START([用户输入 /test-perf]) --> S0[加载技能<br/>behavioral-guidelines + tdd]
    S0 --> S1[1. 定义性能目标<br/>P50/P95/P99 + 吞吐量 + 错误率]
    S1 --> S2[2. 选择测试工具<br/>k6 / Artillery / autocannon]
    S2 --> S3[3. 编写负载测试脚本]
    S3 --> S4[4. 建立性能基线<br/>首次运行保存 baseline.json]
    S4 --> S5[5. 执行负载测试<br/>多级并发场景]
    S5 --> |达标| DONE([✅ 性能报告])
    S5 --> |不达标| S6[定位瓶颈<br/>DB → 外部调用 → 序列化 → 内存]
    S6 --> S7[修复 → 重测]
    S7 --> |达标| DONE
    S7 --> |仍不达标| FAIL({已达2轮?})
    FAIL --> |是| BLOCKED([❌ BLOCKED])
    FAIL --> |否| S6
```
