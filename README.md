# 飞加

飞加是一个基于 Bun Monorepo 的低空飞行内容与管理平台。当前仓库维护用户端 Web、管理端 Admin、服务端 API，以及共享配置、协议、数据库与 HTTP Client。

## 当前维护范围

- `apps/web`：用户端 Web
- `apps/admin`：管理端
- `apps/server`：Bun + Hono API
- `packages/*`：共享配置、协议、常量、数据库与请求客户端
- `docker/*`：本地开发基础设施

说明：

- 微信小程序与 App 不在本仓库开发。
- 小程序建议独立使用 `Taro`。
- App 建议独立使用 `Flutter`。
- `apps/mobiles` 已删除，不再保留占位目录。

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

仓库现在明确区分 3 类数据：

### `base`

用于部署 / 生产初始化，只包含最小可运行数据：

- 管理员账号
- 站点设置
- 内容分类
- 飞行器分类

适用场景：

- 新环境首次部署
- 生产环境初始化
- 预发布环境最小可运行引导

### `demo`

用于开发环境，在 `base` 之上追加演示内容：

- 演示品牌与机型目录
- 演示文章与动态
- 演示榜单与排行对象
- 互动、评论、通知、投稿等示例数据

适用场景：

- 本地开发联调
- 产品演示
- UI 联调

### `mock`

用于测试 / E2E / 压测的大规模 mock 数据：

- 海量用户、帖子、评论、互动、榜单、投稿
- Redis 测试缓存
- MinIO 测试资源

适用场景：

- Playwright E2E
- 测试环境联调
- 压测与性能验证

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

```bash
bun run db:generate
bun run db:migrate
bun run db:push

bun run db:seed
bun run db:seed:base
bun run db:seed:demo
bun run db:seed:mock
bun run db:seed:dev
bun run db:seed:prod
bun run db:seed:test-data

bun run db:clear

bun run db:reset
bun run db:reset:base
bun run db:reset:demo
bun run db:reset:mock
bun run db:reset:dev
bun run db:reset:test-data

bun run setup:deploy
bun run setup:dev
bun run setup:test
bun run setup:test-data
```

说明：

- `db:seed:base`：导入基础 seed，不清库。
- `db:seed:demo`：导入开发演示数据，不清库。
- `db:seed:mock`：导入 mock / test 数据，不清库。
- `db:seed` 与 `db:seed:dev` 默认指向 `db:seed:demo`。
- `db:seed:prod` 默认指向 `db:seed:base`。
- `db:seed:test-data` 兼容旧叫法，等价于 `db:seed:mock`。
- `db:reset:*` 都会先执行 `db:clear`，再迁移并导入对应数据，属于显式破坏性重建流程。
- `setup:deploy` 不会启动本地基础设施，只做迁移和基础 seed 初始化。
- `setup:dev` 会先执行 `infra:up`，再重建为 `demo` 数据环境。
- `setup:test` 会先执行 `infra:up`，再重建为 `mock` 数据环境。
- `setup:test-data` 兼容旧叫法，等价于 `setup:test`。

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

说明：

- `test:unit`：只运行 schemas / http-client / web / admin 的无状态单元测试。
- `test:server`：只运行 server 侧测试。
- `test`：顺序执行 `test:unit` 和 `test:server`，不再在总测试脚本里额外清库。
- `test:e2e`：会先启动本地基础设施并重置为 `mock` 数据，再执行 Playwright。
- `test:e2e:headed`：带界面执行 Playwright。
- `test:e2e` 结束后数据库会停留在 `mock` 状态；若要回到开发演示环境，执行 `bun run db:reset:demo`。

## 默认访问地址

以下端口与 [`.env.example`](./.env.example) 中的默认值一致：

- Web：`http://localhost:3000`
- Admin：`http://localhost:3001`
- Server：`http://localhost:3002`
- MinIO API：`http://localhost:9000`
- MinIO Console：`http://localhost:9001`

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
