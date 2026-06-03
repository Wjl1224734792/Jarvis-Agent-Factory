<!-- Generated: 2026-06-03T15:48:00+08:00 | Parent: (root) -->

# Jarvis Agent Factory — AI 编程助手配置集 + MCP 编排引擎

## 项目身份

Jarvis Agent Factory（jarvis-agent-factory）是面向 Claude Code 的多智能体 AI 编程助手配置安装器与 MCP 编排引擎。提供 88 个 Agent、17 条流水线、43 条命令、34 个技能和 12 道 Gate 门禁，通过 FSM 硬约束实现从想法到交付的完整软件开发流程控制。

## 整体架构

```
                          ┌──────────────────────────────┐
                          │         bin/jarvis.js         │  CLI 入口
                          │      npm bin: jarvis / jaf    │
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │     src/cli/ (CLI 命令层)      │
                          │  init / add / remove / diff   │
                          │  upgrade / engine / doctor    │
                          │  hook / resolve               │
                          └──────┬────────────────┬───────┘
                                 │                │
                    ┌────────────▼────┐   ┌───────▼──────────┐
                    │  src/shared/    │   │  src/engine/      │
                    │  (共享工具层)    │◄──│  (MCP 编排引擎)   │
                    │  markdown-utils │   │  server / gates   │
                    │  mcp-config     │   │  db / registry    │
                    │  model-config   │   │  guardian / pubsub│
                    └─────────────────┘   └──────┬────────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              │                  │                  │
                    ┌─────────▼─────┐  ┌────────▼────────┐  ┌──────▼──────┐
                    │ src/engine/   │  │  src/web/        │  │  web/       │
                    │ tools/        │  │  (Web API + SSE)  │  │  (React SPA)│
                    │ (40+ MCP工具) │  │  routes.ts       │  │  Dashboard  │
                    └───────────────┘  └────────┬─────────┘  └──────┬──────┘
                                                │                    │
                                                └──── SSE 推送 ──────┘
```

## 模块地图

| 目录 | 职责 | 详情 |
|------|------|------|
| `bin/` | CLI 入口脚本 | `jarvis` / `jaf` npm bin → `src/cli/index.ts` |
| `src/engine/` | MCP 编排引擎核心 | MCP Server + FSM 状态机 + SQLite DB + Agent/Skill 注册表 |
| `src/engine/tools/` | MCP 工具实现 | 50 个 MCP tool：会话/Gate/流水线/Agent/AST/LSP/Wiki/记忆 |
| `src/cli/` | CLI 命令层 | 自建参数解析 + 13 个命令（init/add/remove/upgrade/diff/engine 等） |
| `src/shared/` | 共享工具层 | Markdown 解析、MCP 配置读写、模型常量、版本读取 |
| `src/templates/` | 模板系统 | Agent/Command/Skill/Hook Markdown 模板 + 平台配置 |
| `src/web/` | Web API 层 | Hono HTTP 路由（27 端点）+ SSE 实时推送 + CDN 反向代理 |
| `web/` | React 前端 SPA | 看板/Dashboard/Agent 配置/归档/Wiki/指南（7 页面） |
| `tests/` | 测试套件 | 22 个 Vitest 测试文件，401 用例 |
| `scripts/` | 构建/发布脚本 | release.sh、copy-assets.js、sync-version.mjs、dev-start |
| `docs/` | 文档 | flows/（43 命令流程图）、reviews/（审查记录） |

## 关键数据模型

```
PipelineRun (流水线运行)
├── pipeline_type: full | auto | frontend | backend | refactor | hotfix | ...
├── gates: [{ gate, passed, checked_at, duration, artifacts }]
├── artifacts: [{ path, gate, type, created_at }]
└── events: [{ type, category, data, created_at }]

Session (会话)
├── session_id, platform, pipeline_type
├── gate (当前所在 Gate), status (active/inactive)
├── task_name, project, heartbeat
└── runs: [PipelineRun]

Agent (智能体)
├── id, name, role, platform
├── model, effort (用户可配置)
└── source: template | global | project (三层覆盖)

Skill (技能)
├── id, name, description, platform
├── version, updated
└── source: template | global | project (三层动态发现)
```

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 运行时 | Node.js ≥22.5 | 零原生依赖（内置 `node:sqlite`） |
| 语言 | TypeScript 5.9 | strict 模式，ES2022，NodeNext 模块 |
| MCP 协议 | @modelcontextprotocol/sdk 1.29 | McpServer + stdio/HTTP 双传输 |
| HTTP 框架 | Hono 4.12 | REST API + SSE 流式推送 |
| 数据库 | node:sqlite (SQLite) | WAL 模式，12 步增量迁移 |
| 前端 | React 19 + Vite 8 + Ant Design 6 | HashRouter SPA，单文件打包 |
| 测试 | Vitest 4.1.7 | 全局 globals，node 环境，10s 超时 |
| AST | @ast-grep/napi 0.42 | 17 语言 AST 模式匹配与替换 |
| CLI | 自建解析器 | 无 Commander.js/yargs 依赖 |

## 入口点

| 入口 | 路径 | 说明 |
|------|------|------|
| CLI | `bin/jarvis.js` → `src/cli/index.ts` | npm bin: `jarvis` / `jaf` |
| MCP Server | `src/engine/server.ts` → stdio | Claude Code 自动拉起 |
| HTTP API | `http://localhost:3456/api/*` | 27 个 REST 端点 |
| Web Panel | `http://localhost:3456` | React SPA 静态服务 |
| 独立 Web | `http://localhost:3457` | 分离的 Web 面板 (jarvis web) |

## 核心约定

- **Gate 硬约束**：FSM 拒绝回退/跳跃，仅 auto/ask/improve 支持 `allow_jump`
- **编排者不写代码**：所有代码变更通过 spawn Agent 完成
- **Agent/Skill 三层配置**：template → global (~/.claude/) → project (.claude/)，project 最高优先
- **Section 级合并**：Markdown 文件安装/升级时做 section 级三路合并
- **Hash 增量同步**：SHA256 判断文件变化，仅更新变更文件
- **数据库迁移**：`MIGRATIONS` 数组按 version 升序追加 ALTER TABLE SQL
- **Zod 参数校验**：所有 MCP tool 参数通过 zod schema 验证
- **路径遍历防护**：resolve + startsWith 检查防止目录遍历
- **SSE 去抖广播**：500ms 去抖窗口 + 2000ms maxWait，事件驱动 + 8s 定时兜底
- **崩溃重启策略**：指数退避（1s/2s/4s），5s 冷却窗口，30s 成功复位，最多 3 次
- **CI 门禁**：push 强制 lint + typecheck + test + npm audit
- **注释语言**：中文项目中文注释，英文项目英文注释

## 给 AI Agent 的指引

1. **理解系统**：先读本文件了解整体架构 → 按需深入各模块 AGENTS.md
2. **新增 MCP 工具**：`src/engine/tools/` 新建 register 函数 → `server.ts` 注册
3. **新增 CLI 命令**：`src/cli/commands/` 新建文件 → `index.ts` COMMANDS 注册表追加
4. **新增流水线**：`gates.ts` PIPELINE_DEFS + GATE_CONFIG 追加
5. **修改数据库**：`db.ts` MIGRATIONS 数组追加增量 SQL
6. **修改前端**：`web/src/pages/` + `App.tsx` 路由 + `api.ts` 接口
7. **版本发布**：更新 package.json version → 同步 QUICKSTART.md/guide.html/CHANGELOG.md
8. **只读探索用 Explore Agent**，不自行逐文件读取

<!-- MANUAL:START -->
<!-- MANUAL:END -->