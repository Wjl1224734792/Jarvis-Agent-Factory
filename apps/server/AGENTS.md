# @feijia/server — AGENTS

> `scope`: `apps/server`  
> `pre`: [`../../AGENTS.md`](../../AGENTS.md) **L0–L3**；若涉 CORS/OpenAPI → **L4**；[`../AGENTS.md`](../AGENTS.md)  
> `human`: 根 [`README.md`](../../README.md)（CORS、OpenAPI、端口、日志说明）

**禁止**：复述根 [`AGENTS.md`](../../AGENTS.md) **L4** 中 CORS/OpenAPI 默认值全文；OpenAPI 行为以根 L4 为准。

## 加载顺序

1. 根 L0–L3 + `apps/AGENTS.md`  
2. 本节「入口与结构」「修改要求」  
3. 仅当改日志/上传/监控 → 对应小节

## 入口与结构

- `src/index.ts` · `src/app.ts`
- 顶层/健康检查：`src/routes/*`
- OpenAPI 实现：`src/openapi/*`（语义见根 L4）
- 业务模块：`src/modules/<domain>/*`
- 分层：`*.route.ts` · `*.service.ts` · `*.repo.ts` · `*.schema.ts`

## 修改要求

- 路由常量：`@feijia/shared.API_ROUTES`；请求/响应：`@feijia/schemas`；数据：`@feijia/db` + 现有 repo。
- 改认证、上传、会话、缓存、短信、OpenAPI → 核对 `.env.example`、根 `README.md`。

## OpenAPI 实现位置

代码在 `src/openapi/*`。URL、开关、默认启用策略 → **仅** 根 [`AGENTS.md`](../../AGENTS.md) **L4**。

## 日志（条件加载）

- 实现：`src/lib/logger.ts`（`app` / `request` / `error` / `security`）。
- 改日志行为或监控 API → 同步 `.env.example`、根 `README.md`。
- Env：`LOG_MODE` · `LOG_DIR` · `LOG_LEVEL` · `LOG_HTTP_ENABLED` · `LOG_MAX_READ_LINES`。
- 生产：日志落盘/挂载；**禁止** 把实时运行日志主存到业务库；对象存储仅作归档用途。

## 上传 env（条件加载）

改任一下列变量 → 同步 `.env.example` 与根 `README.md`：

`UPLOAD_MAX_FILE_SIZE_MB` · `UPLOAD_MAX_IMAGE_SIZE_MB` · `UPLOAD_MAX_VIDEO_SIZE_MB` · `UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB` · `UPLOAD_MAX_POST_IMAGE_SIZE_MB` · `UPLOAD_MAX_POST_VIDEO_SIZE_MB` · `UPLOAD_MAX_AIRCRAFT_COVER_IMAGE_SIZE_MB` · `UPLOAD_MAX_AIRCRAFT_VIDEO_SIZE_MB` · `UPLOAD_MAX_RANKING_COVER_IMAGE_SIZE_MB` · `UPLOAD_MAX_RANKING_ITEM_IMAGE_SIZE_MB` · `UPLOAD_MAX_REPORT_IMAGE_SIZE_MB`
