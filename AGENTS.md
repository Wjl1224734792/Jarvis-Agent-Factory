<!-- Generated: 2026-06-03T16:30:00+08:00 | Parent: (root) -->

# Jarvis Agent Factory — AI 编程助手配置集 + MCP 编排引擎

## 项目身份
Jarvis 是一个 Claude Code 多智能体 AI 编程助手配置安装器。核心是 MCP 编排引擎（FSM Gate 状态机），提供从想法到交付的完整软件开发流水线。通过 `jarvis init` 一键部署 88 个 Agent、43 条命令、34 个技能到用户项目。

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    用户接口层                        │
│  CLI (src/cli/)        Web 面板 (web/)               │
│  jarvis init/add/rm     React + Ant Design           │
│  jarvis engine start     SSE 实时推送                │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────────────────────▼───────────────────┐
│                   Web API 层                         │
│  src/web/routes.ts — REST + SSE (Hono)              │
│  会话/流水线/Agent/Wiki/归档 API                     │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│                   引擎核心层                          │
│  src/engine/ — MCP Server + FSM Gate 状态机          │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │ server   │ gates    │ db       │ tools/   │      │
│  │ HTTP/SSE │ FSM 配置 │ SQLite   │ 11组MCP  │      │
│  │ + stdio  │ 16流水线 │ 10 表    │ 工具     │      │
│  └──────────┴──────────┴──────────┴──────────┘      │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│                   共享工具层                          │
│  src/shared/ — markdown-utils, mcp-config,           │
│                model-config, package-version         │
└─────────────────────────────────────────────────────┘
```

## 模块地图

| 目录 | 职责 | 详情 |
|------|------|------|
| `src/engine/` | MCP 编排引擎核心 — FSM Gate 状态机、SQLite、11 组 MCP 工具 | [AGENTS.md](./src/engine/AGENTS.md) |
| `src/cli/` | CLI 命令行入口 — jarvis/jaf 命令、安装/初始化/引擎管理 | [AGENTS.md](./src/cli/AGENTS.md) |
| `src/shared/` | 共享工具 — frontmatter 解析、MCP 配置 I/O、模型默认值 | [AGENTS.md](./src/shared/AGENTS.md) |
| `src/web/` | Web API — REST + SSE、会话/流水线/Agent/Wiki 路由 | [AGENTS.md](./src/web/AGENTS.md) |
| `src/templates/` | 内容模板 — 88 Agent + 43 命令 + 34 技能 + 5 Hook 定义 | [AGENTS.md](./src/templates/AGENTS.md) |
| `tests/` | 测试套件 — vitest，22 个测试文件覆盖引擎核心 | — |
| `web/` | React 前端面板 — 独立 Vite 子项目，Ant Design 6 | — |
| `docs/flows/` | 流程文档 — 50+ 命令流程图 | — |
| `scripts/` | 构建/发布脚本 — copy-assets, sync-releases, version-sync | — |

## 关键数据模型

- **Pipeline Run**: 一次流水线执行，关联 session_id，包含 Gate 序列和检查点
- **Gate**: FSM 状态节点，含允许/禁止操作、可生成 Agent、重试次数、入口条件
- **Session**: 独立会话隔离，每个会话有独立流水线状态
- **Artifact**: Gate 产物文档（`.jarvis/YYYY-MM-DD/{dir}/`）

## 技术栈

| 层 | 技术 |
|----|------|
| 运行时 | Node.js 22.5+ (ESM) |
| 语言 | TypeScript 5.9 |
| HTTP 框架 | Hono 4.x |
| MCP 协议 | @modelcontextprotocol/sdk |
| 数据库 | node:sqlite (内置，零依赖) |
| 前端 | React 19 + Ant Design 6 + Vite 8 |
| 测试 | vitest 4.x |
| CLI | 手动参数解析（无 Commander.js，ADR-5） |

## 入口点

| 入口 | 说明 |
|------|------|
| `jarvis init` | CLI 安装（`src/cli/index.ts → commands/init.ts`） |
| `jarvis engine start` | 启动 MCP 引擎（`src/engine/server.ts::startEngine()`） |
| MCP stdio | Claude Code 自动拉起引擎 |
| `/api/events` | SSE 事件流（`src/web/routes.ts`） |

## 核心约定

- **三层发现**: Agent/Skill 按 template → global → project 优先级覆盖
- **会话隔离**: 每次 `session_join` 创建独立流水线状态
- **Gate FSM 硬约束**: 操作前 `gate_check`，Gate 推进验证前置条件
- **产物日期目录**: `.jarvis/YYYY-MM-DD/` 格式
- **中文 CLI 输出**: 用户面向文本为中文

## 给 AI Agent 的指引

1. **修改 Gate 配置**：同步更新 `PIPELINE_DEFS` + `GATE_CONFIG` + 文档
2. **新增 MCP 工具**：在 `tools/` 创建注册函数 → `server.ts::registerMcpTools()` 注册
3. **新增 Agent/命令/技能**：在 `templates/` 添加 + `jarvis-reference/SKILL.md` 注册
4. **数据库变更**：在 `db.ts::MIGRATIONS` 添加迁移
5. **运行测试**: `npm test`（vitest），101+ 测试

<!-- MANUAL:START -->
<!-- MANUAL:END -->
