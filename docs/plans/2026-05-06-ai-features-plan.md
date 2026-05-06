# AI 功能执行计划

**创建日期：** 2026-05-06
**版本：** 1.0.0
**状态：** ready

---

## 1. 文档引用

| 文档 | 路径 |
|------|------|
| 需求文档 | `docs/requirements/2026-05-06-ai-features-requirements.md` |
| 任务文档 | `docs/tasks/2026-05-06-ai-features-tasks.md` |

---

## 2. Gate B 检查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 任务 ID 完整（TASK-XXX） | 通过 | TASK-001 ~ TASK-010，共 10 个 |
| 每个任务映射至少一个 REQ | 通过 | 全部 7 个 REQ 均有覆盖 |
| 类型完整 | 通过 | 后端 6、前端 Web 2、前端 Admin 1、纯清理 1 |
| 优先级完整 | 通过 | P0 x2、P1 x7、P2 x1（与 REQ-005 共享） |
| 完成标准完整 | 通过 | 每个任务均有明确的验收条件列表 |
| DDD 分类完整 | 通过 | 全部标注，结论为无需 DDD 战术建模 |
| TDD / 直接开发分类完整 | 通过 | TDD 4 个、test_after 6 个 |
| 风险任务已标注 | 通过 | TASK-001(高)、TASK-004/006/010(中) |
| 文件所有权提醒 | 通过 | 每个任务均有文件所有权和共享区域冲突说明 |
| 测试覆盖 | 通过 | TDD 任务均有对应测试，test_after 任务在独立 Batch 分配测试 |

**Gate B 结论：通过，可进入规划阶段。**

---

## 3. 当前轮次目标

完成飞加平台 AI 功能全栈实现，包括：文件导入、AI 摘要、AI 排版、管理后台配置、Redis 缓存规范化、移除硬编码敏感词。

## 4. 当前轮次范围

10 个 TASK，覆盖全部 7 个 REQ。预估总变更行数 ~1690 行（含测试）。

## 5. 完成标准

- 所有 10 个 TASK 的验收条件全部满足
- `bun run typecheck` 通过
- `bun run lint` 通过
- 所有单元测试通过
- E2E 测试覆盖核心流程
- AI 功能可通过管理后台配置后正常使用

## 6. 是否需要先查阅 repo-explorer / docs-researcher

**不需要。** 任务文档已包含完整的文件路径和模块结构信息，现有项目结构已通过 `ls` 命令确认。

---

## 7. 执行代理分工

| 任务 | 代理 | 理由 |
|------|------|------|
| TASK-001 | backend-implementer | DB Schema + 路由常量 + Zod Schema，基础设施层 |
| TASK-002 | backend-implementer | OpenAPI 路径定义，后端文档层 |
| TASK-003 | backend-implementer | 通用缓存服务，后端技术组件 |
| TASK-004 | backend-implementer | Admin AI 配置（后端+前端），参考现有 site-settings 模式 |
| TASK-005 | frontend-implementer | Web 编辑器文件导入，纯前端 |
| TASK-006 | backend-implementer | AI 摘要后端，核心业务逻辑 |
| TASK-007 | backend-implementer | AI 排版后端，复用 TASK-006 模式 |
| TASK-008 | frontend-implementer | AI 摘要前端集成 |
| TASK-009 | frontend-implementer | AI 排版前端集成 |
| TASK-010 | backend-implementer | 移除硬编码敏感词，后端清理 |
| TEST-001 | backend-test-worker | TASK-001/002 后端基础设施测试 |
| TEST-002 | backend-test-worker | TASK-003 缓存服务 TDD 重构验证 |
| TEST-003 | frontend-test-worker | TASK-005 文件导入前端测试 |
| TEST-004 | backend-test-worker | TASK-004 Admin 配置后端 TDD 重构验证 |
| TEST-005 | frontend-test-worker | TASK-004 Admin 配置前端测试 |
| TEST-006 | backend-test-worker | TASK-006 AI 摘要 TDD 重构验证 |
| TEST-007 | backend-test-worker | TASK-007 AI 排版 TDD 重构验证 |
| TEST-008 | frontend-test-worker | TASK-008/009 AI 前端集成测试 |
| TEST-009 | backend-test-worker | TASK-010 敏感词移除后审核流程验证 |
| TEST-010 | e2e-test-worker | E2E 端到端测试 |

---

## 8. 共享区域改动归属

| 共享文件 | 责任任务 | 说明 |
|---------|---------|------|
| `packages/db/src/schema.ts` | TASK-001 | posts 表新增 AI 字段 |
| `packages/db/drizzle/` 迁移文件 | TASK-001 | Drizzle 迁移 |
| `packages/shared/src/index.ts` | TASK-001 | API_ROUTES + APP_ROUTES 新增 |
| `packages/schemas/src/ai.ts`（新建） | TASK-001 | AI Zod schema |
| `packages/schemas/src/index.ts` | TASK-001 | 导出 ai.ts |
| `apps/server/src/app.ts` | TASK-001 | 注册 aiRoute |
| `apps/server/src/openapi/paths/index.ts` | TASK-002 | 注册 aiPaths |
| `apps/server/src/modules/ai/ai.service.ts` | TASK-006（先）→ TASK-007（后） | 串行共享 |
| `apps/server/src/modules/ai/ai.route.ts` | TASK-004（先）→ TASK-006（中）→ TASK-007（后） | 串行共享 |
| `apps/web/src/routes/publish-article-page.tsx` | TASK-005（先）→ TASK-008（中）→ TASK-009（后） | 串行共享 |
| `apps/web/src/lib/api-client.ts` | TASK-008（先）→ TASK-009（后） | 串行共享 |

---

## 9. 并行 / 串行策略

### 依赖关系图

```
TASK-001 ──┬── TASK-004 ──┬── TASK-006 ──┬── TASK-008
           │              │              └── TASK-007 ──┬── TASK-009
           │              │                            │
TASK-002 ──┘              │                            │
                          │                            │
TASK-003 ─────────────────┘                            │
                                                       │
TASK-005（独立，可随时并行）                              │
                                                       │
TASK-010（独立，可随时并行）                              │
```

### 串行约束

| 约束 | 原因 |
|------|------|
| TASK-006 → TASK-007 | 共享 `ai.service.ts` 和 `ai.route.ts` |
| TASK-005 → TASK-008 → TASK-009 | 共享 `publish-article-page.tsx` |
| TASK-008 → TASK-009 | 共享 `api-client.ts` |
| TASK-004 → TASK-006 | TASK-006 依赖 TASK-004 提供的 AI 配置 |

