# 贾维斯全栈流水线审计与重构需求文档

> 状态: confirmed | 日期: 2026-05-10 | 平台: Claude Code only

---

## 审计发现摘要

### 发现 1：Command 与 Agent 边界模糊

当前架构中，`algorithm-expert`、`frontend-architect`、`backend-architect`、`database-architect` 同时作为 **Command**（斜杠命令，用于方案讨论）和 **Agent**（流程智能体，在流水线中被 spawn 执行）存在。用户明确指出这两类应该分离：

- **Command（指令）**：用于方案讨论、咨询、探索——不与流水线绑定
- **Agent（智能体）**：用于流水线执行——在对应 Gate 阶段被 spawn

**影响**：当前 `frontend-architect` 等架构类 Agent 在 Gate B→C 之间是"条件性"可选的，但作为流程智能体应该在对应阶段强制加入。

### 发现 2：Gate C 职责过重

Gate C 当前既包含"执行规划"阶段（planner Agent 产出计划文档），又包含"批量实现"阶段（spawn 多个实现 Agent）。一个 Gate 承载了两种完全不同性质的工作：规划（写文档）和执行（写代码）。

### 发现 3：架构评审缺少正式 Gate

架构评审（frontend-architect、backend-architect、database-architect）在 Gate B→C 之间作为"条件性"步骤存在，没有正式的 Gate 编号和硬约束检查。导致：
- 架构评审可能被跳过
- 没有明确的通过/不通过标准
- 没有纳入循环机制

### 发现 4：循环机制不统一

修复回退循环分布在各 Gate 描述中但没有统一规范：
- Gate C1 最多 3 轮 → Gate C1.5 最多 2 轮 → Gate D 最多 2 轮
- 循环次数不一致
- 没有统一的"不通过→重做"入口

### 发现 5：部分 Agent 职责重叠/过重

- `frontend-dev-expert` 声称是"前端全栈实现者"涵盖页面/组件/交互/状态/前端请求/测试，与 `frontend-ui-expert` + `frontend-state-expert` 重叠
- `review-fix-optimize` 和 `review-only` 是"元 Agent"——会递归 spawn 其他 Agent，违反 AGENTS.md 约束 #4（子智能体不可递归）
- `fix-retest` 的角色定义模糊——"读取失败清单，定位根因并调度对应实现 Agent 修复"——实际上是在做编排者的工作

### 发现 6：缺少"入口条件检查"机制

每个 Gate 依赖前一个 Gate 的产物（文档/代码/测试报告），但没有硬编码的"入口条件检查"——即进入 Gate X 前必须确认 Gate X-1 的产物确实存在。

---

## 需求定义

### REQ-001：Command（指令）与 Agent（智能体）明确分离

**描述**：将当前"既是 Command 又是 Agent"的条目拆分为清晰的两种类型：

- **Command**：用户通过 `/command` 调用，用于方案讨论、咨询、临时探索。Command 不绑定流水线 Gate，不参与 spawn。
- **Agent**：由编排者在流水线特定 Gate spawn 执行。每个 Agent 对应一个明确的流水线阶段职责。

**涉及 Command **：
| Command | 用途 | 是/否在流水线中 |
|---------|------|---------------|
| `/jarvis` | 全流程编排入口 | 是（编排者自身） |
| `/jarvis-lite` | 轻量编排入口 | 是 |
| `/frontend` | 前端开发流程 | 是 |
| `/backend` | 后端开发流程 | 是 |
| `/review` | 只读审查模式 | 是（进入 Gate D） |
| `/review-fix` | 审查修复闭环 | 是（进入 Gate D） |
| `/bug-fix` | Bug 修复闭环 | 是（特殊流程） |
| `/browser-test` | 浏览器测试 | 是（进入 Gate C2） |
| `/frontend-architect` | 前端架构方案讨论 | **否**（纯咨询） |
| `/backend-architect` | 后端架构方案讨论 | **否**（纯咨询） |
| `/algorithm-expert` | 算法方案讨论 | **否**（纯咨询） |
| `/android` | Android 开发 | 是（移动端流程） |
| `/ios` | iOS 开发 | 是 |
| `/flutter` | Flutter 开发 | 是 |
| `/expo` | Expo 开发 | 是 |
| `/taro` | Taro 开发 | 是 |

**涉及 Agent**：`frontend-architect`、`backend-architect`、`database-architect`、`algorithm-expert` 保留为 Agent（在流水线中被 spawn），但对应的 Command 文件应明确标注"仅用于方案讨论，不进入流水线"。

### REQ-002：新增正式架构评审 Gate

**描述**：在 Gate B（任务分解）和 Gate C（执行规划）之间，新增 **Gate B1：架构评审**。

**Gate B1 定义**：
- **通过条件**：架构方案文档产出，覆盖前端架构/后端架构/数据库架构/算法方案中与当前任务相关的领域
- **允许操作**：read, write_doc, sweep_arch
- **禁止操作**：write_code, spawn_impl, spawn_test, build, deploy
- **可 spawn Agent**：`frontend-architect`、`backend-architect`、`database-architect`、`algorithm-expert`
- **触发条件**：
  - 前端变更 → 必须 spawn `frontend-architect`
  - 后端变更 → 必须 spawn `backend-architect`
  - 数据库 Schema 变更 → 必须 spawn `database-architect`
  - 算法/复杂计算 → 必须 spawn `algorithm-expert`
