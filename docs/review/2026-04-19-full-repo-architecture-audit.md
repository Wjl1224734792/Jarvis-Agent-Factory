# 2026-04-19 全仓架构与模块边界审查

## 审查结论

- 结论：有条件通过
- 说明：仓库的 monorepo 方向总体成立，`apps -> packages` 的硬依赖方向目前仍然健康；但软边界已经出现明显漂移，尤其体现在共享 client、导航协议、跨领域 service 耦合和热点大文件上。后续如果直接进入大规模优化，极容易在这些热点区域发生冲突和结构债再生产。

## 审查方法

- 检查根 `package.json` 的 workspace 与验证脚本
- 盘点 `apps/*`、`packages/*` 的目录边界
- 统计热点文件规模
- 静态检索 `packages -> apps` 反向依赖
- 抽样检查共享 client、服务端搜索导航和前端路由入口

## 已确认问题

### 1. `[P0][共享边界]` API 契约 / client 边界已经裂开

- 证据：
  - `packages/http-client/src/index.ts:450`
  - `packages/http-client/src/index.ts:540`
  - `apps/web/src/lib/api-client.ts:1`
  - `apps/web/src/lib/api-client.ts:412`
  - `apps/web/src/lib/api-client.ts:528`
  - `apps/admin/src/lib/api-client.ts:1`
  - `apps/admin/src/lib/api-client.ts:120`
  - `apps/admin/src/lib/api-client.ts:297`
- 事实：
  - 共享 typed client 已经存在，但 `web` 仍继续本地封装 refresh、错误映射和额外接口。
  - `admin` 也继续本地定义 DTO、`fetch` helper 和聚合请求逻辑。
- 影响：
  - 共享 client、本地 client、错误适配分散在三层。
  - 契约和错误语义漂移的风险高。
- 建议：
  - 下一阶段优先收敛“哪些逻辑必须在 `packages/http-client`，哪些逻辑允许在 app 本地包装”。
- 分类：
  - `confirmed`
  - 下一阶段建议：`needs_ddd_first`

### 2. `[P0][服务边界]` 多个核心 service/repo 已经变成仓库级热点文件

- 证据：
  - `apps/server/src/modules/rankings/rankings.service.ts` 约 1782 行
  - `apps/server/src/modules/posts/posts.service.ts` 约 1231 行
  - `apps/server/src/modules/social/social.service.ts` 约 1178 行
  - `apps/server/src/modules/search/admin-search.service.ts` 约 977 行
  - `apps/server/src/modules/rankings/rankings.repo.ts` 超过 1100 行
- 事实：
  - 这些文件同时承担规则编排、查询拼装、序列化、通知副作用、状态流转甚至导航映射。
- 影响：
  - 后续任何优化都会持续撞同一批热点文件。
  - 代码评审、测试粒度和职责切分都会越来越困难。
- 建议：
  - 下一阶段把“领域编排 / 查询对象 / 序列化投影 / 状态流转 / 通知副作用”拆开。
- 分类：
  - `confirmed`
  - 下一阶段建议：`needs_ddd_first`

### 3. `[P1][跨域耦合]` `social.service` 已经演变成跨领域枢纽服务

- 证据：
  - `apps/server/src/modules/social/social.service.ts:464`
  - `apps/server/src/modules/social/social.service.ts:605`
  - `apps/server/src/modules/social/social.service.ts:762`
  - `apps/server/src/modules/social/social.service.ts:1039`
  - 其他领域 service 直接依赖 `socialService.recordNotification()` / `recordSystemNotification()`
- 事实：
  - 该服务同时承担关注关系、通知、管理员消息箱、待办聚合、用户主页、手机号变更和资料更新。
- 影响：
  - 一个领域规则变化容易放大到社交/消息聚合层。
- 建议：
  - 按“关注关系 / 通知投递 / admin inbox / profile 聚合”分拆子域。
- 分类：
  - `confirmed`
  - 下一阶段建议：`needs_ddd_first`

### 4. `[P1][共享职责穿透]` `schemas/shared` 正在吸收 UI 导航和展示层语义

- 证据：
  - `packages/schemas/src/social.ts:5`
  - `packages/schemas/src/social.ts:157`
  - `packages/shared/src/index.ts:9`
  - `packages/shared/src/index.ts:17`
  - `packages/shared/src/index.ts:64`
  - `packages/shared/src/index.ts:249`
- 事实：
  - `packages/schemas` 直接引入 `APP_ROUTES`。
  - `packages/shared` 同时维护端口、前端路由、后端 API 路由和展示辅助。
- 影响：
  - UI 导航变化会扩大共享层改动面。
- 建议：
  - 把“共享契约”“导航协议”“展示辅助”拆开。
- 分类：
  - `confirmed`
  - 下一阶段建议：`plan_patch_required`

### 5. `[P1][前端入口]` 大页面和路由入口已明显超过健康复杂度

- 证据：
  - `apps/web/src/routes/publish-aircraft-page.tsx` 约 1321 行
  - `apps/web/src/routes/publish-moment-page.tsx` 约 900 行级别
  - `apps/web/src/routes/publish-article-page.tsx` 约 800 行级别
  - `apps/admin/src/app.tsx` 约 556 行
  - `apps/admin/src/features/auth/admin-overview-page.tsx` 约 700 行级别
- 影响：
  - 页面层同时承担状态、上传、媒体处理、表单和路由编排，复用与测试粒度都偏粗。
- 建议：
  - 按页面编排、状态逻辑、媒体处理和子区块拆分。
- 分类：
  - `confirmed`
  - 下一阶段建议：`can_direct_dev`

## 正向观察

- 静态检索未发现 `packages -> apps` 的直接反向 import。
- 前端网络调用基本收口在 `lib` 层，没有看到大面积页面内散落 `fetch`。

## 建议方向

- 优先收敛共享 client、共享契约和导航语义边界。
- 其次治理仓库级热点 service/repo/page 文件。
- 在进入大规模实现前，先把热点文件的职责切口与 ownership 规划清楚。
