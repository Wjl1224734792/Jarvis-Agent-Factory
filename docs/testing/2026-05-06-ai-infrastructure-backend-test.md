# AI 基础设施后端验证测试报告

**日期:** 2026-05-06
**task_id:** TEST-001
**requirement_ids:** REQ-003, REQ-004, REQ-005, REQ-007
**test_strategy:** test_after

---

## 1. 测试目标

验证 TASK-001（DB Schema + 路由常量 + Zod Schema）和 TASK-002（OpenAPI 文档）的变更正确且不破坏现有功能。

## 2. 对应需求 / 任务 ID

| 需求 ID | 描述 |
|---------|------|
| REQ-003 | AI 摘要功能 |
| REQ-004 | AI 排版功能 |
| REQ-005 | AI 管理后台配置 |
| REQ-007 | AI 基础设施（Schema、路由、OpenAPI） |

## 3. 测试文件清单

| 文件 | 路径 |
|------|------|
| ai-infrastructure.test.ts | `apps/server/tests/ai-infrastructure.test.ts` |

## 4. 测试覆盖范围

| 类型 | 覆盖 | 说明 |
|------|------|------|
| 单元测试 | Zod Schema 验证 | 6 个 AI 相关 Schema 的合法/非法输入验证 |
| 单元测试 | 路由常量断言 | API_ROUTES.ai.* 和 APP_ROUTES.adminAiSettings |
| 单元测试 | DB Schema 字段定义 | postsTable 新增的 3 个 AI 字段 |
| 集成测试 | OpenAPI 文档 | 通过 HTTP 请求验证 OpenAPI JSON 包含 AI 路径 |

## 5. 测试用例清单

### 5.1 路由常量验证（4 个用例）

| 用例 | 预期 |
|------|------|
| API_ROUTES.ai.summary 值为 /api/v1/ai/summary | 与 withApiV1Prefix('/ai/summary') 一致 |
| API_ROUTES.ai.format 值为 /api/v1/ai/format | 与 withApiV1Prefix('/ai/format') 一致 |
| API_ROUTES.ai.adminSettings 值为 /api/v1/admin/ai/settings | 与 withApiV1Prefix('/admin/ai/settings') 一致 |
| APP_ROUTES.adminAiSettings 值为 /admin/settings/ai | 精确匹配 |

### 5.2 DB Schema 字段验证（4 个用例）

| 用例 | 预期 |
|------|------|
| postsTable 包含 aiSummary 字段 | name === 'ai_summary' |
| postsTable 包含 aiSummaryGeneratedAt 字段 | name === 'ai_summary_generated_at' |
| postsTable 包含 aiFormattedAt 字段 | name === 'ai_formatted_at' |
| 三个字段均为可空类型 | notNull === false |

### 5.3 aiSummaryRequestSchema 验证（4 个用例）

| 用例 | 输入 | 预期 |
|------|------|------|
| 合法输入：仅 postId | { postId: 'post-123' } | success === true |
| 合法输入：postId + content | { postId: 'post-abc', content: '...' } | success === true |
| 非法输入：缺少 postId | {} | success === false |
| 非法输入：postId 为空字符串 | { postId: '' } | success === false |

### 5.4 aiSummaryResponseSchema 验证（4 个用例）

| 用例 | 输入 | 预期 |
|------|------|------|
| 合法响应体 | { summary: '...', cached: false } | success === true |
| cached 为 true | { summary: '...', cached: true } | success === true |
| 缺少 summary | { cached: false } | success === false |
| cached 非布尔值 | { summary: 'test', cached: 'yes' } | success === false |

### 5.5 aiFormatRequestSchema 验证（8 个用例）

| 用例 | 输入 | 预期 |
|------|------|------|
| beautify 模式 | { content: '<p>test</p>', mode: 'beautify' } | success === true |
| structure 模式 | { content: '<p>test</p>', mode: 'structure' } | success === true |
| mode 不在枚举范围 | { content: '...', mode: 'invalid' } | success === false |
| content 为空字符串 | { content: '', mode: 'beautify' } | success === false |
| content 超过 8000 字符 | { content: 'a'.repeat(8001), ... } | success === false |
| content 恰好 8000 字符 | { content: 'a'.repeat(8000), ... } | success === true |
| 缺少 content | { mode: 'beautify' } | success === false |
| 缺少 mode | { content: '<p>t</p>' } | success === false |

