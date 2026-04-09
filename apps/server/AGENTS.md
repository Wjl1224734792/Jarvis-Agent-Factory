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