- **循环机制**：架构评审不通过 → 修正方案 → 重新评审 → 最多 2 轮

### REQ-003：Gate C 拆分为规划 Gate 和执行 Gate

**描述**：将当前 Gate C 拆分为两个独立的 Gate：

- **Gate C：执行规划**（原 Gate C 前半部分）
  - 只做 planner 规划，产出计划文档
  - 可 spawn Agent：`planner`
  - 允许操作：read, write_doc, sweep_arch

- **Gate C-impl：批量实现**（原 Gate C 后半部分，新编号）
  - 批量 spawn 实现 Agent
  - 可 spawn Agent：所有实现类 Agent
  - 允许操作：read, write_code, spawn_impl

### REQ-004：统一循环机制

**描述**：每个 Gate 统一设计循环入口：

| Gate | 最大循环次数 | 失败处理 |
|------|------------|---------|
| A | 无限制（交互澄清） | 重新澄清 |
| B | 2 轮 | 返回 Gate A 补充需求 |
| B1 | 2 轮 | 返回修改方案 |
| C | 2 轮 | 返回修改计划 |
| C-impl | 3 轮（单 Agent） | 返回修改实现 |
| C1 | 3 轮 | 返回修复代码 |
| C1.5 | 2 轮 | 返回修复布局 |
| C2 | 2 轮 | 返回修复实现 |
| D | 2 轮 | 返回修复 + 重新审查 |
| E | 2 轮 | 返回修复上线问题 |

**跨 Gate 回退**：当在某 Gate 发现上游问题时，允许回退到上游 Gate（如 Gate C2 发现设计缺陷 → 回退到 Gate B1）。

### REQ-005：Agent 职责审计与拆分

**描述**：审查所有 53 个 Agent 的职责定义，拆分职责过重的 Agent。

**具体行动**：
1. `frontend-dev-expert` 全栈标签改为"前端编排实现者"，职责聚焦于协调调度 UI+State 专项 Agent 的结果，而非自己同时做全部事
2. 移除 `review-fix-optimize` 和 `review-only`——这两个是元 Agent，会递归 spawn 子 Agent，违反约束 #4
3. `fix-retest` 职责限定为"修复后重测"，不做根因定位（根因定位是编排者的工作）
4. `change-review-expert` 职责从"变更后复审"明确为"复核初审 findings 关闭矩阵"
5. 新增 Agent：`code-quality-expert`——专门处理 Gate C1 的 Lint/Type-check/Build/Deps 修复（从当前编排者手动处理分离出来）

### REQ-006：入口条件检查硬编码

**描述**：在每个 Gate 执行前，引擎硬约束检查前置 Gate 的产物是否存在。

**Gate → 前置产物映射**：
| Gate | 前置产物 |
|------|---------|
| B | docs/requirements/ 下存在至少 1 个需求文档 |
| B1 | docs/tasks/ 下存在至少 1 个任务文档 |
| C | docs/tasks/ 已完成 + （条件性）docs/architecture/ 架构文档 |
| C-impl | docs/plans/ 下存在计划文档 |
| C1 | 实现代码已提交 |
| C1.5 | C1 检查通过 |
| C2 | C1 + C1.5 通过 |
| D | C2 测试通过 |
| E | D 审查通过 |

### REQ-007：全部更新仅限 Claude 平台

**描述**：本次审计重构只修改 Claude Code 平台相关文件：
- `src/templates/platforms/claude/commands/*.md`
- `src/templates/platforms/claude/agents/*.md`
- `.claude/skills/jarvis/SKILL.md`
- `.claude/skills/jarvis-lite/SKILL.md`
- `src/engine/gates.ts`
- `AGENTS.md`
- `CLAUDE.md`

**不修改**：`src/templates/platforms/opencode/`、`src/templates/platforms/codex/`、`.opencode/`、`.codex/`

### REQ-008：Gate 序列最终版

**描述**：新的完整 Gate 序列（全流程 full）：

```
A（需求澄清）
  → B（任务分解）
    → B1（架构评审，条件性）
      → C（执行规划）
        → C-impl（批量实现）
          → C1（代码质量门）
            → C1.5（视觉验证，条件性）
              → C2（测试验证）
                → D（评审）
                  → E（发布上线）
```

共 10 道闸门（从 8 道扩展为 10 道），其中 B1 和 C1.5 为条件性触发。

---

## 验收标准

1. `/frontend-architect`、`/backend-architect`、`/algorithm-expert` 三个 Command 文件中明确标注"仅用于方案讨论，不参与流水线"
2. Gate B1（架构评审）在 `gates.ts` 中定义为正式 Gate，有硬约束检查
3. Gate C 和 Gate C-impl 在 `gates.ts` 中分离为两个独立 Gate
4. 每个 Gate 的循环次数上限在 `gates.ts` 中硬编码
5. `review-fix-optimize` 和 `review-only` Agent 文件标记为 deprecated（或移除其递归 spawn 能力）
6. `fix-retest` 角色描述更新，明确只做"修复后重测"，不做根因定位
7. 所有修改通过 lint + typecheck + test + build
8. `jarvis upgrade` 更新全局和项目配置后，新流程可正常工作
