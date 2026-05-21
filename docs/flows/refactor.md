# `/refactor` — 重构安全网

- **命令**：`/refactor [重构目标模块]`
- **类别**：质量流程
- **说明**：重构安全网流程，通过定义边界、建立基线测试、小步提交和行为漂移检测，确保重构过程中功能行为不变。

## 使用场景
| 场景 | 说明 |
|------|------|
| 代码结构优化 | 调整模块划分、消除耦合、改善可维护性 |
| 技术栈迁移 | 框架升级、库替换、API 版本迁移 |
| 设计模式重构 | 引入更合适的设计模式替代现有实现 |
| 性能导向重构 | 重构关键路径代码以提升性能 |

## 关键 Agent
| Agent | 职责 |
|-------|------|
| code-explore-expert | 代码结构分析与依赖梳理 |
| planner | 重构计划制定与风险评估 |
| backend-dev-expert | 后端重构实现（按需） |
| frontend-dev-expert | 前端重构实现（按需） |

## 流程图

```mermaid
flowchart TD
    START([用户输入 /refactor]) --> S0[加载技能<br/>behavioral-guidelines + code-simplification + tdd]
    S0 --> R1[Gate R1: 定义重构边界<br/>范围 + 不变行为清单 + 成功标准]
    R1 --> R1D[产出边界文档<br/>.jarvis/refactoring/...-boundary.md]
    R1D --> R2[Gate R2: 建立基线测试<br/>全部通过 + 覆盖率报告]
    R2 --> R2D[保存基线覆盖率]
    R2D --> R3[Gate R3: 执行重构<br/>小步提交 + 保持行为]
    R3 --> |每步验证无回归| R4[Gate R4: 行为漂移检测<br/>覆盖率对比 + 抽查]
    R4 --> |通过| R5[Gate R5: 生成重构报告<br/>变更摘要 + 对比结论]
    R5 --> DONE([✅ 重构完成])
    R4 --> |覆盖率下降| FIX[修复 → 重测]
    FIX --> R4
```
