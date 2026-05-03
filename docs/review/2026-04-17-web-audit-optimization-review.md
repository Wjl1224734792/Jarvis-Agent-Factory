# 2026-04-17 Web 审查与优化报告

## 审查结论

- 结论：有条件通过
- 说明：Web 阶段已完成只读审查、本轮最小修复与针对性验证。当前已修复登录态 bootstrap 误判掉线、错误重试结构化判定缺失、机型详情侧栏缓存 key 过度绑定，以及若干前端测试与 lint 漂移问题。大范围缓存分层、跨页 query key 统一、评论/卡片墙虚拟化和评论排序契约仍保留为后续专项。

## 已确认问题清单

### 已修复

1. 鉴权与请求错误在本地化后丢失结构化重试判断依据，导致 400/401/403/404/422 等请求仍可能被无意义重试。
   - 影响：增加无效网络重试，放大弱网与鉴权失败场景的延迟。
   - 证据：`apps/web/src/lib/query-client.ts` 与 `apps/web/src/lib/api-client.ts`。
   - 处理方式：本轮修复。
   - 结果：在 `apps/web/src/lib/api-client.ts` 中为映射后的错误补充结构化元信息，在 `apps/web/src/lib/query-client.ts` 中优先按结构化字段判断可重试性。

2. 首屏 bootstrap 在非鉴权错误下直接 `setAnonymous()`，会清空已持久化的登录态并造成“弱网掉线”。
   - 影响：刷新页面时，只要 `/auth/me` 暂时失败，就可能被错误判定为未登录。
   - 证据：`apps/web/src/features/auth/use-bootstrap-auth.ts`。
   - 处理方式：本轮修复。
   - 结果：仅对明确鉴权失效场景执行清空登录态；对瞬时错误保留当前用户态并记录 bootstrap error。

3. 机型详情页热门机型侧栏 query key 误绑定当前 `slug`，同分类跳转时重复拉取。
   - 影响：同分类详情页浏览过程中产生额外请求和缓存分叉。
   - 证据：`apps/web/src/routes/model-detail-page.tsx`。
   - 处理方式：本轮修复。
   - 结果：抽出 `getHotModelsSidebarQueryKey`，只按 `categorySlug` 建 key。

4. Web 单测存在漂移与 mock 缺口，影响本轮优化后的回归可信度。
   - 影响：前端阶段无法稳定证明改动安全。
   - 证据：`apps/web/tests/**`。
   - 处理方式：本轮修复。
   - 结果：补充 bootstrap / retry / query key 测试，修正搜索与瀑布流测试预期，补齐 `hover-card` mock。

5. 访客主页内容列表的 `useMemo` 依赖写法触发 lint warning。
   - 影响：持续引入低价值告警，降低 lint 信号质量。
   - 证据：`apps/web/src/routes/user-profile-page.tsx`。
   - 处理方式：本轮修复。
   - 结果：将 `rawContentItems` 收敛为稳定 memo 依赖，消除 warning。

### 仅记录，未在本轮修复

1. `queryClient.clear()` 在登录态切换时会清空公共缓存并带来全站 refetch 风险。
   - 影响：登录/退出或鉴权失效时，公共内容缓存一起被清空。
   - 处理方式：仅记录。
   - 原因：要正确收敛需要系统化区分 public / user-scoped query key，超出本轮最小修改范围。

2. 跨页 query key 未统一，榜单/机型等内容缓存复用不足。
   - 影响：短时导航中重复请求增多。
   - 处理方式：仅记录。
   - 原因：需要按 domain 整体梳理 key 工厂与选择器，不适合零散补丁。

3. `models` / `circle` 等卡片墙仍是全量渲染，评论排序仍存在性能隐患。
   - 影响：大数据量下滚动与切换排序可能掉帧。
   - 处理方式：仅记录。
   - 原因：涉及虚拟列表/分页和评论数据处理专项，超出本轮最小范围。

4. 路由 fallback 自身懒加载可能在弱网下出现短暂无内容过渡。
   - 影响：导航时感知性能受损。
   - 处理方式：仅记录。
   - 原因：需要结合 chunk 策略与首包体积一起评估，不宜在本轮单点改动。

5. 帖子详情评论“热门/最新”切换未真正接入 API 排序能力。
   - 影响：UI 行为与后端排序契约可能不一致。
   - 处理方式：转共享补丁。
   - 原因：当前 `packages/http-client` 的 `getPostDetail` 未暴露 `commentSort` 传参，修复需要跨应用契约调整。

## 本轮修改范围

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/query-client.ts`
- `apps/web/src/features/auth/use-bootstrap-auth.ts`
- `apps/web/src/routes/model-detail-helpers.ts`
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/web/src/routes/user-profile-page.tsx`
- `apps/web/tests/**`

## 已执行验证

- `bunx vitest run --config ./vitest.config.ts apps/web/tests/query-client.test.ts apps/web/tests/api-client-sanitization.test.ts apps/web/tests/model-detail-helpers.test.ts apps/web/tests/use-bootstrap-auth.test.ts apps/web/tests/web-top-nav.test.ts apps/web/tests/search-navigation.test.ts apps/web/tests/circle-page-helpers.test.ts`
- `bunx vitest run --config ./vitest.config.ts apps/web/tests`
- `bun run --cwd apps/web lint`
- `bun run --cwd apps/web typecheck`
- `bun run --cwd apps/web build`

## 残余风险

- Web 仍未对 public / user-scoped query key 做系统性分层，登录态切换时的缓存清理成本问题尚在。
- 评论排序契约、分享计数语义和评论树结构共享仍有后续优化空间。
- 卡片墙虚拟化与长列表性能专项需在消息中心/内容流改造时统一规划。
