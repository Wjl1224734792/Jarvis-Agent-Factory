# MVP 第 4 阶段评分与点评体系执行计划

## 1. 需求文档路径
- `docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`
- `docs/project/mvp/MVP 第1-第6迭代清单.md`
- `docs/project/mvp/第1-第6迭代：每轮输入-输出 依赖关系表.md`

## 2. 任务文档路径
- `docs/project/mvp/MVP 第1-第6迭代清单.md`
- `docs/project/mvp/MVP 第1-第6迭代的每轮验收口径.md`

## 3. 当前轮次目标
- 在机型详情页落地“可评分、可点评、可展示综合口碑”的最小闭环。
- 保证“单用户对单机型仅保留一条点评记录”。
- 提供后台最小点评治理能力，为后续首页信息流和榜单提供可消费口碑数据。

## 4. 当前轮次范围
### 范围
- 评分/点评数据结构、共享契约、读写接口、聚合口径。
- Web 端机型详情页评分与点评展示、提交/更新、快速评分入口。
- Admin 端点评最小治理页。
- 与机型详情页联动的综合评分、点评列表、我的点评态识别。

### 非范围
- 首页信息流消费点评内容。
- 榜单、口碑标签、贝叶斯平滑等增强算法。
- 点赞、收藏、分享、举报、私信联动。
- 复杂风控链路、异步队列体系、消息通知。
- 通用 UGC 帖子/评论系统。

## 5. 完成标准
- 机型详情页可展示综合评分、点评数量、点评列表。
- 登录用户可新增或更新自己对同一机型的唯一点评记录。
- 列表页或详情页存在可用的快速评分入口。
- 后台可查看、上下架或屏蔽点评，且前台展示与治理状态一致。
- 评分聚合口径稳定，读写后前台结果可复现。

## 6. 是否需要先查阅 repo_explorer
- 否。当前阶段边界、依赖顺序和共享区位置已足够明确。

## 7. 执行代理分工
- `backend_implementer`
  - 负责所有共享区改动。
  - 负责 `packages/db`、`packages/schemas`、`packages/shared`、`packages/http-client`、`apps/server`。
  - 负责评分/点评写入、唯一约束、聚合查询、治理接口。
- `frontend_implementer`
  - 负责 `apps/web` 的详情页评分/点评交互与展示。
  - 负责 `apps/admin` 的点评治理页面接入。
  - 不修改共享契约、数据库结构、服务端路由入口。

## 8. 共享区域改动归属
- 唯一责任方：`backend_implementer`
- 共享区包括：
- `packages/db`
- `packages/schemas`
- `packages/shared`
- `packages/http-client`
- `apps/server/src/app.ts`
- `apps/server/src/routes/*`
- `apps/server/src/modules/*`
- 顺序要求：
- 先冻结评分/点评表结构、接口契约、聚合字段、治理状态枚举。
- 再完成服务端读写与聚合实现。
- 最后再由 `frontend_implementer` 接 `apps/web` 和 `apps/admin`。

## 9. 工作区推荐
- `worktree`
- 原因：本轮跨共享层、后端、Web、Admin，且存在明确共享区单方收口要求，适合隔离推进与并行实现。

## 10. 风险提醒
- “单用户单机型唯一点评”如果同时落在业务逻辑和数据库约束两层不一致，后续很容易出现重复数据或更新覆盖异常。
- 综合评分口径如果现在不固定，后续首页、榜单、标签体系会反复返工。
- 前台展示状态与后台治理状态如果未统一，会出现“后台已下线但前台仍可见”。
- 快速评分如果和完整点评写入不是同一模型，后续会出现双轨数据。
- 机型详情页已有第 3 阶段链路，接入点评后要避免破坏原有详情查询和页面加载稳定性。

## 11. 实现者交接信息
- 推荐顺序：
1. `backend_implementer` 先完成共享契约、数据库变更、服务端接口。
2. 契约冻结后，`frontend_implementer` 并行推进 `apps/web` 与 `apps/admin` 页面。
3. 联调后回到 `backend_implementer` 收口聚合一致性和治理状态校验。
- 可并行部分：
1. `apps/web` 评分/点评展示与提交。
2. `apps/admin` 点评治理页面。
- 不可并行部分：
1. `packages/db`
2. `packages/schemas`
3. `packages/shared`
4. `packages/http-client`
5. `apps/server` 评分/点评路由与模块入口

## 12. 推荐的下一步
- 先把本轮任务包交给 `backend_implementer`，要求其先收口共享区与服务端接口。
- 共享契约冻结后，再把 Web 和 Admin 页面任务交给 `frontend_implementer`。
- 联调完成后执行本轮最小验证：
- `bun run db:migrate`
- `bun run db:seed`
- `bun run test`
- `bun run typecheck`
- `bun run build`
