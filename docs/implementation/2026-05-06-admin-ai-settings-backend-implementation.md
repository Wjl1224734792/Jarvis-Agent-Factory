# TASK-004 Admin AI 设置 — 后端 TDD + 前端配置页面 实现文档

**日期：** 2026-05-06
**状态：** 完成
**任务 ID：** TASK-004
**需求 ID：** REQ-002

---

## 1. 当前实现目标

实现管理后台 AI 配置的完整功能路径：后端 API（TDD Red+Green）+ 前端配置页面。管理员可通过后台配置 AI 服务商参数、API Key、模型选择和功能开关，保存后即时生效。

---

## 2. 对应需求 ID / 任务 ID

- **需求：** REQ-002（管理后台 AI 配置页面）
- **任务：** TASK-004（Admin AI 设置 — 后端 CRUD + 前端配置页面）
- **测试策略：** tdd（后端）、test_after（前端）

---

## 3. 输入依据

- `docs/requirements/2026-05-06-ai-features-requirements.md`（2.5 管理后台配置接口规格、REQ-002）
- `docs/tasks/2026-05-06-ai-features-tasks.md`（TASK-004）
- `docs/plans/2026-05-06-ai-features-plan.md`（Batch 3 分配）
- 参考模板：`apps/server/src/modules/site-settings/`（三层架构 route/service/repo）

---

## 4. 变更文件 / 变更范围

### 新建文件（6 个）

| 文件 | 用途 |
|------|------|
| `apps/server/src/modules/ai/ai-settings.repo.ts` | AI 配置持久化层 — 读写 site_settings.aiSettings JSON 字段 |
| `apps/server/src/modules/ai/ai-settings.service.ts` | AI 配置业务层 — 优先级解析、脱敏、测试连接 |
| `apps/server/src/modules/ai/ai.route.ts` | AI 路由 — GET/PUT/POST 端点，requireAdmin 中间件 |
| `apps/server/tests/ai-settings.test.ts` | TDD 集成测试 — 11 个测试用例 |
| `apps/admin/src/features/ai/ai-settings-page.tsx` | Admin 前端 AI 设置页面 |
| `packages/db/drizzle/0002_add_ai_settings.sql` | 数据库迁移 — 新增 ai_settings 列 |

### 修改文件（6 个）

| 文件 | 变更 |
|------|------|
| `packages/db/src/schema.ts` | siteSettingsTable 新增 `aiSettings` text 列 |
| `apps/server/src/app.ts` | 取消注释 aiRoute import 和注册 |
| `apps/admin/src/lib/admin-routes.ts` | 新增 `aiSettings: "/admin/settings/ai"` 路径 |
| `apps/admin/src/lib/api-client.ts` | 新增 `getAiSettings`、`updateAiSettings`、`testAiConnection` 方法 |
| `apps/admin/src/app.tsx` | 注册 AI 设置路由和懒加载组件 |
| `apps/admin/src/features/auth/admin-navigation.ts` | 新增"AI 设置"导航项（管理分组） |

---

## 5. 实现说明

### 5.1 TDD 流程

**Red 阶段：** 先写 11 个失败测试，覆盖：
- GET 无配置时返回默认值
- GET 环境变量覆盖默认值（无后台配置时）
- GET 非 Admin 用户返回 403
- GET 未登录返回 401
- PUT 保存后 GET 返回脱敏值
- PUT 后台配置优先级高于环境变量
- PUT 功能开关关闭后返回对应值
- PUT 非 Admin 用户返回 403
- POST 测试连接成功
- POST 测试连接失败
- POST 非 Admin 用户返回 403

**Green 阶段：** 实现 repo/service/route 三层，全部测试通过。

### 5.2 后端三层架构

**ai-settings.repo.ts** — 持久化层：
- `getAiSettingsJson()` — 读取 site_settings 行的 aiSettings JSON 字符串
- `upsertAiSettingsJson(json)` — 更新 aiSettings 字段，行不存在则插入
- 操作 site_settings 表，与 site-settings.repo.ts 并行，互不影响

**ai-settings.service.ts** — 业务层：
- `getAiSettings()` — 返回脱敏配置
- `getRawSettings()` — 返回完整配置（供内部 LLM 调用使用）
- `updateAiSettings(input)` — 保存配置
- `testConnection()` — 用当前配置调 LLM API 的 /chat/completions 端点
- `maskApiKey(key)` — 保留前3后4字符，中间用 *** 替换
- 配置优先级：后台 DB 配置 > 环境变量 > 内置默认值

**ai.route.ts** — 路由层：
- `GET /api/v1/admin/ai/settings` — requireAdmin，返回脱敏配置
- `PUT /api/v1/admin/ai/settings` — requireAdmin，Zod 校验输入，保存配置
- `POST /api/v1/admin/ai/settings/test` — requireAdmin，测试 LLM 连接

### 5.3 数据库变更

