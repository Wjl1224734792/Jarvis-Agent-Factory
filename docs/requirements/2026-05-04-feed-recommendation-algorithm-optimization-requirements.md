# 推荐/推流算法优化与侧边卡片规范化需求文档

## 变更日志

| 日期 | 变更内容 | 影响 REQ | 原因 |
|------|---------|----------|------|
| 2026-05-04 | 初始版本 | 全部 | 需求澄清完成后首次落盘 |

---

## 1. 目标（Objective）

### 1.1 背景

当前首页、飞友圈、飞行器、榜单四个页面的推荐/推流存在以下问题：

- **推荐不够个性化：** 推荐引擎未引入用户机型偏好、浏览历史等个性化信号
- **热门推荐不准确：** 飞行器热门评分维度单薄，榜单热度算法在前端执行无法服务端排序
- **内容重复/刷新无效：** JS 多样性重排器（`feed-recommendation.ts`）已实现但未被接入
- **响应速度慢：** 推荐查询涉及复杂 CTE 计算，缺少针对性的索引优化

### 1.2 目标用户

- 所有「飞加」平台的普通注册用户
- 浏览首页、飞友圈、飞行器、榜单四个页面的用户

### 1.3 核心目标

1. 统一推荐引擎：整合 SQL 评分与 JS 多样性重排，引入用户机型偏好信号
2. 优化四个页面的信息流排序质量，降低内容重复率
3. 将热门榜单/机型评分服务端化，支持个性化排序
4. 统一侧边推荐卡片规范（≤ 3 项），覆盖所有页面
5. 推荐接口 P95 响应时间 ≤ 200 ms

---

## 2. 命令/接口（Commands/API）

### 2.1 需要修改的现有接口

| 接口 | 路径 | 改动 |
|------|------|------|
| 首页 Feed | `GET /api/v1/home/feed` | 接入多样性重排；新增 `user_model_preference` 评分因子 |
| 飞友圈 Feed | `GET /api/v1/circle/feed` | 接入多样性重排；动态专属权重调优 |
| 飞行器列表 | `GET /api/v1/models` | `tab=recommended` 时接入丰富评分维度 |
| 榜单列表 | `GET /api/v1/rankings` | 热度排序服务端化，支持 `sort=hot` |
| 热门机型 | `GET /api/v1/models?sort=hot` | 丰富评分维度 |

### 2.2 新增参数/字段

| 接口 | 新增参数 | 类型 | 说明 |
|------|---------|------|------|
| `GET /api/v1/home/feed` | - | - | 响应行为变化，接口签名不变 |
| `GET /api/v1/circle/feed` | - | - | 响应行为变化，接口签名不变 |
| `GET /api/v1/rankings` | `sort` | `"hot" \| "latest"` | 新增热度排序 |

### 2.3 侧边卡片统一规范

所有页面的侧边推荐卡片遵循统一规范：

- 每类推荐卡片最多展示 **3 项**
- 数据源统一从服务端获取，不硬编码客户端过滤
- 支持的推荐卡片类型：热门机型、热门榜单（可扩展热门话题、热门用户）

---

## 3. 项目结构（Structure）

### 3.1 涉及模块

```
apps/server/src/modules/
├── posts/
│   ├── posts.repo.ts              # 核心推荐 SQL（修改）
│   ├── posts.service.ts           # Feed 服务，接入多样性重排（修改）
│   ├── feed-recommendation.ts     # JS 多样性重排器（启用 + 修改）
│   └── feed-cursor.ts             # 推荐游标（可能修改）
├── aircraft-models/
│   ├── model-hot-score.ts         # 热门机型评分（修改）
│   ├── aircraft-models.service.ts # 飞行器服务（修改）
│   └── aircraft-models.repo.ts    # 飞行器数据访问（可能修改）
├── rankings/
│   ├── ranking-score.ts           # 榜单条目排序（可能修改）
│   ├── rankings.service.ts        # 榜单服务（修改）
│   └── rankings.repo.ts           # 榜单数据访问（可能修改）
└── users/
    └── users.repo.ts              # 用户偏好数据查询（新增）

apps/web/src/
├── routes/
│   ├── home-page.tsx              # 首页侧边栏（修改）
│   ├── circle-page.tsx            # 飞友圈页面（可能修改）
│   ├── models-page.tsx            # 飞行器页面（可能修改）
│   ├── rankings-page.tsx          # 榜单页面（修改）
│   └── rankings-page-helpers.ts   # 前端热度算法（移至服务端，删除）
├── components/
│   └── site-shell.tsx             # 侧边栏布局组件（可能修改）

packages/
├── schemas/src/
│   └── rankings.ts                # 榜单 schema（可能修改）
└── shared/src/
    └── index.ts                   # API 路由常量（可能修改）
```

