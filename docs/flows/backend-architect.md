# `/backend-architect` 后端架构师对话模式流程图

> **模式**: 直接对话后端架构师 —— 微服务拆分、数据库架构、分布式可靠性与数据一致性方案咨询

```mermaid
flowchart TD
    Start([用户输入 /backend-architect]) --> Init[初始化: 加载 behavioral-guidelines]
    Init --> Session[注册引擎会话<br/>session_join pipeline_type=backend]
    Session --> Gather[了解用户后端架构问题]

    subgraph S1[问题收集]
        Gather --> Q1[项目背景<br/>新项目启动/单体拆分/性能优化/可靠性改造]
        Q1 --> Q2[当前技术栈和团队能力]
        Q2 --> Q3[核心痛点<br/>可用性/一致性/扩展性/延迟]
        Q3 --> Q4[用户是否已有倾向方案]
        Q4 --> Confirm{问题边界确认?}
        Confirm -->|未确认| Gather
        Confirm -->|已确认| Spawn
    end

    subgraph S2[Agent Spawn]
        Spawn[spawn backend-architect Agent] --> AgentCall["Agent(<br/>  description='后端架构方案设计'<br/>  subagent_type='backend-architect'<br/>  prompt='用户问题描述 + 项目背景<br/>  + 技术栈约束 + 痛点'<br/>)"]
        AgentCall --> AgentOutput[backend-architect 产出:<br/>架构方案<br/>ADR 架构决策记录<br/>原型验证代码]
    end

    AgentOutput --> Present[将架构师输出完整呈现给用户<br/>必要时补充解释]

    Present --> Done([对话完成])

    subgraph Rules[关键纪律 不可绕过]
        Rules --> R1[必须通过 Agent 工具 spawn backend-architect<br/>不可自己替代架构师做分析]
        Rules --> R2[不要在未确认问题边界的情况下直接 spawn]
        Rules --> R3[架构原型代码只做验证<br/>不写入生产路径]
    end
```

**适用场景：**

| 类别 | 示例 |
|------|------|
| 微服务拆分 | 单体拆分策略、服务边界划分、API 网关设计 |
| 数据库架构 | SQL/NoSQL 选型、分库分表、读写分离、缓存策略 |
| 分布式可靠性 | 消息队列选型、分布式事务 (SAGA/TCC)、一致性方案 |
| 性能与扩展 | 高并发设计、限流熔断、异步处理、CQRS/Event Sourcing |
