# AI 功能需求规格文档

**文档状态：** confirmed
**创建日期：** 2026-05-06
**版本：** 1.0.0

---

## 变更日志

| 日期 | 变更内容 | 影响 REQ | 原因 |
|------|---------|----------|------|
| 2026-05-06 | 初始版本 | — | 首次创建 |

---

## 1. 目标（Objective）

### 1.1 背景

飞加内容平台当前缺乏 AI 能力。发布文章只能纯手打，没有文件导入、智能摘要、排版辅助等效率工具。同时，本地硬编码的敏感词过滤逻辑与七牛 AI 审核功能重叠，增加了维护负担。

### 1.2 目标用户

- **内容创作者：** 通过 docx/md 文件导入、AI 排版、AI 摘要提升发布效率
- **管理员：** 通过后台配置 AI 服务参数和功能开关，灵活控制 AI 能力上线节奏

### 1.3 核心价值

| 功能 | 解决的问题 | 用户价值 |
|------|-----------|---------|
| 文件导入 | 用户有现成 Word/Markdown 文档但无法导入 | 减少重复排版工作 |
| AI 摘要 | 长文章缺乏摘要，浏览效率低 | 提升内容发现效率 |
| AI 排版 | 导入/粘贴的内容格式混乱 | 一键美化，节省排版时间 |
| 管理后台配置 | AI 功能不可控，无法调整 API 参数 | 灵活开关，降低风险 |

### 1.4 成功标准

- 用户可在编辑器中导入 .docx/.md/.txt 文件，内容正确渲染
- 用户可一键生成 150-300 字中文摘要
- 用户可一键美化选中文本或全文结构化排版
- 管理员可在后台开启/关闭 AI 功能并配置 API 参数
- 所有 AI 调用有 Redis 缓存，不重复调用

---

## 2. 命令/接口（Commands/API）

### 2.1 新增 API 路由

| 方法 | 路由 | 用途 | 鉴权 |
|------|------|------|------|
| `POST` | `/api/v1/ai/summary` | 生成文章摘要 | `requireAuth` |
| `POST` | `/api/v1/ai/format` | AI 辅助排版 | `requireAuth` |
| `GET` | `/api/v1/admin/ai/settings` | 获取 AI 配置 | `requireAdmin` |
| `PUT` | `/api/v1/admin/ai/settings` | 更新 AI 配置 | `requireAdmin` |

### 2.2 新增文件上传 BizType

| bizType | mediaKind | MIME 白名单 | 大小限制 |
|---------|-----------|-----------|---------|
| `post-document` | `document` | `text/plain`, `text/markdown`, `text/x-markdown`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 10 MB |

### 2.3 AI 摘要接口规格

**请求：**
```json
POST /api/v1/ai/summary
{
  "postId": "string",
  "content": "string (最大 4000 字符，可选，不传则后端从 DB 取)"
}
```

**响应：**
```json
{
  "summary": "string (150-300 字)",
  "cached": true
}
```

**错误场景：**
- `400`：文章不存在或无权限
- `429`：请求频率超限（每文章每 24h 仅允许重新生成一次，缓存命中除外）
- `500`：AI API 调用失败，返回友好错误信息

### 2.4 AI 排版接口规格

**请求：**
```json
POST /api/v1/ai/format
{
  "content": "string (原始 HTML，最大 8000 字符)",
  "mode": "beautify | structure"
}
```

- `beautify`：局部美化（优化段落、标点、空格、列表格式）
- `structure`：全文结构化（识别语义 → 拆分标题/段落层级）

**响应：**
```json
{
  "html": "string (格式化后的 HTML)",
  "changes": ["优化了 3 处段落分割", "添加了 2 个标题层级"]
}
```

### 2.5 管理后台 AI 配置接口规格

**`GET /api/v1/admin/ai/settings` 响应：**
```json
{
  "provider": "dashscope",
  "apiKey": "sk-****...****ab12",
  "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "summaryModel": "qwen-plus",
  "formatModel": "qwen-plus",
  "features": {
    "summary": true,
    "format": true
  },
  "updatedAt": "2026-05-06T12:00:00.000Z"
}
```