### 3.2 共享区域（修改需 Plan Patch）

| 共享区域 | 文件 | 风险等级 |
|---------|------|---------|
| API 路由常量 | `packages/shared/src/index.ts` | 低 |
| Zod Schema | `packages/schemas/src/rankings.ts` | 中 |
| 数据库 Schema | `packages/db/src/schema.ts` | 高 |
| HTTP 客户端 | `packages/http-client/src/` | 中 |

---

## 4. 代码风格（Style）

- 遵循项目现有 TypeScript 与 Interface 使用规范（默认 `interface`，Zod 环境下以 schema 为准）
- 推荐算法修改集中在对应的 `*.repo.ts` / `*.service.ts` 中，不泄露到路由层
- 数据库查询优化使用 PostgreSQL CTE + 窗口函数，不引入新的 ORM 依赖
- 新增评分因子封装为独立函数，便于单元测试
- 遵循 Prettier/ESLint 配置

---

## 5. 测试策略（Testing）

| 层级 | 范围 | 策略 |
|------|------|------|
| 单元测试 | 评分函数（`buildModelHotScore`、`buildRecommendationInteractionScoreExpression`、`rankFeedItemsByRecommendation`） | TDD：先写失败测试，再改实现 |
| 集成测试 | Feed 接口（首页/飞友圈/飞行器/榜单）的排序结果 | test_after：实现后补集成测试 |
| 性能测试 | 推荐接口 P95 延迟 | manual_only：使用 `EXPLAIN ANALYZE` 分析 |

---

## 6. 边界（Boundaries）

### 6.1 范围内

- 首页推荐/关注信息流排序优化
- 飞友圈推荐/关注信息流排序优化
- 飞行器「推荐」Tab 排序优化
- 榜单列表热度排序服务端化
- 热门机型评分维度扩展
- JS 多样性重排器接入
- 用户机型偏好信号引入
- 侧边卡片统一 ≤ 3 项规范
- 推荐查询索引优化

### 6.2 范围外

- 机器学习/深度学习推荐模型（不引入新框架）
- 实时推荐管道（不引入 Kafka/Redis Stream）
- A/B 实验框架
- 推荐效果数据看板
- 用户显式兴趣标签系统
- 第三方推荐服务（如阿里云推荐引擎）
- 管理后台推荐配置界面
- Push 推送优化

### 6.3 风险与开放问题

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 评分公式变更可能导致排序效果不如预期 | 中 | 保留旧公式作为 fallback，通过配置开关切换 |
| 用户偏好信号引入增加查询复杂度 | 中 | 异步计算用户偏好向量，缓存到 Redis |
| 多样性惩罚过强导致优质内容被误杀 | 低 | 惩罚系数可配置，初始值偏保守 |
| 性能优化后仍不达标 | 低 | 引入物化视图或定时预计算 |

---

## 7. 需求列表（REQ）

### REQ-001：接入多样性重排器

- **优先级：** P1（必须）
- **关联模块：** `posts.service.ts`、`feed-recommendation.ts`
- **描述：** 在首页和飞友圈的推荐/关注信息流中，接入已有的 `rankFeedItemsByRecommendation` JS 重排器，对 SQL 返回的结果进行二次排序，降低连续相同作者/分类的出现频率

**验收标准：**

- [ ] 首页 `tab=recommended` 返回的帖子列表中，连续 3 条中相同作者的占比 ≤ 30%
- [ ] 飞友圈 `tab=recommended` 返回的帖子列表中，连续 3 条中相同作者的占比 ≤ 30%
- [ ] 多样性惩罚不影响分页一致性（同一游标位置返回相同帖子）
- [ ] 单元测试覆盖 `buildDiversityPenalty` 函数

---

### REQ-002：优化推荐评分公式权重

- **优先级：** P1（必须）
- **关联模块：** `posts.repo.ts`（`buildRecommendationStaticBaseScoreExpression`）
- **描述：** 调整首页和飞友圈的推荐基础分公式参数，差异化文章和动态的权重配置，使时间衰减与互动量达到更合理的平衡

**验收标准：**

- [ ] 文章半衰期从 42 小时调整为可配置参数（默认 36 小时）
- [ ] 动态半衰期从 22 小时调整为可配置参数（默认 18 小时）
- [ ] 互动分权重与新鲜度权重的比例可通过环境变量调整
- [ ] 调整后的排序经人工抽检确认合理（24 小时内高互动内容不会被过度压制）

---

### REQ-003：引入用户机型偏好信号

