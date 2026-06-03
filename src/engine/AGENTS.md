<!-- Generated: 2026-06-03T16:32:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# engine — MCP 编排引擎核心

## Purpose
引擎是 Jarvis 的运行时核心——管理 FSM Gate 状态机、会话生命周期、SQLite 持久化、Agent/Skill 发现、MCP 工具注册和进程守护。它是驱动整个 AI Agent 工厂工作流的后端。

## Architecture

```
engine/
├── server.ts           # HTTP/SSE/stdio 启动入口
├── gates.ts            # 16 条流水线 + Gate 配置（单一数据源）
├── db.ts               # SQLite（10 表 + 12 迁移）
├── guardian.ts         # 崩溃恢复守护进程
├── agent-registry.ts   # Agent/Skill 三层动态发现
├── agent-fs.ts         # Agent 配置文件同步
├── pubsub.ts           # 进程内事件总线
├── quality-gate.ts     # 质量门 YAML 配置
├── session-archive.ts  # 会话归档
├── session-log-store.ts # 日志文件存储
├── wiki-store.ts       # Markdown Wiki 持久化
├── file-watcher.ts     # .jarvis/ 文件监控
├── platform-info.ts    # 平台信息查询
└── tools/              # 11 组 MCP 工具注册
    ├── session-tools.ts
    ├── pipeline-tools.ts
    ├── gate-tools.ts
    ├── agent-tools.ts
    ├── flow-tools.ts
    ├── wiki-tools.ts
    ├── memory-tools.ts
    ├── ast-tools.ts
    ├── lsp-tools.ts
    ├── file-claim-tools.ts
    ├── shared.ts
    ├── types.ts
    └── lsp/             # LSP 协议客户端
        ├── client.ts
        ├── servers.ts
        └── utils.ts
```

## Role
MCP Server 核心——同时提供 stdio（Claude Code 集成）和 HTTP+SSE（Web 面板）两种传输方式，所有领域逻辑集中在工具注册函数和共享 SQLite 数据库。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `PIPELINE_DEFS` | gates.ts | const | 16 条流水线类型及其 Gate 序列注册表 |
| `GATE_CONFIG` | gates.ts | const | 每个 Gate 的操作约束、可生成 Agent、重试次数 |
| `openDb()` | db.ts | function | 打开/创建 SQLite 数据库，执行 schema 和迁移 |
| `startEngine()` | server.ts | function | 主入口——启动 Hono HTTP + MCP + 文件监控 + 守护进程 |
| `getAgentList()` | agent-registry.ts | function | 三层 Agent 发现：模板→全局→项目 |
| `getSkillList()` | agent-registry.ts | function | 三层 Skill 发现，与 Agent 发现镜像 |
| `ToolContext` | tools/types.ts | interface | 所有工具注册共享的上下文：session 解析、响应格式化 |
| `LspClient` | tools/lsp/client.ts | class | JSON-RPC LSP 客户端，支持 18 种语言服务器 |

## Key Files

| File | Role | Description |
|------|------|-------------|
| `server.ts` | 启动入口 | 引导 Hono + MCP + 所有工具注册 + API 路由 + 静态文件 + Web 代理 |
| `gates.ts` | FSM 配置 | 16 条流水线定义 + 每个 Gate 的操作约束和 agent 指引 |
| `db.ts` | 数据层 | 10 张表 + 12 个增量迁移，约 930 行 |
| `agent-registry.ts` | Agent 发现 | 三层动态发现，含图标/分类/角色推断 |
| `guardian.ts` | 进程守护 | PID 文件 + 崩溃监控 + 指数退避重启 |
| `session-archive.ts` | 归档 | 消费事件+记忆→生成摘要→存储到 session_context |
| `wiki-store.ts` | Wiki | 文件级 Markdown Wiki，含增/查/改/删/lint 操作 |
| `tools/pipeline-tools.ts` | 流水线工具 | 7 个 MCP 工具：init/status/enforce/advance/resume/jump/cancel |
| `tools/session-tools.ts` | 会话工具 | 5 个 MCP 工具：join/heartbeat/list/leave/set_name |

## Conventions
- **工具注册模式**: 每个 `tools/*.ts` 导出 `register*Tools(server, db, root, ctx)`
- **会话隔离**: 所有流水线操作需通过 `ctx.resolveSid()` 解析 session_id
- **FSM 约束**: Gate 推进验证序列顺序、产物存在、入口条件
- **三层发现**: Agent/Skill 按 template → global → project 覆盖
- **数据库优先**: 所有持久状态经 `db.ts` 流转
- **事件广播**: 状态变更通过 `pubsub.ts` EventEmitter 推送 SSE
- **懒加载**: AST 工具和 LSP 工具首次使用时才初始化
- **双传输**: 支持 stdio（Claude Code 管理）和 HTTP（手动启动）

## Entry Points
- `server.ts::startEngine()` — 启动引擎（CLI 调用）
- `server.ts::startWeb()` — Web 面板代理
- `gates.ts::PIPELINE_DEFS` — 流水线配置导出
- `gates.ts::GATE_CONFIG` — Gate 约束配置导出

## Internal Dependencies
- `db.ts` 被 9 个文件导入（最高依赖方）
- `gates.ts` 被 7 个文件导入
- `tools/types.ts` 被全部 11 个工具文件导入

## External Dependencies
hono, @hono/node-server, @modelcontextprotocol/sdk, zod, yaml, @ast-grep/napi

## For AI Agents
- **修改 Gate 配置**: 必须同时更新 `PIPELINE_DEFS` + `GATE_CONFIG`
- **新增 MCP 工具**: 创建 `tools/<name>-tools.ts` → `server.ts::registerMcpTools()` 注册
- **新增流水线**: 在 `PIPELINE_DEFS` 添加 Gate 序列 + 每个 Gate 的 `GATE_CONFIG`
- **数据库变更**: 在 `db.ts::MIGRATIONS` 添加迁移条目
- **高风险区域**: `gates.ts::GATE_CONFIG`（所有流水线引用）、`db.ts` schema（影响所有会话）

<!-- MANUAL:START -->
<!-- MANUAL:END -->
