# AI 功能任务分解文档

**文档状态：** ready
**创建日期：** 2026-05-06
**版本：** 1.0.0
**需求文档：** `docs/requirements/2026-05-06-ai-features-requirements.md`

---

## 1. 任务概览

| 维度 | 数值 |
|------|------|
| REQ 数量 | 7 |
| TASK 数量 | 10 |
| 共享区域变更 | 4 个文件（packages/db, packages/shared, packages/schemas, apps/server/src/app.ts） |
| 后端任务 | 6 |
| 前端 Web 任务 | 2 |
| 前端 Admin 任务 | 1 |
| 纯清理任务 | 1 |
| 总预估变更行数 | ~2150 行 |

---

## 2. REQ 追踪矩阵

| REQ | 名称 | 优先级 | 映射 TASK | 测试策略 |
|-----|------|--------|-----------|---------|
| REQ-001 | 编辑器文件导入 | P1 | TASK-005 | test_after |
| REQ-002 | 管理后台 AI 配置 | P1 | TASK-004 | tdd |
| REQ-003 | AI 文章摘要生成 | P1 | TASK-006, TASK-008 | tdd |
| REQ-004 | AI 排版 -- 局部美化 | P1 | TASK-007, TASK-009 | tdd |
| REQ-005 | AI 排版 -- 全文结构化 | P2 | TASK-007, TASK-009 | tdd |
| REQ-006 | 移除硬编码敏感词 | P1 | TASK-010 | test_after |
| REQ-007 | Redis 缓存规范化 | P1 | TASK-003 | tdd |

---

## 3. 任务分解列表

### TASK-001：共享基础设施 -- 数据库 Schema 与路由注册

- **任务名称：** 共享基础设施 -- DB Schema + 路由常量 + Zod Schema
- **关联需求：** REQ-003, REQ-004, REQ-005, REQ-007
- **类型：** 直接开发
- **优先级：** P0（阻塞所有后续任务）
- **预估变更行数：** S（~80 行）
- **test_strategy：** test_after
- **依赖：** 无
- **被依赖：** TASK-003, TASK-004, TASK-006, TASK-007, TASK-008, TASK-009
- **风险等级：** 高（涉及共享区域，多个后续任务依赖）
- **风险描述：** 修改 packages/db/schema.ts、packages/shared/src/index.ts、packages/schemas/src/ 等共享文件，后续所有 AI 任务均依赖此任务输出。必须最先完成。
- **完成标准：**
  1. `packages/db/src/schema.ts` 的 `postsTable` 新增 `aiSummary`（text）、`aiSummaryGeneratedAt`（timestamp）、`aiFormattedAt`（timestamp）三个字段
  2. 生成 Drizzle 迁移文件，仅包含 ALTER TABLE 语句（无物理外键）
  3. `packages/shared/src/index.ts` 的 `API_ROUTES` 新增 `ai` 命名空间，包含 `summary`、`format`、`adminSettings` 路由常量；`APP_ROUTES` 新增 `adminAiSettings: "/admin/settings/ai"`
  4. `packages/schemas/src/ai.ts` 新建，定义 AI 摘要请求/响应 schema、AI 排版请求/响应 schema、AI 配置 schema（使用 Zod，类型通过 `z.infer` 导出）
  5. `packages/schemas/src/index.ts` 新增 `export * from "./ai"`
  6. `apps/server/src/app.ts` 预留 AI 路由注册位（import + route 注册，实际模块在后续任务实现）
  7. DB 迁移在本地环境验证通过
- **文件所有权：**
  - 修改：`packages/db/src/schema.ts`、`packages/shared/src/index.ts`、`packages/schemas/src/index.ts`、`apps/server/src/app.ts`
  - 新增：`packages/schemas/src/ai.ts`、`packages/db/drizzle/` 迁移文件
- **共享区域冲突：** 本任务是共享区域的唯一入口，后续任务不得直接修改上述文件

---

### TASK-002：共享基础设施 -- OpenAPI 文档注册

