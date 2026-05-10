# OpenCode Gate Hook 增强 — 后端实现文档

## 1. 当前实现目标

增强 `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts`，为 OpenCode 插件增加 `tool.execute.before` 硬阻断能力，以及 `session.error`、`permission.asked` 等事件上报能力。同时增强 `tool.execute.after` 和 `session.idle` 的事件同步。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**: REQ-001
- **任务 ID**: TASK-001
- **任务名称**: OpenCode Gate Hook 增强

## 3. 输入依据

- Execution Packet: TASK-001 (编排者分配)
- 当前源文件: `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts`
- 依赖 CLI: `jarvis hook gate-check` (已存在)
- 依赖 API: `http://localhost:3456/api/events` (POST)、`http://localhost:3456/api/pipeline` (POST)
- 测试框架: Vitest 4.x + TypeScript + ESLint

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` | 修改 | 新增 3 个 hook、增强 2 个 hook、提取公共辅助函数 |
| `tests/gate-hook.test.ts` | 新增 | TDD 测试，9 个用例覆盖全部 5 个 hook |

**禁止修改范围（未触碰）:**
- `src/engine/gates.ts` — Gate 核心逻辑
- `src/engine/server.ts` — 引擎 MCP 定义
- `src/engine/db.ts` — 数据库层
- `src/web/` — Web 面板

## 5. 实现说明

### 5.1 架构概览

```
┌──────────────────────────────────────────────────────────┐
│ OpenCode Runtime                                          │
│  ├─ tool.execute.before  ──→ Gate check (hard block)     │
│  ├─ tool.execute.after   ──→ Gate check + POST /events   │
│  ├─ session.idle         ──→ status + POST /pipeline     │
│  ├─ session.error        ──→ POST /events                │
│  └─ permission.asked     ──→ POST /events                │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌───────────────────────┐
              │ Jarvis Engine (3456)  │
              │  /api/events (SSE)    │
              │  /api/pipeline        │
              └───────────────────────┘
```

### 5.2 5 个 Hook 详细设计

#### 5.2.1 `tool.execute.before` (新增)

- **触发时机**: 工具执行前
- **过滤规则**: 仅对 `Task`/`Agent`/`Write`/`Edit`/`Bash` 这 5 个关键工具执行检查
- **Gate 检查**: 调用 `execSync('jarvis hook gate-check', ...)`
- **阻断逻辑**: 当输出包含 `NOT met` 或 `BLOCKED` 时，`throw new Error('[Jarvis] Gate BLOCKED: ...')`，OpenCode 插件系统捕获后阻断工具调用
- **允许逻辑**: Gate 满足时静默返回 `undefined`

#### 5.2.2 `tool.execute.after` (增强)

- **触发时机**: 工具执行后
- **过滤规则**: 仅对 `Task`/`Agent`/`task` 执行检查
- **Gate 检查**: 保持原有静默报警模式（NOT met → console.error，异常 → console.error）
- **事件上报**: `fetch POST http://localhost:3456/api/events`，payload 含 `type`、`tool`、`timestamp`
- **错误处理**: execSync 异常不抛出，fetch 失败静默降级

#### 5.2.3 `session.idle` (增强)

- **触发时机**: 会话空闲
- **状态同步**: 保持原有 `execSync('jarvis hook status')` 调用
- **流水线同步**: `fetch POST http://localhost:3456/api/pipeline`，payload 含 `type`、`timestamp`
- **错误处理**: 两端均静默降级

#### 5.2.4 `session.error` (新增)

- **触发时机**: 会话发生错误
- **事件上报**: `fetch POST http://localhost:3456/api/events`，payload 含 `type`、`error`（message 字段）、`timestamp`
- **错误处理**: fetch 失败静默降级（不二次抛异常避免雪崩）

#### 5.2.5 `permission.asked` (新增)

- **触发时机**: 工具请求权限
- **事件记录**: `fetch POST http://localhost:3456/api/events`，payload 含 `type`、`permission`（原始权限对象）、`timestamp`
- **错误处理**: fetch 失败静默降级

### 5.3 辅助函数

- **`postEvent(path, payload)`**: 统一的 POST JSON 到引擎的方法，内部 try/catch 静默降级
- **`getToolName(input)`**: 从 tool input 中提取工具名称（闭包内函数，复用现有模式）
- **常量**: `BLOCKABLE_TOOLS` (Set) 和 `GATE_CHECK_TOOLS` (Set) 管理需要检查的工具列表

### 5.4 关键设计决策

| 决策 | 理由 |
|------|------|
| `tool.execute.before` 仅阻塞 5 个关键工具 | 避免影响 Read/Grep 等只读工具性能，保持 Agent 可用性 |
| `tool.execute.after` 的 Gate 检查用 console.error 而非 throw | 向后兼容，已执行的工具不因 Gate 失败中断 |
| fetch 失败全部静默降级 | 引擎不可达不应阻断 Agent 执行（插件为旁路逻辑） |
| 使用 Set 而非数组做工具过滤 | O(1) 查询，语义清晰 |
| 保留原有 `session.idle` 的 `execSync` 调用 | 向后兼容，不破坏已有的 `jarvis hook status` 依赖 |

