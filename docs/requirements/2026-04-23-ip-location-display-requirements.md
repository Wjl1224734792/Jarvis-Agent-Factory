# IP 属地展示调整需求

## 1. 需求摘要

当前 Web 端的 IP 属地展示位置与文案不符合预期：信息流中不应展示属地；详情页需要在发布时间所在信息行追加展示属地，且不应放在作者区域；个人主页、他人主页需要展示发布者属地；所有评论与回复需要展示评论作者属地。不同页面的文案规则需要拆开，而不是继续全站复用同一种前缀。

## 2. 目标与成功标准

### 目标

- 将属地展示从信息流移除，收敛到详情页与用户主页。
- 统一详情页发布时间行的展示文案为 `<location>`，不再带 `发布于`、`IP属地` 或其它前缀。
- 统一评论区与回复区的展示文案为 `<location>`，不再带 `IP属地` 或其它前缀。
- 统一个人主页与他人主页的展示文案为 `IP属地:<location>`。
- 保持现有公共字段来源不变，继续基于现有公开属地数据渲染，不额外暴露用户原始 IP。

### 成功标准

- 首页信息流、圈子信息流、榜单列表页不再显示任何属地文本。
- 帖子/动态/榜单/评分对象等详情页在发布时间所在信息行追加显示 `<location>`。
- 个人主页与他人主页显示 `IP属地:<location>`。
- 帖子评论、机型评论、评分对象评论，以及帖子评论回复等位置只显示 `<location>`。
- 全站不再出现 `IP属地：` 文案。
- 现有测试补充或更新后通过，能够覆盖关键展示位置与文案变化。

## 3. 范围内 / 范围外

### 范围内

- `apps/web` 内与 `IpLocationText` 相关的展示调整。
- 详情页发布时间所在信息行的属地展示文案调整。
- 评论区与回复区的属地展示文案调整。
- 信息流、列表页中既有属地展示的移除。
- 必要的前端测试更新。

### 范围外

- 不新增或公开用户原始 IP 地址字段。
- 不修改后端属地解析算法与 `ipLocationLabel` 的生成逻辑，除非执行规划阶段发现前端现有契约无法满足需求。
- 不调整与本需求无关的页面排版、图标、头像、交互逻辑。
- 不处理后台 `apps/admin` 的属地展示。

## 4. 关键模块 / 功能列表

1. 公共属地展示组件
   - `apps/web/src/components/ip-location-text.tsx`
   - 需要支持无前缀、`IP属地` 前缀，或由调用方完全控制文案。

2. 信息流 / 列表页移除属地
   - `apps/web/src/routes/home-page.tsx`
   - `apps/web/src/routes/circle-page-feed.tsx`
   - `apps/web/src/routes/rankings-page.tsx`

3. 详情页发布时间行属地展示
   - `apps/web/src/routes/post-detail-page.tsx`
   - `apps/web/src/routes/circle-page-detail.tsx`
   - `apps/web/src/routes/ranking-detail-page.tsx`
   - `apps/web/src/routes/rating-target-detail-header.tsx`
   - 不放在作者区域，统一跟随发布时间所在信息行显示 `<location>`

4. 个人页 / 他人页属地展示
   - `apps/web/src/features/auth/profile-page.tsx`
   - `apps/web/src/routes/user-profile-page.tsx`
   - 统一显示 `IP属地:<location>`

5. 评论与回复属地展示
   - `apps/web/src/features/posts/post-comment-thread.tsx`
   - `apps/web/src/routes/model-comments-section.tsx`
   - `apps/web/src/routes/rating-target-detail-comment-card.tsx`

6. 测试与回归覆盖
   - 更新或新增 `apps/web/tests/*` 中与上述页面、组件相关的测试。

## 5. 风险与开放问题

### 风险

- 现有公共组件被多个页面复用，若直接修改默认文案，可能影响未在本次范围内显式列出的页面。
- 个别详情页可能通过不同组件路径渲染发布时间信息行，需要在实现时核对所有 `IpLocationText` 使用点，避免遗漏。
- 测试若只覆盖组件默认值，可能无法发现页面级漏改。

### 开放问题

- 当前需求默认“各个详情页”以现有使用属地文本的详情页为准；如果后续发现尚未接入属地展示但也应纳入的详情页，需要作为增补范围单独确认。

## 6. 已收敛结论（用户已确认或主会话明确）

- 用户已明确确认：各个详情页直接显示 `<location>`，且应跟随发布时间所在信息行展示，不放在作者区域。
- 用户已明确确认：评论区与回复区直接显示 `<location>`。
- 用户已明确确认：个人主页与他人主页显示 `IP属地:<location>`。
- 用户已明确确认：信息流中不要展示属地。
- 本次需求中的 “IP” 指公开属地展示，不是公开原始 IP 地址；本次实现不对外暴露 `clientIp`。
