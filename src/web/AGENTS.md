<!-- Generated: 2026-06-03T16:32:00+08:00 -->
<!-- Parent: ../AGENTS.md -->

# web — Web 面板后端 API

## Purpose
提供基于 Hono 的 Web 服务层——引擎 REST API（SSE 事件流、会话/流水线操作、Agent 配置、技能管理、Wiki 阅读）和 HTML 反向代理缓存。

## Architecture

```
src/web/
├── routes.ts          # REST API 路由（~920 行，28 个端点）
└── reverse-proxy.ts   # GitHub CDN HTML 反代（1 小时缓存）
```

## Role
Web API / 反向代理——引擎 HTTP 层的核心，连接引擎核心和前端 Dashboard。

## Key Abstractions

| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| `setupApiRoutes()` | routes.ts | function | 向 Hono 应用注册所有 REST API |
| `broadcastSSE()` | routes.ts | function | 向所有 SSE 客户端广播最新会话数据 |
| `getHtml()` | reverse-proxy.ts | async function | 获取 HTML（GitHub CDN 优先，本地回退） |

## API 端点总览

| 端点 | 方法 | 用途 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/status` | GET | 引擎状态 + 平台信息 |
| `/api/pipeline` | GET | 所有会话的合并流水线视图 |
| `/api/sessions` | GET/POST/DELETE | 会话管理 |
| `/api/pipeline-runs` | GET/PATCH/POST/DELETE | 流水线运行管理 |
| `/api/agents` | GET/POST | Agent 配置 |
| `/api/skills` | GET | 技能列表 |
| `/api/commands` | GET | 命令列表 |
| `/api/events` | GET | SSE 事件流 |
| `/api/wiki/*` | GET | Wiki 页面查询 |
| `/api/jarvis/*` | GET | .jarvis 产物读取 |
| `/api/projects` | GET | 项目列表 |

## Internal Dependencies
- `src/engine/db` — 数据库访问
- `src/engine/gates` — Gate 配置与产物扫描
- `src/engine/agent-registry` — Agent/平台信息
- `src/engine/pubsub` — 事件广播
- `src/engine/wiki-store` — Wiki 访问
- `src/shared/package-version` — 版本号

## External Dependencies
hono, @hono/node-server

## For AI Agents
- **修改 routes.ts**：确保前端 Dashboard API 签名一致（定义在 `web/src/api.ts`）
- **新增 API 端点**：同步更新 `web/src/api.ts` 的 `api` 对象和类型
- **反向代理 CDN URL**：硬编码在 reverse-proxy.ts，仓库迁移时需更新
- **高风险共享区域**：routes.ts 处于引擎和 Dashboard 之间，API 响应结构变更可能同时影响两端

<!-- MANUAL:START -->
<!-- MANUAL:END -->
