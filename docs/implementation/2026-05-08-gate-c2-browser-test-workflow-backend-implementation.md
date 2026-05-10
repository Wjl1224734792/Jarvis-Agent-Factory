# Gate C2 浏览器测试工作流集成 — 后端实现文档

## 1. 当前实现目标

将浏览器测试文档驱动工作流集成到 `/jarvis` 流水线的 Gate C2 阶段。在 `src/engine/gates.ts` 中新增 `GATE_AGENT_GUIDE` 常量及配套工具函数，定义各 Gate 可 spawn 的 Agent 清单和流程指引，Gate C2 重点扩展测试文档编写→执行→修复重测完整闭环。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**：REQ-TEST-004
- **任务 ID**：TASK-TEST-003

## 3. 输入依据

- `src/engine/gates.ts` — 当前 Gate 定义、GATE_OPERATIONS、GATE_CHECKS
- `src/engine/server.ts` — `pipeline_guide` MCP 工具中硬编码的 `agentGuide` 对象
- `src/templates/platforms/claude/skills/browser-testing/SKILL.md` — 浏览器测试方法论（test-doc-writer/test-executor 分工）
- `src/templates/platforms/claude/agents/test-doc-writer.md` — test-doc-writer Agent 定义
- `src/templates/platforms/claude/agents/test-executor.md` — test-executor Agent 定义
- `src/templates/platforms/claude/agents/fix-retest.md` — fix-retest Agent 定义

## 4. 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/engine/gates.ts` | 修改 | 新增 GATE_AGENT_GUIDE 常量、getGateAgentGuide 函数；更新 GATE_CHECKS Gate C2 描述 |

**仅修改此一个文件，其他文件未触碰。**

## 5. 变更范围

### 5.1 GATE_CHECKS['Gate C2'] 更新

```diff
- 'Gate C2':{check:'单元/集成/E2E/浏览器测试全部通过，API契约验证通过'},
+ 'Gate C2':{check:'测试文档用例覆盖完整，单元/集成/E2E/浏览器测试全部通过，API契约验证通过'},
```

在 check 条件中前置"测试文档用例覆盖完整"，呼应浏览器测试流程中 test-doc-writer 的职责。

### 5.2 新增 GATE_AGENT_GUIDE 常量

```typescript
export const GATE_AGENT_GUIDE = {
  'Gate A':    { can_spawn: ['code-explore-expert', 'docs-research-expert'], ... },
  'Gate B':    { can_spawn: ['task-design'], ... },
  'Gate C':    { can_spawn: ['planner', 'frontend-architect', 'backend-architect', 'database-architect'], ... },
  'Gate C1':   { can_spawn: [], ... },
  'Gate C1.5': { can_spawn: [], ... },
  'Gate C2':   {
    can_spawn: [
      'test-doc-writer',      // 步骤1: 编写测试用例文档
      'frontend-test-expert', // 步骤1: 前端单元/组件测试(并行)
      'backend-test-expert',  // 步骤1: 后端单元/集成测试(并行)
      'test-executor',        // 步骤2: 按文档执行浏览器测试
      'fix-retest',           // 步骤3: 失败时定位根因→修复→重跑(≤2轮)
      'browser-test-expert',  // (已有) 浏览器专项测试
      'api-contract-expert',  // (已有) API契约验证
      'perf-test-expert',     // (已有) 性能测试
      'e2e-test-expert',      // 步骤4: 端到端测试
    ],
    note: '测试阶段——步骤1(并行):spawn test-doc-writer(编写测试用例文档)+frontend-test-expert+backend-test-expert → 步骤2:spawn test-executor(按文档执行测试,输出报告) → 步骤3(有失败时):spawn fix-retest(定位根因→spawn实现Agent修复→重跑,≤2轮) → 步骤4:spawn e2e-test-expert(端到端测试) → 步骤5:汇总测试结果至docs/testing/',
  },
  'Gate D':    { can_spawn: [...], ... },
  'Gate E':    { can_spawn: [...], ... },
};
```

