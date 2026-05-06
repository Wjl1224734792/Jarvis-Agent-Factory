# AI 摘要后端实现文档

## 1. 当前实现目标

实现 AI 文章摘要生成的完整后端逻辑：三层缓存路径（Redis -> DB -> LLM API）+ LLM API 调用 + 频率限制。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**: REQ-003
- **任务 ID**: TASK-006
- **计划文档**: `docs/plans/2026-05-06-ai-features-plan.md`
- **需求文档**: `docs/requirements/2026-05-06-ai-features-requirements.md`

## 3. 输入依据

| 依据 | 文件 |
|------|------|
| Schema 定义 | `packages/schemas/src/ai.ts` — `aiSummaryRequestSchema` / `aiSummaryResponseSchema` |
| 缓存服务 | `apps/server/src/lib/cache-service.ts` — `CacheService.getOrSet` |
| AI 配置 | `apps/server/src/modules/ai/ai-settings.service.ts` — `getRawSettings()` |
| DB Schema | `packages/db/src/schema.ts` — `postsTable.aiSummary` / `aiSummaryGeneratedAt` |
| API 路由常量 | `packages/shared/src/index.ts` — `API_ROUTES.ai.summary` |

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/server/tests/ai-summary.test.ts` | 新建 | TDD 测试文件，覆盖 6 种路径 |
| `apps/server/src/modules/ai/ai.service.ts` | 新建 | 核心 LLM 调用 + 三层缓存逻辑 |
| `apps/server/src/modules/ai/ai.route.ts` | 追加 | 新增 `POST /api/v1/ai/summary` 路由 |

## 5. 实现说明

### 5.1 `ai.service.ts` — 核心服务

`generateSummary(postId, content?)` 方法实现三层缓存策略：

1. **功能开关检查**: 调用 `aiSettingsService.getRawSettings()` 获取配置，`features.summary` 为 false 时抛出 403 错误
2. **Layer 1 — Redis 缓存**: 通过 `CacheService.getOrSet("ai:summary:<postId>", 86400, fetchFn)` 实现。Redis 有值时直接返回 `{ summary, cached: true }`
3. **Layer 2 — DB 查询**: 在 `fetchFn` 内查询 `postsTable`，有 `aiSummary` 且 `aiSummaryGeneratedAt` 超过 24h 时返回缓存值；在 24h 内时抛出 429 频率限制
4. **Layer 3 — LLM API 调用**: Redis 和 DB 都无值时，裁剪内容至 4000 字符，调用 OpenAI 兼容 API（`POST {baseUrl}/chat/completions`），结果写入 DB + Redis

**LLM 调用参数**:
- model: `settings.summaryModel || "qwen-plus"`
- max_tokens: 512
- temperature: 0.3
- 超时: 30s（`AbortSignal.timeout`）
- Prompt: 150-300 字中文摘要，概括核心观点，保持客观中立

**错误编码约定**:
- Error message 含 "403" → 功能关闭
- Error message 含 "429" → 频率限制
- Error message 含 "LLM_API_ERROR" → API 调用失败

### 5.2 `ai.route.ts` — 路由层

追加 `POST /api/v1/ai/summary` 路由：
- 中间件: `attachCurrentUser` + `requireAuth`
- 输入校验: `aiSummaryRequestSchema`（Zod）
- 输出格式: `{ summary: string, cached: boolean }`
- 错误映射: service 层 Error message -> HTTP 状态码（403/429/502）

### 5.3 TDD 测试覆盖

| 测试路径 | 断言 |
|---------|------|
| 缓存命中（Redis 有值） | 返回 cached 值，不调用 DB 和 LLM |
| DB 有值（Redis 无值） | 返回 DB 缓存值，cached: true |
| LLM 生成（均无值） | 调用 fetch，写入 DB，返回 cached: false |
| 功能开关关闭 | 抛出含 "403" 的错误 |
| 频率限制（24h 内） | 抛出含 "429" 的错误 |
| API 失败（非 200） | 抛出含 "LLM_API_ERROR" 的错误 |

## 6. 测试和验证结果

```
apps/server/tests/ai-summary.test.ts (6 tests | 6 passed)
  PASS 缓存命中 — Redis 有值时直接返回，不调用 DB 和 LLM
  PASS DB 有值 — Redis 无值但 DB 有 aiSummary 时，返回 DB 值（cached: true）
  PASS LLM 生成 — Redis 和 DB 都无值时，调用 LLM API 并写入 DB
  PASS 功能开关关闭 — features.summary 为 false 时抛出 403 错误
  PASS 频率限制 — aiSummaryGeneratedAt 在 24h 内时抛出 429 错误
  PASS API 失败 — LLM API 返回非 200 时抛出 502 错误

tsc --noEmit: 0 errors
```

## 7. 数据与接口边界

### 请求

```
POST /api/v1/ai/summary
Authorization: Bearer <token>
Content-Type: application/json

{
  "postId": "string (required, min 1)",
  "content": "string (optional)"
}
```

### 成功响应 (200)

```json
{
  "summary": "AI 生成的摘要文本（150-300 字）",
  "cached": false
}
```

### 错误响应

| HTTP | code | 场景 |
|------|------|------|
| 401 | UNAUTHORIZED | 未登录 |
| 403 | FEATURE_DISABLED | AI 摘要功能关闭 |
| 429 | RATE_LIMITED | 同一文章 24h 内重复请求 |
| 502 | LLM_API_ERROR | LLM API 调用失败 |

## 8. 风险 / 未解决项

| 风险 | 说明 | 缓解 |
|------|------|------|
| LLM 响应质量 | 摘要长度 150-300 字依赖 prompt 约束，LLM 可能不严格遵守 | 后续可加长度校验 |
| 时钟偏差 | `Date.now()` 用于频率限制，服务器时钟偏差可能影响精度 | 当前可接受 |
| 并发写入 | 同一文章并发请求可能多次调用 LLM | CacheService 无分布式锁，后续可加 |
| DB 查询在 CacheService 回调内 | CacheService 的 fetchFn 内执行 DB 查询，Redis 不可用时仍有 DB 保护 | 已有降级机制 |

## 9. 需要前端配合的点

- 前端需在文章详情页调用 `POST /api/v1/ai/summary`，传入 `postId` 和可选的 `content`
- 处理 403（提示功能未开启）、429（提示稍后再试）、502（提示服务暂时不可用）错误
- `cached: true` 时可标记为"来自缓存"，`cached: false` 时标记为"新生成"

## 10. 推荐的下一步

1. **TASK-007**: AI 排版后端实现（POST /api/v1/ai/format），复用 `ai.service.ts` 中的 `callLlm` 模式
2. **前端集成**: 对接 AI 摘要 API 到文章详情页
3. **监控**: 添加 LLM 调用耗时和成功率指标
4. **长度校验**: 验证 LLM 输出是否符合 150-300 字要求，不符合时重试或降级
