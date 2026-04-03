# 后续优化任务分解

> **生成日期**: 2026-04-03  
> **需求来源**: 代码审查修复后的后续优化建议  
> **需求文档路径**: `docs/review/code-review-fixes-final.md`

---

## 任务概览

| 优先级 | 数量 | 类型 |
|--------|------|------|
| 高 (High) | 2 | 重构 / 安全 |
| 中 (Medium) | 2 | 类型安全 / 功能实现 |
| **合计** | **4** | — |

---

## 任务分解列表

### OPT-001 [重构] 评论序列化逻辑复用

- **类型**: refactor
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/modules/posts/posts.service.ts` — serializeCommentThreads, serializeSingleComment, buildReplyToUserMap
  - `apps/server/src/modules/reviews/reviews.service.ts` — serializeComment, serializeCommentThreads, buildReplyToUserMap
  - `apps/server/src/modules/rankings/rankings.service.ts` — serializeRankingComment, buildRatingTargetCommentThreads
- **完成标准**:
  1. 在 `apps/server/src/lib/` 创建共享评论序列化工具 `comment-serializer.ts`
  2. 提取通用函数：`serializeCommentBase()`, `buildCommentThreads()`, `buildReplyToUserMap()`
  3. posts/reviews/rankings 三个模块复用共享工具
  4. 序列化输出行为不变
  5. 类型检查通过
- **风险说明**:
  - ⚠️ 三个模块的评论结构略有差异（如 ratingTarget 有 rating 字段），需要设计灵活的泛型接口
  - ⚠️ 重构后需确保所有调用方行为不变

### OPT-002 [类型] 类型断言优化

- **类型**: quality
- **优先级**: medium
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.repo.ts` — 多处 `as AuthRole`、`as SessionScope`
  - `apps/server/src/modules/posts/posts.service.ts` — `as PostType`、`as PostStatus`、`as "user" | "admin"`
  - `apps/server/src/modules/reviews/reviews.service.ts` — `as "user" | "admin"`
  - `apps/server/src/modules/rankings/rankings.service.ts` — 多处类型断言
- **完成标准**:
  1. 创建类型守卫函数（如 `isValidAuthRole()`, `isValidPostStatus()`）
  2. 在数据库查询结果映射处使用类型守卫替代 `as` 断言
  3. 对于确实需要的断言（如数据库字符串转枚举），添加注释说明
  4. 类型检查通过
- **风险说明**:
  - 低风险纯重构
  - 部分断言是因为数据库 schema 使用 `text()` 类型，无法在编译时推断枚举

### OPT-003 [功能] 短信服务商实现

- **类型**: feature
- **优先级**: medium
- **涉及文件**:
  - `apps/server/src/modules/auth/sms-provider.ts` — 当前仅 mock，aliyun/tencent 抛出未实现错误
  - `apps/server/package.json` — 可能需要添加阿里云/腾讯云 SDK
- **完成标准**:
  1. 实现阿里云短信发送逻辑（使用 `@alicloud/dysmsapi20170525` SDK）
  2. 实现腾讯云短信发送逻辑（使用 `tencentcloud-sdk-nodejs` SDK）
  3. 保持 mock 模式用于开发环境
  4. 错误处理完善（网络超时、配额不足等）
  5. 类型检查通过
- **风险说明**:
  - ⚠️ 需要安装第三方 SDK，增加依赖体积
  - ⚠️ 需要真实的阿里云/腾讯云账号才能测试
  - ⚠️ 建议先实现框架，实际 SDK 调用可留待生产环境配置

### OPT-004 [安全] XSS 防护

- **类型**: security
- **优先级**: high
- **涉及文件**:
  - `apps/web/src/components/rich-text-editor.tsx` — 富文本编辑器输出
  - `apps/web/src/routes/post-detail-page.tsx` — 帖子详情渲染
  - `apps/web/src/routes/model-detail-page.tsx` — 机型详情渲染
  - `apps/web/src/routes/circle-page.tsx` — 圈子页面
  - `apps/web/src/features/posts/post-interaction-bar.tsx` — 互动组件
- **完成标准**:
  1. 安装 `dompurify` 库用于 HTML 清理
  2. 所有 `dangerouslySetInnerHTML` 使用前经过 DOMPurify 清理
  3. 富文本编辑器输出在后端存储 `contentHtml` 时进行清理
  4. 用户输入的 displayName、bio、评论内容等在渲染前转义
  5. 类型检查通过
- **风险说明**:
  - ⚠️ DOMPurify 是浏览器端库，需要确认 SSR 兼容性
  - ⚠️ 后端也需要 HTML 清理（防止恶意 HTML 存储到数据库）
  - ⚠️ 需要平衡安全性与富文本功能（如保留合法的 `<a>`, `<img>`, `<strong>` 标签）

---

## 推荐执行顺序

### 并行执行（无依赖关系）

```
智能体A: 评论序列化逻辑复用 ──┐
智能体B: 类型断言优化 ────────┤── 可并行
智能体C: 短信服务商实现 ──────┤
智能体D: XSS 防护 ───────────┘
```

### 执行后验证

```
所有智能体完成 → 类型检查 → 单元测试 → 最终审查
```

---

## 智能体分工

| 智能体 | 任务 | 类型 |
|--------|------|------|
| `backend_implementer` | OPT-001 评论序列化逻辑复用 | 后端重构 |
| `backend_implementer` | OPT-002 类型断言优化 | 后端质量 |
| `backend_implementer` | OPT-003 短信服务商实现 | 后端功能 |
| `frontend_implementer` | OPT-004 XSS 防护 | 前端安全 |

---

> **备注**: 所有任务均为优化性变更，应保持最小影响范围，确保向后兼容。
