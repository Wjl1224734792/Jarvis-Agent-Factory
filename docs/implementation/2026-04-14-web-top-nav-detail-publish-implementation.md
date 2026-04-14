# Web 详情页与发布页顶部导航实现记录

## 实现范围

- 仅修改 `apps/web`
- 未修改 `apps/admin`
- 未修改 `apps/server`
- 未修改 `packages/*`、路由常量语义、共享协议与环境变量

## 主要实现

### 1. 抽取共享顶部导航

- 新增 `apps/web/src/features/auth/web-top-nav.tsx`
- 将原 `WebLayout` 顶部导航逻辑抽为复用组件 `WebTopNav`
- 保留原有能力：
  - 品牌入口
  - 主导航
  - 移动端抽屉导航
  - 发布菜单
  - 用户菜单
  - 搜索提交与搜索页紧凑模式
  - 通知未读提示
- 新增可配置能力：
  - `showSearch`
  - `showSidebar`

### 2. 主站布局复用共享顶部导航

- `apps/web/src/features/auth/web-layout.tsx` 改为直接复用 `WebTopNav`
- 保留原有鉴权 bootstrap、缓存重置、鉴权失效监听、`AuthRequiredDialog`、左侧内容布局与 `Outlet`

### 3. 沉浸式布局按路由决定是否显示搜索

- `apps/web/src/features/auth/immersive-layout.tsx` 统一接入 `WebTopNav`
- 新增 `shouldShowImmersiveTopNavSearch(pathname)` 规则：
  - 详情页显示搜索
  - 发布文章 / 动态 / 飞行器 / 品牌申请 / 榜单编辑 / 发布结果页隐藏搜索
- 统一使用 `showSidebar={false}`，避免主站桌面侧边栏出现在沉浸式页面

### 4. 详情页接入顶部导航

- 通过 `ImmersiveLayout` 统一覆盖：
  - 机型详情
  - 帖子详情
  - 榜单详情
  - 评分对象详情
- `apps/web/src/components/immersive-page-shell.tsx` 仅微调顶部间距，避免与新增顶部导航挤压
- 未对详情页主体逻辑做顺手重构

### 5. 发布页接入顶部导航

- 发布页通过 `ImmersiveLayout` 统一获得顶部导航，且隐藏搜索
- `apps/web/src/components/publish-shell.tsx` 删除原有重复的「logo + 当前身份」头部区块
- 保留发布页标题区、`main/aside` 结构与原有表单/结果逻辑

### 6. “自己”入口规则

- 在共享顶部导航内固定个人入口：
  - 文案：`自己`
  - 目标：`APP_ROUTES.webProfile`
- 保持用户主页与他人主页继续挂在 `WebLayout` 下
- 未迁移 `profile-page.tsx` / `user-profile-page.tsx` 路由壳层

### 7. 回归测试更新

- 新增 `apps/web/tests/web-top-nav.test.ts`
- 补充单测覆盖：
  - `showSearch=true/false`
  - 沉浸式详情页 / 发布页搜索显示规则
  - “自己”入口文案与目标
- 更新 E2E 辅助与冒烟断言：
  - `apps/web/e2e/support/auth.ts`
  - `apps/web/e2e/site-smoke.spec.ts`
- 新断言覆盖：
  - 沉浸式详情页顶部搜索存在
  - 发布页顶部导航存在但搜索不存在
  - 登录用户访问他人主页时，顶部个人入口仍指向 `/me`

## 变更文件

- `apps/web/src/features/auth/web-top-nav.tsx`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/immersive-layout.tsx`
- `apps/web/src/components/immersive-page-shell.tsx`
- `apps/web/src/components/publish-shell.tsx`
- `apps/web/tests/web-top-nav.test.ts`
- `apps/web/e2e/support/auth.ts`
- `apps/web/e2e/site-smoke.spec.ts`

## 验证结果

### 已通过

- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `bun run test:unit`

### 未完全通过

- `bun run test`
  - Web 单测通过
  - Server 测试存在既有失败：
    - `apps/server/tests/posts.test.ts`
    - 用例：`backfills content category names by slug to Chinese labels`
    - 失败断言：`expected undefined to be '航拍'`
  - 该失败位于 server 内容分类回填逻辑，与本次 `apps/web` 顶部导航改动无直接关联

### 未执行

- `bun run test:e2e`
  - 已更新相关 E2E 用例，但本轮未启动完整浏览器端到端验证

## 风险备注

- 沉浸式页面顶部导航改为由 `ImmersiveLayout` 统一承载，后续若新增沉浸式页面，需要确认其是否属于“应显示搜索”还是“应隐藏搜索”的路由类别
- `apps/web/e2e/site-smoke.spec.ts` 与 `apps/web/e2e/support/auth.ts` 已按新导航语义更新；如果后续再调整导航文案或入口层级，相关断言需要同步维护
