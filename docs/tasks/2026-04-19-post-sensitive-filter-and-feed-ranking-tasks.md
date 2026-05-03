# 2026-04-19 发布敏感词过滤与信息流推荐排序任务拆解

## 需求文档路径

- `docs/requirements/2026-04-19-post-sensitive-filter-and-feed-ranking-requirements.md`

## 任务概览

- 本轮核心范围收敛在 `apps/server/src/modules/posts/**` 与相关测试，不默认扩展到评论、搜索、独立推荐服务或管理端词库配置。
- 主线固定为“统一敏感词检测能力 -> 接入发布/更新入口 -> 明确推荐/最新/关注三类展示规则 -> 增强推荐排序实现 -> 补测试与实现文档 -> 根级验证”。
- 共享契约不是本轮主轴；只有在错误口径或返回模型确实需要时，才允许最小触达 `packages/schemas` / `packages/http-client` / `packages/shared`。
- 当前默认假设已经收敛：发布内容仅指帖子与官方文章；信息流仅指首页文章流与圈子动态流的三个 tab。

## 任务拆解列表

### TASK-PSFR-001

- 任务名：Posts 敏感词过滤服务基线
- 类型：后端
- 优先级：P0
- 完成标准：
  - 在 `apps/server` 内建立集中式敏感词检测能力，输入为标题/正文等文本字段，输出稳定的命中结果。
  - 支持统一文本归一化，避免简单大小写或空白分隔绕过。
  - 不引入数据库 schema、迁移、env 或 README 变更。
  - 提供独立单元测试覆盖命中、未命中、归一化场景。
- DDD 分类：required
- test_strategy：tdd
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：后端实现责任方
  - 允许修改：`apps/server/src/modules/posts/**`、`apps/server/tests/posts.test.ts`
  - 只读参考：`apps/server/src/modules/posts/posts.service.ts`、`apps/server/src/modules/posts/posts.route.ts`
  - 禁止事项：引入 `packages/db/**` 变更；在 route 层散落敏感词判断；把词库管理做成新后台能力

### TASK-PSFR-002

- 任务名：发布与更新入口接入敏感词过滤
- 类型：后端
- 优先级：P0
- 完成标准：
  - `createPost`、`updatePost`、`updateAdminOfficialArticle` 三个入口统一接入敏感词检测。
  - 命中后直接拒绝写入，返回稳定错误结果。
  - 已有图片/视频/封面/分类校验不回退、不弱化。
  - 服务层返回结果与 route 层错误映射保持集中，不新增第二套错误语义。
- DDD 分类：required
- test_strategy：tdd
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：后端实现责任方
  - 允许修改：`apps/server/src/modules/posts/posts.service.ts`、`apps/server/src/modules/posts/posts.route.ts`、`apps/server/tests/posts.test.ts`
  - 禁止事项：在多个 route 重复写文本检测逻辑；对前端契约做不必要扩散

### TASK-PSFR-003

- 任务名：推荐排序策略设计与 posts feed 规则收敛
- 类型：设计/后端
- 优先级：P0
- 完成标准：
  - 明确 `recommended/latest/following` 三类流规则。
  - 明确文章与动态各自的评分信号、权重倾向与兜底规则。
  - 仅使用当前 posts/feed 查询链路已能拿到的数据，不依赖数据库新增特征。
  - 输出可直接指导 `feed-recommendation.ts` 改造的策略结论。
- DDD 分类：not_required
- test_strategy：test_after
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：推荐算法设计责任方
  - 允许修改：设计文档、实现文档
  - 禁止事项：擅自扩大为搜索算法、召回服务、画像系统

### TASK-PSFR-004

- 任务名：推荐排序实现增强
- 类型：后端
- 优先级：P0
- 完成标准：
  - `recommended` 使用统一评分框架，文章与动态采用不同权重。
  - 至少纳入发布时间衰减、互动、作者关系、介质特征、基础质量信号。
  - `latest` 与 `following` 保持时间序，不被推荐权重污染。
  - 保持接口与现有 feed route 兼容，不新增前端必须适配的字段。
- DDD 分类：not_required
- test_strategy：test_after
- 风险任务：是
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：后端实现责任方
  - 允许修改：`apps/server/src/modules/posts/feed-recommendation.ts`、`apps/server/src/modules/posts/posts.service.ts`、`apps/server/tests/posts.test.ts`
  - 禁止事项：把排序逻辑下沉到前端；把 `latest/following` 改成不可解释的混排

### TASK-PSFR-005

- 任务名：回归验证与实现收口
- 类型：验证
- 优先级：P0
- 完成标准：
  - 补齐敏感词与推荐排序相关测试。
  - 输出 `docs/implementation` 说明本轮信号、限制与后续扩展点。
  - 运行根级 `bun run lint`、`bun run typecheck`、`bun run test`、`bun run build`。
  - 记录若干残余风险，但不以临时兼容分支掩盖问题。
- DDD 分类：not_required
- test_strategy：manual_only
- 风险任务：否
- 文件所有权 / 共享路径提醒：
  - 唯一责任方：主会话 / 收口责任方
  - 允许修改：本轮已触达文件与必要文档
  - 禁止事项：为过验证而顺手改无关模块

## 推荐交付顺序

1. `TASK-PSFR-001`
2. `TASK-PSFR-002`
3. `TASK-PSFR-003`
4. `TASK-PSFR-004`
5. `TASK-PSFR-005`

## 并行与串行策略

- 可并行：
  - `TASK-PSFR-003` 可以和 `TASK-PSFR-001` 并行启动，因为算法设计不依赖敏感词实现。
- 必须串行：
  - `TASK-PSFR-001 -> TASK-PSFR-002`
  - `TASK-PSFR-003 -> TASK-PSFR-004`
  - `TASK-PSFR-002 + TASK-PSFR-004 -> TASK-PSFR-005`

## 当前轮次建议

- 先由推荐算法设计子代理产出权重建议与分流规则。
- 同时由后端实现子代理完成敏感词服务基线与发布入口接入。
- 主会话在拿到算法设计结果后，合并到 `feed-recommendation.ts` 并完成最终验证。
