<!-- Generated: 2026-06-04T10:30:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# tests/ — 测试套件

## Role
项目测试套件，覆盖引擎核心、Web 路由、数据库、Gate FSM、MCP 工具注册、PubSub 事件、守护进程、Agent 注册表、Wiki 存储、质量门禁、CLI hook 命令和配置文件合并。采用 vitest，22 个文件，101+ 测试用例。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| vitest globals | 全部 | framework | describe/it/expect/vi 全局可用 |
| `openDb()` | db.test.ts + 多文件 | function | 每个测试文件使用独立 SQLite (tmpdir + Date.now + random) |
| `vi.mock` | 多文件 | mock | 模块级 mock (fs, db, agent-registry, os) |
| `vi.hoisted` | gates.test.ts 等 | mock | mock 前初始化变量 |
| `vi.useFakeTimers` | guardian.test.ts 等 | timer | 时间相关场景 (退避/去抖/冷却窗口) |

## Key Files

| File | Role | Description |
|------|------|-------------|
| gates.test.ts | 引擎核心 | 最大测试文件 (802 行)。Gate 流水线定义、操作权限、Agent spawn、派生表一致性、17 条流水线全覆盖 |
| db.test.ts | 引擎核心 | Sessions/Pipeline/Checkpoints/AgentConfig/RunTaskName/GateDuration/Archive CRUD |
| server-mcp-core.test.ts | Web+引擎 | MCP Core API 集成测试 (session_join/gate_check/advance_gate/pipeline_init/gate_enforce/pipeline_guide) |
| guardian.test.ts | 引擎核心 | 守护进程 PID 管理、崩溃重启策略 (指数退避, 最大 3 次) |
| pubsub.test.ts | 引擎核心 | PubSub 事件系统 (单例、4 种事件、stats、reset) |
| agent-registry.test.ts | 引擎核心 | Agent 三层配置合并 (模板/全局/项目)、resolveTemplatesDir |
| quality-gate.test.ts | 引擎核心 | 质量门禁配置加载 (三档降级)、判定逻辑 (block/warn) |
| wiki-store.test.ts | 引擎核心 | Wiki CRUD、frontmatter、索引、查询、lint |
| sse-broadcast.test.ts | Web | SSE 广播 (500ms 去抖、8s 兜底定时器) |
| routes-emit.test.ts | Web | routes.ts 9 条写操作事件发射 |
| docs-api.test.ts | Web | 产物资质读取 + 路径遍历攻击防护 |
| hook-cmd.test.ts | CLI | hookCommand 20 个测试用例 |
| install-merge.test.ts | 共享 | 深度合并 + MCP servers 合并逻辑 |

## Conventions
- **框架**: vitest (globals), environment: node, timeout 10s
- **文件命名**: `{module}.test.ts` 平铺在 tests/ 下
- **数据库隔离**: 每个文件独立 tmpdir SQLite, 避免 CI 并行竞争
- **Mock 策略**: vi.mock (模块级) + vi.hoisted (初始化) + vi.spyOn (方法拦截) + vi.useFakeTimers (时间)
- **中文注释**: 测试描述用中文, TASK-xxx / AC 编号
- **高风险共享调用点**: addCheckpoint (5 文件引用), emitEvent (3+ 文件引用), openDb (几乎所有 db 测试)

## Entry Points
- `npm test` → vitest run (全部 22 个文件)
- `npm run test:watch` → vitest (监视模式)
- `npx vitest run tests/<file>.test.ts` → 单文件

## Dependencies
- **Internal:** src/engine/*, src/web/*, src/cli/*, src/shared/*
- **External:** vitest 4.x, hono (集成测试), typescript

## For AI Agents
- **新增测试**: 放在 tests/ 根目录 (不支持子目录). 使用独立 SQLite 路径.
- **修改 addCheckpoint 签名**: 需同步更新 5 个测试文件
- **修改 emitEvent 签名/事件类型**: 需同步 routes-emit, server-emit, sse-broadcast
- **时间相关测试**: 使用 vi.useFakeTimers + vi.advanceTimersByTime

<!-- MANUAL:START -->
<!-- MANUAL:END -->
