# packages/AGENTS.md

适用于 `packages/*`。

## 当前成员

- `config`
- `shared`
- `schemas`
- `http-client`
- `db`

## 目录边界

- `packages` 不依赖 `apps`。
- 共享协议优先改 `schemas`。
- 共享常量与路由优先改 `shared`。
- 请求客户端优先改 `http-client`。
- 数据库 schema、迁移与 seed 放 `db`。

## 修改要求

- 改共享协议时，先改 `schemas`，再检查 `http-client` 与 `apps/*` 是否受影响。
- 改共享路由常量时，同步检查 `shared`、`server`、`web`、`admin`。
- 改数据库结构时，至少考虑：

```bash
bun run db:generate
bun run db:migrate
```

- 改 seed、数据库连接、缓存、对象存储等依赖环境变量的能力时，同步更新 `.env.example` 与根 `README.md`。
- 不要把应用私有逻辑塞进 `packages/*`。
