# `/algorithm-expert` 算法专家对话模式流程图

> **模式**: 直接对话算法专家 —— 算法选型、复杂度分析、数据结构设计与性能优化方案咨询

```mermaid
flowchart TD
    Start([用户输入 /algorithm-expert]) --> Init[初始化: 加载 behavioral-guidelines]
    Init --> Session[注册引擎会话<br/>session_join pipeline_type=full]
    Session --> Gather[了解用户算法问题]

    subgraph S1[问题收集]
        Gather --> Q1[问题域<br/>搜索/排序/推荐/压缩/加密/图计算...]
        Q1 --> Q2[当前数据规模和性能目标]
        Q2 --> Q3[已有技术栈和约束]
        Q3 --> Q4[用户是否已有倾向方案]
        Q4 --> Confirm{问题边界确认?}
        Confirm -->|未确认| Gather
        Confirm -->|已确认| Spawn
    end

    subgraph S2[Agent Spawn]
        Spawn[spawn algorithm-expert Agent] --> AgentCall["Agent(<br/>  description='算法方案设计与评估'<br/>  subagent_type='algorithm-expert'<br/>  prompt='用户问题描述 + 约束条件<br/>  + 数据规模 + 性能目标'<br/>)"]
        AgentCall --> AgentOutput[algorithm-expert 产出:<br/>选型矩阵<br/>复杂度分析<br/>POC 验证代码]
    end

    AgentOutput --> Present[将算法专家输出完整呈现给用户<br/>必要时补充解释]

    Present --> Done([对话完成])

    subgraph Rules[关键纪律 不可绕过]
        Rules --> R1[必须通过 Agent 工具 spawn algorithm-expert<br/>不可自己替代算法专家做分析]
        Rules --> R2[不要在未确认问题边界的情况下直接 spawn]
        Rules --> R3[算法的 POC 代码只做验证<br/>不写入生产路径]
    end
```

**适用场景：**

| 类别 | 示例 |
|------|------|
| 算法选型 | 搜索算法选型 (二分/BFS/A*)、排序策略、推荐算法 |
| 复杂度分析 | 时间复杂度/空间复杂度评估、大 O 分析 |
| 数据结构设计 | 哈希表 vs 树结构、图结构设计、缓存淘汰策略 |
| 性能优化 | 热点路径优化、并行计算、内存优化 |
