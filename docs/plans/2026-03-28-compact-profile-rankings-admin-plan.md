# 紧凑资料页、去评分与 admin 路由修复实施计划

## 1. 需求文档路径
- `docs/requirements/2026-03-28-compact-profile-rankings-admin-requirements.md`

## 2. 任务文档路径
- `docs/tasks/2026-03-28-compact-profile-rankings-admin-tasks.md`

## 3. 当前轮次目标
- 在最小正确改动原则下，完成 web 紧凑布局收口、个人资料真实持久化、机型评论与榜单去评分、榜单分类改为“热门 / 最新”、发布页与榜单编辑页收口、以及 admin 根路由/兜底修复。
- 先稳定共享数据与契约，再推进依赖这些契约的后端接口和前端页面，避免前后端同时猜测结构。

## 4. 当前轮次范围
- `packages/db/src/**`
- `packages/schemas/src/auth.ts`
- `packages/schemas/src/reviews.ts`
- `packages/schemas/src/rankings.ts`
- `apps/server/src/modules/reviews/**`
- `apps/server/src/modules/rankings/**`
- `apps/server` 中用户资料读写相关模块与测试
- `apps/web/src/components/site-shell.tsx`
- `apps/web/src/components/publish-shell.tsx`
- `apps/web/src/components/page-skeletons.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/features/auth/profile-settings-state.ts`
- `apps/web/src/routes/notifications-page.tsx`
- `apps/web/src/routes/settings-page.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/ranking-item-detail-page.tsx`
- `apps/web/src/routes/models-page.tsx`
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/model-review-form.ts`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/routes/ranking-editor-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/admin/src/app.tsx`
- `apps/admin/src/features/reviews/reviews-page.tsx`

## 5. 完成标准
- 消息、个人中心、设置页主内容区具有明确 `min/max width`，并删除占位解释文案。
- 设置页移除“常驻机场”，个人资料支持头像、显示名、简介的真实持久化读写。
- 飞友圈、飞行器库、榜单页骨架屏列数与真实布局规则一致。
- 机型评论链路从数据库到契约到前后端页面均不再使用评分。
- 榜单链路从数据库到契约到前后端页面均不再使用评分；榜单分类为“热门 / 最新”，官方仅保留标签语义。
- 榜单条目详情不再展示评分和星星。
- 发布飞行器页封面改为图片或视频二选一；发布文章页补独立封面上传；创建榜单页补飞行器库搜索并收紧布局。
- admin `/` 不再落到默认 404，且存在明确兜底错误体验。
- 每个 `tdd` 任务具备可核对的 Red → Green 记录；每个 `test_after` 任务具备对应验证结果。

## 6. 是否需要先查阅 repo_explorer
- 不需要。
- 当前输入已给出关键路径、共享边界与事实约束，足以直接规划并交付实现代理。

## 7. 执行代理分工
### 任务包 P0：主会话编排与收口
- 责任方：主会话本地
- 内容：
  - 按本计划顺序启动实现代理。
  - 在共享区域变更稳定后再放行依赖任务。
  - 汇总验证结果并在所有有意义变更完成后调用 `review_qa`。
- 不写业务代码。

### 任务包 B1：共享数据与契约基线
- 责任方：`backend_implementer`
- 覆盖任务：`DB1`、`DB2`、`DB3`、`SC1`、`SC2`、`SC3`
- 目标：
  - 一次性收敛数据库、seed、共享 schema 的高冲突改动。
  - 为资料持久化、机型评论去评分、榜单去评分与分类切换提供稳定契约。
- 必须串行：`DB1 -> SC1 -> DB2 -> SC2 -> DB3 -> SC3`

### 任务包 B2：个人资料后端闭环
- 责任方：`backend_implementer`
- 覆盖任务：`BE1`
- 目标：
  - 在 B1 的用户资料契约稳定后，实现头像、显示名、简介的读取与保存闭环。

