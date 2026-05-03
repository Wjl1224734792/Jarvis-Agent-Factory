# 飞甲 Critical Fixes 执行计划

> **生成日期**: 2026-04-03  
> **需求来源**: `docs/tasks/critical-fixes-tasks.md`  
> **审查来源**: `docs/review/comprehensive-review-2026-04-03.md`  

---

## 轮次目标

修复全面审查报告中 3 个高优先级必须修复项：数据库枚举约束、管理员登录防爆破、前端 API 客户端类型安全。

## 范围

| 任务 | 类型 | 优先级 | 代理 |
|------|------|--------|------|
| FIX-001 | 数据完整性 | High | `backend_data_worker` |
| FIX-002 | 安全 | High | `backend_service_worker` |
| FIX-003 | 类型安全 | High | `frontend_state_worker` |

## 代理分工

| 代理 | 负责任务 | 共享区域归属 |
|------|----------|-------------|
| `backend_data_worker` | FIX-001 | `packages/db/src/schema.ts` 唯一责任方 |
| `backend_service_worker` | FIX-002 | `packages/schemas/src/auth.ts` 变更须回编排者确认 |
| `frontend_state_worker` | FIX-003 | `apps/web/src/lib/api-client.ts` 唯一责任方 |

## 并行策略

```
FIX-001 ──┐
FIX-002 ──┤── 三者无依赖，可完全并行
FIX-003 ──┘
```

**唯一共享区域**: `packages/schemas/src/auth.ts`（FIX-002 新增错误码）。若 FIX-001 或 FIX-003 也需要修改此文件，须回编排者协调。当前分析表明 FIX-001 和 FIX-003 不涉及此文件。

## 风险提醒

1. **FIX-001**: 数据库中若已有非法枚举值，迁移会失败。需先执行数据清理 SQL。
2. **FIX-002**: Redis 不可用时需有降级策略（放行但记录日志），避免完全阻断管理员登录。
3. **FIX-003**: 低风险纯重构，但需确保所有调用方的错误翻译行为不变。
4. **仓库无现有测试文件**: 三个任务均无 `.test.ts` 文件。FIX-002 按 TDD 需新建测试；FIX-001/FIX-003 以类型检查 + 手动验证为主。

---

## Execution Packets

### FIX-001 / 数据库枚举字段 CHECK 约束 / backend_data_worker

### objective
为 `packages/db/src/schema.ts` 中所有枚举语义的 text 列添加 PostgreSQL CHECK 约束，确保数据完整性。

### in_scope
- 修改 `packages/db/src/schema.ts` 中枚举字段的 `text()` 声明，使用 Drizzle 的 `check()` 添加约束
- 生成并应用 Drizzle 迁移
- 确保类型检查通过

### out_of_scope
- 不修改已有业务逻辑代码
- 不修改非枚举语义的 text 字段（如 `reason`, `content`, `slug`, `name` 等）
- 不添加新的数据库表

### input_documents
- `docs/tasks/critical-fixes-tasks.md`
- `packages/db/src/schema.ts`
- `packages/db/drizzle.config.ts`

### allowed_paths
- `packages/db/src/schema.ts`（主要变更）
- `packages/db/drizzle/`（自动生成的迁移文件）

### forbidden_paths
- `apps/` 目录下任何文件
- `packages/schemas/` 目录下任何文件
- `packages/http-client/` 目录下任何文件

### dependencies
无（可并行启动）

