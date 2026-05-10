# 执行计划 -- G6 可视化 + Plugin/Hook/MCP + Token 追踪

> 日期：2026-05-11 | 状态：ready | 来源：
> - 需求文档：`docs/2026-05-11/requirements/REQ-G6-visualization-hooks-token.md`
> - 任务文档：`docs/2026-05-11/tasks/REQ-G6-visualization-hooks-token-tasks.md`
> - 后端架构评审：`docs/2026-05-11/architecture/backend-review-G6-token.md`
> - 前端架构评审：`docs/2026-05-11/architecture/frontend-review-G6-token.md`

---

## 1. Gate B 检查（任务文档前置条件）

| 检查项 | 状态 |
|--------|------|
| 任务 ID 完整（TASK-XXX 格式） | 通过。TASK-001 至 TASK-006 均完整 |
| 每个 TASK 映射到至少 1 个 REQ-XXX | 通过。追溯矩阵确认 12 个 REQ 全部映射 |
| 类型完整（前端/后端/共享/测试） | 通过 |
| 优先级完整、完成标准完整 | 通过 |
| DDD 分类完整、TDD/直接开发分类完整 | 通过 |
| 风险任务已标注、文件所有权提醒已写明 | 通过 |
| test_strategy 覆盖 | 通过。TASK-001/002 为 TDD，其余为 manual_only |
| 无水平切片（按技术层级拆分） | 通过。6 个任务均为垂直切片 |

---

## 2. 架构评审裁决摘要（已纳入计划）

| 裁决 ID | 来源 | 内容 | 影响任务 |
|---------|------|------|---------|
| F1 | 后端审查 | `agent_events` 表增加 `model TEXT` 字段 | TASK-001 |
| F2 | 后端审查 | `MODEL_PRICES` 使用 `gates.ts` 中实际模型 ID（`claude-sonnet-4-6`/`claude-opus-4-7`/`claude-haiku-4-5`） | TASK-001 |
| F3 | 后端审查 | TASK-002 新增 `POST /api/agent-event` REST 端点 | TASK-002 |
| F4 | 后端审查 | `agent_event` MCP 工具增加 session→run 归属验证 | TASK-001 |
| F5 | 后端审查 | 同时实现 MCP `agent_event` + REST `POST /api/agent-event` | TASK-001 + TASK-002 |
| AF-1 | 前端审查 | G6 仅亮色模式，移除 `prefers-color-scheme` 监听（降级 REQ-061） | TASK-004 |
| AF-2 | 前端审查 | 创建共享 `useAgentData` hook 统一管理轮询 | TASK-004（主写）+ TASK-005（复用） |
| AF-3 | 前端审查 | `useEffect` cleanup 严格实现 `graph.destroy()` | TASK-004 |
| R6 | 前端审查 | 锁定 `@antv/g6@~5.0.0`（仅 patch 升级） | TASK-004 |
| S1 | 后端审查 | `total_tokens` 生成列用 `VIRTUAL` 替代 `STORED` | TASK-001 |
| S2 | 后端审查 | `duration_ms` 维持毫秒（新表），不修改已有 `duration_seconds` | TASK-001 |
| S3 | 后端审查 | 成本估算按 event 级 `model` 字段计算 | TASK-001 |
| S4 | 后端审查 | `agent_id` Zod 校验添加 `min(1).max(128).regex(/^[a-z0-9-]+$/)` | TASK-001 |
| I1 | 后端审查 | `agent_events` 表添加 `created_at TEXT DEFAULT (datetime('now'))` | TASK-001 |
| I2 | 后端审查 | 索引策略优化为复合索引 | TASK-001 |
| I3 | 后端审查 | `event_type` 添加 CHECK 约束 | TASK-001 |
| I4 | 后端审查 | `deleteRun()` 级联删除 `agent_events` | TASK-001 |

---

## 3. 当前轮次目标

单轮次交付：引擎 Agent 事件追踪基础设施 + Web REST API + Plugin/Hook 体系 + G6 流程可视化 + Token 仪表盘 + 命令模板同步。覆盖全部 12 个 REQ。

---

## 4. 当前轮次范围

| 维度 | 内容 |
|------|------|
| 引擎核心 | `agent_events` 表 + 3 个 MCP 工具（`agent_event`/`agent_usage`/`agent_status`） |
| Web REST API | 3 个 GET 端点 + 1 个 POST 端点（`POST /api/agent-event` + SSE 扩展） |
| Plugin/Hook | `.claude/plugins/jarvis-visualization/` 完整目录结构 + 脚本 |
| 前端 G6 | `G6FlowChart.tsx` 组件 + `useAgentData` hook + `@antv/g6@~5.0.0` 依赖 |
| 前端 Token | `TokenDashboard.tsx` 组件 |
| 命令模板 | 16 个命令模板 Agent 名称审核与修正 |

---

## 5. 完成标准

1. `agent_events` 表可正确写入/查询 Agent 生命周期事件
2. `agent_event` MCP 工具接受 start/end/error 事件，含 token 数据与 model 字段，自动计算 cost
3. `agent_usage` MCP 工具返回按 agent_id 分组的 token 统计 + 成本估算
4. `agent_status` MCP 工具返回 active/completed/failed Agent 分类
5. `GET /api/agent-usage`、`GET /api/agent-status`、`GET /api/agent-events` 三个 REST 端点可用
6. `POST /api/agent-event` REST 端点可用（Hook 备选数据入口）
7. SSE `broadcastSSE()` 推送包含 `agent_status` 数据
8. `.claude/plugins/jarvis-visualization/` 目录结构完整，`plugin.json` + `hooks.json` + 脚本就绪
9. G6FlowChart 渲染 10-Gate 流程图（dagre 布局，仅亮色主题），支持状态动画和交互
10. TokenDashboard 展示 token 统计面板（总数、模型分布、Agent 排行、成本、缓存命中率）
11. `useAgentData` hook 统一管理 agent-status + agent-usage 轮询
12. Dashboard 页面正确嵌入 G6FlowChart 和 TokenDashboard
13. 16 个命令模板中所有 Agent 引用名称与 `.claude/agents/` 一致
14. TASK-001 + TASK-002 单元测试全部通过
15. 全量 lint + typecheck + build 通过

