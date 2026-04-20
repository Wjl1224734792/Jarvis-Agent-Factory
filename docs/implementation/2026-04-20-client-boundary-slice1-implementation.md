# 2026-04-20 共享 Client 边界收口 Slice 1 实现说明

## 本轮目标

- 以 `brand applications + site settings` 为试点，验证“`packages/http-client` 作为唯一业务 client 边界，app 只保留薄适配层”的收口模式。

## 已完成

### 1. 共享 `site settings` 类型出口

- 在 `packages/schemas/src/site-settings.ts` 中补充导出：
  - `SiteSettings`
  - `UpdateSiteSettingsInput`

这让应用层不再需要为了消费 `site settings` 接口而在本地重新定义一份业务类型。

### 2. Admin 侧 `site settings` 业务 client 收口

- `apps/admin/src/lib/api-client.ts`
  - 删除本地 `SiteSettings` 业务类型定义
  - `getSiteSettings()` 改为直接委托 `sharedClient.getAdminSiteSettings()`
  - `updateSiteSettings()` 改为直接委托 `sharedClient.updateAdminSiteSettings()`

### 3. Admin 本地辅助函数改用共享类型

- `apps/admin/src/lib/site-settings.ts`
  - 不再依赖本地 `api-client` 导出的业务类型
  - 改为直接依赖 `@feijia/schemas` 的 `SiteSettings`

## 本轮刻意不做

- 不改 `apps/web/src/lib/api-client.ts` 的错误映射与 refresh 逻辑
- 不改 `apps/admin/src/lib/api-client.ts` 中与 ranking / messages / model 管理相关的本地 DTO
- 不重构 `packages/http-client` 的整体文件结构

## 为什么这仍然有价值

- 这是第一批“只做一条垂直切片”的试点，用来验证共享类型出口和 app 薄适配层的模式是否能落地。
- 结果证明：
  - 共享业务类型可以直接从 `@feijia/schemas` 提供
  - app 层完全可以只保留运行时适配，而不必继续维护同义业务类型

## 建议的下一批扩展目标

1. 将 `brand applications` 在 admin/web 的所有业务读模型完全与 shared client 对齐
2. 把 `site settings` 的其余本地包装语义继续收敛
3. 进入第二个高价值切片：
   - `rankings / rating targets`
   - `admin messages / moderation todos`
