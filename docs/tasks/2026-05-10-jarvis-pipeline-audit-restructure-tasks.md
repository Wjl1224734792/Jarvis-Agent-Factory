# 贾维斯流水线审计与重构 — 任务文档

> 日期: 2026-05-10 | 对应需求: REQ-001 ~ REQ-008

---

## 任务分解

### TASK-001：gates.ts 核心状态机重构
| 属性 | 值 |
|------|---|
| 映射 REQ | REQ-002, REQ-003, REQ-004, REQ-006, REQ-008 |
| 分类 | 直接开发（引擎核心逻辑） |
| 优先级 | P0（阻塞所有后续任务） |
| 工作量 | 大 |
| 依赖 | 无 |

**内容**：
- 新增 `B1` Gate 定义（架构评审）
- 拆分 Gate C 为 `C`（规划）和 `C-impl`（实现）
- 更新 `PIPELINE_DEFS`（full/frontend/backend/lite 的 Gate 序列）
- 统一循环次数硬编码（`MAX_RETRY` map）
- 添加入口条件检查（`GATE_ENTRY_CONDITIONS`）
- 更新 `GATE_DIRS`、`GATE_CHECKS`、`GATE_OPERATIONS`、`GATE_AGENT_GUIDE`
- Gate 序列: A→B→B1→C→C-impl→C1→C1.5→C2→D→E（10 道）

### TASK-002：架构评审 Agent 职责明确化
| 属性 | 值 |
|------|---|
| 映射 REQ | REQ-001, REQ-002, REQ-005 |
| 分类 | 直接开发（模板文件修改） |
| 优先级 | P0 |
| 工作量 | 中 |
| 依赖 | TASK-001（需要新 Gate 名称） |

**内容**：
- `frontend-architect.md` Agent 描述增加"在 Gate B1 由编排者 spawn"
- `backend-architect.md` Agent 描述增加"在 Gate B1 由编排者 spawn"
- `database-architect.md` Agent 描述增加"在 Gate B1 由编排者 spawn"
- `algorithm-expert.md` Agent 描述增加"在 Gate B1 由编排者 spawn（条件性）"
- 明确这四个 Agent 的职责边界和输入输出格式

### TASK-003：Command 文件更新（方案讨论 vs 流水线入口）
| 属性 | 值 |
|------|---|
| 映射 REQ | REQ-001 |
| 分类 | 直接开发（Command 文件修改） |
| 优先级 | P1 |
| 工作量 | 中 |
| 依赖 | 无（可并行 TASK-001） |

**内容**：
- `/frontend-architect` Command 首行增加"⚡ 仅用于方案讨论，不参与流水线"
- `/backend-architect` Command 同上
- `/algorithm-expert` Command 同上
- `/jarvis` Command 更新为新 Gate 序列（10 道）
- `/jarvis-lite` Command 同步更新
- `/frontend`、`/backend` Command 同步更新 Gate 序列

### TASK-004：Agent 职责审计与清理
| 属性 | 值 |
|------|---|
| 映射 REQ | REQ-005 |
| 分类 | 直接开发（Agent 文件修改） |
| 优先级 | P1 |
| 工作量 | 中 |
| 依赖 | TASK-001（需要确认新 Gate 名称） |

**内容**：
- `frontend-dev-expert.md` 角色描述更新为"前端编排实现者"，强调协调而非全包
- `fix-retest.md` 角色描述限定为"修复后重测"，明确不做根因定位
- `review-fix-optimize.md` 移除其递归 spawn 子 Agent 的说明
- `review-only.md` 移除其调度子 Agent 的说明
- `change-review-expert.md` 角色描述明确为"初审 findings 关闭复核"
- 移除 `remediation-planner.md` 和 `remediation-expert.md` 角色中"调度其他 Agent"的责任

### TASK-005：Jarvis SKILL.md 重写
| 属性 | 值 |
|------|---|
| 映射 REQ | REQ-001~REQ-008 |
| 分类 | 直接开发（技能文件重写） |
| 优先级 | P0 |
| 工作量 | 大 |
| 依赖 | TASK-001（需要新 Gate 序列） |

**内容**：
- 重写 `.claude/skills/jarvis/SKILL.md`：
  - 新 Gate 序列 A→B→B1→C→C-impl→C1→C1.5→C2→D→E
  - 每个 Gate 的允许/禁止操作、可 spawn Agent
  - Commands vs Agents 边界说明
  - 统一循环机制说明
  - Gate B1 条件性触发规则
  - Gate C-impl 批量 spawn 规则

### TASK-006：AGENTS.md 约束更新
| 属性 | 值 |
|------|---|
| 映射 REQ | REQ-003, REQ-004, REQ-008 |
| 分类 | 直接开发（项目规范文件） |
| 优先级 | P1 |
| 工作量 | 小 |
| 依赖 | TASK-001 |

**内容**：
- 更新约束 #5（闸门不可绕过）为新 Gate 序列
- 更新工作模式矩阵（Gate 对应表）
- 新增 Command vs Agent 边界说明
- 更新发布流程中的 Gate 引用

### TASK-007：构建验证与测试
| 属性 | 值 |
|------|---|
| 映射 REQ | 全部 |
| 分类 | TDD（先写测试验证 Gate 变更） |
| 优先级 | P0 |
| 工作量 | 中 |
| 依赖 | TASK-001~TASK-006 |

**内容**：
- 更新 `tests/gates.test.ts`：新增 B1/C-impl Gate 测试用例
- 运行全部测试确保不回归
- Lint + Type-check + Build 全通过

---

## REQ 追踪矩阵

| REQ | TASK-001 | TASK-002 | TASK-003 | TASK-004 | TASK-005 | TASK-006 | TASK-007 |
|-----|----------|----------|----------|----------|----------|----------|----------|
| REQ-001 | ✓ | ✓ | ✓ | - | ✓ | - | - |
| REQ-002 | ✓ | ✓ | - | - | ✓ | - | - |
| REQ-003 | ✓ | - | - | - | ✓ | ✓ | - |
| REQ-004 | ✓ | - | - | - | ✓ | - | - |
| REQ-005 | - | ✓ | - | ✓ | - | - | - |
| REQ-006 | ✓ | - | - | - | - | - | - |
| REQ-007 | - | - | - | - | - | - | - |
| REQ-008 | ✓ | - | - | - | ✓ | ✓ | - |

---

## 并行批次规划

```
Batch 1 (并行): TASK-001（gates.ts 核心） + TASK-003（Command 文件）
Batch 2 (并行): TASK-002（架构 Agent） + TASK-004（Agent 清理） + TASK-006（AGENTS.md）
Batch 3 (串行): TASK-005（SKILL.md 重写，依赖 TASK-001 确定的 Gate 名称）
Batch 4 (串行): TASK-007（测试验证，依赖前 6 个任务）
```
