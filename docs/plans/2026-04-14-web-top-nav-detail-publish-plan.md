# Web 详情页与发布页顶部导航栏执行计划

> 面向实现代理：本计划只覆盖 `apps/web`。实现前必须读取本计划对应的 Execution Packet，并先输出 Execution Acknowledgement。除计划明确允许的路径外，不得修改后端、Admin、共享协议、数据库、环境变量或路由常量语义。

## 目标

为 `apps/web` 的详情页与发布页补齐统一顶部导航栏。详情页显示与 `WebLayout` 当前顶部导航一致的能力并保留搜索；发布页复用同一套顶部导航能力但不显示搜索框。自己主页与他人主页继续沿用现有 `WebLayout` 顶部导航，不做壳层迁移，只作为“显示自己”与顶部导航行为的验证覆盖对象。

## 输入文档

- 需求文档：`docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md`
- 任务文档：`docs/tasks/2026-04-14-web-top-nav-detail-publish-tasks.md`
- 计划文档：`docs/plans/2026-04-14-web-top-nav-detail-publish-plan.md`

## 共享区域唯一责任方

共享顶部导航实现由 `TASK-001` 与 `TASK-004` 的同一名 `frontend_implementer` 串行负责，作为唯一责任方。

该责任方独占以下共享区域：

- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/web-top-nav.tsx`
- `apps/web/src/features/auth/web-top-nav.test.tsx`
- `apps/web/src/features/auth/user-menu.tsx`，仅当“自己”入口规则必须同步到用户菜单时允许修改

其他任务不得并行修改上述共享导航实现。`TASK-002` 与 `TASK-003` 只能消费共享导航组件，不得重写导航菜单、搜索、发布菜单、登录拦截或个人入口规则。

`ImmersiveLayout` 已负责 `useBootstrapAuth`、认证缓存重置、`WEB_AUTH_INVALID_EVENT` 和 `AuthRequiredDialog`。共享顶部导航组件不得重复接管这些壳层职责。

## 串行与并行顺序

1. 串行执行 `TASK-001`：抽取共享顶部导航组件，并让 `WebLayout` 复用。
2. 串行执行 `TASK-004`：统一顶部导航个人入口文案与跳转规则。
3. 并行执行 `TASK-002` 与 `TASK-003`：沉浸式详情页接入顶部导航，发布页接入顶部导航且禁用搜索。
4. 串行执行 `TASK-005`：补齐顶部导航相关测试，发现实现缺口时回退给对应任务 owner，不直接修业务逻辑。
5. 串行执行 `TASK-006`：执行导航接入回归守门，输出验证结论。

`TASK-002` 与 `TASK-003` 的并行前提是 `TASK-001` 和 `TASK-004` 已完成并通过其任务级验证。

## test_strategy 总览

| task_id | test_strategy | 说明 |
| --- | --- | --- |
| TASK-001 | tdd | 先补共享顶部导航 `showSearch` 与 `WebLayout` 复用相关测试，再实现抽取。 |
| TASK-002 | test_after | 沉浸式详情页接入完成后补跑页面渲染、搜索存在性与布局回归。 |
| TASK-003 | test_after | 发布页接入完成后补跑搜索隐藏、发布菜单、用户菜单与登录拦截回归。 |
| TASK-004 | tdd | 先用测试锁定“自己”文案与当前登录用户主页跳转，再调整规则。 |
| TASK-005 | test_after | 基于已实现行为补齐集中测试，不承担生产实现。 |
| TASK-006 | test_after | 执行 lint/typecheck/test/build 与必要手动回归记录。 |

当前计划不设置 `manual_only` 任务。`TASK-006` 可包含手动检查项，但仍属于 `test_after`。

## 实现者交接信息

所有实现者必须遵守以下交接规则：

- 只修改 Execution Packet 中 `allowed_paths` 明确列出的路径。
- 不修改 `packages/*`、`apps/server/*`、`apps/admin/*`、`.env*`、`README.md`，除非先提交并获批 contract change request。
- 不改变 `APP_ROUTES`、`WEB_ROUTE_PATHS` 的语义，不新增路由常量。
- 不恢复 `apps/mobiles` 或引入未接线目录、壳子工程、占位脚本。
- 详情页和发布页接入时保留原页面主体内容、局部返回、分享、评论、表单与发布结果逻辑。
- 共享顶部导航的搜索能力继续使用 `apps/web/src/lib/search-navigation.ts` 中现有能力。
- 发布页 `showSearch=false` 必须隐藏桌面搜索输入、移动端紧凑搜索输入和移动端搜索触发按钮。
- 顶部导航个人入口的目标必须是 `APP_ROUTES.webProfile`，不得使用当前正在浏览的他人用户 ID 拼接目标。
- `apps/web/src/features/auth/profile-page.tsx` 和 `apps/web/src/routes/user-profile-page.tsx` 当前已在 `WebLayout` 下，默认不做壳层改造。

## Plan Patch / Contract Change Request 触发条件

实现过程中出现以下任一情况，必须停止当前实现并提交 plan patch 或 contract change request：

- 需要修改 `packages/shared`、`packages/schemas`、`packages/http-client`、`packages/db` 中的共享契约、类型、常量或资源路径。
- 需要修改 `APP_ROUTES`、`WEB_ROUTE_PATHS` 的语义，或新增、删除、重命名路由。
- 需要后端新增接口、调整认证返回字段、调整通知接口、调整用户资料接口或改变 API 响应结构。
- 需要修改数据库 schema、迁移、seed 数据或服务端业务规则。
- 需要修改环境变量、CORS、端口、前端监听地址或根配置。
- 需要把共享导航能力移动到 `packages/*` 或跨应用复用到 `apps/admin`。
- 发现 `TASK-002` 与 `TASK-003` 必须同时修改同一共享壳层文件，导致并行边界失效。
- 发现需要把 `profile-page.tsx` 或 `user-profile-page.tsx` 从 `WebLayout` 迁移到 `ImmersiveLayout`，或修改 `apps/web/src/app.tsx` 中这两个路由的壳层归属。
- 为了测试必须在生产代码中新增非语义化测试专用入口或绕过认证逻辑。

plan patch 文件建议保存到 `docs/plans/2026-04-14-web-top-nav-detail-publish-plan-patch.md`。contract change request 文件建议保存到 `docs/contracts/2026-04-14-web-top-nav-detail-publish-contract-change.md`。

## Execution Packet - TASK-001

### task_id

TASK-001

### task_name

抽取可复用顶部导航组件

### owner

frontend_implementer

### objective

从 `WebLayout` 抽取共享顶部导航组件，并让 `WebLayout` 在不改变现有交互的前提下复用该组件。

### in_scope

- 创建 `apps/web/src/features/auth/web-top-nav.tsx`。
- 将 `WebLayout` header 中的品牌、移动端抽屉、主导航、发布菜单、用户菜单、通知未读、搜索输入、移动端搜索入口抽入共享组件。
- 新组件提供 `showSearch` 参数，默认行为等价于当前 `WebLayout` 顶部导航。
- `WebLayout` 继续保留页面壳层、侧边栏、`Outlet`、`ScrollRestoration`、`AuthRequiredDialog` 与认证 bootstrap 相关职责。
- 通过 TDD 覆盖 `showSearch=true` 与 `showSearch=false` 的可见性差异。

### out_of_scope

- 不接入详情页或发布页。
- 不修改 `PublishShell`、`ImmersivePageShell` 或具体详情/发布路由页面。
- 不修改 `APP_ROUTES`、`WEB_ROUTE_PATHS` 或共享协议。
- 不调整侧边栏信息架构。

### input_documents

- requirements: `docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md`
- tasks: `docs/tasks/2026-04-14-web-top-nav-detail-publish-tasks.md`
- plan: `docs/plans/2026-04-14-web-top-nav-detail-publish-plan.md`

### allowed_paths

- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/web-top-nav.tsx`
- `apps/web/src/features/auth/web-top-nav.test.tsx`

### forbidden_paths

- `apps/web/src/components/publish-shell.tsx`
- `apps/web/src/components/immersive-page-shell.tsx`
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/rating-target-detail-page.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `apps/web/src/routes/publish-brand-page.tsx`
- `apps/web/src/routes/ranking-editor-page.tsx`
- `apps/web/src/routes/publish-status-page.tsx`
- `apps/server/**`
- `apps/admin/**`
- `packages/**`
- `.env`
- `.env.example`
- `README.md`

### dependencies

- `APP_ROUTES` from `@feijia/shared`
- `WEB_ROUTE_PATHS` from `apps/web/src/lib/web-routes.ts`
- `buildSearchLocation` and `shouldShowCompactSearchBar` from `apps/web/src/lib/search-navigation.ts`
- `useAuthStore`, `useLoginPrompt`, `useNotifications`, `UserMenu` from `apps/web/src/features/auth`

### acceptance_criteria

- `WebLayout` renders the same top navigation functionality through the shared component.
- `showSearch=true` renders desktop search and existing mobile search behavior.
- `showSearch=false` hides desktop search, compact mobile search input and mobile search trigger.
- Publish menu login interception still calls the existing login prompt when unauthenticated.
- Notification unread indicator behavior remains available to the top navigation.
- Existing `WebLayout` side navigation and page outlet behavior are unchanged.

### test_strategy

tdd

### handoff_notes

- Downstream `TASK-002` and `TASK-003` must import the shared component instead of copying header JSX.
- Keep search submission wired to `buildSearchLocation` and `useNavigate`.
- Do not move `useBootstrapAuth` into the shared top navigation; `WebLayout` and `ImmersiveLayout` own auth bootstrapping.
- If the component needs extra props beyond `showSearch`, document them in this plan through a plan patch before implementation continues.

### escalation_rule

If implementation requires changing shared route constants, auth contracts, notification contracts, root config, or page routing semantics, stop and submit a contract change request.

## Execution Packet - TASK-004

### task_id

TASK-004

### task_name

统一“自己”入口文案与跳转规则

### owner

frontend_implementer

### objective

将顶部导航中的个人入口统一为“自己”，并始终跳转到当前登录用户自己的主页。

### in_scope

- 调整共享顶部导航中的个人入口文案为“自己”。
- 个人入口目标始终使用 `APP_ROUTES.webProfile`。
- 在共享顶部导航消费页面中保持同一规则。
- 先验证现有 `UserMenu` 是否已满足“当前登录用户 -> APP_ROUTES.webProfile”的要求；若已满足，不做无必要修改。
- 通过 TDD 覆盖文案与跳转目标。

### out_of_scope

- 不改变 `ProfilePage` 或 `UserProfilePage` 主体内容与壳层归属。
- 不新增“他人主页”或“当前访问用户”入口。
- 不改变 `ProfileLink` 组件语义。
- 不改变 `APP_ROUTES.webUserProfile` 语义。

### input_documents

- requirements: `docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md`
- tasks: `docs/tasks/2026-04-14-web-top-nav-detail-publish-tasks.md`
- plan: `docs/plans/2026-04-14-web-top-nav-detail-publish-plan.md`

### allowed_paths

- `apps/web/src/features/auth/web-top-nav.tsx`
- `apps/web/src/features/auth/web-top-nav.test.tsx`
- `apps/web/src/features/auth/user-menu.tsx`

### forbidden_paths

- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/web/src/components/profile-link.tsx`
- `apps/web/src/lib/web-routes.ts`
- `apps/server/**`
- `apps/admin/**`
- `packages/**`
- `.env`
- `.env.example`
- `README.md`

### dependencies

- `APP_ROUTES.webProfile`
- Shared top navigation component delivered by `TASK-001`
- Existing authenticated user state from `useAuthStore`

### acceptance_criteria

- Shared top navigation personal entry accessible text is “自己”.
- Shared top navigation personal entry `href` is `APP_ROUTES.webProfile`.
- Existing `UserMenu` behavior remains current-user based; if no change is needed, this task may leave `user-menu.tsx` untouched.
- Viewing another user profile does not change the top navigation personal entry target to that other user.
- Unauthenticated states continue to use existing login/user-menu behavior without new route semantics.

### test_strategy

tdd

### handoff_notes

- Run after `TASK-001`; do not start in parallel with shared component extraction.
- Verify current `UserMenu` behavior before editing it. If it already resolves to `APP_ROUTES.webProfile`, keep it unchanged.
- If the exact personal entry is rendered by `UserMenu`, keep the user avatar/display name area intact unless the requirement explicitly applies to that link.
- Downstream `TASK-005` will add broader page-level coverage, so this task should focus on the shared rule.

### escalation_rule

If satisfying “自己” requires changing profile routes, user profile API, `ProfileLink`, or route constants, stop and submit a contract change request.

## Execution Packet - TASK-002

### task_id

TASK-002

### task_name

详情页接入顶部导航

### owner

frontend_ui_worker

### objective

为机型详情、帖子详情、榜单详情、评分对象详情接入共享顶部导航，并保留搜索框；用户主页保持现状，仅在测试与回归中验证现有顶部导航行为。

### in_scope

- 在详情页外层接入共享顶部导航，传入 `showSearch=true`。
- 覆盖机型详情页、帖子详情页、榜单详情页、评分对象详情页。
- 保留原有页面主体内容、返回、分享、评论、关注、编辑入口和内容流行为。
- 保持详情页首屏间距、滚动体验和 sticky 顶栏行为稳定。

### out_of_scope

- 不修改共享顶部导航内部实现。
- 不修改发布页。
- 不迁移 `profile-page.tsx` 或 `user-profile-page.tsx` 的壳层归属。
- 不为了“详情页概念统一”修改 `apps/web/src/app.tsx` 的用户主页路由挂载位置。
- 不调整详情页数据请求、缓存 key、接口调用或权限逻辑。
- 不新增路由或改变现有路由常量语义。

### input_documents

- requirements: `docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md`
- tasks: `docs/tasks/2026-04-14-web-top-nav-detail-publish-tasks.md`
- plan: `docs/plans/2026-04-14-web-top-nav-detail-publish-plan.md`

### allowed_paths

- `apps/web/src/components/immersive-page-shell.tsx`
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/rating-target-detail-page.tsx`

### forbidden_paths

- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/web-top-nav.tsx`
- `apps/web/src/features/auth/user-menu.tsx`
- `apps/web/src/components/publish-shell.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/web/src/app.tsx`
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `apps/web/src/routes/publish-brand-page.tsx`
- `apps/web/src/routes/ranking-editor-page.tsx`
- `apps/web/src/routes/publish-status-page.tsx`
- `apps/server/**`
- `apps/admin/**`
- `packages/**`

### dependencies

- Shared top navigation component delivered by `TASK-001`
- “自己” personal entry rule delivered by `TASK-004`
- Existing `ImmersiveLayout` auth bootstrap and dialog behavior
- Existing detail routes under `apps/web/src/app.tsx`
- Existing self-profile and user-profile routes already mounted under `WebLayout`

### acceptance_criteria

- All four scoped immersive detail pages render a top-level `header` from the shared top navigation.
- Scoped immersive detail pages render a search input in the top navigation on desktop.
- Mobile search behavior follows the shared top navigation behavior.
- Page-specific local controls remain visible and functional.
- No detail page receives duplicated brand headers or duplicated top navigation bars.
- `profile-page.tsx` and `user-profile-page.tsx` remain on `WebLayout` and are not modified by this task.

### test_strategy

test_after

### handoff_notes

- Prefer adding the top navigation once through `ImmersivePageShell` if that covers the four scoped immersive detail pages without affecting unrelated immersive pages.
- If `ImmersivePageShell` would also affect pages outside this task, document the affected pages in implementation notes and verify they remain acceptable.
- If a specific detail page does not use `ImmersivePageShell`, wrap that page locally without changing its data flow.
- Do not touch self-profile or user-profile pages in this task; those pages stay on `WebLayout` and are validated in `TASK-005` and `TASK-006`.
- Do not edit the shared navigation component; report missing props or behavior to the `TASK-001` owner through a plan patch.

### escalation_rule

If detail page coverage requires changing route tree semantics in `apps/web/src/app.tsx` or changing shared navigation props beyond the approved contract, stop and submit a plan patch.

## Execution Packet - TASK-003

### task_id

TASK-003

### task_name

发布页接入顶部导航且禁用搜索框

### owner

frontend_ui_worker

### objective

为 `PublishShell` 承载的发布页和发布结果页接入共享顶部导航，并确保发布页不显示搜索框。

### in_scope

- 在发布页外层接入共享顶部导航，传入 `showSearch=false`。
- 覆盖发布文章、发布动态、发布飞行器、品牌申请、榜单编辑、发布结果页。
- 保留品牌标识、发布菜单、用户菜单、登录拦截和移动端抽屉能力。
- 移除或避免重复显示 `PublishShell` 原有顶部品牌/身份栏中与全局顶部导航冲突的部分。
- 保留发布页标题、eyebrow、description、main、aside 和表单行为。

### out_of_scope

- 不修改共享顶部导航内部实现。
- 不修改详情页。
- 不调整发布表单字段、提交接口、审核状态、结果页路由参数或业务逻辑。
- 不新增发布入口或改变发布入口目标。

### input_documents

- requirements: `docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md`
- tasks: `docs/tasks/2026-04-14-web-top-nav-detail-publish-tasks.md`
- plan: `docs/plans/2026-04-14-web-top-nav-detail-publish-plan.md`

### allowed_paths

- `apps/web/src/components/publish-shell.tsx`
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `apps/web/src/routes/publish-brand-page.tsx`
- `apps/web/src/routes/ranking-editor-page.tsx`
- `apps/web/src/routes/publish-status-page.tsx`

### forbidden_paths

- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/web-top-nav.tsx`
- `apps/web/src/features/auth/user-menu.tsx`
- `apps/web/src/components/immersive-page-shell.tsx`
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/ranking-detail-page.tsx`
- `apps/web/src/routes/rating-target-detail-page.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/server/**`
- `apps/admin/**`
- `packages/**`

### dependencies

- Shared top navigation component delivered by `TASK-001`
- “自己” personal entry rule delivered by `TASK-004`
- Existing `PublishShell` layout contract
- Existing protected route behavior for publish pages

### acceptance_criteria

- All six scoped publish/result pages render the shared top navigation.
- Publish pages do not render a top navigation search input.
- Publish pages do not render a mobile top navigation search trigger.
- Publish menu and user menu remain available.
- Existing publish form submit, cancel, edit and result actions remain unchanged.
- Existing auth guard and login prompt behavior remain unchanged.

### test_strategy

test_after

### handoff_notes

- Prefer implementing once in `PublishShell`, because all scoped publish pages already consume it.
- If any scoped page bypasses `PublishShell`, document it and apply a local wrapper without changing form logic.
- Keep `PublishShell` page heading content; only remove duplicated header elements if they visually conflict with the global top navigation.
- Do not edit shared top navigation internals; report missing behavior to `TASK-001`.

### escalation_rule

If publishing pages need new route constants, auth behavior changes, API contract changes, or shared top navigation API changes, stop and submit a plan patch or contract change request.

## Execution Packet - TASK-005

### task_id

TASK-005

### task_name

补齐顶部导航相关测试

### owner

frontend_test_worker

### objective

为共享顶部导航、详情页接入、发布页搜索禁用和“自己”入口规则补齐集中测试。

### in_scope

- 补齐 `showSearch=true/false` 渲染差异测试。
- 补齐沉浸式详情页存在顶部导航并显示搜索的测试。
- 补齐发布页存在顶部导航但不显示搜索的测试。
- 补齐个人入口文案为“自己”且目标为当前登录用户主页的测试。
- 补齐自己主页和他人主页在现有 `WebLayout` 下继续显示顶部导航、且个人入口仍指向 `APP_ROUTES.webProfile` 的验证。
- 保留并扩展 Web 顶部搜索进入搜索结果页的现有回归。

### out_of_scope

- 不修改生产实现代码。
- 不新增后端测试。
- 不修改 Admin e2e 行为。
- 不绕过认证或改写业务逻辑来适配测试。

### input_documents

- requirements: `docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md`
- tasks: `docs/tasks/2026-04-14-web-top-nav-detail-publish-tasks.md`
- plan: `docs/plans/2026-04-14-web-top-nav-detail-publish-plan.md`

### allowed_paths

- `apps/web/src/features/auth/web-top-nav.test.tsx`
- `apps/web/src/**/*.test.tsx`
- `apps/web/e2e/search-and-admin.spec.ts`
- `apps/web/e2e/site-smoke.spec.ts`
- `apps/web/e2e/top-navigation.spec.ts`
- `apps/web/e2e/support/auth.ts`

### forbidden_paths

- `apps/web/src/features/auth/web-top-nav.tsx`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/components/publish-shell.tsx`
- `apps/web/src/components/immersive-page-shell.tsx`
- `apps/web/src/routes/**`
- `apps/server/**`
- `apps/admin/**`
- `packages/**`

