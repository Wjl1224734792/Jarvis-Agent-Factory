# @feijia/server AGENTS

## 入口与结构

- 入口：`src/index.ts`
- 应用实例：`src/app.ts`
- 顶层路由与健康检查在 `src/routes/*`
- OpenAPI 相关实现放 `src/openapi/*`
- 业务模块优先放 `src/modules/<domain>/*`
- 模块内优先按 `*.route.ts` / `*.service.ts` / `*.repo.ts` / `*.schema.ts` 分层

## 修改要求

- 路由常量对齐 `@feijia/shared.API_ROUTES`。
- 请求与响应结构对齐 `@feijia/schemas`。
- 数据访问优先复用 `@feijia/db` 与现有 repo 层。
- 改认证、上传、会话、缓存、短信、OpenAPI 时，检查 `.env.example`、根 `README.md` 与相关文档是否需要同步。

## OpenAPI

- 路径：`/docs`、`/openapi.json`
- 由 `OPENAPI_ENABLED` 控制
- 未配置时：非生产默认开启，生产默认关闭
- 生产相关改动不要默认暴露文档

## 日志配置

- 日志实现位于 `src/lib/logger.ts`，支持 `app/request/error/security` 分类。
- 涉及日志行为或日志监控 API 的改动时，同步检查：
  - `.env.example`
  - 根 `README.md`
- 相关环境变量：
  - `LOG_MODE`（`auto|console|file|both`）
  - `LOG_DIR`
  - `LOG_LEVEL`（`DEBUG|INFO|WARN|ERROR`）
  - `LOG_HTTP_ENABLED`
  - `LOG_MAX_READ_LINES`
- 生产环境日志持久化优先使用文件目录挂载；原始运行日志不要写入业务数据库，对象存储只适合后续归档，不作为实时日志主存。

## 上传限制

- 上传大小限制由以下环境变量控制：
  - `UPLOAD_MAX_FILE_SIZE_MB`
  - `UPLOAD_MAX_IMAGE_SIZE_MB`
  - `UPLOAD_MAX_VIDEO_SIZE_MB`
  - `UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB`
  - `UPLOAD_MAX_POST_IMAGE_SIZE_MB`
  - `UPLOAD_MAX_POST_VIDEO_SIZE_MB`
  - `UPLOAD_MAX_AIRCRAFT_COVER_IMAGE_SIZE_MB`
  - `UPLOAD_MAX_AIRCRAFT_VIDEO_SIZE_MB`
  - `UPLOAD_MAX_RANKING_COVER_IMAGE_SIZE_MB`
  - `UPLOAD_MAX_RANKING_ITEM_IMAGE_SIZE_MB`
  - `UPLOAD_MAX_REPORT_IMAGE_SIZE_MB`
- 改上传限制时，同步更新 `.env.example` 与 `README.md`
