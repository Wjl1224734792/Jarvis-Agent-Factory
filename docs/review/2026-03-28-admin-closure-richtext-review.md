# 2026-03-28 Admin Closure Richtext Review

## 1. 需求文档
- 路径: `docs/requirements/2026-03-28-admin-closure-richtext-requirements.md`

## 2. 任务文档
- 路径: `docs/tasks/2026-03-28-admin-closure-richtext-tasks.md`

## 3. 计划文档
- 路径: `docs/plans/2026-03-28-admin-closure-richtext-plan.md`

## 4. 前端实现文档
- 路径: `docs/implementation/2026-03-28-admin-moderation-editor-frontend-implementation.md`
- 路径: `docs/implementation/2026-03-28-admin-frontend-implementation.md`
- 说明: 当前工作树包含内容分类页面、dedicated 官方文章 CRUD 接入、导航修复和主题改造，但没有对应本轮的专用前端实现文档；现有两份前端实现文档只覆盖了本轮的一部分前置改动。

## 5. 后端实现文档
- 路径: `docs/implementation/2026-03-28-admin-official-articles-backend-implementation.md`

## 6. 审查结论
- 有条件通过

## 7. 需求覆盖情况
- 已覆盖: dedicated 官方文章 detail/update/delete 后端能力、shared route/schema/http-client 扩展、admin 内容分类入口与页面、admin 单激活导航、web/admin 富文本编辑器切换到 Tiptap、admin 浅色专业蓝绿主题、根级 `test` / `typecheck` / `build` 通过。
- 未完全闭合: 官方文章页面里的“移除已上传媒体”操作与编辑器正文内容没有同步删除；测试计划中要求的手工/浏览器验证没有证据；当前工作树没有本轮专用前端实现文档。

## 8. 计划一致性
- 与计划一致:
  - `SH-2` / `SH-1` / `BE-1` 已完成，dedicated official article route 和 client 方法存在。
  - `FE-5` 已通过测试锁定 `/admin` 单激活逻辑。
  - `FE-6` 已新增内容分类页面和路由入口。
  - `FE-1` / `FE-2` / `FE-3` 已把 web/admin 编辑器切到 Tiptap，并接入官方文章 CRUD 页面。
  - `FE-4` 已同步改 `ConfigProvider` token 与 `apps/admin/src/styles.css`。
- 与计划不完全一致:
  - 计划要求 `test_after` 的页面级手工验证没有可核对证据。
  - 计划要求实现文档链完整，但前端没有本轮专用实现文档。

## 9. 前后端边界一致性
- dedicated 后端路由与 shared/http-client 方法一致: `API_ROUTES.posts.adminOfficialDetail(id)`、`getAdminOfficialArticle`、`updateAdminOfficialArticle`、`deleteAdminOfficialArticle` 对齐。
- admin 官方文章页面已改为调用 dedicated detail/update/delete；创建与列表继续复用既有链路，符合计划。
- 内容分类页面复用现有 `list/create/update` shared client 能力，边界清晰。
- 主要残余风险在前端页面状态层: 媒体从附件列表移除时不会从 `editorHtml` 中同步删除，导致 payload 和所见内容语义分离。

## 10. 测试覆盖状态
- 已有自动化证据:
  - `bun run test`
  - `bun run typecheck`
  - `bun run build`
  - dedicated 后端 CRUD 测试已覆盖到 server posts 测试和 http-client tests
  - admin 导航 helper 测试已覆盖 `/admin` 与子路由激活逻辑
  - web 富文本 helper 测试已覆盖 toolbar state / media insertion contract / content sync
- 证据不足:
  - 没有浏览器级或手工验证记录来证明 admin 官方文章 CRUD 页面、admin 内容分类页面、admin 新主题外观按计划工作。
  - `packages/http-client/tests/posts.test.ts` 直接覆盖了 GET/PUT，但 DELETE 主要依赖 server tests 间接证明。

## 11. 问题列表
### 阻塞
- 无

### 高
- 无

