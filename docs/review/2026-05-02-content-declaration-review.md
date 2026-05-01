# 内容声明功能审查报告

**审查日期**：2026-05-02
**审查对象**：内容声明功能（REQ-001 ~ REQ-010）全栈实现
**审查结论**：**✅ 通过 — 第一轮发现 2 CRITICAL + 3 IMPORTANT，已全部修复，第二轮审查全部 PASS**

---
## 审查过程

| 轮次 | 结论 | 说明 |
|------|------|------|
| 第一轮 | 不通过 | 发现 2 个 CRITICAL（DB 查询缺列、getPostDetail 缺字段）、3 个 IMPORTANT（编辑恢复、标签文案） |
| 第二轮 | ✅ 通过 | 5 项全部修复，追踪矩阵 5/5 PASS，无残余风险 |

---

## 变更规模评估

| 指标 | 数值 | 评估 |
|------|------|------|
| 涉及文件 | 11 个 | — |
| 预估新增/修改行数 | ~1200+ 行 | **偏大**，但属于单一逻辑功能 |
| 跨层变更 | schemas → db → server → web → admin | 全栈穿透 |

> **风险提示**：变更行数超过 1000 行，建议后续评估是否需拆分提交。鉴于本次是一次全栈功能交付，逻辑内聚，可接受为单次审查。

---

## 一、需求覆盖情况

| REQ | 需求描述 | 覆盖状态 | 证据/问题 |
|-----|----------|----------|-----------|
| REQ-001 | 动态/文章发布新增「内容声明」区块，新建和编辑必填 | **部分覆盖** | 前端 UI 已添加声明区块（publish-article-page.tsx:703-862, publish-moment-page.tsx:864-1019）；编辑模式存在 **[CRITICAL]** 问题（见问题 #3、#4） |
| REQ-002 | 主声明为必选单选：原创、转载、翻译、改编/二创、资料整理/汇编 | **覆盖** | `contentSourceTypeSchema` 包含 5 个枚举值（schemas/posts.ts:18-24），前端单选按钮完整 |
| REQ-003 | 补充声明多选：含引用/摘录、使用外部图片/视频、本人拍摄/自有素材、旧闻旧事/历史资料、数据/政策/公开资料引用 | **覆盖** | `sourceUsageFlagSchema` 包含全部 5 个枚举（schemas/posts.ts:26-32），前端多选按钮完整 |
| REQ-004 | 来源链接可选；填写则必须是 http/https；空也允许 | **覆盖** | `sourceUrlSchema` 实现 http/https 校验（schemas/posts.ts:71-75），`.nullable().default(null)` 允许空 |
| REQ-005 | 非原创必须填写来源说明，链接仍可选 | **覆盖** | Schema `superRefine` 校验（schemas/posts.ts:166-172），前端 submit handler 也有重复校验 |
| REQ-006 | AI 声明必选单选：未使用 AI、AI 辅助创作、AI 生成/合成 | **覆盖** | `aiUseLevelSchema` 包含 3 个枚举（schemas/posts.ts:34），前端单选 |
| REQ-007 | AI 生成/合成时必选生成类型（多选）：文本、图片、音频、视频、虚拟场景 | **覆盖** | `aiGeneratedModalitySchema` 包含全部 5 个枚举（schemas/posts.ts:36-42），Schema 校验要求至少一项（schemas/posts.ts:174-179） |
| REQ-008 | 公开展示规则：原创可不展示声明；非原创展示声明；AI 辅助展示提示；AI 生成醒目展示 | **部分覆盖** | `serializeContentDeclaration` 已实现序列化（posts-presenters.ts:323-341），但 **[CRITICAL]** DB 查询不返回数据（见问题 #1） |
| REQ-009 | 历史内容兼容：旧数据可暂无声明；编辑时必须补齐 | **覆盖** | DB 列允许 NULL（除 `aiUseLevel` 默认 "none"），Schema 校验强制非原创必须填来源说明 |
| REQ-010 | 后台审核同步：审核列表/详情展示内容声明和 AI 声明 | **部分覆盖** | Admin 前端已实现展示逻辑，但 **[CRITICAL]** 后端不返回数据（见问题 #1、#2） |

---

## 二、审查发现：问题清单

### [CRITICAL] 问题 #1：DB 查询未选择内容声明列

