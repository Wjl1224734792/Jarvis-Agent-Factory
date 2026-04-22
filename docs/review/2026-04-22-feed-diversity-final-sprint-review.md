# 2026-04-22 信息流推荐与瀑布流最终冲刺复盘

## 本轮结论
- 推荐流已增加“轻量多样性重排”，现在会优先避免同作者/同分类内容在推荐流前排连续堆叠。
- `circle` 页面详情面板已改成按需懒加载，主页面首屏不再强绑详情组件代码。
- 本轮完成后，`lint / typecheck / test / build` 全部通过。

## 推荐流审查与优化
### 现状审查
- 推荐流原先只按单条内容的热度、新鲜度、关系、媒体和举报情况打分。
- 问题在于：即便分数合理，也可能在前排连续出现同作者、同分类的内容，导致“算法看起来很热，但用户感知单一”。

### 落地改动
- [apps/server/src/modules/posts/feed-recommendation.ts](E:/CodeStore/feijia/apps/server/src/modules/posts/feed-recommendation.ts)
  - 保留原始基础分模型
  - 在最终排序阶段增加轻量多样性惩罚
  - 维度包括：
    - 最近两条是否重复作者
    - 作者在已选结果中是否重复出现
    - 最近一条/已选结果是否重复分类
    - 作者与分类是否形成连续簇

### 测试
- [apps/server/tests/posts.test.ts](E:/CodeStore/feijia/apps/server/tests/posts.test.ts)
  - 新增“推荐流在重复作者/分类簇前先给出多样内容”测试
  - 既有推荐流 freshness / engagement 测试保持通过

## 瀑布流加载边界优化
### 审查结论
- `circle-page.tsx` 原本静态导入 [circle-page-detail.tsx](E:/CodeStore/feijia/apps/web/src/routes/circle-page-detail.tsx)
- 对于只浏览瀑布流、不点开详情的用户，这部分代码属于首屏非必要负担

### 落地改动
- [apps/web/src/routes/circle-page.tsx](E:/CodeStore/feijia/apps/web/src/routes/circle-page.tsx)
  - 将 `CirclePageDetail` 改为 `lazy + Suspense`
  - 仅在存在 `selectedNoteId` 时才触发加载

### 构建结果
- `web` 构建中新增独立 chunk：
  - `circle-page-detail` 约 `8.93 kB`
  - `circle-page` 约 `7.98 kB`
- 说明详情面板已成功从主页面逻辑中拆分为按需代码块

## 最终验证
- 通过：`bun run lint`
- 通过：`bun run typecheck`
- 通过：`bun run test`
- 通过：`bun run build`

## 剩余风险
- 推荐流当前仍然是“候选集拉取后内存重排”，数据量继续增大时，下一阶段仍应考虑 repo 层/SQL 层进一步前移候选筛选。
- 瀑布流本体仍然不是虚拟化瀑布流；当前因为数据量和页面模式可接受，但若后续单页条数显著上升，仍需要继续演进列表渲染策略。
