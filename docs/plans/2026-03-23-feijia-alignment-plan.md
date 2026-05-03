# 飞加网需求对齐执行计划

## 1. 需求文档路径

- [docs/requirements/2026-03-23-feijia-project-alignment-requirements.md](/C:/Users/12247/.codex/worktrees/daca/feijia/docs/requirements/2026-03-23-feijia-project-alignment-requirements.md)

## 2. 任务文档路径

- [docs/tasks/2026-03-23-feijia-alignment-tasks.md](/C:/Users/12247/.codex/worktrees/daca/feijia/docs/tasks/2026-03-23-feijia-alignment-tasks.md)

## 3. 当前轮次目标

本轮目标不是继续扩张产品边界，而是把当前已存在的 MVP 主链路收敛成一个可交付版本：

- `web` 做成符合 PRD 气质的 PC 优先成品，补齐导航壳层、个人中心、通知中心、响应式和关键页面一致性。
- `admin` 做成可用的最小治理后台，补强壳层与概览呈现。
- 保持现有 `server`、`schemas`、`http-client`、`db` 的功能闭环可用；只有在前端闭环被真实阻塞时才做最小后端补丁。
- 完成依赖安装、类型检查、测试和构建验证。

## 4. 当前轮次范围

### 范围内

- `apps/web`
  - `web-layout` 改为更贴近 PRD 的顶部导航 + 左侧边栏 + 主内容区。
  - 首页、机型库、机型详情、帖子详情的视觉统一和移动端收口。
  - 个人中心从占位升级为真实入口页。
  - 通知页升级为消息中心式体验。
- `apps/admin`
  - `admin-shell`、概览页的视觉升级。
  - 保持现有分类、品牌、机型、帖子、评论、点评管理页可用。
- 验证链路
  - 依赖安装。
  - 针对 `web` / `admin` 的类型检查、构建和必要测试。

### 本轮不做

- 新增榜单、私信、实时消息、独立心愿单、认证账号等新业务域。
- 大规模改造 `packages/schemas`、`packages/db`、`packages/http-client`。
- 新建 `packages/ui`、`packages/storage`。

## 5. 完成标准

- `web` 首页和各主页面具有统一视觉语言，不再是多个页面各自为政。
- `web` 壳层满足 PRD 的 PC 布局意图，并在移动端可用。
- 个人中心、通知页从占位页升级为真实可用页。
- `admin` 有明确的后台壳层和概览感，不只是裸页面集合。
- 不破坏现有登录、发帖、评论、点评、关注、通知、后台治理链路。
- 至少完成 `typecheck` 与 `build`，并补充可运行的最小测试验证；若有无法完成项，要明确记录原因。

## 6. 是否需要先查阅 repo_explorer

不需要再额外查阅。当前轮次已具备以下依据：

- 已读取需求对齐稿和任务拆解稿。
- 已有 `repo_explorer` 结果，明确当前仓库的主要缺口集中在视觉收口和后台完成度，而不是核心路由缺失。
- 已确认当前共享区域是高风险区，应避免在本轮无必要扩张。

## 7. 执行代理分工

### 主责任方

- 主代理负责：
  - 最终范围控制。
  - 执行计划与共享区域守门。
  - `apps/web` / `apps/admin` 的主线集成。
  - 验证与收尾。

### 可并行代理

- `frontend_implementer`
  - 所有权：`apps/web/src/features/auth/web-layout.tsx`、`apps/web/src/features/auth/profile-page.tsx`、`apps/web/src/routes/notifications-page.tsx`、必要的 `apps/web/src/styles.css` 或页面级样式调整。
  - 目标：完成前台壳层与个人中心/通知中心升级。
- `frontend_implementer`
  - 所有权：`apps/admin/src/features/auth/admin-shell.tsx`、`apps/admin/src/features/auth/admin-overview-page.tsx`、必要的 `apps/admin/src/styles.css`。
  - 目标：完成后台壳层与概览升级。
- `backend_implementer`
  - 默认不启用。
  - 仅在前端集成时发现真实阻塞，例如现有接口缺少必要字段、状态不够支撑页面展示，才分配最小补丁任务。

## 8. 共享区域改动归属

以下区域本轮默认由主代理独占，不并行改动：

- `packages/shared/src/index.ts`
- `packages/schemas/src/*`
- `packages/http-client/src/index.ts`
- `packages/db/src/*`
- `apps/server/src/app.ts`
- `apps/server/src/modules/*`
- `apps/web/src/app.tsx`
- `apps/admin/src/app.tsx`

原因：

- 这些区域决定路由常量、契约、请求边界和根入口。
- 本轮目标是最小正确变更，优先在既有页面层实现需求对齐。
- 只有前端集成被现有接口真实阻塞时，才在主代理控制下做最小共享改动。

## 9. 风险提醒

- 当前项目依赖虽已安装，但此前 `check` 失败说明验证还没跑完，后续必须真实补跑。
- `web` 页面目前已各自具备一定设计感，重做壳层时最容易出现风格不统一或响应式回退。
- `admin` 的视觉层较弱，但管理功能真实依赖现有 API，改样式时不能顺手改接口契约。
- 若在实现中发现个人中心或通知页需要新的聚合接口，必须先评估是否能用现有数据拼接；只有无法满足时才补最小后端改动。

## 10. 实现者交接信息

### 给前端实现者

- 不要新建产品域，不要自己发明新接口。
- 优先复用现有 React Router、TanStack Query、Zustand 模式。
- 视觉方向遵循 PRD：
  - PC 优先。
  - 顶部导航 + 左侧边栏 + 主内容区。
  - 科技蓝为主色，信息密度克制，卡片层次明确。
  - 移动端保留核心功能，不做桌面布局硬压缩。
- 避免把页面重新做成模板站；保持当前前台已有的精致感并统一语言。

### 给后端实现者

- 只有在前端真实阻塞时才介入。
- 变更优先级：
  1. 补字段，不改公共语义。
  2. 补聚合数据，不重写领域模型。
  3. 补测试，避免页面改动带来回归。

## 11. 推荐的下一步

1. 先改 `apps/web` 壳层、个人中心、通知页，完成前台主视觉收口。
2. 再改 `apps/admin` 壳层和概览页，完成后台成品感。
3. 若前台集成出现数据缺口，再评估是否需要最小后端补丁。
4. 最后运行最小验证，再扩大到 `typecheck`、`build` 和相关测试。