---

## 6. 是否需要先查阅 code-explore-expert / docs-research-expert

**否**。需求文档和任务文档已足够详细。架构评审已覆盖了全部现有代码模式的验证（db.ts 的 initSchema 模式、server.ts 的 MCP 注册模式、routes.ts 的 Hono 路由模式、Dashboard.tsx 的轮询模式）。各实现 Agent 启动时自行读取相关源码即可。

---

## 7. 共享区域改动归属（唯一责任方）

| 共享文件/区域 | 唯一责任方 | 读/写权限 |
|-------------|-----------|----------|
| `src/engine/db.ts` | TASK-001 | **独占写入**。TASK-002 只读调用 |
| `src/engine/server.ts` | TASK-001 | **独占写入** |
| `src/web/routes.ts` | TASK-002 | **独占写入** |
| `web/src/api.ts` | TASK-004 | **主写**。TASK-005 只读复用（不追加新方法） |
| `web/src/pages/Dashboard.tsx` | TASK-004 先写 → TASK-005 后叠加 | **串行**，不可并行 |
| `web/src/hooks/useAgentData.ts` | TASK-004 | **独占新建**。TASK-005 只读 import |
| `web/package.json` | TASK-004 | **独占写入**（添加 `@antv/g6@~5.0.0`） |
| `.claude/plugins/` | TASK-003 | **独占新建** |
| `.claude-plugin/marketplace.json` | TASK-003 | **独占新建/修改** |
| `src/templates/platforms/claude/commands/*.md` | TASK-006 | **独占写入**（与其他 TASK 无共享文件） |

---

## 8. parallel_batches

### Batch 1（无依赖，可同时启动）

- **TASK-001** → subagent_type: `backend-dev-expert`
  - 引擎核心基础设施（DB Schema + 3 个 MCP 工具 + TDD 单元测试）
- **TASK-006** → subagent_type: `backend-dev-expert`
  - 命令模板审核与修正（与 TASK-001 无共享文件，可并行）

### Batch 2（依赖 TASK-001 完成）

- **TASK-002** → subagent_type: `backend-api-expert`
  - REST API 扩展（3 GET + 1 POST 端点 + SSE 扩展 + TDD 测试）

### Batch 3（依赖 TASK-001 + TASK-002 完成；TASK-003 与 TASK-004 可并行）

- **TASK-003** → subagent_type: `backend-dev-expert`
  - Plugin + Hook 体系（配置 + 脚本）
- **TASK-004** → subagent_type: `frontend-dev-expert`
  - G6 流程可视化 + useAgentData hook + Dashboard 嵌入

> 注意：TASK-003 和 TASK-004 无共享文件，可在同一 Batch 内并行。TASK-003 依赖 TASK-002 的 `POST /api/agent-event` 端点；TASK-004 依赖 TASK-002 的 `GET /api/agent-status` 端点。

### Batch 4（依赖 TASK-004 完成）

- **TASK-005** → subagent_type: `frontend-dev-expert`
  - Token 仪表盘 + Dashboard 叠加嵌入

> TASK-005 必须等待 TASK-004 完成，因为需要基于 TASK-004 修改后的 `Dashboard.tsx` + `api.ts` + `useAgentData` hook。两个任务不可并行。

---

## 9. 并行/串行关系总图

```
时间轴 →
───────────────────────────────────────────────────────────────

Batch 1（并行启动）:
  ┌── TASK-001 (backend-dev-expert) ── 引擎核心 + 测试
  │
  └── TASK-006 (backend-dev-expert) ── 命令模板审核
        │
        ▼
Batch 2（等待 Batch 1）:
  ┌── TASK-002 (backend-api-expert) ── REST API + 测试
        │
        ▼
Batch 3（等待 Batch 2 + TASK-001）:
  ├── TASK-003 (backend-dev-expert) ── Plugin/Hook 体系    ┐并行
  │                                                        │
  └── TASK-004 (frontend-dev-expert) ── G6 + useAgentData ─┘
        │
        ▼
Batch 4（等待 TASK-004）:
  └── TASK-005 (frontend-dev-expert) ── Token 仪表盘
```

---

## 10. 风险提醒

