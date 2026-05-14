# apps/AGENTS.md

> `scope`: `apps/*`（web · admin · server 共性）  
> `pre`: [`../AGENTS.md`](../AGENTS.md) **L0–L2**；若动协议/DB/env → **L3**  
> `human`: 根 [`README.md`](../README.md)、[`README.md`](./README.md)

**禁止**：展开 `packages/*`、`docker/*` 内部细节；各应用专有结构 → `apps/web|admin|server/AGENTS.md`。

## 加载顺序

1. 根 L0–L2  
2. 根 L3（条件同上）  
3. 本节  
4. 进入单应用 → 该应用 `AGENTS.md`
5. **[`.claude/rules/`](../.claude/rules/)** — 所有代码必须遵循三份编程规范

## 成员

`web` · `admin` · `server` — **禁止** 恢复 `apps/mobiles`。

## 边界

- `apps` 只消费 `packages/*`；禁止让 `packages` 依赖 `apps`。
- 协议 → `packages/schemas`；常量/路由 → `packages/shared`；请求 → `packages/http-client`；DB → `packages/db` + server 模块。

## 修改要求

- 改共享契约：检查 `packages/schemas`、`packages/http-client`、`packages/shared` 与受影响 app。
- **禁止** 在应用内硬编码应属于 `packages` 的结构、路由、鉴权约定、路径。
- 新页面/模块：跟随各 app 现有目录与命名。
- `web` 与 `admin` 重复逻辑 → **优先** 上提到 `packages/*`，禁止两应用各抄一份。
