# docker/AGENTS.md

> `scope`: `docker/*`（本地开发 Compose）  
> `pre`: [`../AGENTS.md`](../AGENTS.md) **L0–L3**（含 env 同步）  
> `human`: [`README.md`](./README.md)、根 [`README.md`](../README.md)

**禁止**：生产编排、云资源、CI/CD；**禁止** 展开 `apps/*`、`packages/*` 实现。

## 服务范围

PostgreSQL · Redis · MinIO（仅本地）。

## 修改要求

- **优先** 根脚本：`bun run infra:up` · `infra:ps` · `infra:down`。
- 直接 Compose → `docker compose -f ...`（**禁止** `docker-compose` 命令形式）。
- 改端口/账号/密码/卷/服务名/健康检查 → **必须** 同步：
  - [`.env.example`](../.env.example)
  - 根 [`README.md`](../README.md)
  - [`docker/README.md`](./README.md)
- **[`.claude/rules/`](../.claude/rules/)** — 所有配置变更必须遵循团队协作规范与通用编程规范
