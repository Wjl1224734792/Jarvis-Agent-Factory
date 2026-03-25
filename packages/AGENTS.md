# packages 层

Workspace 内部库，供 `apps/*` 消费；保持无环依赖、导出稳定。

## 目录架构

```
packages/
├── AGENTS.md
├── config/              # 共享 tsconfig 片段（无 src）
│   ├── tsconfig.base.json
│   ├── tsconfig.react.json
│   └── tsconfig.server.json
├── shared/              # 应用名、端口、前后端路由常量等
│   └── src/
├── schemas/             # Zod 合约与类型（API / 表单的单一事实来源）
│   ├── src/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── health.ts
│   │   ├── models.ts
│   │   ├── posts.ts
│   │   ├── rankings.ts
│   │   ├── reviews.ts
│   │   └── social.ts
│   └── tests/
├── http-client/         # 基于 schemas 的 HTTP 封装（前端调用后端）
│   ├── src/
│   └── tests/
└── db/                  # Drizzle schema、迁移、种子、PG 客户端
    ├── src/
    │   ├── client.ts
    │   ├── schema.ts
    │   ├── migrate.ts / migrate.cli.ts
    │   ├── seed.ts / seed.cli.ts
    │   └── helpers.ts
    └── drizzle/         # SQL 迁移与 drizzle-kit 元数据
```

## 成员

| 包 | 作用 |
|----|------|
| `@feijia/config` | 共享 `tsconfig`（`exports` 子路径），无业务逻辑 |
| `@feijia/shared` | 跨端常量：`APP_PORTS`、`APP_ROUTES`、`API_ROUTES` 等 |
| `@feijia/schemas` | Zod 模式与推导类型；含单测 |
| `@feijia/http-client` | 封装对 `server` 的请求，与 schemas 对齐 |
| `@feijia/db` | PostgreSQL + Drizzle：`schema`、迁移 CLI、种子 |

## 依赖方向（示意）

```
config（独立）
shared
  ↑
schemas → http-client
db（独立：Drizzle + pg；由 server 等引用，见各 package.json）
```

`apps/server` 使用 `shared`、`schemas`、`db` 等；`web` / `admin` 使用 `http-client`、`schemas`、`shared`。

## 编辑指引

- 变更对外校验或类型时优先改 `schemas`，再适配 `http-client`、`db`（如表结构）与 `server`。
- 表结构变更走 `db` 的 generate/migrate 流程，避免手写与 `schema.ts` 不一致的 SQL。
- 避免在 `shared` 中堆积仅某一 app 使用的逻辑。
