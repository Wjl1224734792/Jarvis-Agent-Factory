# 2026-04-19 Admin Message Audit Center Frontend Implementation

## 1. 当前实现目标
- 完成 `TASK-AMAC-004`：将 `apps/admin` 壳层与首页调整为更传统的 Ant Design 后台布局。
- 完成 `TASK-AMAC-003`：接入 admin 消息中心与审核待办页面，消费共享 typed client 与 schema。
- 完成 `TASK-AMAC-005`：把消息中心、首页待办与关键审核页通过统一 query 协议接线，确保可以落到现有审核上下文。

## 2. 输入依据
- `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- `docs/plans/2026-04-19-admin-message-audit-center-plan.md`
- 后端已交付的共享契约与接口：
  - `API_ROUTES.admin.messages`
  - `API_ROUTES.admin.messagesReadAll`
  - `API_ROUTES.admin.messageRead(id)`
  - `API_ROUTES.admin.messageTodos`
  - `listAdminMessages`
  - `listAdminModerationTodos`
  - `markAdminMessageRead`
  - `markAllAdminMessagesRead`

## 3. 工作区模式
- 仅在 `apps/admin/**` 与 implementation 文档路径内改动。
- 未修改 `packages/*`、`apps/server/*`、根配置、README、`.env.example`。
- 继续沿用 Ant Design，不引入新主 UI 框架。

## 4. 变更文件 / 变更范围
- `apps/admin/src/app.tsx`
- `apps/admin/src/lib/admin-routes.ts`
- `apps/admin/src/lib/api-client.ts`
- `apps/admin/src/features/auth/admin-navigation.ts`
- `apps/admin/src/features/auth/admin-shell.tsx`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/styles.css`
- `apps/admin/src/features/messages/admin-message-navigation.ts`
- `apps/admin/src/features/messages/admin-messages-page.tsx`
- `apps/admin/src/features/messages/admin-moderation-todos-page.tsx`
- `apps/admin/src/features/posts/posts-page.tsx`
- `apps/admin/src/features/posts/post-comments-page.tsx`
- `apps/admin/src/features/reviews/reviews-page.tsx`
- `apps/admin/src/features/rankings/rankings-page.tsx`
- `apps/admin/src/features/rankings/rating-targets-page.tsx`
- `apps/admin/src/features/models/brand-applications-page.tsx`
- `apps/admin/src/features/submissions/aircraft-submissions-page.tsx`
- `apps/admin/tests/admin-navigation.test.ts`
- `apps/admin/tests/admin-message-navigation.test.ts`

## 5. 实现说明

### 5.1 壳层与信息架构
- 使用 `Layout + Header + Sider + Menu + Content` 收束后台骨架。
- 顶部保留搜索、当前管理员和退出入口，同时把“消息中心 / 审核待办”变成真实导航入口。
- 左侧导航增加“消息中心”“审核待办”两个一级入口，并保留原有审核 / 运营 / 管理分区。
- 首页首屏重排为：
  - KPI
  - 待办总览
  - 最近通知
  - 快捷入口
  - 现有审核开关矩阵

### 5.2 消息中心与待办
- 新增 `AdminMessagesPage`
  - 展示未读消息、待处理总数、筛选结果数
  - 支持按 `readStatus`、`domain`、`type` 筛选
  - 支持单条已读、批量已读
  - 支持从消息跳转到对应审核页
- 新增 `AdminModerationTodosPage`
  - 展示待处理总数、待办域数量、关联未读消息数
  - 复用后端 `messageTodos` 聚合结果
  - 明确“待办独立于已读”

### 5.3 跳转与筛选协议
- 在 `admin-message-navigation.ts` 中统一管理：
  - domain 显示文案
  - 消息类型文案
  - canonical 落点
  - query key
  - 消息 / 待办跳转解析
- 关键做法是以前端 canonical 路由为准，而不是盲信后端返回的历史 alias 路径。
- 已接入或桥接的落点包括：
  - `posts`
  - `post_comments`
  - `model_comments`
  - `reviews`
  - `review_comments`
  - `rankings`
  - `ranking_comments`
  - `rating_targets`
  - `rating_target_comments`
  - `aircraft_submissions`
  - `brand_applications`

### 5.4 关键审核页接线
- 通过 `PreserveSearchNavigate` 和现有 `status` 协议，把 shared alias 路由桥接到 canonical 审核页。
- 在已有审核页里复用现有 `status` 查询参数，并补充 `targetId` / `rankingId` 等上下文字段传递能力。
- 对评论域统一回落到评论审核页，并通过 `domain` 参数区分来源。

## 6. 人工回归证据

### 真实后台回归
- 命令：
  - `python E:\CodeStore\feijia\.codex\skills\webapp-testing\scripts\with_server.py --server "bun run dev:server" --port 17382 --timeout 120 --server "bun run --cwd apps/admin preview --host 127.0.0.1 --port 17381" --port 17381 --timeout 120 -- node scripts/admin_manual_regression.mjs`
- 回归路径：
  1. 登录后台
  2. 进入首页
  3. 通过后台真实接口生成两条 admin inbox 消息
  4. 打开待办页并验证落点 URL
  5. 在消息中心执行单条已读
  6. 验证待办计数在单条已读后不变
  7. 再生成一条新消息并执行批量已读
  8. 验证待办计数在批量已读后不变
  9. 从消息中心点击“去处理”跳回审核页
- 结果：
  - `login = true`
  - `overview = true`
  - `generatedMessage = true`
  - `singleRead = true`
  - `bulkRead = true`
  - `messageNavigation = true`
  - `todoNavigation = true`
  - `todoStableAfterSingleRead = true`
  - `todoStableAfterBulkRead = true`
  - 关键落点：
    - `overview:http://localhost:17381/admin/overview`
    - `todoNavigation:http://localhost:17381/admin/moderation/articles?status=pending`
    - `messageNavigation:http://localhost:17381/admin/moderation/aircraft-submissions?status=approved&targetId=seed_submission_submitted`

## 7. 审查与优化

### 功能
- 消息中心、待办页、首页摘要与审核页之间已形成闭环，不再是占位入口。
- 统一跳转 helper 让前端不再散落拼接目标路径和筛选参数。

### 架构
- 管理端继续只通过 `@feijia/http-client` 与 `@feijia/schemas` 消费数据。
- 跳转协议和 query key 收敛到 `features/messages/admin-message-navigation.ts`，避免页面级重复定义。

### 性能
- 首页只消费必要的消息摘要与待办聚合，不把完整消息列表塞进 overview。
- 消息页与待办页分开查询，避免一个页面承载全部 admin 消息逻辑。

### 注释
- 保持与仓库现有 admin 前端风格一致，避免无信号注释。
- 关键边界通过 helper 命名与实现拆分表达；本轮补充了关键 helper 的边界注释，而不是堆砌解释性注释。

## 8. 验证结果

### antd CLI
- `antd.cmd lint E:\CodeStore\feijia\apps\admin\src --format json`
  - 通过，`0 issues`

### admin 定向验证
- `bunx vitest run --config vitest.config.ts apps/admin/tests/admin-navigation.test.ts apps/admin/tests/admin-password-route.test.ts apps/admin/tests/admin-auth-redirects.test.ts apps/admin/tests/admin-message-navigation.test.ts`
  - 通过（4 files / 10 tests）
- `bun run --cwd apps/admin typecheck`
  - 通过
- `bun run --cwd apps/admin build`
  - 通过

### 根级验证
- `bun run lint`
  - 通过
- `bun run typecheck`
  - 通过
- `bun run test`
  - 通过
- `bun run build`
  - 通过

## 9. 风险 / 未解决项
- `styles.css` 历史样式较多，本轮通过覆盖式收敛完成目标，尚未做系统性瘦身。
- 消息中心当前默认展示所有已支持 domain；若未来要把“仅待办域”和“系统消息域”进一步分开，可以再做产品层细化。
- 首页“最近通知”已接真实消息数据，但仍按管理后台信息密度策略做了较轻展示，没有复刻终端消息流样式。

## 10. 推荐的下一步
1. 合流后执行根级 `lint / typecheck / test / build`。
2. 进入 `review_qa` 做结构、功能、性能与注释审查。
3. 如需继续演进，可把消息中心补上搜索词过滤、分组折叠或更精细的批量操作。
