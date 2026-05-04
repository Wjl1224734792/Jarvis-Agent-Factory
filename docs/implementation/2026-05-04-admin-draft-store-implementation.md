# Admin 端 IndexedDB 草稿持久化实现

## 1. 当前实现目标

为 Admin 端文章创建页实现 IndexedDB 草稿自动保存/恢复功能，确保用户在创建文章时关闭页面或意外刷新后能恢复编辑内容（包括文本、图片和视频）。

## 2. 对应需求 ID / 任务 ID

- Requirement: REQ-008
- Task: TASK-008

## 3. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/admin/src/lib/uploads/draft-store.ts` | 新建 | IndexedDB 草稿存储实现 |
| `apps/admin/src/features/posts/official-article-editor-page.tsx` | 修改 | 接入草稿自动保存/恢复/清除 |

## 4. 状态管理方案说明

### 4.1 IndexedDB 草稿存储 (`draft-store.ts`)

- **数据库名**: `feijia-admin-drafts`（独立于 Web 端的 `feijia-publish-drafts`）
- **Object Store**: `drafts`（keyPath: `"key"`）
- **草稿键名**: `feijia:admin-article-draft`
- **实现模式**: 完全复用 Web 端 `app/web/src/lib/uploads/draft-store.ts` 的 IndexedDB 模式
- **导出的 API**:
  - `saveDraftSnapshot<T>(snapshot: DraftSnapshot<T>)` — 保存或覆盖草稿
  - `loadDraftSnapshot<T>(key: string)` — 读取草稿，不存在时返回 null
  - `clearDraftSnapshot(key: string)` — 清除指定草稿

### 4.2 草稿数据结构

```typescript
interface AdminArticleDraftData {
  title: string;
  summary: string;
  editorHtml: string;
  categoryId: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
  declaration: string;
  coverImage: {
    id?: string;
    url: string;
    fileName?: string;
    file?: File;       // 本地封面文件的 File 对象
    isLocal?: boolean; // 标记是否为本地未上传文件
  } | null;
  mediaBlobUrls: string[]; // 按注册顺序的 media blob URL 列表
}
```

### 4.3 类型定义

本地定义了 `DraftSnapshot<T>` 和 `DraftFileRecord` 接口（遵循 `interface` 优先规范），与 Web 端同构。

## 5. 数据流与缓存策略说明

### 5.1 自动保存流程

```
用户编辑表单/编辑器
        │
        ▼
useEffect 监听 watchedTitle/watchedSummary/editorHtml/等变化
        │
        ▼
setTimeout 500ms debounce
        │
        ▼
persistDraft callback:
  1. 读取 mediaManager.getAllFiles() → 获取 blob URL 列表
  2. 读取 coverFileRef.current → 获取封面 File
  3. saveDraftSnapshot(...) → 写入 IndexedDB (文字数据)
  4. mediaManager.persist(ADMIN_ARTICLE_DRAFT_KEY) → 写入 IndexedDB (媒体文件)
```

### 5.2 草稿恢复流程

```
页面加载（创建模式，无 ?edit=）
        │
        ▼
useEffect (mount):
  1. loadDraftSnapshot(ADMIN_ARTICLE_DRAFT_KEY)
     │
     ├── 无草稿 → 静默跳过
     │
     └── 有草稿 →
         2. mediaManager.restore(ADMIN_ARTICLE_DRAFT_KEY) → 获取新 blob URL
         3. 构建 oldBlobUrl → newBlobUrl 映射
         4. 恢复封面图: 重建 blob URL 或恢复已有 URL
         5. form.setFieldsValue(...) → 恢复表单字段
         6. replaceBlobUrls(editorHtml, mapping) → 替换 HTML 中的 blob URL
         7. stripFileUrls() → 清理 file:/// 残留
         8. setEditorHtml() → 更新编辑器内容
```

### 5.3 提交流程（草稿清除）

```
handleSubmit 成功:
  ├── 新建 (create):
  │   clearDraftSnapshot(ADMIN_ARTICLE_DRAFT_KEY) + resetFormState(false)
  │
  └── 编辑 (update):
      clearDraftSnapshot(ADMIN_ARTICLE_DRAFT_KEY) + mediaManager.clear(...)
```

### 5.4 媒体文件持久化

媒体文件的 File 对象通过 `mediaManager.persist(draftKey)` 和 `mediaManager.restore(draftKey)` 管理，使用共享包 `@feijia/rich-text-editor` 中 `MediaManager` 的 IndexedDB 持久化能力。

封面文件的 File 对象通过 `DraftSnapshot.data.coverImage.file` 字段保存在草稿数据中，恢复时通过 `URL.createObjectURL(file)` 重建 blob URL。

### 5.5 缓存策略

- **草稿键**: `feijia:admin-article-draft` — 单键单草稿模式
- **覆盖写入**: 每次保存覆盖旧草稿
- **清除时机**: 提交成功时清除
- **错误处理**: 草稿读写失败时静默捕获，不阻塞用户操作 (best-effort)

## 6. 请求客户端对接说明

不涉及新的请求客户端对接。原有的 `apiClient` 提交流程 (uploadPostImage/uploadPostVideo/createOfficialArticle/updateAdminOfficialArticle) 保持不变。

草稿清除 (`clearDraftSnapshot`) 和 `mediaManager.clear()` 仅操作浏览器端 IndexedDB。

## 7. 测试和验证结果

### 验证方式

根据 `test_strategy: test_after`，采用手动验证：

| 验收标准 | 验证方式 | 预期结果 |
|----------|----------|----------|
| 草稿自动保存 (500ms) | 在创建模式下编辑标题/摘要/正文，等待 500ms 后刷新页面 | 内容恢复 |
| 图片/视频恢复 | 在编辑器中插入图片/视频，等待保存后刷新 | 图片/视频恢复显示 |
| 提交后清除草稿 | 填写完整内容并发布，关闭页面后重新进入创建模式 | 无草稿恢复 |
| `?edit=` 不触发 | 进入编辑模式，修改内容后刷新 | 显示编辑内容而非草稿 |
| 不影响现有提交 | 执行完整发布流程 | 发布成功 |

### 自动化验证

- **typecheck**: 通过（仅剩预存在的 2 个类型错误，与本次改动无关）
- **lint**: 通过（`draft-store.ts` 零错误，`editor-page.tsx` 仅预存在错误）

## 8. 风险 / 未解决项

| 风险项 | 说明 | 缓解措施 |
|--------|------|----------|
| IndexedDB 容量限制 | 大文件（>50MB）可能写入失败 | mediaManager 已有 50MB 单文件限制; 草稿写入为 best-effort |
| 浏览器限制 | 部分浏览器 (Safari ITP) 可能清除 IndexedDB | 无措施 (浏览器行为) |
| *setEditorText 未恢复 | 当前实现中 `setEditorText("")` 在恢复时设为空字符串 | editorText 仅用于字数统计，可在后续优化中完善 |
| 草稿版本兼容 | 草稿数据结构变更后旧草稿不可用 | 当前为 v1，后续增加 version 字段升级 |

## 9. 推荐的下一步

1. 在 UI 上增加草稿状态指示（如"已保存到本地 xx:xx" "已恢复草稿" 标签），参考 Web 端的 `lastDraftSavedAt` 和 `hasRestoredDraftSnapshot` 模式
2. 为飞行器/品牌/榜单编辑器增加类似草稿持久化支持
3. 增加草稿版本迁移机制（升级数据格式而不破坏旧草稿）