- **任务名称：** AI 模块 OpenAPI 路径定义与注册
- **关联需求：** REQ-002, REQ-003, REQ-004, REQ-005
- **类型：** 直接开发
- **优先级：** P0（与 TASK-001 并行，阻塞后端实现）
- **预估变更行数：** S（~100 行）
- **test_strategy：** test_after
- **依赖：** 无（可与 TASK-001 并行）
- **被依赖：** TASK-006, TASK-007
- **风险等级：** 中（涉及 OpenAPI 共享注册点）
- **风险描述：** 修改 `apps/server/src/openapi/paths/index.ts` 注册新路径，与 TASK-001 有微小共享冲突（不同文件，可并行）
- **完成标准：**
  1. `apps/server/src/openapi/paths/ai.ts` 新建，定义 `/api/v1/ai/summary`、`/api/v1/ai/format`、`/api/v1/admin/ai/settings`（GET/PUT）的 OpenAPI 路径描述
  2. `apps/server/src/openapi/paths/index.ts` 新增 `aiPaths` 导入与合并
  3. `apps/server/tests/openapi.test.ts` 验证新增路径出现在文档中
  4. OpenAPI 文档生成无报错
- **文件所有权：**
  - 新增：`apps/server/src/openapi/paths/ai.ts`
  - 修改：`apps/server/src/openapi/paths/index.ts`、`apps/server/tests/openapi.test.ts`
- **共享区域冲突：** `index.ts` 注册点与 TASK-001 的 `app.ts` 不同文件，可并行

---

### TASK-003：Redis 读穿缓存服务

- **任务名称：** 通用缓存服务 -- getOrSet 读穿模式 + 降级
- **关联需求：** REQ-007
- **类型：** TDD
- **优先级：** P1（TASK-001 完成后立即开始）
- **预估变更行数：** M（~150 行，含测试）
- **test_strategy：** tdd
- **依赖：** 无（可与 TASK-001 并行，仅依赖现有 redis-client.ts）
- **被依赖：** TASK-004, TASK-006, TASK-007
- **风险等级：** 中（Redis 降级逻辑需覆盖三种路径）
- **风险描述：** 缓存命中/未命中/Redis 不可用三种路径均需覆盖。Redis 不可用时的降级策略必须不影响正常业务。
- **完成标准：**
  1. `apps/server/src/lib/cache-service.ts` 新建，导出 `CacheService` 类
  2. 核心方法 `getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T>`：先查 Redis，未命中调 fetchFn 并写回 Redis
  3. Redis 不可用时（连接拒绝/超时）自动降级：跳过缓存读写，直接调 fetchFn，记录 WARN 日志
  4. 辅助方法 `invalidate(key: string)` 用于主动清除缓存
  5. TDD：先写测试覆盖三种路径（命中、未命中、降级），再实现
  6. 单元测试全部通过，mock Redis client
  7. 不修改现有 redis-client.ts，仅复用其导出
- **文件所有权：**
  - 新增：`apps/server/src/lib/cache-service.ts`、`apps/server/tests/cache-service.test.ts`
- **共享区域冲突：** 无。仅新增文件，不修改现有共享文件。

---

### TASK-004：管理后台 AI 配置（后端 + 前端）

