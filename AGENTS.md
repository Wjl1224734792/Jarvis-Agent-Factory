# AGENTS.md

仓库内代理必须同时遵循：

1. 本文件
2. [`.codex/AGENTS.md`](E:/CodeStore/feijia/.codex/AGENTS.md)

项目规则优先于通用规则。

## 目标

- 只做与用户请求直接相关的变更。
- 优先最小正确改动，不做顺手重构。
- 修改前先读相关目录、调用链、环境变量和脚本。

## 当前项目状态

- 仓库内只维护 `apps/web`、`apps/admin`、`apps/server`。
- `apps/mobiles` 已删除，不要恢复占位目录。
- 微信小程序不在本仓库开发。
- App 不在本仓库开发。
- 小程序建议独立使用 `Taro`。
- App 建议独立使用 `Flutter`。

## 技术边界

- 运行时：Bun
- 测试框架：Vitest
- ORM：Drizzle
- 依赖方向：`apps -> packages -> 独立`

## 修改规则

- 改共享协议时，先检查：
  - `packages/schemas`
  - `packages/http-client`
  - `apps/server`
  - `apps/web`
  - `apps/admin`
- 改环境变量时，必须同步更新：
  - [`.env.example`](E:/CodeStore/feijia/.env.example)
  - [README.md](E:/CodeStore/feijia/README.md)
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
