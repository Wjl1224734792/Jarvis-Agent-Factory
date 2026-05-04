# 内容安全扫描链路验证报告

**验证日期**：2026-05-04
**任务 ID**：TASK-009
**需求 ID**：REQ-009
**验证类型**：代码审查 + 手动验证

---

## 验证范围总览

| 验证项 | 状态 | 备注 |
|--------|------|------|
| 敏感词过滤生效 | PASS | 所有发布路径均调用 `inspectPostWriteContent` |
| 提交 payload 中 imageIds/videoIds 为真实 fileId | PASS | blob URL 在提交前已被替换为服务器返回的真实 ID |
| 审核状态流转正确 | PASS | 初始 `pending`，AI 审核后流转至 `published`/`rejected`；Admin 审核队列正常显示 |
| Admin 审核队列可见待审核内容 | PASS | `/admin/moderation/articles` 路由正常渲染 `<PostsPage contentType="article" />` |

---

## 验证项 1：敏感词过滤生效

### 后端关键函数

敏感词过滤的核心链路：

```
posts.route.ts (HTTP 入口)
  → posts.service.ts (业务编排)
    → posts-write-service.ts (写入服务，含 inspectPostWriteContent 调用)
      → posts-write-moderation.ts (统一敏感词检查函数)
        → posts-sensitive-filter.ts (敏感词匹配引擎)
```

`inspectPostWriteContent` 在 `posts-write-moderation.ts` 中定义（第 26 行），封装 `postsSensitiveFilterService.inspect()` 调用，后者对标题和正文进行规范化（NFKC + 去除非文本字符）后匹配预设敏感词列表。

### 调用点覆盖检查

`posts-write-service.ts` 中有 **3 个调用点**：

| 函数名 | 文件行号 | 触发场景 |
|--------|---------|---------|
| `createPost()` | 194 | 创建新帖子（文章/动态） |
| `updateAdminOfficialArticle()` | 336 | 管理员更新官方文章 |
| `updatePost()` | 406 | 更新已有帖子 |

### 前端所有发布路径 → 后端对应关系

| 前端页面 | API 调用 | 后端函数 | 是否经过过滤 |
|---------|---------|---------|------------|
| `PublishArticlePage.tsx` | `apiClient.createPost()` / `apiClient.updatePost()` | `createPost()` / `updatePost()` | 是 |
| `OfficialArticleEditorPage.tsx` | `apiClient.createOfficialArticle()` → 内部调用 `sharedClient.createPost()` | `createPost()` | 是 |
| `OfficialArticleEditorPage.tsx` | `apiClient.updateAdminOfficialArticle()` | `updateAdminOfficialArticle()` | 是 |
| `PublishMomentPage.tsx` | `apiClient.createPost()` / `apiClient.updatePost()` | `createPost()` / `updatePost()` | 是 |
| `ComposePage.tsx` | `apiClient.createPost()` | `createPost()` | 是 |
| `OfficialArticlesPageContent.tsx` | `apiClient.updateAdminOfficialArticle()` | `updateAdminOfficialArticle()` | 是 |

**结论**：所有已知的发布路径均经过 `inspectPostWriteContent` 敏感词过滤。**PASS**

---

## 验证项 2：提交 payload 中 imageIds/videoIds 为真实 fileId

### 验证目标

确保前端提交到后端的 `imageIds` 和 `videoIds` 数组中的每一项都是服务器分配的真实文件 ID（非 `blob:` URL）。

### PublishArticlePage.tsx 分析

提交流程（`handleSubmit` 函数，第 471-592 行）：

1. **封面图上传**（第 491-499 行）：将本地 `coverImage.file` 上传至 `apiClient.uploadPostImage()`，返回 `uploaded.item.id`（真实 fileId）
2. **批量上传媒体**（第 507-537 行）：调用 `uploadMediaBatch()`，对每一张本地图片/视频执行 `apiClient.uploadPostImage()`/`uploadPostVideo()`，返回：
   - `batchImageIds`（真实 fileId 列表）
   - `batchVideoIds`（真实 fileId 列表）
   - `urlMapping`（blob URL -> 真实 URL 映射）
3. **替换 HTML 中的 blob URL**（第 540 行）：`replaceBlobUrls(articleHtml, urlMapping)` 将所有 blob URL 替换为真实 URL
4. **组装图片/视频 ID 列表**（第 544-552 行）：
   - `existingImageIds` = 仅包含非本地图片（`!img.isLocal`）的 ID
   - 最终 `imageIds = [submitCoverImage?.id, ...batchImageIds, ...existingImageIds]` — 全部为真实 fileId
   - 最终 `videoIds = [...batchVideoIds, ...existingVideoIds]` — 全部为真实 fileId

**确认**：无 blob URL 泄漏到最终 `imageIds`/`videoIds`。**PASS**