**`PUT /api/v1/admin/ai/settings` 请求：**
```json
{
  "provider": "dashscope | openai | custom",
  "apiKey": "string",
  "baseUrl": "string (OpenAI 兼容端点)",
  "summaryModel": "string",
  "formatModel": "string",
  "features": {
    "summary": true,
    "format": false
  }
}
```

- `baseUrl`：支持任意 OpenAI 兼容格式的 API 端点，默认 DashScope
- `features`：独立控制摘要和排版功能的开关，关闭后前端不显示对应按钮

---

## 3. 项目结构（Structure）

### 3.1 新增模块

```
apps/server/src/modules/ai/
  ai.route.ts           # AI API 路由定义
  ai.service.ts         # AI 业务编排（调用 LLM + 缓存）
  ai-settings.repo.ts   # AI 配置持久化（site_settings 表）

packages/schemas/src/ai.ts    # AI 相关 Zod schema（共享）

apps/web/src/features/ai/
  import-file-button.tsx       # 文件导入按钮组件
  ai-summary-panel.tsx         # AI 摘要面板组件
  ai-format-button.tsx         # AI 排版按钮组件
  use-ai-summary.ts            # AI 摘要 hook
  use-ai-format.ts             # AI 排版 hook

apps/admin/src/features/ai/
  ai-settings-page.tsx          # 管理后台 AI 设置页面
```

### 3.2 共享区域变更

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `packages/shared/src/index.ts` | 新增路由 | `API_ROUTES.ai.*` 和 `APP_ROUTES` 新增 |
| `packages/schemas/src/files.ts` | 新增枚举 | `mediaKind` 增加 `document` |
| `packages/schemas/src/index.ts` | 新增导出 | 导出 `ai.ts` schema |
| `packages/db/src/schema.ts` | 新增字段 | `posts` 表增加 `aiSummary` 字段 |
| `apps/server/src/app.ts` | 注册路由 | 注册 `aiRoute` |
| `apps/server/src/openapi/paths/index.ts` | 注册路径 | 新增 `aiPaths` |

### 3.3 数据库变更

`posts` 表新增字段：

```sql
ALTER TABLE posts ADD COLUMN ai_summary text;
ALTER TABLE posts ADD COLUMN ai_summary_generated_at timestamp with time zone;
ALTER TABLE posts ADD COLUMN ai_formatted_at timestamp with time zone;
```

`site_settings` 表新增键（JSON 字段，与现有 `moderationModes` 同理）：

```json
{
  "aiSettings": {
    "provider": "dashscope",
    "apiKey": "sk-xxx",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "summaryModel": "qwen-plus",
    "formatModel": "qwen-plus",
    "features": {
      "summary": true,
      "format": true
    }
  }
}
```

### 3.4 前端路由变更

```
apps/web:
  /publish/article  — 编辑器增加导入按钮 + AI 摘要/排版按钮

apps/admin:
  /admin/settings/ai  — 新增 AI 设置页面
```

---

## 4. 代码风格（Style）

### 4.1 模块组织

- 遵循现有 DDD 三层架构：`route → service → repo`
- AI 配置存储在 `site_settings` 表的 JSON 字段中（与 `moderationModes` 一致），不单独建表
- Schema 定义在 `packages/schemas/src/ai.ts`，前后端共享

### 4.2 AI API 调用规范

- 所有 LLM 调用统一经过 `ai.service.ts`，不在 route 层直接调用外部 API
- 使用 OpenAI 兼容的 `/chat/completions` 格式，方便切换 provider
- 请求前检查 `features` 开关，关闭时返回友好提示
- 错误处理：AI API 超时 30s、异常返回 `502 Bad Gateway` + 日志

### 4.3 Redis 使用规范

**必须遵守的 MVP 原则：**

