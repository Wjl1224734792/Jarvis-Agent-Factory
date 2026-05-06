# AI 排版后端实现文档

**任务 ID：** TASK-007
**需求 ID：** REQ-004（beautify 局部美化）、REQ-005（structure 全文结构化）
**实现日期：** 2026-05-06
**测试策略：** TDD（Red -> Green）

---

## 1. 当前实现目标

在已有 `ai.service.ts`（含 `generateSummary`）基础上追加 `formatContent` 方法，支持 beautify 和 structure 两种排版模式，并在 `ai.route.ts` 追加 `POST /api/v1/ai/format` 路由。

## 2. 输入依据

| 文档 | 路径 |
|------|------|
| 需求文档 | `docs/requirements/2026-05-06-ai-features-requirements.md`（2.4 AI 排版接口规格、REQ-004、REQ-005） |
| 计划文档 | `docs/plans/2026-05-06-ai-features-plan.md`（TASK-007 Execution Packet） |
| 前置产出 | TASK-006 的 `ai.service.ts` 和 `ai.route.ts` |

## 3. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/server/tests/ai-format.test.ts` | 新建 | TDD Red 阶段测试，覆盖 6 种路径 |
| `apps/server/src/modules/ai/ai.service.ts` | 追加 | 新增 `formatContent` 导出函数 + `callLlmForFormat` 内部函数 + 2 个 prompt 模板 + 1 个常量 |
| `apps/server/src/modules/ai/ai.route.ts` | 追加 | 新增 `POST /api/v1/ai/format` 路由 handler |

**未变更的文件：** `generateSummary` 逻辑未修改、`ai-settings.*` 未修改、`packages/` 未修改。

## 4. 实现说明

### 4.1 ai.service.ts 追加内容

**新增常量：**
- `FORMAT_CONTENT_MAX_LENGTH = 8000` -- 排版内容最大字符数

**新增 prompt 模板：**
- `BEAUTIFY_PROMPT_TEMPLATE` -- 要求 LLM 优化 HTML 排版（标点、空格、段落、列表），返回 JSON `{html, changes}`
- `STRUCTURE_PROMPT_TEMPLATE` -- 要求 LLM 重新组织文章结构（h2/h3 标题层级、段落、列表），返回 JSON `{html, changes}`

**新增导出函数 `formatContent(content, mode)`：**
1. 空内容校验（400）
2. 长度校验：超过 8000 字符返回 400
3. 功能开关检查：`settings.features.format` 为 false 时返回 403
4. 调用 `callLlmForFormat` 执行 LLM API 调用

**新增内部函数 `callLlmForFormat(settings, content, mode)`：**
- 复用 `callLlm` 的 fetch 模式，但使用 `settings.formatModel`（非 summaryModel）
- prompt 中要求 LLM 返回 JSON 格式 `{html: string, changes: string[]}`
- 解析 JSON 响应，容错处理 `changes` 缺失
- 超时 30s，API 失败返回 502

### 4.2 ai.route.ts 追加内容

- 导入 `aiFormatRequestSchema`（Zod schema，已在 TASK-001 创建）
- 导入 `formatContent`（新增导出）
- 新增 `POST API_ROUTES.ai.format` 路由：
  - 中间件：`requireAuth`
  - 输入校验：`aiFormatRequestSchema.parse()`
  - 错误处理：400 / 403 / 502 三种错误码映射

### 4.3 设计决策

| 决策 | 理由 |
|------|------|
| 新建 `callLlmForFormat` 而非复用 `callLlm` | `callLlm` 签名绑定 `summaryModel`，且返回 `string`；排版需要 `formatModel` 且返回 JSON 对象。修改 `callLlm` 会违反精准修改原则 |
| prompt 要求返回 JSON | 排版结果需要 `html` + `changes` 两个字段，纯文本无法结构化传递 |
| `max_tokens: 4096` | 排版输出可能包含完整 HTML，比摘要（512）需要更多 token |
| 双重长度校验（route 层 Zod + service 层） | Zod schema 已在 TASK-001 定义 `max(8000)`，service 层做防御性二次校验 |

