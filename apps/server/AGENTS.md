# @feijia/server

Bun 运行的 Hono API，挂载业务模块路由；CORS 允许本地 `web` / `admin` 源并携带凭证。

## 目录架构

```
apps/server/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # 进程入口
│   ├── app.ts                  # Hono 实例、CORS、路由挂载
│   ├── routes/
│   │   └── health.ts
│   └── modules/
│       ├── auth/               # 验证码、短信、Web/Admin 登录与会话
│       ├── users/
│       ├── posts/              # 帖子、评论、互动、管理端列表
│       ├── social/             # 关注、通知
│       ├── rankings/
│       ├── aircraft-models/    # 机型列表与详情等
│       ├── reviews/          # 机型评测
│       ├── categories/         # 管理端分类（挂载在 API_ROUTES.models.categories）
│       └── brands/             # 管理端品牌（挂载在 API_ROUTES.models.brands）
└── tests/
    ├── health.test.ts
    ├── auth.test.ts
    ├── posts.test.ts
    ├── models.test.ts
    ├── rankings.test.ts
    └── reviews.test.ts
```

域内习惯：`*.route.ts` 绑路径，`*.service.ts` 业务，`*.repo.ts` 访问数据库，`*.schema.ts` / `*.middleware.ts` 等与域相关。

## 功能要点

- **入口**：`index.ts` 使用 `@hono/node-server`；`app.ts` 集中 `app.route(...)`。
- **健康检查**：`APP_ROUTES.health`。
- **数据**：通过 `@feijia/db` 与 PostgreSQL 交互；形状与 `packages/schemas` 对齐。

## 依赖

- `@feijia/shared`（`API_ROUTES`、`APP_ROUTES`、`APP_PORTS`）、`@feijia/schemas`、`@feijia/db` 等（见 `package.json`）。

## 编辑指引

- 新增资源域时参照现有 `modules/*` 拆分方式，并在 `app.ts` 注册路由。
- 与前端共享的请求/响应以 `packages/schemas` 为准；路径常量以 `packages/shared` 为准。