### 中
- [M1] 官方文章“Attached Media”里的移除操作只会删掉 `uploadedImages` / `uploadedVideos` 状态，不会同步移除编辑器正文中的对应 `<img>` / `<video>` 节点，最终会出现“UI 显示已移除，但正文仍保留媒体”的不一致。
  - 位置: [official-articles-page.tsx](/E:/CodeStore/feijia/apps/admin/src/features/posts/official-articles-page.tsx#L333), [official-articles-page.tsx](/E:/CodeStore/feijia/apps/admin/src/features/posts/official-articles-page.tsx#L355)
  - 风险: 官方文章 CRUD 闭环存在误导性操作；如果后续资产治理依赖 `imageIds/videoIds`，还会形成内容与附件集合不一致。
- [M2] admin 导航文案被写成了乱码字符串，功能虽可用，但主导航可读性回退。
  - 位置: [admin-navigation.ts](/E:/CodeStore/feijia/apps/admin/src/features/auth/admin-navigation.ts#L17)
  - 风险: 直接影响后台主导航的可用性和最终测试体验，属于明显的用户可见回归。
- [M3] 计划要求的 `test_after` 手工验证没有证据，尤其是官方文章 CRUD 页面、内容分类页面和主题改造，这些都属于纯靠构建和 helper 测试无法完全证明的交互层变更。
  - 位置: 无代码路径，属于交付证据缺口
  - 风险: 当前只能证明编译与单测通过，不能证明最终 UI 流程和主题表现达到计划中的闭环标准。

### 低
- [L1] 当前工作树没有为本轮变更补一份专用前端实现文档，现有 `2026-03-28-admin-moderation-editor-frontend-implementation.md` 和 `2026-03-28-admin-frontend-implementation.md` 不能完整覆盖 dedicated CRUD、内容分类页面和主题改造。
  - 位置: `docs/implementation/`
  - 风险: 后续交接和复盘证据链不完整。
- [L2] http-client dedicated CRUD 的单测直接覆盖了 GET/PUT，没有对 `deleteAdminOfficialArticle` 做独立 client 层断言。
  - 位置: [posts.test.ts](/E:/CodeStore/feijia/packages/http-client/tests/posts.test.ts#L120)
  - 风险: 不是功能缺失，但 dedicated client 覆盖不对称。

## 12. 必须修复项
- 修复官方文章页面里“移除已上传媒体”与编辑器正文不同步的问题，至少保证删除附件时不会留下仍在正文渲染的媒体引用。
- 修复 admin 导航文案乱码，保证主导航在最终测试时可读。
- 补充本轮 `test_after` 的手工/浏览器验证证据，至少覆盖:
  - admin 官方文章新建、编辑、删除
  - admin 内容分类新建、编辑、入口访问
  - admin 主题在概览、表格、表单、Modal、编辑器上的可用性

## 13. 优化建议
- 为 admin 富文本 editor helper 增加与 web 对等的单测，减少目前仅依赖 web helper 测试的非对称性。
- 为 official article page 的 create/edit 模式提取更清晰的状态归一逻辑，降低当前单文件状态复杂度。
- 在 dedicated CRUD 页面里补一个显式的“清空正文媒体”或“从正文删除并同步移除附件”交互，避免后续再次出现资产状态漂移。

## 14. 回归建议
- 回归 admin 导航:
  - `/admin`
  - `/admin/posts`
  - `/admin/content-categories`
  - `/admin/rankings/new`
- 回归官方文章:
  - 新建含封面、图片、视频的文章
  - 编辑已有文章并保存
  - 删除文章后再次访问 dedicated detail 返回 404
  - 移除媒体后的正文和 payload 一致性
- 回归内容分类:
  - 创建分类后进入官方文章页可重新拉取并选择
  - 编辑启停状态后列表显示正确
- 回归主题:
  - 概览页、列表页、表单页、Modal、编辑器、登录页在浅色主题下对比度和 hover 态正常

## 15. 推荐的下一步
1. 先修复 `M1` 和 `M2`。
2. 用浏览器补齐 `M3` 的验证证据。
3. 补一份本轮前端实现文档，把 dedicated CRUD、内容分类页面、主题改造和编辑器统一纳入记录。
4. 修完后再做一次 `review_qa` 复核。

## 审查文档路径
- `docs/review/2026-03-28-admin-closure-richtext-review.md`
