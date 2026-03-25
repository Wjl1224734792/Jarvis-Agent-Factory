# apps 层

面向用户的可运行应用，依赖 `packages/*` 中的共享代码，不反向被 packages 引用。

## 目录架构

```
apps/
├── AGENTS.md
├── web/                 # 用户端 SPA（Vite + React，端口见 @feijia/shared APP_PORTS.web）→ web/AGENTS.md
├── admin/               # 管理端 SPA → admin/AGENTS.md
├── server/              # Hono API（Bun，端口 APP_PORTS.server）→ server/AGENTS.md
└── mobiles/             # 移动端占位 → mobiles/AGENTS.md
```

各应用下常见：`package.json`、`tsconfig.json`、`vite.config.ts`（前端）、`src/`；`server` 另含 `tests/`。

## 成员

| 目录 | 职责 |
|------|------|
| `web` | 飞加网用户端：机型/动态/排行/圈子、鉴权与设置等 |
| `admin` | 管理端：机型分类与品牌、审核、帖子与评论管理等 |
| `server` | HTTP API：认证、帖子、社交、排行、机型与评测等 |
| `mobiles` | 移动端占位包，尚未接入完整构建 |

## 与仓库根脚本

- `bun run dev:web` / `dev:admin` / `dev:server` 启动对应应用。
- `bun run db:generate` / `db:migrate` / `db:seed` 操作 `packages/db`（需本地数据库，见 `docker/`）。
- 根目录 `typecheck` / `test` / `build` 按依赖顺序覆盖已接线的包与应用。

## 编辑指引

- 改 API 或前后端共享形状时同步 `packages/schemas` 与 `packages/http-client`、`apps/server` 及调用方。
- 路由与路径前缀优先与 `@feijia/shared` 中 `APP_ROUTES` / `API_ROUTES` 对齐。
- 各应用细节见同目录下子文件夹内的 `AGENTS.md`。
