# 共享 Client 边界收口 Slice 1 实施计划

> **面向 AI 代理的工作者：** 优先在单一会话内按任务顺序执行；本计划对应 `brand applications + site settings` 试点切片。步骤使用复选框语法跟踪进度。

**目标：** 以 `brand applications + site settings` 为试点，把 `packages/http-client` 收口为唯一业务 client 边界，并把 Web/Admin 本地 client 缩成薄适配层。

**架构：** 共享层负责业务接口与读模型，应用层仅负责运行时 base URL、auth invalid 事件、refresh 和用户提示文案。当前试点不重构全量 client，只挑两条高价值链路验证模式是否成立。

**技术栈：** Bun、TypeScript、Vitest、React、Hono、`@feijia/http-client`、`@feijia/schemas`

---

## 文件结构

- 创建：
  - `docs/implementation/2026-04-20-client-boundary-slice1-implementation.md`
- 修改：
  - `packages/schemas/src/site-settings.ts`
  - `apps/admin/src/lib/api-client.ts`
  - `apps/admin/src/lib/site-settings.ts`
  - 可能涉及 `apps/admin/src/features/**` 中依赖本地 `SiteSettings` 类型的文件
- 只读参考：
  - `packages/http-client/src/index.ts`
  - `apps/web/src/lib/api-client.ts`
  - `apps/web/src/routes/publish-brand-page.tsx`
  - `apps/admin/src/features/models/brand-applications-page.tsx`

## 任务 1：补共享类型出口

- [ ] **步骤 1：确认 `site-settings` 共享 schema 当前无类型导出**
  - 读取 `packages/schemas/src/site-settings.ts`
  - 确认当前仅导出 schema，无 `SiteSettings` / `UpdateSiteSettingsInput` 类型

- [ ] **步骤 2：在共享 schema 中导出类型**
  - 在 `packages/schemas/src/site-settings.ts` 增加：
    - `export type SiteSettings = z.infer<typeof siteSettingsSchema>`
    - `export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsInputSchema>`

- [ ] **步骤 3：运行 schema 相关 typecheck**
  - 运行：`bun run --cwd packages/schemas typecheck`
  - 预期：通过

## 任务 2：收口 Admin 侧 `site settings` 业务 client

- [ ] **步骤 1：定位 admin 本地重复逻辑**
  - 检查 `apps/admin/src/lib/api-client.ts` 中的：
    - 本地 `SiteSettings` type
    - `getSiteSettings()`
    - `updateSiteSettings()`

- [ ] **步骤 2：改为直接复用共享 client**
  - 删除本地 `SiteSettings` 业务类型定义
  - 让 `getSiteSettings()` 直接委托到 `sharedClient.getAdminSiteSettings()`
  - 让 `updateSiteSettings()` 直接委托到 `sharedClient.updateAdminSiteSettings()`
  - 保留 admin 运行时适配层：
    - base URL
    - auth invalid dispatch
    - 包装代理

- [ ] **步骤 3：让本地辅助类型依赖共享 schema**
  - 在 `apps/admin/src/lib/site-settings.ts` 中不再从本地 `api-client` 导入 `SiteSettings`
  - 改为从 `@feijia/schemas` 导入共享 `SiteSettings` 类型

- [ ] **步骤 4：运行 admin typecheck**
  - 运行：`bun run --cwd apps/admin typecheck`
  - 预期：通过

## 任务 3：验证 `brand applications` 试点切片边界

- [ ] **步骤 1：确认 Web brand applications 已经直接消费共享业务模型**
  - 检查 `apps/web/src/routes/publish-brand-page.tsx`
  - 确认页面使用 `BrandApplication` 共享类型，业务接口来自 `apiClient` 包装层

- [ ] **步骤 2：确认 Admin brand applications 已不再依赖本地 site settings 业务模型**
  - 检查 `apps/admin/src/features/models/brand-applications-page.tsx`
  - 确认只消费共享 brand application 返回值与共享 site settings 类型

- [ ] **步骤 3：记录试点结论**
  - 在实现说明文档中记录：
    - 哪些职责已回到共享层
    - 哪些职责仍保留在 app 适配层
    - 为什么这一切片能作为下一批推广模板

## 任务 4：验证与收口

- [ ] **步骤 1：运行共享与应用层最小验证**
  - 运行：
    - `bun run --cwd packages/schemas typecheck`
    - `bun run --cwd packages/http-client typecheck`
    - `bun run --cwd apps/admin typecheck`
    - `bun run --cwd apps/web typecheck`

- [ ] **步骤 2：运行根级验证**
  - 运行：
    - `bun run lint`
    - `bun run typecheck`

- [ ] **步骤 3：编写实现说明**
  - 在 `docs/implementation/2026-04-20-client-boundary-slice1-implementation.md` 记录：
    - 变更范围
    - 收口效果
    - 未处理项
    - 下一批建议推广目标

