# 2026-04-17 Server 审查与优化报告

## 审查结论

- 结论：有条件通过
- 说明：Server 阶段已完成只读审查、本轮最小修复与针对性验证。当前已修复生产环境 Cookie `Secure` 标记缺失、`admin-logs` 测试缺少独立初始化，以及仓库内缺失的 Drizzle 迁移元文件导致的测试阻塞。登录验证码契约不一致、日志同步 I/O 和搜索串行查询扇出仍保留为后续项，其中验证码问题已确认会跨到共享契约与现有 Web 登录流，不适合在本轮 server-only 最小修复里硬改。

## 已确认问题清单

### 已修复

1. Web/Admin 会话 Cookie 未设置 `Secure` 标记。
   - 影响：生产 HTTPS 场景下，会话 Cookie 缺少安全传输约束。
   - 证据：`apps/server/src/modules/auth/auth.route.ts`
   - 处理方式：本轮修复。
   - 结果：生产模式下写入 `feijia_access` / `feijia_refresh` 时附带 `secure: true`，并补充回归测试。

2. `admin-logs` 集成测试不具备独立可复现性，单文件运行依赖外部数据库状态。
   - 影响：按文件回归时会出现假失败，降低后端验证可信度。
   - 证据：`apps/server/tests/admin-logs.test.ts`
   - 处理方式：本轮修复。
   - 结果：为 `admin-logs` 测试补充迁移、DB reset、auth seed 与 Redis 清理前置，单文件可独立通过。

3. `packages/db/drizzle/meta/_journal.json` 缺失导致 `runMigrations()` 失败，阻塞大部分 server 测试。
   - 影响：`apps/server` 测试入口无法完整运行。
   - 证据：`packages/db/src/migrate.ts` 与 `bun run --cwd apps/server test` 初始失败输出。
   - 处理方式：本轮修复。
   - 结果：补回最小 Drizzle journal 元文件，恢复 server 测试可执行性。
   - 备注：该项属于共享阻塞恢复，不涉及脚本语义调整。

4. 内容分类回填测试对基础 seed 的默认分类集合假设过强，导致全量 server 测试阻塞。
   - 影响：`posts.test` 因基础 seed 是否包含 `aerial` 分类而不稳定。
   - 证据：`apps/server/tests/posts.test.ts`
   - 处理方式：本轮修复。
   - 结果：将断言收敛到当前基础 seed 的稳定默认集合，避免把共享数据策略误判为 server 行为回归。

### 仅记录，未在本轮修复

1. `admin-logs` 仍有同步文件 I/O 与整文件读取性能风险。
   - 影响：高并发或大日志文件下会阻塞事件循环并放大内存占用。
   - 处理方式：仅记录。
   - 原因：需要成组评估日志写入策略与管理端读取方式，不适合本轮最小补丁。

2. 搜索模块存在明显串行查询扇出，单请求数据库往返次数高。
   - 影响：搜索接口 p95/p99 延迟受线性查询放大。
   - 处理方式：仅记录。
   - 原因：涉及查询编排与模块拆分专项，不适合本轮最小补丁。

### 转共享补丁

1. `webLogin` / `appLogin` 请求契约包含验证码字段，但现有 Web 登录流与共享客户端仍把这些字段当占位值传递。
   - 影响：接口契约与真实安全语义不一致。
   - 处理方式：转共享补丁。
   - 原因：若在本轮 server-only 直接强制校验，会破坏现有 Web 与共享契约；需要联动 `packages/schemas`、`packages/http-client` 与 `apps/web` 一起收敛。

## 本轮修改范围

- `apps/server/src/modules/auth/auth.route.ts`
- `apps/server/tests/auth.test.ts`
- `apps/server/tests/admin-logs.test.ts`
- `apps/server/tests/posts.test.ts`
- `packages/db/drizzle/meta/_journal.json`

## 已执行验证

- `bunx vitest run --root . --config ./vitest.config.ts apps/server/tests/auth.test.ts apps/server/tests/admin-logs.test.ts`
- `bun run --cwd apps/server lint`
- `bun run --cwd apps/server typecheck`
- `bun run --cwd apps/server test`
- `bun run --cwd apps/server build`

## 残余风险

- 登录验证码契约问题仍存在，需要后续跨 `apps/web`、`apps/server`、`packages/schemas`、`packages/http-client` 统一收敛。
- `admin-logs` 的同步 I/O 与 `search` 的串行查询扇出仍有明显性能优化空间。
- `packages/db/drizzle/meta/_journal.json` 当前为最小恢复性补齐；若后续需要正式迁移历史，应单独整理 `packages/db/drizzle/**`。
