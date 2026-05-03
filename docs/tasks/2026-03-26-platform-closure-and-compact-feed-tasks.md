# 平台闭环、provider 抽象与紧凑信息流任务拆分

## 1. 需求文档路径

- [平台闭环与紧凑信息流需求收敛](/E:/CodeStore/feijia/docs/requirements/2026-03-26-platform-closure-and-compact-feed-requirements.md)

## 2. 任务概览

本轮不做新业务扩张，只收敛四件事：
- 让当前仓库的本地基础设施可以稳定跑通。
- 把 seed 数据生成和推送链路做成可重复执行的闭环。
- 把存储和短信从单实现/Mock 收敛到 provider 抽象。
- 把前端的信息流、榜单卡片和互动展示收紧到当前要求。

明确不做：
- 个人中心。
- 设置页展示。
- 完整推荐系统重做。
- 大规模结构重构。

## 3. 任务分解列表

| 任务 ID | 名称 | 类型 | 优先级 | test_strategy | 完成标准 |
|---|---|---|---|---|---|
| I1 | 本地基础设施闭环收敛 | test_after | P0 | `test_after` | `docker/database`、`docker/redis`、`docker/storage`、`packages/db` 的迁移与 seed、`apps/server` 的启动依赖形成可重复执行的本地闭环；能明确跑出“起服务 -> 迁移 -> seed -> 启动应用”的顺序。 |
| I2 | 弱模型辅助 seed 生成与灌库链路 | test_after | P0 | `test_after` | seed 生成的数据能覆盖 PostgreSQL，必要的示例媒体可推送到 MinIO，必要的示例初始化状态可写入 Redis；生成结果可重复执行，且不污染运行时真值。弱模型仅用于生成 seed 文案/示例素材，不进入产品运行时。 |
| I3 | 存储 provider 抽象与 S3 兼容配置 | DDD + TDD | P0 | `tdd` | `apps/server` / `packages/schemas` / `packages/shared` 形成统一的存储配置与 provider 抽象，至少支持 `COS`、`OSS`、`KODO`、`MinIO` 的配置解析与路径约定；现有上传调用不再直接绑定单一存储实现。 |
| I4 | 短信 provider 抽象与云厂商配置 | DDD + TDD | P0 | `tdd` | `apps/server` 形成统一短信 provider 抽象，至少覆盖阿里云和腾讯云的配置入口与发送调用约定；现有 mock 路径可以保留为开发兜底，但不再是唯一实现。 |
| I5 | 评论、评分、点赞、收藏、浏览量闭环 | DDD + TDD | P0 | `tdd` | 评论、评分、点赞、收藏、浏览量在后端和前端都形成可验证闭环；互动状态、计数、去重、刷新后的展示一致，且不会依赖前端临时推算替代真实状态。 |
| W1 | 首页右侧热门模块与整体信息流紧凑化 | 直接开发 | P0 | `test_after` | 首页右侧展示飞友圈热门 3 条、热门机型 3 条、热门榜单与图片模块；全站信息流密度收紧，首页、圈子、帖子详情、发布页的留白和卡片节奏统一收敛。 |
| W2 | 榜单页小卡片与详情/发布适配 | 直接开发 | P0 | `test_after` | 榜单页卡片宽度明显变小，卡片密度更高，详情页与发布页内容能在同一视觉语言下适配；不再出现“大卡片、松散排版”的展示。 |
| W3 | 隐藏个人中心与设置展示 | 直接开发 | P1 | `manual_only` | 个人中心和设置页不进入主展示闭环；路由、菜单与主要入口不再暴露这两类页面。 |

## 4. DDD 分类

### 必须 DDD

- I3 存储 provider 抽象与 S3 兼容配置
- I4 短信 provider 抽象与云厂商配置
- I5 评论、评分、点赞、收藏、浏览量闭环

原因：
- I3/I4 虽然偏基础设施，但已经是跨模块的共享能力，接口一旦不统一，后续会在多个应用里复制第二套实现。
- I5 直接涉及互动状态、计数一致性、去重和展示闭环，属于明确的领域规则收口。

### 不强制 DDD

- I1 本地基础设施闭环收敛
- I2 弱模型辅助 seed 生成与灌库链路
- W1 首页右侧热门模块与整体信息流紧凑化
- W2 榜单页小卡片与详情/发布适配
- W3 隐藏个人中心与设置展示

## 5. TDD 与直接开发分类

### 必须 TDD

- I3
- I4
- I5

原因：
- provider 解析、回退和配置键名属于高风险契约。
- 互动闭环涉及计数、去重、状态同步和刷新一致性，最容易被一次改动打断。

### 可以直接开发

- I1
- I2
- W1
- W2
- W3

## 6. 风险任务

- I1 是所有后续任务的前置，不先确认迁移和 seed 闭环，后面的 UI 验收没有稳定数据源。
- I2 需要同时兼顾 PostgreSQL、MinIO、Redis 三类输出，最容易出现“只灌了数据库，其他两端没落”的假完成。
- I3 如果把 S3 抽象做成一层空壳，后续接 COS/OSS/KODO 会变成二次重构。
- I4 如果只保留 mock 兜底，不补云厂商配置入口，短信链路仍然不是闭环。
- I5 是本轮最高风险业务收口，任何计数口径、去重规则、浏览量实现方式不一致，都会让页面展示失真。
- W1/W2 属于共享视觉密度调整，后续不要在多个页面各自定义不同的卡片节奏。

## 7. 文件所有权和共享路径提醒

以下区域必须单线程收敛，不要多人并行改同一份共享合约：

- `packages/db/src/schema.ts`
- `packages/db/src/seed.ts`
- `packages/db/drizzle/*`
- `packages/shared/src/index.ts`
- `packages/schemas/src/*`
- `packages/http-client/src/index.ts`
- `apps/server/src/app.ts`
- `apps/server/src/modules/*`
- `apps/web/src/app.tsx`
- `apps/web/src/features/auth/*`
- `apps/web/src/features/posts/*`
- `apps/web/src/routes/*`
- `docs/tasks/*`

边界提醒：
- `packages/db` 只收口表结构、迁移、种子和基础数据初始化，不扩展产品逻辑。
- `packages/shared` 只放路由常量和公共枚举，不放业务判断。
- `packages/schemas` 只放契约与校验，不放实现逻辑。
- `packages/http-client` 只做封装与错误映射，不做业务分支。
- `apps/server` 统一承载 provider、互动闭环和计数规则。
- `apps/web` 只负责展示与交互，不直连数据库和内部模块。

## 8. 推荐交付顺序

1. 先做 I1，确认基础设施闭环能稳定跑通。
2. 再做 I2，把 seed 生成和推送链路收口。
3. 接着做 I3 和 I4，先把存储与短信 provider 抽象立住。
4. 然后做 I5，把评论、评分、点赞、收藏、浏览量补齐。
5. 最后做 W1、W2、W3，完成前端紧凑化和展示收口。

## 9. 推荐的下一步

把这份拆分交给 `planner`，先确认：

- I1 -> I2 -> I3/I4 -> I5 -> W1/W2/W3 的执行顺序。
- 哪些任务可以并行，哪些共享路径必须单线程。
- 每个任务对应的最小验证命令和验收口径。
