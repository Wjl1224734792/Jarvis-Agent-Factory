# apps/web 前端统一化重构审查

## 1. 需求文档
- 路径
  - 无单独需求文档
  - 需求来源为本轮对话：`apps/web` 前端统一化重构审查请求

## 2. 任务文档
- 路径
  - [AGENTS.md](E:/CodeStore/feijia/AGENTS.md)
  - [docs/workflows/workflow.md](E:/CodeStore/feijia/docs/workflows/workflow.md)

## 3. 计划文档
- 路径
  - [2026-03-24-web-style-unification-plan.md](E:/CodeStore/feijia/docs/plans/2026-03-24-web-style-unification-plan.md)

## 4. 前端实现文档
- 路径
  - [2026-03-24-web-style-unification-frontend-implementation.md](E:/CodeStore/feijia/docs/implementation/2026-03-24-web-style-unification-frontend-implementation.md)
  - [2026-03-24-web-style-unification-batch1-frontend-implementation.md](E:/CodeStore/feijia/docs/implementation/2026-03-24-web-style-unification-batch1-frontend-implementation.md)
  - [2026-03-24-web-style-unification-batch2-frontend-implementation.md](E:/CodeStore/feijia/docs/implementation/2026-03-24-web-style-unification-batch2-frontend-implementation.md)
  - [2026-03-24-web-style-unification-batch3-frontend-implementation.md](E:/CodeStore/feijia/docs/implementation/2026-03-24-web-style-unification-batch3-frontend-implementation.md)

## 5. 后端实现文档
- 路径
  - 无
  - 本轮未涉及后端实现

## 6. 审查结论
- 有条件通过

依据：
- 共享层、页面层和路由层的统一化改造已完成，且验证链路完整。
- 未发现阻塞性的路由缺失、类型错误或构建失败。
- 仍存在 1 个高优先级实现问题和若干中低优先级残余风险，建议在合并前修复高优先级项。

## 7. 需求覆盖情况
- 已覆盖：统一视觉 token、共享页面骨架、首页/飞友圈/机型库/详情页/榜单/发布页/创建榜单页/个人中心/设置页/登录弹窗的整体风格收敛。
- 已覆盖：新增 web 路由 `flightCircle`、`compose`、`rankingEditor`、`webSettings` 并接入主路由树。
- 已覆盖：验证证据完整，包含 `apps/web` 级别与仓库级别的 `typecheck / build / test`。
- 未完全覆盖：站点内少量交互控件仍保留占位态或无实际行为，统一性在视觉上基本成立，但交互语义上仍有残差。

## 8. 计划一致性
- 与计划一致：
  - 先共享层，再页面批次迁移。
  - 共享层集中在 `styles.css`、`web-layout.tsx`、`components/ui/*` 和新增的 [site-shell.tsx](E:/CodeStore/feijia/apps/web/src/components/site-shell.tsx)。
  - 页面按批次迁移到 `SitePage / SiteGrid / SiteRail / SitePanel`。
  - 最后补了 `notifications-page.tsx` 和 `post-detail-page.tsx`，符合计划里“整站统一”目标。
- 偏差说明：
  - 计划中将 `notifications-page.tsx`、`post-detail-page.tsx` 作为主代理补充收口，实际也按该方式执行，偏差可接受。

## 9. 前后端边界一致性
- 一致。
- 本轮只新增了前端路由常量 [index.ts](E:/CodeStore/feijia/packages/shared/src/index.ts)，未改 API 路径和请求契约。
- `apps/server`、`packages/schemas`、`packages/http-client` 未因本轮前端重构而要求新增接口或调整字段。
- `compose`、`login`、`model reviews`、`notifications`、`rankings` 仍沿用既有接口，未发现前后端边界错位。

## 10. 测试覆盖状态
- 已执行并通过：
  - `bun run --cwd apps/web typecheck`
  - `bun run --cwd apps/web build`
  - `bun run typecheck`
  - `bun run build`
  - `bun run test`
- 额外静态审查：
  - 执行了 `code_quality_checker.py`，结果显示 `apps/web/src` 平均分 95/100，但对 `aviation-media.ts`、`model-detail-page.tsx` 等文件给出结构性提示；这些结果可作为维护性信号，不作为阻塞依据。
  - `pr_analyzer.py` 扫描了整个仓库脏工作区并触发 Windows 编码异常，且输出混入本轮范围外文件；该结果不适合作为本轮 scoped review 的结论依据。
- 缺失项：
  - 没有浏览器级 UI 回归验证。
  - 没有视觉快照或 Playwright 级导航/交互测试。

## 11. 问题列表

### 阻塞
- 无