| 编号 | 风险 | 严重度 | 触发条件 | 缓解措施 |
|------|------|--------|---------|---------|
| R1 | 单轮次变更行数 ~1225 行，超过 1000 行阈值 | 中 | 全体 | 4 个串行 Batch 分段验证，每 Batch 完成后检查质量；若 TASK-004 实际行数 >400，发出 plan patch 拆分为基础渲染 + 动画交互 |
| R2 | Dashboard.tsx 串行冲突：TASK-004 和 TASK-005 共享同一文件 | 高 | TASK-005 启动时 | 已在 Batch 3→4 串行中处理；TASK-004 在 Dashboard.tsx 中仅嵌入 `<G6FlowChart />` 占位 + 布局调整；TASK-005 在其版本上追加 `<TokenDashboard />`；两者修改不同代码区域，降低冲突 |
| R3 | G6 v5 API 不稳定 | 中 | TASK-004 实现中 | 版本锁定 `@antv/g6@~5.0.0`；若 API 与文档不符，允许使用 `@antv/g6@5.0.0` 精确版本 |
| R4 | `@antv/layout` 额外依赖未在需求中明确 | 低 | TASK-004 安装依赖时 | 安装 `@antv/g6` 后先尝试使用 G6 内建的 dagre；若 G6 v5 已分离 layout 模块，再追加 `@antv/layout` |
| R5 | React.StrictMode 双重挂载导致 Canvas 泄漏 | 中 | TASK-004 开发调试时 | `useEffect` cleanup 中显式调用 `graph.destroy()` + 置空 ref；对 resize 做 300ms debounce |
| R6 | 多轮询僵尸定时器 | 中 | TASK-004 + TASK-005 运行时 | 共享 `useAgentData` hook 单一管理轮询，组件卸载时自动 `clearInterval` |
| R7 | Hook 脚本从 Claude Code 环境变量读取 key 名不确定 | 低 | TASK-003 实现时 | 脚本使用常见命名假设（`CLAUDE_HOOK_EVENT`/`CLAUDE_AGENT_ID`/`CLAUDE_SESSION_ID`），并在 `hooks.json` 中通过 `env` 字段显式映射 |
| R8 | API 端点 `run_id` 可选时需正确解析当前 session | 低 | TASK-002 实现时 | 复用现有 `resolveSid` 逻辑；REST 端点在无 `run_id` 时查询 `getActiveRun(db, sessionId)` |

---

## 11. 实现者交接信息

- **TASK-001 实施者**：请注意后端审查的 12 条修正（F1-F4, S1-S4, I1-I4），特别是 schema 应按审查第 11 节的修正版 SQL 实现。完成后导出 4 个 DB 辅助函数供 TASK-002 使用。
- **TASK-002 实施者**：从 `db.js` 导入 TASK-001 导出的函数。确认 `POST /api/agent-event` 端点已实现（F3/F5）。确认路由注册顺序正确、SSE 数据扩展精简。
- **TASK-003 实施者**：脚本调用 `POST /api/agent-event` REST 端点（非直接 MCP JSON-RPC）。确认 `.claude-plugin/` 目录不存在时创建。
- **TASK-004 实施者**：在开始前读取 `web/src/pages/Dashboard.tsx`、`web/src/api.ts` 的当前状态。创建 `useAgentData` hook 并确认 G6 组件通过 props 接收数据。Dashboard.tsx 中仅嵌入 `<G6FlowChart runId={activeRunId} />` 占位，不动 Token 区域。版本写入 `@antv/g6@~5.0.0`。
- **TASK-005 实施者**：基于 TASK-004 完成后的 `Dashboard.tsx` + `api.ts` + `useAgentData` 进行叠加。通过 props 传递 `runId`，复用 `useAgentData` hook。Dashboard.tsx 中追加 `<TokenDashboard runId={activeRunId} />`。

---

## 12. Execution Packet

---

### task_id: TASK-001
### task_name: 引擎核心 -- Agent 事件追踪基础设施
### requirement_ids: REQ-054, REQ-057
### owner: backend-dev-expert
### objective: 创建 `agent_events` 表的完整 Schema + 实现 3 个 MCP 工具（agent_event/agent_usage/agent_status）+ TDD 单元测试
### in_scope:
- `agent_events` 表创建（按后端审查第 11 节修正版 Schema，含 `model TEXT`、`created_at`、`VIRTUAL` 生成列、CHECK 约束、复合索引）
- `agent_event` MCP 工具：接收 start/end/error 事件 + token 数据 + model，end 事件自动计算 `duration_ms`，session→run 归属验证（F4），成本估算
- `agent_usage` MCP 工具：按 run_id 查询，按 agent_id/model 分组返回 token 统计 + cost（非 Anthropic 模型 cost=null）
- `agent_status` MCP 工具：按 run_id 查询 active/completed/failed 分类
- `MODEL_PRICES` 常量（使用 `gates.ts` 的实际模型 ID：`claude-sonnet-4-6`/`claude-opus-4-7`/`claude-haiku-4-5`）
- 4 个 DB 辅助函数：`insertAgentEvent()`/`getAgentEvents()`/`getAgentUsage()`/`getAgentStatus()`
- `deleteRun()` 级联删除 `agent_events`
- `agent_id` Zod 格式校验（min 1, max 128, regex `/^[a-z0-9-]+$/`）
- TDD 单元测试：6 个测试场景（start 写入/end 计算 duration/error 写入/usage 分组统计/status 分类/成本估算）
### out_of_scope:
- 不修改现有 `checkpoints`/`pipeline_runs` 表结构
- 不修改 `duration_seconds` 为 `duration_ms`（向后兼容）
- 不实现数据清理策略（agent_events 数据量小，默认跟随 `deleteRun()` 级联删除）
### input_documents:
- `docs/2026-05-11/requirements/REQ-G6-visualization-hooks-token.md`
- `docs/2026-05-11/tasks/REQ-G6-visualization-hooks-token-tasks.md`
- `docs/2026-05-11/architecture/backend-review-G6-token.md`
### allowed_paths:
- `src/engine/db.ts`
- `src/engine/server.ts`
- `src/engine/__tests__/agent-events.test.ts`（新建）
### forbidden_paths:
- `src/web/routes.ts`
- `web/src/`
- `src/templates/`
- `.claude/plugins/`
### dependencies:
- 无外部依赖。需引用 `gates.ts` 的 `AVAILABLE_MODELS` 确认模型 ID。
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
- `test-driven-development`
### parallel_group: TASK-006
### wait_for: 无
### acceptance_criteria:
1. `agent_events` 表创建成功，包含 `model`/`created_at`/CHECK 约束/复合索引/`VIRTUAL` total_tokens
2. `agent_event` start→DB 记录 event_type='start', status=null, tokens=0
3. `agent_event` end→自动计算 duration_ms，token 数据正确存储，成本正确计算
4. `agent_event` error→status='error', error_message 写入
5. `agent_event` 拒绝非所属 session 的 run_id（归属验证）
6. `agent_usage` 按 agent_id+model 分组统计正确，DeepSeek 模型 cost=null
7. `agent_status` active/completed/failed 分类正确
8. `deleteRun()` 级联删除关联的 agent_events
9. 全部 6 个 TDD 测试用例通过
### test_strategy: tdd
### handoff_notes:
- 确保 `src/engine/db.ts` 中新增函数以命名导出方式暴露（`export function insertAgentEvent(...)` 等）
- `MODEL_PRICES` 常量放在 `server.ts` 中，使用 `Record<string, ... | null>` 类型
- `agent_event` 的 session→run 归属验证逻辑：
  - 若 `run_id` 已传入：验证该 run 是否属于当前 session（`resolveSid(extra)`）
  - 若 `run_id` 未传入：自动取当前 session 的活跃 run
