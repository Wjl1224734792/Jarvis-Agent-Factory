# `/research` — 深度研究

- **命令**：`/research [研究课题描述]`
- **类别**：调研
- **说明**：五阶段深度研究流程（课题定义→信息收集→深度分析→假设验证→研究报告），通过多 Agent 协作产出高质量研究报告。

## 使用场景

| 场景 | 说明 |
|------|------|
| 技术可行性调研 | 评估新技术/新框架的成熟度、适用场景与集成成本 |
| 竞品深度分析 | 系统化分析竞品架构、功能实现与技术路线 |
| 学术/工业前沿追踪 | 调研论文、开源项目或行业最佳实践，提炼可落地方案 |
| 架构决策支撑 | 为重大技术决策（如数据库选型、部署架构）提供数据驱动的调研报告 |
| 安全漏洞研究 | 调研特定 CVE 或攻击面，评估影响范围与修复策略 |

## 关键 Agent

| Agent | 职责 |
|-------|------|
| `code-explore-expert` | 代码库内调研，分析现有实现与技术债 |
| `external-resource-expert` | 外部资源整合，获取官方文档、论文与基准数据 |
| `docs-research-expert` | 文档与知识库调研，整理技术规范与历史决策记录 |
| `algorithm-expert` | 算法与理论分析，评估算法复杂度与优化空间 |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /research]) --> JOIN[session_join<br/>pipeline_type=research]
    JOIN --> GUIDE0[pipeline_guide<br/>获取 RS0 操作指引]
    GUIDE0 --> GC0{gate_check<br/>operation=read}
    GC0 -->|allowed| RS0[Gate RS0: 课题定义<br/>明确研究范围与目标]
    GC0 -->|blocked| STOP0[提示当前 Gate 不允许]

    RS0 --> SPAWN0[Spawn Agents<br/>code-explore-expert<br/>external-resource-expert]
    SPAWN0 --> ADV0[advance_gate RS0→RS1]

    ADV0 --> GUIDE1[pipeline_guide<br/>获取 RS1 操作指引]
    GUIDE1 --> GC1{gate_check<br/>operation=read}
    GC1 -->|allowed| RS1[Gate RS1: 信息收集<br/>多源数据采集与整理]
    GC1 -->|blocked| STOP1[提示当前 Gate 不允许]

    RS1 --> SPAWN1[Spawn Agents — Team mode<br/>code-explore-expert<br/>external-resource-expert<br/>docs-research-expert]
    SPAWN1 --> ADV1[advance_gate RS1→RS2]

    ADV1 --> GUIDE2[pipeline_guide<br/>获取 RS2 操作指引]
    GUIDE2 --> GC2{gate_check<br/>operation=read}
    GC2 -->|allowed| RS2[Gate RS2: 深度分析<br/>数据关联与模式识别]
    GC2 -->|blocked| STOP2[提示当前 Gate 不允许]

    RS2 --> SPAWN2[Spawn Agents — Team mode<br/>algorithm-expert<br/>code-explore-expert<br/>external-resource-expert]
    SPAWN2 --> ADV2[advance_gate RS2→RS3]

    ADV2 --> GUIDE3[pipeline_guide<br/>获取 RS3 操作指引]
    GUIDE3 --> GC3{gate_check<br/>operation=read}
    GC3 -->|allowed| RS3[Gate RS3: 假设验证<br/>实验验证与交叉检验]
    GC3 -->|blocked| STOP3[提示当前 Gate 不允许]

    RS3 --> SPAWN3[Spawn Agents — Team mode<br/>code-explore-expert<br/>external-resource-expert<br/>test experts]
    SPAWN3 --> ADV3[advance_gate RS3→RS4]

    ADV3 --> GUIDE4[pipeline_guide<br/>获取 RS4 操作指引]
    GUIDE4 --> GC4{gate_check<br/>operation=write_doc}
    GC4 -->|allowed| RS4[Gate RS4: 研究报告<br/>Orchestrator 汇总输出]
    GC4 -->|blocked| STOP4[提示当前 Gate 不允许]

    RS4 --> DONE([研究报告输出])
```