Gate C2 新增的 3 个 Agent：
- **test-doc-writer**：加载 browser-testing 技能，编写测试用例文档，输出到 `docs/testing/YYYY-MM-DD-<topic>-test-cases.md`
- **test-executor**：加载测试用例文档，按文档执行浏览器测试，输出测试报告
- **fix-retest**：分析测试报告中的失败清单，定位根因，spawn 实现 Agent 修复，重跑失败用例

Gate C2 工作流结构：
```
步骤 1（并行）:
├── spawn test-doc-writer（编写测试用例文档）
├── spawn backend-test-expert（单元+集成测试）
└── spawn frontend-test-expert（单元+组件测试）

步骤 2:
└── spawn test-executor（加载测试用例文档，按文档执行，输出测试报告）

步骤 3（有失败时）:
├── 分析测试报告中的失败清单
├── spawn fix-retest（定位根因 → spawn 实现 Agent 修复 → 重跑失败用例）
└── 最多 2 轮修复-重测循环

步骤 4:
└── spawn e2e-test-expert（端到端测试）

步骤 5:
└── 汇总测试结果到 docs/testing/YYYY-MM-DD-<topic>-test-summary.md
```

### 5.3 新增 getGateAgentGuide 函数

```typescript
export function getGateAgentGuide(gate) {
  return GATE_AGENT_GUIDE[gate] || { can_spawn: [], note: '未知Gate' };
}
```

与 `getGateOperations` 模式一致，按 Gate 名返回对应的 Agent 指引，未知 Gate 返回空指引。

### 5.4 GATE_OPERATIONS 确认

Gate C2 已包含 `spawn_test` 操作（第 87 行），无需修改。

```typescript
'Gate C2': { allow: ['read','spawn_test','fix'], deny: ['spawn_impl','deploy','write_code'] },
```

## 6. 实现说明

### 设计决策

1. **数据集中定义**：将 Agent spawn 指引从 `server.ts` 的局部变量提升到 `gates.ts` 作为常驻导出。`pipeline_guide` MCP 工具后续可从 `GATE_AGENT_GUIDE` 取值，消除硬编码重复。
2. **遵循现有模式**：`GATE_AGENT_GUIDE` 结构与 `server.ts` 中的 `agentGuide` 完全一致（`{ can_spawn: string[], note: string }`），`getGateAgentGuide` 与 `getGateOperations` 函数签名和回退逻辑一致。
3. **向后兼容**：所有已有 Agent 名称完整保留，仅追加 3 个新 Agent。流程指引 `note` 细化但语义兼容。
4. **最小变更**：仅修改 `gates.ts` 一个文件，不跨文件联动。

### 代码质量

- JSDoc 注释完整（中文，含 `@see` 等说明）
- 嵌套层级 ≤2
- 无数组副作用操作
- 严格相等比较（回退逻辑使用 `||`，语义正确）

## 7. 测试和验证结果

### TypeScript 类型检查

```
$ npx tsc --noEmit --pretty
(无输出) = 零错误通过
```

### 单元测试

```
$ npx vitest run tests/gates.test.ts --reporter=verbose

 ✓ tests/gates.test.ts > getPipelineGates > 返回 full 类型的 8 个 Gate
 ✓ tests/gates.test.ts > getPipelineGates > 返回 backend 类型的 7 个 Gate（跳过 C1.5）
 ✓ tests/gates.test.ts > getPipelineGates > 未知类型回退到默认流水线
 ✓ tests/gates.test.ts > getPipelineName > 返回中文名称
 ✓ tests/gates.test.ts > getPipelineName > 未知类型返回原始值
 ✓ tests/gates.test.ts > getGateOperations > Gate A 允许 read + write_doc
 ✓ tests/gates.test.ts > getGateOperations > 未知 Gate 返回空数组
 ✓ tests/gates.test.ts > GATE_OPERATIONS > 所有 Gate 至少允许 read
 ✓ tests/gates.test.ts > GATE_OPERATIONS > Gate C 允许 spawn_impl

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

全部 9 个已有测试通过，无回归。

### Lint

```
$ npx eslint src/engine/gates.ts

  3:24  warning  'getPlatformModels' is defined but never used  (预存问题，非本次引入)
