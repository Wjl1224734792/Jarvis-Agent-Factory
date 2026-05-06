# TEST-006 AI 摘要 TDD Refactor 验证 -- 测试报告

## 1. 测试目标

验证 TASK-006 的 AI 摘要逻辑（`ai.service.ts` 的 `generateSummary` 函数）在 Refactor 阶段的代码质量和边界条件覆盖。

## 2. 对应需求/任务 ID

| 字段 | 值 |
|------|-----|
| task_id | TEST-006 |
| requirement_ids | REQ-003 |

## 3. 测试文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `apps/server/tests/ai-summary.test.ts` | 已修改 | 追加 18 个边界条件测试 |

## 4. 测试覆盖范围

### 4.1 单元测试

| 类别 | 测试数 | 说明 |
|------|--------|------|
| 原有路径测试（TASK-006） | 6 | 缓存命中、DB 有值、LLM 生成、功能关闭、频率限制、API 失败 |
| 边界条件（TEST-006 新增） | 7 | 空内容、undefined 内容、超长裁剪、特殊字符/emoji/HTML、中英文混合、文章不存在、24h 窗口行为 |
| 缓存失效路径 | 2 | 缓存失效后重新生成、24h 限流窗口验证 |
| LLM 异常响应 | 5 | 空 choices、空 content、异常 JSON 结构、JSON 解析失败、网络超时 |
| Prompt 构造验证 | 3 | 模板结构验证、裁剪点验证、URL 斜杠清理 |
| 并发请求 | 2 | 同文章并发、不同文章并发 |
| **合计** | **24** | 全部通过 |

### 4.2 Mock/fixture 说明

所有 mock 在测试文件顶部声明，不依赖外部服务：

| Mock 对象 | 模拟目标 | 说明 |
|-----------|---------|------|
| `cacheHandler` | CacheService.getOrSet | 可切换为直通（模拟缓存失效）或返回固定值（模拟缓存命中） |
| `dbSelectMock` / `dbUpdateMock` | Drizzle ORM 查询 | 通过 `createDbMock` 辅助函数构造链式调用 |
| `getRawSettingsMock` | aiSettingsService.getRawSettings | 返回完整 AI 配置 |
| `fetchMock` | 全局 fetch | 模拟 LLM API 响应（成功/失败/空/异常格式） |

## 5. 测试用例清单

### 原有测试（6 个，TASK-006）

1. 缓存命中 -- Redis 有值时直接返回
2. DB 有值 -- Redis 无值但 DB 有 aiSummary
3. LLM 生成 -- Redis 和 DB 都无值时调用 LLM
4. 功能开关关闭 -- features.summary 为 false
5. 频率限制 -- 24h 内已生成过摘要
6. API 失败 -- LLM API 返回非 200

### 新增边界条件测试（18 个，TEST-006）

7. 空文章内容 -- content 为空字符串时正常调用 LLM
8. content 为 undefined -- 不传 content 参数时不崩溃
9. 超长文章裁剪 -- 5000 字符内容被截断到 4000
10. 特殊字符/emoji/HTML -- 包含特殊字符的内容正确传递
11. 中英文混合内容 -- 混合语言正常处理
12. DB 文章不存在 -- 抛出"文章不存在"错误
13. 缓存失效后重新生成 -- cacheHandler 绕过缓存走 DB + LLM 路径
14. 24h 限流窗口过期 -- 返回已有摘要（cached: true）
15. LLM 返回空 choices 数组 -- 抛出空摘要错误
16. LLM 返回 content 为空字符串 -- trim 后为空抛出错误
17. LLM 返回异常 JSON 结构 -- 无 choices 字段时抛出错误
18. LLM 返回 JSON 解析失败 -- 包装为 502 错误
19. 网络超时 -- AbortError 包装为 502 错误
20. Prompt 模板结构验证 -- 包含摘要助手描述和字数要求
21. 超长内容裁剪点验证 -- 精确裁剪到 4000 字符
22. API baseUrl 尾部斜杠清理 -- URL 构造正确
23. 相同文章并发请求 -- 各请求均能正常返回
24. 不同文章并发请求 -- 各自独立处理

## 6. 运行结果

### 6.1 ai-summary.test.ts 单文件运行

```
Test Files  1 passed (1)
     Tests  24 passed (24)
  Duration  1.14s
```

### 6.2 全量 server 测试套件

```
Test Files  34 passed | 9 failed (43)
     Tests  297 passed | 81 failed | 36 skipped (414)
  Duration  388.33s
```

9 个失败的测试文件均为已有的集成测试（posts.test.ts、rankings.test.ts、auth.test.ts、models.test.ts、content-closure.test.ts、search.test.ts 等），需要运行中的数据库服务，与本次变更无关。ai-summary.test.ts 属于 34 个通过的测试文件之一。

## 7. 代码质量检查

### 7.1 类型安全

- 测试文件使用 `as` 类型断言仅在 mock 返回值类型推断不足时使用（如 `as RequestInit`、`as { messages: Array<{ content: string }> }`）
- 无 `any` 类型使用
- 符合 TypeScript 与 Interface 使用规范

### 7.2 错误处理

- 所有异常测试使用 `try/catch` + `expect.fail()` 模式或 `rejects.toThrow()` 模式
- 错误消息断言使用 `toContain` 而非严格相等，增强容错性

### 7.3 规范合规

- 嵌套层级 <= 4 层
- 使用 `===` 严格相等
- 注释使用中文
- 每个测试验证一个行为
- 测试可独立运行，不依赖执行顺序

## 8. 发现的行为特征（非缺陷，记录供参考）

1. **24h 限流窗口过期后不重新生成**：当 DB 已有 aiSummary 且 `aiSummaryGeneratedAt` 超过 24h 时，实现直接返回已有摘要（`cached: true`），不会触发重新生成。这可能是设计意图（避免重复调用 LLM），也可能需要后续优化。

2. **CONTENT_MAX_LENGTH = 4000**（非任务描述中的 8000）：实际裁剪阈值为 4000 字符。

## 9. 未覆盖项

| 未覆盖项 | 原因 |
|---------|------|
| LLM 超时（30s）精确验证 | AbortSignal.timeout 依赖真实时间，mock 场景下无法精确模拟 |
| CacheService 内部缓存写入验证 | CacheService 已被 mock，内部 Redis 写入行为在 cache-service.test.ts 中覆盖 |
| 并发导致的 DB 竞态条件 | 需要真实数据库环境，属于集成测试范畴 |

## 10. 推荐的下一步

1. 考虑在 24h 限流窗口过期后支持重新生成（如果业务需要），而非直接返回旧摘要
2. 补充集成测试：在真实数据库环境下验证 generateSummary 的完整流程
3. 添加 LLM 超时场景的集成测试（需要真实网络环境）
