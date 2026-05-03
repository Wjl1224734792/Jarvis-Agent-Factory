# Web/Admin 内容闭环与后台重构需求说明

## 1. 需求摘要
- `web` 与 `admin` 需要统一接入 `packages/shared/assets/logo/favicon.ico` 和 `logo.jpg`，同时用于站点 header/logo 与标签页 favicon。
- `web` 飞友圈卡片需要收紧列间距、缩短过长卡片比例，并向小红书式图文卡片靠拢。
- `admin` 需要重排为四大分区：`数据总览 / 审核 / 运营 / 管理`，并修复总览页用户数据卡片过窄问题。
- 审核体系需要按内容域独立拆分，文章、飞友圈动态、品牌申请、机型投稿、榜单、榜单条目、评论都应各自拥有人工/自动审核开关。
- 已发布内容在人工审核开启时，编辑后需要回到待审状态。
- 评论区需要补齐点赞能力，默认热评优先，并保留按最新切换。
- 所有公开内容需要新增举报能力。
- 品牌申请与机型投稿必须彻底分离，品牌不再联动分类，机型/飞行器发布只能选择已有品牌且支持搜索。
- 机型详情页补齐评论/回复，榜单条目详情页补齐回复。
- 作者需要能够管理自己发布的内容，包括编辑/删除、个人中心入口、评论编辑/删除，以及榜单条目按作者权限控制的编辑/删除。

## 2. 目标与成功标准
- Web 与 Admin 的品牌资产统一显示，favicon 在浏览器标签页生效。
- 飞友圈卡片视觉更紧凑，卡片比例更接近小红书式瀑布流。
- Admin 的信息架构清晰，审核与运营入口不再混杂。
- 共享契约、后端接口、前端页面在内容审核、举报、点赞、回复、编辑/删除权限上保持一致。
- 品牌/机型/投稿链路不再互相强耦合，发布飞行器时只能选现有品牌并可搜索。

## 3. 范围内
- `web`、`admin`、`server`、`packages/schemas`、`packages/http-client`、`packages/shared`、`packages/db`
- 文章、飞友圈动态、机型、榜单、榜单条目、评论、品牌、机型投稿相关链路
- Admin 路由、导航、总览、审核、运营、管理相关页面

## 4. 范围外
- 不做与本次需求无关的全站重构
- 不扩展到新的业务域
- 不引入新的存储引擎或全新上传体系

## 5. 模块映射
- 共享契约：`packages/shared/src/index.ts`、`packages/schemas/src/*`、`packages/http-client/src/index.ts`
- 数据层：`packages/db/src/schema.ts`
- 后端：`apps/server/src/modules/posts/*`、`apps/server/src/modules/rankings/*`、`apps/server/src/modules/reviews/*`、`apps/server/src/modules/aircraft-models/*`、`apps/server/src/modules/brands/*`
- Web：`apps/web/src/routes/*`、`apps/web/src/features/*`、`apps/web/index.html`
- Admin：`apps/admin/src/app.tsx`、`apps/admin/src/features/*`、`apps/admin/index.html`

## 6. 风险与开放问题
- `机型` 的“作者可编辑/删除”在当前代码里没有现成的作者归属模型，可能需要先明确是对“用户投稿记录”生效，还是要给 `aircraft_models` 引入 owner 字段。
- 审核开关从单一内容域扩展到独立内容域后，`site_settings`、统计接口和前端面板都要同步改，避免前后端字段不一致。
- 评论点赞、举报、热评排序会同时影响帖子、机型、榜单、飞友圈多个详情页，属于高回归风险区。

