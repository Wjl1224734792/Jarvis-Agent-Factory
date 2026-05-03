# Web 详情页与发布页顶部导航栏评审

## 1. 审查结论
- 有条件通过

结论说明：
- 共享顶部导航抽取、`WebLayout` 复用、`ImmersiveLayout` 统一接入、发布页去重头部、自身/他人主页继续留在 `WebLayout` 这几条主线与需求、任务、计划整体一致。
- 当前不能直接判定“通过”，因为 `TASK-006` 要求的回归守门尚未闭环：上游提供的验证结果里 `bun run test:e2e` 未执行，且发布结果页 `/publish/status/:kind/:id` 没有实际页面级冒烟证据。

## 2. 需求覆盖情况
- 已覆盖：
  - `WebTopNav` 已抽出为共享组件，`WebLayout` 已复用。
  - `ImmersiveLayout` 已统一挂载 `WebTopNav`，并通过 `shouldShowImmersiveTopNavSearch(pathname)` 区分详情页显示搜索、发布页隐藏搜索。
  - `PublishShell` 已删除与站点级顶栏重复的品牌/身份头部，避免双头部。
  - 自己主页与他人主页仍走 `WebLayout`，未迁移到 `ImmersiveLayout`。
  - 共享导航中的“自己”规则已通过 `getTopNavUserProfileLabel()` / `getTopNavUserProfileRoute()` 固定为 `自己` + `APP_ROUTES.webProfile`。
- 部分覆盖或证据不足：
  - 发布结果页属于需求明确范围，但当前只有纯函数 `shouldShowImmersiveTopNavSearch()` 对 `/publish/status/...` 做了分支判断，缺少实际页面级验证。
  - “他人主页顶部导航栏显示的是自己”当前有 `/me` 目标的验证，但没有页面级断言去证明可见文案一定为 `自己`。
  - 需求与计划都要求桌面端和移动端回归；当前未见已执行的移动端验证证据。

## 3. 计划一致性
- 与计划一致的部分：
  - `TASK-001` 已完成：共享顶栏组件已抽取，`WebLayout` 已复用。
  - `TASK-002` 已完成主链：沉浸式详情页通过 `ImmersiveLayout` 统一接入顶栏，并保留搜索。
  - `TASK-003` 已完成主链：发布页通过 `ImmersiveLayout` 获得顶栏，`PublishShell` 去掉重复头部，搜索关闭。
  - `TASK-004` 已完成主链：个人入口规则已固定为 `自己` 与 `/me`。
  - `TASK-005` 已完成一部分：补了 `apps/web/tests/web-top-nav.test.ts` 与 `site-smoke.spec.ts` / `auth.ts` 的相关断言。
- 与计划不一致或未闭环的部分：
  - `TASK-005` 的页面级覆盖仍有缺口，发布结果页未见冒烟用例。
  - `TASK-006` 未闭环，原因是 `bun run test:e2e` 未执行，无法依据真实浏览器结果确认详情页/发布页/用户主页/移动端回归。

## 4. 前后端边界一致性
- 本轮实际改动只落在 `apps/web`，未改 `apps/server`、`apps/admin`、`packages/*`、环境变量或共享路由常量语义，符合仓库边界。
- `ImmersiveLayout` 和 `WebLayout` 仍各自持有鉴权 bootstrap、auth invalid 监听、缓存清理与 `AuthRequiredDialog`，共享顶栏没有越权接管壳层职责，边界合理。
- 上游给出的 `apps/server/tests/posts.test.ts` 失败发生在服务端内容分类回填逻辑，和本轮 web 顶栏改动无直接耦合，当前没有看到前后端契约被本轮改动破坏的证据。

## 5. 测试覆盖状态
- 说明：本评审未重新执行命令，以下状态依据上游提供的验证结果与代码审查结论记录。
- 已通过：
  - `bun run lint`
  - `bun run typecheck`
  - `bun run build`
  - `bun run test:unit`（43 files, 156 tests）
- 未完全通过：
  - `bun run test`
  - 失败点：`apps/server/tests/posts.test.ts` 中 `backfills content category names by slug to Chinese labels`
  - 断言：`expected undefined to be '航拍'`
  - 影响判断：与本次 `apps/web` 顶栏改动无直接关联
- 未执行：
  - `bun run test:e2e`
- 当前已具备的测试信号：
  - `apps/web/tests/web-top-nav.test.ts` 覆盖了 `showSearch=true/false`、沉浸式路径搜索开关规则、`自己` + `/me` 规则。
  - `apps/web/e2e/site-smoke.spec.ts` 已新增详情页顶栏、发布页无搜索、他人主页 `/me` 入口的断言代码。
- 当前仍缺的测试信号：
  - 发布结果页 `/publish/status/:kind/:id` 的页面级断言。
  - 自己主页的页面级回归断言。
  - 移动端 viewport 下的顶栏行为验证。

## 6. 问题列表
### 阻塞
- `TASK-006` 回归守门未完成，`bun run test:e2e` 未执行，当前没有真实浏览器验证来关闭详情页、发布页、用户主页和移动端顶栏回归风险。
  - 证据：
    - 上游验证结果明确写明 `bun run test:e2e` 未执行。
    - 计划文档与 `TASK-006` 接收标准明确要求对桌面端/移动端顶栏行为做回归确认。

