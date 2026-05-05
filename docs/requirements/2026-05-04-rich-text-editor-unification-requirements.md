# 富文本编辑器统一与延迟上传改造需求文档

- 日期：2026-05-04
- 状态：confirmed
- 版本：v2.0

---

## 变更日志

| 日期 | 变更内容 | 原因 |
|------|---------|------|
| 2026-05-04 | 初始版本 | Web/Admin 编辑器统一 + 延迟上传改造 |
| 2026-05-04 | v2.0 扩展范围 | 用户确认：全部发布页统一、提交后审核、内容安全扫描、纯本地草稿 |

---

## 一、目标（Objective）

### 背景

#### 现状问题

1. **代码重复**：Web 端 `rich-text-editor.tsx` 和 Admin 端 `admin-rich-text-editor.tsx` 各维护一套 WangEditor 封装，约 90% 代码重复
2. **上传策略不一致**：
   - Web 端所有发布页已采用延迟上传（blob 预览 → 提交时批量上传）
   - Admin 端所有发布页仍为即时上传（选择文件即上传），与 Web 体验不一致
3. **视频插入 Bug**：WangEditor 视频上传成功但编辑器内不显示，`insertFn` 时序问题
4. **Admin 无草稿**：Admin 端没有 IndexedDB 草稿持久化，关闭页面丢失内容

#### 现有基础设施（无需变更）

- ✅ **敏感词过滤**：`posts-sensitive-filter.ts` 基于 NFKC 标准化 + 关键词匹配
- ✅ **七牛云 AI 审核**：`qiniu-audit.service.ts` 支持文本/图片/视频审核（pulp/terror/politician/ads）
- ✅ **审核模式**：manual（人工）/ automatic（自动）/ ai（AI 辅助）
- ✅ **审核域覆盖**：文章、动态、评论、品牌申请、机型投稿、榜单
- ✅ **IndexedDB 草稿**：Web 端所有发布页已有草稿持久化
- ✅ **七牛云上传**：三段式上传（init → 直传 → complete）正常工作

### 目标

1. **编辑器统一**：提取共享 WangEditor 到 `packages/rich-text-editor/`，Web 和 Admin 共用
2. **延迟上传统一**：Admin 端全部改为延迟上传（先本地预览，提交时批量上传）
3. **修复视频插入**：解决 WangEditor 视频上传后编辑器内不显示的问题
4. **Admin 草稿支持**：Admin 端增加 IndexedDB 草稿持久化
5. **提交时内容安全扫描**：所有发布类型在提交时统一经过敏感词 + AI 审核
6. **草稿私有**：草稿仅存储本地 IndexedDB，不进入审核队列

### 行业对标

| 平台 | 编辑器 | 上传策略 | 草稿 | 审核 |
|------|--------|---------|------|------|
| 知乎 | Quill（自研） | 延迟上传 | 服务器草稿 | 提交后审核 |
| 掘金 | 自研 Markdown | 延迟上传 | 本地草稿 | 提交后审核 |
| 微信公众号 | 自研 | 即时上传 | 服务器草稿 | 发布前预览 |
| **本方案** | WangEditor | 延迟上传 | IndexedDB 本地 | 提交后审核 |

---

## 二、页面现状与改造范围

### 全部发布页一览

| 页面 | 所属 | 编辑器类型 | 支持媒体 | 当前上传策略 | 当前草稿 | 改造重点 |
|------|------|-----------|---------|-------------|---------|---------|
| `/publish/article` | Web | WangEditor | 图片+视频+封面 | ✅ 延迟 | ✅ IndexedDB | 编辑器组件切换、视频修复 |
| `/publish/moment` | Web | 纯 Textarea | 图片或视频 | ✅ 延迟 | ✅ IndexedDB | 无需改造（本身无富文本） |
| `/publish/aircraft` | Web | Input/Textarea | 图片+视频+封面 | ✅ 延迟 | ✅ IndexedDB | 无需改造 |
| `/publish/brand` | Web | Input/Textarea | Logo 图片 | ✅ 延迟 | ✅ IndexedDB | 无需改造 |
| `/rankings/create` | Web | Input/Textarea | 封面+条目图片 | ✅ 延迟 | ✅ IndexedDB | 无需改造 |
| `/admin/operations/articles` | Admin | WangEditor | 图片+视频+封面 | ❌ 即时 | ❌ 无 | 编辑器切换+延迟上传+草稿 |
| `/admin/operations/aircraft` | Admin | Ant Form | 图片+视频 | ❌ 即时 | ❌ 无 | 延迟上传+草稿 |
| `/admin/operations/brands` | Admin | Ant Form | Logo 图片 | ❌ 即时 | ❌ 无 | 延迟上传+草稿 |
| `/admin/operations/rankings` | Admin | Ant Form | 封面+条目图片 | ❌ 即时 | ❌ 无 | 延迟上传+草稿 |

