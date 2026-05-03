# 2026-04-19 全仓优化路线图

## 路线图结论

- 当前最合理的推进方式不是按 app 分头乱修，而是按“边界 -> 规则 -> 性能 -> 体验”四层推进。
- 优先级排序应以系统性风险和后续优化杠杆为主，而不是以文件容易改为主。

## P0

### P0-1 共享 client / 契约边界收口

- 目标：
  - 明确 `packages/http-client` 与 `apps/web|admin` 本地 `api-client` 的职责边界
- 主要问题来源：
  - 全仓架构审查
- 分类：
  - `needs_ddd_first`
- 原因：
  - 涉及共享契约、错误语义和 client 责任边界

### P0-2 品牌申请状态机修复

- 目标：
  - 统一 schema、route、service、DB 状态枚举
- 分类：
  - `must_tdd`
- 原因：
  - 已确认存在状态断裂，属于高风险行为修复

### P0-3 榜单条目评分/评论写入解耦

- 目标：
  - 拆分评分写入与评论写入链路，修正排序污染
- 分类：
  - `must_tdd`
- 原因：
  - 已确认会持续制造脏数据并污染聚合结果

### P0-4 测试与 seed 基础设施降重

- 目标：
  - 降低 server 测试对整库 `reset + seed` 的依赖
- 分类：
  - `can_direct_dev`
- 原因：
  - 风险明确、收益高、切口可控

## P1

### P1-1 横切审核/通知规则策略化

- 分类：
  - `needs_ddd_first`
- 依赖：
  - 需要先梳理 posts/rankings/reviews/aircraft-models 的统一规则入口

### P1-2 `social.service` 子域化

- 分类：
  - `needs_ddd_first`
- 目标：
  - 将关注、通知、admin inbox、profile 聚合拆开

### P1-3 推荐与搜索排序语义重构

- 包含：
  - 推荐候选与排序语义重算
  - 跨类型搜索排序与分页语义重算
- 分类：
  - `must_tdd`

### P1-4 `admin-search` 导航协议收敛

- 分类：
  - `plan_patch_required`
- 原因：
  - 涉及共享导航协议与 admin 路由落点

### P1-5 大 service / repo / page 热点拆分

- 包含：
  - `rankings.service.ts`
  - `posts.service.ts`
  - `social.service.ts`
  - `packages/http-client/src/index.ts`
  - `apps/admin/src/app.tsx`
  - 大型 publish 页面
- 分类：
  - `can_direct_dev` 与 `needs_ddd_first` 混合
- 说明：
  - 纯结构性拆分可直接做
  - 涉及规则重组的部分需要 DDD 先行

## P2

### P2-1 日志链路重构

- 分类：
  - `can_direct_dev`
- 目标：
  - 日志写入按类别拆队列
  - 后台日志读取改为 tail/分页

### P2-2 前端 bundle budget 与拆包治理

- 分类：
  - `can_direct_dev`
- 目标：
  - 为 Web/Admin 增加包体门禁
  - 优先处理编辑器和图表重型 chunk

### P2-3 `packages/db` 基础设施测试

- 分类：
  - `can_direct_dev`
- 目标：
  - 为 schema/seed/migration 补基础设施测试层

## 执行顺序与依赖

1. 先做 `P0-1`，明确共享 client / 契约边界。
2. 并行推进 `P0-2` 与 `P0-3`，因为它们都是高风险数据/状态修复。
3. 尽早启动 `P0-4`，为后续优化降低验证成本。
4. 在 P0 收口后，再进入 P1 的横切规则和热点文件治理。
5. P2 作为结构稳定后的性能与基础设施增强批次。

## 并行与串行建议

- 可并行：
  - 品牌申请状态机修复
  - 榜单评分/评论写入解耦
  - 测试/seed 基础设施降重
- 必须串行或先定边界：
  - 共享 client / 契约边界收口
  - 横切审核/通知规则策略化
  - `social.service` 子域化
  - `admin-search` 导航协议收敛

## 可能触发的计划补丁 / 契约变更

- 共享 client / 错误语义 / 路由落点协议调整
- `packages/schemas` 与 `packages/shared` 的职责拆分
- 横切审核/通知策略统一
- Admin 搜索导航协议下沉到共享层

## 下一阶段实施原则

- `must_tdd`
  - 品牌申请状态机
  - 榜单评分/评论写入解耦
  - 推荐排序与搜索排序重构
- `can_direct_dev`
  - 测试/seed 基础设施降重
  - 大页面和热点文件的纯结构拆分
  - 日志链路和 bundle budget 治理
- `needs_ddd_first`
  - 共享 client / 契约边界重构
  - 横切审核/通知规则策略化
  - `social.service` 子域化
- `plan_patch_required`
  - 共享导航协议、共享契约、跨 app 边界调整
