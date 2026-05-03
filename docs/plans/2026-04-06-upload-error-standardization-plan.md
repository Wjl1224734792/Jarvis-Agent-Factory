# 上传错误响应标准化执行计划

## 当前轮次目标

把上传初始化错误从“字符串提示”升级为“结构化响应 + 统一 client 消费”。

## Execution Packet

### task_id
TASK-001 / TASK-002 / TASK-003

### objective
统一上传错误结构，并让前端可稳定消费。

### in_scope
- 标准化上传初始化错误响应
- 为超限场景返回 `details.limit`
- 共享 client 生成统一用户提示
- 更新协议、测试、最小文档留痕

### out_of_scope
- 全站错误协议重构
- 非上传接口响应结构统一

### allowed_paths
- `apps/server/src/modules/uploads/*`
- `apps/server/tests/*`
- `packages/schemas/src/*`
- `packages/schemas/tests/*`
- `packages/http-client/src/*`
- `packages/http-client/tests/*`
- `apps/web/src/lib/api-client.ts`
- `docs/*`

### forbidden_paths
- 非上传业务模块
- 数据库 schema 结构调整

### test_strategy
test_after

### acceptance_criteria
- 上传初始化错误返回统一 `details`
- 超限错误包含 `bytes / mb / bizType / mediaKind`
- 共享 client 能把结构化上传错误映射成安全提示
- `bun run check` 通过