- 测试文件 `src/engine/__tests__/agent-events.test.ts`（新建，~200 行）
### escalation_rule: 如需变更 `gates.ts` 的 `AVAILABLE_MODELS` 或已有表结构，必须先回编排者，不得直接修改。

---

### task_id: TASK-002
### task_name: Web API 扩展 -- Agent 数据查询端点
### requirement_ids: REQ-058
### owner: backend-api-expert
### objective: 新增 3 个 GET 端点 + 1 个 POST 端点 + SSE 广播扩展，连接前端 Dashboard 与后端 agent_events 表
### in_scope:
- `GET /api/agent-usage?run_id=xxx`：返回按 agent_id+model 分组的 token 统计 + totals
- `GET /api/agent-status?run_id=xxx`：返回 `{ active: [...], completed: [...], failed: [...] }`
- `GET /api/agent-events?run_id=xxx&agent_id=xxx`：返回单个 Agent 的事件历史（按 started_at 排序）
- `POST /api/agent-event`：接收 JSON body（与 MCP agent_event 参数一致），写入 DB（F3）
- SSE `broadcastSSE()` 扩展：数据负载中追加 `agent_status` 字段（精简版：仅 active 列表 + 最近 5 个 completed）
- `run_id` 参数可选，不传时自动使用当前 session 的活跃 run
- TDD 单元测试：5 个测试场景
### out_of_scope:
- 不修改 agent_events 表结构
- 不修改 MCP 工具逻辑
- 不改动 SSE 轮询频率（保持 8s）
### input_documents:
- `docs/2026-05-11/requirements/REQ-G6-visualization-hooks-token.md`
- `docs/2026-05-11/tasks/REQ-G6-visualization-hooks-token-tasks.md`
- `docs/2026-05-11/architecture/backend-review-G6-token.md`
### allowed_paths:
- `src/web/routes.ts`
- `src/web/__tests__/agent-api.test.ts`（新建）
### forbidden_paths:
- `src/engine/db.ts`（只读 import，不修改）
- `src/engine/server.ts`
- `web/src/`
- `.claude/plugins/`
### dependencies:
- TASK-001 导出的 4 个 DB 函数：`insertAgentEvent`/`getAgentEvents`/`getAgentUsage`/`getAgentStatus`
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
- `test-driven-development`
### parallel_group: 无（TASK-002 独占 Batch 2）
### wait_for: TASK-001
### acceptance_criteria:
1. `GET /api/agent-usage?run_id=valid` 返回正确的 JSON 结构（agents + totals + cost）
2. `GET /api/agent-status?run_id=valid` 正确分类 active/completed/failed
3. `GET /api/agent-events?run_id=valid&agent_id=xxx` 按 started_at 排序
4. `POST /api/agent-event` 接收 JSON body 写入 DB，返回事件 ID
5. SSE 广播数据包含 `agent_status` 字段（精简版）
6. 不存在的 `run_id` 返回空数组（不报错）
7. 全部 5 个 TDD 测试用例通过
### test_strategy: tdd
### handoff_notes:
- 使用 Hono 的 `c.req.query()` 解析查询参数
- `POST /api/agent-event` 端点需要从请求上下文解析 session（若无 session 上下文则允许通过 `session_id` body 字段传入）
- SSE `agent_status` 精简为：`{ active: [{agent_id, event_type}], recent_completed: [{agent_id, status}] }`（最多 5 个 completed）
- `GET /api/agent-usage` 返回结构应与 MCP `agent_usage` 保持一致
- 测试文件 `src/web/__tests__/agent-api.test.ts`（新建，~120 行）
### escalation_rule: 如需修改 `db.js` 暴露的函数签名或增加 DB 函数，必须先回编排者，由 TASK-001 执行。

---

