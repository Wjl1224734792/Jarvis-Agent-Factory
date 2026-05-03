# 第4阶段：评分与点评体系需求收敛

## 1. 需求摘要
第4阶段要把当前“机型主数据”升级成“机型评分 + 点评”的闭环。用户可以对机型打分、写点评，同一用户对同一机型只能保留一条点评；机型详情页要展示综合评分和点评列表；后台要具备最小治理能力；评分汇总可采用异步计算或最终一致性。

## 2. 目标和成功标准
- 用户能登录后对任意已发布机型进行评分和点评。
- 单用户对单机型只能有一条有效点评记录，重复提交会覆盖原记录。
- 机型详情页能稳定展示综合评分、评分人数/点评数和点评列表。
- 后台能对点评进行最小治理。
- 写入后允许短暂延迟，最终评分汇总必须收敛正确。

## 3. 范围
### 范围内
- 机型评分
- 机型点评
- 单用户单机型唯一点评约束
- 机型详情页点评列表
- 综合评分展示
- 快速评分入口
- 后台点评最小治理
- 评分汇总的异步或最终一致性处理

### 范围外
- 收藏、想买、分享、关注等其他互动
- 点评回复、楼中楼、@提及
- 点赞、踩、举报、申诉、黑名单、敏感词全量审核
- 点评图片、视频、附件
- 点评标签、长文编辑器、富文本
- 榜单、推荐、热度排序、搜索权重联动
- 复杂反作弊、风控、设备指纹、限流策略细化

## 4. 模块 / 功能列表
- 用户端评分提交
- 用户端点评提交与更新
- 机型详情页评分摘要展示
- 机型详情页点评列表展示
- 详情页快速评分入口
- 后台点评列表与治理
- 评分汇总任务或统计写入

## 5. 关键业务流程
1. 用户进入机型详情页，看到当前综合评分、点评数和点评列表。
2. 用户在详情页通过快速评分入口提交评分，或提交评分 + 点评内容。
3. 服务端校验登录态、机型存在性、评分范围和点评长度。
4. 如果该用户已对该机型点评过，则更新同一条点评；否则新增点评。
5. 写入点评明细后，异步刷新机型聚合评分，或由后台统计任务最终收敛。
6. 机型详情页读取最新可用的聚合评分和点评列表。
7. 后台可对异常或不合规点评执行最小治理操作。

## 6. 关键对象
- `AircraftModel`：机型主数据对象，作为评分和点评的承载主体。
- `ModelReview`：点评明细，包含用户、机型、评分、内容、状态、时间。
- `ModelRatingSummary`：机型聚合评分结果，包含平均分、评分数、点评数、更新时间。
- `AdminReviewAction`：后台治理动作，至少覆盖隐藏或删除。

## 7. 模块交互草案
- `web` 详情页调用 `http-client` 获取机型详情、评分摘要和点评列表。
- `web` 提交评分/点评时通过 `http-client` 调用服务端写接口。
- `server` 负责登录态校验、唯一点评约束、写入点评明细、触发聚合更新。
- `server` 负责读取点评列表和评分摘要。
- `admin` 负责查看点评并执行最小治理。
- `db` 保存点评明细表与聚合统计表。
- `schemas` 定义评分、点评、摘要、后台治理的请求响应契约。

## 8. 与当前代码结构的映射
- 现有机型主链路已经在 [apps/server/src/modules/aircraft-models/aircraft-models.route.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/aircraft-models/aircraft-models.route.ts)、[apps/server/src/modules/aircraft-models/aircraft-models.service.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/aircraft-models/aircraft-models.service.ts)、[apps/server/src/modules/aircraft-models/aircraft-models.repo.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/modules/aircraft-models/aircraft-models.repo.ts) 中实现，第4阶段应在同一机型域下扩展，不应拆出新的主业务域。
- 当前详情页入口已预留在 [apps/web/src/routes/model-detail-page.tsx](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/web/src/routes/model-detail-page.tsx)，按钮仍是占位，适合作为评分/点评入口承载点。
- 当前 API 路由常量集中在 [packages/shared/src/index.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/shared/src/index.ts)，第4阶段新增路由应延续该模式。
- 当前请求/响应契约集中在 [packages/schemas/src/models.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/schemas/src/models.ts)，评分与点评契约应并入这里。
- 当前服务端入口在 [apps/server/src/app.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/server/src/app.ts)，第4阶段新增模块应按现有 `modules/*` 路由挂载。
- 当前数据库只有机型主数据，没有点评域表；评分与点评需要新增在 [packages/db/src/schema.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/db/src/schema.ts) 对应的表和约束。
- 当前前端请求封装集中在 [packages/http-client/src/index.ts](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/packages/http-client/src/index.ts)，第4阶段写接口应继续走这里。
- 当前后台机型管理在 [apps/admin/src/features/models/models-page.tsx](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/apps/admin/src/features/models/models-page.tsx)，点评治理能力可复用同类后台模块组织方式。

## 9. 风险 / 缺失信息 / 开放问题
- 评分尺度未在代码中固化，需要确认是 1-5 分还是 1-10 分。
- 点评长度、是否允许空点评、是否允许仅评分未写点评，需要明确。
- “后台最小治理”是仅隐藏/删除，还是还要支持恢复，需要确认。
- 异步汇总采用队列还是定时任务目前未定，需明确可接受的最终一致性窗口。
- 详情页点评列表是否需要分页或只展示最近 N 条，目前未定。
- 是否允许未登录用户只看评分但不能写入，需要明确。

## 10. 推荐的下一步
- 先把评分尺度、点评唯一规则、后台治理动作这 3 个边界定死。
- 再让 `task_design` 基于这份收敛稿拆出第4阶段最小实现任务。
- 若要继续压缩范围，优先保留“详情页写入 + 聚合展示 + 后台隐藏/删除”，其余全部后置。