### 改造优先级

- **P0**：文章编辑器（Web + Admin 都使用 WangEditor，改动量最大）
- **P1**：Admin 其他创建页（飞行器/品牌/榜单）改为延迟上传
- **P2**：Admin 端草稿持久化

---

## 三、命令/接口（Commands/API）

### 3.1 共享编辑器组件

```typescript
// packages/rich-text-editor/src/rich-text-editor.tsx

interface RichTextEditorProps {
  /** 编辑器 HTML 内容 */
  value: string;
  /** 占位文本 */
  placeholder?: string;
  /** HTML 变化回调 */
  onChange: (html: string) => void;
  /** 富文本结构化变化回调 */
  onRichChange?: (value: { html: string; plainText: string }) => void;
  /** 编辑器变体 */
  variant?: "web" | "admin";
  /** 最小高度（px） */
  minHeight?: number;
  /** 是否禁用 */
  disabled?: boolean;
}

// 导出 helpers
export { extractPlainTextFromHtml } from "./rich-text-editor-helpers";
```

### 3.2 延迟上传媒体管理器

```typescript
// packages/rich-text-editor/src/media-manager.ts

interface MediaManager {
  /** 注册本地媒体文件，返回 blob URL */
  register(file: File): { blobUrl: string; fileId: string };
  /** 根据 blob URL 获取原始文件 */
  getFile(blobUrl: string): File | undefined;
  /** 获取所有待上传文件 */
  getAllFiles(): Map<string, File>;
  /** 持久化到 IndexedDB */
  persist(draftKey: string): Promise<void>;
  /** 从 IndexedDB 恢复 */
  restore(draftKey: string): Promise<Map<string, File>>;
  /** 清除 */
  clear(draftKey: string): Promise<void>;
}
```

### 3.3 批量上传与提交

```typescript
// packages/rich-text-editor/src/media-uploader.ts

/** 从 HTML 提取所有 blob URL */
function collectBlobUrls(html: string): string[];

/** 批量上传并返回 blob URL → 真实 URL 映射 */
function uploadMediaBatch(
  files: Map<string, File>,
  uploadImageFn: (file: File) => Promise<{ id: string; url: string }>,
  uploadVideoFn: (file: File) => Promise<{ id: string; url: string }>
): Promise<{ urlMapping: Map<string, string>; imageIds: string[]; videoIds: string[] }>;

/** 用上传结果替换 HTML 中的 blob URL */
function replaceBlobUrls(html: string, urlMapping: Map<string, string>): string;
```

### 3.4 内容安全扫描（复用现有）

```typescript
// 现有 API，无需变更
// POST /api/v1/posts → 自动触发 posts-sensitive-filter + evaluateTextModeration
// 提交时自动经历：敏感词过滤 → AI 审核 → 进入审核队列
```

### 3.5 新增 Admin 端 API（可选）

Admin 端可选调用现有 API：`GET /api/v1/admin/posts?status=pending` 获取待审核内容。

---

## 四、项目结构（Structure）

### 新增

```
packages/rich-text-editor/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                        # 公开 API 导出
│   ├── rich-text-editor.tsx            # 共享 WangEditor 组件
│   ├── rich-text-editor-helpers.ts     # HTML 解析/纯文本提取/媒体移除
│   ├── media-manager.ts               # 媒体文件管理（blob ↔ File ↔ IndexedDB）
│   ├── media-uploader.ts              # blob 提取 + 批量上传 + URL 替换
│   └── __tests__/
│       ├── rich-text-editor.test.tsx
│       ├── media-manager.test.ts
│       └── media-uploader.test.ts
```