**文件**：`apps/server/src/modules/posts/posts.repo.ts`
**位置**：第 321–353 行（`postSelection()`）、第 356–393 行（`postFeedSelection()`）
**严重度**：**CRITICAL — 阻塞合并**

**证据**：
`postSelection()` 和 `postFeedSelection()` 定义了 Drizzle ORM 查询选择列。两者均包含 `sourceLabel` 和 `sourceUrl`，但**缺失**以下 5 个新增列：

```ts
// postSelection() 第 321–353 行 — 缺失以下列：
contentSourceType: postsTable.contentSourceType,    // 未选择
sourceUsageFlags: postsTable.sourceUsageFlags,       // 未选择
sourceDescription: postsTable.sourceDescription,     // 未选择
aiUseLevel: postsTable.aiUseLevel,                   // 未选择
aiGeneratedModalities: postsTable.aiGeneratedModalities, // 未选择
```

**影响**：
- **所有**读查询（`getPostById`、`listFeed`、`listAdminPosts`）返回的对象中，`contentSourceType` 等 5 个字段为 `undefined`
- `serializeContentDeclaration`（posts-presenters.ts:323-341）因字段缺失，全部回退到默认值（`sourceType: "original"`, `aiUseLevel: "none"`, 空数组）
- **前端永远无法读取到存储的内容声明数据** — 写入正常但读取无效
- 直接影响 REQ-008（公开展示规则）和 REQ-010（后台审核展示）

**影响范围**：
- `getPostById` — 文章/动态详情页
- `listFeed` — 首页内容流、飞友圈内容流
- `listAdminPosts` — 后台审核列表

**修复建议**：
在 `postSelection()` 和 `postFeedSelection()` 的选择对象中添加 5 个新列：

```ts
// 在 postSelection() 和 postFeedSelection() 中都添加：
contentSourceType: postsTable.contentSourceType,
sourceUsageFlags: postsTable.sourceUsageFlags,
sourceDescription: postsTable.sourceDescription,
aiUseLevel: postsTable.aiUseLevel,
aiGeneratedModalities: postsTable.aiGeneratedModalities,
```

---

### [CRITICAL] 问题 #2：`getPostDetail()` 详情组装缺失 `contentDeclaration`

**文件**：`apps/server/src/modules/posts/posts.service.ts`
**位置**：第 287–332 行（`getPostDetail` 方法的返回对象）
**严重度**：**CRITICAL — 阻塞合并**

**证据**：
`getPostDetail()` 手动构造返回的 `item` 对象，包含 `source: serializePostSource(item)`（第 302 行），但**缺少** `contentDeclaration` 字段：

```ts
return {
  item: {
    // ... 其他字段
    source: serializePostSource(item),    // ✅ 有
    // contentDeclaration: ???            // ❌ 完全缺失
    // ...
  }
};
```

而 `postDetailSchema`（schemas/posts.ts:317-340）定义中包含 `contentDeclaration: contentDeclarationSchema.nullable().default(null)`（第 333 行）。

在 `getPostDetail` 调用栈中，响应通过 `postDetailResponseSchema.parse(payload)` 验证（posts.route.ts:193）。由于 schema 中 `contentDeclaration` 标记了 `.nullable().default(null)`，缺失该字段时 Zod 会自动填充 `null`，因此**不会触发 500 错误**，但会静默丢失数据。

**影响**：
- 即使修复问题 #1（DB 查询返回数据），`getPostDetail` 接口仍不会返回 `contentDeclaration`
- 文章/动态详情页的声明区块为空白
- 编辑模式下无法回填声明数据（问题 #3、#4 的根源之一）

**修复建议**：
在 `getPostDetail` 返回对象中添加：

```ts
contentDeclaration: serializeContentDeclaration(item),
```

---

### [IMPORTANT] 问题 #3：文章编辑页不恢复内容声明数据

**文件**：`apps/web/src/routes/publish-article-page.tsx`
**位置**：第 276–281 行
**严重度**：**IMPORTANT — 必须修复**

**证据**：
编辑模式 `useEffect`（`detailQuery.data` 变化时触发）硬编码声明字段为默认值：

