# 飞加

飞加是一个基于 Bun Monorepo 的低空飞行内容与管理平台。当前仓库维护用户端 Web、管理端 Admin、服务端 API，以及共享的配置、协议、路由常量、数据库与 HTTP Client。

## 当前维护范围

- `apps/web`：用户端 Web
- `apps/admin`：管理端
- `apps/server`：Bun + Hono API
- `packages/*`：共享配置、协议、常量、数据库与请求客户端
- `docker/*`：本地开发基础设施

说明：

- 微信小程序与 App 不在本仓库中开发。
- 小程序建议独立使用 `Taro`。
- App 建议独立使用 `Flutter`。
- `apps/mobiles` 已删除，不再保留占位目录。

## 仓库结构

```text
feijia/
├─ apps/
│  ├─ web/           # 用户端 Web
│  ├─ admin/         # 管理端
│  └─ server/        # Bun + Hono API
├─ packages/
│  ├─ config/        # 共享配置
│  ├─ shared/        # 共享常量与路由
│  ├─ schemas/       # Zod 协议
│  ├─ http-client/   # 前端请求封装
│  └─ db/            # Drizzle schema、迁移、seed
├─ docker/           # PostgreSQL / Redis / MinIO 本地基础设施
├─ docs/             # 需求、任务、计划、实现、评审与使用说明
├─ AGENTS.md         # 项目级代理说明
└─ .codex/AGENTS.md  # Codex 相关规则
```

## 环境要求

- Bun `1.3.11`
- Docker Desktop（需要 Compose V2，也就是 `docker compose` 命令）

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

将根目录的 [`.env.example`](./.env.example) 复制为 `.env`，然后按实际部署环境修改。

提示：

- 本地默认值已经对齐 `docker/*` 中的 PostgreSQL、Redis、MinIO 配置，可直接启动联调。
- URL 中如果密码包含 `#`、`!`、`@` 等特殊字符，需要做 URL 编码。
- 生产环境建议显式设置 `NODE_ENV=production`，并根据需要将 `OPENAPI_ENABLED=false`。
- 用手机或局域网 IP 打开前端时，需配置 `CORS_ORIGIN`（见下文「CORS 与局域网访问」）。

### 3. 启动本地基础设施

```bash
bun run infra:up
```

如需查看底层 `docker compose` 方式，可参考 [`docker/README.md`](./docker/README.md)。

### 4. 初始化数据库

```bash
# 开发默认：启动基础设施、清库、迁移并导入基础 seed
bun run setup:dev

# 测试 / 压测：启动基础设施、清库、迁移并导入海量测试数据
bun run setup:test-data

# 只导入基础 seed（非破坏性，不清库）
bun run db:seed
```

### 5. 启动应用

```bash
bun run dev:server
bun run dev:web
bun run dev:admin
```

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

### 数据库

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed
bun run db:seed:dev
bun run db:seed:prod
bun run db:seed:test-data
bun run db:clear
bun run db:reset
bun run db:reset:dev
bun run db:reset:test-data
bun run setup:dev
bun run setup:test-data
```

说明：

- `db:seed` / `db:seed:dev` / `db:seed:prod` 指向同一套基础 seed，默认不清库。
- `db:seed:test-data` 只用于测试环境或压测环境导入海量数据，不建议作为开发默认入口。
- `db:reset:*` 都会先执行 `db:clear` 再迁移并注入，属于显式破坏性重建流程。
- `setup:dev` 与 `setup:test-data` 都会先执行 `infra:up`。

### 质量校验

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run check
```

## 默认访问地址

以下端口与 [`.env.example`](./.env.example) 中 `SERVER_PORT`、`WEB_DEV_PORT`、`ADMIN_DEV_PORT` 的默认值一致；若你在 `.env` 中改了端口，请以实际值为准。

- Web：`http://localhost:<WEB_DEV_PORT>`（默认 `3000`）
- Admin：`http://localhost:<ADMIN_DEV_PORT>`（默认 `3001`）
- Server：`http://localhost:<SERVER_PORT>`（默认 `3002`）
- MinIO API：`http://localhost:9000`
- MinIO Console：`http://localhost:9001`

## CORS 与局域网访问

服务端（`apps/server`）使用 Hono 的 `cors` 中间件，且允许携带 Cookie（`credentials: true`）。