### 高
- [H1] 侧边导航和页脚导航把 `Button` 渲染在 `NavLink` 内，形成嵌套交互元素，存在可访问性与点击行为风险。
  - 位置
    - [web-layout.tsx](E:/CodeStore/feijia/apps/web/src/features/auth/web-layout.tsx#L141)
    - [web-layout.tsx](E:/CodeStore/feijia/apps/web/src/features/auth/web-layout.tsx#L192)
  - 说明
    - 当前结构是 `<a><button>...</button></a>`。这违反原生交互语义，可能造成键盘焦点、屏幕阅读器和某些浏览器点击命中异常。
    - 问题覆盖主导航与“设置”页脚入口，属于全站高频路径。

### 中
- [M1] 共享媒体层完全依赖远程 Unsplash URL，没有本地兜底或构建时资源控制，存在运行时稳定性和视觉一致性风险。
  - 位置
    - [aviation-media.ts](E:/CodeStore/feijia/apps/web/src/lib/aviation-media.ts#L3)
  - 说明
    - 首页、飞友圈、详情页、编辑器和个人中心大量依赖该 helper。
    - 一旦外部源限流、失效或裁切策略变化，多个页面会同时出现空白图、首屏闪烁或不一致的画面比例。

### 低
- [L1] 仍有少量“看起来可点击但无行为”的占位控件，交互语义未完全收口。
  - 位置
    - [web-layout.tsx](E:/CodeStore/feijia/apps/web/src/features/auth/web-layout.tsx#L174)
    - [web-layout.tsx](E:/CodeStore/feijia/apps/web/src/features/auth/web-layout.tsx#L316)
  - 说明
    - “下载 App”“帮助反馈”和顶部消息按钮当前都是可聚焦控件，但没有实际行为或跳转。
    - 这不影响本轮视觉统一目标，但会给用户造成交互预期落差。
- [L2] 页面层虽然已大幅迁移到共享骨架，但仍残留少量页面内视觉类组合，后续仍可继续收敛。
  - 位置
    - 典型文件
      - [compose-page.tsx](E:/CodeStore/feijia/apps/web/src/routes/compose-page.tsx#L256)
      - [ranking-editor-page.tsx](E:/CodeStore/feijia/apps/web/src/routes/ranking-editor-page.tsx#L102)
      - [notifications-page.tsx](E:/CodeStore/feijia/apps/web/src/routes/notifications-page.tsx#L139)
  - 说明
    - 这些残留多已使用共享 token，而非旧的随机圆角/阴影值。
    - 风险偏维护性，不构成当前交付阻塞。

## 12. 必须修复项
- 修复 [web-layout.tsx](E:/CodeStore/feijia/apps/web/src/features/auth/web-layout.tsx#L141) 和 [web-layout.tsx](E:/CodeStore/feijia/apps/web/src/features/auth/web-layout.tsx#L192) 的嵌套交互结构。
  - 建议方案
    - 用 `Button asChild` 直接让 `NavLink` 成为根元素。
    - 或将导航项改成纯 `NavLink`，不要在其内部再渲染原生 `button`。

## 13. 优化建议
- 为 [aviation-media.ts](E:/CodeStore/feijia/apps/web/src/lib/aviation-media.ts#L3) 增加更可控的素材策略。
  - 例如：本地静态资源、CDN 白名单、失败兜底图、统一比例配置。
- 给站点级模块继续抽象二级组件。
  - 例如：统计卡、媒体卡、编辑器工具条、侧栏情报卡。
  - 这样可以继续减少页面内的结构性 Tailwind 组合。
- 如果这套站点会继续演进，建议补充 Playwright 或视觉快照测试。
  - 优先覆盖：主导航、登录弹窗、首页/飞友圈、机型库筛选、发布页上传区。

## 14. 回归建议
- 手动回归：
  - 桌面端侧边导航点击、焦点顺序和键盘导航。
  - 移动端抽屉导航打开/关闭与页面跳转。
  - 登录页短信验证码流程、关闭登录弹窗返回首页。
  - 首页、飞友圈、机型库、榜单、详情页在 1280px 以下的布局折叠。
  - 通知页和帖子详情页在有/无图片、空列表状态下的展示。
- 自动回归建议：
  - 加 UI smoke tests，覆盖新增路由：
    - `/home`
    - `/circle`
    - `/models`
    - `/rankings`
    - `/compose`
    - `/rankings/create`
    - `/settings`

## 15. 推荐的下一步
1. 先修复导航中的嵌套交互元素问题。
2. 再确认 `下载 App / 帮助反馈 / 消息` 这些占位控件是否需要降级为非交互态或补真实链接。
3. 如需进一步提升稳定性，收敛 [aviation-media.ts](E:/CodeStore/feijia/apps/web/src/lib/aviation-media.ts#L3) 的远程素材依赖。
4. 在上述两点完成后，可将本轮前端统一化重构视为可合并。

## 16. 审查文档路径
- [2026-03-24-web-style-unification-review.md](E:/CodeStore/feijia/docs/review/2026-03-24-web-style-unification-review.md)