### task_id: TASK-003
### task_name: Plugin + Hook 体系 -- 配置与脚本
### requirement_ids: REQ-052, REQ-053, REQ-059, REQ-060
### owner: backend-dev-expert
### objective: 创建 `.claude/plugins/jarvis-visualization/` 完整目录结构，含 plugin.json/hooks.json/Shell&PowerShell 脚本，脚本通过 REST `POST /api/agent-event` 上报事件
### in_scope:
- 创建 `.claude/plugins/jarvis-visualization/plugin.json`（name/version/description/hooks）
- 创建 `.claude/plugins/jarvis-visualization/hooks/hooks.json`（SubagentStart + SubagentEnd 配置）
- 创建 `.claude/plugins/jarvis-visualization/hooks/scripts/agent-event.sh`（Linux/macOS）
- 创建 `.claude/plugins/jarvis-visualization/hooks/scripts/agent-event.ps1`（Windows PowerShell）
- 创建/修改 `.claude-plugin/marketplace.json` 注册插件条目
- 脚本通过 `POST http://localhost:3456/api/agent-event` 调用 REST 端点（非 MCP JSON-RPC）
- 脚本从环境变量读取 hook 上下文（`CLAUDE_HOOK_EVENT`/`CLAUDE_AGENT_ID`/`CLAUDE_SESSION_ID`/`CLAUDE_RUN_ID` 等）
- SubagentEnd hook 从 Agent result 提取 token_usage 并通过脚本传入
### out_of_scope:
- 不实现 `mcp_tool` 类型 hook（已确认使用 `command` + REST 方案，更可靠）
- 不修改引擎代码
- 不编写 hook 的自动化测试（需 Claude Code 运行时环境）
### input_documents:
- `docs/2026-05-11/requirements/REQ-G6-visualization-hooks-token.md`
- `docs/2026-05-11/tasks/REQ-G6-visualization-hooks-token-tasks.md`
- `docs/2026-05-11/architecture/backend-review-G6-token.md`
### allowed_paths:
- `.claude/plugins/jarvis-visualization/`（全部新建）
- `.claude-plugin/marketplace.json`（新建/修改）
### forbidden_paths:
- `src/engine/`
- `src/web/`
- `web/src/`
- `src/templates/`
### dependencies:
- TASK-002 的 `POST /api/agent-event` REST 端点（脚本调用目标）
- TASK-001 的 MCP `agent_event` 工具（数据存储层，但脚本不直接调用）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-004
### wait_for: TASK-001, TASK-002
### acceptance_criteria:
1. `.claude/plugins/jarvis-visualization/` 目录结构完整（3 个文件 + 2 个脚本）
2. `plugin.json` 包含 name/version/description/hooks 四个必填字段
3. `hooks.json` 包含 SubagentStart 配置（event="start"）和 SubagentEnd 配置（event="end"/"error" + token_usage）
4. `agent-event.sh` 可接收环境变量并通过 curl 调用 `POST /api/agent-event`
5. `agent-event.ps1` 可接收环境变量并通过 Invoke-RestMethod 调用 `POST /api/agent-event`
6. `.claude-plugin/marketplace.json` 注册插件条目
7. 两个脚本均包含错误处理（非 2xx 响应输出错误信息到 stderr）
### test_strategy: manual_only（脚本需在 Claude Code 运行时环境中手动验证）
### handoff_notes:
- `hooks.json` 使用 `command` 类型（非 `mcp_tool`），command 指向脚本路径
- 脚本中 API URL 使用 `http://localhost:3456/api/agent-event`（引擎默认端口）
- `hooks.json` 中通过 `env` 字段显式映射环境变量到脚本参数
- Shell 脚本需要 `chmod +x` 权限（在实现说明中标注）
- 环境变量 key 名使用常见命名假设，若 Claude Code 实际 key 名不同，后续通过 plan patch 修正
### escalation_rule: 如需修改 REST API 端点路径或参数结构，必须先回编排者，由 TASK-002 调整。

---

### task_id: TASK-004
### task_name: G6 流程可视化 -- 10-Gate 实时状态图
### requirement_ids: REQ-051, REQ-056, REQ-061
### owner: frontend-dev-expert
### objective: 创建 G6FlowChart 组件渲染 10-Gate dagre 流程图（仅亮色主题）+ 共享 `useAgentData` hook + 集成到 Dashboard 页面
### in_scope:
- 安装 `@antv/g6@~5.0.0`（`web/package.json`）
- 新建 `web/src/hooks/useAgentData.ts`：统一的 agent-status + agent-usage 轮询 hook，每 8 秒轮询一次，返回 `{ agentStatus, agentUsage, loading, error }`
- 新建 `web/src/components/G6FlowChart.tsx`：G6 核心组件（~280 行）
  - 10 个 Gate 节点（A→B→B1→C→C-impl→C1→C1.5→C2→D→E），dagre 布局（从上到下）
  - 节点样式：已通过绿色+对勾 / 当前蓝色+脉冲动画 / 未到达灰色
  - Agent 子状态：活跃（旋转圆点）/ 已完成（绿色对勾）/ 失败（红色叉号）
  - 边样式：已通过绿色实线 / 未通过灰色虚线
  - 交互：点击展开详情、悬停Tooltip、滚轮缩放、fitView
  - 主题：仅亮色，通过 antd `theme.useToken()` 获取 token 配置 G6 颜色
  - 响应式：`width: 100%; height: 400px`（桌面）/ `300px`（平板）/ `250px`（移动）
  - `useEffect` cleanup 中严格调用 `graph.destroy()` + 置空 ref
  - resize 300ms debounce 防抖