### 修改

```
# Web 端
apps/web/src/components/rich-text-editor.tsx          → re-export from @feijia/rich-text-editor
apps/web/src/components/rich-text-editor-helpers.ts    → re-export from @feijia/rich-text-editor
apps/web/src/routes/publish-article-page.tsx           → 适配新接口

# Admin 端
apps/admin/src/components/admin-rich-text-editor.tsx   → re-export from @feijia/rich-text-editor
apps/admin/src/components/admin-rich-text-editor-helpers.ts → re-export
apps/admin/src/features/posts/official-article-editor-page.tsx → 适配新接口 + 延迟上传 + 草稿
apps/admin/src/features/models/aircraft-creator-page.tsx → 即时上传改为延迟上传 + 草稿
apps/admin/src/features/models/brand-creator-page.tsx   → 即时上传改为延迟上传 + 草稿
apps/admin/src/features/rankings/ranking-editor-page-content.tsx → 即时上传改为延迟上传 + 草稿
```

### 不修改

- `apps/server/src/modules/posts/` - 审核流程不变
- `apps/server/src/modules/audits/` - AI 审核不变
- `apps/server/src/modules/uploads/` - 上传 API 不变
- `packages/shared/src/rich-text.ts` - URL 规范化不变
- Web 端动态/飞行器/品牌/榜单页面（已采用延迟上传，无需改造）

---

## 五、需求列表

### REQ-001：提取共享 WangEditor 组件

- **优先级：** P0
- **关联模块：** `packages/rich-text-editor/`
- **验收标准：**
  1. `packages/rich-text-editor/` 包创建完成，包含共享 WangEditor 封装
  2. `RichTextEditor` 组件支持 `variant="web" | "admin"` 区分样式
  3. `onChange(html: string)` 和 `onRichChange({ html, plainText })` 两种回调
  4. 支持 `minHeight`、`disabled`、`placeholder` props
  5. 粘贴过滤（`file:///` 移除）统一生效
  6. Web 端和 Admin 端均通过 `import { RichTextEditor } from "@feijia/rich-text-editor"` 引入
  7. 原有两个 `*-helpers.ts` 文件的核心函数合并到 `packages/rich-text-editor/src/rich-text-editor-helpers.ts`
  8. TypeScript 编译无错误

### REQ-002：实现媒体管理器（MediaManager）

- **优先级：** P0
- **关联模块：** `packages/rich-text-editor/src/media-manager.ts`
- **验收标准：**
  1. `register(file: File): { blobUrl, fileId }` - 注册文件，返回 blob URL
  2. `getFile(blobUrl: string): File | undefined` - 根据 blob URL 找回原始文件
  3. `getAllFiles(): Map<string, File>` - 获取所有待上传文件
  4. `persist(draftKey: string): Promise<void>` - 存入 IndexedDB
  5. `restore(draftKey: string): Promise<Map<string, File>>` - 从 IndexedDB 恢复
  6. `clear(draftKey: string): Promise<void>` - 清除存储
  7. IndexedDB 数据库名 `feijia-media-cache`，单文件上限 50MB
  8. 单元测试全部通过（TDD）

### REQ-003：修复视频插入时序问题

- **优先级：** P0
- **关联模块：** `packages/rich-text-editor/src/rich-text-editor.tsx`
- **验收标准：**
  1. 点击视频上传按钮 → 选择文件 → 编辑器内立即显示视频（使用 blob URL 预览）
  2. 视频预览可正常播放（本地 blob URL）
  3. `onChange` 在视频插入后被正确触发
  4. 不再出现"上传成功但编辑器内不显示"的问题
  5. 视频文件由 MediaManager 管理

### REQ-004：WangEditor 改用延迟上传

