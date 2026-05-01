# Web 内容来源声明前端实现说明

## 1. 当前实现目标

为 Web 端文章与动态发布页接入来源声明输入能力，并在文章详情、首页 feed、飞友圈 feed 与飞友圈详情中展示内容来源。

## 2. 对应需求 ID / 任务 ID

- 需求 ID: `REQ-005`
- 任务 ID: `TASK-007`

## 3. 输入依据

- `docs/requirements/2026-04-28-auth-password-source-requirements.md`
- `docs/tasks/2026-04-28-auth-password-source-tasks.md`
- `docs/plans/2026-04-28-auth-password-source-plan.md`
- 共享契约现状: `packages/schemas/src/posts.ts` 已提供 `sourceLabel` / `sourceUrl` 输入归一与 `item.source` 输出结构

## 4. 工作区模式

- 共享工作区协作模式
- 当前仓库存在其他未完成改动，本次未回退或覆盖他人改动
- 本次写入范围限定在 `apps/web/src/routes/*` 指定页面与本实现文档

## 5. 变更文件 / 变更范围

- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/post-detail-page.tsx`
- `apps/web/src/routes/circle-page-feed.tsx`
- `apps/web/src/routes/circle-page-detail.tsx`
- `apps/web/src/routes/home-page.tsx`
- `docs/implementation/2026-04-28-post-source-web-frontend-implementation.md`

## 6. 实现说明

- 发布文章页:
  - 新增 `sourceLabel`、`sourceUrl` 本地状态
  - 草稿保存 / 恢复写入来源字段
  - 编辑态从 `item.source` 回填来源名称与链接
  - 提交 payload 时携带 `sourceLabel`、`sourceUrl`
  - 在编辑区与右侧预览区显示来源预览，来源有链接时以新标签页打开
- 发布动态页:
  - 新增 `sourceLabel`、`sourceUrl` 本地状态
  - 草稿保存 / 恢复写入来源字段
  - 编辑态从 `item.source` 回填来源名称与链接
  - 图片动态、视频动态两条提交流程都携带来源字段
  - 在编辑区与右侧预览区显示来源预览
- 展示页:
  - 文章详情页在头部作者信息下展示来源
  - 飞友圈 feed 卡片展示来源
  - 飞友圈详情弹层在标题下展示来源
  - 首页 feed 卡片展示来源
  - `source.url` 存在时使用外链打开；无链接时仅展示来源名称

## 7. 测试和验证结果

- 待执行仓库级验证命令:
  - `bun run lint`
  - `bun run typecheck`
  - `bun run test`
  - `bun run build`
- 本次未新增测试文件:
  - 用户限制了页面写入范围，未扩展到独立测试文件

## 8. 边界和异常处理

- 来源名称为空时，前端仍按原始输入透传，由 schema 统一归一为空来源
- 仅填写来源链接时，前端不额外拼装来源对象，仍交由 schema 将孤立链接归一掉
- 草稿恢复兼容旧草稿:
  - 旧草稿缺少来源字段时回退为空字符串
- 展示层对 `item.source === null` 保持无来源 UI

## 9. 风险 / 未解决项

- feed 卡片中的来源外链位于整卡点击区域内，当前通过阻止默认跳转与事件冒泡实现独立打开；建议后续结合真实交互回归确认
- 仓库当前存在并行改动，最终以主会话整合后的共享契约与接口返回为准

## 10. 需要后端配合的点

- `createPost` / `updatePost` 需要稳定接收 `sourceLabel`、`sourceUrl`
- `getPostDetail`、`listHomeFeed`、`listCircleFeed` 需要稳定返回 `item.source`
- 当来源名称为空时，服务端应保持响应 `source: null`

## 11. 推荐的下一步

- 运行并确认仓库级 `lint` / `typecheck` / `test` / `build`
- 由主会话联调后端与共享契约变更
- 对首页 feed、飞友圈 feed、文章详情、动态详情做一次浏览器交互回归