- **任务名称：** Admin AI 设置 -- 后端 CRUD + 前端配置页面
- **关联需求：** REQ-002
- **类型：** TDD（后端）+ 直接开发（前端）
- **优先级：** P1（TASK-001 完成后开始）
- **预估变更行数：** L（~350 行）
- **test_strategy：** tdd（后端），test_after（前端）
- **依赖：** TASK-001（schema + 路由常量 + Zod schema）
- **被依赖：** TASK-006, TASK-007（AI 功能需要配置才能工作）
- **风险等级：** 中（跨后端 + 前端 + 共享区域，但模式与现有 site-settings 一致）
- **风险描述：** AI 配置存储在 site_settings 表的 JSON 字段中（与 moderationModes 同理），需要扩展 site_settings 的 JSON 结构。后端需处理配置优先级：后台配置 > 环境变量 > 内置默认值。
- **拆分理由：** 虽然 L 级别，但后端和前端紧密耦合于同一功能路径，且 admin 前端相对简单（参考现有 site-settings 页面模式），拆分反而增加集成成本。保持为一个垂直切片。
- **完成标准：**
  1. `apps/server/src/modules/ai/ai-settings.repo.ts`：读写 site_settings 表中 `aiSettings` JSON 字段
  2. `apps/server/src/modules/ai/ai-settings.service.ts`：解析 AI 配置，处理优先级（后台 > 环境变量 > 默认值），提供 `getAiSettings()`、`updateAiSettings()`、`testConnection()` 方法
  3. `apps/server/src/modules/ai/ai.route.ts`：注册 GET/PUT `/api/v1/admin/ai/settings` 路由，`requireAdmin` 中间件
  4. API Key 返回时脱敏显示（如 `sk-****...ab12`）
  5. "测试连接"端点：用当前配置调用 LLM API 一次（简单 chat/completions 请求），返回成功/失败
  6. `apps/admin/src/features/ai/ai-settings-page.tsx`：Provider 下拉、API Key 密码输入、Base URL、摘要/排版模型输入框、功能开关 Switch、测试连接按钮
  7. `apps/admin/src/lib/admin-routes.ts` 新增 `aiSettings` 路径
  8. Admin shell 导航新增"AI 设置"入口（在"系统设置"或"运营"分组下）
  9. 后端 TDD：配置读写、优先级解析、脱敏、测试连接（mock LLM API）
  10. 保存后即时生效，无需重启
- **文件所有权：**
  - 新增：`apps/server/src/modules/ai/ai-settings.repo.ts`、`apps/server/src/modules/ai/ai-settings.service.ts`、`apps/server/src/modules/ai/ai.route.ts`、`apps/admin/src/features/ai/ai-settings-page.tsx`
  - 修改：`apps/admin/src/lib/admin-routes.ts`、admin shell 导航文件、admin 路由注册文件
  - 测试：`apps/server/tests/ai-settings.test.ts`
- **共享区域冲突：** 无。后端新增模块，admin 前端新增页面。

---

### TASK-005：编辑器文件导入（纯前端）

- **任务名称：** Web 编辑器文件导入 -- docx/md/txt
- **关联需求：** REQ-001
- **类型：** 直接开发
- **优先级：** P1（与后端任务并行）
- **预估变更行数：** M（~200 行）
- **test_strategy：** test_after
- **依赖：** 无（纯前端，无后端依赖）
- **被依赖：** 无
- **风险等级：** 低（纯前端 DOM 操作，不涉及后端）
- **风险描述：** mammoth.js 解析大文件可能导致 UI 卡顿，但有 10MB 文件大小限制缓解。
- **完成标准：**
  1. `apps/web/src/features/ai/import-file-button.tsx` 新建，文件导入按钮组件
  2. 点击弹出文件选择器，accept 属性限制 `.docx`、`.md`、`.txt`
  3. `.docx` 通过 `mammoth.js` 浏览器端解析为 HTML
  4. `.md` 通过 `marked` 浏览器端解析为 HTML
  5. `.txt` 读取纯文本，包裹 `<p>` 标签
  6. 所有解析结果经过 `DOMPurify.sanitize()` 消毒
  7. 文件大小限制前端 10MB，超过提示"文件过大，请缩减内容后重试"
  8. 解析失败时显示友好错误 toast，不崩溃编辑器
  9. 导入内容插入到编辑器光标位置（或追加到末尾）
  10. 文件本身不上传到服务器，仅解析内容注入编辑器
  11. 集成到 `apps/web/src/routes/publish-article-page.tsx` 的编辑器工具栏区域
  12. 新增依赖：`mammoth`、`marked`、`dompurify`（安装到 apps/web）
- **文件所有权：**
  - 新增：`apps/web/src/features/ai/import-file-button.tsx`
  - 修改：`apps/web/src/routes/publish-article-page.tsx`（添加导入按钮）
  - 修改：`apps/web/package.json`（新增依赖）
- **共享区域冲突：** 无。仅修改 web 前端文件。

---

