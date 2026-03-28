# 个人中心 / 设置 / 消息紧凑化审查

## 1. 需求文档
- 路径：`docs/requirements/2026-03-27-profile-settings-requirements.md`

## 2. 任务文档
- 路径：`docs/tasks/2026-03-28-profile-message-compact-tasks.md`

## 3. 计划文档
- 路径：`docs/plans/2026-03-28-profile-message-compact-plan.md`

## 4. 前端实现文档
- 路径：无单独前端实现文档，本轮以前端代码变更为准

## 5. 后端实现文档
- 路径：无

## 6. 审查结论
- 有条件通过

## 7. 需求覆盖情况
- 已覆盖：个人中心、设置、消息页主要可见文案已改为中文。
- 已覆盖：消息 / 个人中心 / 设置入口已从顶栏移除，转为登录后显示在侧边栏和移动端抽屉。
- 已覆盖：消息页和评论区已引入局部 skeleton / 局部 busy 态，未再把整个消息页替换为整页 loading。
- 部分覆盖：个人中心与设置页虽然新增了局部 skeleton 组件，但当前真实加载链路仍先经过 `ProtectedRoute` 的通用 loading 分支，页内 skeleton 在首次会话恢复时不会实际生效。

## 8. 计划一致性
- 与 `W1` 一致：共享壳层入口已收口到侧边栏 / 抽屉，顶栏不再承载个人入口。
- 与 `W2/W3` 一致：个人中心、设置页已做中文化与紧凑化重排。
- 与 `W4/W5` 基本一致：消息页与评论区均改为局部 loading。
- 与 `W6` 不完全一致：已有 `typecheck`、`build`、`vitest` 证据，但未见浏览器级 smoke 走查证据。

## 9. 前后端边界一致性
- 本轮未扩展共享契约、HTTP client 或后端接口。
- 个人中心 / 设置页继续明确区分真实能力（登录态、退出登录、消息查询）与前端本地态（资料编辑、偏好保存、密码演练、注销演练）。
- 未发现前后端边界被误改或被伪装成已实现的真实后端能力。

## 10. 测试覆盖状态
- 已运行：`bun run --cwd apps/web typecheck`
- 已运行：`bunx vitest run --config vitest.config.ts apps/web/tests/profile-settings-state.test.ts apps/web/tests/model-review-form.test.ts apps/web/tests/query-client.test.ts`
- 已运行：`bun run --cwd apps/web build`
- 缺失：页面级导航 / 侧边栏入口 / 未登录重定向 / 浏览器级交互走查证据

## 11. 问题列表
### 阻塞
- 无

### 高
- 无

### 中
- `apps/web/src/features/auth/protected-route.tsx:10` 的通用 loading 分支会在会话恢复阶段直接返回一个独立提示块，导致 `apps/web/src/features/auth/profile-page.tsx:50` 与 `apps/web/src/routes/settings-page.tsx:86` 新增的页内 skeleton 在真实首次加载路径上不会被看到。结果是“个人中心 / 设置页使用局部 skeleton”这一点只在代码结构上存在，实际体验仍由通用 loading 占位主导。
- `apps/web/src/features/posts/post-comment-thread.tsx:101` 为“展开回复”引入了固定 180ms 的人工延迟，并在已有内存数据的情况下主动展示 skeleton。这里不是实际请求中的 loading，而是人为制造的等待，可能把原本可以即时展开的回复做成新的抖动感。

### 低
- 缺少页面级自动化验证和浏览器级走查，当前主要依赖代码审查与构建 / 类型 / 状态层测试。

## 12. 必须修复项
- 无阻塞必须修复项。

## 13. 优化建议
- 若要真正满足“个人中心 / 设置页局部 skeleton”的体验目标，应把 `ProtectedRoute` 的 loading 呈现与页内 skeleton 统一，而不是让通用 loading 抢先返回。
- 评论回复展开建议直接即时展开；如果后续真有异步回复请求，再基于真实 loading 加 skeleton，而不是先加固定延迟。

## 14. 回归建议
- 补一次浏览器级 smoke，确认未登录时侧边栏确实没有个人入口，登录后桌面侧边栏和移动端抽屉入口一致。
- 重点走查消息页首次进入、刷新消息流、全部已读、评论提交、回复展开、回复发送中的视觉稳定性。
- 重点观察 tab 切换时的内容高度变化，确认没有新的跳动。

## 15. 推荐的下一步
1. 决定是否修正 `ProtectedRoute` 与页内 skeleton 的加载链路冲突。
2. 决定是否去掉评论回复展开的人为延迟。
3. 补浏览器级 smoke 后再作为最终交付结论。

## 16. 审查文档路径
- `docs/review/2026-03-28-profile-message-compact-review.md`