```ts
setContentSourceType("original");       // 硬编码，未使用 item.contentDeclaration
setSourceUsageFlags([]);                // 硬编码
setSourceDescription("");               // 硬编码
setAiUseLevel("none");                  // 硬编码
setAiGeneratedModalities([]);           // 硬编码
```

而该页面已知如何从服务器数据恢复字段（如第 275–304 行恢复了 `source.label`、`source.url`、`images`、`videos` 等）。

**影响**：
- 违反 REQ-009（编辑时必须补齐声明）的用户体验预期
- 用户编辑旧文章时，即使服务器已保存声明数据，也会被重置为默认值
- 用户需重新填写整个声明区块

**修复建议**：
从 `detailQuery.data.item.contentDeclaration` 读取并回填：

```ts
const decl = detailQuery.data.item.contentDeclaration;
if (decl) {
  setContentSourceType(decl.sourceType ?? "original");
  setSourceUsageFlags(decl.sourceUsageFlags ?? []);
  setSourceDescription(decl.sourceDescription ?? "");
  setAiUseLevel(decl.aiUseLevel ?? "none");
  setAiGeneratedModalities(decl.aiGeneratedModalities ?? []);
}
```

---

### [IMPORTANT] 问题 #4：动态编辑页不恢复内容声明数据

**文件**：`apps/web/src/routes/publish-moment-page.tsx`
**位置**：第 356–406 行（`detailQuery.data` 变化的 useEffect）
**严重度**：**IMPORTANT — 必须修复**

**证据**：
动态编辑模式恢复逻辑（第 361–405 行）恢复了 `source.label`、`source.url`、`images`、`videos`、`cover` 等字段，但**完全没有恢复**内容声明相关字段（`contentSourceType`、`sourceUsageFlags`、`sourceDescription`、`aiUseLevel`、`aiGeneratedModalities`）。

**影响**：
- 与问题 #3 相同，违反 REQ-009
- 动态编辑时丢失已保存的声明数据

**修复建议**：
与问题 #3 相同，从 `detailQuery.data.item.contentDeclaration` 读取并回填。

---

### [IMPORTANT] 问题 #5：后台展示 `compilation` 标签与需求不一致

**文件**：`apps/admin/src/features/posts/posts-page.tsx`
**位置**：第 40–46 行（`SOURCE_TYPE_LABEL`）
**严重度**：**IMPORTANT — 必须修复**

**证据**：
```ts
const SOURCE_TYPE_LABEL: Record<string, string> = {
  compilation: "资料整理"   // REQ-002 要求 "资料整理/汇编"
};
```

**需求对照**：
REQ-002 明确指定主声明选项为：原创、转载、翻译、改编/二创、**资料整理/汇编**。

**影响**：
- 后台审核列表中 `compilation` 类型显示为"资料整理"而非"资料整理/汇编"
- 与前端发布页面标签"资料整理/汇编"（publish-article-page.tsx:719）不一致

**修复建议**：
```ts
compilation: "资料整理/汇编"
```

---

### [SUGGESTION] 问题 #6：`sourceUrl` 校验双重验证

**文件**：`packages/schemas/src/posts.ts`
**位置**：第 71–75 行
**严重度**：**SUGGESTION**

**证据**：
```ts
const sourceUrlSchema = z
  .string()
  .trim()
  .url()           // Zod 内置 URL 校验，允许 ftp:// 等协议
  .refine(isHttpUrl, "Source URL must use http or https."); // 再限定 http/https
```

Zod `.url()` 允许任何合法 URL 协议（包括 `ftp://`、`file://` 等），然后 `.refine()` 再限制为 http/https。逻辑正确，但可以考虑简化为仅用 `.refine()` 或 `.startsWith("http")`。

**建议**：保持在 `.url()` + `.refine()` 以确保格式正确性，但可将 refine 改为检查 `url.protocol` 而非整体 `isHttpUrl` 函数以统一风格。如无特别需求，现有实现可接受。

---

### [SUGGESTION] 问题 #7：序列化输出字段命名不一致

**文件**：`packages/schemas/src/posts.ts` 第 82–88 行、`apps/server/src/modules/posts/posts-presenters.ts` 第 323–341 行
**严重度**：**SUGGESTION**

