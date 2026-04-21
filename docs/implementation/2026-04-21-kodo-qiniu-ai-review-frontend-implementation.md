# Kodo / 七牛 AI 审核后台追踪扩展前端实现说明

## 1. 当前实现目标

在不修改后端、共享契约、环境配置和数据库的前提下，将后台审核追踪能力扩展到更多审核页，至少覆盖以下页面：

- 品牌申请审核页
- 机型投稿审核页
- 评论审核页

同时保持后台中的「AI 审核 / 人工审核」语义与现有页面一致，继续复用既有审核卡片与审核追踪表格模式。

## 2. 输入依据

- 需求文档：`docs/requirements/2026-04-21-kodo-qiniu-ai-review-requirements.md`
- 任务文档：`docs/tasks/2026-04-21-kodo-qiniu-ai-review-tasks.md`
- 已有前端实现参考：
  - `apps/admin/src/features/posts/posts-page.tsx`
  - `apps/admin/src/features/reviews/reviews-page.tsx`

## 3. 工作区模式

- 当前工作区模式：`danger-full-access`
- 网络访问：已开启
- 本次代码改动范围：`apps/admin/src/**`
- 额外产出：本实现文档 1 份

## 4. 变更文件 / 变更范围

- `apps/admin/src/lib/admin-audit-tracking.ts`
- `apps/admin/src/components/admin-audit-records-panel.tsx`
- `apps/admin/src/features/models/brand-applications-page.tsx`
- `apps/admin/src/features/posts/post-comments-page.tsx`
- `apps/admin/src/features/submissions/aircraft-submissions-page.tsx`
- `apps/admin/tests/admin-audit-tracking.test.ts`

## 5. 实现说明

### 5.1 抽取统一的审核追踪计划 helper

新增 `buildAdminAuditTracePlan`，统一处理两类场景：

- 有精确 `entityId`：
  - 走对象级审核记录查询
  - 展示「当前聚焦对象」的审核追踪文案
- 无精确 `entityId`：
  - 退回到域级最近审核记录查询
  - 给出非阻塞提示，不伪造对象级数据

### 5.2 复用现有审核追踪表格模式

新增 `AdminAuditRecordsPanel` 组件，复用现有页面的审核追踪表格结构与字段：

- 状态
- 建议
- 场景
- 错误信息
- 更新时间

这样品牌申请、机型投稿、评论审核页都沿用同一视觉语言，没有另起新样式。

### 5.3 品牌申请审核页

- 新增审核追踪面板
- 当页面有 `detailId` 或 `targetId` 时：
  - 使用 `domain: "brand_application"` + `entityId`
  - 展示当前品牌申请的精确审核记录
- 当页面未聚焦具体品牌申请时：
  - 退回展示 `brand_application` 域最近审核记录
  - 提示用户先选中具体品牌申请以获得精确追踪

### 5.4 机型投稿审核页

- 新增审核追踪面板
- 当页面有 `detailId` 或 `targetId` 时：
  - 使用 `domain: "aircraft_submission"` + `entityId`
  - 展示当前机型投稿的精确审核记录
- 当页面未聚焦具体投稿时：
  - 退回展示 `aircraft_submission` 域最近审核记录
  - 提示用户先选中具体投稿以获得精确追踪

### 5.5 评论审核页

评论审核页当前聚合了多个评论域，但前端无法从现有接口稳定拿到可映射到审核记录的精确 `entityId`。因此本次按需求做域级降级：

- 固定查询 `domain: "comment"` 的最近审核记录
- 明确提示：
  - 当前接口无法把评论列表稳定映射到审核记录 `entityId`
  - 当前展示的记录可能包含其它评论来源

这保证了页面可见审核追踪，同时不伪造精确对象数据。

## 6. 测试和验证结果

### 6.1 新增 / 调整测试

- 新增 `apps/admin/tests/admin-audit-tracking.test.ts`
- 覆盖场景：
  - 精确 `entityId` 查询计划
  - 未聚焦对象时的域级降级计划
  - 评论审核页无法精确映射 `entityId` 时的非阻塞提示

### 6.2 已执行命令

```bash
bun x vitest run .\apps\admin\tests\admin-audit-tracking.test.ts .\apps\admin\tests\post-comments-page-helpers.test.ts
bun run lint
bun run typecheck
bun run test
bun run build
```

### 6.3 结果摘要

- `bun x vitest run ...`：通过
- `bun run lint`：通过
- `bun run typecheck`：通过
- `bun run build`：通过
- `bun run test`：失败

`bun run test` 的失败不在本次前端改动路径，主要来自现有 server 侧用例：

- `apps/server/tests/rankings.test.ts`
- `apps/server/tests/reviews.test.ts`
- `apps/server/tests/admin-reports.test.ts`

其中输出包含：

- 排行榜相关接口返回 `401 / 403 / 404`
- review comment 相关断言不匹配
- `users_display_name_unique` 唯一约束冲突

## 7. 边界和异常处理

- 不新增任何伪造的审核摘要、回调状态或人工复核记录
- 页面拿不到精确 `entityId` 时，只展示域级最近审核记录或提示
- 评论审核页明确标注「可能包含其它评论来源」，避免误导
- 初次拉取审核记录时，审核追踪表格保持 loading 状态，不直接闪空态

## 8. 风险 / 未解决项

- 评论审核页仍缺少可稳定映射到审核记录 `entityId` 的接口字段，当前只能做域级回退
- 品牌申请与机型投稿页在未选中对象时，也只能展示域级最近记录，精确追踪仍依赖当前焦点对象
- 仓库当前 `bun run test` 存在 server 侧失败，影响整仓「全部测试通过」结论

## 9. 需要后端配合的点

- 若希望评论审核页展示精确对象级审核追踪，需要后端补充至少以下能力之一：
  - 评论列表返回可对应审核记录的稳定 `entityId`
  - `comment` 审核记录返回评论来源域信息，例如 `post / review / model / ranking / rating-target`
  - 提供按评论 ID 查询审核记录的接口

## 10. 推荐的下一步

- 后端补齐评论审核记录与评论实体的稳定映射
- 如需统一体验，可把 `posts-page.tsx` 与 `reviews-page.tsx` 也逐步切到同一个审核追踪面板组件
- 修复现有 server 侧失败测试后，再重新执行整仓 `bun run test`
