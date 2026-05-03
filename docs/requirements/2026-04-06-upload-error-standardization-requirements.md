# 上传错误响应标准化需求

## 需求摘要

继续标准化上传接口错误响应结构，重点覆盖上传初始化接口的超限错误，让前端可以稳定消费结构化字段，而不是依赖纯字符串文案。

## 目标与成功标准

- 上传初始化接口在文件超限时返回统一结构。
- 返回内容中明确包含当前允许上限，至少覆盖：
  - `bytes`
  - `mb`
  - `bizType`
  - `mediaKind`
- 前端页面不再依赖后端原始敏感文案或验证码值。
- 相关测试、README、环境变量说明同步更新。
- `bun run check` 通过。

## 范围内

- `apps/server` 上传初始化错误响应结构调整
- `packages/http-client` / 前端错误消费适配
- `apps/web`、`apps/admin` 对上传错误的显示适配
- 上传策略测试、前端相关测试、文档同步

## 范围外

- 重构整个全站错误模型
- 改动非上传场景的业务响应格式
- 新增独立错误中间件

## 关键模块

- `apps/server/src/modules/uploads/*`
- `apps/server/src/modules/posts/storage-provider.ts`
- `packages/http-client/src/index.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/admin/src/lib/api-client.ts`

## 风险与开放问题

- 现有前端已有一层错误脱敏，结构化字段加入后要避免破坏现有通用提示逻辑。
- 上传错误结构调整后，测试断言需要同步更新。
- 需要保持与当前 `.env.example` 中上传限制说明一致。

## 已收敛结论

- 本轮只继续标准化上传错误结构，不扩展到全局错误协议重构。
- 前一轮已完成敏感信息页面直出修复，本轮只做必要的结构化跟进。