新增 `ai_settings` text 列到 `site_settings` 表：
```sql
ALTER TABLE "site_settings" ADD COLUMN "ai_settings" text;
```

该列存储 JSON 字符串，与 `moderationModes` 列模式一致。可为 null（表示使用环境变量或默认值）。

### 5.4 前端实现

- Ant Design 6 表单：Provider 下拉、API Key 密码输入、Base URL、模型输入框、功能开关 Switch
- React Query 管理数据获取和缓存
- 测试连接按钮调用 POST /test 端点，显示成功/失败 Alert
- 导航项放在"管理"分组下，图标使用 RobotOutlined

---

## 6. 测试和验证结果

### TDD 测试（11/11 通过）

```
✓ GET /api/v1/admin/ai/settings > 无配置时返回内置默认值
✓ GET /api/v1/admin/ai/settings > 环境变量覆盖默认值（无后台配置时）
✓ GET /api/v1/admin/ai/settings > 非 Admin 用户访问返回 403
✓ GET /api/v1/admin/ai/settings > 未登录访问返回 401
✓ PUT /api/v1/admin/ai/settings > 保存配置后 GET 返回保存的值（API Key 脱敏）
✓ PUT /api/v1/admin/ai/settings > 后台配置优先级高于环境变量
✓ PUT /api/v1/admin/ai/settings > 功能开关关闭后返回对应值
✓ PUT /api/v1/admin/ai/settings > 非 Admin 用户保存返回 403
✓ POST /api/v1/admin/ai/settings/test > 有效配置返回成功
✓ POST /api/v1/admin/ai/settings/test > 无效配置返回失败
✓ POST /api/v1/admin/ai/settings/test > 非 Admin 用户测试连接返回 403
```

### 验证命令

| 检查项 | 结果 |
|--------|------|
| `bun run --cwd apps/server typecheck` | 通过 |
| `bun run --cwd apps/admin typecheck` | 通过 |
| `npx eslint` (变更文件) | 通过 |
| `npx vitest run apps/server/tests/ai-settings.test.ts` | 11/11 通过 |
| `npx vitest run apps/server/tests/openapi.test.ts` | 2/2 通过 |
| `npx vitest run apps/server/tests/cache-service.test.ts` | 11/11 通过 |

---

## 7. 数据与接口边界

### API 响应格式

**GET /api/v1/admin/ai/settings**
```json
{
  "item": {
    "provider": "dashscope",
    "apiKey": "sk-***i789",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "summaryModel": "qwen-plus",
    "formatModel": "qwen-plus",
    "features": { "summary": true, "format": true }
  }
}
```

**PUT /api/v1/admin/ai/settings**
- 输入校验：`@feijia/schemas` 的 `aiSettingsSchema`（Zod）
- provider 必填，apiKey 必填，baseUrl 必须是有效 URL
- 保存后即时生效，无需重启

**POST /api/v1/admin/ai/settings/test**
```json
{ "success": true, "message": "连接成功" }
```

### 配置优先级

1. **后台 DB 配置**（site_settings.aiSettings JSON）— 最高
2. **环境变量**（AI_PROVIDER, AI_API_KEY 等）— 中
3. **内置默认值**（dashscope, qwen-plus）— 最低

### 默认值

| 字段 | 默认值 |
|------|--------|
| provider | `"dashscope"` |
| baseUrl | `"https://dashscope.aliyuncs.com/compatible-mode/v1"` |
| summaryModel | `"qwen-plus"` |
| formatModel | `"qwen-plus"` |
| features.summary | `true` |
| features.format | `true` |

---

## 8. 风险 / 未解决项

| 风险 | 等级 | 说明 |
|------|------|------|
| site_settings 表新增列 | 低 | 可空列，不影响现有数据 |
| 测试连接依赖外部 API | 中 | 测试中 mock fetch，但生产环境需要真实 API Key |
| apiKey 脱敏后不可还原 | 低 | 保存时如果用户未输入新 key，前端提示必须输入 |
| 环境变量测试的 DB 状态依赖 | 低 | 测试中使用 clearDbAiSettings() 确保干净状态 |

---

## 9. 需要前端配合的点

- Admin 前端页面已完成，路由和导航已注册
- API 客户端方法已添加（getAiSettings, updateAiSettings, testAiConnection）
- 前端使用 Ant Design 6 的 Form、Select、Input.Password、Switch 组件
- 测试连接结果显示为 Alert 组件（成功绿色/失败红色）

---

## 10. 推荐的下一步

1. **TASK-006**（AI 摘要后端）— 依赖本任务提供的 AI 配置，可在 `ai.route.ts` 中追加 POST /api/v1/ai/summary 路由
2. **TASK-007**（AI 排版后端）— 依赖 TASK-006，在 ai.route.ts 中追加 POST /api/v1/ai/format 路由
3. **Refactor 阶段**（TEST-004）— 补充边界条件测试（空 key、特殊字符 key、超长 key）
4. **生产部署** — 确保 DashScope API Key 已申请并配置到环境变量或后台
