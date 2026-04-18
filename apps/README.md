# 应用 `apps/`

这里有三条 **可以同时开发** 的线：用户站 Web、管理后台、以及提供 API 的 `server`。它们共用 [`packages/`](../packages/README.md) 里的约定，而不是在各自目录里再抄一份类型或路径常量。

本地数据库、Redis、MinIO 怎么装、连接串在哪——不在这里重复，请看根目录 [`README.md`](../README.md) 和 [`docker/README.md`](../docker/README.md)。

| 目录 | 是什么 | 常用命令（在仓库根执行） |
|------|--------|---------------------------|
| [`web/`](./web/) | 用户端前端 | `bun run dev:web` |
| [`admin/`](./admin/) | 管理端前端 | `bun run dev:admin` |
| [`server/`](./server/) | Hono API、业务模块 | `bun run dev:server` |

默认本机地址和端口以根目录 [`.env.example`](../.env.example) 为准，汇总在根 [`README.md`](../README.md)「默认访问地址」。

### 改代码时从哪读起（建议）

1. **动的是大家共用的类型、常量或表结构** → 先看 [`packages/README.md`](../packages/README.md)，再进具体 `app`。
2. **只动某一个产品里的页面或接口** → 直接看该目录下的源码，需要硬性约定时打开 [`AGENTS.md`](./AGENTS.md) 或对应子应用里的 `AGENTS.md`。
3. **动环境变量或跨域** → 根目录 `.env` / `README` 里的 CORS 说明；给代理下指令时用根 [`AGENTS.md`](../AGENTS.md) 的 L3/L4。

---

## 延伸阅读

| 文档 | 适合谁 |
|------|--------|
| [`apps/AGENTS.md`](./AGENTS.md) | 代理：`apps/*` 共性 |
| [`web/AGENTS.md`](./web/AGENTS.md) 等 | 代理：单应用结构与约束 |
| 根 [`AGENTS.md`](../AGENTS.md) | 代理：全仓规则 |
| 根 [`README.md`](../README.md) | 人类：脚本与端口 |
