# apps/web 页面批次 3 统一化重构实现

## 1. 当前实现目标
- 将登录弹窗、发布页、创建榜单页迁移到统一的“航空编辑工具台”语言。
- 覆盖文件：
  - `apps/web/src/features/auth/login-page.tsx`
  - `apps/web/src/routes/compose-page.tsx`
  - `apps/web/src/routes/ranking-editor-page.tsx`

## 2. 输入依据
- 用户要求：前端风格统一化重构，并明确要求使用 spawn 流程。
- 规划文档：
  - `docs/plans/2026-03-24-web-style-unification-plan.md`
- 共享层结果：
  - `apps/web/src/components/site-shell.tsx`
  - 更新后的 `button/card/badge/tabs`

## 3. 工作区模式
- 当前工作聚焦 `apps/web` 页面批次 3。
- 未改共享层文件。
- 未改后端、共享契约和其他页面文件。

## 4. 变更文件 / 变更范围
- `apps/web/src/features/auth/login-page.tsx`
- `apps/web/src/routes/compose-page.tsx`
- `apps/web/src/routes/ranking-editor-page.tsx`

## 5. 实现说明

### 5.1 登录弹窗
- 登录页改为复用 `SitePanel + SitePanelBody` 作为模态主体。
- 标题层级改为 `SitePageHead / SitePageEyebrow / SitePageTitle / SitePageDescription`。
- 输入区、验证码区和提示区统一收口到共享 token，不再使用散乱的局部圆角和阴影值。
- 保持原有短信验证码和登录跳转逻辑不变。

### 5.2 发布页
- 页面整体迁移到 `SitePage + SiteGrid + SiteRail`。
- 顶部操作区、主编辑区、标签区、右侧预览区和规则区统一改用 `SitePanel`。
- 内容类型切换改用共享 `TabsList variant="pills"`。
- 媒体上传和发帖请求逻辑保持不变。

### 5.3 创建榜单页
- 页面整体迁移到 `SitePage + SiteGrid + SiteRail`。
- 表单区、封面区、候选机型区、自动保存区、实时预览区统一迁移到共享 panel。
- 保留原有本地状态和机型查询逻辑，不新增榜单提交 API。

## 6. 测试和验证结果
- `bun run --cwd apps/web typecheck`
  - 通过

## 7. 边界和异常处理
- 未改榜单提交行为，仍为前端编辑与预览布局。
- 未改任何后端接口。
- 对上传失败、登录失败继续保留原有 `Alert` 降级。

## 8. 风险 / 未解决项
- 发布页和榜单编辑页仍包含少量页面级布局类，用于编辑器结构分区，这些不是共享层魔法视觉类，但后续仍可继续抽象。
- 登录页作为模态页，结构不会完全与普通页面一致；本轮统一的是视觉语言和组件层级。

## 9. 需要 backend_implementer 配合的点
- 当前无必须的 backend 配合项。
- 若后续需要“创建榜单页”真正提交，需要后端提供榜单创建接口。

## 10. 推荐的下一步
1. 由主代理整合剩余页面（如 `notifications-page.tsx`、`post-detail-page.tsx`）到同一骨架。
2. 统一跑仓库级验证：
   - `bun run typecheck`
   - `bun run build`
   - `bun run test`
3. 最后由 `review_qa` 做视觉一致性与回归检查。