### TASK-006：AI 文章摘要生成（后端）

- **任务名称：** AI 摘要后端 -- API + 缓存 + LLM 调用
- **关联需求：** REQ-003
- **类型：** TDD
- **优先级：** P1
- **预估变更行数：** M（~250 行，含测试）
- **test_strategy：** tdd
- **依赖：** TASK-001（schema + 路由）、TASK-003（cache-service）、TASK-004（AI 配置）
- **被依赖：** TASK-008
- **风险等级：** 中（LLM API 集成 + 缓存三层逻辑）
- **风险描述：** 摘要生成涉及 Redis 缓存 -> DB 查询 -> LLM API 调用三层逻辑，需覆盖所有分支。LLM API 超时/失败需返回友好错误。
- **完成标准：**
  1. `apps/server/src/modules/ai/ai.service.ts` 新增 `generateSummary(postId, content?)` 方法
  2. 逻辑流程：Redis 缓存 `ai:summary:<postId>` -> DB `posts.ai_summary` -> LLM API 生成
  3. 生成前裁剪文章内容至前 4000 字符
  4. 摘要长度控制在 150-300 字（prompt 约束 + 后处理）
  5. 生成后写入 `posts.ai_summary` + `posts.ai_summary_generated_at` 字段 + Redis 缓存（TTL 24h）
  6. 功能开关检查：关闭时返回 403 + "AI 摘要功能已关闭"
  7. 每文章每 24h 仅允许重新生成一次（检查 `ai_summary_generated_at`），缓存命中除外
  8. AI API 超时 30s，异常返回 502 + "AI 服务暂时不可用，请稍后重试"
  9. 使用 OpenAI 兼容 `/chat/completions` 格式调用 LLM
  10. TDD：缓存命中路径、DB 有值路径、LLM 生成路径、功能开关关闭、频率限制、API 失败
  11. OpenAPI 路径已在 TASK-002 注册，此处实现 handler
- **文件所有权：**
  - 修改：`apps/server/src/modules/ai/ai.service.ts`、`apps/server/src/modules/ai/ai.route.ts`
  - 测试：`apps/server/tests/ai-summary.test.ts`
- **共享区域冲突：** `ai.service.ts` 和 `ai.route.ts` 与 TASK-007 共享（必须串行：TASK-006 先，TASK-007 后）

---

### TASK-007：AI 排版功能（后端）

- **任务名称：** AI 排版后端 -- beautify + structure 两种模式
- **关联需求：** REQ-004, REQ-005
- **类型：** TDD
- **优先级：** P1（beautify）/ P2（structure）
- **预估变更行数：** M（~200 行，含测试）
- **test_strategy：** tdd
- **依赖：** TASK-001（schema）、TASK-003（cache-service）、TASK-004（AI 配置）、TASK-006（ai.service.ts / ai.route.ts 已存在）
- **被依赖：** TASK-009
- **风险等级：** 低（复用 TASK-006 建立的 LLM 调用模式）
- **风险描述：** 排版功能的 LLM 调用模式与摘要一致，风险较低。structure 模式为 P2，可延后。
- **完成标准：**
  1. `apps/server/src/modules/ai/ai.service.ts` 新增 `formatContent(content, mode)` 方法
  2. `mode: "beautify"`：优化段落分割、标点规范、中英文空格、列表格式
  3. `mode: "structure"`：识别语义 -> 拆分标题层级（h2/h3）+ 段落 + 列表
  4. 输入最大 8000 字符，超出返回 400
  5. 返回格式化后的 HTML + changes 数组（描述优化了什么）
  6. 功能开关检查：关闭时返回 403
  7. AI API 失败返回 502 + 友好错误
  8. TDD：beautify 输入输出、structure 输入输出、输入过大拒绝、功能开关、API 失败
  9. `ai.route.ts` 新增 `POST /api/v1/ai/format` handler
- **文件所有权：**
  - 修改：`apps/server/src/modules/ai/ai.service.ts`、`apps/server/src/modules/ai/ai.route.ts`
  - 测试：`apps/server/tests/ai-format.test.ts`
