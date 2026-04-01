# @feijia/server

Bun + Hono API，挂载业务模块路由，CORS 允许本地 `web`/`admin` 源。

## 功能要点

- 入口：`src/index.ts`，应用实例 `src/app.ts`
- 模块拆分：`modules/*.route.ts` 绑路径，`*.service.ts` 业务，`*.repo.ts` 数据库
- 类型：请求/响应以 `@feijia/schemas` 为准

## 依赖

`@feijia/shared` `@feijia/schemas` `@feijia/db`

## 编辑指引

- 新增模块在 `app.ts` 注册路由
- 路径常量与 `@feijia/shared.API_ROUTES` 对齐