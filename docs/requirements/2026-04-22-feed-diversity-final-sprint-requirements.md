# 2026-04-22 信息流推荐与瀑布流最终冲刺需求

## 背景
- API v1、server 测试超时治理、admin/web 拆包已完成。
- 最终冲刺阶段继续聚焦信息流质量与前端加载体验。
- 本轮重点是：
  - 审查并优化推荐流排序质量
  - 优化瀑布流详情面板的加载边界

## 本轮目标
- 让推荐流在保持基础热度/新鲜度判断的同时，避免同作者/同分类内容在前排扎堆。
- 将 circle 瀑布流的详情面板改成按需懒加载，减少只刷流不看详情时的首屏代码负担。
- 保持现有测试全部通过。

## 范围内
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/tests/posts.test.ts`
- `apps/web/src/routes/circle-page.tsx`
- 本轮相关文档

## 成功标准
- 新增推荐流多样性测试通过。
- 既有推荐流测试不回归。
- `circle-page-detail` 从主路由中拆成按需 chunk。
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
  全部通过。