- **共享区域冲突：** `ai.service.ts` 和 `ai.route.ts` 与 TASK-006 共享，必须在 TASK-006 之后执行

---

### TASK-008：AI 摘要前端集成（Web 端）

- **任务名称：** Web 端 AI 摘要按钮与展示
- **关联需求：** REQ-003
- **类型：** 直接开发
- **优先级：** P1
- **预估变更行数：** M（~180 行）
- **test_strategy：** test_after
- **依赖：** TASK-006（后端 API 就绪）
- **被依赖：** 无
- **风险等级：** 低（纯前端 UI，调用已实现的后端 API）
- **完成标准：**
  1. `apps/web/src/features/ai/use-ai-summary.ts` 新建，React hook 封装摘要 API 调用（useMutation）
  2. `apps/web/src/features/ai/ai-summary-panel.tsx` 新建，摘要展示面板组件（显示摘要文本 + "AI 生成"标注 + 重新生成按钮）
  3. 发布页（`publish-article-page.tsx`）新增"AI 生成摘要"按钮，点击后调用 API 并填充摘要字段
  4. 文章详情页新增"AI 生成摘要"按钮，点击后展示摘要面板
  5. 加载状态：按钮显示 loading spinner
  6. 错误处理：toast 提示错误信息
  7. 功能开关：后端返回 403 时隐藏按钮或显示禁用提示
  8. `apps/web/src/lib/api-client.ts` 新增 `generateAiSummary()` 和相关方法
- **文件所有权：**
  - 新增：`apps/web/src/features/ai/use-ai-summary.ts`、`apps/web/src/features/ai/ai-summary-panel.tsx`
  - 修改：`apps/web/src/routes/publish-article-page.tsx`、文章详情页组件、`apps/web/src/lib/api-client.ts`
- **共享区域冲突：** `publish-article-page.tsx` 与 TASK-005 共享（不同区域：TASK-005 改工具栏，TASK-008 改摘要区域，可并行）

---

### TASK-009：AI 排版前端集成（Web 端）

- **任务名称：** Web 端 AI 排版按钮 -- beautify + structure
- **关联需求：** REQ-004, REQ-005
- **类型：** 直接开发
- **优先级：** P1（beautify）/ P2（structure）
- **预估变更行数：** M（~180 行）
- **test_strategy：** test_after
- **依赖：** TASK-007（后端 API 就绪）
- **被依赖：** 无
- **风险等级：** 低（纯前端 UI）
- **完成标准：**
  1. `apps/web/src/features/ai/use-ai-format.ts` 新建，React hook 封装排版 API 调用
  2. `apps/web/src/features/ai/ai-format-button.tsx` 新建，"AI 排版"下拉按钮组件（"美化选中内容" + "全文结构化"两个选项）
  3. beautify 模式：获取编辑器选中 HTML -> 调用 API -> 替换选中区域；未选中时提示"请先选中需要排版的内容"
  4. structure 模式：获取全部 HTML -> 确认对话框"AI 将重新组织结构，是否继续？" -> 调用 API -> 替换全部内容
  5. 空内容时提示"请先输入内容"
  6. 加载状态：按钮显示 loading，编辑器临时禁用
  7. 失败处理：保留原文，弹出错误 toast
  8. 功能开关：后端关闭时按钮不显示
  9. 集成到 `publish-article-page.tsx` 编辑器工具栏区域
  10. `apps/web/src/lib/api-client.ts` 新增 `formatAiContent()` 方法
- **文件所有权：**
  - 新增：`apps/web/src/features/ai/use-ai-format.ts`、`apps/web/src/features/ai/ai-format-button.tsx`
  - 修改：`apps/web/src/routes/publish-article-page.tsx`、`apps/web/src/lib/api-client.ts`
- **共享区域冲突：** `publish-article-page.tsx` 与 TASK-005、TASK-008 共享。需注意合并顺序，建议 TASK-005 和 TASK-008 先完成。

---

### TASK-010：移除硬编码敏感词

