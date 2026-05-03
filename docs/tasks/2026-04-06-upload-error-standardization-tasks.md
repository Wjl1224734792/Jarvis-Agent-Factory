# 上传错误响应标准化任务清单

## TASK-001

- task_name：标准化上传初始化错误响应结构
- type：后端
- priority：P0
- acceptance_criteria：
  - 上传初始化接口在 `invalid_mime`、`invalid_size`、`file_too_large` 三种场景返回统一 `details` 结构
  - 超限场景返回结构化 `limit` 信息
- test_strategy：test_after
- 文件所有权：
  - `apps/server/src/modules/uploads/*`
  - `packages/schemas/src/files.ts`

## TASK-002

- task_name：共享 client 消费结构化上传错误
- type：共享
- priority：P0
- acceptance_criteria：
  - `packages/http-client` 能识别上传错误结构并生成统一用户文案
  - `apps/web` 保留这类安全文案，不再被通用脱敏规则吞掉
- test_strategy：test_after
- 文件所有权：
  - `packages/http-client/*`
  - `apps/web/src/lib/api-client.ts`

## TASK-003

- task_name：补齐协议与测试
- type：测试
- priority：P0
- acceptance_criteria：
  - schema 测试覆盖新的上传错误结构
  - http-client 测试覆盖结构化超限报错
  - 服务端现有上传相关测试通过
- test_strategy：test_after
- 文件所有权：
  - `packages/schemas/tests/*`
  - `packages/http-client/tests/*`
  - `apps/server/tests/*`
