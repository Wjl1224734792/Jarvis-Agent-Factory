# packages/AGENTS.md

> `scope`: `packages/*`  
> `pre`: [`../AGENTS.md`](../AGENTS.md) **L0–L3** 已按任务加载  
> `human`: [`README.md`](./README.md) — 本文件**不是**人类入门文档

**禁止**：描述 `apps/*`、`docker/*` 内部实现；全仓 CORS/OpenAPI/L5 → 根 [`AGENTS.md`](../AGENTS.md)。

## 加载顺序

1. 根 L0–L2  
2. 根 L3（若本次动协议 / DB / env）  
3. 本节「目录边界」「修改要求」

## 成员

`config` · `shared` · `schemas` · `http-client` · `db`

## 目录边界

- `packages` **禁止** `import` `apps`。
- 协议 → `schemas`；路由/站点常量 → `shared`；客户端 → `http-client`；schema/迁移/seed → `db`。

## 修改要求

- 改协议：**先** `schemas`，**再**核对 `http-client` 与受影响 `apps/*`。
- 改共享路由常量：核对 `shared`、`server`、`web`、`admin`。
- 改表结构：至少执行 `bun run db:generate` 与 `bun run db:migrate`（按任务需要）。
- 改 seed、连接串、缓存、对象存储等 **env 行为**：同步 [`.env.example`](../.env.example) 与根 [`README.md`](../README.md)；若牵连本地容器端口、账号、卷或服务名，同步 [`docker/README.md`](../docker/README.md)。
- **禁止** 把某一应用的私有业务逻辑塞进 `packages/*`。