| ✅ 正确用法 | ❌ 禁止用法 |
|------------|------------|
| 读穿缓存（cache-aside）：查 Redis → 未命中 → 读 PostgreSQL → 写回 Redis | Redis 作为唯一数据存储 |
| Key 格式：`ai:summary:<postId>`，TTL 24h | 在 Redis 中执行复杂查询 |
| 轻量计数器：`INCR page_view:<postId>` | 把 Redis 当成消息队列 |
| Redis 不可用时自动降级读 PostgreSQL | 依赖 Redis 数据持久性 |

**缓存模式：**
```
func getSummary(postId):
  cached = redis.get("ai:summary:" + postId)
  if cached: return cached
  
  summary = postgres.query("SELECT ai_summary FROM posts WHERE id = ?", postId)
  if summary == null:
    // 无缓存也无数据，需要调用 AI 生成
    return null
  
  redis.set("ai:summary:" + postId, summary, ttl=86400)
  return summary
```

### 4.4 环境变量

```bash
# AI 服务配置（仅服务端使用）
AI_PROVIDER=dashscope                    # dashscope | openai | custom
AI_API_KEY=sk-xxx                        # API Key
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1  # OpenAI 兼容端点
AI_SUMMARY_MODEL=qwen-plus               # 摘要模型
AI_FORMAT_MODEL=qwen-plus                # 排版模型
AI_SUMMARY_ENABLED=true                  # 摘要功能开关
AI_FORMAT_ENABLED=true                   # 排版功能开关
```

环境变量作为默认值，管理后台配置可覆盖环境变量（后台优先级 > 环境变量）。

---

## 5. 测试策略（Testing）

### 5.1 策略选择

| 功能 | 策略 | 理由 |
|------|------|------|
| 文件导入（前端解析） | `test_after` | 纯前端 DOM 操作，TDD 不适用 |
| 文件上传策略（后端） | `tdd` | 新增 bizType 涉及安全边界 |
| AI 摘要 API | `tdd` | 核心业务逻辑，需验证缓存和错误处理 |
| AI 排版 API | `tdd` | 核心业务逻辑，需验证输入输出 |
| AI 管理后台配置 | `tdd` | 配置 CRUD 逻辑，需验证权限 |
| 移除敏感词 | `test_after` | 删除逻辑，验证原有审核流程不受影响 |
| Redis 缓存 | `tdd` | 缓存命中/未命中/降级三种路径 |

### 5.2 测试覆盖重点

- AI API 调用 mock：不依赖真实 DashScope 响应
- 缓存命中/未命中路径：两种代码路径都覆盖
- AI API 失败降级：返回友好错误，不崩溃
- 功能开关：关闭时 API 返回 403 或前端隐藏按钮
- 文件类型白名单：非法 MIME 被拒绝

---

## 6. 边界（Boundaries）

### 6.1 范围内

| REQ | 功能 | 优先级 |
|-----|------|--------|
| REQ-001 | 编辑器文件导入（docx/md/txt → HTML → wangEditor） | P1 |
| REQ-002 | 管理后台 AI 配置页面（OpenAI 兼容格式、功能开关） | P1 |
| REQ-003 | AI 文章摘要生成（DashScope qwen-plus + Redis 缓存） | P1 |
| REQ-004 | AI 辅助排版 — 局部美化模式（beautify） | P1 |
| REQ-005 | AI 辅助排版 — 全文结构化模式（structure） | P2 |
| REQ-006 | 移除硬编码敏感词，统一使用七牛 AI 审核 | P1 |
| REQ-007 | Redis 读穿缓存规范化（摘要缓存、计数器） | P1 |

### 6.2 范围外（明确不做）

