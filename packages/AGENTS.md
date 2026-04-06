# packages AGENTS

## 目录边界

- `packages` 不依赖 `apps`
- 共享协议优先放 `schemas`
- 常量优先放 `shared`
- 数据库结构、迁移、种子数据放 `db`

## 修改要求

- 改协议时先改 `schemas`
- 再检查 `http-client` 和各应用是否受影响
- 改表结构时走：

```bash
bun run db:generate
bun run db:migrate
```

- 改种子数据或环境变量依赖时，同步更新 README 与 `.env.example`