### acceptance_criteria
1. `usersTable.role` 有 CHECK 约束：`role IN ('user', 'admin')`
2. `sessionsTable.scope` 有 CHECK 约束：`scope IN ('web', 'app', 'admin')`
3. `postsTable.type` 有 CHECK 约束：`type IN ('article', 'moment')`
4. `postsTable.status` 有 CHECK 约束：`status IN ('pending', 'published', 'rejected', 'hidden')`
5. `userSettingsTable.profileVisibility` 有 CHECK 约束：`IN ('community', 'private')`
6. `brandApplicationsTable.status` 有 CHECK 约束：`IN ('pending', 'approved', 'rejected')`
7. `aircraftReviewsTable.status` 有 CHECK 约束：`IN ('visible', 'hidden')`
8. `reviewCommentsTable.status` / `postCommentsTable.status` / `rankingCommentsTable.status` / `ratingTargetCommentsTable.status` 有 CHECK 约束：`IN ('visible', 'hidden')`
9. `aircraftModelsTable.powerType` 有 CHECK 约束：`IN ('electric', 'fuel', 'hybrid', 'other')`
10. `aircraftSubmissionsTable.status` 有 CHECK 约束：`IN ('submitted', 'approved', 'rejected')`
11. `aircraftSubmissionsTable.powerType` 有 CHECK 约束：`IN ('electric', 'fuel', 'hybrid', 'other')`
12. `rankingsTable.type` 有 CHECK 约束：`IN ('community', 'official')`
13. `rankingsTable.status` 有 CHECK 约束：`IN ('draft', 'published', 'hidden')`
14. `rankingsTable.itemAddPolicy` 有 CHECK 约束：`IN ('owner', 'anyone')`
15. `ratingTargetsTable.status` 有 CHECK 约束：`IN ('draft', 'published', 'hidden')`
16. `aircraftModelInteractionsTable.type` 有 CHECK 约束：`IN ('like', 'favorite', 'share', 'interest')`
17. `postInteractionsTable.type` 有 CHECK 约束：`IN ('like', 'favorite', 'share')`
18. `notificationsTable.type` 有 CHECK 约束（根据代码推断的枚举值）
19. `filesTable` 的枚举字段（`bizType`, `mediaKind`, `provider`, `status`, `visibility`）有 CHECK 约束
20. `bun run typecheck` 通过
21. `bun run db:generate` 生成迁移文件成功
22. 迁移 SQL 中包含 `CHECK` 语句

### test_strategy
manual_only（数据库约束变更，无现有测试基础设施；以迁移生成 + 类型检查 + SQL 审查验证）

### handoff_notes
- 使用 Drizzle 的 `check()` 函数添加约束，例如：`text("role").notNull().check(sql`role IN ('user', 'admin')`)`
- 生成迁移前确认数据库中无非法值
- 枚举值需与代码中实际使用的值完全一致（参考 auth.ts 中的 enum、各 service 中的硬编码值）

### escalation_rule
`packages/db/src/schema.ts` 变更影响所有下游消费者。若迁移文件生成后导致 `bun run typecheck` 失败，须回编排者协调。

---

### FIX-002 / 管理员登录暴力破解防护 / backend_service_worker

### objective
在 `loginAdmin()` 流程中添加基于 Redis 的登录失败计数和账户锁定机制，防止暴力破解攻击。

### in_scope
- `apps/server/src/modules/auth/auth.service.ts` — 修改 `loginAdmin()` 方法
- `apps/server/src/modules/auth/auth.repo.ts` — 添加失败计数/检查/清除方法
- `apps/server/src/modules/auth/auth.route.ts` — 处理新错误码的 HTTP 状态码
- `packages/schemas/src/auth.ts` — 新增 `ADMIN_ACCOUNT_LOCKED` 错误码
- 编写单元测试

### out_of_scope
- 不修改用户端（web/app）登录流程
- 不修改密码重置/找回密码流程
- 不引入新的外部依赖（使用已有 Redis 客户端）

### input_documents
- `docs/tasks/critical-fixes-tasks.md`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/auth/auth.repo.ts`
- `apps/server/src/modules/auth/auth.route.ts`
- `packages/schemas/src/auth.ts`

### allowed_paths
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/auth/auth.repo.ts`
- `apps/server/src/modules/auth/auth.route.ts`
- `packages/schemas/src/auth.ts`
- `apps/server/src/modules/auth/*.test.ts`（新建）

### forbidden_paths
- `packages/db/` 目录下任何文件
- `apps/web/` 目录下任何文件
- `apps/admin/` 目录下任何文件

### dependencies
无（可并行启动）。但 `packages/schemas/src/auth.ts` 的变更会影响 `@feijia/http-client` 中的错误码映射，需同步更新 `http-client` 中的 `mapApiErrorMessage` 函数。

