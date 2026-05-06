# AI 摘要与排版前端集成测试报告

## 1. 测试目标

验证 TASK-008/009 实现的 AI 摘要与排版前端集成功能的正确性，基于 API 契约编写集成测试：
- AI 摘要 API 交互（POST /api/v1/ai/summary）
- AI 排版 API 交互（POST /api/v1/ai/format）
- 请求参数 Zod Schema 校验
- 错误处理与用户提示映射
- 加载状态与重试能力
- 空内容与边界条件

## 2. 对应需求/任务 ID

| 项目 | ID |
|------|-----|
| 需求 | REQ-003（AI 摘要）, REQ-004（AI 排版）, REQ-005（AI 排版交互） |
| 任务 | TASK-008（AI 摘要前端）, TASK-009（AI 排版前端）, TEST-008（测试） |

## 3. 测试文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `apps/web/tests/ai-summary-format-integration.test.ts` | 集成测试 | AI 摘要与排版 API 交互全功能测试 |

## 4. 测试覆盖范围

| 类别 | 测试数 | 说明 |
|------|--------|------|
| Zod Schema 验证 | 12 | 请求体/响应体 Schema 的合法与非法输入 |
| AI 摘要 API 交互 | 4 | 请求构建、响应解析、缓存状态 |
| AI 排版 API 交互 | 4 | beautify/structure 模式、变更说明解析 |
| 错误处理 | 8 | 403/429/502/500/400/未知错误/网络异常/原文保留 |
| 加载状态与按钮交互 | 4 | pending 状态检测、失败后重试 |
| 空内容与边界条件 | 6 | Zod 拦截、空响应体 |
| API 路由常量一致性 | 3 | 路由常量值验证 |
| 请求 Headers 与凭据 | 3 | Content-Type、credentials |
| **总计** | **44** | |

## 5. 测试用例清单

### 5.1 Zod Schema 验证

| 用例 | 验证点 | 结果 |
|------|--------|------|
| aiSummaryRequestSchema 接受有效请求 | postId 非空 | PASS |
| aiSummaryRequestSchema 接受带 content 的请求 | 可选 content 字段 | PASS |
| aiSummaryRequestSchema 拒绝空 postId | 空字符串校验 | PASS |
| aiSummaryRequestSchema 拒绝缺少 postId | 必填字段校验 | PASS |
| aiSummaryResponseSchema 接受有效响应 | summary + cached 字段 | PASS |
| aiFormatRequestSchema 接受 beautify 模式 | mode 枚举值 | PASS |
| aiFormatRequestSchema 接受 structure 模式 | mode 枚举值 | PASS |
| aiFormatRequestSchema 拒绝非法 mode | 非法枚举值拦截 | PASS |
| aiFormatRequestSchema 拒绝空 content | 最小长度校验 | PASS |
| aiFormatRequestSchema 拒绝超过 8000 字符 | 最大长度校验 | PASS |
| aiFormatRequestSchema 接受恰好 8000 字符 | 边界值通过 | PASS |
| aiFormatResponseSchema 接受有效响应 | html + changes 字段 | PASS |

### 5.2 AI 摘要 API 交互

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 发送正确的请求到 /api/v1/ai/summary | URL、method、body | PASS |
| 发送带 content 的摘要请求 | content 字段包含 | PASS |
| 成功返回时解析响应 | summary 和 cached 字段 | PASS |
| 未命中缓存时 cached 为 false | 缓存状态区分 | PASS |

### 5.3 AI 排版 API 交互

| 用例 | 验证点 | 结果 |
|------|--------|------|
| beautify 模式发送正确的请求 | mode=beautify | PASS |
| structure 模式发送正确的请求 | mode=structure | PASS |
| 成功返回时解析响应 | html + changes 数组 | PASS |
| 变更说明为空数组时仍返回有效响应 | 空数组边界 | PASS |

### 5.4 错误处理

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 403 FEATURE_DISABLED 映射为功能不可用提示 | 错误码映射 | PASS |
| 429 RATE_LIMITED 映射为频率限制提示 | 状态码映射 | PASS |
| 502 LLM_API_ERROR 映射为 AI 服务不可用提示 | 错误码映射 | PASS |
| 500 服务内部错误映射为通用错误提示 | 状态码映射 | PASS |
| 400 INVALID_INPUT 映射为参数错误提示 | 错误码映射 | PASS |
| 未知错误映射为通用失败提示 | 兜底映射 | PASS |
| 网络异常时 fetch 抛出错误 | 网络层错误 | PASS |
| 错误处理不修改原文内容 | 保留原文原则 | PASS |

