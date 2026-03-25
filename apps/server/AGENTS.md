# @feijia/server

Bun 运行的 Hono 服务，聚合路由与业务模块。

## 目录架构

```
apps/server/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # 进程入口
│   ├── app.ts                  # Hono 实例、全局中间件与路由挂载
│   ├── routes/
│   │   └── health.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.route.ts
│       │   ├── auth.service.ts
│       │   ├── auth.repo.ts
│       │   ├── auth.schema.ts
│       │   └── auth.middleware.ts
│       └── users/
│           ├── users.service.ts
│           └── users.schema.ts
└── tests/
    ├── health.test.ts
    └── auth.test.ts
```

## 架构

- **入口**：`src/index.ts` 启动 Node 适配器；`src/app.ts` 组装中间件与路由。
- **横切**：全局 CORS、`notFound` / `onError` JSON 响应。
- **路由**：`src/routes/health.ts`（健康检查）；`src/modules/auth/*`（认证相关 HTTP）。
- **模块习惯**：`*.route.ts` 绑定路径，`*.service.ts` 业务，`*.repo.ts` 数据访问，`*.schema.ts` / `auth.middleware.ts` 等与域相关。

## 依赖

- `@feijia/shared`（如 `APP_ROUTES`）、`@feijia/schemas`。

## 编辑指引

- 新资源域可参照 `modules/auth` 或 `modules/users` 的拆分方式。
- 与前端共享的请求/响应形状以 `packages/schemas` 为准。
