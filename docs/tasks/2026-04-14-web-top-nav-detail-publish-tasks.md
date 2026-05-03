# 2026-04-14 Web 详情页与发布页顶部导航栏任务拆解

## 1. 需求来源
- [docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-04-14-web-top-nav-detail-publish-requirements.md)

## 2. 拆解原则
- 只覆盖 `apps/web`。
- 先抽公共顶栏能力，再做详情页与发布页接入。
- 详情页包含自己主页与他人主页，但顶部导航里的个人入口始终指向“自己”。
- 发布页复用同一套顶栏能力，但不显示搜索框。
- 不改后端接口、不改共享协议、不改路由常量语义。

## 3. 任务清单

### TASK-001 | 抽取可复用顶部导航组件
- 类型：共享
- 优先级：P0
- DDD：shared
- test_strategy：tdd
- 风险任务：是
- 完成标准：
  - 将 `WebLayout` 顶部区域拆成独立可复用的顶部导航组件。
  - 顶部导航支持品牌、主导航、发布菜单、用户菜单、搜索框开关、移动端抽屉等能力。
  - `WebLayout` 继续复用该组件，视觉和交互保持现有行为不回归。
  - `PublishShell` 可以消费同一套顶栏能力，但通过参数禁用搜索框。
- 文件所有权 / 共享路径提醒：
  - `apps/web/src/features/auth/web-layout.tsx`
  - 新增的顶部导航组件文件
  - `apps/web/src/components/publish-shell.tsx`
  - `apps/web/src/components/immersive-page-shell.tsx`

### TASK-002 | 详情页接入顶部导航
- 类型：前端
- 优先级：P0
- DDD：application
- test_strategy：test_after
- 风险任务：是
- 完成标准：
  - 机型详情页、帖子详情页、榜单详情页、评分对象详情页、自己主页、他人主页都展示顶部导航栏。
  - 详情页原有页面主体内容不做顺手重构，现有返回、分享、评论等局部操作保留。
  - 详情页与顶部导航之间的间距、sticky 行为和滚动体验不被破坏。
- 文件所有权 / 共享路径提醒：
  - `apps/web/src/routes/model-detail-page.tsx`
  - `apps/web/src/routes/post-detail-page.tsx`
  - `apps/web/src/routes/ranking-detail-page.tsx`
  - `apps/web/src/routes/rating-target-detail-page.tsx`
  - `apps/web/src/features/auth/profile-page.tsx`
  - `apps/web/src/routes/user-profile-page.tsx`

### TASK-003 | 发布页接入顶部导航且禁用搜索框
- 类型：前端
- 优先级：P0
- DDD：application
- test_strategy：test_after
- 风险任务：是
- 完成标准：
  - 发布文章、发布动态、发布飞行器、品牌申请、榜单编辑、发布结果页都接入顶部导航。
  - 发布页保留品牌标识、发布入口与用户菜单，但不显示搜索框。
  - 登录拦截、发布菜单、移动端抽屉与已有发布页壳层行为保持一致。
- 文件所有权 / 共享路径提醒：
  - `apps/web/src/routes/publish-article-page.tsx`
  - `apps/web/src/routes/publish-moment-page.tsx`
  - `apps/web/src/routes/publish-aircraft-page.tsx`
  - `apps/web/src/routes/publish-brand-page.tsx`
  - `apps/web/src/routes/ranking-editor-page.tsx`
  - `apps/web/src/routes/publish-status-page.tsx`

### TASK-004 | 统一“自己”入口文案与跳转规则
- 类型：共享
- 优先级：P0
- DDD：shared
- test_strategy：tdd
- 风险任务：是
- 完成标准：
  - 顶部导航中的个人入口文案始终显示为“自己”。
  - 入口跳转始终指向当前登录用户的个人主页，不会因为正在浏览他人主页而切换成被访问者。
  - 自己主页与他人主页复用同一套规则，不新增新的路由语义。
- 文件所有权 / 共享路径提醒：
  - 顶部导航组件文件
  - `apps/web/src/features/auth/web-layout.tsx`
  - `apps/web/src/features/auth/profile-page.tsx`
  - `apps/web/src/routes/user-profile-page.tsx`

### TASK-005 | 补齐顶部导航相关测试
- 类型：测试
- 优先级：P0
- DDD：supporting
- test_strategy：test_after
- 风险任务：否
- 完成标准：
  - 覆盖顶部导航在 `showSearch=true/false` 两种模式下的渲染差异。
  - 覆盖详情页顶部导航出现、发布页顶部导航不显示搜索框、个人入口始终为“自己”的回归用例。
  - 现有 Web 顶部搜索链路不被破坏，主站页面搜索仍可进入结果页。
- 文件所有权 / 共享路径提醒：
  - `apps/web/e2e/search-and-admin.spec.ts`
  - 新增的 `apps/web/e2e/*` 顶部导航用例
  - 新增的 `apps/web/src/**/*.test.tsx`

### TASK-006 | 导航接入回归守门
- 类型：验证
- 优先级：P0
- DDD：supporting
- test_strategy：test_after
- 风险任务：是
- 完成标准：
  - 桌面端和移动端都确认顶部导航未破坏 sticky、抽屉、菜单、登录拦截和页面首屏间距。
  - 详情页与发布页在浅色背景、滚动状态和返回路径下都保持稳定。
  - 明确确认未改动 `apps/admin`、`apps/server`、共享协议和路由常量语义。
- 文件所有权 / 共享路径提醒：
  - `apps/web/src/features/auth/web-layout.tsx`
  - `apps/web/src/components/publish-shell.tsx`
  - `apps/web/src/components/immersive-page-shell.tsx`
  - 详情页与发布页相关路由文件

## 4. DDD 分类
- `shared`：TASK-001、TASK-004
- `application`：TASK-002、TASK-003
- `supporting`：TASK-005、TASK-006

## 5. 推荐交付顺序
1. 先完成 `TASK-001`，把公共顶部导航能力抽出来。
2. 再完成 `TASK-004`，锁定“自己”入口规则。
3. 接着完成 `TASK-002` 和 `TASK-003`，分别接入详情页与发布页。
4. 最后做 `TASK-005` 和 `TASK-006`，补测试并做全链路回归。

## 6. 文件所有权 / 共享路径提醒
- `apps/web/src/features/auth/web-layout.tsx`、新增顶部导航组件、`apps/web/src/components/publish-shell.tsx` 属于同一条共享路径，不能被多个任务并行改写。
- `apps/web/src/features/auth/profile-page.tsx` 与 `apps/web/src/routes/user-profile-page.tsx` 必须一起校准“自己”入口规则。
- `apps/web/src/routes/model-detail-page.tsx`、`apps/web/src/routes/post-detail-page.tsx`、`apps/web/src/routes/ranking-detail-page.tsx`、`apps/web/src/routes/rating-target-detail-page.tsx` 归同一批详情页接入任务收口。
- `apps/web/src/routes/publish-article-page.tsx`、`apps/web/src/routes/publish-moment-page.tsx`、`apps/web/src/routes/publish-aircraft-page.tsx`、`apps/web/src/routes/publish-brand-page.tsx`、`apps/web/src/routes/ranking-editor-page.tsx`、`apps/web/src/routes/publish-status-page.tsx` 归同一批发布页接入任务收口。
- 测试文件建议集中到一个任务里统一新增，避免多个任务同时抢改 `apps/web/e2e/*`。
