# Web 编辑器文件导入功能 — 前端实现文档

## 1. 当前实现目标

实现编辑器文件导入功能，支持 docx/md/txt 三种格式的浏览器端解析并注入 wangEditor。

## 2. 对应需求 ID / 任务 ID

- **需求 ID**: REQ-001
- **任务 ID**: TASK-005

## 3. 输入依据

- `docs/requirements/2026-05-06-ai-features-requirements.md`
- `docs/plans/2026-05-06-ai-features-plan.md`
- `docs/tasks/2026-05-06-ai-features-tasks.md`

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/web/package.json` | 修改 | 添加 `mammoth`、`marked` 依赖 |
| `apps/web/src/features/ai/import-file-button.tsx` | 新建 | 文件导入按钮组件 |
| `apps/web/src/routes/publish-article-page.tsx` | 修改 | 集成 ImportFileButton 到编辑器工具栏区域 |
| `packages/rich-text-editor/src/rich-text-editor.tsx` | 修改 | 添加可选 `onCreated` 回调 prop，暴露 editor 实例 |

### 包修改说明

`packages/rich-text-editor/src/rich-text-editor.tsx` 的修改是最小必要变更：
- 在 `RichTextEditorProps` 接口添加可选 `onCreated?: (editor: IDomEditor) => void` prop
- 在 `handleCreated` 回调中调用 `onCreatedCallback?.(currentEditor)`
- 不改变现有行为，仅新增可选 prop，现有调用方无需修改

## 5. 实现说明

### 5.1 依赖安装

```bash
bun add mammoth marked
```

- `mammoth@1.12.0` — docx 浏览器端解析为 HTML
- `marked@18.0.3` — markdown 解析为 HTML
- `dompurify` 和 `@types/dompurify` — 已存在于项目中

### 5.2 ImportFileButton 组件

核心功能：

1. **文件选择**: 点击按钮触发隐藏的 `<input type="file" accept=".docx,.md,.txt">`
2. **大小校验**: 前端 10MB 限制，超过通过 `editor.alert()` 提示
3. **格式解析**:
   - `.docx`: `mammoth.convertToHtml({ arrayBuffer })` 动态导入
   - `.md`: `marked.parse(text, { gfm: true, breaks: true })` 动态导入
   - `.txt`: 纯文本按行包裹 `<p>` 标签
4. **安全消毒**: 所有解析结果经 `DOMPurify.sanitize()` 消毒
5. **内容注入**:
   - 编辑器已有内容时: `editor.dangerouslyInsertHtml(cleanHtml)` 插入到光标位置
   - 编辑器为空时: `editor.setHtml(cleanHtml)` 设置内容
6. **错误处理**: 解析失败通过 `editor.alert()` 显示友好中文提示，不影响编辑器

### 5.3 错误提示机制

项目没有独立的 toast/notification 库。使用 wangEditor 内置的 `editor.alert(message, type)` 方法，消息显示在编辑器底部 footer 区域。这与现有上传错误的展示方式一致。

### 5.4 编辑器实例获取

通过给 `RichTextEditor` 添加可选 `onCreated` 回调，在编辑器创建完成后将实例传递给父组件。父组件通过 `useState` 持有实例，传给 `ImportFileButton`。

## 6. 测试和验证结果

| 验证项 | 结果 |
|--------|------|
| TypeScript 类型检查 (`typecheck`) | 通过 |
| ESLint 代码检查 (`lint`) | 通过 |
| Vite 构建 (`build`) | 通过 |

## 7. 边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| 文件超过 10MB | `editor.alert('文件过大，请缩减内容后重试', 'error')` |
| 不支持的文件格式 | 浏览器原生文件选择器过滤 + `editor.alert()` 兜底 |
| 文件内容为空 | `editor.alert('文件内容为空或无法解析', 'warning')` |
| 解析异常 | `try/catch` 捕获，`editor.alert('文件解析失败...')` |
| 编辑器未就绪 | 按钮 `disabled={!editor}` 禁用 |
| XSS 防护 | DOMPurify 消毒所有解析结果 |

## 8. 风险 / 未解决项

| 风险 | 等级 | 说明 |
|------|------|------|
| mammoth 大文件性能 | 低 | 10MB docx 文件解析可能较慢，但浏览器端操作不阻塞主线程 |
| marked 版本兼容 | 低 | v18 使用 ESM，默认导出方式需注意 |

## 9. 需要后端配合的点

无。本任务纯前端实现，所有文件解析在浏览器端完成。

## 10. 推荐的下一步

- 添加文件导入的 E2E 测试
- 考虑添加导入进度提示（大文件时）
- 考虑支持更多格式（如 .html、.rtf）