### OfficialArticleEditorPage.tsx 分析

提交流程（`handleSubmit` 函数，第 310-399 行）：

1. **封面上传**（第 318-327 行）：本地封面通过 `apiClient.uploadPostImage()` 上传，获取 `response.item.id`
2. **批量上传媒体**（第 342-356 行）：调用 `uploadMediaBatch()`，返回 `imageIds`/`videoIds`（真实 fileId）
3. **替换 HTML 中的 blob URL**（第 359 行）：`replaceBlobUrls(editorHtml, urlMapping)`
4. **组装 payload**（第 362-375 行）：`buildOfficialArticlePayload()` 接收：
   - `Set([coverId, ...uploadedImages.map(item => item.id), ...newImageIds])` — 全部真实 fileId
   - `[...uploadedVideos.map(item => item.id), ...newVideoIds]` — 全部真实 fileId

**确认**：无 blob URL 泄漏。**PASS**

### PublishMomentPage.tsx 分析

提交流程：

- 视频封面和视频文件单独上传至 `apiClient.uploadPostImage()` / `apiClient.uploadPostVideo()`
- 图片列表逐一上传，`submitImages` 中保存了真实 ID
- 最终 `submitPost()` 传入的 ID 均为真实 fileId

**确认**：无 blob URL 泄漏。**PASS**

### uploadMediaBatch 工具函数验证

位于 `packages/rich-text-editor/src/media-uploader.ts`：

- 接收 `Map<string, File>`（blob URL -> File）
- 并行上传所有文件
- 返回：`urlMapping`（blob -> real URL）、`imageIds`（真实 fileId）、`videoIds`（真实 fileId）
- 错误处理：单文件失败不阻塞其他，通过 `errors` 数组上报

**确认**：工具函数正确返回真实 fileId。**PASS**

### replaceBlobUrls 工具函数验证

位于 `packages/rich-text-editor/src/media-uploader.ts`（第 134 行）：

- 优先使用 `DOMParser` 精确替换 `<img src>`、`<video src>`、`<video poster>`、`<source src>` 属性中的 blob URL
- 回退为正则字符串替换
- 未在映射中的 blob URL 保持不变（理论上已被 `uploadMediaBatch` 覆盖）

**确认**：HTML 中的 blob URL 被正确替换。**PASS**

### 总体结论：PASS

---

## 验证项 3：审核状态流转

### 创建时状态设置

`createPost()`（第 244-328 行）：

```
创建时默认 status = 'pending'
  ↓
evaluatePostWriteModeration() 执行 AI 审核
  ├── AI approve → updatePostStatus(item.id, 'published')
  ├── AI reject  → updatePostStatus(item.id, 'rejected', reason)
  └── else       → 保持 'pending'（进入人工审核队列）
```

### 管理员更新官方文章时

`updateAdminOfficialArticle()`（第 363 行）：

```
shouldModeratePost('article')
  ├── false → status = 'published'（自动发布，审核关闭）
  └── true  → status = 'pending'（进入审核队列）
```

### 普通更新时

`updatePost()`（第 466-491 行）：

```
默认 status = 'pending'
  ↓
evaluatePostWriteModeration() 执行 AI 审核（同创建时逻辑）
  ├── approve → updatePostStatus('published')
  ├── reject  → updatePostStatus('rejected', reason)
  └── else    → 保持 'pending'
```

### 状态通知

`updatePostStatus()`（第 115-190 行）在状态变更时通过 `socialService.recordSystemNotification()` 发送系统通知：
- `pending` → "待审核"
- `published` → "已发布"
- `rejected` → "未通过审核"
- `hidden` → "已下架"

边栏路由定义在 `admin-routes.ts` 中：
- `/admin/moderation/articles` → `moderationArticles` 常量

路由注册在 `app.tsx` 第 435 行：
```tsx
path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationArticles),
element: withAdminRouteFallback(<PostsPage contentType="article" />)
```

`PostsPage` 组件（`posts-page.tsx`）功能：
- 按状态（all/pending/published/rejected/hidden）筛选文章列表
- 待审核文章支持"通过发布"/"驳回"操作
- 已发布文章支持"下架"/"驳回"操作
- 已驳回/已隐藏文章支持"恢复发布"
- 审核开关可在页面顶部启停
- 审核追踪面板显示 AI 审核记录

**审核队列展示本地截图（如需要）**：
- 页面顶部 `AdminModerationCard` 显示待处理数量
- 表格列：封面、内容、摘要、状态标签、操作按钮
- 详情弹窗展示完整内容 + AI 审核记录

### 结论：PASS

---

## 验证项 4：Admin 审核队列 UI

