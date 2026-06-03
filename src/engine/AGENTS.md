<!-- Generated: 2026-06-03T15:48:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# engine — MCP 编排引擎核心

## Role
整个 Jarvis 系统的运行时中枢。实现 SQLite 持久化的 FSM 流水线引擎，通过 50 个 MCP 工具暴露会话管理、Gate 控制、Agent/Skill 配置、AST 搜索、LSP 集成、Wiki 存储等能力。支持双传输模式：stdio（Claude Code 直连）和 HTTP+SSE（独立运行），同时内置 Web 面板 SPA 服务。

## Architecture
```
┌──────────────────────────────────────────────────┐
│                  server.ts                       │
│  startEngine(db, stdio) → MCP + HTTP + SPA      │
│  registerMcpTools → 10 组工具注册入口             │
└──┬───┬───┬───┬───┬───┬───┬───┬───┬───┬─────────┘
   │   │   │   │   │   │   │   │   │   │
   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼
 session pipeline gate agent flow wiki memory ast lsp file-claim
 (tools/ 目录下各 register*Tools 模块)

┌──────────┐  ┌──────────┐  ┌──────────────┐
│ gates.ts │  │  db.ts   │  │agent-registry│
│ FSM 规则  │  │ SQLite   │  │ Agent+Skill  │
│ 17流水线  │  │ 8表12迁移 │  │ 三层发现     │
└──────────┘  └──────────┘  └──────────────┘
```

## Key Abstractions
| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `startEngine` | server.ts | async fn | 引擎唯一入口：打开 DB、创建 Hono app + McpServer、注册全部工具、启动双传输 |
| `PIPELINE_DEFS` / `GATE_CONFIG` | gates.ts | const | 17 条流水线定义 + 40+ Gate 配置（操作许可/Agent 路由/重试限制/进入条件） |
| `openDb` / `initSchema` / `MIGRATIONS` | db.ts | fn | SQLite 打开/WAL 模式/schema 初始化/12 步增量迁移/50+ CRUD 导出函数 |
| `getAgentList` / `getSkillList` | agent-registry.ts | fn | 三层配置合并获取 Agent/Skill 列表：模板→全局(~/.claude/)→项目(.claude/) |
| `getPubSub` / `emitEvent` | pubsub.ts | fn | EventEmitter 单例，4 种事件类型（session/run/gate/agent） |
| `startGuardian` / `handleCrash` | guardian.ts | fn | 崩溃守护：指数退避(1s/2s/4s)最多 3 次，5s 冷却，PID 文件管理 |
| `loadQualityGates` / `evaluateQualityGate` | quality-gate.ts | fn | YAML 加载质量门禁配置，三档降级(DEFAULT/PROJECT/FALLBACK)，block/warn 判定 |
| `archiveSession` | session-archive.ts | fn | OMC 风格归档：消费事件+记忆→生成结构化摘要→写入 session_context |
| `addWikiPage` / `queryWikiPages` / `lintWikiPages` | wiki-store.ts | fn | 文件系统 Wiki CRUD + 全文搜索 + 健康检查 |

## Files
| File | Role | Description |
|------|------|-------------|
| server.ts | 引擎入口 | Hono app + McpServer 创建、DB 打开、10 组工具注册、双传输启动、SPA 服务、冲突扫描、优雅关闭 |
| gates.ts | FSM 配置 | 17 条流水线 + 40+ Gate 的完整配置，操作许可矩阵、Agent 路由表、产物目录映射 |
| db.ts | 数据库层 | 10 表 schema、12 步增量迁移、50+ 参数化 CRUD 导出、旧表兼容修复 |
| agent-registry.ts | Agent/Skill 注册表 | 三层目录扫描合并、YAML frontmatter 解析、智能图标/分类推断、Skill 镜像扫描 |
| guardian.ts | 守护进程 | PID JSON 管理、崩溃监听器注册、指数退避重启、存活检测 |
| pubsub.ts | 事件总线 | EventEmitter 单例、4 种事件类型、统计追踪、测试隔离 reset |
| quality-gate.ts | 质量门禁 | YAML 配置加载、10 项指标阈值比对、50% 硬约束下限保护 |
| session-archive.ts | 会话归档 | 事件+记忆消费、结构化摘要生成、跨会话 context 注入 |
| wiki-store.ts | Wiki 存储 | Markdown+YAML frontmatter 存储、add/ingest/query/lint 全套操作、文件锁 |
| file-watcher.ts | 文件监听 | 递归监听 .jarvis/ .md 变化、300ms 去抖、自动注册产物并 SSE 广播 |
| agent-fs.ts | Agent 文件回写 | model/effort 配置写回 .md YAML frontmatter 或 .toml、template 只读保护 |
| session-log-store.ts | 日志文件存储 | .jarvis/session-logs/*.md 读写、独立于 RepoWiki |
| platform-info.ts | 平台信息 | 聚合 agent-registry 数据、单平台/全平台汇总 |

## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
| tools/ | MCP 工具注册层（50 个工具，10 组注册函数） | [AGENTS.md](./tools/AGENTS.md) |

## Conventions
- MCP 工具注册函数签名: `registerXxxTools(server: McpServer, db: DatabaseSync, root: string, ctx: ToolContext): void`
- 工具 handler 签名: `(args, extra) => ctx.resp(result)`
- DB 全部 prepared statements + 参数化查询
- sessionId 解析: HTTP 从 extra.sessionId，stdio fallback 到全局变量
- Gate FSM 拒绝回退/跳跃（auto/ask/improve 例外: `allow_jump: true`）
- 产物存储: `.jarvis/<YYYY-MM-DD>/{gate_subdir}/*.md`
- 数据库迁移: MIGRATIONS 数组按 version 升序追加 ALTER TABLE
- Agent/Skill 三层覆盖: project > global > template
- 事件驱动: pubsub 广播四种事件类型

## For AI Agents
- **新增 MCP 工具**: 在 `tools/` 下新建/扩展 register 函数，在 `registerMcpTools()` 末尾注册
- **新增流水线类型**: `gates.ts` 的 PIPELINE_DEFS + GATE_CONFIG 添加条目，FSM 引擎无需改动
- **修改 DB Schema**: `db.ts` MIGRATIONS 数组追加 `{ version: N+1, sql: 'ALTER TABLE ...' }`，同时更新 initSchema
- **新增语言服务器**: `tools/lsp/servers.ts` LSP_SERVERS 添加配置
- **路径遍历防护**: resolve + startsWith 校验基准目录
- **session_join** 是所有会话相关工具的前置门禁

## Dependencies
- **Internal:** src/shared (markdown-utils, package-version)
- **External:** @modelcontextprotocol/sdk, hono, zod, yaml, @ast-grep/napi, node:sqlite

<!-- MANUAL:START -->
<!-- MANUAL:END -->