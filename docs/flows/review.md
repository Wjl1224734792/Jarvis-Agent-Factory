# `/review` 只读审查模式流程图

> **模式**: 只读审查 —— 不修改任何文件，只输出结构化审查报告

```mermaid
flowchart TD
    Start([用户输入 /review]) --> Init[初始化: 加载 behavioral-guidelines]
    Init --> Session[注册引擎会话 session_join full]
    Session --> Pipeline[获取 pipeline_guide 当前 Gate 允许操作]
    Pipeline --> Confirm[确认进入只读审查模式]

    subgraph S1[步骤 1: 界定审查范围]
        Confirm --> Scope[明确审查对象]
        Scope --> ScopeType[全仓审查<br/>目录审查<br/>diff/PR 审查<br/>特定风险审查]
    end

    S1 --> S2

    subgraph S2[步骤 2: 收集证据]
        S2[收集证据] --> Evidence[工具调用]
        Evidence --> Ev1[文件读取 Read]
        Evidence --> Ev2[内容搜索 Grep/Glob]
        Evidence --> Ev3[命令输出 Bash]
        Evidence --> Ev4[外部搜索 WebFetch/WebSearch]
    end

    S2 --> S3

    subgraph S3[步骤 3: 并发调用只读 Agent]
        S3[并发 spawn 只读审查 Agent] --> S3A[project-review-expert<br/>项目级别审查]
        S3 --> S3B[diff-review-expert<br/>差异审查]
        S3 --> S3C[perf-review-expert<br/>性能审计]
        S3 --> S3D[code-explore-expert<br/>代码探索]
    end

    S3A --> S4
    S3B --> S4
    S3C --> S4
    S3D --> S4

    subgraph S4[步骤 4: 汇总输出审查报告]
        S4[汇总审查报告] --> Report[结构化报告]
        Report --> ReportContent[审查范围<br/>Findings 按严重度分级<br/>critical/major/minor/info<br/>每条 finding 附文件/行号/证据<br/>风险评估摘要]
    end

    Report --> Done([审查完成])

    subgraph Rules[核心纪律 不可绕过]
        Rules --> R1[不修改任何文件<br/>不编辑/不格式化/不stage/不commit]
        Rules --> R2[不修复代码<br/>只报告 findings，不写修复]
    end

    Report -.->|执行纪律| Rules
```

**审核工具可用操作：**

| 操作 | 限制 |
|------|------|
| Read | 读取前 gate_check("read") |
| Glob / Grep | 搜索文件/内容 |
| Bash | 运行只读命令 |
| WebFetch / WebSearch | 外部文档/搜索 |
| Agent (只读类型) | gate_check("write_doc") 后生成报告 |

**红线：**
- 禁止 Write / Edit
- 禁止任何代码修改操作
- 禁止 commit / stage
