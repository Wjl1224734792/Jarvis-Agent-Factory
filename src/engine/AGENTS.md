<!-- Generated: 2026-06-03 -->
<!-- Parent: ../AGENTS.md -->

# engine — MCP 编排引擎核心

## Role
整个 Jarvis 系统的运行时中枢。实现 SQLite 持久化的 FSM 流水线引擎，通过 40+ 个 MCP 工具暴露会话管理、Gate 控制、Agent 配置、AST 搜索、LSP 集成、Wiki 存储等能力。支持双传输模式：stdio（Claude Code 直连）和 HTTP+SSE（独立运行）。

## Key Abstractions
| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `PIPELINE_DEFS` / `GATE_CONFIG` | gates.ts | const | 18 条流水线定义 + 40+ Gate 配置，含操作许可/Agent 路由/重试限制——FSM 规则手册 |
| `startEngine` | server.ts | async fn | 引擎唯一入口：打开 DB、创建 MCP Server、注册全部 10 组工具、启动 HTTP/stdio |
| `openDb` / schema + CRUD | db.ts | fn + 50+ exports | SQLite 8 表 12 迁移，全部 CRUD（session/run/checkpoint/agent/artifact/event/memory/flow_skill） |
| `getAgentList` | agent-registry.ts | fn | 三层配置合并（template→global→project），YAML frontmatter 解析 |
| `startGuardian` / `handleCrash` | guardian.ts | fn | 崩溃恢复：指数退避重试(1s/2s/4s)，PID 文件管理 |
| `LspClient` | tools/lsp/client.ts | class | JSON-RPC 2.0 LSP 客户端，支持 19 种语言服务器 |
| `registerMcpTools` | server.ts | fn | 10 组工具注册入口，注入统一 ToolContext |
| `archiveSession` | session-archive.ts | fn | OMC 风格会话归档：事件消费→摘要生成→context 注入 |
| `broadcastSSE` | (在 src/web/routes.ts) | fn | SSE 实时推送，500ms 去抖，并发锁 |

## Key Files
| File | Role | Description |
|------|------|-------------|
| server.ts | 引擎入口 | Hono app 创建、DB 开启、MCP 工具注册、双传输启动、Web SPA 服务、优雅关闭 |
| db.ts | 数据库层 | Schema 定义、增量迁移、全部 CRUD 操作 |
| gates.ts | FSM 配置 | 流水线类型定义 + Gate 配置 + 产物扫描规则 |
| agent-registry.ts | Agent 注册表 | 目录扫描、三层合并、前端 API 暴露 |
| guardian.ts | 守护进程 | PID 文件、存活检查、崩溃重启、信号注册 |
| pubsub.ts | 事件总线 | EventEmitter 单例，跨模块事件广播 |
| tools/pipeline-tools.ts | MCP: 流水线 | init/status/enforce/advance/resume/jump/cancel/report — FSM 核心操作 |
| tools/session-tools.ts | MCP: 会话 | join/heartbeat/list/leave/set_name — 会话生命周期 |
| tools/gate-tools.ts | MCP: Gate | gate_check（权限校验）+ pipeline_guide（上下文指引） |
| tools/agent-tools.ts | MCP: Agent | agent_config（模型/effort CRUD）+ platform_info |
| tools/ast-tools.ts | MCP: AST | AST-grep 搜索+替换，17 语言支持 |
| tools/lsp-tools.ts | MCP: LSP | 12 工具：hover/definition/references/symbols/diagnostics/rename/codeActions |
| tools/wiki-tools.ts | MCP: Wiki | repowiki CRUD + query + lint |
| tools/file-claim-tools.ts | MCP: 文件冲突 | register/release/check — 并行 Agent 文件独占 |
| tools/memory-tools.ts | MCP: 记忆 | working_memory CRUD + session_context + priority_context |
| wiki-store.ts | Wiki 存储 | 文件系统 Wiki，YAML frontmatter，文件锁，健康检查 |
| session-archive.ts | 会话归档 | 事件消费→摘要生成→context 注入→session-logs 写入 |

## Conventions
- MCP 工具签名: `(args, extra) => ctx.resp(result)`
- 工具注册函数: `registerXxxTools(server, db, root, ctx)`
- DB 操作使用 prepared statements + 参数化查询
- session_id 解析: HTTP 模式用 transport sessionId，stdio 用全局 fallback
- 文件路径必须 resolve + startsWith 检查防遍历攻击
- Gate FSM 拒绝回退/跳跃（auto/ask/improve 除外: allow_jump）
- 事件驱动: pubsub 广播 `session:changed`/`run:changed`/`gate:advanced`/`agent:event`

## For AI Agents
- 新增 MCP 工具: 在 `tools/` 下新建 register 函数，在 `registerMcpTools()` 中注册
- 新增流水线: 修改 `gates.ts` 的 `PIPELINE_DEFS` + `GATE_CONFIG`，FSM 引擎无需改动
- 修改 DB Schema: 在 `db.ts` 的 `MIGRATIONS` 数组中添加增量条目
- 新增语言服务器: 在 `tools/lsp/servers.ts` 的 `LSP_SERVERS` 中添加配置
- 文件冲突防护是内存级的（单进程），不跨重启
- session_join 是所有工具的前置门禁

## Dependencies
- **Internal:** src/shared (markdown-utils, package-version)
- **External:** @modelcontextprotocol/sdk, hono, zod, yaml, @ast-grep/napi, node:sqlite

<!-- MANUAL:START -->
<!-- MANUAL:END -->