### acceptance_criteria
1. Redis key 格式为 `admin_login_fail:{account}`，TTL 为 300 秒（5 分钟）
2. 5 分钟内失败 5 次后，账户锁定 900 秒（15 分钟），锁定 key 格式为 `admin_login_lock:{account}`
3. 锁定期间调用 `loginAdmin()` 抛出 `AuthError("ADMIN_ACCOUNT_LOCKED", "...")`
4. 登录成功后清除该账户的失败计数和锁定状态
5. `packages/schemas/src/auth.ts` 中 `authErrorCodeSchema` 新增 `"ADMIN_ACCOUNT_LOCKED"`
6. `auth.route.ts` 中 adminLogin 路由对 `ADMIN_ACCOUNT_LOCKED` 返回 429 状态码
7. `packages/http-client/src/index.ts` 中 `mapApiErrorMessage` 对 `ADMIN_ACCOUNT_LOCKED` 返回友好中文提示
8. 编写至少 3 个测试用例：正常登录、失败计数递增触发锁定、锁定期间拒绝登录
9. `bun run typecheck` 通过
10. `bun run test` 通过

### test_strategy
tdd（安全功能需要测试覆盖；先写测试，再实现逻辑）

### handoff_notes
- Redis 客户端已在 `auth.repo.ts` 中通过 `import { redis } from "./redis-client"` 可用
- 降级策略：若 Redis 不可用，catch 后记录日志并放行（不阻断登录），避免单点故障
- 错误消息示例：`"该账号因多次登录失败已被锁定，请 15 分钟后再试。"`
- `http-client` 中的 `mapApiErrorMessage` 需同步新增 `ADMIN_ACCOUNT_LOCKED` 的中文提示

### escalation_rule
`packages/schemas/src/auth.ts` 为前后端共享合约。新增错误码后须确认 `http-client` 中的错误映射已同步更新。若 `http-client` 变更影响其他消费者，须回编排者协调。

---

### FIX-003 / 前端 API 客户端类型安全重构 / frontend_state_worker

### objective
移除 `apps/web/src/lib/api-client.ts` 中 372-386 行的 `for...of` + `as any` 循环包装，改为类型安全的实现方式。

### in_scope
- `apps/web/src/lib/api-client.ts` — 重构错误翻译包装逻辑
- 保持所有现有方法的错误翻译行为不变
- 保持 `apiClient` 导出接口完全兼容

### out_of_scope
- 不修改 `@feijia/http-client` 包
- 不修改任何页面组件代码
- 不添加新的 API 方法

### input_documents
- `docs/tasks/critical-fixes-tasks.md`
- `apps/web/src/lib/api-client.ts`
- `packages/http-client/src/index.ts`（了解 sharedClient 类型）

### allowed_paths
- `apps/web/src/lib/api-client.ts`

### forbidden_paths
- `packages/` 目录下任何文件
- `apps/server/` 目录下任何文件
- `apps/admin/` 目录下任何文件

### dependencies
无（可并行启动）

### acceptance_criteria
1. 移除 `for (const key of Object.keys(apiClient) ...)` 循环（372-386 行）
2. 移除所有 `as any` 类型断言
3. 每个导出的异步方法保持错误翻译行为（抛出 `mapWebApiError` 包装后的错误）
4. `apiClient` 的类型签名与重构前完全一致（页面侧无需任何修改）
5. `bun run typecheck` 通过
6. `bun run dev:web` 启动无类型错误
7. 所有现有页面编译通过（无类型报错）

### test_strategy
test_after（纯重构，先实现再验证类型检查通过；无现有测试文件，以类型检查 + 手动验证为主）

### handoff_notes
- 推荐方案：使用类型安全的 Proxy 包装，或显式为每个方法定义包装函数
- Proxy 方案需确保 TypeScript 能正确推断 `apiClient` 的类型（使用 `satisfies` 或显式类型标注）
- 注意 `sharedClient.uploadRankingItemImage` 等委托方法不需要额外包装（已在 sharedClient 内部处理）
- 重构后 `apiClient` 的每个方法签名必须与重构前 100% 兼容

### escalation_rule
`apps/web/src/lib/api-client.ts` 为 web 端唯一 API 入口。若重构后任何页面出现类型错误，须先修复再宣称完成。不涉及跨包共享合约。

---

## 执行后验证

```
FIX-001 完成 → bun run db:generate → bun run typecheck
FIX-002 完成 → bun run test → bun run typecheck
FIX-003 完成 → bun run typecheck → bun run dev:web（启动验证）

全部完成 → bun run typecheck → bun run test → bun run lint
```