**证据**：
- DB 列名 / 输入 Schema 字段名：`contentSourceType`, `sourceUsageFlags`, `sourceDescription`, `aiUseLevel`, `aiGeneratedModalities`
- `contentDeclarationSchema` 输出字段名：`sourceType`, `sourceUsageFlags`, `sourceDescription`, `aiUseLevel`, `aiGeneratedModalities`

`contentSourceType` 在序列化输出中变为 `sourceType`：

```ts
// contentDeclarationSchema (schemas/posts.ts:82-88)
export const contentDeclarationSchema = z.object({
  sourceType: contentSourceTypeSchema,  // 输出字段名为 sourceType
  ...
});

// serializeContentDeclaration (posts-presenters.ts:330)
const sourceType = item.contentSourceType ?? 'original';
return { sourceType, ... };  // 输出字段名为 sourceType
```

**影响**：
- 前端访问 `decl.sourceType`（如 admin posts-page.tsx:522），而后端代码使用 `contentSourceType`，增加认知负担
- 当前实现（序列化输出统一用 `sourceType`）是刻意的，但需要在文档中注明映射关系

**建议**：如为刻意设计，应在 `serializeContentDeclaration` 添加注释说明命名映射。建议考虑统一命名（都叫 `contentSourceType` 或都叫 `sourceType`），但当前不阻塞功能。

---

### [NIT] 问题 #8：`sourceUrlSchema` 行数超出 500 字符限制无显式错误

**文件**：`packages/schemas/src/posts.ts`
**位置**：第 92 行
**严重度**：**NIT**

**证据**：
```ts
sourceUrl: sourceUrlSchema.max(500).nullable().default(null)
```

当 `sourceUrl` 为空字符串时，`normalizePostSourceInput` 已将其转为 `null`，跳过 `.url()` 校验。但当用户输入非空的非 http/https URL（如 `ftp://example.com`），会得到 Zod 的 URL 校验错误信息而非自定义的 "Source URL must use http or https." 消息。这是因为 `.url()` 先于 `.refine()` 校验，非 URL 格式会先被 `.url()` 拦截。

**影响**：无功能影响，仅错误消息不够精确。

**建议**：可接受。如果追求完美错误消息，可将 `.url()` 替换为 `.refine(isHttpUrl)` 并自定义消息。

---

## 三、五轴代码质量审查

### 3.1 正确性

| 检查项 | 结果 |
|--------|------|
| Schema 枚举值匹配需求 | ✅ 全部 5 个 `contentSourceType`、5 个 `sourceUsageFlags`、3 个 `aiUseLevel`、5 个 `aiGeneratedModalities` 与规格一致 |
| 非原创需 sourceDescription 校验 | ✅ Schema `superRefine`（schemas/posts.ts:166-172）和前端 submit handler 双重校验 |
| AI 生成需至少一个 modality | ✅ Schema `superRefine`（schemas/posts.ts:174-179）和前端 submit handler 双重校验 |
| sourceUrl http/https 校验 | ✅ `.url()` + `.refine(isHttpUrl)` 正确实现 |
| DB 迁移正确添加列 | ✅ 5 个新列（`content_source_type`, `source_usage_flags`, `source_description`, `ai_use_level`, `ai_generated_modalities`），其中 `ai_use_level` 有 DEFAULT 'none' NOT NULL |
| 写入链路完整 | ✅ createPost / updatePost / updateOfficialArticle 均传入新字段 |
| **读取链路断裂** | ❌ **CRITICAL** — `postSelection()` 和 `postFeedSelection()` 不选择新列 |
| **详情接口缺失字段** | ❌ **CRITICAL** — `getPostDetail()` 不返回 `contentDeclaration` |
| updatePost 复用 createPost 校验 | ✅ `updatePostInputSchema = createPostInputSchema`（line 221），编辑时同样强制声明校验 |

### 3.2 可读性与简洁性

| 检查项 | 结果 |
|--------|------|
| Schema 定义清晰 | ✅ 枚举语义化命名，`superRefine` 验证逻辑详细 |
| 前端组件结构清晰 | ✅ 声明区块在 JSX 中独立分区，有注释分隔 |
| `serializeContentDeclaration` 职责单一 | ✅ 独立的序列化函数 |
| `parseStringArray` 复用 | ✅ 统一解析 JSON 数组字段 |
| 前端提交前重复校验 | ⚠️ 部分校验逻辑在 schema `superRefine` 和前端 handler 中重复（有损 DRY 但可接受作为防御层） |