## 5. 测试和验证结果

### TDD Red 阶段

6 个测试全部失败，失败原因：`formatContent is not a function`（预期行为 -- 功能尚未实现）。

### TDD Green 阶段

```
Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  1.83s
```

### 回归测试

```
ai-summary.test.ts: 24 passed (24)
ai-format.test.ts:   6 passed (6)
Total:              30 passed (30)
```

### 测试覆盖路径

| # | 测试用例 | 验证内容 |
|---|---------|---------|
| 1 | beautify 模式正常 | 输入 HTML -> 返回优化 HTML + changes 数组 |
| 2 | structure 模式正常 | 输入内容 -> 返回结构化 HTML + changes 数组 |
| 3 | 输入超过 8000 字符 | 抛出 400 错误，不调用 API |
| 4 | 功能开关关闭 | features.format=false 时抛出 403 错误 |
| 5 | AI API 失败 | API 返回非 200 时抛出 LLM_API_ERROR 502 |
| 6 | 空内容 | 输入空字符串时抛出 400 错误 |

### Typecheck

源文件（`ai.service.ts`、`ai.route.ts`）零类型错误。测试文件的 `preconnect` 类型问题是预存问题（`ai-summary.test.ts` 同样存在），非本次引入。

## 6. 数据与接口边界

### 请求

```
POST /api/v1/ai/format
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "string (原始 HTML，最大 8000 字符)",
  "mode": "beautify | structure"
}
```

### 响应

```json
{
  "html": "string (格式化后的 HTML)",
  "changes": ["优化了 3 处段落分割", "添加了 2 个标题层级"]
}
```

### 错误码

| HTTP | code | 触发条件 |
|------|------|---------|
| 400 | INVALID_INPUT | 内容为空或超过 8000 字符 |
| 403 | FEATURE_DISABLED | features.format 为 false |
| 502 | LLM_API_ERROR | LLM API 调用失败或超时 |

### 约束

- 输入最大 8000 字符（Zod schema + service 双重校验）
- LLM API 超时 30s
- 使用 `settings.formatModel`（非 summaryModel）
- 需要登录（requireAuth 中间件）

## 7. 风险 / 未解决项

| 风险 | 等级 | 说明 |
|------|------|------|
| LLM 返回非 JSON | 中 | prompt 要求返回 JSON，但 LLM 可能返回 markdown 代码块包裹的 JSON 或纯文本。当前实现用 `JSON.parse` 直接解析，失败会被 `callLlmForFormat` 的 catch 捕获并转为 502。后续可增加 JSON 提取逻辑（如正则提取 ```json...``` 块） |
| changes 字段不可靠 | 低 | changes 是 LLM 自由生成的描述文本，格式和内容不保证一致。已做容错：非数组时返回空数组 |
| 无缓存 | 低 | 排版结果不做缓存（与摘要不同），因为相同内容排版结果可能因 prompt 调整而变化。如需缓存可后续迭代 |

## 8. 需要前端配合的点

| 配合项 | 说明 |
|--------|------|
| API 调用 | 前端需调用 `POST /api/v1/ai/format`，请求体 `{content, mode}` |
| beautify 模式 | 获取编辑器选中 HTML -> 调用 API -> 替换选中区域 |
| structure 模式 | 获取全部 HTML -> 确认对话框 -> 调用 API -> 替换全部内容 |
| 功能开关 | 后端返回 403 时，前端隐藏排版按钮 |
| 错误处理 | 400/502 时保留原文，弹出错误 toast |

## 9. 推荐的下一步

1. **TEST-007**（TDD Refactor 验证）：补充边界测试（纯文本输入、复杂嵌套 HTML、LLM 返回 markdown 包裹的 JSON）
2. **TASK-009**（前端 AI 排版集成）：在编辑器工具栏集成排版下拉按钮
3. 考虑增加 LLM 响应的 JSON 提取容错（处理 markdown 代码块包裹的情况）
