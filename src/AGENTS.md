<!-- Generated: 2026-06-04T10:30:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# src/ — Bootstrap + Shared + Web API

## Role
引导层 + 共享工具集 + Web API 层。包含 CLI 安装器、健康检查、Hook 系统、Markdown 解析、MCP 配置 I/O、模型配置和基于 Hono 的 REST+SSE 后端。

## Architecture
三个子域:
- **引导 (src/*.ts)**: install.ts (1038 行, 最大文件), doctor.ts, hook.ts, hash-paths.ts, suppress-warnings.ts
- **共享工具 (src/shared/)**: 无依赖工具函数——frontmatter 解析、MCP 配置、模型默认值、版本读取
- **Web API (src/web/)**: Hono 路由层——28 个 REST 端点 + SSE + GitHub CDN 反向代理

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `install()` | install.ts | async function | 主安装入口——部署 agent/skill/command 到目标目录，合并 MCP 配置，安装 Hook |
| `doctor()` | doctor.ts | function | 健康检查——验证平台安装、文件存在性、MCP 冲突、引擎状态 |
| `hookCommand()` | hook.ts | async function | Hook 命令调度——gate-check/advance/status/agent-config/post-tool-use 等 7 个子命令 |
| `parseFrontmatter()` | shared/markdown-utils.ts | function | YAML frontmatter 解析为键值对和 body |
| `computeSectionHashes()` | shared/markdown-utils.ts | function | Section 级 SHA256 hash，用于智能合并 |
| `readMcpConfig()` / `writeMcpConfig()` | shared/mcp-config.ts | function | .mcp.json 的集中读写 |
| `DEFAULT_HEAVY_MODEL` / `DEFAULT_LIGHT_MODEL` | shared/model-config.ts | const | deepseek-v4-pro / deepseek-v4-flash |
| `readPackageVersion()` | shared/package-version.ts | function | 从 package.json 读取版本号 |
| `setupApiRoutes()` | web/routes.ts | function | 注册 28 个 REST 端点 + SSE 事件流到 Hono 应用 |
| `getHtml()` | web/reverse-proxy.ts | async function | GitHub CDN HTML 获取 + 本地回退（1h TTL, 8s 超时） |

## Key Files

| File | Role | Description |
|------|------|-------------|
| install.ts | CLI 安装编排器 | 1038 行。智能目录合并 (Section 级 Markdown merge)、MCP 配置安装、Hook 安装、项目记忆和 Wiki 初始化 |
| doctor.ts | 健康检查器 | 验证平台安装完整度、全局 vs 项目 MCP 冲突检测、引擎运行状态检查 |
| hook.ts | Hook 前端 | 通过 REST 与引擎通信。7 个子命令: gate-check (含 CI 检查)、gate-advance、status、report-status、agent-config、user-prompt-submit (关键词路由)、post-tool-use |
| web/routes.ts | REST API | 920 行, 28 个端点: 健康检查、流水线、会话 CRUD、Run 归档、Agent 配置、Skill 查询、Wiki 读取、产物读取 (路径遍历保护)、SSE 流 |
| web/reverse-proxy.ts | 反向代理 | GitHub Release CDN HTML 缓存 + 本地回退 |
| shared/markdown-utils.ts | Markdown 工具 | 被 install.ts、routes.ts、wiki-store、agent-registry 依赖。FM_SEARCH_LIMIT 需与 install.ts 同步 |
| shared/mcp-config.ts | MCP 配置 I/O | .mcp.json 集中读写，接口变更影响安装和运行时 |
| shared/model-config.ts | 模型配置 | 默认模型常量，影响所有未显式配置模型的 Agent |

## Subdirectories

| Directory | Description | AGENTS |
|-----------|-------------|--------|
| cli/ | CLI 命令入口 | [AGENTS.md](./cli/AGENTS.md) |
| engine/ | MCP 编排引擎核心 | [AGENTS.md](./engine/AGENTS.md) |
| templates/ | 内容模板 | [AGENTS.md](./templates/AGENTS.md) |

## Conventions
- **Node.js 原生优先**: 共享模块仅使用 node:fs/path/crypto，无第三方依赖
- **Section 级合并**: Markdown 使用 SHA256 智能三向合并，非整文件比较
- **MCP 合并语义**: 模板 servers 与用户 servers 合并——新增/更新模板，保留用户自定义 (白名单保护)
- **中文注释**: 代码注释和日志为中文
- **Frontmatter 默认值**: 缺失 version 字段回退 "0.0.0"

## Entry Points
- `install()` — 被 CLI init/add/upgrade 调用
- `doctor()` — 被 CLI doctor 调用
- `hookCommand()` — 被 Hook 系统作为子进程调用
- `setupApiRoutes(app, db, root)` — 被 engine/server.ts 调用注册所有路由

## Dependencies
- **Internal:** engine/gates.ts, engine/db.ts, engine/agent-registry.ts, engine/pubsub.ts, engine/wiki-store.ts
- **External:** hono, @hono/node-server, yaml (via engine)

## For AI Agents
- **修改 shared/markdown-utils.ts**: 检查 4+ 调用者 (`grep -rn "from.*shared/markdown-utils"`). 保持 FM_SEARCH_LIMIT 与 install.ts 同步
- **修改 web/routes.ts**: 需同步前端 api.ts + Hook 客户端 hook.ts. API 结构变更影响 Dashboard 和 Hook 系统
- **修改 shared/mcp-config.ts**: 不引入引擎级依赖. 验证 install.ts 合并逻辑
- **修改 install.ts Hook 配置**: 操作名称必须与 engine/gates.ts GATE_OPERATIONS 一致
- **安全敏感**: routes.ts 路径遍历保护 (第 689 行) 和会话隔离逻辑不可弱化

<!-- MANUAL:START -->
<!-- MANUAL:END -->
