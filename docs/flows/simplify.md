# `/simplify` — 代码简化

- **命令**：`/simplify [目标模块]`
- **类别**：质量流程
- **说明**：代码简化流程，自动识别死代码、重复逻辑、过度抽象和 AI 痕迹，通过回归验证确保简化后功能不变，支持多模块并行简化。

## 使用场景
| 场景 | 说明 |
|------|------|
| 消除死代码 | 移除未使用的函数、变量、导入和模块 |
| 合并重复逻辑 | 将分散在多处的相似代码抽取为公共函数 |
| 降低过度抽象 | 移除不必要的中间层、泛化和工厂模式 |
| 清理 AI 痕迹 | 移除 AI 生成代码中的冗余注释和过度防御性编程 |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| code-explore-expert | 代码扫描与问题分类 |
| planner | 简化策略制定与优先级排序 |
| backend-dev-expert | 后端代码简化实现（按需） |
| frontend-dev-expert | 前端代码简化实现（按需） |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /simplify 目标模块]) --> JOIN[session_join<br/>pipeline_type: simplify]
    JOIN --> S0[Gate S0: 代码分析]
    S0 --> S0A[spawn code-explore-expert<br/>扫描目标代码]
    S0A --> S0B[编排者分类<br/>死代码/重复/过度抽象/AI痕迹/复杂度]
    S0B --> S1[Gate S1: 简化执行]
    S1 --> S1A{多模块?}
    S1A --> |是| S1T[TeamCreate: 并行简化<br/>各成员独占文件]
    S1A --> |否| S1D[编排者直接简化]
    S1T --> S2[Gate S2: 回归验证]
    S1D --> S2
    S2 --> S2A[Lint → Type-check → Build → Test]
    S2A --> S2B{全部通过?}
    S2B --> |否| S2F{重试 < 3?}
    S2F --> |是| S2A
    S2F --> |否| S2R[回滚最后变更]
    S2B --> |是| S3[Gate S3: 报告产出]
    S3 --> S3A[before/after对比+统计]
    S3A --> DONE([✅ 简化报告])
```