### 任务包 B3：机型评论去评分后端
- 责任方：`backend_implementer`
- 覆盖任务：`BE2`
- 目标：
  - 在 B1 的评论契约稳定后，移除评分输入输出、评分聚合与依赖。

### 任务包 B4：榜单去评分与分类切换后端
- 责任方：`backend_implementer`
- 覆盖任务：`BE3`
- 目标：
  - 在 B1 的榜单契约稳定后，输出“热门 / 最新”，并让官方仅作为标签透出。

### 任务包 F1：账户页与共享壳层紧凑化
- 责任方：`frontend_implementer`
- 覆盖任务：`FE1` 的账户相关部分、`FE3`
- 目标：
  - 收紧消息/个人中心/设置页布局。
  - 移除占位解释。
  - 接上真实资料读写并淘汰假本地草稿语义。
- 前置条件：
  - `FE1` 的纯布局清理可先做。
  - 资料保存交互必须等 `B2` 稳定后再接。

### 任务包 F2：骨架屏与模型页去评分
- 责任方：`frontend_implementer`
- 覆盖任务：`FE2`、`FE4`
- 目标：
  - 统一真实布局与 skeleton 列数规则。
  - 机型列表/详情/评论表单去评分，改成纯评论交互。
- 前置条件：
  - `FE2` 可先做。
  - `FE4` 必须等 `B3` 稳定后再接。

### 任务包 F3：榜单页与榜单编辑页收口
- 责任方：`frontend_implementer`
- 覆盖任务：`FE5`、`FE6` 中榜单编辑部分
- 目标：
  - 榜单列表/详情/条目详情切到“热门 / 最新”与官方标签语义。
  - 创建榜单页补飞行器库搜索与紧凑编辑布局。
- 前置条件：
  - 榜单页去评分与分类切换必须等 `B4` 稳定后再接。
  - 榜单编辑页搜索框可先做 UI，但若依赖新的榜单/机型契约字段，需等 `B4` 后联调。

### 任务包 F4：发布页收口与 admin 路由修复
- 责任方：`frontend_implementer`
- 覆盖任务：`FE6` 中发布页部分、`FE7`
- 目标：
  - 发布飞行器页封面改为图片或视频二选一。
  - 发布文章页补独立封面上传。
  - 修复 admin 根路由与兜底 404。
- 可与 F1/F2/F3 并行的前提：
  - 不修改它们已占用的共享文件。

## 8. 共享区域改动归属
- `packages/db/src/**`：唯一责任方为 `B1`，任何前端包不得修改。
- `packages/schemas/src/auth.ts`、`packages/schemas/src/reviews.ts`、`packages/schemas/src/rankings.ts`：唯一责任方为 `B1`。
- `apps/server/src/modules/reviews/**`：`B3` 唯一负责。
- `apps/server/src/modules/rankings/**`：`B4` 唯一负责。
- `apps/server` 中用户资料接口、映射、测试：`B2` 唯一负责。
- `apps/web/src/features/auth/profile-settings-state.ts`、`apps/web/src/features/auth/profile-page.tsx`、`apps/web/src/routes/settings-page.tsx`、`apps/web/src/routes/user-profile-page.tsx`：`F1` 唯一负责。
- `apps/web/src/components/site-shell.tsx`、`apps/web/src/features/auth/web-layout.tsx`、`apps/web/src/styles.css`：`F1` 唯一负责。
- `apps/web/src/components/page-skeletons.tsx`、`apps/web/src/routes/models-page.tsx`、`apps/web/src/routes/model-detail-page.tsx`、`apps/web/src/routes/model-review-form.ts`：`F2` 唯一负责。
- `apps/web/src/routes/rankings-page.tsx`、`apps/web/src/routes/ranking-detail-page.tsx`、`apps/web/src/routes/ranking-item-detail-page.tsx`、`apps/web/src/routes/ranking-editor-page.tsx`：`F3` 唯一负责。
- `apps/web/src/components/publish-shell.tsx`、`apps/web/src/routes/publish-aircraft-page.tsx`、`apps/web/src/routes/publish-article-page.tsx`、`apps/admin/src/app.tsx`：`F4` 唯一负责。
- 若某个任务包发现必须改动他人占用的共享区域，需回退主会话重新分配，不得自行越界。