- 修改 `web/src/api.ts`：新增 `api.agentStatus()`/`api.agentUsage()`/`api.agentEvents()` 三个方法及 TypeScript 接口
- 修改 `web/src/pages/Dashboard.tsx`：嵌入 `<G6FlowChart />` 组件 + 调用 `useAgentData` hook 传递数据
### out_of_scope:
- 不实现暗色模式（降级 REQ-061，遵循 AF-1 裁决）
- 不监听 `prefers-color-scheme` 变化
- 不修改 TokenDashboard 区域（留给 TASK-005）
- 不拆分子组件（Dashboard 的 GateTimeline/RunHistory 等不在此任务范围）
- 不实现 G6 a11y 隐藏语义层
- 不安装 `@antv/layout`（确认 G6 v5 是否内建 dagre 后再决定）
### input_documents:
- `docs/2026-05-11/requirements/REQ-G6-visualization-hooks-token.md`
- `docs/2026-05-11/tasks/REQ-G6-visualization-hooks-token-tasks.md`
- `docs/2026-05-11/architecture/frontend-review-G6-token.md`
### allowed_paths:
- `web/package.json`
- `web/src/components/G6FlowChart.tsx`（新建）
- `web/src/hooks/useAgentData.ts`（新建）
- `web/src/pages/Dashboard.tsx`
- `web/src/api.ts`
### forbidden_paths:
- `src/engine/`
- `src/web/routes.ts`
- `web/src/components/TokenDashboard.tsx`（不存在且不在本任务范围）
- `.claude/plugins/`
- `src/templates/`
### dependencies:
- TASK-002 的 `GET /api/agent-status` + `GET /api/agent-usage` 端点
- `theme.tsx` 的 antd `theme.useToken()` hook
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-003
### wait_for: TASK-001, TASK-002
### acceptance_criteria:
1. `web/src/hooks/useAgentData.ts` 可独立工作，runId 为 null 时不发起请求
2. G6FlowChart 渲染 10 个 Gate 节点，dagre 布局正确（从上到下）
3. 节点样式正确区分：已通过（绿色+对勾）/ 当前（蓝色+脉冲动画）/ 未到达（灰色）
4. Agent 子状态正确展示（活跃/已完成/失败）
5. 边样式正确：已通过绿色实线 / 未通过灰色虚线
6. 仅亮色主题，颜色通过 `theme.useToken()` 获取（非 `getComputedStyle`）
7. 点击节点展开详情，悬停显示 Tooltip
8. 响应式高度 400/300/250px 三档正确
9. `useEffect` cleanup 中调用了 `graph.destroy()`
10. `api.ts` 新增 3 个方法 + TypeScript 类型定义
11. Dashboard.tsx 中 G6FlowChart 嵌入在现有"Gate 进度"卡片上方
12. 组件卸载后无残留网络请求（8s 内无来自已卸载组件的轮询）
13. `@antv/g6@~5.0.0` 版本写入 package.json
### test_strategy: manual_only（Canvas 渲染组件，需人工视觉验收）
### handoff_notes:
- G6 使用 v5 命令式 API：`new Graph({ container, ... })`，非 React 声明式组件
- `useAgentData` hook 内部使用 `useRef` 存储 interval ID，cleanup 中 `clearInterval`
- Dashboard.tsx 中仅添加 `<G6FlowChart runId={activeRunId} agentStatus={data.agentStatus} agentUsage={data.agentUsage} />`，不动 Token 区域
- 确认 `@antv/g6` 的 dagre 布局是否需要额外安装 `@antv/layout`，如果需要则在 package.json 中追加
- Dashboard.tsx 中 G6FlowChart 放在现有统计卡片行和 GateTimeline 之间
### escalation_rule: 如需修改 `theme.tsx` 恢复暗色模式支持，或修改 `src/engine/` 后端代码，必须先回编排者。`@antv/g6` 版本若需放宽约束也需先回编排者。

---

### task_id: TASK-005
### task_name: Token 仪表盘 -- 实时消耗统计面板
### requirement_ids: REQ-055
### owner: frontend-dev-expert
### objective: 创建 TokenDashboard 组件展示 token 消耗统计（总数/模型分布/Agent 排行/成本/缓存命中率）+ 嵌入 Dashboard 页面
### in_scope:
- 新建 `web/src/components/TokenDashboard.tsx`（~170 行）：
  - 实时 Token 计数（数字滚动动画，`requestAnimationFrame` 实现）
  - 模型分布展示（antd `Progress` 分段显示）
  - Agent Top 5 排行（antd `Table` 或 `List`）
  - 成本估算（Anthropic 模型显示 USD，DeepSeek 显示 "N/A"）
  - 缓存命中率：`cache_read / (cache_read + input) * 100%`
  - 空状态：antd `Empty`
  - 加载状态：antd `Skeleton`/`Spin`
