# 富文本编辑器死代码清理 -- TASK-010 前端实现文档

## 1. 当前实现目标

清理富文本编辑器统一化后的遗留死代码，包括：
- 确认旧组件文件已改为纯 re-export
- 移除未使用的 `@tiptap/*` 依赖
- 移除 `vite.config.ts` 中对应的 tiptap manualChunks
- 精简 `admin-rich-text-editor-helpers.ts` 中的重复代码

## 2. 对应需求 ID / 任务 ID

- 需求 ID: REQ-010
- 任务 ID: TASK-010

## 3. 输入依据

- `docs/requirements/2026-05-04-rich-text-editor-unification-requirements.md`
- `docs/tasks/2026-05-04-rich-text-editor-unification-tasks.md`
- TASK-010 Execution Packet

## 4. 变更文件 / 变更范围

| 文件 | 变更类型 | 变更前 | 变更后 | 净变化 |
|------|---------|--------|--------|--------|
| `apps/admin/src/components/admin-rich-text-editor-helpers.ts` | 修剪 | 275 行 | 212 行 | -63 行 |
| `apps/web/vite.config.ts` | 删除死块 | 222 行 | 204 行 | -18 行 |
| `apps/admin/vite.config.ts` | 删除死块 | 365 行 | 344 行 | -21 行 |
| `apps/web/package.json` | 删除依赖 | 69 行 | 49 行 | -20 行 |
| `apps/admin/package.json` | 删除依赖 | 52 行 | 32 行 | -20 行 |
| **总计** | | **983 行** | **841 行** | **-142 行** |

以下文件已确认为纯 re-export，无需变更：
- `apps/web/src/components/rich-text-editor.tsx` (1 行 re-export)
- `apps/admin/src/components/admin-rich-text-editor.tsx` (4 行 re-export)
- `apps/web/src/components/rich-text-editor-helpers.ts` (11 行 re-export)

## 5. 实现说明

### 5.1 admin-rich-text-editor-helpers.ts 修剪

**移除内容：**
- Inlined `extractPlainTextFromHtml` 函数（17 行）-- 替换为从 `@feijia/rich-text-editor/helpers` 的 re-export
- Inlined `getRichTextMediaInsertions` 函数（23 行）-- 未被外部文件直接引用，替换为通过 deprecated alias 的 re-export
- 死类型 re-export: `RichTextToolbarEditor`、`RichTextToolbarStateItem` -- 无任何外部文件引用
- 注释头和 import 块（6 行）

**保留内容：**
- `buildOfficialArticleDocument` -- 唯一函数（admin 独有逻辑）
- `parseOfficialArticleDocument` -- 唯一函数（admin 独有逻辑）
- `removeAdminRichTextMediaReferenceFromHtml` -- 唯一函数（admin 独有逻辑）
- 内部辅助函数: `escapeHtml`, `decodeHtml`, `stripSummaryPrefixFromHtml`, `removeMatchingMediaNodes`
- `getAdminRichTextMediaInsertions` -- 保留为 `@deprecated` re-export（被测试文件引用）

### 5.2 @tiptap 依赖及 vite chunks 移除

全局搜索确认 `apps/web/src/` 和 `apps/admin/src/` 均无 `from "@tiptap"` import。

**移除的依赖包（每端 19 个）：**
`@tiptap/core`, `@tiptap/extension-color`, `@tiptap/extension-highlight`, `@tiptap/extension-horizontal-rule`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-table`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-table-row`, `@tiptap/extension-task-item`, `@tiptap/extension-task-list`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-underline`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`

**移除的 vite manualChunks：**
- `editor-react-vendor` -- `@tiptap/react`
- `editor-core-vendor` -- `@tiptap/pm`, `prosemirror-*`, `orderedmap`
- `editor-kit-vendor` -- `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-*`

### 5.3 WangEditor chunks 统一性确认

两端 `vite.config.ts` 中 WangEditor 分块配置已完全一致：
- 相同 `WANGEDITOR_CORE_PACKAGES` 集合（18 个包）
- 相同 `WANGEDITOR_MODULE_PACKAGES` 集合（5 个包）
- 相同 `WANGEDITOR_UPLOAD_PACKAGES` 集合（4 个包）
- 相同 `getWangeditorManualChunk` 分块策略（优先顺序一致）

## 6. 测试和验证结果

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Web TypeScript 编译 | PASS | 零错误 |
| Admin TypeScript 编译 | PASS* | 1 个预存错误（`onUploadImage` 不在 `RichTextEditorProps`），非本次变更引起 |
| rich-text-editor 包 TypeScript 编译 | PASS | 零错误 |
| Web ESLint | PASS | 零错误/警告 |
| Admin ESLint | PASS* | 4 个预存错误（`aircraft-creator-page.tsx`, `official-article-editor-page.tsx`），非本次变更文件 |
| admin-rich-text-editor-helpers.test.ts 编译 | PASS | 测试文件正常引用所有导出 |

*标星号项：预存错误均已确认存在于变更前，非本次任务引起，不在修复范围。

## 7. 边界和异常处理

- **getAdminRichTextMediaInsertions**: 原本在修剪时被移除，后发现 `tests/admin-rich-text-editor-helpers.test.ts` 仍引用该导出。按 forbidden_paths 规则（不删除被其他文件 import 的函数/类型），已恢复为从共享包 re-export 的 `@deprecated` 别名。
- **extractPlainTextFromHtml**: 共享包实现与 admin 原 inlined 实现逐行一致，替换无行为差异。
- **vite manualChunks 移除**: 仅删除 tiptap 相关块，WangEditor、React、Ant Design、Lucide 等分块逻辑不受影响。

## 8. 风险 / 未解决项

- 需要执行 `bun install` 更新 lockfile，移除 `@tiptap/*` 的锁定条目。
- admin 端存在 1 个预存类型错误（`RichTextEditorProps` 缺少 `onUploadImage`/`onUploadVideo` 属性），建议在后续任务中修复。
- 若未来重新引入 tiptap 编辑器，需同步恢复 `package.json` 依赖和 `vite.config.ts` 分块配置。

## 9. 需要后端配合的点

无。本任务纯前端清理。

## 10. 推荐的下一步

1. 执行 `bun install` 清理 lockfile 中的 `@tiptap/*` 残留条目
2. 修复 admin 端预存类型错误（`RichTextEditorProps` 与 editor 组件 props 不一致）
3. 确认 `@feijia/rich-text-editor` 是所有编辑器组件的唯一来源