## 9. 风险提醒
- `users` 表新增 `avatar` / `bio` 会影响登录态摘要、用户卡片和任何依赖 `UserSummary` 的页面；若字段映射漏改，前后端会同时出现空值/类型错误。
- 评论与榜单去评分是整条链路删除，不是只隐藏 UI；若数据库、schema、接口、管理端有任一残留评分字段，会导致类型错误、运行时报错或脏数据继续写入。
- 榜单分类改为“热门 / 最新”后，任何仍按“官方 / 社区”判断的筛选、默认 tab、缓存 key 都可能回归。
- skeleton 与真实布局如果分别维护断点规则，会继续出现加载态跳动；必须复用同一列数来源或同一断点语义。
- 发布飞行器封面二选一若只做 UI 禁用、不清理已有表单状态，提交 payload 仍可能同时带图和视频。
- admin 根路由修复不能只做 `/ -> 某页` 跳转；还要保证未知路径进入明确兜底，而不是 React Router 默认 404。

## 10. 实现者交接信息
### 给 `backend_implementer`
- 先完成 B1，再拆到 B2/B3/B4；不要在共享 schema 未稳定前让前端并行接契约。
- B1 必须保留 Red → Green 证据，建议按“资料持久化”“评论去评分”“榜单去评分”三段连续提交或至少三段命令记录。
- 评论与榜单去评分时，注意同步清理 seed、聚合字段、序列化映射、管理端/客户端共用的输出结构。
- 榜单“热门 / 最新”若依赖现有排序字段，优先复用已有时间/热度来源，不额外引入新的复杂统计模型。

### 给 `frontend_implementer`
- F1 先做纯布局与文案清理，再在 B2 完成后接真实资料提交与回填。
- F2 处理 skeleton 时，优先抽共用列数规则或复用页面已有断点判断，不要再写一套硬编码列数。
- F3 中榜单去评分与分类切换必须完全跟随后端契约；官方只显示标签，不再占据单独分类入口。
- F4 的发布页改动应尽量收敛在现有表单状态与校验，不要引入新抽象；admin 路由修复应包含根路由与兜底页。

## 11. 推荐的下一步
1. 主会话先启动 `backend_implementer` 执行 B1，锁定共享数据库与契约。
2. B1 完成后，继续由 `backend_implementer` 顺序完成 B2、B3、B4；其中 B2/B3/B4 可按模块拆分，但不要并行改同一共享 server 入口。
3. 在 B1 稳定后即可启动 `frontend_implementer` 先做 F1/F2/F4 中不依赖后端返回的新布局部分。
4. B2 完成后接 F1 的资料持久化联调；B3 完成后接 F2 的机型评论去评分；B4 完成后接 F3 的榜单联调。
5. 所有实现包完成后，由主会话汇总验证，再调用 `review_qa`。

## 12. 建议的实施顺序
1. `P0` 主会话锁定所有权与顺序。
2. `B1` 共享数据与契约基线。
3. `B2` 个人资料后端闭环。
4. `B3` 机型评论去评分后端。
5. `B4` 榜单去评分与分类切换后端。
6. `F1` 先完成紧凑布局和文案清理，再接资料持久化联调。
7. `F2` 先完成 skeleton 列数同步，再接模型页去评分联调。
8. `F4` 完成发布页收口与 admin 路由修复。
9. `F3` 完成榜单页与榜单编辑页联调。
10. 主会话统一验证并交 `review_qa`。