### 并行安全组

| Batch | 可并行任务 | 说明 |
|-------|-----------|------|
| Batch 1 | TASK-001, TASK-002, TASK-003, TASK-005, TASK-010 | 无共享文件冲突 |
| Batch 2 | TEST-001, TEST-002, TEST-003 | 测试文件独立 |
| Batch 3 | TASK-004, TASK-006 | 不同模块，无冲突 |
| Batch 5 | TEST-006, TEST-007, TEST-008, TEST-009 | 测试文件独立 |

---

## 10. 风险提醒

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| TASK-001 共享区域变更阻塞后续任务 | 高 | 必须最先完成，变更需 review |
| TASK-006/007 共享文件冲突 | 高 | 严格串行，TASK-007 必须等 TASK-006 完成 |
| LLM API 超时/不可用 | 中 | TDD 覆盖失败路径，返回 502 友好错误 |
| Redis 不可用时缓存降级 | 中 | TASK-003 实现自动降级，TDD 覆盖三种路径 |
| `publish-article-page.tsx` 多任务修改 | 中 | Batch 顺序保证 TASK-005 → TASK-008 → TASK-009 |
| mammoth.js 大文件 UI 卡顿 | 低 | 10MB 文件大小限制缓解 |

### 垂直切片检查

所有任务均为垂直切片：
- TASK-001/002：基础设施层，但为所有后续功能提供完整基座
- TASK-003：独立技术组件，端到端可测试
- TASK-004：后端+前端完整功能路径（Admin 配置页面）
- TASK-005：纯前端完整功能（文件导入→编辑器注入）
- TASK-006/008：摘要功能完整路径（后端 API → 前端集成）
- TASK-007/009：排版功能完整路径（后端 API → 前端集成）
- TASK-010：清理任务，独立完整

**无水平切片问题。**

### 变更规模控制

| Batch | 预估行数 | 状态 |
|-------|---------|------|
| Batch 1 | ~590 行 | 合规 |
| Batch 2 | ~250 行 | 合规 |
| Batch 3 | ~700 行 | 合规 |
| Batch 4 | ~350 行 | 合规 |
| Batch 5 | ~500 行 | 合规 |
| Batch 6 | ~200 行 | 合规 |
| **总计** | **~2590 行** | 单 Batch 均 < 1000 行 |

---

## 11. 实现者交接信息

### 后端实现者

- 现有 `site-settings` 模块是 TASK-004 的参考模板（`site-settings.repo.ts` / `site-settings.service.ts` / `site-settings.route.ts`）
- AI 配置存储在 `site_settings` 表的 JSON 字段中，与 `moderationModes` 同理
- LLM 调用统一使用 OpenAI 兼容 `/chat/completions` 格式
- Redis 缓存使用 `cache-service.ts`（TASK-003 产出），不直接操作 Redis client

### 前端实现者

- 编辑器使用 wangEditor 5，集成点在 `publish-article-page.tsx`
- Admin 前端使用 Ant Design 6，参考现有 `site-settings` 页面模式
- API 客户端在 `apps/web/src/lib/api-client.ts`

---

## 12. parallel_batches

### Batch 1（无依赖，可同时启动）

- **TASK-001** → subagent_type: `backend-implementer`
  - 共享基础设施（DB Schema + 路由常量 + Zod Schema）
- **TASK-002** → subagent_type: `backend-implementer`
  - OpenAPI 文档注册
- **TASK-003** → subagent_type: `backend-implementer`
  - Redis 读穿缓存服务（TDD Red + Green）
- **TASK-005** → subagent_type: `frontend-implementer`
  - 编辑器文件导入（纯前端）
- **TASK-010** → subagent_type: `backend-implementer`
  - 移除硬编码敏感词

**预估变更：** ~590 行
**依赖：** 无

---

### Batch 2（依赖 Batch 1 完成）

- **TEST-001** → subagent_type: `backend-test-worker`
  - TASK-001/002 后端基础设施验证测试
- **TEST-002** → subagent_type: `backend-test-worker`
  - TASK-003 缓存服务 TDD Refactor 阶段验证
- **TEST-003** → subagent_type: `frontend-test-worker`
  - TASK-005 文件导入前端测试

**预估变更：** ~250 行
**依赖：** Batch 1 全部完成

---

### Batch 3（依赖 Batch 2 完成）

- **TASK-004** → subagent_type: `backend-implementer`
  - Admin AI 配置（后端 TDD Red+Green + 前端实现）
- **TASK-006** → subagent_type: `backend-implementer`
  - AI 摘要后端（TDD Red + Green）

**预估变更：** ~700 行
**依赖：** Batch 2 完成（TASK-001 的 schema/路由/schema 已就绪）
**并行安全：** TASK-004 和 TASK-006 修改不同模块目录，无冲突

---

### Batch 4（依赖 Batch 3 完成）

- **TEST-004** → subagent_type: `backend-test-worker`
  - TASK-004 Admin 配置后端 TDD Refactor 验证
- **TEST-005** → subagent_type: `frontend-test-worker`
  - TASK-004 Admin 配置前端测试
- **TEST-006** → subagent_type: `backend-test-worker`
  - TASK-006 AI 摘要 TDD Refactor 验证
- **TASK-007** → subagent_type: `backend-implementer`
  - AI 排版后端（TDD Red + Green）— 必须在 TASK-006 之后

**预估变更：** ~700 行
**依赖：** Batch 3 完成（TASK-006 的 ai.service.ts / ai.route.ts 已就绪）
**串行约束：** TASK-007 必须等 TASK-006 完成（共享 ai.service.ts 和 ai.route.ts）

---

### Batch 5（依赖 Batch 4 完成）

- **TEST-007** → subagent_type: `backend-test-worker`
  - TASK-007 AI 排版 TDD Refactor 验证
- **TEST-008** → subagent_type: `frontend-test-worker`
  - TASK-008/009 AI 前端集成测试
- **TEST-009** → subagent_type: `backend-test-worker`
  - TASK-010 敏感词移除后审核流程验证
- **TASK-008** → subagent_type: `frontend-implementer`
  - AI 摘要前端集成
- **TASK-009** → subagent_type: `frontend-implementer`
  - AI 排版前端集成

**预估变更：** ~500 行
**依赖：** Batch 4 完成（TASK-006/007 后端 API 已就绪）
**串行约束：** TASK-008 先完成，TASK-009 后执行（共享 publish-article-page.tsx 和 api-client.ts）

