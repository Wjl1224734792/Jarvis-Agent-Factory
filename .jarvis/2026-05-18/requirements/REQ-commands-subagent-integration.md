# REQ: 其他开发指令子智能体集成补充

> **文档状态**: confirmed | **创建时间**: 2026-05-18

| REQ-ID | 指令 | 修改范围 |
|--------|------|---------|
| REQ-001 | `/review` | 补全领域专项审查专家并行矩阵（security/frontend/backend/qa + algorithm条件性） |
| REQ-002 | `/review-fix` | 补全初审专家矩阵 + 复审关闭矩阵 + 按领域路由修复Agent |
| REQ-003 | `/bug-fix` | 引入子Agent执行根因定位(code-explore)和修复(实现类Agent) |
| REQ-004 | `/refactor` | 引入子Agent执行重构(实现类Agent)和验证(测试类Agent) |
| REQ-005 | `/debug` | 引入子Agent辅助代码探索(code-explore)和根因分析 |
| REQ-006 | `/evaluate` | 引入子Agent生成原型(实现类Agent)和收集指标(perf-test) |
| REQ-007 | `/hotfix` | 引入子Agent定位根因(code-explore)和执行修复(实现类Agent) |
| REQ-008 | `/migrate` | 引入子Agent执行规则迁移(实现类Agent并行) |
| REQ-009 | `/publish` | 补全shipping-and-launch技能加载 + 质量门失败spawn Agent修复 |
| REQ-010 | `/sync` | 引入docs-engineer Agent执行文档一致性检查 |
| REQ-011 | `/test-unit` | 引入frontend/backend-test-expert生成和执行单元测试 |
| REQ-012 | `/test-integration` | 引入backend-test-expert + api-contract-expert执行集成测试 |
| REQ-013 | `/test-e2e` | 引入e2e-test-expert执行端到端测试 |
| REQ-014 | `/test-perf` | 引入perf-test-expert执行性能测试 |
| REQ-015 | `/test-security` | 引入security-review-expert执行安全测试 |

## 通用约束

1. 编排者禁止直接编码——所有代码变更通过 `Agent()` spawn 子 Agent
2. Gate 检查调用——spawn 前 `gate_check()`，阶段完成 `gate_enforce()` + `advance_gate()`
3. 失败回退循环——明确"最多 N 轮修复-重试"和 `BLOCKED` 条件
4. 红线不减少——现有指令红线约束不丢失，只新增不删除
