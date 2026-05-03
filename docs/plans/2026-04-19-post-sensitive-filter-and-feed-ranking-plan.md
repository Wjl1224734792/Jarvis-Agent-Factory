# 2026-04-19 发布内容敏感词过滤 + 首页文章流 / 圈子动态流推荐排序执行计划

## 需求文档路径

- `docs/requirements/2026-04-19-post-sensitive-filter-and-feed-ranking-requirements.md`

## 任务文档路径

- `docs/tasks/2026-04-19-post-sensitive-filter-and-feed-ranking-tasks.md`

## Gate B 检查结果

- `TASK-PSFR-001` 到 `TASK-PSFR-005` 均具备完整任务 ID、任务名称、类型、优先级、完成标准、DDD 分类、`test_strategy`、风险标记与文件所有权提醒。
- 任务文档已明确当前范围收敛在 `apps/server/src/modules/posts/**` 与相关测试，且默认不引入数据库 schema / migration。
- 任务文档已明确可并行主线为“敏感词服务/接入”和“推荐算法设计/排序实现”，但未直接指定共享热点文件收口责任方；本计划补充该约束。
- Gate B 通过，可以进入执行规划。

## 当前轮次目标

- 在 `apps/server` 内落地发布前敏感词过滤，覆盖帖子创建、帖子编辑与后台官方文章编辑三条写入链路。
- 在不改 `packages/*` 的默认前提下，收敛首页文章流与圈子动态流 `recommended / latest / following` 三类 tab 的可解释排序规则。
- 以最小正确 diff 完成实现、测试与交接文档，避免把规则散落到 route 层或前端。

## 当前轮次范围

- `apps/server/src/modules/posts/**`
- `apps/server/tests/**`
- `docs/implementation/**` 中与推荐排序设计 / 实现说明直接相关的文档
- 最终根级验证与必要的最小收口修复

## 完成标准