---

### Batch 6（依赖 Batch 5 全部测试通过）

- **TEST-010** → subagent_type: `e2e-test-worker`
  - E2E 端到端测试（AI 摘要生成、AI 排版、文件导入、管理后台配置）

**预估变更：** ~200 行
**依赖：** Batch 5 全部完成且测试通过

---

## 13. Execution Packets

---

### task_id: TASK-001
### task_name: 共享基础设施 -- DB Schema + 路由常量 + Zod Schema
### requirement_ids: REQ-003, REQ-004, REQ-005, REQ-007
### owner: backend-implementer
### objective: 建立 AI 模块的全部共享基础设施，包括数据库字段、路由常量、Zod schema，为后续所有 AI 任务提供基座
### in_scope:
1. `packages/db/src/schema.ts` postsTable 新增 `aiSummary`、`aiSummaryGeneratedAt`、`aiFormattedAt` 三个字段
2. 生成 Drizzle 迁移文件（仅 ALTER TABLE，无物理外键）
3. `packages/shared/src/index.ts` API_ROUTES 新增 `ai` 命名空间，APP_ROUTES 新增 `adminAiSettings`
4. `packages/schemas/src/ai.ts` 新建，定义全部 AI 相关 Zod schema
5. `packages/schemas/src/index.ts` 新增导出
6. `apps/server/src/app.ts` 预留 aiRoute 注册位
7. DB 迁移本地验证通过
### out_of_scope:
- 不实现任何 AI 业务逻辑
- 不创建 ai.service.ts / ai.route.ts 实际内容（仅 app.ts 预留注册位）
- 不修改 OpenAPI 路径（TASK-002 负责）
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（2.3~2.5 接口规格、3.3 数据库变更）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-001）
### allowed_paths:
- `packages/db/src/schema.ts`
- `packages/db/drizzle/`（迁移文件）
- `packages/shared/src/index.ts`
- `packages/schemas/src/ai.ts`（新建）
- `packages/schemas/src/index.ts`
- `apps/server/src/app.ts`
### forbidden_paths:
- `apps/server/src/openapi/`（TASK-002 负责）
- `apps/server/src/modules/ai/`（后续任务负责）
### dependencies: 无
### parallel_group: [TASK-002, TASK-003, TASK-005, TASK-010]
### wait_for: 无
### acceptance_criteria:
1. `packages/db/src/schema.ts` postsTable 包含 `aiSummary`(text)、`aiSummaryGeneratedAt`(timestamp)、`aiFormattedAt`(timestamp) 三个字段
2. Drizzle 迁移文件生成且本地 `bun run db:migrate` 通过
3. `API_ROUTES.ai.summary`、`API_ROUTES.ai.format`、`API_ROUTES.ai.adminSettings` 常量存在且值正确
4. `APP_ROUTES.adminAiSettings` 值为 `/admin/settings/ai`
5. `packages/schemas/src/ai.ts` 导出 AI 摘要请求/响应、AI 排版请求/响应、AI 配置的 Zod schema
6. `apps/server/src/app.ts` 有 aiRoute import 和注册代码（可注释或条件编译）
7. `bun run typecheck` 通过
### test_strategy: test_after
### handoff_notes: 本任务是所有后续 AI 任务的基座，必须最先完成。schema 变更需确保不破坏现有测试。
### escalation_rule: 如需变更现有表结构（非新增字段），必须先回主 Build Agent

---

### task_id: TASK-002
### task_name: AI 模块 OpenAPI 路径定义与注册
### requirement_ids: REQ-002, REQ-003, REQ-004, REQ-005
### owner: backend-implementer
### objective: 定义 AI 模块全部 API 的 OpenAPI 路径描述并注册到文档中
### in_scope:
1. `apps/server/src/openapi/paths/ai.ts` 新建，定义 `/api/v1/ai/summary`、`/api/v1/ai/format`、`/api/v1/admin/ai/settings`（GET/PUT）的 OpenAPI 路径
2. `apps/server/src/openapi/paths/index.ts` 新增 `aiPaths` 导入与合并
3. `apps/server/tests/openapi.test.ts` 验证新增路径
4. OpenAPI 文档生成无报错
### out_of_scope:
- 不实现 API handler（后续任务负责）
- 不修改 DB schema（TASK-001 负责）
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（2.1~2.5 接口规格）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-002）
### allowed_paths:
- `apps/server/src/openapi/paths/ai.ts`（新建）
- `apps/server/src/openapi/paths/index.ts`
- `apps/server/tests/openapi.test.ts`
### forbidden_paths:
- `packages/db/`、`packages/shared/`、`packages/schemas/`（TASK-001 负责）
- `apps/server/src/modules/ai/`（后续任务负责）
### dependencies: 无
### parallel_group: [TASK-001, TASK-003, TASK-005, TASK-010]
### wait_for: 无
### acceptance_criteria:
1. `apps/server/src/openapi/paths/ai.ts` 存在且导出 `aiPaths`
2. 4 个 API 路径均有完整的 OpenAPI 描述（参数、响应、错误码）
3. `apps/server/tests/openapi.test.ts` 新增用例验证 AI 路径出现在文档中
4. `bun run test -- --filter openapi` 通过
### test_strategy: test_after
### handoff_notes: OpenAPI 路径定义是 TASK-006/007 实现 handler 的契约基础。
### escalation_rule: 如需变更 API 路径前缀或新增非计划内路由，必须先回主 Build Agent

---

