# `/trace` — 因果追踪流程图

```mermaid
flowchart TD
    START([用户输入 /trace 异常描述]) --> JOIN[session_join<br/>pipeline_type: trace]
    JOIN --> T0[Gate T0: 问题框架]
    T0 --> T0A[症状记录+上下文收集+已知信息矩阵]
    T0A --> T1[Gate T1: 假设生成]
    T1 --> T1A[spawn algorithm-expert<br/>生成2-5个竞态假设<br/>含先验概率+证伪条件]
    T1A --> T2[Gate T2: 证据收集]
    T2 --> T2A[spawn code-explore-expert<br/>并行收集支持/反对证据]
    T2A --> T2B[证据矩阵: 质量评估+后验概率]
    T2B --> T3[Gate T3: 因果分析]
    T3 --> T3A[贝叶斯更新: P(H|E)计算]
    T3A --> T3B{根因概率?}
    T3B --> |>70%| T4[Gate T4: 解决方案]
    T3B --> |40-70%| T2
    T3B --> |<40%| T1
    T4 --> T4A[修复方案+验证步骤+预防建议]
    T4A --> DONE([✅ 根因报告+修复方案])
```
