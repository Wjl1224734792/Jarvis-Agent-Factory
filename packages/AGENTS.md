# packages 层

Workspace 内部库，供 `apps/*` 消费；保持无环依赖、导出稳定。

## 成员

| 包 | 作用 |
|----|------|
| `@feijia/config` | 共享 `tsconfig`，无业务逻辑 |
| `@feijia/shared` | 跨端常量：路由、端口、API 前缀 |
| `@feijia/schemas` | Zod 类型定义，前后端共享 |
| `@feijia/http-client` | 基于 schema 的 HTTP 封装 |
| `@feijia/db` | Drizzle schema、迁移 CLI、种子 |

## 依赖关系

```
config（独立）
shared
schemas → http-client
db（独立，Drizzle + pg）
```

`sapps/server` 使用 `shared/schemas/db`；`web`/`admin` 使用 `http-client/schemas/shared`。

## 编辑指引

- 类型变更优先改 `schemas`，再适配 `http-client`/`db`
- 表结构变更走 `db` 的 generate/migrate 流程