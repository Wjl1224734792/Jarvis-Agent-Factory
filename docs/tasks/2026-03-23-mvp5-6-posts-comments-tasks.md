# MVP 第5/6迭代：帖子域、首页内容流、评论与基础审核任务拆分

## 1. 需求文档路径

- [PRD V1.0](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/PRDs/%E9%A3%9E%E5%8A%A0%E7%BD%91%20-%20%E4%BA%A7%E5%93%81%E9%9C%80%E6%B1%82%E6%96%87%E6%A1%A3%20(PRD)%20V1.0.md)
- [MVP Roadmap](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/mvp/mvp-roadmap.md)
- [MVP 第1-第6迭代清单](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/mvp/MVP%20%E7%AC%AC1-%E7%AC%AC6%E8%BF%AD%E4%BB%A3%E6%B8%85%E5%8D%95.md)

## 2. 任务概览

方案A 已确认：新增真实帖子域，不再复用机型点评域承载社区内容。

本轮只做以下闭环：
- `/home` 内容流，先支持 `推荐` / `最新` 两个 tab
- 纯文本帖子
- 帖子详情
- 评论与单层回复
- 删除自己的帖子/评论
- 举报
- 后台帖子/评论基础审核

明确不做：
- 图片/视频上传
- 关注流
- 消息通知
- 无限嵌套评论

现有 `reviews` 模块只作为“机型点评”保留，不作为帖子域复用入口。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 |
|---|---|---|---|---|
| T1 | 帖子域共享契约与状态枚举收敛 | DDD + TDD | P0 | `packages/shared`、`packages/schemas` 定义帖子/评论/举报/审核状态、`/home` tab、删除/可见性等公共常量与输入输出 schema；前后端按同一契约解析通过，并有对应测试覆盖。 |
| T2 | 帖子/评论/举报数据模型与迁移 | DDD + TDD | P0 | `packages/db` 落库帖子、评论、举报、审核状态、删除状态与必要索引/唯一约束；支持作者归属、单层回复、基础审核查询；迁移与 typecheck 可通过。 |
| T3 | 服务端帖子域读写闭环 | DDD + TDD | P0 | `apps/server` 提供帖子列表、帖子详情、发帖、评论、回复、删帖/删评、举报接口；实现权限校验、状态校验、单层回复约束、仅删除自己的内容等规则。 |
| T4 | 服务端后台帖子/评论审核模块 | DDD + TDD | P0 | `apps/server` 提供后台帖子/评论审核列表与基础审核动作；可按状态/类型查询并切换审核状态，且与前台展示状态一致。 |
| T5 | 统一请求层与错误映射 | TDD | P0 | `packages/http-client` 封装帖子域和后台审核接口；请求、响应、错误映射都通过 schema 校验；前后端不直接绕过该层调用新接口。 |
| T6 | Web `/home` 内容流与帖子详情页 | 直接开发 | P0 | `apps/web` 可访问 `/home`；支持 `推荐` / `最新` tab、帖子卡片流、详情页跳转、空态/加载态/错误态；路由与现有导航保持一致。 |
| T7 | Web 发帖、评论、回复交互 | 直接开发 | P0 | `apps/web` 支持纯文本发帖、详情页评论、单层回复、删除自己的帖子/评论、举报入口；登录态与表单状态同步正确。 |
| T8 | Admin 帖子/评论审核界面 | 直接开发 | P0 | `apps/admin` 支持帖子/评论审核列表、基础筛选、审核动作、错误态与刷新；界面只通过统一请求层访问服务端。 |
| T9 | 迭代验收口径与联调清单 | Direct | P1 | 交付给 planner 的验收项、联调顺序、回归点、边界说明齐全，便于后续按任务拆分执行。 |

## 4. DDD 分类

### 必须 DDD

- T1 帖子域共享契约与状态枚举收敛
- T2 帖子/评论/举报数据模型与迁移
- T3 服务端帖子域读写闭环
- T4 服务端后台帖子/评论审核模块

原因：
- 帖子、评论、举报、审核状态是一组强一致的领域规则
- 删除自己的内容、单层回复、审核状态切换都属于状态机与权限规则
- 前台、后台、服务端共享同一份事实模型，不能各自解释

