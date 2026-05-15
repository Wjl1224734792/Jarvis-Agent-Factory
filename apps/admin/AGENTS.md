# @feijia/admin — AGENTS

> `scope`: `apps/admin`  
> `pre`: [`../../AGENTS.md`](../../AGENTS.md) **L0–L2**；[`../AGENTS.md`](../AGENTS.md)  
> `human`: 根 [`README.md`](../../README.md)

**禁止**：描述 `web`、`server`、`packages` 内部（除依赖关系外）。

## 加载顺序

1. 根 L0–L2 + `apps/AGENTS.md`  
2. 本节
3. **[`.claude/rules/`](../../.claude/rules/)** — 所有代码必须遵循三份编程规范

## 入口

`src/main.tsx` · `src/app.tsx`

## 目录约定

| 类型 | 路径 |
|------|------|
| 业务 | `src/features/*` |
| 组件 | `src/components/*` |
| lib/工具/路由封装 | `src/lib/*` |
| 静态资源 | `src/assets/*` |

## 修改要求

- HTTP：`@feijia/http-client`；类型：`@feijia/schemas`。
- **禁止** 在页面散落请求、鉴权、接口适配。
- 与 `web` 可共享部分 → `packages/*`。
- UI：**antd 6.x**（Menu、Table、Modal、message 等），配合 Tailwind CSS 4（禁止 `@apply`）。
- 鉴权：所有页面通过 `requireRole(...roles)` 守卫；侧边栏菜单通过 `filterMenuByRole(items, role)` 按角色过滤。
- AI 功能：仅排版优化（`POST /api/v1/ai/format`），通过后台 AI 设置开关控制。