- **优先级：** P0
- **关联模块：** `packages/rich-text-editor/src/rich-text-editor.tsx`
- **验收标准：**
  1. 编辑器 `MENU_CONF.uploadImage.customUpload` 不再立即调用 API 上传
  2. 改为调用 `MediaManager.register(file)` 获取 blob URL
  3. 用 blob URL 调用 `insertFn` 插入编辑器
  4. 编辑器 HTML 输出中包含 `blob:` URL
  5. 编辑器 `MENU_CONF.uploadVideo.customUpload` 同样改为延迟

### REQ-005：提交时批量上传 + URL 替换

- **优先级：** P0
- **关联模块：** `packages/rich-text-editor/src/media-uploader.ts`
- **验收标准：**
  1. `collectBlobUrls(html)` 提取所有 blob URL
  2. `uploadMediaBatch()` 并行上传所有文件
  3. 上传完成后 `replaceBlobUrls()` 替换 HTML
  4. 返回 `{ processedHtml, imageIds, videoIds }` 供提交使用
  5. 上传失败的文件记录错误，不阻塞成功文件的替换
  6. 单元测试覆盖：正常流程、部分失败、空 HTML、无 blob URL

### REQ-006：Admin 端迁移到共享组件 + 延迟上传

- **优先级：** P0
- **关联模块：** `apps/admin/src/features/posts/official-article-editor-page.tsx`
- **验收标准：**
  1. Admin 文章编辑器从 `@feijia/rich-text-editor` 导入
  2. 延迟上传流程正常工作（选择文件 → blob 预览 → 提交时批量上传）
  3. Admin 文章创建成功（现有功能无回归）
  4. Admin 文章编辑（`?edit=`）正常工作
  5. 封面图同步改为延迟上传

### REQ-007：Admin 其他创建页改为延迟上传

- **优先级：** P1
- **关联模块：** `apps/admin/src/features/models/`、`apps/admin/src/features/rankings/`
- **验收标准：**
  1. 飞行器创建页：图片/视频选择后显示本地预览，提交时统一上传
  2. 品牌创建页：Logo 选择后显示本地预览，提交时上传
  3. 榜单创建页：封面和条目图片延迟上传
  4. 所有页面提交成功后清除本地媒体缓存

### REQ-008：Admin 端草稿持久化

- **优先级：** P2
- **关联模块：** Admin 各创建页
- **验收标准：**
  1. Admin 文章创建页支持 IndexedDB 草稿保存/恢复
  2. Admin 飞行器创建页支持草稿（可选）
  3. 草稿键名规则：`feijia:admin-{entity}-draft`
  4. 关闭页面重新打开后可恢复

### REQ-009：提交时内容安全扫描

- **优先级：** P0
- **关联模块：** 所有发布页
- **验收标准：**
  1. 所有提交路径经过 `inspectPostWriteContent()` 敏感词过滤
  2. 命中敏感词时返回明确提示（命中的词汇），拒绝提交
  3. 通过敏感词过滤后进入审核队列（根据 siteSettings 决定 AI/人工审核模式）
  4. 图片/视频在批量上传后由七牛云 AI 审核异步处理
  5. 用户可见审核状态（"审核中"/"已发布"/"已驳回"）

### REQ-010：清理死代码

- **优先级：** P2
- **验收标准：**
  1. `apps/web/src/components/rich-text-editor.tsx` 原有实现替换为 re-export
  2. `apps/admin/src/components/admin-rich-text-editor.tsx` 原有实现替换为 re-export
  3. `apps/web/src/components/rich-text-editor-helpers.ts` 合并到 packages
  4. `apps/admin/src/components/admin-rich-text-editor-helpers.ts` 合并到 packages
  5. 检查 `@tiptap/*` 是否未使用，确认后可移除
  6. `vite.config.ts` 中 WangEditor 手动 chunk 配置统一
  7. TypeScript 编译无错误、ESLint 无 error

---

## 六、提交时完整流程图

