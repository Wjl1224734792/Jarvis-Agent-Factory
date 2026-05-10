# 后端代码审查报告

**日期**: 2026-05-08
**审查范围**: pipeline_runs 表扩展 (task_name/archived/pinned)、REST API 新端点、GATE_AGENT_GUIDE 重构
**审查结论**: **不通过 (BLOCKED)** -- 存在导致核心工具行为异常的 bug，必须回退修复。

---

## 1. 维度检查结果

| 维度 | 结果 | 说明 |
|------|------|------|
| API 设计 | 通过 | REST 语义合理，PATCH 用于局部更新，POST 用于动作。路由无冲突。 |
| 业务逻辑 | **不通过** | pipeline_guide 工具的 agent_spawn 字段因索引错误始终返回兜底值。 |
| 数据层 | 通过 | ALTER TABLE 迁移模式安全，try/catch 幂等。按 archived 过滤正确。 |
| 错误处理 | 通过 | 所有端点有 404 处理，MCP 工具有空值守卫。格式略有不一致(见[WARNING])。 |
| 性能 | 通过 | 单用户本地工具，无 N+1 查询，无大数据量风险。 |

---

## 2. 问题列表 (按严重度排序)

### [BLOCKED] server.ts:442 -- getGateAgentGuide 返回值索引错误

**文件**: `src/engine/server.ts:435-442`
**证据**: `getGateAgentGuide(cur)` 返回的是 **单个 Gate 的数据对象** (如 `{ can_spawn: [...], note: '...' }`)，但 line 442 又对其做 `agentGuide[cur]` 索引。由于 `agentGuide` 不是 Map 而是单值对象，`agentGuide['Gate C1']` 恒为 `undefined`，导致 `agent_spawn` 字段永远落入 `{ can_spawn: [], note: '未知Gate' }` 兜底。

```javascript
// line 435: 返回 GATE_AGENT_GUIDE[cur] -- 单值对象
const agentGuide = getGateAgentGuide(cur);
// line 442: agentGuide 已是单值对象，agentGuide[cur] 恒为 undefined
agent_spawn: agentGuide[cur] || { can_spawn: [], note: '未知Gate' },
```

**修复**: 将 `agent_spawn: agentGuide[cur]` 改为 `agent_spawn: agentGuide`。
**影响**: pipeline_guide MCP 工具在全部 8 个 Gate 上都返回错误的 agent_spawn 指引，无法告知编排者可生成哪些 Agent。

### [FIX_REQUIRED] 新 DB 函数缺少测试覆盖

**范围**: `archiveRun`, `unarchiveRun`, `getArchivedRuns`, `deleteRun`, `pinRun`, `unpinRun`, `getActiveRun`(archived 过滤)
**证据**: `tests/db.test.ts` 仅测试了 `setRunTaskName`，其他 6 个新函数、以及 `getActiveRun` 的 archived 过滤行为均无测试。
**建议**: 补充覆盖核心路径: 归档/取消归档/置顶/取消置顶/硬删除的成功与 not-found 场景，以及 getActiveRun 过滤掉 archived=1 的 run。

### [WARNING] createPipelineRun ID 生成依赖 Date.now()

**文件**: `src/engine/db.ts:251`
**证据**: `'run_' + Date.now()` 在同一毫秒内多次创建会产生 ID 冲突。虽然单用户本地工具概率极低，但与 MCP session (line 112) 使用 `crypto.randomUUID()` 的风格不一致。
**建议**: 统一使用 `crypto.randomUUID()` 生成 run ID。

### [WARNING] 错误响应格式不一致

**文件**: `src/web/routes.ts:215-267`
**证据**: `PATCH /name` 错误时返回 `{ ok: false, task_name: null, error: "Run not found: xxx" }`，而 `POST /archive` 等返回 `{ ok: false, error: "Run not found: xxx" }` (无 task_name 字段)。两者应统一为一个错误响应 Schema。
**建议**: 定义统一错误格式 `{ ok: false, error: string }`，或分 success/error 两种 schema。

### [INFO] GET /api/pipeline-runs/archived 无分页

**文件**: `src/web/routes.ts:257-260`
**影响**: 归档 run 数量积累后响应体积线性增长。当前工具为本地单用户使用，暂不阻塞。
**建议**: 添加 `?limit` / `?offset` 查询参数。

---

## 3. 必须修复项 (合并前)

1. **server.ts:442** -- 将 `agentGuide[cur]` 改为 `agentGuide`。
2. **tests/db.test.ts** -- 为 archive/unarchive/pin/unpin/delete/getArchivedRuns 添加测试。
3. 运行 `npm run check` (lint + typecheck + test) 确认全部通过。

---

## 4. 变更文件清单

| 文件 | 变更摘要 | 风险 |
|------|---------|------|
| `src/engine/db.ts` | 新增 3 列迁移 + 7 个函数 | 低 |
| `src/engine/server.ts` | 导入 getGateAgentGuide，注册 session_set_name 工具 | **高 (BLOCKED)** |
| `src/web/routes.ts` | 新增 7 个 REST 端点 | 低 |
| `src/engine/gates.ts` | 新增 GATE_AGENT_GUIDE 常量 + getGateAgentGuide 函数，C2 扩展 Agent 列表 | 低 |
| `package.json` | build 脚本追加 views 目录复制 | 低 |