### task_id: TASK-003
### task_name: 通用缓存服务 -- getOrSet 读穿模式 + 降级
### requirement_ids: REQ-007
### owner: backend-implementer
### objective: 实现通用 CacheService，封装 Redis 读穿缓存模式，支持自动降级
### in_scope:
1. `apps/server/src/lib/cache-service.ts` 新建，导出 `CacheService` 类
2. `getOrSet<T>(key, ttlSeconds, fetchFn)` 方法：先查 Redis，未命中调 fetchFn 并写回
3. `invalidate(key)` 方法：主动清除缓存
4. Redis 不可用时自动降级：跳过缓存读写，直接调 fetchFn，记录 WARN 日志
5. TDD Red+Green：先写测试覆盖命中/未命中/降级三种路径
### out_of_scope:
- 不修改现有 `redis-client.ts`
- 不重构现有 API 的 Redis 用法（精准修改原则）
- 不实现 AI 摘要的具体缓存逻辑（TASK-006 负责）
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（4.3 Redis 使用规范）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-003）
### allowed_paths:
- `apps/server/src/lib/cache-service.ts`（新建）
- `apps/server/tests/cache-service.test.ts`（新建）
### forbidden_paths:
- `apps/server/src/lib/redis-client.ts`（不修改现有 Redis 客户端）
- `packages/`（TASK-001 负责）
### dependencies: 无（仅复用现有 redis-client.ts 导出）
### parallel_group: [TASK-001, TASK-002, TASK-005, TASK-010]
### wait_for: 无
### acceptance_criteria:
1. `CacheService` 类导出 `getOrSet` 和 `invalidate` 方法
2. 缓存命中路径：Redis 有值时直接返回，不调用 fetchFn
3. 缓存未命中路径：调用 fetchFn，结果写入 Redis 并返回
4. Redis 不可用降级路径：跳过缓存，直接调 fetchFn，记录 WARN 日志
5. 单元测试 mock Redis client，三种路径全部覆盖
6. `bun run test -- --filter cache-service` 通过
### test_strategy: tdd
### handoff_notes: 本任务产出的 CacheService 将被 TASK-004（AI 配置缓存）和 TASK-006（摘要缓存）使用。TDD Refactor 阶段在 Batch 2 的 TEST-002 中完成。
### escalation_rule: 无需变更共享区域

---

### task_id: TASK-004
### task_name: Admin AI 设置 -- 后端 CRUD + 前端配置页面
### requirement_ids: REQ-002
### owner: backend-implementer
### objective: 实现管理后台 AI 配置的完整功能路径：后端 API + 前端配置页面
### in_scope:
1. `apps/server/src/modules/ai/ai-settings.repo.ts`：读写 site_settings 表中 `aiSettings` JSON 字段
2. `apps/server/src/modules/ai/ai-settings.service.ts`：解析配置优先级（后台 > 环境变量 > 默认值），提供 `getAiSettings()`、`updateAiSettings()`、`testConnection()`
3. `apps/server/src/modules/ai/ai.route.ts`：注册 GET/PUT `/api/v1/admin/ai/settings`，`requireAdmin` 中间件
4. API Key 脱敏显示（`sk-****...ab12`）
5. "测试连接"端点：用当前配置调用 LLM API（简单 chat/completions），返回成功/失败
6. `apps/admin/src/features/ai/ai-settings-page.tsx`：Provider 下拉、API Key 密码输入、Base URL、模型输入框、功能开关 Switch、测试连接按钮
7. `apps/admin/src/lib/admin-routes.ts` 新增 `aiSettings` 路径
8. Admin shell 导航新增"AI 设置"入口
9. 后端 TDD Red+Green：配置读写、优先级解析、脱敏、测试连接
### out_of_scope:
- 不实现 AI 摘要/排版功能（TASK-006/007 负责）
- 不修改 `packages/` 共享区域（TASK-001 已完成）
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（2.5 管理后台配置接口规格、REQ-002）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-004）
### allowed_paths:
- `apps/server/src/modules/ai/ai-settings.repo.ts`（新建）
- `apps/server/src/modules/ai/ai-settings.service.ts`（新建）
- `apps/server/src/modules/ai/ai.route.ts`（新建）
- `apps/server/tests/ai-settings.test.ts`（新建）
- `apps/admin/src/features/ai/ai-settings-page.tsx`（新建）
- `apps/admin/src/lib/admin-routes.ts`
- `apps/admin/src/`（shell 导航、路由注册）
### forbidden_paths:
- `packages/db/`、`packages/shared/`、`packages/schemas/`（TASK-001 负责）
- `apps/server/src/modules/ai/ai.service.ts`（TASK-006 负责创建）
- `apps/web/`（前端 Web 任务负责）
### dependencies: TASK-001（schema + 路由常量 + Zod schema）
### parallel_group: [TASK-006]（不同模块目录，无冲突）
### wait_for: [TASK-001]
### acceptance_criteria:
1. GET `/api/v1/admin/ai/settings` 返回 AI 配置（API Key 脱敏）
2. PUT `/api/v1/admin/ai/settings` 保存配置，即时生效
3. 配置优先级正确：后台配置 > 环境变量 > 内置默认值
4. 测试连接端点成功/失败两种路径均正常
5. Admin 前端页面可正常显示和保存配置
6. 功能开关关闭后，前端对应按钮不显示
7. 后端 TDD 测试覆盖：配置读写、优先级解析、脱敏、测试连接
8. `bun run test -- --filter ai-settings` 通过
### test_strategy: tdd
### handoff_notes: ai.route.ts 在此任务创建，TASK-006/007 将在此文件中追加路由。后端 TDD Refactor 在 Batch 4 的 TEST-004 中完成，前端测试在 TEST-005 中完成。
### escalation_rule: 如需变更 site_settings 表结构或新增非计划内配置项，必须先回主 Build Agent

---

### task_id: TASK-005
### task_name: Web 编辑器文件导入 -- docx/md/txt
### requirement_ids: REQ-001
### owner: frontend-implementer
### objective: 实现编辑器文件导入功能，支持 docx/md/txt 三种格式的浏览器端解析并注入 wangEditor
### in_scope:
1. `apps/web/src/features/ai/import-file-button.tsx` 新建，文件导入按钮组件
2. 文件选择器 accept 限制 `.docx`、`.md`、`.txt`
3. `.docx` 通过 `mammoth.js` 解析为 HTML
4. `.md` 通过 `marked` 解析为 HTML
5. `.txt` 读取纯文本，包裹 `<p>` 标签
6. 所有解析结果经过 `DOMPurify.sanitize()` 消毒
7. 文件大小限制 10MB，超过提示"文件过大，请缩减内容后重试"
8. 解析失败时显示友好错误 toast，不崩溃编辑器
9. 导入内容插入到编辑器光标位置（或追加到末尾）
10. 集成到 `publish-article-page.tsx` 编辑器工具栏区域
11. 新增依赖：`mammoth`、`marked`、`dompurify`
### out_of_scope:
- 不上传文件到服务器（仅浏览器端解析）
- 不实现 AI 摘要/排版功能
- 不修改后端代码
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（REQ-001）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-005）
### allowed_paths:
- `apps/web/src/features/ai/import-file-button.tsx`（新建）
- `apps/web/src/routes/publish-article-page.tsx`
- `apps/web/package.json`
### forbidden_paths:
- `apps/server/`（不涉及后端）
- `apps/admin/`（不涉及管理端）
- `packages/`（不涉及共享包）
### dependencies: 无
### parallel_group: [TASK-001, TASK-002, TASK-003, TASK-010]
### wait_for: 无
### acceptance_criteria:
1. 编辑器工具栏出现"导入文件"按钮
2. 点击弹出文件选择器，仅接受 .docx/.md/.txt
3. .docx 文件正确解析为 HTML 并注入编辑器
4. .md 文件正确解析为 HTML 并注入编辑器
5. .txt 文件正确包裹 <p> 标签并注入编辑器
6. 所有内容经过 DOMPurify 消毒
7. 超过 10MB 文件显示错误提示
8. 解析失败显示友好 toast，编辑器不受影响
9. 导入内容追加到光标位置或末尾
### test_strategy: test_after
### handoff_notes: 本任务修改 `publish-article-page.tsx` 的工具栏区域，TASK-008/009 将修改摘要/排版区域，不同区域可安全合并。
### escalation_rule: 无需变更共享区域

