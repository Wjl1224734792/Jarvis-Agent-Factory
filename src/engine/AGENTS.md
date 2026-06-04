<!-- Generated: 2026-06-04T10:30:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# src/engine — MCP 编排引擎核心

## Role
MCP 编排引擎运行时核心——管理 FSM Gate 状态机 (17 条流水线, 55+ Gate)、会话生命周期、SQLite 持久化 (10 张表, 12 个迁移)、Agent/Skill 三层动态发现、50 个 MCP 工具注册和进程守护。

## Architecture
引擎核心层。同时提供 stdio (Claude Code 集成) 和 HTTP+SSE (Web 面板) 两种传输方式。所有领域逻辑集中在 MCP 工具注册函数和共享 SQLite 数据库。引导顺序: Hono → MCP → 文件监控 → 守护进程 → 会话清理。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `startEngine()` | server.ts | function | 主入口——启动 Hono HTTP + MCP Server + 文件监控 + 守护进程 |
| `PIPELINE_DEFS` | gates.ts | const | 17 条流水线类型及其 Gate 序列注册表 |
| `GATE_CONFIG` | gates.ts | const | 55+ Gate 的统一配置: 产物目录、检查条件、操作约束、可生成 Agent、重试次数 |
| `openDb()` | db.ts | function | 打开/创建 SQLite 数据库, 执行 schema 和迁移 |
| `getAgentList()` | agent-registry.ts | function | 三层 Agent 动态发现: template → global → project |
| `getSkillList()` | agent-registry.ts | function | 三层 Skill 动态发现, 与 Agent 发现镜像 |
| `ToolContext` | tools/types.ts | interface | 所有工具共享: session 解析, 响应格式化, stdio 回退 |
| `emitEvent()` | pubsub.ts | function | 进程内事件总线单例, 4 种事件类型 |
| `evaluateQualityGate()` | quality-gate.ts | function | 质量门禁判定核心函数 |
| `PidData` | guardian.ts | interface | PID 文件数据结构 { pid, startedAt, restartCount } |

## Key Files

| File | Role | Description |
|------|------|-------------|
| server.ts | 启动入口 | 612 行。引导 Hono + MCP + 10 组工具注册 + API 路由 + 静态文件 + PID/守护进程 + 过期会话清理 |
| gates.ts | FSM 配置 | 365 行。17 条流水线 + 55+ Gate 约束, 6 张派生查找表自动生成 |
| db.ts | 数据层 | 930 行 (最大)。10 张表 + 12 个迁移 + 60+ CRUD 函数。被 9 个文件依赖 |
| agent-registry.ts | Agent/Skill 发现 | 527 行。三层动态发现 (template→global→project), 图标/分类/角色推断 |
| guardian.ts | 进程守护 | 280 行。PID 文件管理 + 崩溃自动重启 (最多 3 次, 指数退避 1s/2s/4s) |
| wiki-store.ts | Wiki 存储 | 339 行。文件级 Markdown Wiki, CRUD + lint + 搜索, 文件锁防并发 |
| pubsub.ts | 事件总线 | 102 行。EventEmitter 单例, SSE 广播统计 |
| quality-gate.ts | 质量门禁 | 268 行。YAML 配置加载 + 三档降级 (DEFAULT/PROJECT/FALLBACK) |
| file-watcher.ts | 文件监听 | 117 行。递归监听 .jarvis/**/*.md, 300ms 防抖, 自动注册产物 |

## Subdirectories

| Directory | Description | AGENTS |
|-----------|-------------|--------|
| tools/ | 10 组 MCP 工具注册 (50 个工具) | [AGENTS.md](./tools/AGENTS.md) |

## Conventions
- **工具注册**: 每个 tools/*.ts 导出 register*Tools(server, db, root, ctx), 在 server.ts::registerMcpTools() 统一调用
- **会话隔离**: ctx.resolveSid() 解析; HTTP 模式从 extra.sessionId 获取, stdio 从 _lastSessionId 回退
- **FSM 硬约束**: Gate 推进验证序列顺序/产物存在/入口条件; 操作前必须 gate_check
- **三层发现**: Agent/Skill 按 template → global → project 优先级覆盖, mergeAgents() Set 去重
- **数据库优先**: 项目级 DB 隔离 (.jarvis/engine.db)
- **双传输**: stdio (单连接) + HTTP (多连接并发, StreamableHTTPServerTransport)

## Entry Points
- `startEngine({ port, projectRoot, stdio })` — 引擎主入口
- `startWeb({ port, enginePort, projectRoot })` — Web 面板代理
- `stopEngine(projectRoot)` — 终止引擎
- `registerMcpTools(server, db, root, isStdio)` — 注册全部 10 组 MCP 工具

## Dependencies
- **Internal:** tools/ (全部 10 组), shared/markdown-utils.ts
- **External:** hono, @hono/node-server, @modelcontextprotocol/sdk, yaml, zod, @ast-grep/napi (惰性)

## For AI Agents
- **修改 gates.ts::GATE_CONFIG**: 影响全部 17 条流水线, 需回归测试. 派生表自动生成不手动维护.
- **修改 db.ts**: 被 9 个文件依赖. schema 变更: MIGRATIONS 数组追加 + initSchema() 添加新表. 不修改已有迁移.
- **修改 agent-registry.ts**: PLATFORM_CONFIG 目前仅保留 claude 平台.
- **新增流水线**: PIPELINE_DEFS 添加条目 → 每个 Gate 增加 GATE_CONFIG → 更新文档.
- **引导顺序不可调换**: Hono → MCP → 文件监控 → 守护进程 → 会话清理.
- **测试**: tests/ 下 22 个文件, `npm test` (vitest).

<!-- MANUAL:START -->
<!-- MANUAL:END -->
