# AGENTS.md

仓库内代理必须同时遵循：

1. 本文件
2. [`.codex/AGENTS.md`](./.codex/AGENTS.md)

项目规则优先于通用规则。

## 目标

- 只做与用户请求直接相关的变更。
- 优先最小正确改动，不做顺手重构。
- 修改前先读相关目录、调用链、环境变量和脚本。

## 当前仓库范围

- 当前只维护 `apps/web`、`apps/admin`、`apps/server`。
- `packages/*` 提供共享配置、常量、协议、数据库与 HTTP Client。
- `docker/` 只维护本地开发基础设施，不承载生产部署编排。
- `docs/` 记录需求、任务、计划、实现、评审与使用说明。
- `apps/mobiles` 已删除，不要恢复占位目录。
- 微信小程序不在本仓库开发，建议独立使用 `Taro`。
- App 不在本仓库开发，建议独立使用 `Flutter`。

## 技术边界

- 运行时：Bun
- 测试框架：Vitest
- ORM：Drizzle
- 服务端框架：Hono
- 依赖方向：`apps -> packages -> 独立`

## 修改规则

- 改共享协议时，先检查：
  - `packages/schemas`
  - `packages/http-client`
  - `packages/shared`
  - `apps/server`
  - `apps/web`
  - `apps/admin`
- 改数据库相关时，先检查：
  - `packages/db`
  - `apps/server`
- 改环境变量时，必须同步更新：
  - [`.env.example`](./.env.example)
  - [`README.md`](./README.md)
  - 相关子目录的 `AGENTS.md` / `README.md`（如果文档中写到了该变量、命令或入口）
- 调整本地基础设施时，优先沿用根脚本：
  - `bun run infra:up`
  - `bun run infra:ps`
  - `bun run infra:down`
- 不要引入未接线目录、壳子工程、占位脚本。
- 不要绕过 `packages/*` 在应用层重复定义共享结构。

## OpenAPI 规则

- 文档入口：`/docs`、`/openapi.json`
- 由 `OPENAPI_ENABLED` 控制
- 未配置时：非生产默认开启，生产默认关闭
- 生产相关改动不要默认暴露文档

## 默认验证

除非用户明确要求跳过，否则收尾至少考虑：

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```