### 5.6 aiFormatResponseSchema 验证（4 个用例）

| 用例 | 输入 | 预期 |
|------|------|------|
| 合法响应体 | { html: '...', changes: ['...'] } | success === true |
| 空变更列表 | { html: '...', changes: [] } | success === true |
| changes 不是数组 | { html: '...', changes: 'not-array' } | success === false |
| changes 数组元素非字符串 | { html: '...', changes: [123] } | success === false |

### 5.7 aiSettingsSchema 验证（6 个用例）

| 用例 | 输入 | 预期 |
|------|------|------|
| 合法配置 | 完整 validSettings 对象 | success === true |
| baseUrl 非合法 URL | baseUrl: 'not-a-url' | success === false |
| provider 为空 | provider: '' | success === false |
| apiKey 为空 | apiKey: '' | success === false |
| 缺少 features | 移除 features 字段 | success === false |
| features.summary 非布尔值 | features: { summary: 'yes', format: true } | success === false |

### 5.8 aiSettingsResponseSchema 验证（2 个用例）

| 用例 | 输入 | 预期 |
|------|------|------|
| 合法响应体（apiKey 已脱敏） | apiKey: 'sk-****' | success === true |
| features 缺少 format | features: { summary: true } | success === false |

### 5.9 OpenAPI 文档 AI 路径验证（7 个用例）

| 用例 | 预期 |
|------|------|
| 包含 /api/v1/ai/summary、/api/v1/ai/format、/api/v1/admin/ai/settings | 路径已定义 |
| /api/v1/ai/summary 定义 POST 方法 | tags 含 AI，summary 含 "摘要" |
| /api/v1/ai/format 定义 POST 方法 | tags 含 AI，summary 含 "排版" |
| /api/v1/admin/ai/settings 定义 GET 和 PUT 方法 | 均含 AI 标签 |
| /api/v1/ai/summary 包含 403 和 502 错误响应 | 错误响应已定义 |
| /api/v1/ai/format 包含 403 和 502 错误响应 | 错误响应已定义 |
| /api/v1/admin/ai/settings 包含 403 错误响应 | GET 和 PUT 均有 403 |

## 6. 运行结果

### ai-infrastructure.test.ts

```
Test Files  1 passed (1)
     Tests  43 passed (43)
  Start at  15:11:47
  Duration  3.84s (transform 1.39s, import 3.49s, tests 165ms, environment 0s)
```

### 回归验证

| 测试文件 | 结果 | 说明 |
|---------|------|------|
| openapi.test.ts | 2 passed | OpenAPI 文档测试不受影响 |
| health.test.ts | 1 passed | 健康检查测试不受影响 |
| site-settings.test.ts | 1 passed | 站点设置测试不受影响 |
| posts.test.ts | 13 failed (pre-existing) | 需数据库/Redis 基础设施，非本次变更引起 |
| provider-config.test.ts | 2 failed (pre-existing) | Kodo 存储适配引起的已有问题 |

## 7. Mock / Fixture 说明

本次测试不需要 mock 或 fixture。所有测试均为纯单元测试和静态验证：
- 路由常量测试直接 import 模块进行值断言
- DB Schema 测试直接检查 Drizzle 列定义
- Zod Schema 测试使用 safeParse 进行输入验证
- OpenAPI 测试通过 app.request() 获取 JSON 文档进行路径验证

## 8. 未覆盖项

| 项目 | 原因 |
|------|------|
| DB Schema 实际读写（INSERT/SELECT） | 需要真实数据库连接，属于集成测试范畴，当前环境不支持 |
| AI 路由实际 handler 逻辑 | 由 TASK-003+ 负责，非本次测试范围 |
| Redis 缓存交互 | 需要 Redis 基础设施，属于集成测试范畴 |
| 认证/授权中间件对 AI 路径的保护 | 需要完整鉴权流程，属于 E2E 测试范畴 |

## 9. 推荐的下一步

1. **TASK-003 AI Service 实现后** — 补充单元测试验证 AI 服务逻辑（摘要生成、排版、配置 CRUD）
2. **数据库集成测试** — 在有测试数据库的环境下补充 postsTable AI 字段的 INSERT/SELECT 读写验证
3. **端到端测试** — 验证完整请求链路（认证 -> AI 路由 -> 服务层 -> 数据库）
