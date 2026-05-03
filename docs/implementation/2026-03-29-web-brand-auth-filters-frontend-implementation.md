# 2026-03-29 Web Brand/Auth/Filters Frontend Implementation

## 1. 当前实现目标
- 为 `apps/web` 落地会话持久化兜底。
- 将首页主信息流从圆角改为直角。
- 将 Web 富文本工具栏改为 icon-only，hover 显示中文提示。
- 将机型页改为多选筛选交互，并支持品牌 logo 展示与关键词查询参数。
- 将飞行器发布页的品牌选择改为可展示品牌 logo 的选择器。
- 将品牌 logo 展示到机型卡片与机型详情页。

## 2. 输入依据
- 主会话已确认的总体实施计划。
- `AGENTS.md` / `apps/web/AGENTS.md` 中的最小闭环、前端职责和 Tailwind 约束。
- 当前 `apps/web` 页面与测试现状。

## 3. 工作区模式
- 工作目录：`E:\CodeStore\feijia`
- 作用域：仅修改 `apps/web/*`，另补前端实现文档到 `docs/implementation/*`
- 不修改：`packages/*`、`apps/server/*`、`apps/admin/*`

## 4. 变更文件 / 变更范围
- `apps/web/src/features/auth/auth-store.ts`
- `apps/web/src/features/auth/use-bootstrap-auth.ts`
- `apps/web/src/features/auth/auth-store-persistence.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/routes/models-page.tsx`
- `apps/web/src/routes/models-page-helpers.ts`
- `apps/web/src/routes/publish-aircraft-page.tsx`
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/components/brand-identity.tsx`
- `apps/web/src/components/rich-text-editor.tsx`
- `apps/web/src/components/rich-text-toolbar-config.ts`
- `apps/web/tests/auth-store-persistence.test.ts`
- `apps/web/tests/models-page-helpers.test.ts`
- `apps/web/tests/rich-text-toolbar-config.test.ts`

## 5. 实现说明
- 会话持久化
  - 新增本地持久化辅助层，保存最近一次认证成功的 `user`。
  - `auth-store` 初始化时优先读取持久化用户，将状态设为 `authenticated` 兜底首屏。
  - `useBootstrapAuth` 改为仅在真正 `idle` 时切到 `loading`，已有持久化用户时直接后台校验 `/auth/me`。
  - 服务端返回匿名或失败时，仍会清除持久化状态。
- 机型页
  - 新增 URL 参数 helper，统一处理 `categorySlug` / `brandSlug` / `powerType` 的 repeated query params 和 `keyword`。
  - 筛选 UI 改为多选按钮组，“全部”语义改为清空当前组。
  - 页面顶部搜索框现在直接驱动 URL `keyword`，供服务端联动查询。
  - 品牌筛选项、机型卡片品牌文案接入 `BrandIdentity`，当 `logoUrl` 存在时展示小 logo。
- 飞行器发布页
  - 保留“已有品牌 / 品牌提案”双模式。
  - “已有品牌”从原生 `select` 改为自定义按钮列表，可展示 logo 和选中态。
  - 预览侧栏中的品牌也同步展示 logo。
- 富文本编辑器
  - 工具栏改为 icon-only 按钮，使用 `title` 和 `aria-label` 承载中文提示。
  - 抽出 toolbar label 配置，便于测试覆盖。
- 首页信息流
  - 仅移除首页主信息流容器和缩略图的圆角，右侧栏和其它页面不受影响。
- 机型详情
  - 标题区域品牌 Badge、参数表品牌行、右侧热门机型品牌文字接入 logo 展示。

## 6. 测试和验证结果
- 已通过
  - `bunx vitest run --root . --config vitest.config.ts apps/web/tests/auth-store-persistence.test.ts apps/web/tests/models-page-helpers.test.ts apps/web/tests/rich-text-toolbar-config.test.ts apps/web/tests/rich-text-editor-helpers.test.ts`
  - `bunx vitest run --root . --config vitest.config.ts apps/web/tests`
- 未通过
  - `bun run --cwd apps/web typecheck`
  - 阻塞原因：当前主会话正在修改的 `packages/http-client/src/index.ts` 仍处于中间态，报错集中在共享包，不在本次 `apps/web` 变更文件内。

## 7. 边界和异常处理
- 持久化仅保存已认证用户，不额外缓存匿名态。
- 富文本 hover 提示采用浏览器原生 `title`，未新增 `Tooltip` 组件依赖。
- 品牌 logo 缺失时只显示品牌名，不补占位图。
- 发布页当前分类下无品牌时，会提示切换到品牌提案模式。

## 8. 风险 / 未解决项
- `model-detail` 和 `models` 页面对 `brand.logoUrl` 的使用依赖主会话更新共享契约后完全对齐；当前 Web 侧已按可选字段方式适配。
- 机型页的服务端关键词查询与数组型筛选参数，依赖主会话完成 backend/shared implementation 后才会真正生效。
- 由于共享包未完成，当前无法给出最终 `apps/web` typecheck 绿灯证据。

## 9. 需要 backend_implementer 配合的点
- `GET /models`
  - 需支持 repeated query params：`categorySlug`、`brandSlug`、`powerType`，以及 `keyword`
  - 返回的 `filters.brands[*]` 和 `items[*].brand` 需包含可选 `logoUrl`
- `GET /models/:slug`
  - `item.brand` 需包含可选 `logoUrl`
- `GET /admin/brands` / `GET /admin/categories`
  - Web 当前通过本地 API client 读取，品牌列表需返回 `logoUrl`
- `/auth/me`
  - 现有接口不需要变更形状；只需保证匿名时稳定返回 `user: null`

## 10. 推荐的下一步
- 由主会话完成 `packages/schemas`、`packages/http-client` 与 `apps/server` 的联动后，重新跑 `bun run --cwd apps/web typecheck`
- 主会话合并后做一次 Web 手工烟测：
  - 登录后刷新页面
  - 机型页多选筛选 + 搜索
  - 飞行器发布页品牌选择
  - 文章发布页富文本工具栏 hover 提示