```

仅预存警告，无新引入问题。

## 8. 数据与接口边界

### 新增导出（供后续 server.ts 消费）

| 导出项 | 类型 | 说明 |
|--------|------|------|
| `GATE_AGENT_GUIDE` | `Record<string, { can_spawn: string[]; note: string }>` | 各 Gate 可生成的 Agent 清单及流程指引 |
| `getGateAgentGuide(gate)` | `(gate: string) => { can_spawn: string[]; note: string }` | 按 Gate 名返回 Agent 指引，未知 Gate 返回 `{ can_spawn: [], note: '未知Gate' }` |

### 接口契约

```
GATE_AGENT_GUIDE[gate] = {
  can_spawn: string[],   // 该 Gate 下可 spawn 的 Agent ID 列表
  note: string,          // 流程指引描述文本
}
```

### 当前 pipeline_guide 可见变化

`pipeline_guide` MCP 工具当前返回的 `gate_requirement` 字段（源自 `GATE_CHECKS`）已更新为：

```
"测试文档用例覆盖完整，单元/集成/E2E/浏览器测试全部通过，API契约验证通过"
```

`agent_spawn` 字段的完整更新需 `server.ts` 配合消费 `GATE_AGENT_GUIDE`（见下方"推荐的下一步"）。

## 9. 风险 / 未解决项

| 风险 | 等级 | 说明 |
|------|------|------|
| server.ts 未消费新导出 | 中 | `pipeline_guide` 的 `agent_spawn` 字段仍使用 `server.ts` 局部 `agentGuide` 对象，尚未切换到 `GATE_AGENT_GUIDE`。需后续任务更新 `server.ts` 第 435-444 行。 |
| 新 Agent 未在 agent-registry 注册 | 低 | `test-doc-writer`、`test-executor`、`fix-retest` 的模板文件已存在于 `src/templates/` 各平台目录下，`agent-registry.js` 通过动态扫描生成列表，应自动包含。 |
| GATE_CHECKS 更新对 web 前端的影响 | 低 | `web/routes.ts` 导入 `GATE_CHECKS` 用于 Dashboard 显示，新 check 文本向后兼容，仅增加描述信息。 |

## 10. 需要前端配合的点

无前端直接变更需求。`pipeline_guide` MCP 工具返回的 `gate_requirement` 文本更新后，Dashboard 页面自动显示新的 check 描述。

## 11. 推荐的下一步

1. **`server.ts` 集成** — 修改 `src/engine/server.ts` 的 `pipeline_guide` 处理函数（第 435-444 行），将局部 `agentGuide` 对象替换为 `GATE_AGENT_GUIDE[cur]` 或 `getGateAgentGuide(cur)`：
   ```typescript
   // 旧代码（行 435-444）
   const agentGuide = { ... };  // 硬编码
   agent_spawn: agentGuide[cur] || { ... },
   
   // 新代码
   agent_spawn: getGateAgentGuide(cur),
   ```

2. **Gate C2 单元测试补充** — 在 `tests/gates.test.ts` 中添加对 `GATE_AGENT_GUIDE` 和 `getGateAgentGuide` 的测试用例。

3. **端到端验证** — 启动引擎后调用 `pipeline_guide` MCP 工具，确认 Gate C2 的 `agent_spawn.can_spawn` 包含全部 9 个 Agent，`agent_spawn.note` 描述完整 5 步流程。

4. **编排提示词更新** — 各平台 command 模板（如 `jarvis.md`、`taro.md`、`expo.md`）中 Gate C2 测试流程描述可引用 `GATE_AGENT_GUIDE['Gate C2'].note` 以保持一致。
