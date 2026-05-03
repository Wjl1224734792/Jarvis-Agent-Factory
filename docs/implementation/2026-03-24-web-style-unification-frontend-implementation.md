# apps/web 共享前端层统一化重构实现

## 1. 当前实现目标
- 收敛 `apps/web` 的共享视觉 token。
- 提供统一的站点骨架、页面容器和 panel 语义层。
- 在不修改页面文件的前提下，让已有页面先获得更一致的基础外壳和 primitive 外观。
- 为后续页面批次迁移提供明确的共享模块落点。

## 2. 输入依据
- 用户要求：使用 spawn 对前端做统一化重构。
- 规划文档：[2026-03-24-web-style-unification-plan.md](E:/CodeStore/feijia/docs/plans/2026-03-24-web-style-unification-plan.md)
- 约束：只修改共享层，不修改 `apps/web/src/routes/*` 页面文件。

## 3. 工作区模式
- 共享层改造。
- 不调整路由、接口、业务状态。
- 仅处理视觉 token、壳层结构、共享 primitive / 模块。

## 4. 变更文件 / 变更范围
- `apps/web/src/styles.css`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/tabs.tsx`
- `apps/web/src/components/site-shell.tsx`

## 5. 实现说明

### 5.1 全局 token 收敛
- 在 `styles.css` 中新增并统一了以下 token：
  - `surface-1/2/3`
  - `panel-info / panel-highlight / panel-warning`
  - `radius-control / radius-panel`
  - `page-width / page-gap / page-pad-x / panel-padding`
  - `shadow-soft / shadow-panel / shadow-float`
- 调整了浅色主题与暗色主题的底色、card、secondary、sidebar 等变量，使页面即使继续使用 `bg-card/94`、`bg-secondary/42` 这类现有写法，也会落在更统一的色阶上。

### 5.2 站点级共享模块
- 新增 `apps/web/src/components/site-shell.tsx`：
  - `SiteShell`
  - `SitePage`
  - `SitePageHead`
  - `SitePageEyebrow`
  - `SitePageTitle`
  - `SitePageDescription`
  - `SiteGrid`
  - `SiteRail`
  - `SitePanel`
  - `SitePanelBody`
- 这些组件不是底层 primitive，而是站点级语义模块，供页面后续逐步迁移。

### 5.3 壳层统一
- `web-layout.tsx` 改为使用统一 token 和 `SitePanel` / `SiteShell`。
- 收敛了：
  - 顶部栏背景、搜索框、主操作按钮
  - 侧边导航容器层级
  - 品牌区块
  - 侧栏信息提示区
  - 内容区最大宽度与横向 padding
- 导航项改为复用 `Button variant="nav"`，减少后续每个导航块手写样式的需求。

### 5.4 primitive 外观统一
- `button.tsx`
  - 新增 `hero` / `panel` / `nav` variant。
  - 新增 `xl` size。
  - 所有圆角、阴影、交互过渡切换到共享 token。
- `card.tsx`
  - 新增 `variant` 概念：`default` / `muted` / `ghost` / `highlight`。
  - 统一 card 的圆角、边框、背景和 padding 体系。
- `badge.tsx`
  - 新增 `tone` / `eyebrow` 语义变体。
  - 统一 badge 为圆角 pill 体系。
- `tabs.tsx`
  - 新增 `pills` / `ghost` 语义变体。
  - 统一 segmented 与 line tab 的基线表现。

## 6. 测试和验证结果
- `bun run --cwd apps/web typecheck`
  - 通过
- `bun run --cwd apps/web build`
  - 通过
  - 存在 Vite chunk size warning，但不是本次共享层改造引入的功能错误

## 7. 边界和异常处理
- 未修改任何 `apps/web/src/routes/*` 页面文件。
- 未修改后端、接口契约、路由常量和数据请求逻辑。
- 未处理页面级重复 class 的彻底清理；本次只先完成共享层与壳层。

## 8. 风险 / 未解决项
- 现有页面仍有大量 `rounded-[...]` / `shadow-[...]` / `bg-card/94` 的页面内手写 class，视觉一致性只会先改善一部分，不会彻底收敛。
- `notifications-page.tsx`、`post-detail-page.tsx` 等页面仍未迁移到新的 `SitePanel` / `SiteGrid` 模块。
- 构建体积 warning 仍存在，本次未做拆包。

## 9. 需要 backend_implementer 配合的点
- 当前无必须的 backend 配合项。
- 后续如果要把“创建榜单页”真正接成可提交功能，才需要后端提供对应提交接口。

## 10. 推荐的下一步
1. 先迁移内容流页面到 `SitePage` / `SiteGrid variant="sidebar"` / `SitePanel`。
   - `home-page.tsx`
   - `circle-page.tsx`
   - `models-page.tsx`
2. 再迁移详情和个人中心页面。
   - `model-detail-page.tsx`
   - `rankings-page.tsx`
   - `profile-page.tsx`
   - `settings-page.tsx`
3. 最后迁移编辑器与登录页。
   - `login-page.tsx`
   - `compose-page.tsx`
   - `ranking-editor-page.tsx`
4. 页面迁移原则：
   - 外层容器优先换成 `SitePanel`
   - 页面头部优先换成 `SitePageHead`
   - 两栏布局优先换成 `SiteGrid` + `SiteRail`
   - 不再继续新增页面内魔法数圆角、阴影和背景组合
