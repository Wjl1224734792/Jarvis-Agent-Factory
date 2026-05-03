# 推荐/推流算法优化与侧边卡片规范化 -- 执行计划

## 输入文档

- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`

## 变更日志

| 日期 | 变更内容 | 原因 |
|------|---------|------|
| 2026-05-04 | 初始版本，覆盖全部 7 个 TASK 三批次执行 | 任务文档 Gate B 通过后首次落盘 |

---

## 1. Gate B 验证结果

| 检查项 | 状态 |
|--------|------|
| 任务 ID 完整（TASK-001 至 TASK-007） | 通过 |
| 每个 TASK 映射至少一个 REQ-XXX | 通过 |
| 类型完整（5 后端 + 1 前端 + 1 后端数据） | 通过 |
| 优先级完整（5 个 P1 + 2 个 P2） | 通过 |
| 完成标准完整 | 通过 |
| DDD 分类完整 | 通过 |
| TDD / 直接开发分类完整（5 TDD + 1 test_after + 1 manual_only） | 通过 |
| 风险任务已标注（4 个中风险，TASK-005 L 级变更） | 通过 |
| 文件所有权提醒已写明 | 通过 |
| 垂直切片策略满足（每个 TASK 是端到端完整功能） | 通过 |
| 无循环依赖 | 通过 |

**结论：任务文档满足 Gate B 全部条件，继续生成执行计划。**

---

## 2. 当前轮次目标

本轮次覆盖全部 7 个 TASK，分三个批次执行，交付以下能力：

1. 首页/飞友圈信息流接入多样性重排，降低同作者内容连续出现率（TASK-001）
2. 推荐评分公式权重可通过环境变量配置，不再硬编码（TASK-002）
3. 用户机型偏好信号引入推荐排序（TASK-003）
4. 热门机型评分多维丰富化（TASK-004）
5. 榜单热度排序从客户端迁移至服务端，支持 `sort=hot`（TASK-005）
6. 侧边推荐卡片统一为 `<= 3` 项规范，抽离可复用组件（TASK-006）
7. 推荐查询添加索引优化，P95 响应时间 <= 200ms（TASK-007）

**总预估变更行数：约 820 行（含测试代码），在一轮次合理范围内。**

---

## 3. 当前轮次范围

### 3.1 范围内

- 7 个 REQ 对应的全部功能实现
- 5 个 TDD 任务的新增单元测试文件
- 1 个 test_after 任务的组件测试
- 1 个 manual_only 任务的 EXPLAIN ANALYZE 分析与数据库迁移脚本
- 共享区域修改：`packages/schemas/src/rankings.ts`、`packages/db/src/schema.ts`

### 3.2 范围外

- 机器学习推荐模型、实时推荐管道、A/B 实验框架
- 管理后台推荐配置界面
- 不引入新第三方依赖
- 不修改现有数据库表列定义（仅新增索引）

---

## 4. 完成标准

- [ ] 全部 7 个 TASK 的 Acceptance Criteria 通过
- [ ] 5 个 TDD 任务：Red（测试先失败）-> Green（实现）-> Refactor 完整循环
- [ ] 总变更行数 <= 1000 行
- [ ] `npm run lint` / `npm run typecheck` 通过
- [ ] 所有单测 + 集成测试通过（`vitest run`）
- [ ] 共享区域 `packages/schemas/src/rankings.ts` 向后兼容（新增 `sort` 字段为可选）
- [ ] 共享区域 `packages/db/src/schema.ts` 仅新增索引定义，不修改现有列
- [ ] TASK-007 `EXPLAIN ANALYZE` 输出确认索引被使用

---

## 5. 共享区域唯一责任方

| 共享文件 | 唯一责任方 | 修改时机 | 风险等级 | 约束 |
|---------|-----------|---------|---------|------|
| `packages/schemas/src/rankings.ts` | TASK-005 | Batch 1 | 中 | 新增 `rowRankingsSortSchema` 校验，`sort` 字段可选；保持向后兼容，其他字段不变 |
| `packages/db/src/schema.ts` | TASK-007 | Batch 3 | 高 | 仅新增 Drizzle `index()` 定义，不修改任何列定义；需配套数据库迁移脚本 |
| `apps/server/src/modules/posts/posts.repo.ts` | TASK-002（首个修改者） | Batch 1 -> Batch 2 -> Batch 3 | 中 | 严格串行链：TASK-002 修改评分公式 -> TASK-003 添加偏好信号 -> TASK-007 性能微调 |
| `apps/web/src/routes/home-page.tsx` | TASK-005（首个修改者） | Batch 1 -> Batch 2 | 低 | 严格串行链：TASK-005 改造数据查询 -> TASK-006 提取 SidebarSection 组件 |

**禁止：任何代理将上述共享文件分配给两个并行执行的任务。违反者视为红线。**

---

## 6. 并行 / 串行策略

### 6.1 依赖关系总览

```
Batch 1（4 个任务无共享文件冲突，全部可并行）
  ├── TASK-001  接入多样性重排器          (独占 posts.service.ts, feed-recommendation.ts)
  ├── TASK-002  推荐评分公式权重可配置化   (独占 posts.repo.ts 首个修改权)
  ├── TASK-004  丰富热门机型评分维度      (独占 model-hot-score.ts, aircraft-models.*)
  └── TASK-005  榜单热度服务端化           (独占 rankings.*, ranking-score.ts; 共享 rankings.ts)
         │
         ├─── TASK-002 完成后 ──→ TASK-003  (posts.repo.ts 串行)
         │                        TASK-002 完成后 ──→ TASK-007  (等待 posts.repo.ts 稳定)
         │                        TASK-003 完成后 ──→ TASK-007
         │
         └─── TASK-005 完成后 ──→ TASK-006  (home-page.tsx 串行)

