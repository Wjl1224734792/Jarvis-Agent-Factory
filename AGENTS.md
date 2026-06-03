<!-- Generated: 2026-06-03 -->

# Jarvis Agent Factory — AI 编程助手配置集 + MCP 编排引擎

## 项目身份

**jarvis-agent-factory** 是一个面向 Claude Code 的多智能体 AI 编程助手配置安装器与 MCP 编排引擎。它提供从想法到交付的完整软件开发流水线——88 个 Agent、17 条流水线、40+ 个技能、12 道 Gate 门禁。

- **CLI 工具**: `npm i -g jarvis-agent-factory` → `jarvis init`
- **MCP 引擎**: FSM 硬约束 Gate 序列，跳过/回退拒绝，SQLite 持久化
- **Web 面板**: 实时看板、Agent 配置、会话管理、Wiki 知识库
- **模板系统**: 可安装的 Agent/Command/Skill/Hook 配置集

## 整体架构

```
┌─────────────────────────────────────────────────┐
│                    CLI 入口层                      │
│  bin/jarvis.js → src/cli/ (命令解析 + 路由)        │
├─────────────────────────────────────────────────┤
│               MCP 编排引擎 (src/engine/)           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Gate FSM │  │ 会话管理  │  │ Agent 注册表   │  │
│  │ (gates)  │  │ (session)│  │ (registry)    │  │
│  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ SQLite DB│  │ Wiki 存储 │  │ 事件总线       │  │
│  │ (db)     │  │ (wiki)   │  │ (pubsub)      │  │
│  ├──────────┤  ├──────────┤  ├───────────────┤  │
│  │ 40+ MCP  │  │ AST 搜索  │  │ LSP 集成      │  │
│  │ Tools    │  │ (ast-grep)│  │ (12工具)      │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
├─────────────────────────────────────────────────┤
│         共享工具层 (src/shared/)                    │
│  markdown-utils / mcp-config / model-config       │
├─────────────────────────────────────────────────┤
│  Web 面板 (web/ + src/web/)          模板系统      │
│  React 19 SPA + Hono API             (src/templates)│
│  SSE 实时推送 + 乐观更新             88 Agent + 40+ │
│                                      Command 模板  │
└─────────────────────────────────────────────────┘
```

## 模块地图

| 目录 | 职责 | 详情 |
|------|------|------|
| `src/engine/` | MCP 编排引擎核心 | [AGENTS.md](./src/engine/AGENTS.md) |
| `src/cli/` | CLI 命令入口 | [AGENTS.md](./src/cli/AGENTS.md) |
| `src/templates/` | Agent/Command/Skill 模板 | [AGENTS.md](./src/templates/AGENTS.md) |
| `web/` + `src/web/` | Web 面板（前端 SPA + 后端 API） | [AGENTS.md](./web/AGENTS.md) |
| `src/shared/` | 共享工具（Markdown/MCP/版本） | [AGENTS.md](./src/shared/AGENTS.md) |
| `tests/` | 集成测试（vitest） | [AGENTS.md](./tests/AGENTS.md) |
| `bin/` | npm bin 入口脚本 | — |
| `scripts/` | 构建/CI/发布脚本 | [AGENTS.md](./scripts/AGENTS.md) |
| `docs/` | 流程文档与流程图 | [AGENTS.md](./docs/AGENTS.md) |
| `types/` | TypeScript 类型声明 | — |
| `data/` | 存续数据目录 | — |

## 技术栈

| 层 | 技术 |
|----|------|
| **CLI** | Node.js 22+（零第三方运行时依赖，仅内置模块） |
| **引擎** | TypeScript, Hono (HTTP), @modelcontextprotocol/sdk (MCP), SQLite (better-sqlite3) |
| **前端** | React 19, TypeScript, Vite 8, Antd 6, React Router 6 |
| **测试** | Vitest 4 |
| **构建** | TypeScript Compiler (tsc) |
| **发布** | GitHub Actions CI → npm publish |

## 入口点

| 入口 | 途径 | 说明 |
|------|------|------|
| `jarvis` / `jaf` CLI | `npm i -g jarvis-agent-factory` | 全局安装后可用 |
| MCP Stdio | Claude Code 自动拉起 | 引擎零手动启动 |
| HTTP + SSE | `localhost:3456`（MCP）+ `localhost:3457`（Web） | 独立运行模式 |
| `/jarvis` 命令 | Claude Code 中输入 | 全流程严格模式 |
| `/auto` 命令 | Claude Code 中输入 | 智能路由（推荐日常入口） |

## 核心约定

- **Gate 硬约束**: FSM 拒绝回退/跳跃，全部 12 Gate 按序推进（auto 流水线例外：allow_jump）
- **编排者不写代码**: 所有代码变更通过 spawn Agent 完成
- **Agent 三层配置**: template → global (`~/.claude/agents/`) → project (`.claude/agents/`)，project 最高优先
- **Section 级 Markdown 合并**: 安装/升级时对 AGENTS.md 等文件做 section 级三路合并，保留用户手动内容
- **Hash 增量同步**: 安装时基于 SHA256 判断文件是否变化，仅更新变更文件
- **文件冲突防护**: 并行 Agent 通过 `file_claim_*` 工具声明独占文件路径
- **注释语言**: 中文项目中文注释，英文项目英文注释

## 给 AI Agent 的指引

- 修改 Agent/Command 模板 → `src/templates/platforms/claude/`，重新安装后生效
- 新增 MCP 工具 → `src/engine/tools/` 新建 register 函数，在 `server.ts` 注册
- 新增流水线类型 → `src/engine/gates.ts` 添加 `PIPELINE_DEFS` + `GATE_CONFIG`
- 修改数据库 → `src/engine/db.ts` 添加增量 migration
- 前端页面 → `web/src/pages/`，需同步更新 `App.tsx` 路由 + `api.ts` 契约
- 所有测试 → `tests/` 目录，`npm test` 运行

<!-- MANUAL:START -->
<!-- MANUAL:END -->
