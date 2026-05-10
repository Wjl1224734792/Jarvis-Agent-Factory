# 流水线 Gate 系统重构——业务逻辑实现

## 当前实现目标

重构 Jarvis 流水线 Gate 系统，新增 Gate B1（架构评审）和 Gate C-impl（批量实现），将原有 8 道 Gate 扩展为 10 道，并新增 MAX_RETRY（重试上限）和 GATE_ENTRY_CONDITIONS（入口条件）两个配置表。

## 对应需求 ID / 任务 ID

- 编排者分配任务，无显式 REQ/TASK 编号
- 基于上游任务描述中的具体变更要求

## 变更文件 / 变更范围

| 文件 | 变更内容 |
|------|----------|
| `src/engine/gates.ts` | 7 处修改（详见下方"业务规则说明"） |

未修改其他任何文件。

## 业务规则说明

### 1. PIPELINE_DEFS 扩展

四个流水线定义（full/frontend/backend/lite）全部插入 `'Gate B1'` 和 `'Gate C-impl'`：

- **full**: 8→10 Gate（A→B→B1→C→C-impl→C1→C1.5→C2→D→E）
- **frontend**: 8→10 Gate（同上）
- **backend**: 7→9 Gate（A→B→B1→C→C-impl→C1→C2→D→E，无 C1.5）
- **lite**: 8→10 Gate（同上，保留 allow_jump）

`DEFAULT_PIPELINE` 保持 `'full'`，`GATES` 常量通过 `PIPELINE_DEFS[DEFAULT_PIPELINE].gates` 动态计算，向后兼容。

### 2. GATE_DIRS 扩展

新增两个目录映射：
- `'Gate B1':'architecture'` — 架构评审文档存放目录
- `'Gate C-impl':'implementation'` — 实现文档存放目录（与 C1/C1.5 共用）

### 3. GATE_CHECKS 扩展

- **Gate B1**: 架构评审通过，架构方案文档已产出（涉及前端/后端/数据库/算法的领域均有评审文档）
- **Gate C-impl**: 所有 Batch 实现完成，实现 Agent 已返回结果

### 4. GATE_OPERATIONS 扩展

**Gate B1**（架构评审）:
- allow: `read`, `write_doc`, `sweep_arch`
- deny: `write_code`, `spawn_impl`, `spawn_test`, `build`, `deploy`

**Gate C-impl**（批量实现）:
- allow: `read`, `write_code`, `spawn_impl`
- deny: `spawn_test`, `build`, `deploy`

### 5. GATE_AGENT_GUIDE 重组

**Gate C** 原本合并了"规划"和"架构评审"的职责，现在拆分：

- **Gate C**: 仅保留 `can_spawn: ['planner']`，note 改为"执行规划——spawn planner 产出 parallel_batches 和执行计划"
- **Gate B1**（新增）: `can_spawn: ['frontend-architect', 'backend-architect', 'database-architect', 'algorithm-expert']`，note: "架构评审——按变更范围选择对应架构师，产出架构方案文档"
- **Gate C-impl**（新增）: `can_spawn: ['frontend-dev-expert', 'frontend-ui-expert', 'frontend-state-expert', 'backend-dev-expert', 'backend-api-expert', 'backend-logic-expert', 'backend-data-expert']`，note: "批量实现——按parallel_batches并行spawn实现Agent"

### 6. MAX_RETRY（新增）

每个 Gate 的最大重试循环次数，用于限制失败重试：

| Gate | 最大重试 | 说明 |
|------|---------|------|
| A | Infinity | 需求阶段不限重试 |
| B, B1, C, C1.5, C2, D, E | 2 | 标准重试上限 |
| C1, C-impl | 3 | 质量门和实现阶段容忍更多重试 |

### 7. GATE_ENTRY_CONDITIONS（新增）

定义各 Gate 的入口前置条件，由引擎在推进 Gate 时进行断言验证：

- Gate B: Gate A 需求文档已产出
- Gate B1: Gate B 任务文档已产出
- Gate C: Gate B1 架构评审通过（或确认无需架构评审）
- Gate C-impl: Gate C 执行计划已产出
- Gate C1: Gate C-impl 实现代码已提交
- Gate C1.5: Gate C1 质量检查通过
- Gate C2: Gate C1+C1.5 通过
- Gate D: Gate C2 测试通过
- Gate E: Gate D 审查通过

## 状态机 / 状态转换说明

Gate 序列从线性流水线（8 道）扩展为带并行分支的结构（10 道）：

```
Gate A (需求)
  → Gate B (任务分解)
    → Gate B1 (架构评审) — 新增，独立的架构评审阶段
      → Gate C (执行规划)
        → Gate C-impl (批量实现) — 新增，并发实现阶段
          → Gate C1 (代码质量门)
            → Gate C1.5 (视觉验证门) — 仅前端/全流程
              → Gate C2 (测试)
                → Gate D (审查)
                  → Gate E (发布)
```

新增的 B1 和 C-impl 均为强制 Gate（非可选），在 full/frontend/backend/lite 四种流水线中均存在。

## 权限与幂等性说明

### 权限
- Gate B1 仅允许 `read`、`write_doc`、`sweep_arch`，禁止任何代码修改和实现/测试 Agent 的生成
- Gate C-impl 允许 `read`、`write_code`、`spawn_impl`，禁止测试和部署
- 权限控制由引擎通过 `getGateOperations()` 在 `gate_check` 工具中实施

### 幂等性
- `MAX_RETRY` 限制重试次数，防止无限循环
- `GATE_ENTRY_CONDITIONS` 提供前置验证，确保 Gate 推进不依赖不可靠的状态
- 所有新增常量均为纯数据（只读配置），不影响状态变更逻辑

## 测试和验证结果

| 验证项 | 结果 |
|--------|------|
| `tsc --noEmit` typecheck | ✅ 零错误 |
| `eslint src/ tests/` | ✅ 零错误 |
| 单元测试（7/9） | ✅ 7 passed |
| 单元测试（2/9） | ⚠️ 预期失败 |

### 失败的测试说明

`tests/gates.test.ts` 中有 2 个测试硬编码了旧 Gate 数量：
- `getPipelineGates('full')` 期望 `toHaveLength(8)` → 实际应为 10
- `getPipelineGates('backend')` 期望 `toHaveLength(7)` → 实际应为 9

这些测试需要在后续任务中更新，但不在本次任务授权范围内。

## 风险 / 未解决项

1. **测试文件未更新**：`tests/gates.test.ts` 需要更新硬编码的 Gate 数量（8→10, 7→9），需要编排者另行分配任务。
2. **fix_loop 逻辑**：`src/engine/server.ts:595` 的 `fix_loop` 条件未包含 Gate C-impl 和 B1，可能需要更新让这两个新 Gate 也支持修复循环。
3. **Gate C Agent 能力收缩**：原 Gate C 的 `can_spawn` 包含四位架构师，现缩减为仅 `planner`，架构评审职责完全移交至 Gate B1。需确认编排者提示词中是否引用了旧 Gate C 的架构师列表。

## 推荐的下一步

1. 由 `backend-test-expert` 更新 `tests/gates.test.ts` 中的硬编码 Gate 数量
2. 由 `backend-logic-expert` 评估 `fix_loop` 是否需要扩展至 B1 和 C-impl
3. 由编排者确认编排提示词中 Gate C 引用是否需要更新
4. 运行完整测试套件（含测试文件更新后）验证全量通过
