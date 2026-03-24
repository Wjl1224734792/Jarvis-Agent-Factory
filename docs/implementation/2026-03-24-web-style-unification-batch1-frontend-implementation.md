## 1. 当前实现目标
- 将 `apps/web` 的内容流/目录流页面迁移到统一共享骨架。
- 仅覆盖批次 1 页面：
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/src/routes/circle-page.tsx`
  - `apps/web/src/routes/models-page.tsx`
- 保持现有查询逻辑、路由与业务行为不变。

## 2. 输入依据
- 用户要求：前端重构，统一风格样式，并明确要求使用多智能体流程。
- `AGENTS.md`
- 规划文档：
  - `docs/plans/2026-03-24-web-style-unification-plan.md`
- 共享层实现结果：
  - `apps/web/src/components/site-shell.tsx`
  - 更新后的 `button/card/badge/tabs`

## 3. 工作区模式
- 仓库工作区：`E:\CodeStore\feijia`
- 当前代理职责：前端实现批次 1 页面
- 未修改共享层文件，按既定共享组件和 token 复用

## 4. 变更文件 / 变更范围
- 修改：
  - `apps/web/src/routes/home-page.tsx`
  - `apps/web/src/routes/circle-page.tsx`
  - `apps/web/src/routes/models-page.tsx`
- 新增文档：
  - `docs/implementation/2026-03-24-web-style-unification-batch1-frontend-implementation.md`

## 5. 实现说明
- `home-page.tsx`
  - 外层迁移为 `SitePage`
  - 页头迁移为 `SitePageHead / SitePageEyebrow / SitePageTitle / SitePageDescription`
  - 主内容改为 `SiteGrid variant="sidebar"`，右栏改为 `SiteRail`
  - 头部筛选栏、主文章、支持文章、侧栏卡片统一改用 `SitePanel` 或 `Card variant=*`
  - 删除原页面大量 `rounded-[...] / shadow-[...] / bg-card/94` 魔法组合，改为共享容器和有限布局类

- `circle-page.tsx`
  - 迁移到同一页头和双栏骨架
  - 话题 chips、内容流 tabs、帖子卡片、右侧热门话题/活跃飞友/活动卡统一使用共享 panel/card
  - 保留原有 feed 数据流、帖子互动栏和跳转逻辑

- `models-page.tsx`
  - 迁移到统一页头与主内容布局
  - 筛选区、品牌字母索引、结果摘要、机型卡片统一使用共享 panel/card/button/badge
  - 保留现有 URLSearchParams 筛选逻辑与模型查询逻辑

## 6. 测试和验证结果
- 已运行：
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
- 结果：
  - 均通过
- 备注：
  - `vite build` 仍有既有 chunk size warning，不属于本批页面迁移引入的新功能错误

## 7. 边界和异常处理
- 未改动任何共享层文件：
  - `styles.css`
  - `web-layout.tsx`
  - `components/ui/*`
  - `components/site-shell.tsx`
- 未改动任何非批次 1 页面
- 所有空态、加载态、错误态继续保留

## 8. 风险 / 未解决项
- 页面仍存在少量内容级布局类，例如图片高度和局部网格，这些属于页面结构必需，不属于共享层魔法视觉类泛滥
- 后续如果主代理或其他批次代理继续抽象“媒体卡/趋势卡”，本批页面还可以进一步收敛

## 9. 需要 backend_implementer 配合的点
- 无
- 本批未新增接口依赖，也未要求后端变更字段

## 10. 推荐的下一步
1. 继续完成批次 2 和批次 3 页面迁移
2. 整合 `notifications-page.tsx` 和 `post-detail-page.tsx`，避免残留旧视觉语气
3. 主代理在所有页面合并后运行仓库级验证：
   - `bun run typecheck`
   - `bun run build`
   - `bun run test`
4. 最后由 `review_qa` 做视觉一致性与回归检查
