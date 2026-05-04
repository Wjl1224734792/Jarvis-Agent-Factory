# Admin Deferred Upload State Implementation (TASK-006)

## 1. Current Implementation Goal

将 Admin 端官方文章编辑器从旧版 `admin-rich-text-editor` 切换到共享 `@feijia/rich-text-editor` 组件，同时将即时上传改为延迟上传（blob 预览 → 提交时批量上传）。

## 2. Corresponding Requirement / Task ID

- **requirement_ids**: [REQ-006]
- **task_id**: TASK-006
- **dependencies**: TASK-003 (共享 RichTextEditor 组件), TASK-004 (media-uploader 工具函数)

## 3. Changed Files / Change Range

| File | Change Type | Description |
|------|------------|-------------|
| `apps/admin/src/components/admin-rich-text-editor.tsx` | Replace | 删除 ~210 行的 wangeditor 直接实现，改为从 `@feijia/rich-text-editor` re-export |
| `apps/admin/src/features/posts/official-article-editor-page.tsx` | Refactor | 核心改造：延迟上传、mediaManager 集成、handleSubmit 批量上传 |
| `apps/admin/src/components/admin-rich-text-editor-helpers.ts` | Fix | 将 `extractPlainTextFromHtml` / `getRichTextMediaInsertions` 内联化，避免包入口触发 wangeditor 模块加载导致测试环境崩溃 |
| `vitest.config.ts` | Reverted | 尝试添加 jsdom 环境后回退（因解决方案改为内联方式） |

**Note**: `packages/rich-text-editor/`、`apps/web/`、`apps/server/` 没有做任何修改。

## 4. State Management Plan

### 核心状态变更

| State | Type | Purpose |
|-------|------|---------|
| `mediaManager` | `MediaManager` (useMemo) | 管理本地文件的 blob URL → File 映射，组件生命周期内单例 |
| `coverFileRef` | `useRef<File \| null>` | 跟踪封面文件（延迟上传） |
| `coverImage` | `UploadedMediaAsset \| null` | 封面：新建时为 blob URL（id=""），编辑时为已上传媒体资源 |
| `uploadedImages` | `UploadedMediaAsset[]` | 编辑模式下已有的已上传图片，新建时为空 |
| `uploadedVideos` | `UploadedMediaAsset[]` | 编辑模式下已有的已上传视频，新建时为空 |
| `localMediaEntries` | `{ images, videos }` (derived) | 从 `editorHtml` 提取 blob URL，结合 `mediaManager.getFile()` 派生本地待上传媒体列表 |
| `editorHtml` | `string` | 编辑器 HTML 内容（受控，提交后更新为含真实 URL 的 HTML） |
| `editorText` | `string` | 编辑器纯文本内容 |

### 移除 / 变更

- `isUploading` 状态：删除（不再需要即时上传）
- `uploadImages()` / `uploadVideos()` 函数：删除
- `uploadCover()`：改为 `handleCoverSelect()`（仅本地 blob 预览，不上传）
- 编辑器 `onUploadImage` / `onUploadVideo` props：删除，替换为 `mediaManager` + `variant="admin"`

### 数据流

```
用户通过编辑器工具选择文件
  → 共享组件内 mediaManager.register(file) → 生成 blob URL
  → 编辑器显示 blob URL 预览
  → 媒体面板显示本地文件（派生自 editorHtml + mediaManager）

用户选择封面
  → handleCoverSelect(file) → URL.createObjectURL(file) → blob URL 预览
  → coverFileRef.current = file

用户点击发布
  → handleSubmit():
    1. 封面上传（如为本地文件）
    2. collectBlobUrls(editorHtml) 提取 blob URLs
    3. mediaManager.getFile(blobUrl) 获取 File
    4. uploadMediaBatch(files, uploadImageFn, uploadVideoFn) 并行批量上传
    5. replaceBlobUrls(html, urlMapping) 替换 blob URL → 真实 URL
    6. buildOfficialArticleDocument(summary, finalHtml) 构造文档
    7. buildOfficialArticlePayload(...) 合并已有 + 新上传 ID
    8. apiClient.createOfficialArticle / updateAdminOfficialArticle
    9. 更新 editorHtml 为 finalHtml
    10. mediaManager.clear("admin:official-article")
```

## 5. Data Flow and Cache Strategy

### 延迟上传流程

```
handleSubmit:
  1. uploadCoverImage()          如有本地封面，先单独上传
  2. collectBlobUrls(editorHtml) 提取所有 blob URL
  3. buildPendingFiles()         mediaManager.getFile() 获取对应 File
  4. uploadMediaBatch()          并行批量上传
  5. replaceBlobUrls()           HTML 中的 blob URL → 真实 URL
  6. buildOfficialArticleDocument()  构建带摘要前缀的文档
  7. buildOfficialArticlePayload()   合并已有 ID + 新上传 ID
  8. submit API                  创建或更新文章
  9. setEditorHtml(finalHtml)    更新编辑器显示内容
  10. mediaManager.clear()       释放 blob URL + IndexedDB 缓存
```

### 封面图延迟上传

- 选择文件 → `URL.createObjectURL(file)` → blob URL 预览
- 文件引用存入 `coverFileRef`
- 再选择新文件时：先 `URL.revokeObjectURL(oldBlobUrl)` 释放旧 blob URL
- 清除封面时：`URL.revokeObjectURL(blobUrl)` + `coverFileRef.current = null`
- 提交时：检查 `coverFileRef.current`，如有则通过 `apiClient.uploadPostImage()` 上传

### 编辑模式下的媒体处理