- `createPost`、`updatePost`、`updateAdminOfficialArticle` 均在服务层统一接入敏感词检测，命中后拒绝写入并返回稳定错误语义。
- `recommended` 使用统一评分框架完成文章流与动态流排序；`latest` 与 `following` 保持时间序和关注序，不被推荐权重污染。
- `posts.service.ts` 与 `posts.test.ts` 由单一责任方在同一串行合并泳道中收口，避免双代理并改。
- 本轮默认不修改 `packages/*`；若错误口径或接口契约确需扩展，必须先触发 plan patch / contract change request。
- 最终完成 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`，并补充本轮实现说明。

## 是否需要先查阅 repo_explorer / docs_researcher

- `repo_explorer`：当前不作为前置必需。需求、任务文档以及现有 `posts.service.ts`、`feed-recommendation.ts`、`posts.test.ts` 已足够支撑本轮规划。
- `docs_researcher`：当前不需要。本轮规则均基于仓内现有字段与业务口径，不依赖外部库新特性。
- 仅当 `TASK-PSFR-003` 无法确认 `postsRepo.listFeed` 已返回的候选特征，或 `TASK-PSFR-002` 发现现有 route 错误映射无法承载稳定错误口径时，再回退补做只读探索。

## 当前轮次任务包

- 本轮任务包覆盖 `TASK-PSFR-001` 到 `TASK-PSFR-005`，但执行上收敛为三条泳道：
  - 敏感词准备泳道：`TASK-PSFR-001`
  - 推荐设计泳道：`TASK-PSFR-003`
  - 共享热点收口泳道：`TASK-PSFR-002 -> TASK-PSFR-004`
- 最终验证与评审泳道为：`TASK-PSFR-005 -> review_qa`

## 执行代理分工

| 任务 | owner | 是否可并行 spawn | 说明 |
|------|-------|------------------|------|
| `TASK-PSFR-001` | `backend_implementer` | 是 | 只做敏感词服务基线与独立测试，不得触碰 `posts.service.ts` / `posts.test.ts` 热点 |
| `TASK-PSFR-003` | `backend_service_worker` | 是 | 只产出推荐排序策略与规则文档，为后续实现提供确定输入 |
| `TASK-PSFR-002` | `backend_implementer` | 否 | 共享热点收口责任方，负责把敏感词能力接入写链路 |
| `TASK-PSFR-004` | `backend_implementer` | 否 | 必须与 `TASK-PSFR-002` 由同一 `backend_implementer` 会话 / 工作区串行执行，完成排序实现与热点文件最终合并 |
| `TASK-PSFR-005` | 主会话 / `review_qa` | 否 | 非实现任务，待前四项完成后统一联调、验证、评审 |

## 共享区域改动归属

| 共享区域 | 唯一责任方 | 顺序要求 |
|----------|------------|----------|
| `apps/server/src/modules/posts/posts.service.ts` | `TASK-PSFR-002` / `TASK-PSFR-004` 的同一 `backend_implementer` 会话 | 严格串行，先接敏感词，再合并推荐排序相关改动 |
| `apps/server/tests/posts.test.ts` | `TASK-PSFR-002` / `TASK-PSFR-004` 的同一 `backend_implementer` 会话 | 严格串行，禁止 `TASK-PSFR-001` 与 `TASK-PSFR-003` 触碰 |
| `apps/server/src/modules/posts/posts.route.ts` | `TASK-PSFR-002` / `backend_implementer` | 仅用于稳定错误映射，不得顺手扩散业务规则 |
| `apps/server/src/modules/posts/feed-recommendation.ts` | `TASK-PSFR-004` / 同一热点收口责任方 | 必须先消费 `TASK-PSFR-003` 的策略结论，再进入实现 |
| `apps/server/src/modules/posts/**` 下新增敏感词检测文件 | `TASK-PSFR-001` / `backend_implementer` | 先独立落基线，再由 `TASK-PSFR-002` 消费 |
| `docs/implementation/2026-04-19-post-feed-ranking-strategy.md` | `TASK-PSFR-003` / `backend_service_worker` | 先出文档，再允许 `TASK-PSFR-004` 落代码 |
| `packages/**` | 本轮默认只读 | 若需变更，必须先发起 plan patch / contract change request |

## 并行 / 串行策略

### 总体波次

1. Wave 1 并行启动：
   - Lane S：`TASK-PSFR-001`
   - Lane R：`TASK-PSFR-003`
2. Wave 2 并行推进：
   - Lane S：`TASK-PSFR-002`（`TASK-PSFR-001` 完成后即可启动）
   - Lane R：`TASK-PSFR-003` 若尚未结束则继续完成
3. Wave 3 串行热点收口：
   - `TASK-PSFR-004`
4. Wave 4 收口：
   - `TASK-PSFR-005`
   - `review_qa`

### 为什么并行链路只到“准备完成”，热点文件必须串行

- 用户已明确 `posts.service.ts` 与 `posts.test.ts` 是共享热点文件。
- `TASK-PSFR-001` 可通过新增敏感词服务文件与独立测试文件先行完成，不需要改热点。
- `TASK-PSFR-003` 只输出推荐排序规则文档，也不需要改热点。
- 一旦进入写链路接入或 feed 排序真实落地，都会触碰 `posts.service.ts` 与 `posts.test.ts`；因此 `TASK-PSFR-002` 与 `TASK-PSFR-004` 必须由同一责任方在同一会话内串行执行。
- 结论是：可并行的是“两条主线的准备与输入收敛”，最终代码合并必须进入单一串行泳道。

### 串行顺序约束

- `TASK-PSFR-001 -> TASK-PSFR-002`
- `TASK-PSFR-003 -> TASK-PSFR-004`
- `TASK-PSFR-002 -> TASK-PSFR-004`
- `TASK-PSFR-002 + TASK-PSFR-004 -> TASK-PSFR-005`

## 风险提醒

- 风险 1：`posts.service.ts` 体量大、职责密集，若双代理并改，极易在发布链路、feed 链路与通知链路上相互覆盖。
- 风险 2：`posts.test.ts` 已承载较多集成场景；若敏感词与推荐排序分别插入测试，冲突概率高，且回归定位成本高。
- 风险 3：当前推荐仍是“候选集内重排”。如果现有 repo 查询返回的候选集过窄，推荐效果提升会受限，但这不构成本轮扩展召回层的理由。
- 风险 4：敏感词词库本轮默认以内置服务 / 本地配置落地。若实现中确认必须引入 DB、后台配置页或跨模块共享词库，已超出当前轮次。
- 风险 5：若稳定错误语义无法在 `apps/server` 内闭合，而必须升级 `@feijia/schemas` 或 `@feijia/http-client`，则本轮“默认不改 `packages/*`”前提失效，必须回编排者确认。

## 实现者交接信息

- 所有实现代理统一遵守：敏感词检测只允许集中在服务层，不允许在多个 route 分支复制判断。
- `latest` 与 `following` 的时间序 / 关注序是硬约束；任何推荐逻辑都不得影响这两个 tab。
- `TASK-PSFR-002` 与 `TASK-PSFR-004` 必须使用同一 `backend_implementer` 会话 / 工作区，保证 `posts.service.ts` 与 `posts.test.ts` 的唯一责任方成立。
- `TASK-PSFR-001` 若需要测试覆盖，应新增独立测试文件，不得提前改 `apps/server/tests/posts.test.ts`。
- `TASK-PSFR-003` 输出的规则文档必须明确：文章与动态的信号差异、权重倾向、同分兜底、不可改动的 tab 规则。
- `review_qa` 重点核查三件事：
  - 敏感词命中是否在三条写入链路上统一拒绝
  - `recommended` 是否变为可解释排序，而 `latest` / `following` 保持稳定
  - `packages/*` 是否被保持只读，若被改动是否存在正式的 patch 记录

## 每个任务的 Execution Packet

## Execution Packet

### task_id
TASK-PSFR-001

### task_name
Posts 敏感词过滤服务基线

### owner
backend_implementer

### objective
在 `apps/server` 内建立集中式敏感词检测能力与独立测试基线，为后续写链路接入提供单一可复用服务。

### in_scope
- 在 `apps/server/src/modules/posts/**` 中新增或收敛敏感词检测 / 归一化服务
- 支持标题、正文纯文本的统一检测输入
- 覆盖大小写、空白分隔等基础归一化场景
- 为该服务补独立测试文件，覆盖命中、未命中、归一化绕过场景
- 输出供 `TASK-PSFR-002` 直接消费的服务接口与错误结果约定

### out_of_scope
- 不修改 `apps/server/src/modules/posts/posts.service.ts`
- 不修改 `apps/server/src/modules/posts/posts.route.ts`
- 不修改 `apps/server/tests/posts.test.ts`
- 不修改 `packages/**`
- 不实现后台词库管理、DB 持久化或评论过滤

### input_documents
- requirements: `docs/requirements/2026-04-19-post-sensitive-filter-and-feed-ranking-requirements.md`
- tasks: `docs/tasks/2026-04-19-post-sensitive-filter-and-feed-ranking-tasks.md`
- plan: `docs/plans/2026-04-19-post-sensitive-filter-and-feed-ranking-plan.md`

### allowed_paths
- `apps/server/src/modules/posts/**`
- `apps/server/tests/**` 下新增的敏感词专用测试文件

### forbidden_paths
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/posts.route.ts`
- `apps/server/tests/posts.test.ts`
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `packages/**`
- 根配置文件

### dependencies
- 现有 `posts` 模块发布 / 编辑写入模型
- 任务文档确认的“只过滤帖子与官方文章标题 / 正文”范围

### acceptance_criteria
- 存在单一敏感词检测入口，可被 posts 服务层直接调用
- 检测逻辑对基础归一化绕过有覆盖
- 独立测试文件覆盖命中、未命中、归一化场景
- 不触碰共享热点文件与 `packages/*`

### test_strategy
tdd

### handoff_notes
- 向 `TASK-PSFR-002` 明确返回结果结构、错误枚举与调用方式
- 若发现仅靠 `apps/server` 无法表达稳定错误语义，必须停止并回编排者，不得直接改 `packages/*`

### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-PSFR-002

### task_name
发布与更新入口接入敏感词过滤

### owner
backend_implementer

### objective
把敏感词检测统一接入帖子创建、帖子编辑与后台官方文章编辑链路，并在服务层 / route 层维持稳定错误映射。

### in_scope
- 在 `createPost`、`updatePost`、`updateAdminOfficialArticle` 三个入口接入敏感词检测
- 保持图片、视频、封面、分类等现有校验逻辑不回退
- 在必要范围内调整 `posts.route.ts` 错误映射，使返回语义稳定
- 在 `apps/server/tests/posts.test.ts` 中补三条写链路的集成覆盖
- 作为共享热点责任方首次进入 `posts.service.ts` 与 `posts.test.ts`

### out_of_scope
- 不改推荐排序算法
- 不修改 `apps/server/src/modules/posts/feed-recommendation.ts`
- 不修改 `packages/**`
- 不扩展到评论敏感词过滤

### input_documents
- requirements: `docs/requirements/2026-04-19-post-sensitive-filter-and-feed-ranking-requirements.md`
- tasks: `docs/tasks/2026-04-19-post-sensitive-filter-and-feed-ranking-tasks.md`
- plan: `docs/plans/2026-04-19-post-sensitive-filter-and-feed-ranking-plan.md`

### allowed_paths
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/posts.route.ts`
- `apps/server/src/modules/posts/**` 中由 `TASK-PSFR-001` 新增的敏感词服务文件
- `apps/server/tests/posts.test.ts`

### forbidden_paths
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `packages/**`
- 根配置文件

### dependencies
- `TASK-PSFR-001` 已完成并冻结敏感词服务接口
- 现有 posts 发布 / 编辑接口与错误映射

### acceptance_criteria
- 三条写链路统一在服务层命中敏感词即拒绝写入
- route 层错误映射稳定，不出现第二套临时语义
- 现有媒体 / 分类 / 权限校验不回退
- `posts.service.ts` 与 `posts.test.ts` 的改动保持最小且可回归

### test_strategy
tdd

### handoff_notes
- 本任务完成后，当前 `backend_implementer` 会话继续保留，作为 `TASK-PSFR-004` 的唯一热点收口责任方
- 若接入过程中发现必须升级共享错误契约，立即停止并发起 plan patch

### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-PSFR-003

### task_name
推荐排序策略设计与规则收敛

### owner
backend_service_worker

### objective
基于现有 `posts` feed 候选特征，产出文章流与动态流的推荐排序策略文档，作为后续实现的唯一规则输入。

### in_scope
- 盘点 `recommended / latest / following` 三类 tab 的规则边界
- 明确文章流与动态流的评分信号、权重倾向与同分兜底规则
- 明确哪些信号来自现有 repo / service 输出，哪些不在本轮范围
- 输出实现导向型文档，直接指导 `feed-recommendation.ts` 改造

### out_of_scope
- 不修改 `apps/server/src/modules/posts/posts.service.ts`
- 不修改 `apps/server/src/modules/posts/feed-recommendation.ts`
- 不修改 `apps/server/tests/posts.test.ts`
- 不修改 `packages/**`
- 不扩展到搜索、召回层、画像系统或前端 UI

### input_documents
- requirements: `docs/requirements/2026-04-19-post-sensitive-filter-and-feed-ranking-requirements.md`
- tasks: `docs/tasks/2026-04-19-post-sensitive-filter-and-feed-ranking-tasks.md`
- plan: `docs/plans/2026-04-19-post-sensitive-filter-and-feed-ranking-plan.md`

### allowed_paths
- `docs/implementation/2026-04-19-post-feed-ranking-strategy.md`

### forbidden_paths
- `apps/server/src/modules/posts/**`
- `apps/server/tests/**`
- `packages/**`
- 根配置文件

### dependencies
- 现有 `feed-recommendation.ts` 的基础评分框架
- `posts.service.ts` 中 `listFeed` 已提供的候选特征

### acceptance_criteria
- 文档明确三类 tab 的规则边界，且把 `latest` / `following` 定义为不可被推荐权重污染
- 文档明确文章与动态的信号差异、权重倾向、同分兜底
- 文档仅使用当前候选集中可获得的特征，不偷渡 DB / schema 扩张
- `TASK-PSFR-004` 可直接据此实现，无需再次发明规则

### test_strategy
test_after

### handoff_notes
- 向 `TASK-PSFR-004` 明确必须保留的非目标改动边界，尤其是不要顺手改 `latest` / `following`
- 若设计阶段发现缺少必要特征字段，只记录缺口并回编排者，不得自行升级到 `packages/*`

### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-PSFR-004

### task_name
推荐排序实现增强

### owner
backend_implementer

### objective
基于已确认的排序策略，实现 `recommended` 排序增强，并在同一热点收口泳道中完成 `posts.service.ts` / `posts.test.ts` 最终合并。

### in_scope
- 按 `TASK-PSFR-003` 文档改造 `feed-recommendation.ts`
- 在 `posts.service.ts` 中保持 `recommended` 使用新排序，而 `latest` / `following` 继续保持原规则
- 在 `apps/server/tests/posts.test.ts` 中补推荐排序相关集成覆盖
- 必要时新增独立的排序单元测试文件
- 作为唯一热点责任方，完成 `posts.service.ts` 与 `posts.test.ts` 的最终合并收口

### out_of_scope
- 不重写 feed 查询入口
- 不修改敏感词服务基线的业务边界
- 不修改 `packages/**`
- 不扩展为搜索 / 召回 / 画像系统

### input_documents
- requirements: `docs/requirements/2026-04-19-post-sensitive-filter-and-feed-ranking-requirements.md`
- tasks: `docs/tasks/2026-04-19-post-sensitive-filter-and-feed-ranking-tasks.md`
- plan: `docs/plans/2026-04-19-post-sensitive-filter-and-feed-ranking-plan.md`
- analysis/research: `docs/implementation/2026-04-19-post-feed-ranking-strategy.md`

### allowed_paths
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/**` 下新增的推荐排序专用测试文件

### forbidden_paths
- `packages/**`
- 根配置文件

### dependencies
- `TASK-PSFR-003` 已提供稳定排序规则文档
- `TASK-PSFR-002` 已完成敏感词链路接入，并保持当前 `backend_implementer` 会话继续收口

### acceptance_criteria
- `recommended` 基于统一评分框架完成排序增强，文章与动态可采用不同权重倾向
- `latest` 与 `following` 不受推荐权重影响
- 同分兜底按发布时间倒序
- `posts.service.ts` 与 `posts.test.ts` 只由当前责任方完成最终合并，不存在第二实现代理并改

### test_strategy
test_after

### handoff_notes
- 本任务完成后由主会话直接进入 `TASK-PSFR-005`，不再开启第二个实现代理接触热点文件
- 若实现中发现排序规则必须反向修改 `TASK-PSFR-002` 已完成的敏感词逻辑，只允许当前会话在最小范围内自收口，不得新开并行代理

### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

## Execution Packet

### task_id
TASK-PSFR-005

### task_name
回归验证与实现收口

### owner
主会话 / review_qa

### objective
对敏感词过滤与 feed 排序增强进行统一联调、根级验证与评审收口。

### in_scope
- 执行 `bun run lint`
- 执行 `bun run typecheck`
- 执行 `bun run test`
- 执行 `bun run build`
- 进行创建 / 编辑 / 后台编辑的敏感词拒绝回归
- 进行文章流 / 动态流三类 tab 的排序规则人工核对
- 输出实现说明、残余风险与评审输入

### out_of_scope
- 不新增业务功能
- 不把联调问题转成无关重构
- 不绕过共享约束去直接改 `packages/*`

### input_documents
- requirements: `docs/requirements/2026-04-19-post-sensitive-filter-and-feed-ranking-requirements.md`
- tasks: `docs/tasks/2026-04-19-post-sensitive-filter-and-feed-ranking-tasks.md`
- plan: `docs/plans/2026-04-19-post-sensitive-filter-and-feed-ranking-plan.md`
- analysis/research: `docs/implementation/2026-04-19-post-feed-ranking-strategy.md`

### allowed_paths
- 本轮已触达路径中的最小阻塞修复
- `docs/implementation/**` 中必要的实现说明

### forbidden_paths
- 与本轮无关的模块
- 未经批准的 `packages/**`、数据库结构与根配置升级

### dependencies
- `TASK-PSFR-001` 到 `TASK-PSFR-004` 已完成
- `review_qa` 可获取测试结果与实现说明

### acceptance_criteria
- 根级验证命令执行完毕并记录结果
- 关键敏感词与排序场景完成回归或留下明确风险说明
- `review_qa` 可以直接依据 Execution Packet 与实现说明开展验收

### test_strategy
manual_only

### handoff_notes
- 评审重点是“服务层集中敏感词拦截”和“仅 `recommended` 变更、其他 tab 保持稳定”两条主线
- 若联调暴露共享契约缺口，优先回编排者，不接受临时在应用层打补丁

### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

## plan patch / contract change request 触发条件

- 触发条件 1：任一实现任务确认需要修改 `packages/schemas/**`、`packages/http-client/**`、`packages/shared/**` 才能表达稳定错误语义或排序结果契约。
- 触发条件 2：敏感词能力被确认必须引入数据库表、migration、seed、后台词库管理页或跨模块共享配置。
- 触发条件 3：推荐排序实现发现现有 feed 候选特征不足，且必须扩展 repo 查询、召回层或新增字段才能继续。
- 触发条件 4：有人提议让第二个实现代理并行修改 `apps/server/src/modules/posts/posts.service.ts` 或 `apps/server/tests/posts.test.ts`。
- 触发条件 5：需要修改根 `.env.example`、根 `README.md`、根脚本、根 TypeScript / Bun / Vite 配置。

## 推荐的下一步

1. 主会话并行 spawn：
   - `TASK-PSFR-001`
   - `TASK-PSFR-003`
2. `TASK-PSFR-001` 一完成，就可以 spawn 单一热点收口责任方执行 `TASK-PSFR-002`；此时 `TASK-PSFR-003` 可继续并行完成。
3. 等待 `TASK-PSFR-002` 与 `TASK-PSFR-003` 都完成后，在同一 `backend_implementer` 会话 / 工作区内继续串行执行 `TASK-PSFR-004`，不要重新开第二个实现代理。
4. 前四项完成后，由主会话执行 `TASK-PSFR-005` 并交给 `review_qa`。