---

### task_id: TASK-006
### task_name: AI 摘要后端 -- API + 缓存 + LLM 调用
### requirement_ids: REQ-003
### owner: backend-implementer
### objective: 实现 AI 文章摘要生成的完整后端逻辑：缓存三层路径 + LLM API 调用 + 频率限制
### in_scope:
1. `apps/server/src/modules/ai/ai.service.ts` 新建，封装 LLM 调用逻辑
2. `generateSummary(postId, content?)` 方法：Redis 缓存 → DB 查询 → LLM API 生成
3. 生成前裁剪内容至 4000 字符，摘要控制在 150-300 字
4. 生成后写入 `posts.ai_summary` + `posts.ai_summary_generated_at` + Redis 缓存（TTL 24h）
5. 功能开关检查：关闭时返回 403
6. 频率限制：每文章每 24h 仅允许重新生成一次（缓存命中除外）
7. AI API 超时 30s，异常返回 502
8. `ai.route.ts` 追加 `POST /api/v1/ai/summary` handler
9. TDD Red+Green：覆盖缓存命中、DB 有值、LLM 生成、功能开关关闭、频率限制、API 失败
### out_of_scope:
- 不实现 AI 排版功能（TASK-007 负责）
- 不实现前端集成（TASK-008 负责）
- 不创建 ai-settings 相关代码（TASK-004 已完成）
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（2.3 AI 摘要接口规格、REQ-003）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-006）
### allowed_paths:
- `apps/server/src/modules/ai/ai.service.ts`（新建）
- `apps/server/src/modules/ai/ai.route.ts`（追加路由）
- `apps/server/tests/ai-summary.test.ts`（新建）
### forbidden_paths:
- `packages/`（TASK-001 负责）
- `apps/server/src/lib/cache-service.ts`（TASK-003 已完成，仅使用不修改）
- `apps/server/src/modules/ai/ai-settings.*`（TASK-004 已完成，仅使用不修改）
### dependencies: TASK-001（schema + 路由）、TASK-003（cache-service）、TASK-004（AI 配置 + ai.route.ts 已创建）
### parallel_group: [TASK-004]（不同模块目录，无冲突）
### wait_for: [TASK-001, TASK-003, TASK-004]
### acceptance_criteria:
1. 缓存命中路径：Redis 有值时直接返回，不调用 LLM
2. DB 有值路径：DB 有 ai_summary 但 Redis 无值时，写回 Redis 并返回
3. LLM 生成路径：DB 无值时调用 LLM API，结果写入 DB + Redis
4. 功能开关关闭时返回 403 + "AI 摘要功能已关闭"
5. 频率限制：24h 内重复请求返回 429
6. API 失败返回 502 + "AI 服务暂时不可用，请稍后重试"
7. 摘要长度 150-300 字
8. TDD 测试覆盖全部 6 种路径
9. `bun run test -- --filter ai-summary` 通过
### test_strategy: tdd
### handoff_notes: ai.service.ts 在此任务创建，TASK-007 将追加 formatContent 方法。TDD Refactor 在 Batch 4 的 TEST-006 中完成。
### escalation_rule: 如需变更 posts 表结构或 Redis key 格式，必须先回主 Build Agent

---

### task_id: TASK-007
### task_name: AI 排版后端 -- beautify + structure 两种模式
### requirement_ids: REQ-004, REQ-005
### owner: backend-implementer
### objective: 在已有 ai.service.ts 基础上追加排版功能，支持 beautify 和 structure 两种模式
### in_scope:
1. `ai.service.ts` 追加 `formatContent(content, mode)` 方法
2. `mode: "beautify"`：优化段落分割、标点规范、中英文空格、列表格式
3. `mode: "structure"`：识别语义 → 拆分标题层级（h2/h3）+ 段落 + 列表
4. 输入最大 8000 字符，超出返回 400
5. 返回格式化 HTML + changes 数组
6. 功能开关检查：关闭时返回 403
7. AI API 失败返回 502
8. `ai.route.ts` 追加 `POST /api/v1/ai/format` handler
9. TDD Red+Green：beautify 输入输出、structure 输入输出、输入过大、功能开关、API 失败
### out_of_scope:
- 不修改 ai.service.ts 中已有的摘要逻辑
- 不实现前端集成（TASK-009 负责）
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（2.4 AI 排版接口规格、REQ-004、REQ-005）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-007）
### allowed_paths:
- `apps/server/src/modules/ai/ai.service.ts`（追加方法）
- `apps/server/src/modules/ai/ai.route.ts`（追加路由）
- `apps/server/tests/ai-format.test.ts`（新建）
### forbidden_paths:
- `packages/`（TASK-001 负责）
- `apps/server/src/lib/cache-service.ts`（TASK-003 产出，仅使用不修改）
- `apps/server/src/modules/ai/ai-settings.*`（TASK-004 产出，仅使用不修改）
- `apps/server/tests/ai-summary.test.ts`（TASK-006 的测试，不修改）
### dependencies: TASK-001（schema）、TASK-003（cache-service）、TASK-004（AI 配置）、TASK-006（ai.service.ts / ai.route.ts 已存在）
### parallel_group: 无（必须在 TASK-006 之后串行）
### wait_for: [TASK-006]
### acceptance_criteria:
1. beautify 模式：输入原始 HTML，返回优化后的 HTML + changes 数组
2. structure 模式：输入原始 HTML，返回结构化 HTML（含 h2/h3 标题层级）+ changes 数组
3. 输入超过 8000 字符返回 400
4. 功能开关关闭返回 403
5. AI API 失败返回 502
6. TDD 测试覆盖 beautify、structure、输入过大、功能开关、API 失败
7. `bun run test -- --filter ai-format` 通过
### test_strategy: tdd
### handoff_notes: 必须在 TASK-006 完成后执行，因为共享 ai.service.ts 和 ai.route.ts。仅追加代码，不修改已有摘要逻辑。TDD Refactor 在 Batch 5 的 TEST-007 中完成。
### escalation_rule: 如需变更 API 请求/响应格式，必须先回主 Build Agent