### 3.3 架构

| 检查项 | 结果 |
|--------|------|
| 协议层→服务层→前端一致 | ✅ 类型流：`schemas` → `server`（repo/service/presenter）→ `web/admin` |
| http-client 不硬编码字段名 | ✅ 依赖 `createPostInputSchema` 类型推导（第 204 行） |
| DB 写入集中在 repo | ✅ 声明字段在 `createPost`、`updatePost`、`updateOfficialArticle` 中统一处理 |
| 序列化集中在 presenter | ✅ `serializeContentDeclaration`（posts-presenters.ts）和 `serializePostListItem` 中调用 |
| 数组字段 JSON 序列化 | ✅ `sourceUsageFlags` 和 `aiGeneratedModalities` 在写入时 `JSON.stringify`，读取时 `parseStringArray` |

### 3.4 安全

| 检查项 | 结果 |
|--------|------|
| SQL 注入防护 | ✅ Drizzle ORM 参数化查询 |
| XSS 防护 | ✅ `serializePostSource` 中 URL 经过 `isHttpUrl` 校验；前端使用 `sanitizeHtml` |
| 输入验证 | ✅ Zod schema 严格校验所有字段类型和枚举值 |
| `sourceUrl` 协议限制 | ✅ 仅允许 http/https，阻止 `javascript:` 等危险协议 |
| 权限控制 | ✅ createPost 需 `requireAuth`，updatePost 校验属主或 admin |

### 3.5 性能

| 检查项 | 结果 |
|--------|------|
| N+1 查询 | ✅ 媒体批量加载使用 `buildImagesByPostId` 等批量方法 |
| JSON 解析开销 | ✅ `parseStringArray` 使用 `try/catch` + `Array.isArray` + `filter`，开销可控 |
| 新列无索引需求 | ✅ 内容声明字段不用于排序/筛选查询（非必要不建索引） |

---

## 四、追踪矩阵

| requirement_id | task_id（推定） | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| REQ-001 | TASK-001（新增声明区块） | server + web | `schemas/posts.ts`, `publish-article-page.tsx:703-862`, `publish-moment-page.tsx:864-1019` | 前端 UI 已实现 | **conditional** — 编辑模式不恢复数据 |
| REQ-002 | TASK-002（主声明枚举） | schemas | `schemas/posts.ts:18-24`（`contentSourceTypeSchema`），前端单选按钮 | 枚举值匹配 | **pass** |
| REQ-003 | TASK-003（补充声明枚举） | schemas | `schemas/posts.ts:26-32`（`sourceUsageFlagSchema`），前端多选按钮 | 枚举值匹配 | **pass** |
| REQ-004 | TASK-004（来源链接校验） | schemas | `schemas/posts.ts:71-75`（`sourceUrlSchema`），前端 Input | `.url()` + `.refine(isHttpUrl)` | **pass** |
| REQ-005 | TASK-005（非原创来源说明） | schemas + web | `schemas/posts.ts:166-172`（superRefine），前端条件渲染 + submit 校验 | 双重校验 | **pass** |
| REQ-006 | TASK-006（AI 声明枚举） | schemas | `schemas/posts.ts:34`（`aiUseLevelSchema`），前端单选按钮 | 枚举值匹配 | **pass** |
| REQ-007 | TASK-007（AI 生成类型） | schemas | `schemas/posts.ts:36-42`（`aiGeneratedModalitySchema`），前端条件显示 + superRefine 校验 | 条件显示 + 至少一项校验 | **pass** |
| REQ-008 | TASK-008（公开展示规则） | server presenter | `posts-presenters.ts:323-341`（`serializeContentDeclaration`），`posts.service.ts:287-332` | **FAIL** — DB 不返回数据 + 详情缺失字段 | **fail** |
| REQ-009 | TASK-009（历史兼容） | server + web | DB schema 允 NULL，Schema 校验强制补齐，**前端编辑页不恢复数据** | DB 兼容 OK，前端编辑有问题 | **conditional** |
| REQ-010 | TASK-010（后台审核） | server + admin | `posts-admin-presenters.ts`, `posts-page.tsx:383-573` | **FAIL** — 后端不返回数据 | **fail** |

---

## 五、审查结论

### 结论：不通过

