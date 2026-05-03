# MVP 第4迭代评分与点评体系任务拆解

## 1. 需求文档路径

- [MVP Roadmap](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/mvp/mvp-roadmap.md)
- [MVP 第1-第6迭代清单](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/mvp/MVP%20%E7%AC%AC1-%E7%AC%AC6%E8%BF%AD%E4%BB%A3%E6%B8%85%E5%8D%95.md)
- [飞加网 PRD V1.0](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/project/PRDs/%E9%A3%9E%E5%8A%A0%E7%BD%91%20-%20%E4%BA%A7%E5%93%81%E9%9C%80%E6%B1%82%E6%96%87%E6%A1%A3%20(PRD)%20V1.0.md)
- [第3迭代飞行器库任务拆分](/E:/CodeStore/feijia/.worktrees/mvp2-auth-identity/docs/tasks/2026-03-22-mvp3-models-tasks.md)

## 2. 任务概览

本轮只做“机型评分 + 点评 + 点评治理”的最小闭环，不扩展到收藏、想买、关注、榜单、消息、举报体系或完整内容审核。

当前已确认的边界：

- 评分和点评都挂在具体机型上
- 同一用户对同一机型只允许保留一条点评记录
- 机型详情页要展示综合评分、点评列表和快速评分入口
- 后台只做点评最小治理，不做完整审核系统
- 共享契约、数据库唯一约束、评分写入和读展示不能并行乱改

建议把本轮理解成三条最小垂直切片：

1. 详情页读展示切片
   - 先让用户看到综合评分、点评列表和当前自己的点评状态
   - 只覆盖“读链路”，先不做治理

2. 用户写入切片
   - 先打通评分/点评提交
   - 单用户单机型唯一点评必须生效，快速评分入口复用同一写入链路

3. 后台治理切片
   - 先给管理员一套最小点评治理能力
   - 只做列表、隐藏、恢复，不扩展申诉、精选、置顶、批量处理

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | 完成标准 | 最小验证 |
|---|---|---|---|---|---|
| T1 | 评分点评共享契约与路由常量收敛 | TDD + 契约设计 | P0 | `packages/schemas` 与 `packages/shared` 输出评分、点评、综合评分、管理员治理所需的稳定 schema、类型和路由常量；机型详情响应能携带 `ratingSummary`、`reviewList`、`currentUserReview` 等读模型字段 | `bun run --cwd packages/schemas test`、`bun run --cwd packages/schemas typecheck`、`bun run --cwd packages/shared typecheck` 通过 |
| T2 | 点评数据模型与唯一性约束 | DDD + TDD | P0 | `packages/db` 新增点评表与必要索引，明确 `model_id + user_id` 唯一约束、评分等级、点评内容、可见状态和时间字段；提供 upsert、查询、隐藏/恢复所需的数据访问能力 | `bun run --cwd packages/db typecheck` 通过，迁移生成结果可见唯一索引与状态字段 |
| T3 | 服务端评分与点评领域模块 | DDD + TDD | P0 | `apps/server` 新增独立点评模块，提供机型详情读链路中的综合评分与点评列表，以及当前用户点评写入接口；保证唯一点评、身份校验、可见性过滤和评分一致性 | `bun run --cwd apps/server test` 通过，且公开详情接口能返回评分摘要与点评列表 |
| T4 | 统一请求层点评接口封装 | TDD + 直接开发 | P0 | `packages/http-client` 封装机型详情评分读取、点评提交、管理员治理相关调用，并统一错误映射；前后端只通过该层访问点评 API | `bun run --cwd packages/http-client typecheck` 通过，接口路径和 payload 与契约一致 |
| T5 | Web 机型详情页读展示与快速评分入口 | 直接开发 | P0 | `apps/web` 的机型详情页显示综合评分、点评列表、当前用户点评状态和快速评分入口；未登录态有清晰引导，已登录态可完成提交或更新点评 | `bun run --cwd apps/web typecheck` 通过，浏览器可完成详情查看与评分提交 |
| T6 | Admin 点评最小治理闭环 | DDD + TDD | P0 | `apps/admin` 与服务端治理接口打通，管理员可查看点评列表并执行隐藏/恢复；治理结果会影响前台展示 | `bun run --cwd apps/admin typecheck` 通过，且未授权访问会被拦截 |
| T7 | 迭代交付说明与验证收口 | 直接开发 | P1 | 启动方式、环境变量、接口入口、评分/点评流、治理流和验证口径记录清楚，便于 planner 继续拆分和交接 | `bun run check` 通过，文档可直接进入下一轮排期 |

