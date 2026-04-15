# 飞加

Bun Monorepo：用户端 Web（`apps/web`）、管理端（`apps/admin`）、API（`apps/server`）、共享包（`packages/*`）、本地 Docker（`docker/*`）。小程序 / App 不在本仓库；`apps/mobiles` 已删除。

## 仓库结构

```text
feijia/
├─ apps/
│  ├─ web/
│  ├─ admin/
│  └─ server/
├─ packages/
│  ├─ config/
│  ├─ shared/
│  ├─ schemas/
│  ├─ http-client/
│  └─ db/
├─ docker/
├─ docs/
├─ AGENTS.md
└─ .codex/AGENTS.md
```

## 环境要求

- Bun `1.3.11`
- Docker Desktop（需支持 `docker compose`）

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

将根目录的 [`.env.example`](./.env.example) 复制为 `.env`，再按实际环境修改。

### 3. 启动本地基础设施

```bash
bun run infra:up
```

### 4. 初始化数据环境

```bash
# 部署 / 生产初始化：执行迁移并导入基础 seed
bun run setup:deploy

# 开发环境：启动基础设施、清库、迁移并导入 demo 数据
bun run setup:dev

# 测试 / E2E / 压测环境：启动基础设施、清库、迁移并导入 mock 数据
bun run setup:test
```

### 5. 启动应用

```bash
bun run dev:server
bun run dev:web
bun run dev:admin
```

## 数据环境分层

| 类型 | 含义 | 典型用途 |
|------|------|----------|
| `base` | 最小可运行（管理员、站点设置、分类等） | `setup:deploy`、`db:seed:base` |
| `demo` | 在 base 上增加演示内容（机型、帖子、榜单等） | 本地开发、`db:seed` / `db:seed:demo` |
| `mock` | 大规模测试数据（PostgreSQL + Redis + MinIO） | E2E、`db:seed:mock`、`setup:test` |

## 常用脚本

### 开发

```bash
bun run dev:server
bun run dev:web
bun run dev:admin
```

### 基础设施

```bash
bun run infra:up
bun run infra:ps
bun run infra:down
```

### 数据库与数据初始化

根目录 `db:*` 与 `packages/db` 中脚本一一对应；`db:seed` 即执行 `packages/db` 的 `seed`（当前与 `seed:demo` 相同）。

```bash
bun run db:generate
bun run db:migrate
bun run db:push

# 只灌数据（不删表）
bun run db:seed              # 同 packages/db seed，当前 = demo
bun run db:seed:base | demo | mock
bun run db:seed:dev          # 同 db:seed
bun run db:seed:prod         # 同 db:seed:base
bun run db:seed:test-data    # 同 packages/db seed:test-data（= mock）

# 清数据或重建 schema
bun run db:clear             # 截断业务表 + 清 Redis，保留表结构
bun run db:wipe-schema       # 删并重建 public + 清 Redis（破坏性）

# 全量重建：wipe-schema → migrate → seed
bun run db:reset             # 默认 = db:reset:demo
bun run db:reset:base | demo | mock
bun run db:reset:dev | test-data   # 别名见下

bun run setup:deploy         # migrate + seed:base，不启 Docker
bun run setup:dev            # infra:up + db:reset:demo
bun run setup:test           # infra:up + db:reset:mock（setup:test-data 同义）
```

要点：

- **只想清空数据**：用 `db:clear`。不要在「迁移记录与真实结构不一致」时指望单独再跑 `db:migrate` 自动修好。
- **要干净库 + 迁移**：用 `db:reset:*`（或手动 `db:wipe-schema && db:migrate && db:seed:…`）。
- **别名**：`db:reset:dev` = `db:reset:demo`；`db:reset:test-data` = `db:reset:mock`。

### 质量校验

```bash
bun run lint
bun run typecheck
bun run test:unit
bun run test:server
bun run test
bun run test:e2e
bun run build
bun run check
```

- `test` = `test:unit` + `test:server`。
- `test:e2e`：先 `infra:up` 与 `db:reset:mock`，再 Playwright；结束后库为 `mock`，需 demo 可 `bun run db:reset:demo`。
- `check` = lint + test + typecheck + build。

## 默认访问地址

以下端口与 [`.env.example`](./.env.example) 中的默认值一致：

- Web：`http://localhost:17380`
- Admin：`http://localhost:17381`
- Server：`http://localhost:17382`
- MinIO API：`http://localhost:9000`
- MinIO Console：`http://localhost:9001`

若启动 `dev:server` 时出现 `Failed to start server. Is port ... in use?`，说明 **SERVER_PORT**（默认与上表 Server 端口一致）已被占用：请先关闭其它正在运行的 `bun dev:server` 终端，或在 Windows 上查出并结束占用进程，例如：

```powershell
Get-NetTCPConnection -LocalPort 17382 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

也可使用 `netstat -ano | findstr :17382` 查看最后一列 PID，再 `taskkill /PID <pid> /F`。

## CORS 与局域网访问

服务端（`apps/server`）使用 Hono 的 `cors` 中间件，并允许携带 Cookie（`credentials: true`）。

- 未设置 `CORS_ORIGIN` 时：默认允许 `localhost` / `127.0.0.1` 对应的前端端口。
- 使用局域网 IP 打开前端时，必须在根目录 `.env` 中配置 `CORS_ORIGIN`。
- 修改 `CORS_ORIGIN` 后需重启 `dev:server`。

## OpenAPI 文档

服务端文档入口：

- JSON：`/openapi.json`
- Swagger UI：`/docs`

控制规则：

- `OPENAPI_ENABLED=true`：显式开启
- `OPENAPI_ENABLED=false`：显式关闭
- 未配置时：非生产默认开启，生产默认关闭

## 日志与监控

开发默认控制台；生产默认写入 `apps/server/logs/*`（`LOG_DIR` 可覆盖），分 `app` / `request` / `error` / `security`。环境变量：`LOG_MODE`、`LOG_DIR`、`LOG_LEVEL`、`LOG_HTTP_ENABLED`、`LOG_MAX_READ_LINES`。Admin：`/admin/logs`；API：`GET /admin/logs/overview|files|entries`（管理员）。

## 测试账号与数据说明

基础 / demo 数据导入后可使用：

```text
管理员账号：admin
管理员密码：Admin#123
```

mock 数据导入后可使用：

```text
管理员账号：testadmin
管理员密码：TestAdmin#123
普通登录手机号：13800138000
短信验证码：888888
```

更多 mock 数据说明见 [docs/test-data-usage.md](./docs/test-data-usage.md)。

## 项目文档

- [docker/README.md](./docker/README.md)：本地基础设施说明
- [docs/test-data-usage.md](./docs/test-data-usage.md)：mock 数据导入与使用说明
- [docs/openapi-frontend-integration-guide.md](./docs/openapi-frontend-integration-guide.md)：前后端 OpenAPI 对接说明
- [AGENTS.md](./AGENTS.md)：项目级代理约束
- [.codex/AGENTS.md](./.codex/AGENTS.md)：Codex 相关规则
