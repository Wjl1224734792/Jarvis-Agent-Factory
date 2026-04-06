# 飞加

飞加是一个基于 Bun Monorepo 的低空飞行内容与管理平台，当前仓库包含用户端 Web、管理端 Admin、服务端 API，以及共享的数据库、协议与 HTTP Client 包。

## 仓库结构

```text
feijia/
├─ apps/
│  ├─ web/       # 用户端 Web
│  ├─ admin/     # 管理端
│  └─ server/    # Bun + Hono API
├─ packages/
│  ├─ config/        # 共享 TS 配置
│  ├─ shared/        # 共享常量与路由
│  ├─ schemas/       # Zod 协议
│  ├─ http-client/   # 前端请求封装
│  └─ db/            # Drizzle schema、迁移、种子数据
├─ docker/       # PostgreSQL / Redis / MinIO 本地基础设施
├─ docs/         # 设计、计划、评审等文档
├─ AGENTS.md     # 项目级代理说明
└─ .codex/AGENTS.md
```

说明：
- 微信小程序与 App 前端不再放在本仓库中维护。
- 小程序建议独立使用 `Taro` 开发。
- App 建议独立使用 `Flutter` 开发。

## 环境要求

- Bun `1.3.11`
- Docker Desktop
- PostgreSQL、Redis、MinIO 通过 `docker compose` 启动

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

将根目录的 [`.env.example`](E:/CodeStore/feijia/.env.example) 复制为 `.env`，然后按实际部署环境修改。

提示：
- 本地默认值已经对齐仓库内的 Docker 配置，可直接启动联调。
- URL 中如果密码包含 `#`、`!` 等特殊字符，需要做 URL 编码。
- 生产环境建议显式设置 `NODE_ENV=production`，并根据需要将 `OPENAPI_ENABLED=false`。

### 3. 启动本地基础设施

```bash
bun run infra:up
```

### 4. 初始化数据库与测试数据

```bash
# 导入海量测试数据（推荐本地联调使用）
bun run setup:dev

# 只做基础迁移与默认种子
bun run db:reset
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
bun run db:seed
bun run db:seed:test-data
bun run db:clear
bun run db:reset
bun run db:reset:test-data
```

### 质量校验

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run check
```

## 默认访问地址

- Web：`http://localhost:3000`
- Admin：`http://localhost:3001`
- Server：`http://localhost:3002`
- MinIO API：`http://localhost:9000`
- MinIO Console：`http://localhost:9001`

## OpenAPI 文档

服务端文档入口受环境变量控制：

- 文档 JSON：`/openapi.json`
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

建议：
- 图片尽量控制在 `10 MB` 以内
- 视频尽量控制在 `50 MB` 以内
- 如需进一步节省存储，可继续下调三个环境变量

本地默认示例：

```bash
UPLOAD_MAX_FILE_SIZE_MB=20
UPLOAD_MAX_IMAGE_SIZE_MB=10
UPLOAD_MAX_VIDEO_SIZE_MB=50
UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB=2
UPLOAD_MAX_POST_VIDEO_SIZE_MB=50
UPLOAD_MAX_REPORT_IMAGE_SIZE_MB=5
```

## 测试账号

海量测试数据脚本导入后可使用：

```text
管理员账号：testadmin
管理员密码：TestAdmin#123
```

Redis 内还会写入以下调试数据：
- 图形验证码：`test_captcha_001`
- 短信验证码手机号：`13800138000`
- 注册令牌：`test_reg_001`

## 协作约定

- 业务代码优先复用 `packages/*` 的现有协议与常量。
- 修改共享 schema 后，需要检查 `server`、`web`、`admin` 的下游影响。
- 提交前默认补齐 `lint`、`typecheck`、`test`、`build`。
