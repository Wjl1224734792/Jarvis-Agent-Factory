# 2026-04-22 信息流推荐与瀑布流最终冲刺计划

## 执行顺序
1. 审查推荐算法与瀑布流当前实现。
2. 通过 TDD 锁定推荐流多样性预期。
3. 在 `feed-recommendation.ts` 中实现轻量多样性重排。
4. 将 `CirclePageDetail` 改成按需懒加载。
5. 运行完整 `lint / typecheck / test / build`。
6. 更新 review 文档。

## 风险控制
- 推荐流优化只做排序层重排，不改 repo 查询契约。
- 前端优化只改加载边界，不改 circle 业务交互和布局语义。
