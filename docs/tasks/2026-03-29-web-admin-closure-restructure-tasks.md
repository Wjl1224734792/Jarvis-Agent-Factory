# Web/Admin 内容闭环与后台重构任务拆分

## 1. 需求文档路径
- [docs/requirements/2026-03-29-web-admin-closure-restructure-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-29-web-admin-closure-restructure-requirements.md)

## 2. 任务概览
- 本轮任务分成三条主线：共享契约与数据层、后端内容闭环、前端体验与后台重构。
- 高风险共享文件必须单线程收口，不能让多个实现任务并行抢改同一份 schema / contract / route 常量。
- 优先顺序是先稳定契约，再落后端行为，最后统一前端入口和视觉层。

## 3. 任务分解列表

### 3.1 共享契约与数据层

| 任务 ID | 名称 | 类型 | 优先级 | `test_strategy` | 完成标准 |
|---|---|---|---|---|---|
| SH-1 | 审核与站点开关契约拆分 | 共享契约 | P0 | `tdd` | 将文章、动态、品牌申请、机型投稿、榜单、榜单条目、评论的独立审核开关收敛到统一契约；`site_settings`、`schemas`、`http-client` 与后端读取逻辑能表达“独立人工/自动审核”而不是单一内容开关。 |
| SH-2 | 品牌与机型/投稿契约去耦 | 共享契约 | P0 | `tdd` | `brand` 不再携带分类联动语义；机型/飞行器发布契约只允许选择已有品牌并支持搜索；品牌申请与机型投稿的输入输出 schema 被拆开，避免继续沿用“发布时新建品牌”的混合形态。 |
| SH-3 | 互动、举报与评论动作统一契约 | 共享契约 | P0 | `tdd` | 评论点赞、内容举报、评论回复、评论编辑/删除、热评排序所需的输入输出 schema 统一落在共享层，前后端对 `post / model / ranking / circle / comment / item` 的动作模型一致。 |

### 3.2 后端

| 任务 ID | 名称 | 类型 | 优先级 | `test_strategy` | 完成标准 |
|---|---|---|---|---|---|
| BE-1 | 审核与发布状态机收口 | 后端 | P0 | `tdd` | 后端按内容域独立决定 `pending/published/rejected/hidden`；已发布内容在人工审核开启时编辑后回到待审；Admin 创建的公开内容也遵循同一审核规则。 |
| BE-2 | 品牌/机型/投稿去耦实现 | 后端 | P0 | `tdd` | 品牌创建不再写入分类联动逻辑；机型/飞行器发布只能选已有品牌并支持搜索；品牌与机型分类关系从服务层、查询层与写入层同时解除。 |
| BE-3 | 作者内容编辑/删除与个人中心权限 | 后端 | P0 | `tdd` | 作者可编辑/删除自己发布的文章、动态、榜单、评论与榜单条目；评论的编辑/删除规则与“个人中心可管理的内容”规则统一；机型/条目若当前无作者归属，需要在实现前补齐 owner 映射或先明确只作用于投稿记录。 |
| BE-4 | 评论点赞、举报、热评排序与多内容域落地 | 后端 | P0 | `tdd` | 帖子、飞友圈动态、机型评论、榜单评论、榜单条目评论都支持点赞、举报与按热度排序；默认热门优先，并保留最新切换；返回结构能携带点赞数、是否点赞和举报状态。 |
| BE-5 | 榜单条目回复与条目权限 | 后端 | P0 | `tdd` | 榜单条目详情支持回复线程；当榜单作者开放“允许他人加条目”后，只有自己新增的条目允许编辑/删除，作者可管理全部条目。 |

### 3.3 Web

| 任务 ID | 名称 | 类型 | 优先级 | `test_strategy` | 完成标准 |
|---|---|---|---|---|---|
| FE-1 | Web/Admin Logo 与 favicon 接入 | 前端(web/admin) | P0 | `test_after` | `web` 与 `admin` 的 `index.html`、header/logo 统一使用 `logo.jpg` 与 `favicon.ico`；浏览器标签页、顶部品牌块与站点识别保持一致。 |
| FE-2 | 飞友圈卡片紧凑化改造 | 前端(web) | P1 | `manual_only` | 飞友圈瀑布流的列宽、列间距、卡片宽高比与圆角样式调整为更接近小红书式图文卡片，视觉上不再过宽过长，移动端与桌面端都保持可读。 |
| FE-3 | 评论/回复/点赞/举报交互补齐 | 前端(web) | P0 | `test_after` | 帖子、机型、榜单条目、飞友圈动态的评论区都能点赞、举报、回复，并支持作者编辑/删除自己的评论；默认热评优先，仍可切换最新。 |
| FE-4 | 发布与个人中心内容管理入口 | 前端(web) | P0 | `test_after` | 发布飞行器页面只允许从已有品牌中搜索选择，不再出现新品牌提案路径；个人中心补齐对文章、动态、榜单、评论、机型/投稿等自己内容的编辑/删除入口。 |
| FE-5 | 榜单条目/机型详情补全回复能力 | 前端(web) | P1 | `test_after` | 榜单条目详情页支持回复；机型详情页的评论与回复交互完整可用，相关空状态、按钮态和刷新逻辑一致。 |

### 3.4 Admin

