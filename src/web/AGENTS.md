<!-- Generated: 2026-06-03 -->
<!-- Parent: ../AGENTS.md -->

# src/web — Web 面板后端 API

## Role
Hono 框架的 API 路由层，为前端 SPA 提供 REST 接口和 SSE 实时推送。是引擎状态到前端 UI 的数据桥梁。

## Key Files
| File | Role | Description |
|------|------|-------------|
| routes.ts | API 路由 | 888行：18+ REST 端点 + SSE 事件流 + PubSub 去抖广播 |
| reverse-proxy.ts | HTML 代理 | CDN 拉取 + 1h 内存缓存 + 本地回退 |

## Dependencies
- **Internal:** src/engine (db, gates, agent-registry, pubsub, wiki-store)
- **External:** hono, Node.js 内置模块

<!-- MANUAL:START -->
<!-- MANUAL:END -->
