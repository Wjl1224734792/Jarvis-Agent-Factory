# 贾维斯流水线审计与重构 — 执行计划

> 日期: 2026-05-10 | 对应任务: TASK-001~TASK-007

---

## parallel_batches

### Batch 1：核心引擎 + 命令更新（并行）

无共享文件冲突，可并行执行。

| Execution Packet | Agent | 文件范围 |
|-----------------|-------|---------|
| EP-001 | backend-logic-expert | `src/engine/gates.ts` 全部变更 |
| EP-003 | remediation-expert | `src/templates/platforms/claude/commands/*.md` 全部变更 |

### Batch 2：Agent 清理 + 规范更新（并行）

无共享文件冲突。

| Execution Packet | Agent | 文件范围 |
|-----------------|-------|---------|
| EP-002 | remediation-expert | `src/templates/platforms/claude/agents/*.md` 架构类 + 修复类 |
| EP-004 | remediation-expert | `src/templates/platforms/claude/agents/*.md` 开发类 + 测试类 |
| EP-006 | remediation-expert | `AGENTS.md` |

### Batch 3：技能重写（串行）

依赖 Batch 1 的 Gate 名称确定后执行。

| Execution Packet | Agent | 文件范围 |
|-----------------|-------|---------|
| EP-005 | remediation-expert | `.claude/skills/jarvis/SKILL.md` |

### Batch 4：测试验证（串行）

依赖前 3 个 Batch 全部完成。

| Execution Packet | Agent | 文件范围 |
|-----------------|-------|---------|
| EP-007 | backend-test-expert | `tests/gates.test.ts` 更新 + 全量测试 |

---

## Execution Packets（详细）

### EP-001：gates.ts 核心状态机重构
- **目标**：重构 Gate 定义系统，新增 B1/C-impl，统一循环机制
- **Agent**：backend-logic-expert
- **文件**：`src/engine/gates.ts`
- **依赖**：无
- **验收标准**：
  1. `PIPELINE_DEFS.full` 序列 = `['A','B','B1','C','C-impl','C1','C1.5','C2','D','E']`
  2. `PIPELINE_DEFS.frontend` 同 full
  3. `PIPELINE_DEFS.backend` 跳过 C1.5
  4. `PIPELINE_DEFS.lite` 同 full + allow_jump
  5. `GATE_CHECKS` 包含全部 10 个 Gate
  6. `GATE_OPERATIONS` 包含全部 10 个 Gate
  7. `GATE_AGENT_GUIDE` 包含全部 10 个 Gate
  8. `MAX_RETRY` map 定义每个 Gate 最大循环次数
  9. `GATE_ENTRY_CONDITIONS` 定义每个 Gate 入口条件
  10. 类型检查通过

### EP-002：架构评审 Agent 职责明确化
- **目标**：更新 4 个架构/算法 Agent 的角色描述，明确在 Gate B1 被 spawn
- **Agent**：remediation-expert
- **文件**：`src/templates/platforms/claude/agents/frontend-architect.md`、`backend-architect.md`、`database-architect.md`、`algorithm-expert.md`
- **依赖**：EP-001（需要知道 Gate B1 名称）
- **验收标准**：
  1. 每个 Agent 描述明确提及"在 Gate B1 由编排者 spawn"
  2. 输入输出格式清晰

### EP-003：Command 文件更新
- **目标**：区分方案讨论 Command 和流水线入口 Command
- **Agent**：remediation-expert
- **文件**：16 个 Command 文件
- **依赖**：无（可以与 EP-001 并行）
- **验收标准**：
  1. `/frontend-architect`、`/backend-architect`、`/algorithm-expert` 首行标注"仅用于方案讨论"
  2. `/jarvis`、`/jarvis-lite`、`/frontend`、`/backend` 更新为新 Gate 序列

### EP-004：Agent 职责审计与清理
- **目标**：清理职责过重/越界的 Agent 定义
- **Agent**：remediation-expert
- **文件**：6 个 Agent 文件
- **依赖**：无（可以与 EP-001 并行）
- **验收标准**：
  1. `frontend-dev-expert` 角色改为"前端编排实现者"
  2. `fix-retest` 限定为"修复后重测"，不包含根因定位
  3. `review-fix-optimize` 移除递归 spawn 说明
  4. `review-only` 移除调度子 Agent 说明
  5. `change-review-expert` 角色明确为"关闭矩阵复核"

### EP-005：Jarvis SKILL.md 重写
- **目标**：重写核心编排技能，完整反映新流程
- **Agent**：remediation-expert
- **文件**：`.claude/skills/jarvis/SKILL.md`
- **依赖**：EP-001（需要确定 Gate 名称）
- **验收标准**：
  1. 新 Gate 序列完整
  2. Command vs Agent 边界说明
  3. 循环机制说明
  4. Gate B1 条件性触发规则

### EP-006：AGENTS.md 约束更新
- **目标**：同步更新项目级约束文档
- **Agent**：remediation-expert
- **文件**：`AGENTS.md`
- **依赖**：EP-001
- **验收标准**：
  1. 约束 #5 更新为新 Gate 序列
  2. 工作模式矩阵更新

### EP-007：测试验证
- **目标**：更新测试并验证全部通过
- **Agent**：backend-test-expert
- **文件**：`tests/gates.test.ts`
- **依赖**：EP-001~EP-006
- **验收标准**：
  1. 新增 Gate B1/C-impl 测试用例
  2. 全部 96 个测试通过
  3. Lint + Type-check + Build 通过

---

## 共享区域声明

| 文件 | 唯一责任方 |
|------|----------|
| `src/engine/gates.ts` | EP-001（backend-logic-expert） |
| `AGENTS.md` | EP-006（remediation-expert） |

其他文件均由各自 Agent 独占，无冲突。