## 13. 任务包 test_strategy 与验证命令
### P0
- `test_strategy`: `test_after`
- 验证：
  - 检查各任务包验证结果是否齐全。
  - 在最终集成后运行一次跨包验证。

### B1
- `test_strategy`: `tdd`
- Red/Green 最小验证建议：
  - `bunx vitest run --config vitest.config.ts packages/schemas apps/server --testNamePattern "profile|review|ranking"`
  - 如仓库已有 DB 迁移/类型校验脚本，再补最小相关命令：
  - `bun run typecheck`

### B2
- `test_strategy`: `tdd`
- 验证命令：
  - `bunx vitest run --config vitest.config.ts apps/server --testNamePattern "profile|user"`
  - `bun run typecheck`

### B3
- `test_strategy`: `tdd`
- 验证命令：
  - `bunx vitest run --config vitest.config.ts apps/server apps/admin --testNamePattern "review|model"`
  - `bun run typecheck`

### B4
- `test_strategy`: `tdd`
- 验证命令：
  - `bunx vitest run --config vitest.config.ts apps/server --testNamePattern "ranking"`
  - `bun run typecheck`

### F1
- `test_strategy`: `test_after`
- 验证命令：
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
  - 手工走查：消息/个人中心/设置页宽度、占位文案移除、资料保存后刷新可回显。

### F2
- `test_strategy`: `test_after`
- 验证命令：
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
  - 手工走查：飞友圈/飞行器库/榜单 skeleton 列数与真实布局一致；机型页不再显示评分、星星。

### F3
- `test_strategy`: `test_after`
- 验证命令：
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
  - 手工走查：榜单默认分类、切换分类、官方标签显示、条目详情无评分、榜单编辑页搜索可用。

### F4
- `test_strategy`: `test_after`
- 验证命令：
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
  - `bun run --cwd apps/admin typecheck`
  - `bun run --cwd apps/admin build`
  - 手工走查：发布飞行器封面二选一、发布文章封面上传、admin `/` 与未知路径兜底。

### 最终集成验证
- `bun run typecheck`
- `bunx vitest run --config vitest.config.ts`
- 如构建耗时可接受，补充：
  - `bun run --cwd apps/web build`
  - `bun run --cwd apps/admin build`

## 14. 可并行与必须串行
### 必须串行
- `B1` 必须先于 `B2`、`B3`、`B4`。
- `B2` 完成前，`F1` 不得接真实资料持久化联调。
- `B3` 完成前，`F2` 不得接机型评论去评分联调。
- `B4` 完成前，`F3` 不得接榜单分类与详情联调。
- 任何任务都不得与 `B1` 并行修改 `packages/db/src/**` 或 `packages/schemas/src/*.ts`。

### 可并行
- `F1` 的纯布局/文案清理、`F2` 的 skeleton 列数同步、`F4` 的 admin 路由修复可以在 `B1` 之后并行推进。
- `B2`、`B3`、`B4` 在共享契约稳定后理论上可按模块并行，但若共用同一 server 入口、测试夹具或 seed 文件，优先仍按串行执行，减少冲突。
- `F4` 与 `F3` 可并行，只要 `F4` 不修改 `ranking-editor-page.tsx`，`F3` 不修改 `publish-shell.tsx`。

## 15. 需要特别注意的回归风险
- 资料持久化完成后，`profile-settings-state.ts` 中假草稿逻辑不能继续覆盖服务端返回值，否则刷新后看似保存成功但页面仍显示旧本地值。
- 评论去评分后，任何仍显示星星的卡片、管理页列或排序文案都属于漏改。
- 榜单去评分后，详情页、条目页、列表卡片、搜索结果若仍依赖评分字段，运行时容易出现 `undefined` 访问。
- 发布飞行器页的媒体互斥要覆盖编辑态、重选媒体、提交失败后重试三种状态，不只是首次输入。
- admin 路由兜底要确认生产构建后的静态部署行为，避免开发环境正常、构建后直接白屏。
