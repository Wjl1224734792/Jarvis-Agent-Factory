# `/frontend-architect` 前端架构师对话模式流程图

> **模式**: 直接对话前端架构师 —— 技术选型、组件架构、状态管理、构建工具链与性能架构方案咨询

```mermaid
flowchart TD
    Start([用户输入 /frontend-architect]) --> Init[初始化: 加载 behavioral-guidelines]
    Init --> Session[注册引擎会话<br/>session_join pipeline_type=frontend]
    Session --> Gather[了解用户前端架构问题]

    subgraph S1[问题收集]
        Gather --> Q1[项目背景<br/>新项目启动/现有改造/性能优化/架构升级]
        Q1 --> Q2[当前技术栈和团队能力]
        Q2 --> Q3[核心痛点<br/>性能/可维护性/开发效率/扩展性]
        Q3 --> Q4[用户是否已有倾向方案]
        Q4 --> Confirm{问题边界确认?}
        Confirm -->|未确认| Gather
        Confirm -->|已确认| Spawn
    end

    subgraph S2[Agent Spawn]
        Spawn[spawn frontend-architect Agent] --> AgentCall["Agent(<br/>  description='前端架构方案设计'<br/>  subagent_type='frontend-architect'<br/>  prompt='用户问题描述 + 项目背景<br/>  + 技术栈约束 + 痛点'<br/>)"]
        AgentCall --> AgentOutput[frontend-architect 产出:<br/>技术选型矩阵<br/>架构方案<br/>原型验证代码]
    end

    AgentOutput --> Present[将架构师输出完整呈现给用户<br/>必要时补充解释]

    Present --> Done([对话完成])

    subgraph Rules[关键纪律 不可绕过]
        Rules --> R1[必须通过 Agent 工具 spawn frontend-architect<br/>不可自己替代架构师做分析]
        Rules --> R2[不要在未确认问题边界的情况下直接 spawn]
        Rules --> R3[架构原型代码只做验证<br/>不写入生产路径]
    end
```

**适用场景：**

| 类别 | 示例 |
|------|------|
| 技术选型 | 框架选择 (React/Vue/Angular)、状态管理方案 (Redux/Zustand/Jotai)、CSS 方案 |
| 组件架构 | 组件库设计、复用策略、微前端拆分 |
| 构建工具链 | Vite/Webpack/Turbopack 配置、CI/CD 流水线优化 |
| 性能架构 | Code Splitting、Lazy Loading、SSR/SSG 策略、Bundle 优化 |