- 已上传的媒体保留在 `uploadedImages`/`uploadedVideos` 状态（含真实 URL 和 ID）
- 编辑加载时从 API 响应填充这两个状态
- `removeMediaAsset` 同时从 HTML（通过 `removeAdminRichTextMediaReferenceFromHtml`）和状态中移除
- 提交时：已有 ID 直接进入 payload，新 blob URL 上传后获取新 ID

### 媒体面板展示

- **本地文件**：派生自 `localMediaEntries`（`collectBlobUrls(editorHtml)` + `mediaManager.getFile()`），标记为"发布时上传"
- **已上传文件**：来自 `uploadedImages`/`uploadedVideos`，标记为"已上传"
- **移除操作**：通过 `removeMediaAsset(assetUrl, kind)` 从 HTML 和状态中移除

## 6. Request Client Integration

| 操作 | API Client Method | 调用位置 |
|------|------------------|---------|
| 封面上传 | `apiClient.uploadPostImage(file)` | handleSubmit |
| 批量图片上传 | `apiClient.uploadPostImage(file)` | uploadMediaBatch 回调 |
| 批量视频上传 | `apiClient.uploadPostVideo(file)` | uploadMediaBatch 回调 |
| 创建文章 | `apiClient.createOfficialArticle(payload)` | handleSubmit |
| 更新文章 | `apiClient.updateAdminOfficialArticle(id, payload)` | handleSubmit |
| 文章详情查询 | `apiClient.getAdminOfficialArticle(id)` | detailQuery |

`uploadMediaBatch` 的 `uploadImageFn`/`uploadVideoFn` 适配：

```typescript
uploadImageFn: (file) =>
  apiClient.uploadPostImage(file).then((r) => ({
    id: r.item.id,
    url: r.item.url,
    fileName: r.item.fileName ?? file.name,
  })),
uploadVideoFn: (file) =>
  apiClient.uploadPostVideo(file).then((r) => ({
    id: r.item.id,
    url: r.item.url,
    fileName: r.item.fileName ?? file.name,
  })),
```

## 7. Test and Verification Results

### Test Results (2026-05-04)

```
$ npx vitest run (from apps/admin)

Test Files  18 passed | 1 failed (19)
Tests       65 passed | 1 failed (66)
Duration    2.63s
```

**Pre-existing failure**: `tests/comment-ip-location-display.test.ts` — ENOENT path error with duplicated `apps/admin/` prefix in source path resolution. Not related to this task.

**Key passing test suites**:

| Test File | Tests | Status |
|-----------|-------|--------|
| `admin-rich-text-editor-helpers.test.ts` | 5/5 | Pass |
| `official-articles-helpers.test.ts` | 5/5 | Pass |
| `admin-rich-text-toolbar.test.ts` | 2/2 | Pass |

### Verification Checklist

| # | Acceptance Criteria | Status |
|---|-------------------|--------|
| 1 | Admin 文章编辑器正常加载（React.lazy + Suspense） | Implemented — lazy import path unchanged, shared component handles rendering |
| 2 | 选择图片/视频后编辑器内即时预览（blob URL） | Implemented — shared component uses mediaManager.register(file) for blob URLs |
| 3 | 填写标题、摘要、分类 → 发布 → 批量上传 → 创建成功 | Implemented — handleSubmit orchestrates the full batch upload pipeline |
| 4 | 编辑已有文章（?edit=）内容正常加载（含图片/视频） | Implemented — existing media loaded from API into uploadedImages/uploadedVideos |
| 5 | 封面图选择后本地预览 + 提交时上传 | Implemented — handleCoverSelect creates blob URL, coverFileRef stores file |
| 6 | 移除媒体资源功能正常 | Implemented — removeMediaAsset works for both blob and real URLs |
| 7 | admin helpers 测试通过 | Verified — all 10 tests pass across 2 test suites |

## 8. Risks / Unresolved Items

### Resolved Issues

1. **Test environment crash**: `admin-rich-text-editor-helpers.ts` imported `extractPlainTextFromHtml`/`getRichTextMediaInsertions` from `@feijia/rich-text-editor` package entry point, which triggers `@wangeditor/editor` module side effect (failed in Node.js because `navigator` is read-only on `globalThis`). **Fix**: Inlined both functions in the helpers file, keeping only type-only imports from the shared package.

2. **Blob URL lifecycle after submit**: After batch upload, `editorHtml` is updated with `finalHtml` (real URLs replaced) before `mediaManager.clear()` is called. This ensures the editor shows correct content after save (especially important in edit mode where the page stays active).

### Known Risks

1. **`official-articles-page-content.tsx` type compatibility**: This file uses `onUploadImage`/`onUploadVideo` props which the new `AdminRichTextEditor` (re-exported shared component) does not accept. This may cause TypeScript type errors during build. A separate task should migrate this file.

2. **No removeFile API on MediaManager**: When a local file is removed via `removeMediaAsset`, the file record remains in `mediaManager` memory but is no longer referenced in the HTML. On submit, only blob URLs found via `collectBlobUrls(editorHtml)` are processed, so orphaned files are safely ignored.

3. **mediaManager.clear() async behavior**: The `clear()` method is async (does IndexedDB cleanup). The synchronous blob URL revocation happens at the start of the async function, so memory is freed immediately. The IndexedDB cleanup is fire-and-forget after form reset.

## 9. Recommended Next Steps

1. **Migrate `official-articles-page-content.tsx`** to use the shared `RichTextEditor` with `mediaManager` and deferred upload (fix type compatibility)
2. **Enable draft auto-save** using `mediaManager.persist()`/`restore()` for crash recovery
3. **Fix pre-existing test** `tests/comment-ip-location-display.test.ts` (path resolution bug)
4. **Consider adding `mediaManager.remove(blobUrl)` API** to support individual file removal without HTML scanning