### 中
- 发布结果页缺少页面级测试覆盖，当前仅靠路由判断函数间接证明“无搜索框”，不满足关闭该页面回归风险所需的证据强度。
  - 证据：
    - [web-top-nav.tsx](/e:/CodeStore/feijia/apps/web/src/features/auth/web-top-nav.tsx#L88) 到 [web-top-nav.tsx](/e:/CodeStore/feijia/apps/web/src/features/auth/web-top-nav.tsx#L109) 仅在纯函数里对 `/publish/status/` 做隐藏搜索判断。
    - [site-smoke.spec.ts](/e:/CodeStore/feijia/apps/web/e2e/site-smoke.spec.ts#L49) 到 [site-smoke.spec.ts](/e:/CodeStore/feijia/apps/web/e2e/site-smoke.spec.ts#L74) 只覆盖文章、动态、飞行器、品牌、榜单创建页，没有发布结果页。

### 低
- “自己”文案目前主要体现在共享导航规则和导航项文本上，右上角 `UserMenu` 仍显示当前用户 `displayName` / “进入个人中心”，如果产品对“顶部导航栏显示的是自己”的理解包含右上角主入口文案，当前实现与测试都还没有显式收口。
  - 证据：
    - [web-top-nav.tsx](/e:/CodeStore/feijia/apps/web/src/features/auth/web-top-nav.tsx#L80) 到 [web-top-nav.tsx](/e:/CodeStore/feijia/apps/web/src/features/auth/web-top-nav.tsx#L85) 固定了 `自己` 与 `/me`。
    - [user-menu.tsx](/e:/CodeStore/feijia/apps/web/src/features/auth/user-menu.tsx#L60) 到 [user-menu.tsx](/e:/CodeStore/feijia/apps/web/src/features/auth/user-menu.tsx#L74) 仍渲染 `user.displayName`，不是 `自己`。

## 7. 必须修复项
- 执行 `bun run test:e2e`，并把结果补入本需求的收尾记录；若仍受环境阻塞，至少需要记录具体阻塞原因和未覆盖范围。
- 为发布结果页补一条页面级回归验证，确认共享顶栏存在且不显示搜索框。

## 8. 优化建议
- 将 `shouldShowImmersiveTopNavSearch()` 中对发布结果页的判断改为复用 `WEB_ROUTE_PATHS.publishStatus` 或对应路径构造工具，减少硬编码路径漂移风险。
- 为“自己主页”和“他人主页”分别补一条更明确的页面级断言，区分“目标仍为 `/me`”与“可见文案是否为 `自己`”。
- 当前单测主要覆盖纯函数；后续可补一条轻量组件测试，直接验证 `showSearch=false` 时 header 不渲染搜索输入与移动端搜索触发按钮。

## 9. 回归建议
- 详情页回归：
  - 帖子、机型、榜单、评分对象详情页在桌面端显示顶栏与搜索框。
  - 移动端详情页验证抽屉导航、紧凑搜索框与搜索按钮切换逻辑。
- 发布页回归：
  - 文章、动态、飞行器、品牌申请、榜单创建、发布结果页都显示共享顶栏且无搜索框。
  - 发布页标题区、表单提交、取消、编辑、结果页动作不受顶栏接入影响。
- 用户页回归：
  - 自己主页和他人主页继续走 `WebLayout`。
  - 登录态浏览他人主页时，个人入口仍指向 `/me`。
- 通用交互回归：
  - 发布菜单登录拦截。
  - 通知未读提示。
  - `AuthRequiredDialog`、auth invalid 后状态清理。

## 10. 追踪矩阵

说明：需求文档未提供显式 requirement_id，以下 `REQ-*` 为基于需求关键项整理出的评审追踪编号。

| requirement_id | requirement_summary | task_id | executor | changed_files | tests | review_result |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | 抽取共享顶部导航并让主站壳层复用 | TASK-001 | `frontend_implementer` | `apps/web/src/features/auth/web-top-nav.tsx`<br>`apps/web/src/features/auth/web-layout.tsx` | `apps/web/tests/web-top-nav.test.ts` | 通过 |
| REQ-002 | 详情页接入共享顶栏并保留搜索 | TASK-002 | `frontend_ui_worker` | `apps/web/src/features/auth/immersive-layout.tsx`<br>`apps/web/src/components/immersive-page-shell.tsx` | `apps/web/tests/web-top-nav.test.ts`<br>`apps/web/e2e/site-smoke.spec.ts` | 有条件通过 |
| REQ-003 | 发布页接入共享顶栏且不显示搜索 | TASK-003 | `frontend_ui_worker` | `apps/web/src/features/auth/immersive-layout.tsx`<br>`apps/web/src/components/publish-shell.tsx` | `apps/web/tests/web-top-nav.test.ts`<br>`apps/web/e2e/site-smoke.spec.ts` | 有条件通过 |
| REQ-004 | 个人入口固定为“自己”并跳转 `/me` | TASK-004 | `frontend_implementer` | `apps/web/src/features/auth/web-top-nav.tsx` | `apps/web/tests/web-top-nav.test.ts`<br>`apps/web/e2e/support/auth.ts`<br>`apps/web/e2e/site-smoke.spec.ts` | 有条件通过 |
| REQ-005 | 补齐导航相关测试与回归守门 | TASK-005 / TASK-006 | `frontend_test_worker` / `review_qa` | `apps/web/tests/web-top-nav.test.ts`<br>`apps/web/e2e/support/auth.ts`<br>`apps/web/e2e/site-smoke.spec.ts` | `bun run lint`<br>`bun run typecheck`<br>`bun run build`<br>`bun run test:unit`<br>`bun run test`<br>`bun run test:e2e` | 未闭环 |