---

### task_id: TASK-008
### task_name: Web 端 AI 摘要按钮与展示
### requirement_ids: REQ-003
### owner: frontend-implementer
### objective: 在 Web 端发布页和详情页集成 AI 摘要功能：按钮 + 展示面板 + API 调用
### in_scope:
1. `apps/web/src/features/ai/use-ai-summary.ts` 新建，React hook 封装摘要 API（useMutation）
2. `apps/web/src/features/ai/ai-summary-panel.tsx` 新建，摘要展示面板（摘要文本 + "AI 生成"标注 + 重新生成按钮）
3. 发布页新增"AI 生成摘要"按钮，点击调用 API 并填充摘要字段
4. 文章详情页新增"AI 生成摘要"按钮，点击展示摘要面板
5. 加载状态：按钮显示 loading spinner
6. 错误处理：toast 提示
7. 功能开关：后端返回 403 时隐藏按钮
8. `apps/web/src/lib/api-client.ts` 新增 `generateAiSummary()` 方法
### out_of_scope:
- 不实现 AI 排版前端（TASK-009 负责）
- 不修改后端代码
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（REQ-003）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-008）
### allowed_paths:
- `apps/web/src/features/ai/use-ai-summary.ts`（新建）
- `apps/web/src/features/ai/ai-summary-panel.tsx`（新建）
- `apps/web/src/routes/publish-article-page.tsx`（追加摘要区域）
- `apps/web/src/lib/api-client.ts`（追加方法）
- 文章详情页组件
### forbidden_paths:
- `apps/server/`（不涉及后端）
- `apps/admin/`（不涉及管理端）
- `packages/`（不涉及共享包）
### dependencies: TASK-006（后端 AI 摘要 API 就绪）
### parallel_group: 无（必须在 TASK-005 之后，因共享 publish-article-page.tsx）
### wait_for: [TASK-006]
### acceptance_criteria:
1. 发布页和详情页均有"AI 生成摘要"按钮
2. 点击按钮调用后端 API，返回摘要并展示
3. 摘要面板显示"AI 生成"标注和重新生成按钮
4. 加载中显示 spinner
5. 错误时 toast 提示
6. 后端返回 403 时按钮隐藏或禁用
7. `bun run typecheck` 通过
### test_strategy: test_after
### handoff_notes: 修改 publish-article-page.tsx 的摘要区域（非工具栏），与 TASK-005 的工具栏修改不冲突。api-client.ts 的新增方法需注意不与 TASK-009 冲突。
### escalation_rule: 无需变更共享区域

---

### task_id: TASK-009
### task_name: Web 端 AI 排版按钮 -- beautify + structure
### requirement_ids: REQ-004, REQ-005
### owner: frontend-implementer
### objective: 在 Web 端编辑器集成 AI 排版功能：下拉按钮 + beautify/structure 两种模式
### in_scope:
1. `apps/web/src/features/ai/use-ai-format.ts` 新建，React hook 封装排版 API
2. `apps/web/src/features/ai/ai-format-button.tsx` 新建，"AI 排版"下拉按钮（"美化选中内容" + "全文结构化"）
3. beautify 模式：获取选中 HTML → 调用 API → 替换选中区域；未选中时提示
4. structure 模式：获取全部 HTML → 确认对话框 → 调用 API → 替换全部内容
5. 空内容时提示"请先输入内容"
6. 加载状态：按钮 loading，编辑器临时禁用
7. 失败处理：保留原文，弹出错误 toast
8. 功能开关：后端关闭时按钮不显示
9. 集成到 publish-article-page.tsx 编辑器工具栏
10. `apps/web/src/lib/api-client.ts` 新增 `formatAiContent()` 方法
### out_of_scope:
- 不修改后端代码
- 不修改 AI 摘要前端（TASK-008 已完成）
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（REQ-004、REQ-005）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-009）
### allowed_paths:
- `apps/web/src/features/ai/use-ai-format.ts`（新建）
- `apps/web/src/features/ai/ai-format-button.tsx`（新建）
- `apps/web/src/routes/publish-article-page.tsx`（追加工具栏按钮）
- `apps/web/src/lib/api-client.ts`（追加方法）
### forbidden_paths:
- `apps/server/`（不涉及后端）
- `apps/admin/`（不涉及管理端）
- `packages/`（不涉及共享包）
- `apps/web/src/features/ai/use-ai-summary.ts`（TASK-008 产出，不修改）
- `apps/web/src/features/ai/ai-summary-panel.tsx`（TASK-008 产出，不修改）
### dependencies: TASK-007（后端 AI 排版 API 就绪）
### parallel_group: 无（必须在 TASK-008 之后，因共享 publish-article-page.tsx 和 api-client.ts）
### wait_for: [TASK-007, TASK-008]
### acceptance_criteria:
1. 编辑器工具栏出现"AI 排版"下拉按钮
2. "美化选中内容"：选中 HTML → API 调用 → 替换选中区域
3. "全文结构化"：全部 HTML → 确认对话框 → API 调用 → 替换全部内容
4. 未选中内容时提示"请先选中需要排版的内容"
5. 空内容时提示"请先输入内容"
6. 失败时保留原文，弹出错误 toast
7. 功能开关关闭时按钮不显示
8. `bun run typecheck` 通过
### test_strategy: test_after
### handoff_notes: 必须在 TASK-008 之后执行，因共享 publish-article-page.tsx 和 api-client.ts。建议 TASK-008 先完成后再开始本任务。
### escalation_rule: 无需变更共享区域

---

