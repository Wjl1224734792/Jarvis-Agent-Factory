# OPT-002 类型断言优化 — 后端实现文档

## 实现目标

消除 `apps/server/src/modules/` 中大量使用 `as AuthRole`、`as PostStatus`、`as "user" | "admin"` 等类型断言绕过 TypeScript 类型检查的问题，改为使用运行时类型守卫函数，确保枚举值合法性在运行时得到验证。

## 变更文件

### 新建文件

| 文件 | 说明 |
|------|------|
| `apps/server/src/lib/type-guards.ts` | 类型守卫工具模块，包含所有枚举类型的运行时验证函数 |

### 修改文件

| 文件 | 变更说明 |
|------|----------|
| `apps/server/src/lib/comment-serializer.ts` | 添加 `isValidAuthRole` 导入，替换 `buildReplyToUserMap` 中的 `as` 断言 |
| `apps/server/src/modules/auth/auth.repo.ts` | 替换 5 处 `as AuthRole` / `as SessionScope` 断言 |
| `apps/server/src/modules/posts/posts.service.ts` | 替换 10+ 处 `as PostType` / `as PostStatus` / `as PostCommentStatus` / `as "user"\|"admin"` 断言 |
| `apps/server/src/modules/reviews/reviews.service.ts` | 替换 8 处 `as "user"\|"admin"` / `as "pending"\|"visible"\|"hidden"` 断言 |
| `apps/server/src/modules/rankings/rankings.service.ts` | 替换 30+ 处 `as RankingType` / `as RankingStatus` / `as RatingTargetStatus` / `as "user"\|"admin"` / `as RankingCommentStatus` 断言 |
| `apps/server/src/modules/social/social.service.ts` | 替换 11 处 `as "user"\|"admin"` / `as PostType` / `as PostStatus` / `as RankingStatus` / `as AircraftSubmissionStatus` / `as BrandApplicationStatus` 断言 |

## 实现说明

### type-guards.ts 设计

```
type-guards.ts
├── 基础类型守卫
│   ├── isValidAuthRole(value) → value is AuthRole
│   ├── isValidPostType(value) → value is PostType
│   ├── isValidPostStatus(value) → value is PostStatus
│   ├── isValidPostCommentStatus(value) → value is PostCommentStatus
│   ├── isValidPostInteractionType(value) → value is PostInteractionType
│   ├── isValidFeedTab(value) → value is FeedTab
│   └── isValidCommentSort(value) → value is CommentSort
├── 评测相关
│   ├── isValidReviewStatus(value) → value is ReviewStatus
│   └── isValidReviewCommentStatus(value) → value is ReviewCommentStatus
├── 排行相关
│   ├── isValidRankingType(value) → value is RankingType
│   ├── isValidRankingStatus(value) → value is RankingStatus
│   ├── isValidRankingCommentStatus(value) → value is RankingCommentStatus
│   └── isValidRatingTargetAddPolicy(value) → value is RatingTargetAddPolicy
├── 社交相关
│   ├── isValidNotificationType(value) → value is NotificationType
│   └── isValidProfileVisibility(value) → value is ProfileVisibility
├── 机型/品牌相关
│   ├── isValidAircraftSubmissionStatus(value) → value is AircraftSubmissionStatus
│   └── isValidBrandApplicationStatus(value) → value is BrandApplicationStatus
├── 本地类型守卫
│   └── isValidSessionScope(value) → value is "web" | "admin" | "app"
└── 安全断言辅助
    └── safeAssertEnum(value, validValues, fallback) → T
```

### 替换策略

1. **数据库 text 字段转枚举**：使用 `isValidXxx(value) ? value : ("fallback" satisfies Type)` 模式，在运行时验证数据库返回的字符串值是否为合法枚举值，若不合法则回退到默认值。

2. **已知安全值**：对于从已知常量或已验证输入派生的值，保留 `as const` 断言（如 `{ kind: "ok" as const }`），这些不是枚举验证场景。

3. **泛型类型收窄**：对于 `buildSet` 等泛型函数调用中的结构类型断言（如 `reportedItemRows as Array<{ ratingTargetId: string }>`），保留原样并添加注释，因为数据形状由 repo 层保证，不属于枚举验证范畴。

### 保留的 `as` 断言

以下场景保留了 `as` 断言，因为它们是合理的类型收窄而非枚举验证：

- `as const` 字面量断言（如 `{ kind: "ok" as const }`）
- 泛型函数的结构类型断言（如 `reportedItemRows as Array<{ ratingTargetId: string }>`）
- 已知安全值的类型收窄

## 测试验证结果

```bash
$ bun run typecheck
# 全部 7 个项目 typecheck 通过，无错误

$ bun run lint
# 无新增 lint 错误（已有 lint 问题均为 pre-existing，与本次变更无关）
```

## 数据与接口边界

### 类型守卫覆盖的枚举值

| 类型 | 合法值 | 默认回退值 |
|------|--------|-----------|
| `AuthRole` | `"user"`, `"admin"` | `"user"` |
| `PostType` | `"article"`, `"moment"` | `"article"` |
| `PostStatus` | `"pending"`, `"published"`, `"rejected"`, `"hidden"` | `"pending"` |
| `PostCommentStatus` | `"pending"`, `"visible"`, `"hidden"` | `"visible"` |
| `ReviewStatus` / `ReviewCommentStatus` | `"pending"`, `"visible"`, `"hidden"` | `"visible"` |
| `RankingType` | `"official"`, `"community"` | `"community"` |
| `RankingStatus` | `"pending"`, `"published"`, `"rejected"`, `"hidden"` | `"published"` |
| `RankingCommentStatus` | `"pending"`, `"visible"`, `"hidden"` | `"visible"` |
| `RatingTargetAddPolicy` | `"public"`, `"owner"` | `"owner"` |
| `SessionScope` | `"web"`, `"admin"`, `"app"` | `"web"` |
| `AircraftSubmissionStatus` | `"draft"`, `"submitted"`, `"approved"`, `"rejected"` | `"draft"` |
| `BrandApplicationStatus` | `"pending"`, `"approved"`, `"rejected"`, `"hidden"` | `"pending"` |

### 运行时行为

所有类型守卫均为纯函数，不改变任何运行时行为。当遇到非法枚举值时，回退到默认值而非抛出异常，确保向后兼容。

## 风险项

1. **默认回退值**：如果数据库中存在脏数据（非法枚举值），类型守卫会静默回退到默认值，不会产生运行时错误但可能导致业务逻辑异常。建议在后续迭代中添加数据校验和清理。

2. **`comment-serializer.ts` 共享模块**：该模块被 posts/reviews/rankings 三个模块引用，修改其 `buildReplyToUserMap` 函数时已确保向后兼容。

## 需前端配合点

无。本次变更仅涉及后端类型安全优化，不改变 API 契约、响应格式或数据库结构，前端无需任何调整。
