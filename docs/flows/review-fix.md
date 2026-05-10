# `/review-fix` 审查修复优化闭环流程图

> **模式**: 五阶段闭环 —— 初审 → 修复规划 → 执行 → 验证 → 复审

```mermaid
flowchart TD
    Start([用户输入 /review-fix]) --> Init[初始化: 加载技能<br/>behavioral-guidelines + using-agent-skills]
    Init --> Session[注册引擎会话 session_join full]
    Session --> GateCheck[每个阶段前 pipeline_guide + gate_check]

    subgraph P1[阶段一: 初审]
        GateCheck --> P1Start[界定审查范围]
        P1Start --> P1Spawn[并发调用只读 Agent 收集 findings]
        P1Spawn --> P1A[project-review-expert<br/>项目审查]
        P1Spawn --> P1B[diff-review-expert<br/>差异审查]
        P1Spawn --> P1C[perf-review-expert<br/>性能审计]
        P1Spawn --> P1D[code-explore-expert<br/>代码探索]
        P1A --> P1Browser{涉及前端 Bug?}
        P1B --> P1Browser
        P1C --> P1Browser
        P1D --> P1Browser
        P1Browser -->|是| P1Repro[加载 agent-browser + browser-testing<br/>用 agent-browser CLI 复现 Bug<br/>open → snapshot → 复现步骤 → screenshot]
        P1Browser -->|否| P1Collect
        P1Repro --> P1Collect[汇总所有 Findings<br/>每条附文件/行号/证据依据]
    end

    P1Collect --> P2

    subgraph P2[阶段二: 修复/优化规划]
        P2Start[修复规划] --> P2Plan[将 findings 转为可执行修复计划]
        P2Plan --> P2Order[标注修复顺序]
        P2Order --> P2Owner[标注责任方<br/>共享区域唯一责任方]
        P2Owner --> P2Agent[可调用 remediation-planner Agent 辅助]
    end

    P2Agent --> P3

    subgraph P3[阶段三: 执行]
        P3Start[执行修复] --> P3Seq[按计划顺序或并发执行]
        P3Seq --> P3Shared{涉及共享区域?}
        P3Shared -->|是| P3Unique[共享区域必须唯一责任方<br/>不得多个 Agent 同时修改]
        P3Shared -->|否| P3Fix[spawn 对应修复 Agent]
        P3Unique --> P3Fix
    end

    P3Fix --> P4

    subgraph P4[阶段四: 验证]
        P4Start[验证] --> P4Quality[Lint + Type-check + Build<br/>三项全部通过]
        P4Quality --> P4Test{测试通过?}
        P4Test -->|失败| P4Back[回退修复]
        P4Back --> P3Fix
        P4Test -->|通过| P4Browser{涉及前端修复?}
        P4Browser -->|是| P4Verify[agent-browser CLI 重新操作<br/>按相同步骤复现<br/>截图对比修复前后<br/>确认 Bug 不再出现]
        P4Browser -->|否| P5
        P4Verify --> P5
    end

    P4Test --> P5

    subgraph P5[阶段五: 复审]
        P5Start[复审] --> P5Close[逐项关闭初审 findings]
        P5Close --> P5Matrix[输出关闭矩阵]
        P5Matrix --> P5Risk[报告未关闭风险项]
        P5Risk --> P5Agent[可调用 change-review-expert Agent]
    end

    P5Agent --> Done([闭环完成])

    subgraph Rules[红线]
        Rules --> R0[不可跳过初审直接修复]
        Rules --> R1[不可缺少验证证据就宣称完成]
        Rules --> R2[涉及前端 Bug 必须浏览器复现和验证<br/>不可仅凭代码审查替代]
        Rules --> R3[不可用硬等待替代内容轮询]
    end
```

**五阶段链路：**

| 阶段 | 核心操作 | 不可绕过 |
|------|---------|---------|
| 初审 | 界定范围 → spawn 只读 Agent → 汇总 Findings | 是 |
| 修复规划 | Findings 转可执行计划 → 标注顺序/责任方 | 是 |
| 执行 | 按计划顺序/并发执行修复 | 是 |
| 验证 | Lint+Type-check+Build + 测试 + 浏览器验证 | 是 |
| 复审 | 逐项关闭 findings → 关闭矩阵 → 风险报告 | 是 |