- 修改 `web/src/pages/Dashboard.tsx`：嵌入 `<TokenDashboard runId={activeRunId} />`（在 G6FlowChart 旁边或下方）
- 复用 `web/src/hooks/useAgentData.ts`（TASK-004 已创建）
### out_of_scope:
- 不修改 `api.ts`（TASK-004 已扩展完毕，TASK-005 仅导入使用）
- 不修改 `useAgentData` hook 逻辑（TASK-004 已实现）
- 不实现独立的 Token 轮询（复用 `useAgentData`）
- 不实现图表库（饼图/柱状图使用 antd `Progress` 模拟）
### input_documents:
- `docs/2026-05-11/requirements/REQ-G6-visualization-hooks-token.md`
- `docs/2026-05-11/tasks/REQ-G6-visualization-hooks-token-tasks.md`
- `docs/2026-05-11/architecture/frontend-review-G6-token.md`
### allowed_paths:
- `web/src/components/TokenDashboard.tsx`（新建）
- `web/src/pages/Dashboard.tsx`
### forbidden_paths:
- `web/src/api.ts`（只读 import，不修改）
- `web/src/hooks/useAgentData.ts`（只读 import，不修改）
- `web/src/components/G6FlowChart.tsx`（只读，不修改）
- `src/engine/`
- `src/web/routes.ts`
- `.claude/plugins/`
### dependencies:
- TASK-004 的 `api.ts` 扩展（`api.agentUsage()` 方法）
- TASK-004 的 `useAgentData` hook（统一数据源）
- TASK-004 的 `Dashboard.tsx` 修改版本（布局基础）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: 无（TASK-005 独占 Batch 4）
### wait_for: TASK-001, TASK-002, TASK-004
### acceptance_criteria:
1. TokenDashboard 正确显示当前 run 的总 token 数（数字滚动动画）
2. 模型分布 Progress 条正确（按 model 分组）
3. Agent Top 5 消耗排行正确（按 total_tokens 降序）
4. 成本估算正确：Claude 模型显示 USD（保留 3 位小数），DeepSeek 显示 "N/A -- 非 Anthropic 模型"
5. 缓存命中率计算正确：`cache_read / (cache_read + input) * 100%`
6. 空数据时显示 antd `Empty`
7. 加载中显示 antd `Skeleton`/`Spin`
8. Dashboard.tsx 中 TokenDashboard 嵌入在 G6FlowChart 旁边（侧边栏）或下方
9. 组件卸载后无残留网络请求
### test_strategy: manual_only（前端展示组件，需人工验收）
### handoff_notes:
- 数字滚动动画：使用 `requestAnimationFrame` + 缓动函数（ease-out），从旧值过渡到新值，动画时长 800ms
- 模型分布使用 antd `Progress` 的 `percent` + `format` 属性，每段显示模型名 + token 数
- Agent 排行使用 antd `Table` 组件展示 Top 5，列：排名/Agent 名称/总 Token/成本
- 缓存命中率使用 antd `Progress` 环形图展示
- Dashboard.tsx 中 TokenDashboard 放在 G6FlowChart 右侧（如果布局宽敞）或下方（紧凑布局）
- TokenDashboard 通过 `useAgentData` hook 的 `agentUsage` 字段获取数据
### escalation_rule: 如需修改 `api.ts` 或 `useAgentData.ts` 的方法签名，必须先回编排者，由 TASK-004 调整。

---

### task_id: TASK-006
### task_name: 命令模板优化 -- Agent 名称与路由同步
### requirement_ids: REQ-062
### owner: backend-dev-expert
### objective: 审核 16 个命令模板（`.md`），修正过时的 Agent 名称引用，确保与 `.claude/agents/` 一致
### in_scope:
- 审核 `src/templates/platforms/claude/commands/` 下全部 16 个 `.md` 文件
- 将 `docs-research-expert` 引用替换为 `external-resource-expert`（若存在）
- 将 `fix-retest` 引用替换为 `remediation-expert`（若存在）
- 将 `remediation-planner` 引用替换为 `remediation-expert`（若存在）
- 确认 `browser-test.md` 中修复闭环引用正确
- 确认 `jarvis.md` 中 Agent 路由表包含 `external-resource-expert` 和 `remediation-expert`
- 确认所有命令的 `subagent_type` 值与 `.claude/agents/` 文件名一致
- 输出审核报告：每个文件的检查结果（已正确/已修正/无需修正）
### out_of_scope:
- 不创建新命令模板
- 不修改 Agent 配置文件（`.claude/agents/*.md`）
- 不修改引擎代码
- 不变更流水线定义
### input_documents:
- `docs/2026-05-11/requirements/REQ-G6-visualization-hooks-token.md`
- `docs/2026-05-11/tasks/REQ-G6-visualization-hooks-token-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/commands/*.md`（全部 16 个文件）
### forbidden_paths:
- `src/engine/`
- `src/web/`
- `web/src/`
- `.claude/agents/`
- `.claude/plugins/`
### dependencies: 无代码依赖。需参考 `AGENTS.md` 了解最新 Agent 清单。
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: TASK-001
### wait_for: 无
### acceptance_criteria:
1. 全部 16 个命令模板审核完毕
2. 所有 `docs-research-expert` → `external-resource-expert` 替换完成
3. 所有 `fix-retest` → `remediation-expert` 替换完成
4. 所有 `remediation-planner` → `remediation-expert` 替换完成
5. `browser-test.md` 的修复闭环引用 `remediation-expert` 确认正确
6. `jarvis.md` 的 Agent 路由表包含 `external-resource-expert` 和 `remediation-expert`
7. 所有 `subagent_type` 值与 `.claude/agents/` 文件名一致
8. 审核报告记录每个文件的处理结果
### test_strategy: manual_only（模板文本审核，无需自动化测试）
### handoff_notes:
- 审核前先用 Grep 搜索 16 个文件中的 `docs-research-expert`/`fix-retest`/`remediation-planner` 关键词
- 修改原则：精准替换，不做格式优化或无关改动
- 审核报告以注释形式附加在 TASK-006 完成文档中
- 重点关注 `jarvis.md`/`browser-test.md`/`review-fix.md` 三个文件
### escalation_rule: 如发现某个 Agent 名称在模板中频繁出现但 `.claude/agents/` 中已不存在，回编排者确认替换方案。

---

## 13. plan patch / contract change request 触发条件

以下任一情况发生时，实现 Agent 必须停止当前工作并回编排者发起 plan patch：

