# 2026-03-24 Web Shell Models Rankings Plan

## 1. 需求文档路径

- `E:/CodeStore/feijia/docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`

## 2. 任务文档路径

- 无单独任务文档，本轮任务直接来自用户请求

## 3. 当前轮次目标

在不扩散范围的前提下完成一轮最小可用前台交付：

1. Web 左侧边栏固定在左侧，并支持折叠/展开。
2. 飞行器库页改为更符合 PRD 的卡片流/卡片网格展示。
3. 新增榜单前台功能，优先交付可浏览、可切换官方榜/用户榜、可展示口碑标签和快速评分入口的最小版本。

## 4. 当前轮次范围

### 4.1 必做范围

- 调整 `apps/web` 主布局，使桌面端左侧边栏为固定侧边栏，并保留移动端抽屉导航。
- 为桌面端增加边栏折叠状态管理与折叠按钮，折叠后保留图标导航和核心入口可达性。
- 将飞行器库从纵向列表改为卡片网格，保留现有筛选能力，并补齐 PRD 对“卡片展示 + 结果总数 + 品牌索引/筛选区”的表达。
- 新增榜单页面路由和页面实现，至少包含：
  - 官方榜与用户榜分区/Tab；
  - 官方榜按现有机型评分数据排序展示；
  - 口碑标签映射规则；
  - 快速评分入口；
  - 用户榜先以前台展示为主，不要求完整创作流程。

### 4.2 明确不做

- 不在本轮补齐完整创榜、审核申请、拖拽排序、后台管理流程。
- 不在本轮扩展消息、发布、个人中心等与用户请求无关的模块。
- 不做数据库结构重构，不引入新的复杂排行榜算法实现。
- 不强行补 PRD 中所有榜单后端能力，只做当前页面可用所需的最小数据支撑。

## 5. 完成标准

- 桌面端侧边栏始终固定于左侧，主内容区随折叠状态自适应。
- 桌面端存在明确可点击的折叠按钮，折叠状态在页面内切换稳定。
- `/models` 页面以卡片网格展示机型，筛选后总数与结果同步更新。
- `/rankings` 或等效榜单路由可正常访问，并展示官方榜与用户榜两个视图。
- 官方榜能基于真实机型与评分数据生成排序结果。
- 页面展示口碑标签与快速评分交互，且不破坏现有机型详情/评分流程。
- 相关类型检查通过；至少完成 `apps/web` 构建或类型检查。

## 6. 是否需要先查阅 repo_explorer

- 不需要额外查阅。当前边界已足够明确：
  - 前端入口：`apps/web/src/app.tsx`
  - 布局：`apps/web/src/features/auth/web-layout.tsx`
  - 侧边栏状态：`apps/web/src/store/use-app-shell-store.ts`
  - 飞行器库页：`apps/web/src/routes/models-page.tsx`
  - 共享路由与 API 常量：`packages/shared/src/index.ts`
  - HTTP Client：`packages/http-client/src/index.ts`
  - 服务端现有模型/点评模块：`apps/server/src/modules/aircraft-models/*`、`apps/server/src/modules/reviews/*`

## 7. 执行代理分工

### 7.1 frontend_implementer

负责以下前端实现：

- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/store/use-app-shell-store.ts`
- `apps/web/src/app.tsx`
- `apps/web/src/routes/models-page.tsx`
- 新增榜单页面及其局部 UI 组件，优先放在 `apps/web/src/routes` 或贴近榜单页面的 `features` 子目录
- `apps/web/src/styles.css` 中必要的样式补充

前端职责包括：

- 固定侧边栏与折叠交互；
- 飞行器库卡片网格；
- 榜单页面视觉与交互；
- 在共享契约稳定后接入榜单数据。

### 7.2 backend_implementer

仅当本轮决定补最小榜单接口时介入，负责：

- `apps/server/src/modules/aircraft-models/*`
- `apps/server/src/modules/reviews/*`
- 如需新增榜单聚合接口，可新增 `apps/server/src/modules/rankings/*`

后端职责包括：

- 聚合官方榜所需的机型评分结果；
- 输出前端榜单页最小可用数据；
- 不负责本轮用户榜完整 CRUD。

## 8. 共享区域改动归属

以下共享区域必须单人负责，不可并行修改：

### 8.1 `packages/shared/src/index.ts`

- 唯一责任方：`frontend_implementer`
- 原因：本轮首先要定义前端榜单路由常量，若需要新增 API 路由常量，也应由同一责任方一次性收口，避免路由常量冲突。

### 8.2 `packages/http-client/src/index.ts`

- 唯一责任方：`frontend_implementer`
- 原因：HTTP client 属于共享请求基础设施；若新增榜单读取接口，应由同一责任方维护调用签名与消费方式。

### 8.3 `packages/schemas/src/*`

- 唯一责任方：`backend_implementer`
- 原因：若新增榜单响应 schema，应与服务端响应一起落地，避免前后端各自猜测字段。

### 8.4 `apps/server/src/app.ts` 或路由聚合入口

- 唯一责任方：`backend_implementer`
- 原因：任何新增服务端模块注册都属于后端入口改动，必须由后端统一处理。

## 9. 任务分解与顺序

### 任务包 A：布局改造

- 修改 `WebLayout` 使桌面端左栏固定。
- 扩展 `use-app-shell-store`，增加 `isSidebarCollapsed` 与切换方法。
- 在 `WebLayout` 中接入折叠按钮、折叠样式和导航文案收缩。

交付性质：纯前端。  
并行性：可与后端榜单接口开发并行，但不能与共享路由改动并行。

### 任务包 B：飞行器库卡片化

- 在 `models-page.tsx` 中保留筛选逻辑，改造列表渲染为卡片网格。
- 将品牌区调整为更像索引/筛选面板的形式。
- 结果区顶部保留总数、筛选状态、重置操作。

交付性质：纯前端。  
依赖：A 完成后更稳妥，因为布局宽度会影响卡片网格断点。

### 任务包 C：榜单最小数据方案决策

先做一次明确判断：

#### 方案 C1：纯前端最小版

- 条件：现有 `listModels` + 单模型评分信息足够支持榜单展示，或可以接受首版只展示静态/派生数据。
- 交付：榜单页面先消费现有接口或前端派生数据。
- 适用内容：
  - 榜单路由；
  - 官方榜 UI；
  - 用户榜前台卡片；
  - 口碑标签；
  - 快速评分入口按钮。

#### 方案 C2：补最小后端榜单接口

- 条件：官方榜需要按“综合评分 + 点评人数”稳定排序，而现有模型列表接口没有该聚合信息。
- 交付：新增榜单聚合接口，仅支撑官方榜读取。
- 必补区域：
  - `packages/schemas`
  - `packages/shared`
  - `packages/http-client`
  - `apps/server`

建议：本轮优先采用 C2。理由是 PRD 明确要求官方榜基于评分和点评人数生成，前端纯派生在现有接口下信息不足，容易做成假榜单。

### 任务包 D：榜单页面实现

- 新增榜单路由常量与 React Router 页面挂载。
- 页面内容建议包含：
  - 顶部说明区；
  - 官方榜 / 用户榜 Tabs；
  - 官方榜排序说明；
  - 榜单卡片列表；
  - 口碑标签与评分信息；
  - 快速评分入口，点击可跳转机型详情页评分区或复用现有点评表单能力。

用户榜本轮建议采用“平台精选榜 / 飞友推荐榜”等预置展示卡片，不实现用户创建编辑。

### 任务包 E：验证与回归

- `bun run --cwd apps/web typecheck`
- 如有后端改动：
  - `bun run --cwd apps/server typecheck`
  - 针对榜单接口增加最小测试或至少跑相关测试集
- 如共享 schema/client 有改动：
  - `bun run typecheck`

## 10. 推荐的最小交付范围

### 可只做前端的部分

- 固定左侧边栏与折叠按钮
- 飞行器库卡片网格改造
- 榜单页面布局、Tabs、榜单卡片、口碑标签映射
- 用户榜首版展示卡片
- 快速评分入口 UI 与跳转交互

### 必须补 shared/http-client/server 的部分

- “官方榜按综合评分 + 点评人数排序”的真实数据来源
- 榜单聚合响应 schema
- 榜单 API 路由常量
- 榜单 HTTP client 方法
- 服务端榜单聚合接口

结论：榜单如果只做前端，会缺少可信的官方榜排序数据。侧边栏和飞行器库可以纯前端完成；官方榜建议补最小全链路。

## 11. 涉及文件边界

### 前端核心边界

- `E:/CodeStore/feijia/apps/web/src/app.tsx`
- `E:/CodeStore/feijia/apps/web/src/features/auth/web-layout.tsx`
- `E:/CodeStore/feijia/apps/web/src/store/use-app-shell-store.ts`
- `E:/CodeStore/feijia/apps/web/src/routes/models-page.tsx`
- `E:/CodeStore/feijia/apps/web/src/routes/model-detail-page.tsx`
- `E:/CodeStore/feijia/apps/web/src/routes/model-review-form.ts`
- `E:/CodeStore/feijia/apps/web/src/styles.css`

### 共享边界

- `E:/CodeStore/feijia/packages/shared/src/index.ts`
- `E:/CodeStore/feijia/packages/http-client/src/index.ts`
- `E:/CodeStore/feijia/packages/schemas/src/index.ts`
- 可能新增 `E:/CodeStore/feijia/packages/schemas/src/rankings.ts`

### 后端边界

- `E:/CodeStore/feijia/apps/server/src/app.ts`
- `E:/CodeStore/feijia/apps/server/src/modules/aircraft-models/*`
- `E:/CodeStore/feijia/apps/server/src/modules/reviews/*`
- 可能新增 `E:/CodeStore/feijia/apps/server/src/modules/rankings/*`

## 12. 风险提醒

1. 当前仓库存在部分中文文案编码异常。实现时不要顺手大面积清洗，避免无关 diff；仅在本轮触及文件中顺带修正必要文案。
2. `listModels` 当前 schema 不含评分摘要。若坚持纯前端实现官方榜，只能做伪排序，不符合 PRD。
3. 侧边栏固定后会影响页面宽度和 sticky 行为，`models-page` 的品牌筛选区断点需要一起调整。
4. 榜单“快速评分”如果直接内嵌完整交互，容易扩成点评系统重构。本轮应只做最小入口或复用现有点评提交路径。

## 13. 实现者交接信息

- 当前请求不是全面补齐 PRD，而是优先交付“看得见、可访问、最小可用”的前台能力。
- 不要把“用户榜创建/审核/排序管理”拉进本轮。
- 如果后端榜单接口新增字段，先稳定 schema，再接前端页面。
- 如果实现代理发现模型详情页已有评分摘要数据足够支撑榜单，可回退到纯前端方案，但必须明确说明排序依据与限制。

## 14. 推荐的下一步

1. 先由 `frontend_implementer` 完成任务包 A 与 B，保证布局和机型库视觉落地。
2. 同时由 `backend_implementer` 评估并实现最小官方榜聚合接口（若确认现有数据不足）。
3. 共享层稳定后，由 `frontend_implementer` 完成榜单页面接入。
4. 最后执行 `review_qa` 做回归检查，重点看布局回归、筛选逻辑和榜单排序依据。
