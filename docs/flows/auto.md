# `/auto` — 智能自动路由流程图

- **命令**：`/auto [任务描述]`
- **类别**：编排入口
- **说明**：智能自动路由——检测 19 种任务类型 → 路由 17 条流水线 → 跳过无关 Gate → 按复杂度分配 Team/Subagent。99% 的情况用它就够了。

## 使用场景

| 场景 | 路由 | 入口 Gate | 说明 |
|------|------|-----------|------|
| 新功能开发 | full/frontend/backend | Gate A | 按前端/后端/全栈自动选择 |
| Bug 修复 | auto | Gate C2 | gate_jump 跳过需求分析，直接测试修复 |
| 小修改(<3文件) | auto | Gate C-impl | gate_jump 直接实现，无需需求/任务/计划 |
| 只读审查 | auto | Gate R | gate_jump 只读审查，禁止修改代码 |
| 审查修复 | auto | Gate D | gate_jump 审查+修复闭环 |
| 紧急修复 | hotfix | H0 | 快速热修复流水线 |
| 技术调研 | research | RS0 | 深度研究流水线 |
| 框架开发 | frontend | Gate A | Flutter/Expo/Swift/Kotlin/Taro/小程序/uni-app/React/Vue |
| 后端开发 | backend | Gate A | 跳过 C1.5 视觉验证 |

## 关键 Agent

`/auto` 按检测结果动态路由，不固定 Agent。路由后调用对应流水线的 Agent 集合——小任务 subagent、中任务 Team 2-3、大任务 Team 4-6。auto 流水线支持 `allow_jump`，可 gate_jump 直接跳转入口 Gate。

```mermaid
flowchart TD
    START([用户输入 /auto]) --> DETECT[步骤1: 任务分类]
    DETECT --> D1{检测任务性质}
    D1 --> |新功能| FULL[路由: 按范围选 full/frontend/backend<br/>入口: Gate A]
    D1 --> |Bug修复| BUG[路由: auto<br/>入口: Gate C2, gate_jump]
    D1 --> |小修改| SMALL[路由: auto<br/>入口: Gate C-impl, gate_jump]
    D1 --> |重构| REF[路由: refactor<br/>入口: R1]
    D1 --> |紧急| HOT[路由: hotfix<br/>入口: H0]
    D1 --> |只读审查| REV_R[路由: auto<br/>入口: Gate R, gate_jump]
    D1 --> |审查修复| REV_D[路由: auto<br/>入口: Gate D, gate_jump]
    D1 --> |调研| RES[路由: research<br/>入口: RS0]
    D1 --> |调试| DBG[路由: debug<br/>入口: D0]
    D1 --> |简化| SIM[路由: simplify<br/>入口: S0]
    D1 --> |改进| IMP[路由: improve<br/>入口: IM0]
    D1 --> |迁移| MIG[路由: migrate<br/>入口: M1]
    D1 --> |发布| REL[路由: release<br/>入口: RL0]
    D1 --> |前端应用| FE[路由: frontend<br/>入口: Gate A]
    D1 --> |后端服务| BE[路由: backend<br/>入口: Gate A]
    
    FULL --> JOIN[session_join<br/>对应流水线]
    BUG --> JOIN
    SMALL --> JOIN
    REF --> JOIN
    HOT --> JOIN
    REV_R --> JOIN
    REV_D --> JOIN
    RES --> JOIN
    DBG --> JOIN
    SIM --> JOIN
    IMP --> JOIN
    MIG --> JOIN
    REL --> JOIN
    FE --> JOIN
    BE --> JOIN
    
    JOIN --> COMPLEX{复杂度?}
    COMPLEX --> |大| TEAM[Team模式<br/>TeamCreate + Agent]
    COMPLEX --> |中| SUB[Subagent并行<br/>Agent并发spawn]
    COMPLEX --> |小| DIRECT[Subagent单个<br/>Agent直接spawn]
    
    TEAM --> EXEC[按流水线Gate推进]
    SUB --> EXEC
    DIRECT --> EXEC
    
    EXEC --> SKIP{当前Gate<br/>与任务相关?}
    SKIP --> |无关| JUMP[gate_jump 跳过]
    SKIP --> |相关| RUN[执行Gate<br/>pipeline_guide → gate_check → spawn → advance]
    
    JUMP --> NEXT{还有Gate?}
    RUN --> NEXT
    NEXT --> |是| SKIP
    NEXT --> |否| DONE([✅ 完成])
```