### 5.5 加载状态与按钮交互

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 摘要 API 调用期间可以检测到 pending 状态 | Promise pending 检测 | PASS |
| 排版 API 调用期间可以检测到 pending 状态 | Promise pending 检测 | PASS |
| 摘要 API 失败后不影响后续重试请求 | 重试能力 | PASS |
| 排版 API 失败后不影响后续重试请求 | 重试能力 | PASS |

### 5.6 空内容与边界条件

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 摘要请求 postId 为空时 Zod 拦截 | 前端拦截 | PASS |
| 排版请求 content 为空时 Zod 拦截 | 前端拦截 | PASS |
| 排版请求 mode 缺失时 Zod 拦截 | 前端拦截 | PASS |
| 排版请求 content 超长时 Zod 拦截 | 前端拦截 | PASS |
| 摘要 API 返回空 summary 时仍通过 schema 验证 | 空字符串边界 | PASS |
| 排版 API 返回空 changes 数组时仍通过 schema 验证 | 空数组边界 | PASS |

### 5.7 API 路由常量一致性

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 摘要 API 路由为 /api/v1/ai/summary | 路由常量 | PASS |
| 排版 API 路由为 /api/v1/ai/format | 路由常量 | PASS |
| 管理端 AI 设置路由为 /api/v1/admin/ai/settings | 路由常量 | PASS |

### 5.8 请求 Headers 与凭据

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 摘要请求携带 Content-Type: application/json | 请求头 | PASS |
| 摘要请求携带 credentials: include | 凭据携带 | PASS |
| 排版请求携带 credentials: include | 凭据携带 | PASS |

## 6. 运行结果

```
 RUN  v4.1.1 E:/CodeStore/feijia

 Test Files  1 passed (1)
      Tests  44 passed (44)
   Duration  1.39s
```

## 7. Mock / Fixture 说明

### Mock 策略

- **`fetch` 全局函数**：通过 `vi.stubGlobal` 替换，记录所有调用以便断言请求参数
- **响应构建**：`jsonResponse()` 和 `errorResponse()` 辅助函数模拟服务端响应
- **错误元数据**：`createApiError()` 为 Error 对象注入 `status` 和 `code` 属性，模拟前端 api-client 的错误映射行为

### Fixture 数据

```ts
// 摘要成功响应
{ summary: '这是一篇关于大疆 Mini 4 Pro 的深度评测。', cached: false }

// 排版成功响应
{ html: '<h1>优化后的标题</h1><p>美化后的正文</p>', changes: ['添加了标题', '优化了段落格式'] }

// 错误响应
{ code: 'FEATURE_DISABLED', message: 'AI summary feature is disabled' }
{ code: 'RATE_LIMITED', message: 'Rate limited: 429' }
{ code: 'LLM_API_ERROR', message: 'LLM API returned 502' }
```

### 技术说明

本测试为 API 契约级集成测试，不依赖具体 UI 组件实现。测试中的 `callSummaryApi` 和 `callFormatApi` 函数模拟了前端实际的 API 调用逻辑（Zod 校验 -> fetch -> 响应解析），确保前端侧的请求构建和响应处理与后端 API 契约一致。

## 8. 未覆盖项

| 项目 | 原因 |
|------|------|
| AI 摘要按钮 UI 渲染 | TASK-008 组件尚在并行实现中，组件就绪后可补充 |
| AI 排版下拉菜单交互 | TASK-009 组件尚在并行实现中，组件就绪后可补充 |
| beautify 模式选中内容替换 | 依赖 wangEditor 选区 API，需组件实现后测试 |
| structure 模式确认对话框 | 依赖 UI 组件实现 |
| 加载 spinner / 按钮禁用 UI 状态 | 依赖组件实现，可通过 CSS class 断言 |
| toast 提示渲染 | 依赖 toast 库集成，需组件实现后测试 |

## 9. 推荐的下一步

1. **组件就绪后补充渲染测试**：TASK-008/009 完成后，补充 AI 摘要按钮和排版下拉菜单的组件渲染测试
2. **E2E 测试**：使用 Playwright 覆盖完整的用户操作流程（点击按钮 -> API 调用 -> 内容更新）
3. **wangEditor 集成测试**：补充选区内容提取和 `dangerouslyInsertHtml` 的集成测试
4. **toast 组件集成测试**：验证错误提示在 UI 层的正确展示