- **任务名称：** 删除本地敏感词过滤，统一使用七牛 AI 审核
- **关联需求：** REQ-006
- **类型：** 直接开发
- **优先级：** P1
- **预估变更行数：** S（~60 行删除 + 测试适配）
- **test_strategy：** test_after
- **依赖：** 无（独立于 AI 功能，可随时执行）
- **被依赖：** 无
- **风险等级：** 中（删除代码需确保审核流程不受影响）
- **风险描述：** 删除 `inspectPostWriteContent` 后，帖子创建/更新流程中将不再有本地敏感词检查。需确认七牛 AI 审核（`evaluatePostWriteModeration`）能独立承担审核职责。现有 3 个测试用例需要适配。
- **完成标准：**
  1. 删除 `apps/server/src/modules/posts/posts-sensitive-filter.ts` 文件
  2. `posts-write-moderation.ts`：删除 `inspectPostWriteContent` 函数及相关类型定义，仅保留 `evaluatePostWriteModeration`
  3. `posts-write-service.ts`：移除 `inspectPostWriteContent` 的 import 和 3 处调用（createPost ~L194、updatePost ~L336、updateAdminOfficialArticle ~L406），直接进入后续逻辑
  4. `posts.route.ts`：移除 3 处 `sensitive_content` 错误响应分支（L164、L253、L445）
  5. `apps/server/tests/posts.test.ts`：适配 3 个敏感词相关测试用例（L2292、L2316、L2355），改为验证七牛 AI 审核流程
  6. 审核流程验证：`pending -> ai审核 -> published/rejected/manual_review` 流程正常
  7. lint + typecheck + test 全部通过
- **文件所有权：**
  - 删除：`apps/server/src/modules/posts/posts-sensitive-filter.ts`
  - 修改：`apps/server/src/modules/posts/posts-write-moderation.ts`、`apps/server/src/modules/posts/posts-write-service.ts`、`apps/server/src/modules/posts/posts.route.ts`、`apps/server/tests/posts.test.ts`
- **共享区域冲突：** 无。仅修改 posts 模块内部文件。

---

## 4. DDD 分类

| 任务 | DDD 判断 | 理由 |
|------|---------|------|
| TASK-001 | 否 | 基础设施层，无业务逻辑 |
| TASK-002 | 否 | 文档定义，无业务逻辑 |
| TASK-003 | 否 | 通用技术组件，无领域逻辑 |
| TASK-004 | 否 | 配置 CRUD，模式与现有 site-settings 一致 |
| TASK-005 | 否 | 纯前端 DOM 操作 |
| TASK-006 | 部分 | 缓存三层逻辑（Redis -> DB -> LLM）有一定领域复杂度，但未达到聚合根/领域事件级别 |
| TASK-007 | 否 | 复用 TASK-006 模式，逻辑简单 |
| TASK-008 | 否 | 前端 UI 集成 |
| TASK-009 | 否 | 前端 UI 集成 |
| TASK-010 | 否 | 删除操作，无领域建模 |

**结论：** 本轮需求不涉及复杂状态机或多聚合交互，无需 DDD 战术建模。AI 模块遵循现有 `route -> service -> repo` 三层架构即可。

---

## 5. TDD 与直接开发分类

### TDD 任务（先写测试，再实现）

| 任务 | TDD 重点 |
|------|---------|
| TASK-003 | 缓存命中/未命中/降级三种路径 |
| TASK-004（后端） | 配置读写、优先级解析、API Key 脱敏、测试连接 |
| TASK-006 | 缓存三层逻辑、频率限制、功能开关、API 失败降级 |
| TASK-007 | beautify/structure 输入输出、边界条件、功能开关 |

### test_after 任务（先实现，后验证）

| 任务 | 理由 |
|------|------|
| TASK-001 | 基础设施变更，迁移脚本验证即可 |
| TASK-002 | OpenAPI 文档定义，生成验证即可 |
| TASK-004（前端） | 纯 UI 组件，TDD 不适用 |
| TASK-005 | 纯前端 DOM 操作，TDD 不适用 |
| TASK-008 | 前端 UI 集成 |
| TASK-009 | 前端 UI 集成 |
| TASK-010 | 删除操作，验证审核流程不受影响即可 |