Batch 2（依赖 Batch 1 中 TASK-002 和 TASK-005 完成）
  ├── TASK-003  引入用户机型偏好信号      (可与 TASK-006 并行)
  └── TASK-006  侧边卡片统一规范           (可与 TASK-003 并行)

Batch 3（依赖 TASK-002 和 TASK-003 完成）
  └── TASK-007  推荐查询性能优化
```

### 6.2 并行组与串行链明细

**并行组 1（Batch 1）：**
- `[TASK-001, TASK-002, TASK-004, TASK-005]` 全部可并行
- 理由：四个任务修改的文件完全不重叠（见共享区域表），无共享文件冲突

**串行链 A：posts.repo.ts**
- `TASK-002 -> TASK-003 -> TASK-007`
- 理由：同一文件 `posts.repo.ts` 被三个任务修改，必须按顺序执行

**串行链 B：home-page.tsx**
- `TASK-005 -> TASK-006`
- 理由：同一文件 `home-page.tsx` 被两个任务修改，TASK-005 先改造数据查询，TASK-006 再提取组件

**并行组 2（Batch 2）：**
- `[TASK-003, TASK-006]` 可并行
- 理由：TASK-003 修改 `posts.repo.ts` 和 `users.repo.ts`（后端），TASK-006 修改 `home-page.tsx` 和新建 `sidebar-section.tsx`（前端），无共享文件冲突

**并行组 3（Batch 3）：**
- `[TASK-007]` 独立执行
- 理由：这是收尾性能优化任务，依赖前序所有查询变更完成

---

## 7. 风险提醒与缓解

### 7.1 高风险点

| 风险 | 等级 | 影响范围 | 缓解措施 |
|------|------|---------|---------|
| TASK-001 分页一致性漂移 | 中 | 首页/飞友圈翻页 | `recommendationNow` 时间戳固定时重排结果确定；游标编码含 score + timestamp |
| TASK-003 偏好查询增加延迟 | 中 | 推荐接口整体性能 | 偏好向量 Redis 缓存 + 每周异步更新；未登录用户直接跳过查询 |
| TASK-005 前后端热度分等效性 | 中 | 榜单排序一致性 | 后端实现后先用固定数据对比前端原算法输出；集成测试覆盖 |
| TASK-007 索引创建影响写入 | 中 | 生产环境写入吞吐 | `CREATE INDEX CONCURRENTLY`；staging 先验证；低峰期执行 |
| 评分公式变更排序效果退化 | 中 | 用户体验 | 保留旧公式逻辑可通过权重配置还原（互动权重=0.58 即为旧行为） |
| TASK-002 忘记同步 JS 版公式 | 中 | JS 重排器与 SQL 评分不一致 | TASK-002 明确要求同步更新 `feed-recommendation.ts` 中的硬编码值；由同一实现者负责 |

### 7.2 可能触发 Plan Patch 的条件

1. **TASK-005 修改 `rankings.ts` schema 时发现前后端类型不兼容** -> 需回主 Build Agent 协调契约变更
2. **TASK-002 修改 `posts.repo.ts` 后 TASK-003 发现 CTE 结构冲突** -> 需 plan patch 调整合并策略
3. **TASK-007 执行 `EXPLAIN ANALYZE` 后发现需额外索引或查询结构变更** -> 需 plan patch 扩展 scope
4. **TASK-005 前端清理 `rankings-page-helpers.ts` 时发现其他页面引用** -> 需 plan patch 扩大清理范围
5. **任意 TDD 任务测试编写阶段发现现有类型/接口不匹配** -> 标为 contract change，回主 Build Agent

---

## 8. 实现者交接信息

### 8.1 现有代码模式（实现前必读）

- **测试框架：** Vitest，配置文件 `vitest.config.ts`（项目根），测试命令：`cross-env NODE_ENV=test vitest run --root ../.. --config vitest.config.ts --maxWorkers 1 --testTimeout 30000 apps/server/tests`
- **测试文件位置：** `apps/server/tests/*.test.ts`
- **测试文件命名：** 与模块名对应，如 `feed-recommendation.test.ts`
- **现有参考测试：** `posts-recommended-window.test.ts`（推荐窗口相关），`rankings.test.ts`（榜单相关），`models.test.ts`（机型相关）
- **数据库 ORM：** Drizzle ORM，schema 定义在 `packages/db/src/schema.ts`
- **后端框架：** Hono，路由定义在 `*.route.ts`，服务逻辑在 `*.service.ts`
- **前端框架：** React + Vite + TanStack Query
- **评分公式 JS 版本：** `apps/server/src/modules/posts/feed-recommendation.ts` 中有完整的 JS 评分实现（与 SQL 版本对应）

### 8.2 关键代码关联

```
SQL 评分公式 (posts.repo.ts)
  ├── buildRecommendationFreshnessMultiplierExpression  ← 半衰期参数（TASK-002 修改）
  ├── buildRecommendedStaticBaseScoreExpression        ← 权重比 + 偏好信号（TASK-002/TASK-003 修改）
  └── buildUserModelPreferenceBoostExpression          ← TASK-003 新增

JS 评分公式 (feed-recommendation.ts)
  ├── buildFreshnessMultiplier                         ← 半衰期（TASK-002 必须同步修改）
  └── buildStaticFeedRecommendationScore               ← 权重比（TASK-002 必须同步修改）

多样性重排 (feed-recommendation.ts)
  ├── buildDiversityPenalty                            ← TASK-001 单元测试目标
  └── rankFeedItemsByRecommendation                     ← TASK-001 接入目标
```

### 8.3 实现顺序建议

对于 TASK-005（L 级 200 行），建议实现者按子步骤执行：

**TASK-005a（后端，约 130 行）：**
1. TDD Red：在 `apps/server/tests/ranking-hot-score.test.ts` 编写 `buildRankingHotScore` 测试
2. 在 `apps/server/src/modules/rankings/ranking-score.ts` 新增 `buildRankingHotScore` 和 `sortRankingsByHotScore` 函数
3. TDD Green：实现通过测试
4. 在 `packages/schemas/src/rankings.ts` 新增 `rankingsSortSchema`（共享区域，审慎修改）
5. 在 `rankings.service.ts` 的 `listRankings` 方法添加 `sort` 参数支持
6. 用 curl 验证 `GET /api/v1/rankings?sort=hot` 返回正确热度排序
7. TDD Refactor：代码清理

**TASK-005b（前端，约 70 行）：**
1. 修改 `apps/web/src/routes/home-page.tsx` 中 `rankingsQuery`，使用 `sort=hot&limit=3`，移除客户端热度排序
2. 修改 `apps/web/src/routes/rankings-page.tsx`，添加排序切换支持
3. 删除 `apps/web/src/routes/rankings-page-helpers.ts` 中 `buildRankingHotScore` 函数及 `.hot` 排序分支
4. 验证前后端联调正确

---

## 9. Execution Packets

---

### task_id: TASK-001
### task_name: 接入多样性重排器
### requirement_ids: REQ-001
### owner: backend-service-worker
### objective: 在首页和飞友圈推荐信息流中接入已有 JS 多样性重排器，降低连续同作者/同分类内容出现频率
### in_scope:
- 修改 `posts.service.ts` 的 `listFeed` 方法，在 `serializePostListItem` 之前调用 `rankFeedItemsByRecommendation`
- 将 SQL 预计算的 `recommendationBaseScore` 传入 `precomputedBaseScores` 参数
- 确保重排后 `lastItem` 取重排后的最后一项编码游标
- 可能需要调整 `FeedRecommendationItem` 类型以匹配 SQL 返回结构
- 单元测试覆盖 `buildDiversityPenalty` 和 `rankFeedItemsByRecommendation`
### out_of_scope:
- 修改 `buildDiversityPenalty` 惩罚系数（保持现有值）
- 修改 `buildStaticFeedRecommendationScore` 评分公式（那是 TASK-002 的范围）
- 前端页面改动
### input_documents:
- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`
- 现有代码：`apps/server/src/modules/posts/feed-recommendation.ts`（重排器实现）
- 现有代码：`apps/server/src/modules/posts/posts.service.ts`（接入点）
### allowed_paths:
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/tests/feed-recommendation.test.ts`（新建）
### forbidden_paths:
- `apps/server/src/modules/posts/posts.repo.ts`（TASK-002/TASK-003/TASK-007 的共享区域）
- `apps/server/src/modules/rankings/*`
- `apps/server/src/modules/aircraft-models/*`
- `apps/server/src/modules/users/*`
- `packages/*`
- `apps/web/*`
### dependencies: 无外部依赖
### parallel_group: TASK-002, TASK-004, TASK-005（Batch 1）
### wait_for: 无
### acceptance_criteria:
- [ ] `posts.service.ts` 的 `listFeed` 方法在 `tab=recommended` 时调用 `rankFeedItemsByRecommendation`
- [ ] `rankFeedItemsByRecommendation` 使用 SQL 预计算的 `recommendationBaseScore` 作为 `precomputedBaseScores`
- [ ] 重排发生在 `serializePostListItem` 之前
- [ ] 重排后 `lastItem` 基于重排后最后一项编码游标
- [ ] 分页一致性：同一游标位置固定 `recommendationNow` 时返回相同帖子
- [ ] 单元测试覆盖：空已选列表 penalty=0、连续同作者 penalty 递增、连续同分类 penalty、同作者+同分类叠加、无 author.id 或无 category.slug 边界
- [ ] 单元测试：输入 10 个 item（含同作者/同分类）验证重排后顺序合理
### test_strategy: tdd
### handoff_notes: 现有的 `feed-recommendation.ts` 中 JS 评分公式硬编码了半衰期和权重值。TASK-002 会将这些改为环境变量配置。TASK-001 不应修改这些值，只需接入重排器。重排器需要从 SQL 端拿到 `recommendationBaseScore` 值，确认 `posts.repo.ts` 中该字段已计算。
### escalation_rule: 如需修改 `FeedRecommendationItem` 类型导致 `posts.repo.ts` 或 `posts-presenters.ts` 需要联动修改，必须先回主 Build Agent 协调，不得直接修改共享文件。

---

### task_id: TASK-002
### task_name: 推荐评分公式权重可配置化
### requirement_ids: REQ-002
### owner: backend-service-worker
### objective: 将推荐评分公式中的半衰期和权重比从硬编码改为环境变量可配置，并同步更新 JS 版本公式
### in_scope:
- 修改 `posts.repo.ts` 中 `buildRecommendationFreshnessMultiplierExpression`，半衰期参数从环境变量读取
- 修改 `posts.repo.ts` 中 `buildRecommendedStaticBaseScoreExpression`，权重比从环境变量读取
- 修改 `feed-recommendation.ts` 中 `buildFreshnessMultiplier` 和 `buildStaticFeedRecommendationScore`，同步更新硬编码值
- 模块顶层解析并缓存环境变量值
- 环境变量：`RECOMMENDATION_ARTICLE_HALFLIFE_HOURS`（默认 36）、`RECOMMENDATION_MOMENT_HALFLIFE_HOURS`（默认 18）、`RECOMMENDATION_INTERACTION_WEIGHT`（范围 0.3-0.8，默认 0.58）
### out_of_scope:
- 修改评分公式的因子组成（不新增/删除评分维度）
- 修改 `buildDiversityPenalty` 相关内容
- 数据库结构变更
### input_documents:
- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`
- 现有代码：`apps/server/src/modules/posts/posts.repo.ts`（SQL 评分公式）
- 现有代码：`apps/server/src/modules/posts/feed-recommendation.ts`（JS 评分公式）
### allowed_paths:
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/tests/posts-recommendation-score.test.ts`（新建）
### forbidden_paths:
- `apps/server/src/modules/posts/posts.service.ts`（TASK-001 独占）
- `apps/server/src/modules/rankings/*`
- `apps/server/src/modules/aircraft-models/*`
- `apps/server/src/modules/users/*`
- `packages/*`
- `apps/web/*`
### dependencies: 无外部依赖
### parallel_group: TASK-001, TASK-004, TASK-005（Batch 1）
### wait_for: 无
### acceptance_criteria:
- [ ] `buildRecommendationFreshnessMultiplierExpression` 半衰期从环境变量读取，文章默认 36h，动态默认 18h
- [ ] `buildRecommendedStaticBaseScoreExpression` 权重比从 `RECOMMENDATION_INTERACTION_WEIGHT` 读取，默认 0.58
- [ ] `feed-recommendation.ts` 中 JS 版本的 `buildFreshnessMultiplier` 同步读取环境变量（与 SQL 一致）
- [ ] `feed-recommendation.ts` 中 JS 版本的 `freshnessAdjustedInteraction` 公式同步使用配置的权重比
- [ ] 配置变量在模块顶层解析缓存，不每次构建 SQL 时重复读 `process.env`
- [ ] 未设置环境变量时使用默认值，行为与旧硬编码一致
- [ ] 单元测试覆盖：默认值一致性、半衰期缩短后旧帖分值下降更快、互动权重提高后高互动旧帖分值相对提升、极端边界值
### test_strategy: tdd
### handoff_notes: 这是 `posts.repo.ts` 的**首个修改者**，后续 TASK-003 和 TASK-007 都依赖此修改结果。务必确保评分公式结构清晰，函数签名稳定，便于后续任务在之上叠加逻辑。JS 版本公式同步是易遗漏点，必须在验收时检查。
### escalation_rule: 如需改变 `buildRecommendationFreshnessMultiplierExpression` 的函数签名（影响 SQL 生成方式），必须先回主 Build Agent 评估对 TASK-003 的影响。

---

### task_id: TASK-003
### task_name: 引入用户机型偏好信号
### requirement_ids: REQ-003
### owner: backend-service-worker
### objective: 基于用户机型浏览/收藏/评论记录计算偏好向量，在推荐排序中给予匹配机型帖子小幅加分
### in_scope:
- 在 `users.repo.ts` 新增用户近 30 天机型偏好查询方法
- 在 `posts.repo.ts` 新增 `buildUserModelPreferenceBoostExpression` SQL 表达式
- 偏好加成仅影响 `tab=recommended` Feed
- 未登录用户偏好加成默认为 0
- 偏好权重可通过 `RECOMMENDATION_PREFERENCE_BOOST_WEIGHT` 环境变量配置（默认 5）
- 异步更新逻辑在 `users.service.ts` 中实现（每周一次）
### out_of_scope:
- 修改 `buildRecommendedStaticBaseScoreExpression` 的结构（那是 TASK-002 的范围）
- 实时计算偏好向量（需求明确要求异步）
- Redis 缓存实现（可选，不作为强制要求；如查询性能可接受则跳过）
### input_documents:
- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`
- 现有代码：`apps/server/src/modules/posts/posts.repo.ts`（在 TASK-002 修改后的基础上叠加）
- 现有代码：`apps/server/src/modules/users/users.repo.ts`
- 现有代码：`apps/server/src/modules/users/users.service.ts`
### allowed_paths:
- `apps/server/src/modules/posts/posts.repo.ts`
- `apps/server/src/modules/users/users.repo.ts`
- `apps/server/src/modules/users/users.service.ts`
- `apps/server/tests/user-model-preference.test.ts`（新建）
### forbidden_paths:
- `apps/server/src/modules/posts/posts.service.ts`（TASK-001 独占）
- `apps/server/src/modules/posts/feed-recommendation.ts`（TASK-001/TASK-002 共享）
- `apps/server/src/modules/rankings/*`
- `apps/server/src/modules/aircraft-models/*`
- `packages/*`
- `apps/web/*`
### dependencies: TASK-002（`posts.repo.ts` 的评分公式结构调整）
### parallel_group: TASK-006（Batch 2）
### wait_for: TASK-002
### acceptance_criteria:
- [ ] `users.repo.ts` 新增方法：查询用户近 30 天机型浏览/收藏/评论记录，按机型 ID 聚合频次
- [ ] `posts.repo.ts` 新增 `buildUserModelPreferenceBoostExpression`，通过帖子机型关联匹配用户偏好
- [ ] 偏好信号仅影响 `tab=recommended` Feed
- [ ] 未登录用户不产生偏好查询，加成默认为 0
- [ ] 无关联机型的帖子不受影响
- [ ] 偏好权重可通过 `RECOMMENDATION_PREFERENCE_BOOST_WEIGHT` 环境变量配置
- [ ] 异步更新逻辑在 `users.service.ts` 中实现，不阻塞 Feed 请求
- [ ] 单元测试覆盖：有偏好用户帖子获得加分、未登录无加分、权重可配置
### test_strategy: tdd
### handoff_notes: 在 TASK-002 基础上叠加，确保 SQL CTE 结构不受破坏。偏好表达式应为独立加分项，与 `recommendationBaseScore` 并行计算。注意：如果 `post_aircraft_links` 表不存在或结构不同，需先确认实际的帖子-机型关联方式。
### escalation_rule: 如需修改 `posts.repo.ts` 中 TASK-002 已修改的函数签名或 CTE 结构，必须先回主 Build Agent 评估是否破坏 TASK-002 的成果。

---

### task_id: TASK-004
### task_name: 丰富热门机型评分维度
### requirement_ids: REQ-004
### owner: backend-service-worker
### objective: 扩展 `buildModelHotScore` 函数，引入浏览热度、搜索频次、榜单引用次数等新评分维度
### in_scope:
- 扩展 `ModelHotSeed` 类型，新增可选字段：`recentViewCount`、`recentSearchCount`、`rankingReferenceCount`
- 修改 `buildModelHotScore` 公式，加入新因子
- 在 `aircraft-models.repo.ts` 新增批量查询方法获取新维度数据
- 修改 `aircraft-models.service.ts` 的 `listModels` 方法，传递新维度数据
- 新因子权重通过环境变量可配置
### out_of_scope:
- 新增数据库字段（使用现有表做聚合查询）
- 修改前端机型列表页面
- 修改 `sortModelsByHotScore` 的排序逻辑（只改评分函数）
### input_documents:
- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`
- 现有代码：`apps/server/src/modules/aircraft-models/model-hot-score.ts`
- 现有代码：`apps/server/src/modules/aircraft-models/aircraft-models.repo.ts`
- 现有代码：`apps/server/src/modules/aircraft-models/aircraft-models.service.ts`
### allowed_paths:
- `apps/server/src/modules/aircraft-models/model-hot-score.ts`
- `apps/server/src/modules/aircraft-models/aircraft-models.repo.ts`
- `apps/server/src/modules/aircraft-models/aircraft-models.service.ts`
- `apps/server/tests/model-hot-score.test.ts`（新建）
### forbidden_paths:
- `apps/server/src/modules/posts/*`
- `apps/server/src/modules/rankings/*`
- `apps/server/src/modules/users/*`
- `packages/*`
- `apps/web/*`
### dependencies: 无外部依赖
### parallel_group: TASK-001, TASK-002, TASK-005（Batch 1）
### wait_for: 无
### acceptance_criteria:
- [ ] `ModelHotSeed` 扩展为 `interface`，新增 3 个可选字段（默认 0）
- [ ] `buildModelHotScore` 公式包含新因子：`recentViewCount * W_view + recentSearchCount * W_search + rankingReferenceCount * W_ranking_ref`
- [ ] 原有因子保留不变：`favoriteCount*4 + commentCount*3 + reviewCount*2 + freshnessSignal`
- [ ] 新因子权重可通过环境变量配置（默认：`MODEL_HOT_VIEW_WEIGHT=0.5`, `MODEL_HOT_SEARCH_WEIGHT=2.0`, `MODEL_HOT_RANKING_REF_WEIGHT=8.0`）
- [ ] `aircraft-models.repo.ts` 提供批量查询新维度数据的方法
- [ ] `aircraft-models.service.ts` 的 `listModels` 在 `tab=recommended` 时传递新维度数据
- [ ] 向后兼容：传入无新字段的旧 `ModelHotSeed` 时，新因子默认为 0
- [ ] 单元测试覆盖：高热度机型得分高于低热度、权重可独立配置、向后兼容
### test_strategy: tdd
### handoff_notes: `ModelHotSeed` 当前为 `type`，按照规范需要转为 `interface`（扩展对象形状）。新字段全部可选（`?:`）以保证向后兼容。如数据库暂无浏览/搜索统计字段，需要从 `posts` 表或相关日志表做聚合查询。
### escalation_rule: 如需新增数据库表或列来存储浏览/搜索统计，必须先回主 Build Agent 评估影响（需要 TASK-007 级别的 schema 变更）。

---

### task_id: TASK-005
### task_name: 榜单热度服务端化
### requirement_ids: REQ-005
### owner: backend-service-worker（TASK-005a 后端）+ frontend-implementer（TASK-005b 前端）
### objective: 将前端热度计算逻辑迁移至服务端，支持 `GET /api/v1/rankings?sort=hot` 参数
### in_scope:
- **TASK-005a（后端，约 130 行）：**
  - 在 `ranking-score.ts` 新增 `buildRankingHotScore` 和 `sortRankingsByHotScore` 函数
  - 在 `rankings.service.ts` 添加 `sort` 参数支持
  - 在 `packages/schemas/src/rankings.ts` 新增 `rankingsSortSchema`
- **TASK-005b（前端，约 70 行）：**
  - 修改 `home-page.tsx` 中 `rankingsQuery` 使用 `sort=hot&limit=3`
  - 修改 `rankings-page.tsx` 支持排序切换
  - 删除 `rankings-page-helpers.ts` 中的 `buildRankingHotScore` 和 `.hot` 排序分支
### out_of_scope:
- 修改榜单数据表结构
- 新增 `rankings.repo.ts` 查询方法（服务端排序在内存完成）
- 修改 `rankings.route.ts` 的路径结构
### input_documents:
- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`
- 现有代码：`apps/server/src/modules/rankings/ranking-score.ts`
- 现有代码：`apps/server/src/modules/rankings/rankings.service.ts`
- 现有代码：`packages/schemas/src/rankings.ts`
- 现有代码：`apps/web/src/routes/home-page.tsx`
- 现有代码：`apps/web/src/routes/rankings-page.tsx`
- 现有代码：`apps/web/src/routes/rankings-page-helpers.ts`
### allowed_paths:
- `apps/server/src/modules/rankings/ranking-score.ts`
- `apps/server/src/modules/rankings/rankings.service.ts`
- `packages/schemas/src/rankings.ts`
- `apps/server/tests/ranking-hot-score.test.ts`（新建）
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/routes/rankings-page.tsx`
- `apps/web/src/routes/rankings-page-helpers.ts`
### forbidden_paths:
- `apps/server/src/modules/rankings/rankings.repo.ts`（避免不必要的 repo 修改）
- `apps/server/src/modules/rankings/rankings.route.ts`（路由已有 query 参数解析，无需修改）
- `apps/server/src/modules/posts/*`
- `apps/server/src/modules/aircraft-models/*`
- `packages/db/src/schema.ts`（TASK-007 的共享区域）
- `apps/web/src/components/sidebar-section.tsx`（TASK-006 独占）
### dependencies:
- 无外部依赖（Batch 1 可并行启动）
- 后端子步骤 TASK-005a 先于前端子步骤 TASK-005b
### parallel_group: TASK-001, TASK-002, TASK-004（Batch 1）
### wait_for: 无（但 TASK-005a 需在 TASK-005b 之前完成）
### acceptance_criteria:
- [ ] `buildRankingHotScore` 算法与前端原实现一致：`score = averageScore*12 + totalRatings*0.85 + commentCount*3.4 + itemCount*1.8 + max(0, 72 - hoursSinceCreation) + (type==="official" ? 4 : 0)`
- [ ] `GET /api/v1/rankings?sort=hot` 返回按热度降序的榜单列表
- [ ] `sort` 默认值为 `"latest"`，保持向后兼容
- [ ] `rankingsSortSchema` 校验 `sort` 参数，拒绝非法值
- [ ] official 和 community 分组各自按热度降序排列
- [ ] 首页侧边栏使用 `sort=hot&limit=3` 获取热门榜单
- [ ] `rankings-page.tsx` 支持 `sort=hot` / `sort=latest` 切换
- [ ] `rankings-page-helpers.ts` 中 `buildRankingHotScore` 函数已删除
- [ ] `mergeRankingsByTab` 中 `.hot` 分支已移除
- [ ] 单元测试：与前端原算法输出一致、官方/社区加成差异、新鲜度边界
### test_strategy: tdd（后端评分函数）+ test_after（前端集成）
### handoff_notes: 这是一个 200 行的 L 级任务，按 TASK-005a（后端）-> TASK-005b（前端）顺序执行。`packages/schemas/src/rankings.ts` 是共享区域，修改时必须保持向后兼容——`sort` 字段为可选，默认 `"latest"`。`rankings.service.ts` 是一个 58KB 的大文件，改动需聚焦在 `listRankings` 方法周边，避免触碰无关代码。
### escalation_rule: 如需修改 `rankings.repo.ts` 的 SQL 查询或 `rankings.route.ts` 的路由路径来支持 `sort` 参数，必须先回主 Build Agent 评估对其他模块的影响。

---

### task_id: TASK-006
### task_name: 侧边卡片统一规范
### requirement_ids: REQ-006
### owner: frontend-implementer
### objective: 创建统一的 `SidebarSection` 组件，封装最大 3 项截断逻辑，重构首页侧边面板
### in_scope:
- 新建 `apps/web/src/components/sidebar-section.tsx` 组件
- 重构 `home-page.tsx` 中 `HomeRailPanels` 使用 `SidebarSection`
- 组件 Props：`title`, `icon`, `items`, `maxItems?`（默认 3）, `renderItem`, `isLoading?`, `skeletonCount?`
- 内部执行 `items.slice(0, maxItems)`，上层调用者无需手动截断
- 骨架屏支持（`isLoading` 态）
### out_of_scope:
- 修改 TASK-005 已经设定的 `sort=hot&limit=3` 查询参数
- 在其他页面添加侧边推荐卡片（只提供组件，不实际接入）
- 引入新的 UI 依赖库
### input_documents:
- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`
- 现有代码：`apps/web/src/routes/home-page.tsx`（TASK-005 改造后状态）
- 现有代码：`apps/web/src/components/site-shell.tsx`（可能调整布局）
### allowed_paths:
- `apps/web/src/components/sidebar-section.tsx`（新建）
- `apps/web/src/routes/home-page.tsx`
- `apps/web/src/components/site-shell.tsx`
### forbidden_paths:
- `apps/web/src/routes/rankings-page.tsx`（TASK-005 独占）
- `apps/web/src/routes/rankings-page-helpers.ts`（TASK-005 独占）
- `apps/server/*`（纯前端任务）
- `packages/*`
### dependencies: TASK-005（`home-page.tsx` 的数据查询改造）
### parallel_group: TASK-003（Batch 2）
### wait_for: TASK-005
### acceptance_criteria:
- [ ] `SidebarSection` 组件 Props 定义为 `interface`
- [ ] `maxItems` 默认值 3，内部自动截断
- [ ] `HomeRailPanels` 重构为使用 `SidebarSection` 渲染热门榜单和热门机型面板
- [ ] 热门榜单查询参数为 `sort=hot&limit=3`（TASK-005 已设定）
- [ ] 热门机型查询参数为 `limit=3`（现有代码已符合）
- [ ] `isLoading` 态渲染骨架屏
- [ ] Tailwind CSS 使用内联类名，禁止 `@apply`
- [ ] 组件可被其他页面复用（导出为命名导出）
### test_strategy: test_after
### handoff_notes: 此任务依赖 TASK-005 完成后 `home-page.tsx` 中查询参数已改为 `sort=hot&limit=3`。组件 Props 使用 `interface` 定义，遵循 TypeScript 规范。样式使用 Tailwind CSS 内联类名。组件的 `renderItem` 使用泛型支持不同类型的列表项。
### escalation_rule: 如需修改 `packages/http-client` 中的查询方法签名来适配组件，必须先回主 Build Agent 评估影响范围。

---

### task_id: TASK-007
### task_name: 推荐查询性能优化
### requirement_ids: REQ-007
### owner: backend-data-worker
### objective: 对推荐相关 SQL 查询做 EXPLAIN ANALYZE 分析，添加索引，确保 P95 延迟 <= 200ms
### in_scope:
- 对 `listFeed`（recommended/following）、`listModels`（sort=hot）、`listRankings`（sort=hot）执行 EXPLAIN ANALYZE
- 在 `packages/db/src/schema.ts` 新增索引定义
- 创建数据库迁移脚本
- 可能微调 `posts.repo.ts` 中的 CTE 查询结构或添加查询提示
### out_of_scope:
- 引入物化视图或定时预计算（仅在索引优化不达标时考虑）
- 修改数据库表列定义
- 引入新的缓存层（Redis 缓存性能优化是 TASK-003 的可选项）
### input_documents:
- 需求文档：`docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-feed-recommendation-algorithm-optimization-tasks.md`
- 现有代码：`apps/server/src/modules/posts/posts.repo.ts`（TASK-002 + TASK-003 修改后的最终状态）
- 现有代码：`packages/db/src/schema.ts`
### allowed_paths:
- `apps/server/src/modules/posts/posts.repo.ts`
- `packages/db/src/schema.ts`
- 数据库迁移脚本（按项目规范路径创建）
### forbidden_paths:
- `apps/server/src/modules/posts/posts.service.ts`（TASK-001 独占）
- `apps/server/src/modules/posts/feed-recommendation.ts`（TASK-001/TASK-002 共享）
- `apps/server/src/modules/rankings/*`
- `apps/server/src/modules/aircraft-models/*`
- `apps/web/*`
- `packages/schemas/*`
### dependencies: TASK-002、TASK-003（查询结构变更完成后才能做最终性能分析）
### parallel_group: 无（Batch 3，独立执行）
### wait_for: TASK-002, TASK-003
### acceptance_criteria:
- [ ] `listFeed`（recommended）EXPLAIN ANALYZE 确认使用索引，无全表扫描
- [ ] `listFeed`（following）EXPLAIN ANALYZE 确认 JOIN 查询计划合理
- [ ] `listModels`（sort=hot）EXPLAIN ANALYZE 确认排序使用索引
- [ ] `listRankings`（sort=hot）EXPLAIN ANALYZE 确认查询计划合理
- [ ] 首页 Feed 推荐 Tab P95 <= 200ms（>=100 次请求样本）
- [ ] 飞友圈 Feed 推荐 Tab P95 <= 200ms
- [ ] 飞行器列表推荐 Tab P95 <= 200ms
- [ ] 榜单列表 sort=hot P95 <= 200ms
- [ ] 数据库迁移脚本包含 `CREATE INDEX` 语句
### test_strategy: manual_only
### handoff_notes: 这是收尾性能优化任务。必须在所有查询逻辑变更完成后执行（TASK-002 和 TASK-003 完成后再分析）。`packages/db/src/schema.ts` 是高风险共享区域，只允许新增 `index()` 调用，不准修改列定义。若索引优化后 P95 仍不达标，记录为已知限制并回主 Build Agent。
### escalation_rule: 如需创建物化视图、修改数据库列定义、或引入 pg_hint_plan 等扩展，必须先回主 Build Agent 评估方案。索引优化后 P95 仍不达标时，停止并标记为 plan patch 触发条件。

---

## 10. parallel_batches

### Batch 1（无依赖，可同时启动）

- **TASK-001** -> subagent_type: backend-service-worker
- **TASK-002** -> subagent_type: backend-service-worker
- **TASK-004** -> subagent_type: backend-service-worker
- **TASK-005** -> subagent_type: backend-service-worker（TASK-005a 后端）-> frontend-implementer（TASK-005b 前端，同任务内按序执行）

**说明：** 四个任务修改的文件完全不重叠。TASK-005 由同一实现者先执行后端子步骤 005a，完成后继续执行前端子步骤 005b。TASK-005a 和 TASK-005b 由同一 agent 顺序执行，不需要拆分为两个批次。

### Batch 2（依赖 Batch 1 中 TASK-002 和 TASK-005 完成）

- **TASK-003** -> subagent_type: backend-service-worker
- **TASK-006** -> subagent_type: frontend-implementer

**说明：** TASK-003 依赖 TASK-002 完成的 `posts.repo.ts` 状态；TASK-006 依赖 TASK-005 完成的 `home-page.tsx` 状态。两个任务间无共享文件冲突，可并行。

### Batch 3（依赖 Batch 1 TASK-002 和 Batch 2 TASK-003 完成）

- **TASK-007** -> subagent_type: backend-data-worker

**说明：** 在所有查询逻辑变更完成后，针对最终 SQL 做性能分析和索引优化。独立执行，无并行任务。

---

## 11. plan patch / contract change request 触发条件

| 触发条件 | 响应 |
|---------|------|
| TASK-002 修改 `posts.repo.ts` 后，TASK-003 发现 CTE 结构与预期不兼容 | 回主 Build Agent，plan patch 调整 TASK-003 的实现方案 |
| TASK-005 修改 `rankings.ts` schema 后发现前后端类型不一致 | 回主 Build Agent 协调契约变更，同步更新 HTTP 客户端类型 |
| TASK-007 `EXPLAIN ANALYZE` 后 P95 仍不达标 | 回主 Build Agent，plan patch 评估物化视图/预计算等替代方案 |
| TASK-005b 清理 `rankings-page-helpers.ts` 时发现其他文件引用 `buildRankingHotScore` | 回主 Build Agent，plan patch 扩大清理范围 |
| 任意 TDD 测试编写阶段发现现有接口/类型不匹配 | 标为 contract change，回主 Build Agent |
| Batch 1 任一任务失败需要回滚 | 该批次其他任务不受影响（无共享文件），失败任务单独修复后重新提交 |

---

## 12. 推荐的下一步

1. 主 Build Agent 审核本执行计划，确认 parallel_batches 安排合理
2. 启动 **Batch 1**：同时 spawn 4 个 agent 执行 TASK-001、TASK-002、TASK-004、TASK-005
   - TASK-005 的 agent 按 TASK-005a -> TASK-005b 顺序执行
3. Batch 1 全部完成后，启动 **Batch 2**：同时 spawn 2 个 agent 执行 TASK-003、TASK-006
4. Batch 2 完成后，启动 **Batch 3**：spawn 1 个 agent 执行 TASK-007
5. 全部批次完成后，由 review-qa 对整体变更进行评审
6. 在 staging 环境做端到端验证：四个页面的排序效果 + 侧边栏展示 + 响应时间基准

---

## 13. 变更规模分析

| 批次 | 任务 | 预估行数 | 累计行数 |
|------|------|---------|---------|
| Batch 1 | TASK-001 | 120 | |
| | TASK-002 | 100 | |
| | TASK-004 | 120 | |
| | TASK-005 | 200 | |
| | **Batch 1 小计** | **540** | **540** |
| Batch 2 | TASK-003 | 150 | |
| | TASK-006 | 80 | |
| | **Batch 2 小计** | **230** | **770** |
| Batch 3 | TASK-007 | 50 | |
| | **Batch 3 小计** | **50** | **820** |
| **总计** | | **820** | **820** |

**结论：** 总变更 820 行（含测试代码），在 1000 行阈值内，一轮次可安全完成。

---

> **下一步：** 主 Build Agent 审查后，按 parallel_batches 启动实现代理。
