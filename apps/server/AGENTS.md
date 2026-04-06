# @feijia/server AGENTS

## 入口与结构

- 入口：`src/index.ts`
- 应用实例：`src/app.ts`
- 路由注册统一在 `src/app.ts`
- 模块优先按 `route / service / repo` 分层

## 修改要求

- 路由常量对齐 `@feijia/shared.API_ROUTES`
- 请求与响应结构对齐 `@feijia/schemas`
- 改认证、上传、会话、OpenAPI 时，检查 `.env.example` 与 README 是否需要同步

## OpenAPI

- 路径：`/docs`、`/openapi.json`
- 由 `OPENAPI_ENABLED` 控制
- 未配置时生产默认关闭

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
- 改上传限制时，同步更新 `.env.example` 与 README
