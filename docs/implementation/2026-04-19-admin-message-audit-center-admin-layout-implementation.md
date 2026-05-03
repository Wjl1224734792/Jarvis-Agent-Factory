# 2026-04-19 Admin 传统后台布局重整实现说明

## 1. 当前实现目标

- 仅完成 `TASK-AMAC-004`：把 `apps/admin` 的壳层、导航和首页骨架重整为更传统的 Ant Design 管理后台布局。
- 保留现有业务路由与审核页入口，不实现消息中心真实数据接线，不改共享契约、`apps/server`、`packages/*`。
- 为后续消息中心 / 待办接入预留稳定位置，且不破坏现有审核页对 `status` 查询参数的消费方式。

## 2. 输入依据

- requirements: `docs/requirements/2026-04-19-admin-message-audit-center-requirements.md`
- tasks: `docs/tasks/2026-04-19-admin-message-audit-center-tasks.md`
- plan: `docs/plans/2026-04-19-admin-message-audit-center-plan.md`
- 用户追加约束：
  - 继续使用 antd，优先 `Layout` / `Menu` / `Card` / `Table`
  - 壳层必须保留审核页现有入口
  - 多个审核页已消费 `status` 查询参数，后续接线应复用这一套落点

## 3. 工作区模式

- 仓库模式：单仓 workspace
- 当前代理角色：前端实现代理
- 文件系统模式：`danger-full-access`
- 本轮只在授权路径内改动，未处理并行代理正在进行的 `server` / `packages` 变更

## 4. 变更文件 / 变更范围

- `apps/admin/src/features/auth/admin-shell.tsx`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/admin/src/features/auth/admin-navigation.ts`
- `apps/admin/src/styles.css`
- `apps/admin/tests/admin-navigation.test.ts`

## 5. 实现说明

### 5.1 壳层与导航

- 用 `Layout + Header + Sider + Content` 收敛后台壳层，头部固定，左侧导航固定，右侧内容区滚动。
- 导航从自绘链接列表切到 `Menu items` 驱动，按既有业务分区组织，保留审核 / 运营 / 管理入口，不隐藏现有业务路由。
- 头部保留搜索、当前管理员、退出登录，同时新增“消息中心 / 待办”占位入口，仅作为后续接线保留位，不承诺当前可用。
- 新增 `getAdminNavigationState` / `getAdminNavGroupKey`，统一路由别名归一化与 `Menu` 选中态计算。

### 5.2 首页骨架

- 首页首屏重排为四个稳定区块：
  - KPI
  - 待办总览
  - 最近通知占位
  - 快捷入口
- KPI 直接复用现有 analytics 数据，不新增本地拼装协议。
- 待办总览继续落到现有审核页和 `status` 查询参数，不发明新 query 协议。
- 最近通知区只做占位文案，明确后续消息中心会复用现有审核落点。
- 审核开关矩阵、趋势图表、审核漏斗、审核状态对比、最近登录设备保留，但下沉到首屏之后，减少原先首页“卡片式导航堆叠”的噪音。

### 5.3 样式

- 仅收敛壳层和首页相关样式，未重写业务页表单 / 表格逻辑。
- 新增一组最终覆盖样式，统一头部、侧边栏、Menu、Card、首页 KPI / 待办 / 快捷入口视觉，保持传统后台观感。
- 保留项目品牌色，但不再使用首页大面积自定义导航卡片作为一级 IA。

## 6. 测试和验证结果

### 定向验证

- `antd.cmd info Layout --format json`
- `antd.cmd info Menu --format json`
- `antd.cmd info Card --format json`
- `antd.cmd info Table --format json`
- `antd.cmd doc Menu --format json`
- `antd.cmd demo Layout fixed-sider --format json`
- `antd.cmd demo Card basic --format json`
- `antd.cmd lint E:\CodeStore\feijia\apps\admin\src --format json`
  - 结果：`issues = 0`
- `bunx vitest run --config vitest.config.ts apps/admin/tests/admin-navigation.test.ts apps/admin/tests/admin-password-route.test.ts apps/admin/tests/admin-auth-redirects.test.ts`
  - 结果：`3 files passed / 7 tests passed`
- `bun run --cwd apps/admin typecheck`
  - 结果：通过

### 根级验证

- `bun run typecheck`
  - 结果：通过
- `bun run build`
  - 结果：通过
- `bun run lint`
  - 结果：失败
  - 原因：`apps/server/src/modules/social/social.route.ts` 存在未使用符号，超出本任务授权路径
- `bun run test`
  - 结果：失败
  - 原因：`packages/http-client/tests/admin-messages.test.ts` 触发 `Body is unusable: Body has already been read`，超出本任务授权路径

## 7. 边界和异常处理

- 未接入消息中心真实接口；头部入口和首页通知区仅为稳定占位。
- 未新增消息中心路由、未改审核页深链接、未改 `status` 查询参数协议。
- 导航选中态对 admin 别名路由做了统一归一化，避免首页、历史兼容路由和新 Menu 选中态漂移。
- 保留退出登录、鉴权失效清缓存、搜索路由参数同步等现有壳层行为。

## 8. 风险 / 未解决项

- `styles.css` 现有历史样式较多，本轮通过最终覆盖样式收敛视觉，但尚未做系统性清理。
- 根级 `lint` / `test` 仍受其他并行任务改动影响，当前不能在本任务路径内修复。
- 首页仍依赖现有 analytics / site settings / auth sessions 接口；如果后续接口契约变化，需要由对应 owner 处理。

## 9. 需要后端配合的点

- 本任务本身不需要新增后端接口。
- 后续 `TASK-AMAC-003` 接入消息中心 / 待办时，需要后端提供稳定的 admin 消息聚合查询与统计能力。
- 后续消息 / 待办跳转应优先复用已有审核页 `status` 查询参数，不应重新发明 query 协议。

## 10. 推荐的下一步

- 由同一前端通道继续执行 `TASK-AMAC-003`，在当前头部保留位和首页通知区接入真实消息 / 待办数据。
- 继续沿用现有审核页 `status` 落点，把首页待办卡片和后续消息中心都落到同一套审核页入口。
- 等并行 `server` / `packages` 任务收敛后，再统一处理根级 `lint` / `test` 的非本任务失败项。
