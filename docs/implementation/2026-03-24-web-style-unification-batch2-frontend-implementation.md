## 1. 当前实现目标

- 将 `apps/web` 的页面批次 2 迁移到统一的站点级共享骨架和 panel 层级。
- 覆盖页面：
  - `apps/web/src/routes/model-detail-page.tsx`
  - `apps/web/src/routes/rankings-page.tsx`
  - `apps/web/src/features/auth/profile-page.tsx`
  - `apps/web/src/routes/settings-page.tsx`

## 2. 输入依据

- 用户要求：前端风格统一化重构，且明确要求使用 spawn。
- 共享层已完成：
  - `apps/web/src/components/site-shell.tsx`
  - 新的 `button/card/badge/tabs` 变体
- 规划文档：
  - `docs/plans/2026-03-24-web-style-unification-plan.md`

## 3. 工作区模式

- 当前工作聚焦 `apps/web` 前端页面批次 2。
- 未修改共享层文件。
- 未修改后端、共享契约、路由常量和其他页面文件。

## 4. 变更文件 / 变更范围

- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/settings-page.tsx`

## 5. 实现说明

### 5.1 统一迁移到共享骨架

- 所有页面外层改为 `SitePage`。
- 页面头部统一改为 `SitePageHead + SitePageEyebrow + SitePageTitle + SitePageDescription`。
- 详情页和设置页采用 `SiteGrid + SiteRail`。
- 主要内容容器统一改为 `SitePanel / SitePanelBody`。

### 5.2 机型详情页

- 将顶部主视觉、参数摘要、规格表、评分区、侧栏推荐卡全部迁移到共享 panel。
- 用新的 `Badge` 变体统一标签风格。
- 用新的 `Card` 变体收敛参数卡、评论表单卡和评论列表卡。
- 保留现有数据请求、评论提交和图片切换逻辑不变。

### 5.3 榜单页

- 统一为“页面头部 + 主列表 + 右侧情报栏”的共享结构。
- 官方榜和用户榜卡片都迁移到 `SitePanel` 体系。
- Tab 切换改用新的 `TabsList variant="pills"`。
- 保留原有快速评分逻辑和榜单数据流不变。

### 5.4 个人中心页

- 头图、头像、统计信息与内容卡统一嵌入共享 panel。
- 内容切换区改为新 tabs 语义。
- 草稿卡和月度统计卡分别用 `Card variant="muted"` 与 `SitePanel variant="highlight"` 收敛层级。

### 5.5 设置页

- 改为标准“左侧偏好导航 + 右侧内容面板”结构。
- 密码设置、手机验证、账号注销统一用 `Card` 层级组织。
- 安全状态和危险提示分别映射为 `SitePanel variant="highlight"` 与带红色语义的局部 panel。

## 6. 测试和验证结果

- `bun run --cwd apps/web typecheck`：通过
- `bun run --cwd apps/web build`：通过
- 构建仍有既有 Vite chunk size warning，不属于本批页面迁移新增问题

## 7. 边界和异常处理

- 未改接口请求行为。
- 未改现有业务状态管理。
- 保持详情页评分、榜单快速评分、个人中心入口、设置页展示逻辑原样可用。
- 若接口数据为空，仍沿用原有 `Alert` 降级展示。

## 8. 风险 / 未解决项

- 页面内部仍保留少量局部布局 class，用于细节排版；但大块外观类已明显收敛到共享骨架。
- 榜单页右下角悬浮创建按钮仍使用页面内定位，后续如果全站需要统一浮动操作按钮，可继续抽象。
- 详情页规格表和评分分布仍为页面内部模块，尚未抽成可复用站点组件。

## 9. 需要 backend_implementer 配合的点

- 无新增 backend 依赖。
- 本批变更不需要后端配合。

## 10. 推荐的下一步

1. 继续完成页面批次 1 和批次 3 的迁移，避免视觉语言只在部分页面收敛。
2. 由主代理整合 `notifications`、`post-detail` 等剩余页面，消除旧风格残留。
3. 在整站页面迁移完成后执行 `review_qa`，重点检查：
   - 页面之间的层级一致性
   - 是否仍存在大量 `rounded-[...] / shadow-[...] / bg-card/94` 魔法组合
   - 是否出现共享组件使用不一致的回归
