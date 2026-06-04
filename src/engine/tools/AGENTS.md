<!-- Generated: 2026-06-04T10:30:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# src/engine/tools — MCP 工具注册层

## Role
注册引擎的全部 MCP 工具 (50 个), 作为 AI Agent 与引擎核心 (流水线、Gate、LSP、AST、会话管理等) 之间的通信层。每个 registerXXTools 函数接收 McpServer 实例并调用 server.tool() 注册。

## Architecture
引擎最外层的接口面。上游是 server.ts::registerMcpTools(), 下游是 db.ts/gates.ts/agent-registry.ts/wiki-store.ts 等核心模块。每个工具通过 ToolContext 获取会话 ID 并统一格式化 JSON 响应。内部跨文件调用通过命名导出纯函数实现 (如 getRunFileClaims, getPriorityContextForInjection)。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `ToolContext` | types.ts | interface | 共享上下文: resolveSid, resp (统一 JSON 响应), setLastSessionId, isStdio |
| `sessionGates()` | shared.ts | function | 从 PIPELINE_DEFS 动态派生当前会话 Gate 序列 |
| `VALID_PIPELINE_TYPES` | shared.ts | const | 流水线类型白名单, 由 PIPELINE_DEFS 动态生成 |
| `registerSessionTools` | session-tools.ts | function | 5 个会话工具 (join/heartbeat/list/leave/set_name) |
| `registerPipelineTools` | pipeline-tools.ts | function | 8 个流水线工具 (init/status/enforce/advance/resume/jump/cancel/report) |
| `registerGateTools` | gate-tools.ts | function | 2 个 Gate 约束工具 (check/guide) |
| `registerAgentTools` | agent-tools.ts | function | 3 个 Agent 管理工具 (config/platform_info/skill_list) |
| `registerFlowTools` | flow-tools.ts | function | 3 个流程 Skill 工具 (export/save/list) |
| `registerWikiTools` | wiki-tools.ts | function | 7 个 Wiki 工具 (add/ingest/query/list/read/delete/lint) |
| `registerMemoryTools` | memory-tools.ts | function | 5 个记忆工具 (add/query/context/archive/priority_context) |
| `registerAstTools` | ast-tools.ts | function | 2 个 AST 工具 (search/replace) |
| `registerLspTools` | lsp-tools.ts | function | 12 个 LSP 工具 (hover/definition/references/symbols/diagnostics 等) |
| `registerFileClaimTools` | file-claim-tools.ts | function | 3 个文件冲突防护工具 (register/release/check) |
| `LspClient` | lsp/client.ts | class | LSP JSON-RPC 客户端, 按 root:command 单例缓存 |
| `LSP_SERVERS` | lsp/servers.ts | const | 19 种语言服务器配置 |

## Key Files

| File | Role | Description |
|------|------|-------------|
| types.ts | 核心契约 | ToolContext 接口定义, 所有工具共享 |
| shared.ts | 工具函数 | VALID_PIPELINE_TYPES + sessionGates(), 避免跨模块导入可变状态 |
| session-tools.ts | 会话管理 | session_join (含上下文注入 + 归档触发), session_leave, session_list, session_heartbeat, session_set_name |
| pipeline-tools.ts | 流水线管理 | pipeline_init, pipeline_status, gate_enforce, advance_gate (含 checkpoint 记录), pipeline_resume, gate_jump, pipeline_cancel, report_status |
| gate-tools.ts | Gate 操作 | gate_check (操作前权限校验 + CI 检查), pipeline_guide (含 team_strategy + agent_mode + file_claims) |
| agent-tools.ts | Agent 管理 | agent_config (模型/effort 设置), platform_info, skill_list (三层动态发现) |
| lsp-tools.ts | LSP 工具门面 | 12 个工具统一入口, 委托到 lsp/ 子目录 |
| lsp/client.ts | LSP 客户端 | JSON-RPC 协议实现, 12 种 LSP 方法, 按 root:command 缓存连接 |
| lsp/servers.ts | 服务器配置 | 19 种语言服务器 + commandExists/getServerForFile |
| file-claim-tools.ts | 文件冲突防护 | 进程内 Map 存储, 导出 getRunFileClaims/clearRunFileClaims 供跨模块调用 |

## Subdirectories

| Directory | Description | AGENTS |
|-----------|-------------|--------|
| lsp/ | LSP 协议客户端 + 服务器管理 + 格式化工具 | (父级) |

## Conventions
- **工具注册签名统一**: registerXXTools(server, db, root, ctx) — 少数变体 (file-claim 不带 db)
- **响应格式统一**: ctx.resp(obj) 包装为 `{ content: [{ type: 'text', text: JSON.stringify(obj) }] }`
- **会话 ID 解析**: ctx.resolveSid(extra); HTTP 从 extra.sessionId, stdio 从 _lastSessionId
- **错误处理**: handler 内部不 throw, 返回 ctx.resp({ error: ... }); LSP 工具使用 withLsp 辅助函数
- **Schema 验证**: 所有工具参数使用 zod 定义, McpServer 自动校验
- **跨模块调用**: tools 模块间通过命名导出纯函数通信, 不导入可变状态

## Entry Points
唯一的注册入口: server.ts::registerMcpTools() 按顺序调用 10 组 register 函数:
1. Session → 2. Pipeline → 3. Gate → 4. Agent → 5. Flow → 6. Wiki → 7. Memory → 8. AST → 9. LSP → 10. FileClaim

## Dependencies
- **Internal:** db.ts (20+ 函数), gates.ts (12+ 导出), agent-registry.ts, session-archive.ts, pubsub.ts, wiki-store.ts, platform-info.ts
- **External:** @modelcontextprotocol/sdk, zod, @ast-grep/napi (惰性)

## For AI Agents
- **新增 MCP 工具**: 创建 tools/xxx-tools.ts → 实现 registerXXTools → server.ts::registerMcpTools() 添加调用
- **handler 内不 throw**: 错误返回 ctx.resp({ error: ... })
- **跨文件导出**: 工具模块间通过命名导出纯函数共享 (如 getRunFileClaims, getPriorityContextForInjection)
- **file-claim-tools.ts 风险**: claimsByRun 进程内 Map, clearRunFileClaims 在 pipeline_cancel/advance_gate/session_leave/pipeline_init 中调用, 不可遗漏清理路径
- **lsp/client.ts 缓存**: clientCache 按 root:command 单例, 连接数受 LSP 进程限制
- **shared.ts 动态派生**: VALID_PIPELINE_TYPES 从 PIPELINE_DEFS 自动生成, 修改 Gate 后自动同步

<!-- MANUAL:START -->
<!-- MANUAL:END -->