### task_id: TASK-010
### task_name: 删除本地敏感词过滤，统一使用七牛 AI 审核
### requirement_ids: REQ-006
### owner: backend-implementer
### objective: 移除硬编码敏感词过滤逻辑，使帖子审核完全依赖七牛 AI 审核
### in_scope:
1. 删除 `apps/server/src/modules/posts/posts-sensitive-filter.ts`
2. `posts-write-moderation.ts`：删除 `inspectPostWriteContent` 函数及相关类型
3. `posts-write-service.ts`：移除 3 处 `inspectPostWriteContent` 调用
4. `posts.route.ts`：移除 3 处 `sensitive_content` 错误响应分支
5. `apps/server/tests/posts.test.ts`：适配 3 个敏感词相关测试用例
6. 审核流程验证：`pending → ai审核 → published/rejected/manual_review` 正常
### out_of_scope:
- 不修改七牛 AI 审核逻辑（`text-moderation.service.ts`）
- 不新增敏感词功能
### input_documents:
- `docs/requirements/2026-05-06-ai-features-requirements.md`（REQ-006）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-010）
### allowed_paths:
- `apps/server/src/modules/posts/posts-sensitive-filter.ts`（删除）
- `apps/server/src/modules/posts/posts-write-moderation.ts`
- `apps/server/src/modules/posts/posts-write-service.ts`
- `apps/server/src/modules/posts/posts.route.ts`
- `apps/server/tests/posts.test.ts`
### forbidden_paths:
- `apps/server/src/modules/posts/text-moderation.service.ts`（七牛审核逻辑，不修改）
- `packages/`（不涉及共享包）
- `apps/web/`、`apps/admin/`（不涉及前端）
### dependencies: 无
### parallel_group: [TASK-001, TASK-002, TASK-003, TASK-005]
### wait_for: 无
### acceptance_criteria:
1. `posts-sensitive-filter.ts` 文件已删除
2. `posts-write-moderation.ts` 中无 `inspectPostWriteContent` 引用
3. `posts-write-service.ts` 中无 `inspectPostWriteContent` 调用
4. `posts.route.ts` 中无 `sensitive_content` 错误分支
5. 测试用例适配后全部通过
6. 审核流程 `pending → ai审核 → published/rejected/manual_review` 正常
7. `bun run typecheck` 和 `bun run test -- --filter posts` 通过
### test_strategy: test_after
### handoff_notes: 删除代码需谨慎，确保七牛 AI 审核能独立承担审核职责。测试适配需验证审核流程完整性。
### escalation_rule: 无需变更共享区域

---

## 14. 测试任务定义

---

### task_id: TEST-001
### task_name: 后端基础设施验证测试
### requirement_ids: REQ-003, REQ-004, REQ-005, REQ-007
### owner: backend-test-worker
### objective: 验证 TASK-001/002 的基础设施变更正确且不破坏现有功能
### in_scope:
1. 验证 posts 表新增字段可通过 Drizzle ORM 正确读写
2. 验证 API_ROUTES.ai 常量值正确
3. 验证 APP_ROUTES.adminAiSettings 值正确
4. 验证 AI Zod schema 可正确解析合法/非法输入
5. 验证 OpenAPI 文档包含新增 AI 路径
6. 验证现有测试不受影响
### out_of_scope: 不测试 AI 业务逻辑
### allowed_paths:
- `apps/server/tests/`（新增测试文件）
### forbidden_paths:
- `packages/`（不修改共享包）
- `apps/server/src/`（不修改源码）
### dependencies: TASK-001, TASK-002
### acceptance_criteria:
1. 新增字段读写测试通过
2. 路由常量值断言正确
3. Zod schema 验证测试通过
4. OpenAPI 路径测试通过
5. 现有测试套件全部通过
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-002
### task_name: 缓存服务 TDD Refactor 验证
### requirement_ids: REQ-007
### owner: backend-test-worker
### objective: 验证 TASK-003 的 CacheService 在 Refactor 阶段的代码质量和边界条件
### in_scope:
1. 补充边界条件测试（空 key、负 TTL、null fetchFn 返回值）
2. 验证 Redis 连接超时降级路径
3. 验证并发场景下的缓存一致性
4. 代码质量检查：类型安全、错误处理、日志记录
### out_of_scope: 不修改实现代码
### allowed_paths:
- `apps/server/tests/cache-service.test.ts`
### forbidden_paths:
- `apps/server/src/lib/cache-service.ts`
### dependencies: TASK-003
### acceptance_criteria:
1. 边界条件测试全部通过
2. 降级路径测试通过
3. 代码符合项目规范（嵌套 <=4 层、无 push/splice 等）
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-003
### task_name: 文件导入前端测试
### requirement_ids: REQ-001
### owner: frontend-test-worker
### objective: 验证 TASK-005 的文件导入功能在各种场景下的正确性
### in_scope:
1. 验证 .docx/.md/.txt 三种格式解析正确
2. 验证 DOMPurify 消毒生效
3. 验证 10MB 文件大小限制
4. 验证解析失败时的错误处理
5. 验证内容注入到编辑器光标位置
### out_of_scope: 不测试后端功能
### allowed_paths:
- `apps/web/tests/` 或 `apps/web/src/features/ai/__tests__/`
### forbidden_paths:
- `apps/web/src/features/ai/import-file-button.tsx`
### dependencies: TASK-005
### acceptance_criteria:
1. 三种文件格式解析测试通过
2. 消毒测试通过
3. 大小限制测试通过
4. 错误处理测试通过
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-004
### task_name: Admin 配置后端 TDD Refactor 验证
### requirement_ids: REQ-002
### owner: backend-test-worker
### objective: 验证 TASK-004 后端配置逻辑的 Refactor 阶段质量和边界条件
### in_scope:
1. 补充配置优先级的边界测试（仅环境变量、仅默认值、全部配置）
2. 验证 API Key 脱敏在各种格式下的正确性
3. 验证测试连接的超时和错误处理
4. 代码质量检查
### out_of_scope: 不修改实现代码
### allowed_paths:
- `apps/server/tests/ai-settings.test.ts`
### forbidden_paths:
- `apps/server/src/modules/ai/`
### dependencies: TASK-004
### acceptance_criteria:
1. 边界条件测试通过
2. 脱敏测试通过
3. 代码符合项目规范
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-005
### task_name: Admin 配置前端测试
### requirement_ids: REQ-002
### owner: frontend-test-worker
### objective: 验证 TASK-004 的 Admin AI 配置页面功能正确性
### in_scope:
1. 验证配置表单的渲染和交互
2. 验证保存功能
3. 验证测试连接按钮的状态反馈
4. 验证功能开关联动
### out_of_scope: 不测试后端 API
### allowed_paths:
- `apps/admin/tests/` 或 `apps/admin/src/features/ai/__tests__/`
### forbidden_paths:
- `apps/admin/src/features/ai/ai-settings-page.tsx`
### dependencies: TASK-004
### acceptance_criteria:
1. 表单渲染测试通过
2. 保存交互测试通过
3. 测试连接状态反馈测试通过
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-006
### task_name: AI 摘要 TDD Refactor 验证
### requirement_ids: REQ-003
### owner: backend-test-worker
### objective: 验证 TASK-006 的 AI 摘要逻辑在 Refactor 阶段的代码质量和边界条件
### in_scope:
1. 补充边界测试（空文章、超长文章、特殊字符内容）
2. 验证缓存失效后的重新生成路径
3. 验证并发请求的频率限制行为
4. 代码质量检查：prompt 构造、错误处理、日志
### out_of_scope: 不修改实现代码
### allowed_paths:
- `apps/server/tests/ai-summary.test.ts`
### forbidden_paths:
- `apps/server/src/modules/ai/`
### dependencies: TASK-006
### acceptance_criteria:
1. 边界条件测试通过
2. 缓存失效路径测试通过
3. 代码符合项目规范
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-007
### task_name: AI 排版 TDD Refactor 验证
### requirement_ids: REQ-004, REQ-005
### owner: backend-test-worker
### objective: 验证 TASK-007 的 AI 排版逻辑在 Refactor 阶段的代码质量
### in_scope:
1. 补充边界测试（空 HTML、纯文本、复杂嵌套 HTML）
2. 验证 beautify 和 structure 的输出格式一致性
3. 代码质量检查
### out_of_scope: 不修改实现代码
### allowed_paths:
- `apps/server/tests/ai-format.test.ts`
### forbidden_paths:
- `apps/server/src/modules/ai/`
### dependencies: TASK-007
### acceptance_criteria:
1. 边界条件测试通过
2. 输出格式一致性测试通过
3. 代码符合项目规范
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-008
### task_name: AI 前端集成测试
### requirement_ids: REQ-003, REQ-004, REQ-005
### owner: frontend-test-worker
### objective: 验证 TASK-008/009 的 AI 前端集成功能正确性
### in_scope:
1. 验证 AI 摘要按钮调用和结果展示
2. 验证 AI 排版按钮的 beautify/structure 两种模式
3. 验证功能开关联动（按钮隐藏/禁用）
4. 验证错误处理（toast 提示、保留原文）
5. 验证加载状态（spinner、编辑器禁用）
### out_of_scope: 不测试后端 API
### allowed_paths:
- `apps/web/tests/` 或 `apps/web/src/features/ai/__tests__/`
### forbidden_paths:
- `apps/web/src/features/ai/`（不修改源码）
### dependencies: TASK-008, TASK-009
### acceptance_criteria:
1. 摘要功能交互测试通过
2. 排版功能交互测试通过
3. 功能开关联动测试通过
4. 错误处理测试通过
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-009
### task_name: 敏感词移除后审核流程验证
### requirement_ids: REQ-006
### owner: backend-test-worker
### objective: 验证 TASK-010 移除敏感词过滤后，审核流程仍正常工作
### in_scope:
1. 验证帖子创建流程：`pending → ai审核 → published/rejected/manual_review`
2. 验证帖子更新流程不受影响
3. 验证管理员官方文章更新流程不受影响
4. 验证无残留的 `inspectPostWriteContent` 引用
### out_of_scope: 不测试 AI 功能
### allowed_paths:
- `apps/server/tests/posts.test.ts`
- `apps/server/tests/`（新增验证测试）
### forbidden_paths:
- `apps/server/src/modules/posts/`（不修改源码）
### dependencies: TASK-010
### acceptance_criteria:
1. 帖子创建审核流程测试通过
2. 帖子更新审核流程测试通过
3. 无 `inspectPostWriteContent` 残留引用
4. `bun run test -- --filter posts` 全部通过
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