## 4. DDD 分类

### 需要 DDD

- T2 点评数据模型与唯一性约束
- T3 服务端评分与点评领域模块
- T6 Admin 点评最小治理闭环

原因：

- 单用户单机型唯一点评是明确的聚合规则
- 评分写入、可见性、隐藏/恢复属于集中约束的状态规则
- 前台读展示和后台治理共享同一套点评事实，不能各自解释

### 不需要 DDD

- T1 评分点评共享契约与路由常量收敛
- T4 统一请求层点评接口封装
- T5 Web 机型详情页读展示与快速评分入口
- T7 迭代交付说明与验证收口

## 5. TDD 与直接开发分类

### 必须 TDD

- T1 评分点评共享契约与路由常量收敛
- T2 点评数据模型与唯一性约束
- T3 服务端评分与点评领域模块
- T4 统一请求层点评接口封装
- T6 Admin 点评最小治理闭环

### 可以直接开发

- T5 Web 机型详情页读展示与快速评分入口
- T7 迭代交付说明与验证收口

## 6. 风险任务

- T1 是最高风险共享区，字段名、评分等级、点评状态或返回结构一旦不稳，会同步影响 `web`、`admin`、`server`
- T2 涉及唯一约束和状态字段，最容易在迁移、索引和 upsert 上出错
- T3 同时碰读链路和写链路，最容易把“评分展示”和“点评写入”拆成两套不一致逻辑
- T5 的快速评分入口如果另起一套表单逻辑，很容易和完整点评入口重复
- T6 的最小治理如果扩成完整审核系统，会直接吞掉第 6 迭代的内容治理范围

## 7. 文件所有权和共享路径提醒

以下区域必须单线程收敛，不能并行抢改：

- 根级 `package.json`、`bunfig.toml`、`tsconfig*.json`
- `packages/shared`
- `packages/schemas`
- `packages/http-client`
- `packages/db/src/schema.ts`
- `packages/db/drizzle`
- `apps/server/src/app.ts`
- `apps/server/src/modules/reviews` 或同等新建点评模块
- `apps/web/src/routes/model-detail-page.tsx`
- `apps/admin/src/features/*`

前后端边界建议如下：

- `packages/shared` 只放路由常量和纯工具，不放业务逻辑
- `packages/schemas` 只放点评契约、输入校验和返回结构，不放实现逻辑
- `packages/http-client` 只负责调用封装和错误映射，不写业务规则
- `apps/server` 只拥有点评领域规则、权限校验、读写聚合和治理接口
- `apps/web` 只负责展示、提交和交互，不直接碰数据库和服务端内部模块
- `apps/admin` 只负责治理界面，不绕过请求层直连实现细节

额外提醒：

- `docs/tasks` 是共享路径，这份文档后续若再细分子任务，不要多人同时改同一份文件
- `packages/db`、`packages/schemas`、`packages/http-client`、`packages/shared` 都属于阶段级共享区，必须先锁定契约再分发前后端实现

## 8. 推荐交付顺序

1. 先做 T1，锁定评分、点评、治理的契约和路由常量
2. 再做 T2，落点评表、唯一约束和状态字段
3. 接着做 T3，先把服务端读写闭环和综合评分展示打通
4. 然后做 T4，把请求层调用统一起来
5. 再做 T5，把 Web 详情页的读展示和快速评分入口接上
6. 再做 T6，把后台最小治理闭环接上
7. 最后做 T7，补交付说明和验证口径

## 9. 推荐的下一步

把这份任务拆分交给 `planner`，并明确：

- 哪些任务必须单线程推进
- 哪些任务可以前后端并行
- 哪些验证必须在共享契约收口后再跑

