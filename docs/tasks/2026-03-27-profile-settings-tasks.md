# 个人中心与设置页任务拆分

## 1. 需求文档路径
- [个人中心与设置页需求收敛](/E:/CodeStore/feijia/docs/requirements/2026-03-27-profile-settings-requirements.md)

## 2. 任务概览
本轮只做 `apps/web` 的个人中心页与设置页闭环，不新增后端接口，不扩展共享业务契约。目标是把已存在但未接线的页面真正挂入路由和导航，并统一成现有浅蓝航空主题。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 |
|---|---|---|---|---|
| W1 | 路由与入口接线 | 直接开发 | P0 | `apps/web/src/app.tsx` 正确注册 `/me` 与 `/settings` 页面，`UserMenu` 或壳层导航提供稳定入口，页面可从应用内跳转到达且不会破坏现有首页、登录、发布与通知路由。 |
| W2 | 个人中心页统一重构 | 直接开发 | P0 | `apps/web/src/features/auth/profile-page.tsx` 以现有 `site-shell`、`Card`、`Tabs`、`Badge`、`Button`、`Avatar` 组件重构为一致视觉语言；页面展示、统计、草稿/内容区与交互按钮均可浏览，移动端和桌面端布局稳定。 |
| W3 | 设置页统一重构 | 直接开发 | P0 | `apps/web/src/routes/settings-page.tsx` 重构为分区清晰、风格统一的设置页；保留账号安全、隐私、注销等核心区块的前端态闭环，表单和按钮具备一致的交互反馈，不依赖不存在的后端接口。 |
| W4 | 共享视觉收口与局部复用整理 | 直接开发 | P1 | 如实现中发现 profile/settings 需要共用的局部段落、标题、状态块或空态，优先在 `apps/web/src/components` 或现有页面内部抽取最小复用单元，避免复制两套页面样式。 |
| W5 | 验证与回归检查 | test_after | P0 | 对路由可达性、入口跳转、桌面/移动布局和基础交互做最小验证，并确认未破坏现有登录、注销和发布入口。 |

## 4. DDD 分类

### 不需要 DDD
- W1 路由与入口接线
- W2 个人中心页统一重构
- W3 设置页统一重构
- W4 共享视觉收口与局部复用整理
- W5 验证与回归检查

原因：本轮没有新增领域规则、状态机、权限模型或跨对象一致性约束，主要是前端壳层、导航和展示闭环。

## 5. TDD 与直接开发分类

### 可以直接开发
- W1
- W2
- W3
- W4

### 建议 `test_after`
- W5

原因：当前缺少 profile/settings 后端契约，核心工作是路由、布局和前端态交互；自动化价值主要在路由可达性与基础回归，而不是领域规则驱动。

## 6. 风险任务
- W1：属于共享入口点，容易影响登录、发布和通知导航，改动时不能并行抢改 `apps/web/src/app.tsx`。
- W2：需要和现有浅蓝航空主题对齐，避免个人中心看起来像另一套产品。
- W3：设置页目前有占位内容和前端态表单，必须明确哪些动作只是 UI 层，不冒充后端已实现。
- W4：如果抽象过早，容易引入过度复用；只允许最小范围内的共用单元。
- W5：如果只做手工浏览而不记录结论，后续很难判断是否真的闭环。

## 7. 文件所有权和共享路径提醒
以下路径要单线程处理，避免多人或多代理同时改同一入口：

- `apps/web/src/app.tsx`
- `apps/web/src/features/auth/web-layout.tsx`
- `apps/web/src/features/auth/user-menu.tsx`
- `apps/web/src/features/auth/profile-page.tsx`
- `apps/web/src/routes/settings-page.tsx`
- `apps/web/src/components/site-shell.tsx`
- `apps/web/src/styles.css`

提醒：
- `packages/shared/src/index.ts` 这次尽量不动，路由常量已有 `/me` 和 `/settings`。
- `apps/web/src/features/auth/*` 与 `apps/web/src/routes/*` 都属于同一前端闭环，避免把同类页面拆散到更多目录。

## 8. 推荐交付顺序
1. 先做 W1，锁定路由和入口。
2. 再做 W2，建立个人中心的统一视觉基线。
3. 再做 W3，把设置页收敛成同一语言。
4. 然后做 W4，清理仅在两页之间复用的局部结构。
5. 最后做 W5，完成回归验证。

## 9. 推荐的下一步
把这份任务拆分交给 `planner`，按 `W1 -> W2 -> W3 -> W4 -> W5` 排期，并在实现阶段仅让前端实现代理处理 `apps/web` 相关文件。