- ❌ AI 智能搜索（pgvector + embedding）→ 后续迭代
- ❌ AI 内容审核增强（DashScope 语义审核）→ 用七牛就够了
- ❌ AI 辅助写作（续写/改写/润色）→ 后续迭代
- ❌ AI 图片识别（自动描述上传图片）→ 后续迭代
- ❌ WebSocket/SSE 实时流式输出 → 当前请求-响应即可
- ❌ 本地模型部署 → MVP 只用云端 API
- ❌ 多语言摘要 → 仅中文
- ❌ 摘要在前端自动展示 → 需用户主动点击生成
- ❌ Redis 作为消息队列或主存储
- ❌ 历史文章批量重新生成摘要

---

## 7. 需求详述（REQ）

### REQ-001：编辑器文件导入（docx/md/txt → wangEditor）

**优先级：** P1
**验收标准：**

1. 文章发布页编辑器工具栏增加"导入文件"按钮
2. 点击后弹出文件选择器，接受 `.docx`、`.md`、`.txt` 格式
3. `.docx` 通过 `mammoth.js` 浏览器端解析为 HTML
4. `.md` 通过 `marked` 浏览器端解析为 HTML
5. `.txt` 读取纯文本，包裹 `<p>` 标签
6. 所有解析结果经过 `DOMPurify.sanitize()` 消毒后注入 wangEditor
7. 文件大小限制：前端 10MB，超过提示"文件过大，请缩减内容后重试"
8. 解析失败时显示友好错误提示，不崩溃编辑器
9. 如果编辑器已有内容，导入内容追加到光标位置（或末尾）
10. 文件本身不上传到服务器（仅解析内容注入编辑器），因此不需要后端 `post-document` bizType（后续如需上传原文件再加）

### REQ-002：管理后台 AI 配置页面

**优先级：** P1
**验收标准：**

1. 管理后台新增 AI 设置页面：`/admin/settings/ai`
2. 配置项：
   - **Provider**：下拉选择（DashScope / OpenAI 兼容 / 自定义）
   - **API Key**：密码输入框，已保存时显示脱敏值（如 `sk-****...ab12`）
   - **Base URL**：输入框，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
   - **摘要模型**：输入框，默认 `qwen-plus`
   - **排版模型**：输入框，默认 `qwen-plus`
   - **摘要功能开关**：Switch 开关
   - **排版功能开关**：Switch 开关
3. 保存后即时生效，无需重启服务
4. 配置存储在 `site_settings` 表 JSON 字段中
5. 未配置时使用环境变量默认值
6. 配置优先级：后台配置 > 环境变量 > 内置默认值
7. 页面包含"测试连接"按钮：用当前配置调用一次 API（简单 ping），成功显示绿色勾，失败显示红色错误信息

### REQ-003：AI 文章摘要生成

**优先级：** P1
**验收标准：**

1. 文章详情页和发布页均有"AI 生成摘要"按钮
2. 逻辑流程：
   - 检查 Redis 缓存 `ai:summary:<postId>`
   - 命中 → 直接返回
   - 未命中 → 检查 DB `posts.ai_summary` 字段
   - DB 有值 → 写回 Redis（TTL 24h）→ 返回
   - DB 无值 → 调用 DashScope API 生成摘要
3. 生成前裁剪文章内容至前 4000 字符
4. 摘要长度控制在 150-300 字
5. 生成后写入 `posts.ai_summary` 字段 + Redis 缓存
6. 摘要附带 `ai_summary_generated_at` 时间戳
7. AI API 调用失败时返回 `502` + "AI 服务暂时不可用，请稍后重试"
8. 功能开关关闭时，API 返回 `403` + "AI 摘要功能已关闭"
9. 前端收到摘要后展示在文章卡片/详情页的摘要区域，标注"AI 生成"

### REQ-004：AI 辅助排版 — 局部美化（beautify）

**优先级：** P1
**验收标准：**

1. 编辑器工具栏增加"AI 排版"下拉按钮，包含"美化选中内容"和"全文结构化"两个选项
2. "美化选中内容"模式下：
   - 用户选中编辑器中的 HTML 片段
   - 发送原始 HTML 到 `/api/v1/ai/format`（`mode: "beautify"`）
   - AI 优化：段落分割、标点规范、中英文空格、列表格式
   - 返回美化后的 HTML，替换编辑器选中区域
   - 未选中内容时提示"请先选中需要排版的内容"
