# 2026-03-28 Admin Closure Richtext Smoke Review

## 1. 需求文档
- 路径: `docs/requirements/2026-03-28-admin-closure-richtext-requirements.md`

## 2. 任务文档
- 路径: `docs/tasks/2026-03-28-admin-closure-richtext-tasks.md`

## 3. 计划文档
- 路径: `docs/plans/2026-03-28-admin-closure-richtext-plan.md`

## 4. 前端实现文档
- 路径: `docs/implementation/2026-03-28-admin-frontend-implementation.md`
- 路径: `docs/implementation/2026-03-28-admin-moderation-editor-frontend-implementation.md`
- 说明: 本次快速复审主要核对当前工作树状态与 smoke 结果，不重新审计完整前端实现文档覆盖。

## 5. 后端实现文档
- 路径: `docs/implementation/2026-03-28-admin-official-articles-backend-implementation.md`

## 6. 审查结论
- 有条件通过

## 7. 需求覆盖情况
- 已确认:
  - `admin-navigation.ts` 文案乱码已修复，当前为可读英文文案。
  - 官方文章页移除 attached media 时，已经通过 `removeMediaFromHtml()` 同步删除正文 HTML 中的对应 `<img>` / `<video>` 节点。
  - 指定 smoke 已覆盖登录和 3 个 admin 页面进入验证，并确认每个页面 `.admin-shell__nav-item.is-active` 数量均为 `1`。
- 未扩展确认:
  - 本次 smoke 不包含官方文章 create/update/delete 的实际保存链路。
  - 本次 smoke 不包含内容分类 create/update 的实际写操作。

## 8. 计划一致性
- 与计划一致:
  - `FE-5` 的“单激活导航”目标已通过代码和 smoke 双重验证。
  - `FE-3` 的官方文章页媒体移除与正文同步问题已修复。
  - `test_after` 缺少页面可进入证据的问题，已被本次 smoke 部分覆盖。
- 仍未完全覆盖的计划项:
  - `test_after` 仍缺少 CRUD 写操作级别的浏览器证据。

## 9. 前后端边界一致性
- 当前 dedicated official article 前后端边界没有新增不一致信号。
- smoke 登录成功并能进入 `/admin/official-articles` 与 `/admin/content-categories`，说明 admin 鉴权、router、basic data fetching 至少在只读进入路径上是通的。

## 10. 测试覆盖状态
- 已有自动化证据:
  - 根级 `bun run test`
  - 根级 `bun run typecheck`
  - 根级 `bun run build`
  - dedicated 官方文章 CRUD server/http-client tests
  - admin navigation helper test
  - web rich-text helper test
- 已新增手工/浏览器级 smoke 证据:
  - 本地启动 `server` + `admin`
  - Playwright 登录 admin
  - 访问 `/admin`
  - 访问 `/admin/official-articles`
  - 访问 `/admin/content-categories`
  - 断言每页 `.admin-shell__nav-item.is-active` 数量为 `1`
- 证据结果:
  - `/admin` -> active nav count = `1`
  - `/admin/official-articles` -> active nav count = `1`
  - `/admin/content-categories` -> active nav count = `1`
- 说明:
  - smoke 在 `http://localhost:3001` 下通过。
  - 之前在 `http://127.0.0.1:3001` 下登录失败，原因是当前 server 默认 CORS 白名单只包含 `localhost` 源。

## 11. 问题列表
### 阻塞
- 无

### 高
- 无

### 中
- 无新增中风险问题

### 低
- [L1] 当前 smoke 仅证明登录、路由进入和单激活导航，不证明官方文章 CRUD 写操作、内容分类写操作、主题细节视觉回归已经全部完成。
- [L2] 本地 smoke 依赖 `localhost` 源；如果使用 `127.0.0.1:3001` 访问 admin，当前默认 CORS 配置下登录会报 `Failed to fetch`。

## 12. 必须修复项
- 无新的必须修复项

## 13. 优化建议
- 补一条浏览器级 smoke，覆盖官方文章“编辑并保存”与“删除”。
- 补一条浏览器级 smoke，覆盖内容分类“创建并编辑”。
- 如果团队日常会通过 `127.0.0.1` 打开 admin，本地默认 CORS 应补上 `127.0.0.1` 源，避免环境偶发失败。

## 14. 回归建议
- 保留本次 smoke 作为固定回归基线:
  - `/admin`
  - `/admin/official-articles`
  - `/admin/content-categories`
  - 每页 `.admin-shell__nav-item.is-active === 1`
- 下轮补充:
  - 官方文章编辑保存后刷新列表
  - 官方文章删除后二次进入 dedicated detail 返回 404
  - 内容分类创建后在官方文章页可重新拉取并选择

## 15. 推荐的下一步
1. 当前这 3 个重点点位可视为已复审通过。
2. 若要把“手工验证证据缺口”完全关闭，再补两条写操作级 Playwright smoke。
3. 若本地协作经常混用 `localhost` / `127.0.0.1`，建议单独处理默认 CORS 白名单。

## 审查文档路径
- `docs/review/2026-03-28-admin-closure-richtext-smoke-review.md`