```
用户点击「提交」
  │
  ├── 1. 本地校验（标题、分类、封面等必填项）
  │
  ├── 2. 提取 HTML 中所有 blob URL
  │
  ├── 3. 批量上传媒体文件（并行）
  │     ├── 图片 → apiClient.uploadPostImage(file)
  │     └── 视频 → apiClient.uploadPostVideo(file)
  │     ↓
  │     上传失败？→ 显示错误，中止提交
  │
  ├── 4. 替换 HTML 中 blob URL 为真实 URL
  │
  ├── 5. 组装 payload → POST /api/v1/posts
  │     ↓
  │     服务端处理：
  │     ├── 敏感词过滤（posts-sensitive-filter）
  │     ├── 命中？→ 返回拒绝（含命中词）
  │     └── 通过 → 创建记录（status: pending）
  │           └── AI 审核（异步）
  │                 ├── pass → 自动发布
  │                 ├── review → 进入 Admin 审核队列
  │                 └── block → 自动驳回
  │
  ├── 6. 前端收到响应
  │     ├── 成功 → 清除草稿 + 清除本地媒体缓存 + 跳转状态页
  │     └── 失败 → 显示错误原因
```

---

## 七、草稿生命周期

```
编辑中
  │
  ├── 修改触发 auto-save（debounce 500ms）
  │     └── 写入 IndexedDB：{ 文字内容, Files Map }
  │
  ├── 关闭页面
  │     └── 草稿保留在 IndexedDB
  │
  ├── 重新打开页面
  │     ├── 从 IndexedDB 恢复文字内容
  │     ├── 从 IndexedDB 恢复 Files Map
  │     ├── 重新生成 blob URL（URL.createObjectURL）
  │     └── 替换 HTML 中的旧 blob URL → 新 blob URL
  │
  └── 提交成功
        └── 清除 IndexedDB draft + media cache
        └── 撤销所有 blob URL（URL.revokeObjectURL）
```

---

## 八、代码风格（Style）

- TypeScript `interface` 优先，Zod 环境下以 schema 为准
- 函数式组件 + Hooks
- IndexedDB 使用原生 API（不引入第三方库）
- 测试使用 Vitest + React Testing Library
- Prettier/ESLint 项目统一配置

---

## 九、测试策略（Testing）

| 模块 | 策略 | 覆盖目标 |
|------|------|---------|
| `media-manager.ts` | TDD | IndexedDB CRUD、blob URL 生成/撤销、文件大小限制 |
| `media-uploader.ts` | TDD | blob 提取、批量上传、URL 替换、部分失败 |
| `rich-text-editor.tsx` | test_after | 组件渲染、props 透传、onChange/onRichChange 触发、variant 样式 |
| Web publish-article-page | test_after | 延迟上传流程、草稿恢复、提交流程 |
| Admin official-article-editor | test_after | 编辑器加载、延迟上传、提交流程 |

---

## 十、边界（Boundaries）

### 范围内

- 提取共享 WangEditor 组件
- 实现 MediaManager + 批量上传 + URL 替换
- 修复视频插入时序问题
- Admin 全面改为延迟上传
- Admin 草稿持久化
- 提交时内容安全扫描（复用现有）
- 清理死代码

### 范围外

- 更换编辑器底层库（仍使用 WangEditor 5.x）
- 修改后端上传 API
- 修改七牛云存储配置
- 移动端/App 端编辑器
- Web 端非文章页面（已为延迟上传，无需改动）
- 实时协作编辑

---

## 十一、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| IndexedDB 容量 | 大视频存不下 | 限制单文件 50MB，超限提示 |
| blob URL 跨会话失效 | 草稿恢复异常 | persist/restore 时重新生成 blob URL |
| 批量上传耗时 | 多文件时用户等待 | 并行上传 + 进度提示 |
| Admin 端现有功能回归 | 编辑器不可用 | test_after 覆盖关键路径 |
| 视频插入 Bug 根因复杂 | 修复不彻底 | WangEditor video module 改用延迟方案，跳过异步 upload→insert 链路 |

---

## 十二、规格自检

- [x] 6 大核心区域全覆盖
- [x] 每条 REQ 有唯一编号和优先级
- [x] 每条 REQ 有可验证的验收标准
- [x] 范围边界明确
- [x] 无占位符
- [x] 风险已识别
- [x] 提交流程图、草稿生命周期图完整
- [x] 现有基础设施已盘点
