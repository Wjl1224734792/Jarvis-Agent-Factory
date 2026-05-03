# OPT-001 评论序列化逻辑复用 — 后端实现文档

## 实现目标

消除 `posts`、`reviews`、`rankings` 三个模块中重复的评论序列化代码，提取共享工具到 `apps/server/src/lib/comment-serializer.ts`，实现：

1. **`buildReplyToUserMap()`** — 构建回复目标用户映射（同步版本）
2. **`buildReplyToUserMapAsync()`** — 构建回复目标用户映射（异步版本，支持 avatarUrl 等异步解析）
3. **`buildCommentThreads()`** — 将扁平评论列表组装为树形结构（根评论 + 回复列表 + replyCount）

## 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/server/src/lib/comment-serializer.ts` | 新建 | 共享评论序列化工具 |
| `apps/server/src/modules/posts/posts.service.ts` | 修改 | 删除本地 `buildReplyToUserMap`，重构 `serializeCommentThreads` 使用 `buildCommentThreads` |
| `apps/server/src/modules/reviews/reviews.service.ts` | 修改 | 重构 `buildReplyToUserMap` 使用 `buildReplyToUserMapAsync`，重构 `serializeCommentThreads` 使用 `buildCommentThreads` |
| `apps/server/src/modules/rankings/rankings.service.ts` | 修改 | 重构 `buildRatingTargetCommentThreads` 使用 `buildCommentThreads` |

## 实现说明

### 共享工具设计 (`comment-serializer.ts`)

```
comment-serializer.ts
├── 类型定义
│   ├── ReplyToUser              — 最小公共回复用户结构（无 avatarUrl）
│   ├── ReplyToUserWithAvatar    — 带 avatarUrl 的扩展结构
│   ├── ThreadableComment        — 可组装为树的评论接口（id + parentCommentId）
│   ├── CommentThread<T>         — 带 replyCount + replies 的评论线程节点
│   └── CommentComparator<T>     — 排序比较函数类型
├── buildReplyToUserMap<T>()     — 同步版本，posts 使用
├── buildReplyToUserMapAsync<T, R>() — 异步版本，reviews/rankings 使用
└── buildCommentThreads<T>()     — 通用评论树构建
```

**关键设计决策：**

1. **泛型约束**：`buildCommentThreads<T extends ThreadableComment>` 通过接口约束确保泛型 T 至少包含 `id` 和可选的 `parentCommentId`，各模块可自由扩展额外字段（如 `postId`、`reviewId`、`ratingTargetId`、`rating` 等）。

2. **同步 vs 异步**：
   - `buildReplyToUserMap`（同步）：posts 模块不需要异步解析 avatarUrl
   - `buildReplyToUserMapAsync`（异步 + transform 回调）：reviews/rankings 需要异步解析 avatarUrl，通过回调注入转换逻辑

3. **排序可选**：`buildCommentThreads` 接受可选的 `compare` 比较函数
   - posts 支持 `hot`（likeCount 降序）和 `latest`（createdAt 降序）
   - reviews 不排序（不传 compare）
   - rankings 固定 hot 排序

### 各模块重构方式

#### posts.service.ts
- 删除本地 `buildReplyToUserMap`，改用 `import { buildReplyToUserMap } from "../../lib/comment-serializer"`
- 提取 `serializeCommentBase()` 辅助函数处理单条评论序列化
- `serializeCommentThreads` 改为：先 map 序列化所有评论，再调用 `buildCommentThreads(serialized, { compare })`
- `serializeSingleComment` 保持不变（单条序列化逻辑不变）

#### reviews.service.ts
- 本地 `buildReplyToUserMap` 改为薄封装：调用共享 `buildReplyToUserMapAsync` + avatarUrl 解析回调
- 提取 `serializeCommentBase()` 处理单条评论序列化
- `serializeComment` 改为调用 `serializeCommentBase`
- `serializeCommentThreads` 改为：`Promise.all` 序列化所有评论，再调用 `buildCommentThreads(serialized)`

#### rankings.service.ts
- 提取 `serializeRatingTargetCommentBase()` 处理单条评论序列化
- `buildRatingTargetCommentThreads` 改为：`Promise.all` 序列化所有评论，再调用 `buildCommentThreads(serialized, { compare })`

## 测试验证结果

```bash
$ bun run typecheck
# 全部 7 个子项目通过，无类型错误

$ bun run --cwd apps/server typecheck
# server 项目单独验证通过
```

## 数据与接口边界

### 序列化输出 JSON 结构（保持不变）

**posts 评论输出：**
```typescript
{
  id, postId, parentCommentId, replyToCommentId, content, status,
  createdAt, updatedAt, likeCount, reportCount,
  author: { id, displayName, role },
  replyToUser: { id, displayName, role } | null,
  viewer: { canEdit, canDelete, hasLiked, hasReported },
  // 根评论额外字段:
  replyCount: number,
  replies: [...]
}
```

**reviews 评论输出：**
```typescript
{
  id, reviewId, parentCommentId, replyToCommentId, content, status,
  createdAt, updatedAt, likeCount, reportCount,
  author: { id, displayName, avatarUrl, role },
  replyToUser: { id, displayName, avatarUrl, role } | null,
  viewer: { canEdit, canDelete, hasLiked, hasReported },
  replyCount, replies
}
```

**rankings 评论输出：**
```typescript
{
  id, ratingTargetId, parentCommentId, replyToCommentId, content, status,
  rating: number | null,
  createdAt, updatedAt, likeCount, reportCount,
  author: { id, displayName, avatarUrl, role },
  replyToUser: { id, displayName, avatarUrl, role } | null,
  viewer: { canEdit, canDelete, hasLiked, hasReported },
  replyCount, replies
}
```

### API 边界
- 所有对外 API 响应结构不变，前端无需任何改动
- 共享工具位于 `apps/server/src/lib/`，不暴露为公共包

## 风险项

| 风险 | 评估 | 缓解 |
|------|------|------|
| `buildCommentThreads` 中 `[...replies].sort()` 创建新数组 | 低 — 原代码直接 mutate 原数组，新版更安全 | 行为等价 |
| reviews 模块 `serializeCommentBase` 中 `await resolveAuthorAvatar()` 在 `Promise.all` 中并行执行 | 无风险 — 与原 `serializeCommentThreads` 中的 `await` 语义一致 | 性能更优 |
| rankings 模块 `serializeRatingTargetCommentBase` 中 `await resolveUploadedFileUrl()` 在 `Promise.all` 中并行执行 | 无风险 | 性能更优 |

## 需前端配合点

**无。** 本次重构仅涉及后端内部代码组织优化，序列化输出的 JSON 结构、API 路由、请求/响应契约均保持不变。前端无需任何修改。
