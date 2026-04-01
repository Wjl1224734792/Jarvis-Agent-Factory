# apps 层

面向用户的可运行应用，依赖 `packages/*` 中的共享代码，不反向被 packages 引用。

## 成员

| 目录 | 职责 |
|------|------|
| `web` | 用户端：机型/动态/排行/圈子 |
| `admin` | 管理端：分类/品牌/审核/帖子管理 |
| `server` | API：认证/帖子/社交/排行/评测 |
| `mobiles` | 移动端占位 |

## 脚本

- `bun run dev:web` / `dev:admin` / `dev:server` 启动
- 根目录 `typecheck` / `test` / `lint` / `build`

## 编辑指引

- 改 API 时同步 `schemas` 与 `http-client`、`server`
- 路由常量与 `@feijia/shared.APP_ROUTES` 对齐