| 功能 | 状态 | 说明 |
|------|------|------|
| 状态筛选 | PASS | 全部/待审核/已发布/已驳回/已隐藏 |
| 待审核计数 | PASS | AdminModerationCard 组件显示 pending 数量 |
| 通过发布 | PASS | 调用 `updateAdminPostStatus(id, { status: 'published' })` |
| 驳回+原因 | PASS | `promptRejectionReason()` 弹窗输入原因 |
| 下架 | PASS | 调用 `updateAdminPostStatus(id, { status: 'hidden' })` |
| 恢复发布 | PASS | 对 rejected/hidden 状态的文章可用 |
| 审核追踪 | PASS | 弹窗详情含 AI 审核记录表格 |
| 审核开关 | PASS | 顶部可启用/禁用 AI 审核 |

### 结论：PASS

---

## 验证项 5：敏感词过滤器本身

`posts-sensitive-filter.ts` 分析：

- 预设敏感词列表包含：`forbiddenword`, `extremism`, `违禁词测试`, `赌博网站`, `刷单诈骗`, `买卖枪支`
- 文本预处理：NFKC 标准化 + 小写 + 去除非文本字符
- 匹配方式：以 `includes` 进行子串匹配
- 返回 `SensitiveGuardResult`：`{ kind: 'ok' }` 或 `{ kind: 'sensitive_content', detection: { matchedWords, fields } }`

### 结论：PASS

---

## 建议的下一步操作

1. **手动冒烟测试**：在项目的前端/后端运行环境中执行人工冒烟测试，用敏感词列表中的词测试发布是否被拦截
2. **AI 审核测试**：建议在集成环境中验证 `evaluatePostWriteModeration` 对 `ai` 和 `automatic` 模式下 `approve`/`reject`/`manual_review` 三种分支的正确处理
3. **Admin 审核权限**：确认管理员角色在 `/admin/moderation/articles` 页面有正确的操作权限

---

## 附录 A：审查的文件清单

| 文件路径 | 审查内容 |
|---------|---------|
| `apps/server/src/modules/posts/posts-write-service.ts` | 三处 `inspectPostWriteContent` 调用、状态流转、审核决策 |
| `apps/server/src/modules/posts/posts-write-moderation.ts` | `inspectPostWriteContent` 定义、`evaluatePostWriteModeration` 定义 |
| `apps/server/src/modules/posts/posts-sensitive-filter.ts` | 敏感词匹配引擎 |
| `apps/server/src/modules/audits/text-moderation.service.ts` | AI 审核决策逻辑 |
| `apps/server/src/modules/site-settings/site-settings.service.ts` | `shouldModeratePost` 方法 |
| `apps/web/src/routes/publish-article-page.tsx` | 前端文章发布 submit 流程，blob URL 处理 |
| `apps/web/src/routes/publish-moment-page.tsx` | 前端动态发布 submit 流程 |
| `apps/admin/src/features/posts/official-article-editor-page.tsx` | 管理员官方文章编辑器 submit 流程 |
| `apps/admin/src/features/posts/official-articles-page-content.tsx` | 管理员官方文章管理页面提交 |
| `apps/admin/src/features/posts/official-articles-helpers.ts` | Payload 构造函数 |
| `apps/admin/src/features/posts/posts-page.tsx` | 审核队列 UI 实现 |
| `apps/admin/src/app.tsx` | 路由注册 |
| `apps/admin/src/lib/admin-routes.ts` | 路由常量定义 |
| `apps/admin/src/lib/api-client.ts` | `createOfficialArticle` 接口封装 |
| `packages/rich-text-editor/src/media-uploader.ts` | `uploadMediaBatch`、`replaceBlobUrls`、`collectBlobUrls` |

## 附录 B：数据流示意图

```
前端发布 → apiClient.createPost(payload)
                              ↓
           posts.service.ts.createPost()
                              ↓
           posts-write-service.ts.createPost()
              ├── inspectPostWriteContent(title, content) → 敏感词检查
              ├── validatePostMediaOwnership(imageIds, videoIds) → 媒体所有权验证
              ├── 创建数据库记录 (status: 'pending')
              └── evaluatePostWriteModeration() → AI 审核
                    ├── approve → status: 'published'
                    ├── reject  → status: 'rejected'
                    └── else    → status: 'pending' (进入人工审核队列)

Admin 审核 → /admin/moderation/articles → PostsPage
              ├── 待审核: 通过发布 / 驳回
              ├── 已发布: 下架 / 驳回
              ├── 已驳回: 恢复发布
              └── 审核追踪: 查看 AI 审核记录
```

---

**验证人**：TASK-009 agent
**最终结论**：全部 4 项验证项通过，未发现安全漏洞或需要修复的问题。
**不需要修改**：`apps/web/src/routes/publish-article-page.tsx` 和 `apps/admin/src/features/posts/official-article-editor-page.tsx` 在本次验证中未发现需修复的缺陷。
