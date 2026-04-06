# 上传错误响应标准化实现记录

## 实现内容

- 在 `packages/schemas/src/files.ts` 新增上传错误响应 schema
- 在上传初始化接口中统一返回 `details.reason`
- 在超限场景中返回 `details.limit`
- 在 `packages/http-client` 中识别结构化上传错误并生成统一提示
- 在 `apps/web` 中保留这类安全的上传提示文案

## 关键变更

- `upload.route.ts`：统一错误结构
- `files.ts`：新增 schema
- `packages/http-client/src/index.ts`：统一错误解析
- `apps/web/src/lib/api-client.ts`：保留上传上限类提示

## 验证

- `bun run check`
