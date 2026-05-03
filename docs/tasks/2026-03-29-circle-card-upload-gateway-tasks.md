# 飞友圈卡片比例与统一上传网关任务拆分

## 1. 需求文档路径
- [docs/requirements/2026-03-29-circle-card-upload-gateway-requirements.md](/E:/CodeStore/feijia/docs/requirements/2026-03-29-circle-card-upload-gateway-requirements.md)

## 2. 任务概览
- 本轮分两条线：前端视觉收口和上传系统全量重构。
- 前端视觉部分只调飞友圈瀑布流卡片比例，不扩展新交互。
- 上传系统按你确认的方案全量切到 `files` 主表、`fileId` 引用和前端直传，不保留旧 multipart 转传作为主链路。
- 共享契约、DB schema、上传网关和所有上传调用面都属于高风险区，不能多人同时改同一组文件。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | `test_strategy` | 完成标准 |
|---|---|---|---|---|---|
| FE-1 | 飞友圈瀑布流卡片改为纵向长方形 | 直接开发 | P0 | `test_after` | `apps/web/src/routes/circle-page.tsx`、`apps/web/src/routes/circle-page-helpers.ts`、`apps/web/src/components/page-skeletons.tsx` 的卡片宽高比例统一收紧，主列表与骨架屏视觉一致，移动端不出现拥挤或截断；至少补一组 helper 断言和一次浏览器 smoke 验证。 |
| SH-1 | `files` 主表与统一上传契约 | DDD + TDD | P0 | `tdd` | `packages/db/src/schema.ts`、`packages/schemas/src/*`、`packages/shared/src/index.ts` 形成统一文件/上传契约，`files` 主表具备 `provider`、`bucket`、`objectKey`、`status`、`visibility` 等核心字段，新旧上传描述和 API 路由常量可以被后端与前端同时引用。 |
| BE-1 | 上传网关与 Provider 适配层 | DDD + TDD | P0 | `tdd` | `apps/server/src/modules/uploads/*` 或等价模块实现 `init` / `complete` / `download` 路由，MinIO provider 可独立工作，上传校验、对象存在性检查、大小和 MIME 校验、短时下载签名都闭环；旧 `posts` 上传接口不再是主路径。 |
| BE-2 | 帖子与富文本媒体迁移到文件模型 | DDD + TDD | P0 | `tdd` | `apps/server/src/modules/posts/*`、`apps/web/src/routes/publish-moment-page.tsx`、`apps/web/src/routes/publish-article-page.tsx`、`apps/web/src/routes/compose-page.tsx`、相关富文本插入点都切换到新上传描述和 `fileId` 关联，帖子创建/详情/发布链路在新模型下保持可用。 |
| BE-3 | 头像、投稿、榜单等业务引用迁移 | DDD + TDD | P0 | `tdd` | `apps/server/src/modules/auth/*`、`apps/server/src/modules/aircraft-submissions/*`、`apps/server/src/modules/rankings/*`、`apps/web/src/routes/settings-page.tsx`、`apps/web/src/routes/publish-aircraft-page.tsx`、`apps/web/src/routes/ranking-editor-page.tsx` 完成统一文件引用迁移，头像、投稿封面/视频、榜单封面/条目图都从新文件模型取值。 |
| SH-2 | 旧媒体数据回填与清理 | DDD + TDD | P0 | `tdd` | `post_images` / `video_assets` 的历史数据可迁移到新 `files` 模型，旧列或旧表的清理有明确迁移顺序和回滚边界，种子数据和测试数据不会因为迁移而失效。 |
| FE-2 | 前端上传调用面统一改造 | 直接开发 | P0 | `test_after` | `apps/web/src/lib/api-client.ts` 和所有上传调用页统一改用新上传描述，前端不再直接发 multipart 到旧上传接口；预览、选中态、提交 payload 和错误提示都能在新链路下工作。 |

## 4. DDD 分类

### 需要 DDD
- `SH-1` `files` 主表与统一上传契约
- `BE-1` 上传网关与 Provider 适配层
- `BE-2` 帖子与富文本媒体迁移到文件模型
- `BE-3` 头像、投稿、榜单等业务引用迁移
- `SH-2` 旧媒体数据回填与清理

原因：
- 这几项都直接影响多个业务对象的一致性，且共享契约一旦失稳会在前端、后端和数据库之间同时出问题。
- 上传和文件引用不只是接口搬家，而是跨聚合状态流转和历史数据兼容问题。

### 不需要 DDD
- `FE-1` 飞友圈瀑布流卡片改为纵向长方形
- `FE-2` 前端上传调用面统一改造

## 5. TDD 与直接开发分类

### 必须 TDD
- `SH-1`
- `BE-1`
- `BE-2`
- `BE-3`
- `SH-2`

原因：
- 共享契约、DB schema、上传完成校验、历史数据回填都属于高风险接口和状态转换，必须先锁失败用例再改实现。

### 可以直接开发
- `FE-1`
- `FE-2`

说明：
- 这两项以 UI 和调用面适配为主，但仍建议通过现有 helper 测试、api-client 测试和浏览器 smoke 做交付验证。

## 6. 风险任务
- `SH-1` 是全局契约起点，所有后续任务都依赖它，不能和同类任务并行抢改。
- `BE-1` 直接决定上传链路是否可用，失败会阻断所有媒体流转。
- `SH-2` 决定历史数据能否继续访问，迁移顺序不对会造成“新接口可用但旧内容断链”。
- `BE-2` 和 `BE-3` 覆盖面最广，涉及多个业务模块和页面，容易漏掉某个入口。
- `FE-1` 虽然是纯前端，但和骨架屏共用 helper，改错会出现主列表和 loading 态不一致。

## 7. 文件所有权和共享路径提醒

以下路径必须单线程收口，不要并行改同一组共享文件：
- `packages/db/src/schema.ts`
- `packages/db/src/seed.ts`
- `packages/db/drizzle/*`
- `packages/shared/src/index.ts`
- `packages/schemas/src/*`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts`
- `apps/server/src/modules/posts/*`
- `apps/server/src/modules/auth/*`
- `apps/server/src/modules/aircraft-submissions/*`
- `apps/server/src/modules/rankings/*`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/routes/*`
- `apps/web/src/components/page-skeletons.tsx`

边界提醒：
- `packages/db` 只负责 schema、迁移、seed 和基础数据，不放业务上传逻辑。
- `packages/shared` 只放路由常量，不放业务判断。
- `packages/schemas` 只放契约和校验，不放实现。
- `packages/http-client` 只做请求封装和错误映射，不拆业务分支。

## 8. 推荐交付顺序
1. `FE-1`，先把飞友圈卡片比例收紧，独立于上传重构。
2. `SH-1`，先把 `files` 主表和统一上传契约立住。
3. `BE-1`，再把上传网关、provider 和下载签名落地。
4. `BE-2`、`BE-3`，分业务域迁移帖子、头像、投稿和榜单引用。
5. `SH-2`，最后做历史数据回填、清理和旧表退场。
6. `FE-2`，在后端契约稳定后统一切前端调用面。

## 9. 推荐的下一步
- 把这份拆分交给 `planner`，让它按 `FE-1 -> SH-1 -> BE-1 -> BE-2/BE-3 -> SH-2 -> FE-2` 排期。
- 让 `planner` 明确每个任务的文件所有权和是否允许并行。
- 如果要继续压缩范围，优先压缩的是 `BE-2` / `BE-3` 之外的页面细节，不要压缩 `SH-1`、`BE-1`、`SH-2` 这三块。

