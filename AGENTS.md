# AGENTS.md

项目规则优先于通用规则。

## 目标

- 只做与用户请求直接相关的变更。
- 优先最小正确改动，不做顺手重构。
- 修改前先读相关目录、调用链、环境变量和脚本。

## 编码与审查准则（简洁优先）

以下偏谨慎而非抢速；极简单改动可自行取舍。

- **思考**：实现前写清假设；多解时并列说明，勿静默选边；有更简路径可提出；不清则问。
- **简洁**：最小可行实现；不扩展未请求功能；不为单处抽抽象；不为「不可能」场景堆分支与错误处理。
- **手术式修改**：只动必要行；不顺手改相邻逻辑、注释或格式；风格与周边一致。本 diff 引入的未使用符号/导入须删掉；既有死代码勿动除非另有任务。
- **可验证目标**：把需求落成可检查的结果（例：先测非法输入再实现；先复现 bug 再修；重构前后测试一致）。多步任务用简短步骤 + 每步验收。
- **注释与审查**：新增与修改的代码须具备项目要求的注释（关键逻辑、公共 API、边界与非显而易见处；见各包 TSDoc/JSDoc 约定）。**无注释或注释不足以说明意图与契约的变更，不得视为通过审查。**

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
- 改数据库相关时，先检查 `packages/db`、`apps/server`，并阅读 [`README.md`](./README.md)「数据库与数据初始化」（`db:clear` 只清数据；`db:wipe-schema` 删并重建 `public`；`db:reset:*` = wipe → migrate → seed）。若改根目录 `db:*` 或 `packages/db` 脚本名/语义，同步更新该节 README。
- 改环境变量时，必须同步更新：
  - [`.env.example`](./.env.example)
  - [`README.md`](./README.md)
  - 相关子目录的 `AGENTS.md` / `README.md`（如果文档中写到了该变量、命令或入口）
  - 若涉及 `CORS_ORIGIN`、`WEB_DEV_PORT`、`ADMIN_DEV_PORT` 或前端监听地址（`WEB_DEV_HOST` / `ADMIN_DEV_HOST`），需在 [`README.md`](./README.md) 的「CORS 与局域网访问」中保持说明一致（或补充新条目）。
- 调整本地基础设施时，优先沿用根脚本：
  - `bun run infra:up`
  - `bun run infra:ps`
  - `bun run infra:down`
- 不要引入未接线目录、壳子工程、占位脚本。
- 不要绕过 `packages/*` 在应用层重复定义共享结构。

## CORS（跨域）

- 服务端在 `apps/server/src/app.ts` 挂载全局 CORS；默认白名单端口由 `WEB_DEV_PORT` / `ADMIN_DEV_PORT` 与 `apps/server/src/lib/cors-origins.ts` 解析。
- 局域网 IP 访问前端时，浏览器 `Origin` 非 `localhost`，须在根目录 `.env` 配置 `CORS_ORIGIN`（见 [`README.md`](./README.md)「CORS 与局域网访问」与 `.env.example`）。
- 生产环境勿使用 `CORS_ORIGIN=all`，应使用明确 Origin 列表。

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