- **未设置 `CORS_ORIGIN` 时**：默认允许的 Origin 为 `http://localhost` 与 `http://127.0.0.1`，端口取自环境变量 `WEB_DEV_PORT`、`ADMIN_DEV_PORT`；若未配置或无效，则回退到 `packages/shared` 中的 `APP_PORTS`（3000 / 3001）。实现见 [`apps/server/src/lib/cors-origins.ts`](./apps/server/src/lib/cors-origins.ts)。
- **用局域网 IP 打开前端**（例如 `http://192.168.x.x:7001`）时，浏览器请求的 `Origin` 不是 `localhost`，必须在根目录 `.env` 中设置 `CORS_ORIGIN`：将允许的 Origin 用英文逗号列出（须含协议、主机、端口），或仅在可信本地网络开发时使用 `CORS_ORIGIN=all`（按请求回显 Origin，与 `credentials` 兼容）。说明与示例见 `.env.example` 中「服务端与前端端口」小节。
- 修改 `CORS_ORIGIN` 后需重启 `dev:server`。

## OpenAPI 文档

服务端文档入口受环境变量控制：

- JSON：`/openapi.json`
- Swagger UI：`/docs`

控制规则：

- `OPENAPI_ENABLED=true`：显式开启
- `OPENAPI_ENABLED=false`：显式关闭
- 未配置时：非生产环境默认开启，生产环境默认关闭

## 上传大小限制

上传大小限制通过根目录环境变量控制，单位为 MB：

- `UPLOAD_MAX_FILE_SIZE_MB`：所有上传统一上限
- `UPLOAD_MAX_IMAGE_SIZE_MB`：图片上传上限
- `UPLOAD_MAX_VIDEO_SIZE_MB`：视频上传上限
- `UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB`：头像图片上限
- `UPLOAD_MAX_POST_IMAGE_SIZE_MB`：帖子图片上限
- `UPLOAD_MAX_POST_VIDEO_SIZE_MB`：帖子视频上限
- `UPLOAD_MAX_AIRCRAFT_COVER_IMAGE_SIZE_MB`：机型封面图上限
- `UPLOAD_MAX_AIRCRAFT_VIDEO_SIZE_MB`：机型视频上限
- `UPLOAD_MAX_RANKING_COVER_IMAGE_SIZE_MB`：榜单封面图上限
- `UPLOAD_MAX_RANKING_ITEM_IMAGE_SIZE_MB`：榜单条目图片上限
- `UPLOAD_MAX_REPORT_IMAGE_SIZE_MB`：举报图片上限

实际生效值会取“业务默认值”和环境变量中的最小值。

本地常见示例：

```bash
UPLOAD_MAX_FILE_SIZE_MB=20
UPLOAD_MAX_IMAGE_SIZE_MB=10
UPLOAD_MAX_VIDEO_SIZE_MB=50
UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB=2
UPLOAD_MAX_POST_VIDEO_SIZE_MB=50
UPLOAD_MAX_REPORT_IMAGE_SIZE_MB=5
```

## 测试账号与调试数据

基础 seed 导入后可使用：

```text
管理员账号：admin
管理员密码：Admin#123
```

海量测试数据脚本导入后可使用：

```text
管理员账号：testadmin
管理员密码：TestAdmin#123
```

Redis 内还会写入以下调试数据：

- 图形验证码：`test_captcha_001`
- 短信验证码手机号：`13800138000`
- 注册令牌：`test_reg_001`

## 项目文档

- [`docker/README.md`](./docker/README.md)：本地基础设施说明
- [`docs/test-data-usage.md`](./docs/test-data-usage.md)：测试数据导入与使用说明
- [`docs/openapi-frontend-integration-guide.md`](./docs/openapi-frontend-integration-guide.md)：前后端 OpenAPI 对接说明
- [`AGENTS.md`](./AGENTS.md)：项目级代理约束
- [`.codex/AGENTS.md`](./.codex/AGENTS.md)：Codex 相关规则

## 协作约定

- 业务代码优先复用 `packages/*` 的现有协议与常量。
- 修改共享 schema 后，需要检查 `server`、`web`、`admin` 的下游影响。
- 修改环境变量、基础设施端口或默认账号密码时，同步更新 `.env.example` 与相关文档（含 CORS 与局域网访问说明时，见上文「CORS 与局域网访问」）。
- 提交前默认补齐 `lint`、`typecheck`、`test`、`build`。