| 任务 ID | 名称 | 类型 | 优先级 | `test_strategy` | 完成标准 |
|---|---|---|---|---|---|
| AD-1 | 后台四大分区导航重排 | 前端(admin) | P0 | `test_after` | 后台导航按 `数据总览 / 审核 / 运营 / 管理` 重组，创建文章、飞行器、榜单的入口集中在运营，审核入口集中在审核，信息架构不再混杂。 |
| AD-2 | 总览页卡片与布局修复 | 前端(admin) | P0 | `test_after` | 数据总览页的用户数据卡片宽度恢复正常，关键指标布局更稳定，首页不再出现“卡片过窄”的视觉问题。 |
| AD-3 | 审核页与内容页分离 | 前端(admin) | P0 | `test_after` | 文章/动态/机型/榜单/评论/品牌申请/机型投稿各自进入对应审核或管理页；人工/自动审核开关按内容域拆分展示，不再用单一页面堆叠所有审核操作。 |
| AD-4 | 品牌/机型管理页去联动与搜索化 | 前端(admin) | P0 | `test_after` | 品牌创建不再需要选择一级分类；机型创建/编辑仅选择已有品牌并支持搜索；后台表单和列表展示不再暗含品牌-分类绑定关系。 |

## 4. DDD 分类

### 需要 DDD
- `SH-1`
- `SH-2`
- `SH-3`
- `BE-1`
- `BE-2`
- `BE-3`
- `BE-4`
- `BE-5`

原因：
- 这批任务直接改变内容审核、发布、举报、点赞、回复、作者权限和品牌/机型关系，涉及状态机和跨实体一致性。
- 共享契约、数据库 schema、后端服务和前端呈现需要保持同一业务模型，不能拆成孤立的页面改动。

### 不需要 DDD
- `FE-1`
- `FE-2`
- `FE-3`
- `FE-4`
- `FE-5`
- `AD-1`
- `AD-2`
- `AD-3`
- `AD-4`

## 5. TDD 与直接开发分类

### 必须 TDD
- `SH-1`
- `SH-2`
- `SH-3`
- `BE-1`
- `BE-2`
- `BE-3`
- `BE-4`
- `BE-5`

### 直接开发 / 实现后补测
- `FE-1` `test_after`
- `FE-2` `manual_only`
- `FE-3` `test_after`
- `FE-4` `test_after`
- `FE-5` `test_after`
- `AD-1` `test_after`
- `AD-2` `test_after`
- `AD-3` `test_after`
- `AD-4` `test_after`

## 6. 风险任务
- `SH-1`：审核开关一旦拆分，`site_settings`、统计接口和所有管理页都要同步更新，任何一处漏改都会造成前后端字段不一致。
- `SH-2`：品牌/机型去耦会触碰 DB schema、共享 schema、服务层和前端表单，回归面很广。
- `BE-1`：编辑后回到待审会改变已发布内容的可见性，需要明确“下线待审”的用户体验和通知策略。
- `BE-3`：机型/条目的作者归属当前未完全明确，存在 owner 映射缺口，需要先在实现阶段锁定对象模型。
- `BE-4`：点赞、举报、热评排序同时影响多个内容域，是最容易漏接口和漏 UI 的区域。
- `AD-1` 和 `AD-3`：后台导航和页面归类重排会影响大量入口，容易出现路由丢失或重复入口。

## 7. 文件所有权和共享路径提醒
- 以下路径必须单线程收口，避免多个任务并行改同一份共享契约：
- `packages/db/src/schema.ts`
- `packages/shared/src/index.ts`
- `packages/schemas/src/posts.ts`
- `packages/schemas/src/models.ts`
- `packages/schemas/src/rankings.ts`
- `packages/schemas/src/reviews.ts`
- `packages/schemas/src/site-settings.ts`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts`
- `apps/server/src/modules/posts/*`
- `apps/server/src/modules/rankings/*`
- `apps/server/src/modules/reviews/*`
- `apps/server/src/modules/aircraft-models/*`
- `apps/server/src/modules/brands/*`
- `apps/admin/src/app.tsx`
- `apps/admin/src/features/auth/admin-navigation.ts`
- `apps/admin/src/features/auth/admin-overview-page.tsx`
- `apps/web/index.html`
- `apps/admin/index.html`

## 8. 推荐交付顺序
1. `SH-1`、`SH-2`、`SH-3` 先收口共享契约。
2. `BE-1`、`BE-2`、`BE-4`、`BE-5` 落后端状态机、去耦、互动和回复能力。
3. `BE-3` 落作者编辑/删除与个人中心权限。
4. `AD-1`、`AD-2`、`AD-3`、`AD-4` 调整后台结构、总览和表单。
5. `FE-1`、`FE-3`、`FE-4`、`FE-5` 补齐 Web 侧内容闭环。
6. `FE-2` 做飞友圈视觉紧凑化，最后通过浏览器手工验收。

## 9. 推荐的下一步
- 把这份任务拆分交给 `planner`，按共享契约单线程原则生成执行序列。
- `planner` 需要额外标明每个 `tdd` 任务的 Red / Green 验证命令，以及哪些任务必须串行。
- 如果后续要继续细化，可以把 `BE-3` 的“机型作者归属”单独拆成一条前置任务，避免实现时临时补对象模型。

