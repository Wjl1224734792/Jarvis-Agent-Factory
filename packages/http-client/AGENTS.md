<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# @feijia/http-client

## Purpose
基于 `@feijia/schemas` 的 API 调用封装。单一文件集中管理全部 HTTP 请求方法，`apps/web` 和 `apps/admin` 通过此包与后端通信。

## Key Files

| File | Description |
|------|-------------|
| `src/index.ts` | 全部 API 方法（~82KB），按领域分组 |

## 方法组织

| 领域 | 方法前缀 | 涵盖 |
|------|---------|------|
| Auth | `login`/`register`/`refresh`/`logout`/`changePassword` | 认证流程 |
| Captcha | `requestCaptchaChallenge`/`sendSmsCode` | 验证码 |
| Users | `getCurrentUser`/`updateProfile`/`getUserProfile`/`listUsers` | 用户 |
| Models | `listModels`/`getModel`/`createModel`/`updateModel`/`compareModels` | 飞行器 |
| Circles | `listCircles`/`getCircleDetail`/`createCircle`/`joinCircle`/`createCirclePost`/`listCircleFeed` 等 | 飞友圈 |
| Posts | `listPosts`/`createPost`/`getPost`/`updatePost`/`deletePost` | 帖子 |
| Comments | `createPostComment`/`listPostComments`/`updateCommentStatus` | 评论 |
| Rankings | `listRankings`/`createRanking`/`updateRanking`/`addRatingTarget` | 榜单 |
| Brands | `listBrands`/`createBrand`/`applyBrand` | 品牌 |
| Reviews | `listReviews`/`createReview` | 评审 |
| Notifications | `listNotifications`/`getUnreadCount`/`markRead` | 通知 |
| Admin Messages | `listAdminMessages`/`getAdminMessageSummary`/`markAdminMessageRead` | 管理消息 |
| Uploads | `initUpload`/`completeUpload` | 文件上传 |
| Search | `search` | 搜索 |
| AI | `aiFormat` | AI 排版 |
| Site Settings | `getSiteSettings`/`updateSiteSettings` | 站点设置 |
| Moderation | `listReports`/`updateReportStatus`/`banUser` | 审核 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `tests/` | HTTP 客户端单元测试 |

## For AI Agents

### Working In This Directory
- 所有方法返回 schema 推导类型，调用方自动获得类型安全
- 新增 API 方法：先从 `@feijia/schemas` 确认对应 schema 已存在，再在此添加方法
- 方法命名：`动词 + 名词`，如 `createPost`、`listModels`、`getUserProfile`
- 管理端方法加 `admin` 前缀，如 `adminBanUser`、`adminListReports`

### Testing Requirements
- 新增方法应在 `tests/` 添加对应测试

### Common Patterns
- 使用 `apiClient.get/post/put/patch/delete` 基方法
- `apiClient` 自动处理 401 refresh、错误序列化
- 查询参数通过第二个参数传入

## Dependencies

### Internal
- `@feijia/schemas` — 请求/响应类型与校验

### External
- 自定义 `apiClient` 实例（自动 refresh、错误处理）