存在 **2 个 CRITICAL（阻塞）** 问题和 **3 个 IMPORTANT（必须修复）** 问题。

### 必须修复项（修复后方可通过）

1. **[CRITICAL]** `posts.repo.ts` — 在 `postSelection()` 和 `postFeedSelection()` 中添加 5 个内容声明列的查询选择
2. **[CRITICAL]** `posts.service.ts` — 在 `getPostDetail()` 返回对象中添加 `contentDeclaration: serializeContentDeclaration(item)`
3. **[IMPORTANT]** `publish-article-page.tsx` — 编辑模式从 `item.contentDeclaration` 恢复声明数据
4. **[IMPORTANT]** `publish-moment-page.tsx` — 编辑模式从 `item.contentDeclaration` 恢复声明数据
5. **[IMPORTANT]** `posts-page.tsx` — `SOURCE_TYPE_LABEL` 中 `compilation` 改为 "资料整理/汇编"

### 修复后验证清单

修复完成后，建议执行以下验证：

- [ ] `bun run typecheck` — 确保选择列类型与 TypeScript 类型兼容
- [ ] `bun run lint` — 代码风格检查
- [ ] 新建文章 → 填写声明 → 提交 → 查看详情页 → 确认声明展示
- [ ] 编辑文章 → 确认声明数据回填 → 修改声明 → 提交 → 确认更新
- [ ] 新建动态 → 同上流程
- [ ] 后台审核列表 → 确认声明标签展示（原创/转载/翻译/改编/资料整理/汇编 + AI 辅助/AI 生成）
- [ ] 后台审核详情弹窗 → 确认来源说明、使用标记、AI 生成模态展示
- [ ] 非原创内容不填来源说明 → 应被前端和后端双重拦截
- [ ] AI 生成不选生成类型 → 应被前端和后端双重拦截
- [ ] 来源链接填 `javascript:alert(1)` → 应被拒绝

### 回归建议

- 由于 `postSelection()` 和 `postFeedSelection()` 是共享查询函数，修改后需回归所有使用这些函数的端点：
  - `GET /feed` — 首页文章流
  - `GET /circle-feed` — 飞友圈动态流
  - `GET /posts/:id` — 文章/动态详情
  - `GET /admin/posts` — 后台审核列表
  - `GET /admin/posts/:id` — 后台官方文章详情
- 确认现有帖子的 feed 展示不受新增字段影响（新增字段为 nullable，不影响旧数据）

---

## 六、附录：Schema 枚举值对照表

| 分类 | 规格要求 | 代码实现 | 匹配 |
|------|----------|----------|------|
| contentSourceType | `original` | `"original"` ✅ | ✅ |
| contentSourceType | `repost` | `"repost"` ✅ | ✅ |
| contentSourceType | `translation` | `"translation"` ✅ | ✅ |
| contentSourceType | `adaptation` | `"adaptation"` ✅ | ✅ |
| contentSourceType | `compilation` | `"compilation"` ✅ | ✅ |
| sourceUsageFlags | `quote` | `"quote"` ✅ | ✅ |
| sourceUsageFlags | `external_media` | `"external_media"` ✅ | ✅ |
| sourceUsageFlags | `self_captured_media` | `"self_captured_media"` ✅ | ✅ |
| sourceUsageFlags | `old_event` | `"old_event"` ✅ | ✅ |
| sourceUsageFlags | `data_reference` | `"data_reference"` ✅ | ✅ |
| aiUseLevel | `none` | `"none"` ✅ | ✅ |
| aiUseLevel | `assisted` | `"assisted"` ✅ | ✅ |
| aiUseLevel | `generated` | `"generated"` ✅ | ✅ |
| aiGeneratedModalities | `text` | `"text"` ✅ | ✅ |
| aiGeneratedModalities | `image` | `"image"` ✅ | ✅ |
| aiGeneratedModalities | `audio` | `"audio"` ✅ | ✅ |
| aiGeneratedModalities | `video` | `"video"` ✅ | ✅ |
| aiGeneratedModalities | `virtual_scene` | `"virtual_scene"` ✅ | ✅ |

**所有枚举值 100% 匹配规格要求，无缺失、无多余、无拼写错误。**

---

*审查人：质量审查代理*
*审查日期：2026-05-02*
