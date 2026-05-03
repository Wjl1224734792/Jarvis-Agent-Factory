# apps/web 前端统一化重构计划

## 1. 需求文档路径
- 无单独需求文档；需求来源为本轮对话：`apps/web` 前端统一化重构规划

## 2. 任务文档路径
- [AGENTS.md](E:/CodeStore/feijia/AGENTS.md)
- [docs/workflows/workflow.md](E:/CodeStore/feijia/docs/workflows/workflow.md)

## 3. 当前轮次目标
- 将 `apps/web` 从“按页面临时拼装样式”收敛为“一套统一站点视觉语言 + 一套共享页面骨架 + 一组有限的模块级变体”。
- 保留现有路由、数据流和业务能力，不做新的业务扩展。
- 让首页、飞友圈、飞行器库、详情页、榜单、发布页、创建榜单页、个人中心、设置页、登录弹窗在同一设计系统下成立。

## 4. 当前轮次范围

### 在范围内
- `apps/web/src/styles.css`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/*.tsx`
- `apps/web/src/components/ui/*`
- `apps/web/src/lib/aviation-media.ts`

### 不在范围内
- `apps/server` 与接口行为
- `packages/schemas` / `packages/http-client` / `packages/shared` 的业务契约调整
- 管理端 `apps/admin`
- 新增复杂交互能力，例如榜单提交 API、消息中心功能扩展、搜索真实接线

## 5. 当前不统一的核心问题列表

### 5.1 视觉语言未收敛
- 同一站点内混用了至少三种不同语气：编辑感卡片、数据看板、营销横幅。
- 页面标题系统不一致：有的使用超大英文标题，有的使用中文大字，有的使用 badge + 大标题，有的直接卡片堆叠，没有统一层级。
- 色彩使用没有边界：主蓝色、琥珀色、高饱和渐变蓝、深色横幅均在多个页面无规则出现。

### 5.2 结构层缺少共享抽象
- `web-layout.tsx` 只统一了顶部栏和侧栏，没有统一内容区容器、页面头部、侧边栏卡片、主信息卡、分区标题等骨架。
- 各页面重复书写 `rounded-[1.8rem] border border-border/80 bg-card/94 shadow-*` 这类外观类名，但数值又不完全一致。
- “主内容 + 右侧信息栏”模式在首页、飞友圈、详情页、榜单页重复出现，但没有共享页面模板。

### 5.3 组件层语义不足
- 当前 `button` / `card` / `badge` / `tabs` 仍是通用 shadcn 变体，无法直接表达“站点导航按钮”“页头标签”“侧栏情报卡”“编辑器面板”等语义。
- 许多页面通过裸 `div` 和长 class 串实现样式，导致后续无法统一调整。

### 5.4 页面级风格偏移明显
- `login-page.tsx` 是居中弹窗语气；`profile-page.tsx` 是杂志式卡片语气；`rankings-page.tsx` 偏仪表盘；`compose-page.tsx` 偏工具台；这些风格没有通过统一 tokens 和模块变体约束。
- `aviation-media.ts` 用于补视觉素材，但页面对图片裁切比例、圆角、卡片层级的处理不一致，导致观感分裂。

### 5.5 字体与细节未统一
- 全局引入了 `Inter`、`Instrument Serif`、`Geist`，但实际页面几乎只在局部使用，缺少明确的“标题字体 / 正文字体 / 标签字体”规范。
- 大量页面自行定义 tracking、圆角、阴影和透明度，无法通过全局 tokens 调整。

## 6. 建议统一的视觉语言与共享样式层

## 6.1 建议的统一方向
- 方向：精密航空编辑系统
- 气质：克制、清晰、技术感，不走营销 Landing Page 风格
- 主题：浅色基底 + 蓝色主强调 + 极少量琥珀色评分提示
- 页面差异只通过内容模块体现，不通过整页换一套审美

## 6.2 设计约束
- 一级页面统一使用浅色空气感背景，不再额外为单页引入强烈深色背景块作为主视觉基调。
- 渐变仅允许用于少数“重点提示/数据亮点卡”，禁止作为每页主色基底。
- 英文大写眉题可保留，但必须作为统一的 secondary heading 体系，不应每页自定义。

## 6.3 共享样式层建议

### A. 全局 tokens 层
- 归于 `styles.css`
- 收敛以下 token：
  - 颜色：`surface-1/2/3`、`panel-highlight`、`panel-info`、`panel-warning`
  - 阴影：`shadow-panel`、`shadow-float`、`shadow-soft`
  - 圆角：页面级、卡片级、控件级三档
  - 间距：页面 section gap、panel padding、grid gap
  - 字体：标题、正文、标签的明确映射

### B. 站点骨架层
- 新增或内聚在 `web-layout.tsx`
- 统一能力：
  - 顶部栏布局
  - 侧边导航布局
  - 内容容器宽度
  - 页面主列/侧栏通用栅格
  - 通用页面头部区块

### C. 页面模块层
- 不建议全部塞进 `components/ui`
- 建议新增面向站点的共享模块，例如：
  - `page-shell`：页面头部、内容容器、两栏布局
  - `feature-panel`：统一情报卡/摘要卡
  - `editor-panel`：编辑器区块
  - `stat-strip`：指标条
  - `media-tile`：统一媒体展示比例和圆角
- 这些应放在 `apps/web/src/components` 下，而不是污染底层 `ui` primitives

### D. primitive 组件层
- `components/ui/*` 只做轻量收敛：
  - `button` 增加少量站点通用尺寸/variant
  - `badge` 增加有限语义状态
  - `card` 增加有限密度/层级变体
- 不应把整站所有视觉复杂度都压进 primitive

## 7. 当前轮次完成标准
- 站点至少有一套明确的视觉 token 和模块级外观规范
- 页面不再依赖大量页面内散落的魔法数 class 组合
- 首页、飞友圈、机型库、详情页、榜单页、编辑页、个人中心、设置页的骨架和卡片层级明显统一
- 登录页虽是模态语义，但视觉语言与站点主体一致
- 新增共享抽象后，页面级 class 重复显著下降
- 不改变现有业务请求行为

## 8. 是否需要先查阅 repo_explorer
- 不需要。
- 当前文件边界、共享区域和主要问题已清晰，足够直接进入实现。

## 9. 执行代理分工

### 唯一共享责任方
- `frontend_implementer-A`

### frontend_implementer-A 负责的共享区域
- `apps/web/src/styles.css`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/tabs.tsx`
- 如需要新增站点级共享模块，统一由 A 负责创建与收口

### frontend_implementer-B 负责的页面批次 1
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/routes/circle-page.tsx`
- `apps/web/src/routes/models-page.tsx`
- 目标：把“内容流 / 目录流”页面迁移到共享骨架和统一模块

### frontend_implementer-C 负责的页面批次 2
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/settings-page.tsx`
- 目标：把“详情 / 数据 / 个人中心”页面迁移到共享骨架和统一模块

### frontend_implementer-D 负责的页面批次 3
- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/routes/compose-page.tsx`
- `apps/web/src/routes/ranking-editor-page.tsx`
- `apps/web/src/lib/aviation-media.ts`
- 目标：把“弹窗 / 编辑器 / 媒体资源”页面迁移到统一的编辑工具语言

## 10. 共享区域改动归属

### 仅 frontend_implementer-A 可修改
- `styles.css`
- `web-layout.tsx`
- `components/ui/*` 中被本轮使用的 primitives
- 任何新增的共享页面骨架组件

### B/C/D 不可直接修改
- `styles.css`
- `web-layout.tsx`
- `components/ui/*`

### B/C/D 的工作方式
- 等 A 先落地共享样式层和通用骨架
- 然后在既定组件和 token 之上改各自页面
- 若发现共享组件缺口，只提需求给 A，不自行平行修改共享层

## 11. 任务拆分与顺序

### 阶段 1：共享层收敛
- 责任方：frontend_implementer-A
- 内容：
  - 收敛 `styles.css` token
  - 统一页面容器、主列/侧栏栅格、页头层级
  - 收敛 `button/card/badge/tabs` 的必要变体
  - 必要时新增站点级共享模块
- 验证：
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`

### 阶段 2：内容流页面重构
- 责任方：frontend_implementer-B
- 依赖：阶段 1 完成
- 内容：
  - 首页、飞友圈、机型库迁移到统一骨架
  - 统一内容卡、媒体比例、右侧信息栏卡片
- 验证：
  - 目标页面本地构建通过
  - 视觉差异只来自内容，不来自整体设计体系

### 阶段 3：详情与个人中心页面重构
- 责任方：frontend_implementer-C
- 依赖：阶段 1 完成
- 内容：
  - 机型详情、榜单、个人中心、设置页迁移到统一骨架
  - 统一指标条、信息卡、数据列表、侧栏推荐卡

### 阶段 4：编辑器与登录页重构
- 责任方：frontend_implementer-D
- 依赖：阶段 1 完成
- 内容：
  - 登录弹窗、发布页、创建榜单页迁移到统一的“编辑工具台”语义
  - `aviation-media.ts` 仅做必要清理，避免继续扩大视觉随机性

### 阶段 5：主代理整合与冲突收口
- 责任方：主代理
- 内容：
  - 合并实现结果
  - 处理共享组件接口调整
  - 统一零散 class

### 阶段 6：评审与验证
- 责任方：review_qa
- 内容：
  - 检查页面间视觉一致性
  - 检查是否出现新的重复样式和未复用模块
  - 检查回归风险

## 12. 风险提醒
- 当前页面高度依赖大段 Tailwind 原子类，重构时最容易出现“看起来更统一，但只是把魔法数换了地方”的假统一。
- 如果把过多站点视觉塞进 `components/ui/*`，会污染 primitive 层，后续维护成本上升。
- `aviation-media.ts` 当前直接提供远程素材 URL，若页面继续高度依赖不同图片比例，会削弱统一效果。
- `rankings-page.tsx`、`model-detail-page.tsx`、`compose-page.tsx` 结构复杂，最容易在重构中引入布局回归。
- `login-page.tsx` 是模态，不应为了统一而做成与普通页面完全相同的骨架；统一的是 tokens 和组件语义，不是布局形式。

## 13. 实现者交接信息
- 核心原则：先统一共享层，再动页面；不要反过来。
- 不要新增新的业务状态或 API 调用。
- 页面改造优先删除重复的视觉 class 组合，改用共享骨架/共享模块。
- 保持现有路由路径不变。
- 如果必须新增共享组件，优先放在 `apps/web/src/components`，避免滥改底层 `ui` primitives。

## 14. 推荐的下一步
1. 先派 `frontend_implementer` 完成共享层重构，限定其只改 `styles.css`、`web-layout.tsx` 和共享组件。
2. 共享层稳定后，再按页面批次派发 B/C/D。
3. 页面全部收口后，运行：
   - `bun run --cwd apps/web typecheck`
   - `bun run --cwd apps/web build`
   - `bun run typecheck`
   - `bun run build`
   - `bun run test`
4. 最后使用 `review_qa` 做视觉一致性和回归检查。