### dependencies

- Implemented behavior from `TASK-001` through `TASK-004`
- Existing Vitest setup for component tests
- Existing Playwright e2e setup under `apps/web/e2e`

### acceptance_criteria

- Test suite covers both `showSearch` modes.
- Test suite covers at least one immersive detail page with visible top navigation search.
- Test suite covers at least one publish page with no top navigation search.
- Test suite verifies “自己” entry text and target.
- Test suite verifies self-profile and user-profile pages keep existing `WebLayout` top navigation behavior without shell migration.
- Existing Web search e2e still verifies `/search?q=...` navigation.

### test_strategy

test_after

### handoff_notes

- If tests expose a production bug, report the failing assertion and route it back to the relevant implementation task owner instead of changing production code here.
- Prefer accessible queries such as role, label, placeholder and link name over brittle class selectors.
- Keep Admin assertions in `search-and-admin.spec.ts` intact if extending that file.

### escalation_rule

If reliable testing requires adding test-only production attributes or changing authentication behavior, stop and submit a plan patch.

## Execution Packet - TASK-006

### task_id

TASK-006

### task_name

导航接入回归守门

### owner

review_qa

### objective

验证顶部导航接入没有破坏详情页、发布页、搜索、移动端导航、登录拦截和项目边界。

### in_scope

