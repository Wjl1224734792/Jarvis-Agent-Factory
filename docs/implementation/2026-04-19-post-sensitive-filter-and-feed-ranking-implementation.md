# 2026-04-19 发布敏感词过滤与信息流推荐排序实现说明

## 实现范围

- `apps/server/src/modules/posts/posts-sensitive-filter.ts`
- `apps/server/src/modules/posts/posts.service.ts`
- `apps/server/src/modules/posts/posts.route.ts`
- `apps/server/src/modules/posts/feed-recommendation.ts`
- `apps/server/tests/posts.test.ts`

## 已完成能力

### 1. 发布敏感词过滤

- 在 posts 域内新增集中式敏感词检测服务 `posts-sensitive-filter.ts`。
- 当前覆盖入口：
  - `createPost`
  - `updatePost`
  - `updateAdminOfficialArticle`
- 检测对象：
  - 标题
  - 正文纯文本
- 命中后直接在写库前拒绝请求，route 统一返回 `400 BAD_REQUEST` 和稳定错误文案。

### 2. feed 推荐排序增强

- `recommended` 不再只依赖旧的线性加权，而是加入：
  - 浏览量
  - 新鲜度半衰期
  - 作者关系
  - 标题/摘要长度质量分
  - 媒体形态加分
  - 已互动内容抑制
  - 举报风险惩罚
- 文章与动态采用不同权重倾向：
  - 文章更看重互动质量、内容完整度、适度官方加权
  - 动态更看重新鲜度和媒体形态
- `latest` 与 `following` 保持时间流语义，不混入推荐权重。

### 3. 推荐候选窗口扩大

- `recommended` 在 service 层先拉取更大的候选窗口，再执行重排和分页切片。
- 当前窗口策略：
  - `candidateLimit = min(max(page * limit * 4, 60), 200)`
- 目的：避免“只在当前页结果里洗牌”导致推荐收益过低。

## 当前限制

- 敏感词词库仍为 server 内置清单，未提供管理端配置能力。
- 推荐仍然基于现有 posts 查询结果做轻量重排，不包含独立召回、画像或离线特征。
- 本轮没有向前端暴露推荐解释字段，也没有扩展共享契约。

## 建议后续项

1. 若产品需要运营配置词库，再单独规划 `packages/db + apps/admin` 任务。
2. 若推荐效果仍受候选集限制，再评估 repo 粗排策略或独立召回层。
3. 若前端需要调试推荐结果，可下一轮补 `scoreBreakdown` 等解释字段，并同步共享契约。