## 6. 测试和验证结果

### 6.1 测试用例 (9 个)

| # | 测试名称 | 覆盖 Hook | 验证点 |
|---|---------|----------|--------|
| 1 | Gate 满足时允许工具执行 | `tool.execute.before` | 不抛错，调用 gate-check |
| 2 | Gate 不满足时抛出 Error 硬阻断 | `tool.execute.before` | 抛出 `[Jarvis] Gate BLOCKED` |
| 3 | 非关键工具不触发 gate-check | `tool.execute.before` | Read 工具不调用 execSync |
| 4 | Task 工具执行后 POST 事件 | `tool.execute.after` | fetch 到 /api/events 携带正确 payload |
| 5 | 会话空闲时同步流水线 | `session.idle` | fetch 到 /api/pipeline |
| 6 | 错误发生时 POST 错误信息 | `session.error` | fetch 到 /api/events 含 error 字段 |
| 7 | 权限请求时记录 | `permission.asked` | fetch 到 /api/events 含 permission |
| 8 | execSync 异常时不影响流程 | `tool.execute.after` | console.error 报警但不抛出 |
| 9 | fetch 网络错误时不抛出 | 全部 fetch hook | 所有 hook 静默降级 |

### 6.2 运行结果

```
❯ npx vitest run
Test Files  5 passed (5)
     Tests  68 passed (68)
  Duration  688ms

❯ npx tsc --noEmit
(no errors)

❯ npx eslint tests/gate-hook.test.ts
(no warnings or errors)
```

- **全量测试**: 68/68 通过（59 existing + 9 new）
- **TypeScript**: 零类型错误
- **ESLint**: 零新增警告/错误

## 7. 数据与接口边界

### 7.1 输入（Input Contract）

| Hook | 参数 | 类型 | 说明 |
|------|------|------|------|
| `tool.execute.before` | `input` | `{ tool?: string; params?: { name?: string } }` | OpenCode 工具输入 |
| `tool.execute.after` | `input`, `output` | 同上 + `{ result?: unknown }` | OpenCode 工具输入输出 |
| `session.idle` | (无) | — | 无参数 |
| `session.error` | `error` | `Error \| string` | 错误对象或描述 |
| `permission.asked` | `permission` | `{ tool: string; ... }` | 权限请求详情 |

### 7.2 输出（Output Contract）

| Hook | 正常返回 | 异常行为 |
|------|---------|---------|
| `tool.execute.before` | `undefined` | 抛出 `Error('[Jarvis] Gate BLOCKED: ...')` |
| `tool.execute.after` | `undefined` | 静默降级（console.error + 继续执行） |
| `session.idle` | `undefined` | 静默降级 |
| `session.error` | `undefined` | 静默降级 |
| `permission.asked` | `undefined` | 静默降级 |

### 7.3 引擎 API 调用

| Hook | API 端点 | Method | Payload 关键字段 |
|------|---------|--------|-----------------|
| `tool.execute.after` | `/api/events` | POST | `type`, `tool`, `status`, `timestamp` |
| `session.idle` | `/api/pipeline` | POST | `type`, `timestamp` |
| `session.error` | `/api/events` | POST | `type`, `error`, `timestamp` |
| `permission.asked` | `/api/events` | POST | `type`, `permission`, `timestamp` |

### 7.4 引擎不可达时的降级策略

所有 `fetch()` 调用均包裹在 `try/catch` 中，引擎不可达（端口未监听、网络错误）时：
1. 不抛出异常
2. 不阻塞 Agent 执行
3. 不打印日志（避免噪声）

## 8. 风险 / 未解决项

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| `tool.execute.before` 阻断过于激进可能影响正常工作流 | 低 | 仅针对 5 个关键工具，Gate 逻辑由引擎侧控制 |
| 引擎不可达时事件丢失 | 低 | 插件为旁路增强，核心流程不受影响；未来可加本地缓冲队列 |
| `API_BASE` 硬编码 `localhost:3456` | 中 | 当前均为 localhost 部署，若需远程部署需改为环境变量，**此变更需编排者决策** |

## 9. 需要前端配合的点

- 无直接前端变更需求
- 引擎侧 `/api/events`（SSE 端点）需能接收新增的 3 种事件类型：`tool.execute.after`、`session.error`、`permission.asked`
- 引擎侧 `/api/pipeline` 需能处理 `session.idle` 事件

## 10. 推荐的下一步

1. **引擎侧验证**: 确保 `/api/events` 和 `/api/pipeline` 端点已就绪，能够接收并处理新增的事件类型
2. **集成测试**: 在真实 OpenCode 环境中加载插件，验证 `tool.execute.before` 阻断行为
3. **Gate 阈值调优**: 根据实际使用反馈调整 `BLOCKABLE_TOOLS` 集合（当前为 5 个关键工具）
4. **可配置化 API_BASE**: 若未来需非 localhost 部署，考虑通过环境变量 `JARVIS_API_BASE` 传入
