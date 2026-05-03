# @feijia/web — AGENTS

> `scope`: `apps/web`  
> `pre`: [`../../AGENTS.md`](../../AGENTS.md) **L0–L2**；[`../AGENTS.md`](../AGENTS.md)  
> `human`: 根 [`README.md`](../../README.md)

**禁止**：描述 `admin`、`server`、`packages` 内部（除依赖关系外）。

## 加载顺序

1. 根 L0–L2 + `apps/AGENTS.md`  
2. 本节

## 入口

`src/main.tsx` · `src/app.tsx`

## 目录约定

| 类型 | 路径 |
|------|------|
| 页面/路由 | `src/routes/*` |
| 业务复用 | `src/features/*` |
| 组件 | `src/components/*` |
| hooks | `src/hooks/*` |
| 状态 | `src/store/*` |
| 工具 | `src/lib/*` |

## 修改要求

- HTTP：`@feijia/http-client`；类型：`@feijia/schemas`；路径常量：`@feijia/shared`。
- **禁止** 在页面散落请求细节、鉴权、响应适配。
- 用户头像：空 `avatarUrl` 仅做 trim / 空值归一，交给 `UserAvatar` fallback icon；不得为真实用户补 seed / 随机头像图。
- `web` 与 `admin` 重复逻辑 → `packages/*`，**禁止** 双份复制。
