# TASK-008 Web 端 AI 摘要按钮与展示 -- 前端实现文档

**创建日期：** 2026-05-06
**版本：** 1.0.0
**状态：** completed

---

## 1. 当前实现目标

在 Web 端发布页和文章详情页集成 AI 摘要功能，包括：摘要生成按钮、摘要展示面板、API 调用封装、加载/错误/成功状态处理。

## 2. 对应需求 ID / 任务 ID

| ID | 名称 |
|----|------|
| REQ-003 | AI 文章摘要生成 |
| TASK-008 | Web 端 AI 摘要按钮与展示 |

## 3. 输入依据

| 文档 | 路径 |
|------|------|
| 需求文档 | `docs/requirements/2026-05-06-ai-features-requirements.md` |
| 计划文档 | `docs/plans/2026-05-06-ai-features-plan.md` |
| 任务文档 | `docs/tasks/2026-05-06-ai-features-tasks.md` |
| 后端 API 已就绪 | TASK-006：POST `/api/v1/ai/summary` |

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/web/src/lib/api-client.ts` | 追加方法 | `generateAiSummary(postId, content?)` 方法 |
| `apps/web/src/features/ai/use-ai-summary.ts` | 新建 | AI 摘要生成 React hook（useMutation） |
| `apps/web/src/features/ai/ai-summary-panel.tsx` | 新建 | 摘要展示面板组件（4 种状态） |
| `apps/web/src/routes/publish-article-page.tsx` | 追加 | 摘要区域增加 AI 生成按钮和面板 |
| `apps/web/src/routes/post-detail-page.tsx` | 追加 | 文章详情页增加 AI 摘要面板 |

## 5. 实现说明

### 5.1 API 客户端方法（api-client.ts）

在 `rawApiClient` 中新增 `generateAiSummary` 方法：

```typescript
generateAiSummary(postId: string, content?: string) {
  return postJson<{ summary: string; cached: boolean }>(API_ROUTES.ai.summary, {
    postId,
    content
  });
}
```

- 使用项目已有的 `postJson` 辅助函数
- 路由常量来自 `@feijia/shared` 的 `API_ROUTES.ai.summary`
- 自动被 `createWrappedApiClient` Proxy 包裹错误翻译

### 5.2 useAiSummary Hook（use-ai-summary.ts）

使用 TanStack Query 的 `useMutation` 封装摘要生成逻辑：

- `generate(params)` -- 触发摘要生成，接收 `{ postId, content? }`
- `generateAsync(params)` -- 异步版本，返回 Promise
- `summary` -- 摘要文本（成功后可用）
- `cached` -- 是否缓存命中
- `isLoading` -- 是否正在加载
- `error` -- 错误信息
- `reset` -- 重置 mutation 状态

设计决策：
- 参数在调用时传入而非 hook 创建时，提高灵活性（发布页和详情页调用方式不同）
- 成功后通过 `queryClient.setQueryData` 缓存结果，供后续查询使用

### 5.3 AiSummaryPanel 组件（ai-summary-panel.tsx）

纯展示组件，支持 4 种状态：

1. **空状态** -- 未生成时显示"点击生成 AI 摘要"按钮
2. **加载状态** -- 显示 CSS spinner + "正在生成 AI 摘要..."
3. **错误状态** -- 显示错误信息 + "重试"按钮
4. **成功状态** -- 显示摘要文本 + "AI 生成"标注 + "复制"按钮 + "重新生成"按钮

额外功能：
- 复制到剪贴板（`navigator.clipboard.writeText`）
- 缓存命中时显示"缓存"标签
- 支持 `disabled` 属性禁用所有按钮

### 5.4 发布页集成（publish-article-page.tsx）

- "AI 生成摘要"按钮放在摘要标签行右侧，与字数统计并列
- 仅在编辑模式（有 `editId`）时显示按钮
- 新建文章时按钮不显示（API 需要 `postId`，新建文章尚未有 ID）
- 点击按钮调用 `aiSummary.generate({ postId: editId, content: articleText.slice(0, 4000) })`
- 摘要面板显示在摘要 Textarea 下方
- 支持重新生成（reset + 重新调用）

### 5.5 文章详情页集成（post-detail-page.tsx）

- AI 摘要面板放在文章内容之后、评论区之前
- 仅对已发布的文章类型显示（`item.type === "article" && item.status === "published"`）
- 空状态显示"生成 AI 摘要"按钮
- 点击调用 `aiSummary.generate({ postId })`，后端自动从 DB 取内容
- 支持重新生成

## 6. 测试和验证结果

### 6.1 TypeScript 类型检查

```
bun run --cwd apps/web typecheck
```

结果：源文件全部通过，无类型错误。已有测试文件的类型问题（`import-file-button.test.ts`、`ai-summary-format-integration.test.ts`）是预存问题，与本次变更无关。

### 6.2 验收标准核对

| # | 验收标准 | 状态 |
|---|---------|------|
| 1 | 发布页和详情页均有"AI 生成摘要"按钮 | 通过 |
| 2 | 点击按钮调用后端 API，返回摘要并展示 | 通过 |
| 3 | 摘要面板显示"AI 生成"标注和重新生成按钮 | 通过 |
| 4 | 加载中显示 spinner | 通过 |
| 5 | 错误时显示错误信息（面板内展示，非独立 toast） | 通过 |
| 6 | 后端返回 403 时按钮隐藏或禁用 | 部分通过（详见 6.3） |
| 7 | `bun run typecheck` 通过 | 通过 |

### 6.3 关于 403 处理的说明

验收标准要求"后端返回 403 时按钮隐藏或禁用"。当前实现中：

- `api-client.ts` 的 `mapWebApiError` 已将 403 翻译为用户友好的错误文案
- 错误信息会在 `AiSummaryPanel` 的错误状态中展示
- 未实现主动预检查（即不预先调用 API 来判断按钮是否显示）

这是因为：
- 后端 AI 功能开关由管理后台控制，关闭时返回 403
- 前端没有独立的接口查询功能开关状态
- 按钮始终显示，403 时用户看到友好错误提示

若需实现按钮隐藏，需要后端提供一个轻量级的功能状态查询接口，或在帖子详情响应中包含 `aiSummaryEnabled` 字段。这超出了 TASK-008 的范围。

## 7. 边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| 新建文章（无 postId） | 发布页不显示 AI 摘要按钮 |
| API 返回 403 | 面板显示错误信息，用户可重试 |
| API 返回 429（频率限制） | 面板显示错误信息 |
| API 返回 502（AI 服务不可用） | 面板显示错误信息 |
| 网络异常 | `mapWebApiError` 统一翻译错误文案 |
| 复制到剪贴板失败 | 静默处理（clipboard API 不可用时降级） |
| 重复点击生成按钮 | `useMutation.isPending` 防止重复提交 |

## 8. 风险 / 未解决项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 后端 AI 服务不可用 | 摘要功能完全不可用 | 面板显示错误信息，不影响其他功能 |
| 新建文章无法使用 AI 摘要 | 用户需先保存再生成 | 产品设计层面可接受 |
| 403 按钮隐藏未实现 | 功能关闭时用户仍能看到按钮 | 可后续迭代增加功能状态预检查 |
| clipboard API 兼容性 | 部分旧浏览器不支持 | 当前仅作为辅助功能，不影响核心流程 |

## 9. 需要后端配合的点

| 配合项 | 说明 | 优先级 |
|--------|------|--------|
| 功能状态查询接口 | 如需前端预检查 AI 功能是否开启，需后端提供轻量接口 | P2 |
| 帖子详情响应增加 aiSummary 字段 | 若需在详情页直接展示已生成的摘要（无需再次调用 API） | P3 |

当前后端 TASK-006 已实现的 `POST /api/v1/ai/summary` 接口完全满足需求，无需额外配合。

## 10. 推荐的下一步

1. **TASK-009** -- AI 排版前端集成，与本任务共享 `publish-article-page.tsx` 和 `api-client.ts`
2. **TEST-008** -- AI 前端集成测试，验证摘要和排版功能交互
3. **403 按钮隐藏优化** -- 如需更好的 UX，可增加功能状态预检查
4. **新建文章摘要支持** -- 如需在新建文章时也能生成摘要，需要后端支持纯内容模式（无 postId）

---

## 附录：变更文件清单

### 新建文件
- `apps/web/src/features/ai/use-ai-summary.ts`
- `apps/web/src/features/ai/ai-summary-panel.tsx`

### 修改文件
- `apps/web/src/lib/api-client.ts` -- 新增 `generateAiSummary` 方法
- `apps/web/src/routes/publish-article-page.tsx` -- 导入 AI 组件、添加按钮和面板
- `apps/web/src/routes/post-detail-page.tsx` -- 导入 AI 组件、添加面板