- 执行默认验证命令。
- 检查桌面端和移动端顶部导航显示。
- 检查详情页搜索存在，发布页搜索不存在。
- 检查自己主页和他人主页仍然沿用 `WebLayout` 顶部导航，而非被迁移到 `ImmersiveLayout`。
- 检查发布菜单、用户菜单、移动端抽屉、通知未读入口、登录拦截。
- 检查未修改 `apps/admin`、`apps/server`、共享协议和路由常量语义。
- 输出需求到任务到实现到测试的追踪结论。

### out_of_scope

- 不修业务代码。
- 不调整测试用例。
- 不改变计划或任务边界。
- 不做生产部署。

### input_documents

- requirements: `docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md`
- tasks: `docs/tasks/2026-04-14-web-top-nav-detail-publish-tasks.md`
- plan: `docs/plans/2026-04-14-web-top-nav-detail-publish-plan.md`

### allowed_paths

- `docs/review/2026-04-14-web-top-nav-detail-publish-review.md`
- `docs/implementation/2026-04-14-web-top-nav-detail-publish-implementation.md`

### forbidden_paths

- `apps/web/src/**`
- `apps/web/e2e/**`
- `apps/server/**`
- `apps/admin/**`
- `packages/**`
- `.env`
- `.env.example`
- `README.md`

### dependencies

- Completed `TASK-001` through `TASK-005`
- Bun runtime
- Vitest test suite
- Existing project scripts

### acceptance_criteria

- `bun run lint` result is recorded.
- `bun run typecheck` result is recorded.
- `bun run test` result is recorded.
- `bun run build` result is recorded.
- Review output explicitly states whether scoped immersive detail pages have top navigation with search.
- Review output explicitly states whether scoped publish pages have top navigation without search.
- Review output explicitly states whether “自己” entry points to the current user profile.
- Review output explicitly states whether self-profile and user-profile pages remained on `WebLayout`.
- Review output explicitly states whether forbidden areas were untouched.

### test_strategy

test_after

### handoff_notes

- If any default verification command is unavailable or fails due to pre-existing unrelated issues, record exact command, exit code and relevant output.
- If a failure maps to this navigation work, route it back to the responsible implementation task.
- Do not claim success without fresh command output.

### escalation_rule

If regression verification reveals that the approved task split cannot satisfy the requirement without expanding scope, stop and submit a plan patch.