3. AI API 调用失败时保留原文，弹出错误 toast
4. 功能开关关闭时，排版按钮不显示
5. 排版结果保留原始语义，不改变文章意思

### REQ-005：AI 辅助排版 — 全文结构化（structure）

**优先级：** P2
**验收标准：**

1. "全文结构化"模式下：
   - 获取编辑器全部 HTML 内容
   - 发送到 `/api/v1/ai/format`（`mode: "structure"`）
   - AI 识别语义 → 拆分标题层级（h2/h3）+ 段落 + 列表
   - 返回结构化 HTML，替换编辑器全部内容
2. 替换前弹出确认对话框："AI 将重新组织结构，是否继续？"（防止误覆盖）
3. 如果已有内容为空，提示"请先输入内容"
4. 失败处理同 REQ-004

### REQ-006：移除硬编码敏感词，统一使用七牛 AI 审核

**优先级：** P1
**验收标准：**

1. 删除 `apps/server/src/modules/posts/posts-sensitive-filter.ts` 文件
2. 移除 `posts-write-service.ts` 中对 `inspectPostWriteContent` 的调用
3. `evaluatePostWriteModeration` 仅依赖七牛 AI 审核（`text-moderation.service.ts`）
4. 现有测试文件中引用敏感词过滤的测试用例同步清理或适配
5. 审核流程简化后仍正常：`pending → ai审核 → published/rejected/manual_review`

### REQ-007：Redis 读穿缓存规范化

**优先级：** P1
**验收标准：**

1. 新增 `cache-service.ts` 通用缓存服务，封装读穿模式：
   ```
   async getOrSet(key, ttl, fetchFn):
     cached = redis.get(key)
     if cached: return cached
     value = fetchFn()          // 从 PostgreSQL 获取
     redis.set(key, value, ttl)
     return value
   ```
2. AI 摘要缓存使用此模式：`ai:summary:<postId>`，TTL 24h
3. Redis 不可用时（连接拒绝/超时）自动降级：
   - 跳过缓存读，直接读 PostgreSQL
   - 跳过缓存写，仅记录 WARN 日志
   - 不影响正常业务流程
4. 现有 API 中不规范的 Redis 用法不做主动重构（精准修改原则），仅新增功能按规范实现
5. 管理后台 AI 配置本身走读穿缓存：`site:ai-settings`，TTL 300s

---

## 8. 风险与开放问题

### 8.1 风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DashScope API 不可用 | AI 摘要/排版功能中断 | 返回友好错误 + 不阻塞正常发布流程 |
| API Key 泄露 | 费用损失 | 后台脱敏显示 + 环境变量优先 |
| mammoth.js 解析大文件 UI 卡顿 | 编辑器体验下降 | 10MB 文件大小限制 + Web Worker（P2） |
| Redis 缓存与 DB 数据不一致 | 摘要更新后缓存未刷新 | TTL 24h + 重新生成时主动清除旧缓存 |

### 8.2 开放问题

- [ ] DashScope API Key 申请：需用户提供阿里云账号的 DashScope API Key
- [ ] 如需后续支持 `.doc`（旧版 Word），需要服务端 LibreOffice 转换，当前不做

---

## 9. REQ 追踪矩阵（初始化）

| REQ | 名称 | 优先级 | 测试策略 |
|-----|------|--------|---------|
| REQ-001 | 编辑器文件导入 | P1 | test_after |
| REQ-002 | 管理后台 AI 配置 | P1 | tdd |
| REQ-003 | AI 文章摘要生成 | P1 | tdd |
| REQ-004 | AI 排版 — 局部美化 | P1 | tdd |
| REQ-005 | AI 排版 — 全文结构化 | P2 | tdd |
| REQ-006 | 移除硬编码敏感词 | P1 | test_after |
| REQ-007 | Redis 缓存规范化 | P1 | tdd |