### 不强制 DDD

- T5 统一请求层与错误映射
- T6 Web `/home` 内容流与帖子详情页
- T7 Web 发帖、评论、回复交互
- T8 Admin 帖子/评论审核界面
- T9 迭代验收口径与联调清单

## 5. TDD 与直接开发分类

### 必须 TDD

- T1
- T2
- T3
- T4
- T5

原因：
- 这是核心业务规则和共享契约
- 涉及权限、状态流转、单层回复、删除归属、举报、后台审核
- `http-client` 属于高风险接口契约层，错一次会同步放大到前后端

### 可以直接开发

- T6
- T7
- T8
- T9

## 6. 风险任务

- T1 是最高风险共享区，任何字段名、状态枚举、返回结构偏差都会同步影响 `web`、`admin`、`server`
- T2 涉及强约束与索引，最容易在唯一性、外键、级联删除和审核状态上出问题
- T3/T4 会同时碰读链路和写链路，最容易把“展示规则”和“写入规则”拆成两套逻辑
- T5 容易把请求层写成第二套业务层，必须坚持只做封装和错误映射
- T6 的 `/home` 路由要和现有首页/根路由关系先锁定，避免前端重复改路由常量
- T7 的删除、举报、回复交互依赖后端状态流转，接口一旦不稳就会反复返工
- T8 的审核状态要和前台展示状态一致，否则会出现后台已隐藏、前台仍可见的错位

## 7. 文件所有权和共享路径提醒

以下区域必须单线程收敛，不能多人并行改同一份共享合约：

- `packages/shared/src/index.ts`
- `packages/schemas/src/*`
- `packages/db/src/schema.ts`
- `packages/db/src/seed.ts`
- `packages/db/drizzle/*`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts`
- `apps/server/src/modules/*` 中新建的帖子域模块
- `apps/web/src/app.tsx`
- `apps/web/src/routes/*`
- `apps/admin/src/app.tsx`
- `apps/admin/src/features/*`
- `docs/tasks/*`

边界提醒：
- `packages/shared` 只放路由常量和纯工具，不放业务逻辑
- `packages/schemas` 只放契约与校验，不放实现
- `packages/http-client` 只做调用封装和错误映射，不补业务判断
- `apps/server` 统一承载帖子域规则、权限校验、读写聚合和审核接口
- `apps/web` 只负责展示与交互，不直连数据库和服务端内部模块
- `apps/admin` 只负责审核界面，不绕过请求层

额外提醒：
- 这份任务文档本身位于 `docs/tasks`，后续若继续细拆子任务，不要多人同时修改同一个任务文件

## 8. 推荐交付顺序

1. 先做 T1，锁定帖子域共享契约、状态枚举和 tab 常量
2. 再做 T2，把数据模型、迁移和约束收敛到位
3. 接着做 T3，打通前台读写主链路
4. 再做 T4，把后台基础审核补上
5. 然后做 T5，把前后端请求入口统一起来
6. 再做 T6，先把 `/home` 内容流跑通
7. 再做 T7，把发帖、评论、回复和删除/举报交互接入
8. 最后做 T8，补齐后台审核界面
9. T9 可作为收口文档并行补充

## 9. 推荐的下一步

把这份拆分交给 planner，先锁定：
- `T1 -> T2 -> T3/T4 -> T5 -> T6/T7/T8` 的依赖顺序
- 哪些任务可以分配给不同 owner
- 哪些共享路径必须单线程执行
- 每个任务的最小验收命令

## 10. 最小验证预期

按任务阶段做最小验证，不要一上来跑全量。

- T1 完成后：`bun run --cwd packages/schemas test`、`bun run --cwd packages/schemas typecheck`
- T2 完成后：`bun run --cwd packages/db typecheck`
- T3/T4 完成后：`bun run --cwd apps/server test`
- T5 完成后：`bun run --cwd packages/http-client typecheck`
- T6 完成后：`bun run --cwd apps/web typecheck`
- T8 完成后：`bun run --cwd apps/admin typecheck`
- 最终收口：`bun run check`