| 触发条件 | 来源 TASK | 处理方式 |
|---------|----------|---------|
| `@antv/g6` 版本 `~5.0.0` 发生 breaking change 导致代码不兼容 | TASK-004 | 锁定精确版本或放宽约束 |
| G6 v5 的 dagre 需要额外安装 `@antv/layout` 且安装后 bundle 增量 >100KB gzip | TASK-004 | 评估性能影响，可能改用其他布局方案 |
| `agent_events` 表实际行数 > 预估 250 行（例如 DB 函数签名与现有模式冲突需要大量重构） | TASK-001 | 拆分 schema 创建和 MCP 工具为两个子任务 |
| REST API 端点需要修改 TASK-001 导出的 DB 函数签名 | TASK-002 | 与 TASK-001 协调接口契约 |
| Claude Code hook 环境变量 key 名与脚本假设不符 | TASK-003 | 调整脚本变量映射 |
| Dashboard.tsx 在 TASK-004 交付后发生独立变更导致 TASK-005 的基础版本过时 | TASK-005 | 重新基于最新 Dashboard.tsx 实现 |
| 命令模板中发现大量不存在的 Agent 引用（>5 处）需要逐个确认 | TASK-006 | 列出所有冲突点，等待编排者逐项裁决 |

---

## 14. 推荐的下一步

1. **立即启动 Batch 1**：同时 spawn `backend-dev-expert`（TASK-001）和 `backend-dev-expert`（TASK-006），两个 Agent 无共享文件可并行执行
2. **TASK-001 完成后**：Gate 检查点 -- 验证 6 个 TDD 测试全绿 + MCP 工具可用 → 启动 Batch 2
3. **Batch 2（TASK-002）完成后**：验证 3 GET + 1 POST 端点返回正确数据 + 5 个 TDD 测试全绿 → 启动 Batch 3
4. **Batch 3**：并行 spawn `backend-dev-expert`（TASK-003）和 `frontend-dev-expert`（TASK-004）
5. **TASK-004 完成后**：Gate 检查点 -- 人工视觉验收 G6 图表渲染 + 验证无 Canvas 泄漏 → 启动 Batch 4（TASK-005）
6. **全部完成后**：运行全量 `lint` + `typecheck` + `build` + `test`，全部通过后进入 Gate C1

---

## 附录 A：文件变更矩阵

| 文件 | TASK-001 | TASK-002 | TASK-003 | TASK-004 | TASK-005 | TASK-006 | 总操作 |
|------|---------|---------|---------|---------|---------|---------|--------|
| `src/engine/db.ts` | **写~100** | 只读 | - | - | - | - | 修改 |
| `src/engine/server.ts` | **写~180** | - | - | - | - | - | 修改 |
| `src/engine/__tests__/agent-events.test.ts` | **新建~200** | - | - | - | - | - | 新建 |
| `src/web/routes.ts` | - | **写~120** | - | - | - | - | 修改 |
| `src/web/__tests__/agent-api.test.ts` | - | **新建~120** | - | - | - | - | 新建 |
| `web/package.json` | - | - | - | **写~5** | - | - | 修改 |
| `web/src/components/G6FlowChart.tsx` | - | - | - | **新建~280** | - | - | 新建 |
| `web/src/hooks/useAgentData.ts` | - | - | - | **新建~60** | 只读 | - | 新建 |
| `web/src/components/TokenDashboard.tsx` | - | - | - | - | **新建~170** | - | 新建 |
| `web/src/pages/Dashboard.tsx` | - | - | - | **写~50** | **写~50** | - | 修改 |
| `web/src/api.ts` | - | - | - | **写~45** | 只读 | - | 修改 |
| `.claude/plugins/jarvis-visualization/*` | - | - | **新建~150** | - | - | - | 新建 |
| `.claude-plugin/marketplace.json` | - | - | **写~5** | - | - | - | 修改 |
| `src/templates/.../commands/*.md` | - | - | - | - | - | **写~80** | 修改 |

> **预估总变更行数：~1225 行（含测试）（接近 1000 行阈值，见风险 R1）**。其中引擎核心~480 行，Web API~240 行，Plugin~155 行，前端~610 行（含组件+API+hook+Dashboard），模板~80 行。

## 附录 B：验收验证清单

### Batch 1 验证
- [ ] `agent_events` 表存在且结构符合修正版 Schema（含 model/created_at/VIRTUAL/CHECK）
- [ ] `agent_event`/`agent_usage`/`agent_status` MCP 工具可调用且返回正确数据
- [ ] 6 个 TDD 测试全绿
- [ ] 16 个命令模板审核报告完成

### Batch 2 验证
- [ ] `GET /api/agent-usage`、`GET /api/agent-status`、`GET /api/agent-events` 返回正确 JSON
- [ ] `POST /api/agent-event` 写入 DB 成功
- [ ] SSE 广播含 `agent_status` 字段
- [ ] 5 个 TDD 测试全绿

### Batch 3 验证
- [ ] G6FlowChart 渲染 10 个 Gate 节点，dagre 布局正确
- [ ] 节点/边样式正确（仅亮色主题）
- [ ] 交互（点击/Tooltip/缩放）正常
- [ ] `useAgentData` hook 统一轮询正常工作
- [ ] 组件卸载后无 Canvas 泄漏、无残留请求
- [ ] `.claude/plugins/jarvis-visualization/` 目录结构完整

### Batch 4 验证
- [ ] TokenDashboard 正确展示 token 统计
- [ ] 成本估算正确（Claude 模型 vs DeepSeek）
- [ ] 缓存命中率计算正确
- [ ] 数字滚动动画流畅

### 全量验证（所有 Batch 完成）
- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过（`cd web && npm run build` 也通过）
- [ ] 所有单元测试通过（`npm test`）
- [ ] Dashboard 页面完整可交互（G6FlowChart + TokenDashboard + 原有内容）