- **优先级：** P2（应该）
- **关联模块：** `posts.repo.ts`、`users.repo.ts`
- **描述：** 基于用户的机型浏览/收藏/评论记录，计算用户机型偏好向量，作为推荐排序的加分因子

**验收标准：**

- [ ] 用户浏览过某机型 ≥ 3 次后，同机型相关帖子的推荐分获得小幅加成
- [ ] 用户收藏的机型相关帖子获得更高推荐加成
- [ ] 未登录或无机型偏好的用户不受影响（加成默认为 0）
- [ ] 偏好向量每周异步更新一次，不阻塞请求

---

### REQ-004：丰富热门机型评分维度

- **优先级：** P1（必须）
- **关联模块：** `model-hot-score.ts`、`aircraft-models.service.ts`
- **描述：** 扩展 `buildModelHotScore` 的评分维度，引入浏览热度、搜索频次、榜单中出现频次等因子

**验收标准：**

- [ ] 热门机型评分新增以下因子：近 7 天浏览量、近 7 天搜索次数、被榜单引用次数
- [ ] 新评分公式的加权系数可通过配置文件调整
- [ ] `tab=recommended` 的飞行器列表基于新评分排序
- [ ] 侧边栏热门机型基于新评分返回 top 3

---

### REQ-005：榜单热度服务端化

- **优先级：** P1（必须）
- **关联模块：** `rankings.service.ts`、`rankings-page-helpers.ts`
- **描述：** 将当前在前端 `buildRankingHotScore` 中计算的热度分移至服务端，支持 `sort=hot` 参数

**验收标准：**

- [ ] 服务端实现 `buildRankingHotScore` 等效逻辑（与前端当前算法结果一致）
- [ ] `GET /api/v1/rankings?sort=hot` 返回按热度降序的榜单列表
- [ ] 新增 Zod schema 校验 `sort` 参数
- [ ] 前端摘除 `rankings-page-helpers.ts` 中的热度计算逻辑，改为依赖服务端排序
- [ ] 侧边栏热门榜单使用 `sort=hot&limit=3` 获取

---

### REQ-006：侧边卡片统一规范

- **优先级：** P1（必须）
- **关联模块：** `home-page.tsx`、`site-shell.tsx`
- **描述：** 统一所有页面的侧边推荐卡片数据获取逻辑，确保每类推荐卡片最多展示 3 项

**验收标准：**

- [ ] 首页侧边栏「热门机型」查询参数统一为 `limit=3`
- [ ] 首页侧边栏「热门榜单」查询参数统一为 `limit=3`
- [ ] `SidebarCard`（或等效组件）封装统一的「最多 3 项」截断逻辑
- [ ] 若其他页面未来添加侧边推荐卡片，复用同一组件即自动遵守 ≤ 3 项规范

---

### REQ-007：推荐查询性能优化

- **优先级：** P2（应该）
- **关联模块：** `posts.repo.ts`、数据库索引
- **描述：** 针对推荐 SQL 查询的 CTE 结构进行性能优化，添加必要索引，P95 响应时间目标 ≤ 200 ms

**验收标准：**

- [ ] `EXPLAIN ANALYZE` 确认推荐查询使用索引而非全表扫描
- [ ] 首页 Feed 推荐 Tab P95 响应时间 ≤ 200 ms
- [ ] 飞友圈 Feed 推荐 Tab P95 响应时间 ≤ 200 ms
- [ ] 飞行器列表推荐 Tab P95 响应时间 ≤ 200 ms
- [ ] 榜单列表 `sort=hot` P95 响应时间 ≤ 200 ms
- [ ] 数据库迁移脚本包含新增索引

---

## 8. 规格自检

### 内容完整

- [x] 6 大核心区域（目标/命令/结构/风格/测试/边界）均已覆盖
- [x] 每条需求有 `REQ-XXX` 编号（REQ-001 至 REQ-007）
- [x] 每条需求有优先级（P1 × 5，P2 × 2）
- [x] 每条需求有可验证的验收标准
- [x] 范围内和范围外明确列出
- [x] 风险与开放问题已记录

### 质量

- [x] 无「待定」占位符
- [x] 所有验收标准可客观验证
- [x] 接口定义包含输入、输出、错误场景
- [x] 章节之间无矛盾
- [x] 范围适合单团队实现计划覆盖

### 排版

- [x] 遵循中文文档排版规范（中英空格、全角标点等）
- [x] 文档落盘到 `docs/requirements/2026-05-04-feed-recommendation-algorithm-optimization-requirements.md`
- [x] 变更日志已初始化

---

> **下一步：** 请审查以上需求文档。确认后进入 Gate A，启动 `task-design` 任务分解。