### task_id: TEST-010
### task_name: E2E 端到端测试
### requirement_ids: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
### owner: e2e-test-worker
### objective: 端到端验证 AI 功能的完整用户流程
### in_scope:
1. 文件导入流程：选择文件 → 解析 → 编辑器显示内容
2. AI 摘要流程：点击按钮 → API 调用 → 摘要展示
3. AI 排版流程（beautify）：选中内容 → API 调用 → 内容替换
4. AI 排版流程（structure）：全文 → 确认 → API 调用 → 内容替换
5. Admin AI 配置流程：打开页面 → 修改配置 → 保存 → 验证生效
6. 功能开关联动：关闭摘要 → 前端按钮隐藏
7. 帖子审核流程：创建帖子 → AI 审核 → 状态变更
### out_of_scope: 不测试单元逻辑
### allowed_paths:
- `e2e/` 或 `tests/e2e/`（E2E 测试目录）
### forbidden_paths:
- `apps/`、`packages/`（不修改源码）
### dependencies: TEST-001 ~ TEST-009 全部通过
### acceptance_criteria:
1. 文件导入 E2E 测试通过
2. AI 摘要 E2E 测试通过
3. AI 排版 E2E 测试通过
4. Admin 配置 E2E 测试通过
5. 功能开关联动 E2E 测试通过
6. 帖子审核 E2E 测试通过
### test_strategy: test_after
### input_documents: `docs/tasks/2026-05-06-ai-features-tasks.md`

---

## 15. plan patch / contract change request 触发条件

| 触发条件 | 处理方式 |
|---------|---------|
| TASK-001 的 schema 变更影响现有表结构 | 立即停止，回退主 Build Agent |
| ai.route.ts 的路由前缀需要变更 | 提交 plan patch，影响 TASK-002/006/007 |
| site_settings 表 JSON 结构需要扩展 | 提交 plan patch，影响 TASK-004 |
| LLM API 调用格式需要变更（非 OpenAI 兼容） | 提交 plan patch，影响 TASK-006/007 |
| Redis 缓存 key 格式需要变更 | 提交 plan patch，影响 TASK-003/006 |
| 发现 publish-article-page.tsx 需要大幅重构 | 提交 plan patch，影响 TASK-005/008/009 |
| 七牛 AI 审核无法独立承担审核职责 | 立即停止 TASK-010，回退主 Build Agent |

---

## 16. 推荐的下一步

1. **启动 Batch 1：** 同时 spawn 5 个代理执行 TASK-001/002/003/005/010
2. **TASK-001 优先 review：** 作为共享基础设施，完成后立即 review 确保无误
3. **逐 Batch 推进：** 每个 Batch 完成后验证 `bun run typecheck` 和 `bun run test`
4. **TASK-006/007 串行保障：** 确保 TASK-006 完全完成后再启动 TASK-007
5. **E2E 最后执行：** 所有单元/集成测试通过后再启动 E2E 测试
