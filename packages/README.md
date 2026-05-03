# 共享包 `packages/`

这里放的是 **多个应用一起用** 的东西：类型约定、路由常量、HTTP 封装、数据库 schema 和迁移等。你可以把它理解成「协议层 + 数据层」的公共底座；具体页面和接口实现仍在 `apps/*`。

**依赖关系**：应用依赖 `packages`，`packages` **不会**反过来依赖某个 `app`，避免循环引用和隐式耦合。

下面是一张「哪个目录管什么」的快照；真要改代码时，以仓库里的目录为准，本表不逐文件维护（避免和实现脱节）。

| 目录 | 大致职责 |
|------|----------|
| [`config/`](./config/) | 构建、工具链等共享配置 |
| [`shared/`](./shared/) | 路由常量、全站共享常量等 |
| [`schemas/`](./schemas/) | 请求/响应形状、共享枚举等（Zod / TS） |
| [`http-client/`](./http-client/) | 基于上述 schema 的 API 调用封装 |
| [`db/`](./db/) | Drizzle、迁移、`seed`、与数据库相关的脚本入口 |

如果你在给 **AI 助手** 派活（例如「只改 schema，别动页面」），请让它遵守 [`AGENTS.md`](./AGENTS.md) 里的边界；那是给代理看的指令，和本 README 分工不同。

**和别处的关系**：数据库脚本的名字、`db:clear` 和 `db:reset` 差在哪——写在根目录 [`README.md`](../README.md) 的「数据库与数据初始化」；本地 Postgres/Redis/MinIO 怎么起——见 [`docker/README.md`](../docker/README.md)。

---

## 延伸阅读

| 文档 | 适合谁 |
|------|--------|
| 根 [`README.md`](../README.md) | 全仓脚本、端口、数据环境 |
| [`AGENTS.md`](./AGENTS.md) | 自动化代理：`packages/*` 内必须遵守的约束 |
| 根 [`AGENTS.md`](../AGENTS.md) | 全仓 L0–L5（协议顺序、env、收尾命令） |