---

## 6. 风险任务

| 任务 | 风险等级 | 原因 | 缓解措施 |
|------|---------|------|---------|
| TASK-001 | 高 | 共享区域变更，所有后续任务依赖 | 必须最先完成，变更需 review |
| TASK-004 | 中 | 跨后端+前端，配置优先级逻辑复杂 | 参考现有 site-settings 模式 |
| TASK-006 | 中 | LLM API 集成 + 缓存三层逻辑 | TDD 覆盖所有分支，mock LLM API |
| TASK-010 | 中 | 删除代码，审核流程需验证 | 运行完整审核流程测试 |

---

## 7. 文件所有权和共享路径提醒

### 共享区域变更归属（唯一责任方）

| 共享文件 | 责任任务 | 说明 |
|---------|---------|------|
| `packages/db/src/schema.ts` | TASK-001 | posts 表新增 AI 字段 |
| `packages/db/drizzle/` 迁移文件 | TASK-001 | Drizzle 迁移 |
| `packages/shared/src/index.ts` | TASK-001 | API_ROUTES + APP_ROUTES 新增 |
| `packages/schemas/src/ai.ts`（新建） | TASK-001 | AI Zod schema |
| `packages/schemas/src/index.ts` | TASK-001 | 导出 ai.ts |
| `apps/server/src/app.ts` | TASK-001 | 注册 aiRoute |
| `apps/server/src/openapi/paths/index.ts` | TASK-002 | 注册 aiPaths |

### 串行依赖文件

| 文件 | 共享任务 | 必须顺序 |
|------|---------|---------|
| `apps/server/src/modules/ai/ai.service.ts` | TASK-006, TASK-007 | TASK-006 -> TASK-007 |
| `apps/server/src/modules/ai/ai.route.ts` | TASK-004, TASK-006, TASK-007 | TASK-004 -> TASK-006 -> TASK-007 |
| `apps/web/src/routes/publish-article-page.tsx` | TASK-005, TASK-008, TASK-009 | 建议 TASK-005 -> TASK-008 -> TASK-009 |
| `apps/web/src/lib/api-client.ts` | TASK-008, TASK-009 | TASK-008 -> TASK-009 |

---

## 8. 推荐交付顺序

### 第 1 轮：基础设施（可并行）

```
TASK-001  共享基础设施（DB + 路由 + Schema）     ← 最高优先级
TASK-002  OpenAPI 文档注册                       ← 与 TASK-001 并行
TASK-003  Redis 缓存服务                         ← 与 TASK-001 并行
TASK-010  移除硬编码敏感词                        ← 与上述并行（完全独立）
```

### 第 2 轮：核心后端 + 前端独立任务

```
TASK-004  管理后台 AI 配置（后端+前端）            ← 依赖 TASK-001
TASK-005  编辑器文件导入（纯前端）                 ← 无后端依赖，可与第 1 轮并行
```

### 第 3 轮：AI 功能后端

```
TASK-006  AI 摘要后端                            ← 依赖 TASK-001, 003, 004
TASK-007  AI 排版后端                            ← 依赖 TASK-006（串行）
```

### 第 4 轮：AI 功能前端集成

```
TASK-008  AI 摘要前端                            ← 依赖 TASK-006
TASK-009  AI 排版前端                            ← 依赖 TASK-007
```

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

---

## 9. 推荐的下一步

1. **确认任务分解：** 用户确认上述 10 个 TASK 的拆分是否合理，特别是 TASK-004（后端+前端合并）和 TASK-010（独立清理任务）
2. **交付给 planner：** 任务文档路径 `docs/tasks/2026-05-06-ai-features-tasks.md`，planner 据此制定执行计划
3. **第 1 轮执行建议：** 优先执行 TASK-001（共享基础设施），它阻塞最多后续任务
4. **环境准备：** 确认 DashScope API Key 可用性（需求文档 8.2 开放问题）
5. **依赖安装：** TASK-005 需要安装 `mammoth`、`marked`、`dompurify` 三个 npm 包
