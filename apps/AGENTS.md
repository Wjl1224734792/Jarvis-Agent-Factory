# apps 层

面向用户的可运行应用，依赖 `packages/*` 中的共享代码，不反向被 packages 引用。

## 目录架构

```
apps/
├── AGENTS.md
├── web/                 # 用户端 SPA → web/AGENTS.md
├── admin/               # 管理端 SPA → admin/AGENTS.md
├── server/              # Hono API → server/AGENTS.md
└── mobiles/             # 移动端占位 → mobiles/AGENTS.md
```

各应用下常见：`package.json`、`tsconfig.json`、`vite.config.ts`（前端）、`src/`（源码）、`server` 另含 `tests/`。

## 成员

| 目录 | 职责 |
|------|------|
| `web` | 用户端 Web（Vite + React，默认端口 3000） |
| `admin` | 管理端 Web（Vite + React，默认端口 3001） |
| `server` | HTTP API（Bun + Hono） |
| `mobiles` | 移动端占位包，尚未接入完整构建 |

## 与仓库根脚本

- `bun run dev:web` / `dev:admin` / `dev:server` 分别启动对应应用。
- 根目录 `typecheck` / `test` / `build` 会按依赖顺序覆盖当前已接线的包与应用（`mobiles` 可能为占位）。

## 编辑指引

- 改 API 合约时同步 `packages/schemas` 与调用方（`http-client`、各 app）。
- 各应用细节见同目录下对应子文件夹内的 `AGENTS.md`。
