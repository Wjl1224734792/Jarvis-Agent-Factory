# TASK-009 Web 端 AI 排版按钮实现文档

## 1. 当前实现目标

在 Web 端编辑器集成 AI 排版功能：下拉按钮 + beautify/structure 两种模式。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**：REQ-004（AI 排版）、REQ-005（AI 排版交互）
- **任务 ID**：TASK-009
- **依赖**：TASK-007（后端 POST /api/v1/ai/format 已就绪）、TASK-008（api-client.ts 和 publish-article-page.tsx 已有摘要集成）

## 3. 输入依据

- `docs/requirements/2026-05-06-ai-features-requirements.md`
- `docs/plans/2026-05-06-ai-features-plan.md`
- `docs/tasks/2026-05-06-ai-features-tasks.md`
- 后端 AI 排版接口：`POST /api/v1/ai/format`，请求体 `{ content: string, mode: "beautify" | "structure" }`，响应体 `{ html: string, changes: string[] }`

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/lib/api-client.ts` | 追加方法 | 在 `rawApiClient` 中新增 `formatAiContent` 方法 |
| `apps/web/src/features/ai/use-ai-format.ts` | 新建 | AI 排版 React hook，封装 `useMutation` |
| `apps/web/src/features/ai/ai-format-button.tsx` | 新建 | AI 排版下拉按钮组件 |
| `apps/web/src/routes/publish-article-page.tsx` | 追加 | 导入并添加 `<AiFormatButton>` 到工具栏 |

## 5. 实现说明

### 5.1 api-client.ts — formatAiContent 方法

在 `rawApiClient` 对象中追加 `formatAiContent` 方法，遵循 `generateAiSummary` 的模式：
- 使用内部 `postJson` 发送 POST 请求到 `API_ROUTES.ai.format`
- 返回类型 `{ html: string; changes: string[] }`
- 通过 `createWrappedApiClient` Proxy 自动获得错误翻译能力

### 5.2 use-ai-format.ts — React Hook

- 使用 TanStack Query `useMutation` 封装排版 API 调用
- 入参 `{ content: string, mode: "beautify" | "structure" }`
- 返回 `{ format, formatAsync, formattedHtml, changes, isLoading, isSuccess, error, reset }`
- 遵循 `use-ai-summary.ts` 的模式和命名风格

### 5.3 ai-format-button.tsx — 下拉按钮组件

**Props**：`{ editor: IDomEditor | null }`

**UI 结构**：
- 主按钮（"AI 排版" + SparklesIcon）+ 右侧下拉触发按钮（ChevronDownIcon）
- 下拉菜单包含两个选项："美化选中内容"（PaintbrushIcon）和"全文结构化"（SparklesIcon）
- 点击外部自动关闭下拉菜单

**beautify 模式流程**：
1. 检查是否有选中内容（通过 `window.getSelection()` + Range API 提取选区 HTML）
2. 未选中时通过 `editor.alert("请先选中需要排版的内容", "warning")` 提示
3. 调用 `formatAsync({ content: selectedHtml, mode: "beautify" })`
4. 成功后 `deleteCurrentSelection()` + `editor.dangerouslyInsertHtml(result.html)` 替换选区
5. 失败时保留原文，通过 `editor.alert(message, "error")` 显示错误

**structure 模式流程**：
1. 检查编辑器是否有实际内容（排除 `<p><br></p>` 空状态）
2. 空内容时通过 `editor.alert("请先输入内容", "warning")` 提示
3. 弹出 `window.confirm("AI 将重新组织结构，是否继续？")` 确认对话框
4. 确认后获取 `editor.getHtml()` 并调用 `formatAsync({ content: fullHtml, mode: "structure" })`
5. 成功后 `editor.setHtml(result.html)` 替换全部内容
6. 失败时保留原文，通过 `editor.alert(message, "error")` 显示错误

**加载状态**：
- 按钮在加载时显示 `Loader2Icon` 旋转动画
- 按钮在加载时 `disabled`，防止重复提交
- 使用 `aiFormat.reset()` 在操作完成后重置状态

### 5.4 publish-article-page.tsx — 集成

- 新增 `import { AiFormatButton } from "../features/ai/ai-format-button"`
- 在编辑器工具栏区域（ImportFileButton 旁）添加 `<AiFormatButton editor={editorInstance} />`
- 工具栏 div 从 `flex justify-end` 改为 `flex justify-end gap-2`，添加按钮间距

## 6. 测试和验证结果

- `bun run --cwd apps/web typecheck`：源文件无类型错误（测试文件有预存错误，非本次变更引入）
- `bunx vitest run apps/web/tests/ai-summary-format-integration.test.ts`：44 个测试全部通过
- 新增文件的类型推断正确，无隐式 `any`

## 7. 边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| editor 为 null | 按钮 disabled |
| beautify 未选中内容 | `editor.alert("请先选中需要排版的内容", "warning")` |
| structure 空内容 | `editor.alert("请先输入内容", "warning")` |
| structure 用户取消确认 | 静默取消，不调用 API |
| API 调用失败 | 保留原文，`editor.alert(message, "error")` |
| 加载中重复点击 | 按钮 disabled，防止重复提交 |
| 内容超过 8000 字符 | 后端返回 400，前端显示错误消息 |

## 8. 风险 / 未解决项

1. **选区 HTML 提取**：使用 `window.getSelection()` + Range API 提取选区 HTML。wangEditor 的 `editor.getSelectionText()` 仅返回纯文本，无法满足"替换选中 HTML"的需求。当前方案在所有现代浏览器中可用。
2. **确认对话框**：使用原生 `window.confirm()` 而非自定义 Dialog 组件。项目 UI 组件库中没有 Dialog/AlertDialog 组件，原生 confirm 是最小闭环方案。后续可替换为自定义组件。
3. **内容截断**：后端限制 8000 字符。当前未在前端做预截断，依赖后端错误返回。如需优化可在前端提前截断并提示。
4. **排版变更说明**：API 返回的 `changes` 数组当前未在 UI 中展示。可作为后续优化项，在操作完成后以 toast 或临时提示形式展示。

## 9. 需要后端配合的点

- 后端 `POST /api/v1/ai/format` 接口已就绪（TASK-007 完成）
- 请求体：`{ content: string, mode: "beautify" | "structure" }`
- 响应体：`{ html: string, changes: string[] }`
- 无需额外后端改动

## 10. 推荐的下一步

1. 为 `ai-format-button.tsx` 编写单元测试（test_after 策略）
2. 考虑将排版变更说明（changes）以 toast 形式展示给用户
3. 考虑在前端增加 8000 字符预截断提示
4. 后续可用自定义 Dialog 组件替换 `window.confirm()`
