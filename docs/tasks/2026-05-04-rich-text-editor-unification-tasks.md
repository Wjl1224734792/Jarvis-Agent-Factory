# 富文本编辑器统一与延迟上传改造 -- 任务分解

- **需求文档**: `docs/requirements/2026-05-04-rich-text-editor-unification-requirements.md`
- **日期**: 2026-05-04
- **状态**: draft
- **总预估变更行数**: ~1,420 行（分 4 轮次交付）

---

## 一、需求盘点

| REQ | 内容 | 优先级 |
|-----|------|--------|
| REQ-001 | 提取共享 WangEditor 到 `packages/rich-text-editor/` | P0 |
| REQ-002 | 实现 MediaManager（blob <-> File <-> IndexedDB） | P0 |
| REQ-003 | 修复视频插入时序问题（blob 预览） | P0 |
| REQ-004 | WangEditor 改用延迟上传 | P0 |
| REQ-005 | 提交时批量上传 + URL 替换 | P0 |
| REQ-006 | Admin 文章编辑器迁移到共享组件 + 延迟上传 | P0 |
| REQ-007 | Admin 飞行器/品牌/榜单改为延迟上传 | P1 |
| REQ-008 | Admin 端草稿持久化 | P2 |
| REQ-009 | 提交时统一内容安全扫描 | P0 |
| REQ-010 | 清理死代码 | P2 |

---

## 二、切片策略

本次采用**契约优先 + 垂直切片**混合策略：

- **契约优先**：先定义 `packages/rich-text-editor/` 的公开 API（类型、接口），后续任务基于契约并行
- **垂直切片**：每个任务交付可独立验证的功能路径（组件 → 页面 → 提交链路）

不采用水平切片（如"先设计全部接口再实现"），因为：
- 现有两个组件的代码已 90% 相同，提取即为实现
- MediaManager 和共享组件之间有明确接口边界，可并行推进

---

## 三、任务分解

### 任务概览

| TASK | 名称 | 映射 REQ | 类型 | 优先级 | 预估行数 | 策略 | 轮次 |
|------|------|---------|------|--------|---------|------|------|
| TASK-001 | 创建共享包脚手架 + 合并 helpers | REQ-001 | 直接开发 | P0 | ~150 (M) | -- | 1 |
| TASK-002 | 实现 MediaManager | REQ-002 | TDD | P0 | ~180 (M) | tdd | 1 |
| TASK-003 | 构建共享编辑器组件 + 延迟上传 | REQ-001/003/004 | DDD | P0 | ~260 (L) | test_after | 2 |
| TASK-004 | 实现批量上传 + URL 替换 | REQ-005 | TDD | P0 | ~140 (M) | tdd | 2 |
| TASK-005 | Web 端文章编辑器迁移到共享组件 | REQ-001 | test_after | P0 | ~120 (M) | test_after | 3 |
| TASK-006 | Admin 端文章编辑器迁移 + 延迟上传 | REQ-006 | test_after | P0 | ~170 (M) | test_after | 3 |
| TASK-007 | Admin 其他创建页改为延迟上传 | REQ-007 | test_after | P1 | ~200 (L) | test_after | 3 |
| TASK-008 | Admin 端草稿持久化 | REQ-008 | 直接开发 | P2 | ~100 (S) | test_after | 4 |
| TASK-009 | 内容安全扫描接入验证 | REQ-009 | 直接开发 | P0 | ~50 (XS) | manual_only | 4 |
| TASK-010 | 死代码清理 + 配置统一 | REQ-010 | 直接开发 | P2 | ~80 (S) | -- | 4 |

---

### TASK-001: 创建共享包脚手架 + 合并 helpers

- **task_name**: 共享包脚手架与 helpers 合并
- **requirement_ids**: [REQ-001]
- **type**: 直接开发
- **priority**: P0
- **estimated_lines**: ~150 (M)
- **test_strategy**: test_after（合并后运行现有测试套件确保无回归）
- **owner**: frontend-implementer
- **dependencies**: []
- **parallel_group**: [TASK-002]（与 MediaManager 无共享文件冲突）
- **risk**: 中（共享区域：新包结构和公开 API 影响所有下游消费者）

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `packages/rich-text-editor/package.json` | 包配置，命名 `@feijia/rich-text-editor` |
| 新建 | `packages/rich-text-editor/tsconfig.json` | TypeScript 编译配置 |
| 新建 | `packages/rich-text-editor/tsconfig.build.json` | 构建产物配置 |
| 新建 | `packages/rich-text-editor/src/index.ts` | 公开 API 入口 |
| 新建 | `packages/rich-text-editor/src/rich-text-editor-helpers.ts` | 合并后的共享 helpers |
| 新建 | `packages/rich-text-editor/src/__tests__/rich-text-editor-helpers.test.ts` | helpers 单元测试 |
| 修改 | `apps/admin/src/components/admin-rich-text-editor-helpers.ts` | 删除共享函数，保留 admin 独有逻辑 |

**合并清单（统一命名，去掉 "Admin" 前缀）：**

| 函数 / 类型 | 来源 | 目标 |
|-------------|------|------|
| `extractPlainTextFromHtml` | web / admin（相同） | `rich-text-editor-helpers.ts` |
| `buildRichTextToolbarState` | web（原名） | `rich-text-editor-helpers.ts` |
| `getRichTextMediaInsertions` | web（原名） | `rich-text-editor-helpers.ts` |
| `shouldSyncRichTextValue` | web（原名） | `rich-text-editor-helpers.ts` |
| `UploadedMediaAsset` | web（interface） | `rich-text-editor-helpers.ts` |
| `RichTextToolbarKey` | web（type） | `rich-text-editor-helpers.ts` |

**保留在 admin helpers 文件中：**
- `buildOfficialArticleDocument` / `parseOfficialArticleDocument`（编辑域逻辑，非编辑器组件逻辑）
- `removeAdminRichTextMediaReferenceFromHtml`（Admin 特有媒体管理）
- `escapeHtml` / `decodeHtml`（官方文章文档格式专用）

**完成标准：**
1. `packages/rich-text-editor/` 包创建完成，`bun install` 无错误
2. `rich-text-editor-helpers.ts` 包含所有合并后的共享函数，JSDoc 注释完整
3. 现有 `apps/web/tests/rich-text-editor-helpers.test.ts` 和 `apps/admin/tests/admin-rich-text-editor-helpers.test.ts` 全部通过
4. `apps/web/src/components/rich-text-toolbar-config.ts` 可无修改地从新包导入（仅 import 路径变更）
5. TypeScript 编译无错误（`tsc -p tsconfig.json`）
6. ESLint 无 error

---

### TASK-002: 实现 MediaManager（TDD）

- **task_name**: 媒体管理器（blob <-> File <-> IndexedDB）
- **requirement_ids**: [REQ-002]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~180 (M) - 生产代码 ~120 行 + 测试 ~400 行
- **test_strategy**: tdd
- **owner**: frontend-implementer
- **dependencies**: [TASK-001]（需要 `UploadedMediaAsset` 等类型）
- **parallel_group**: []
- **risk**: 中（IndexedDB 原生 API、blob URL 生命周期、跨会话恢复）

**涉及文件：**

| 操作 | 文件 |
|------|------|
| 新建 | `packages/rich-text-editor/src/media-manager.ts` |
| 新建 | `packages/rich-text-editor/src/__tests__/media-manager.test.ts` |
| 修改 | `packages/rich-text-editor/src/index.ts`（追加 export） |

**API 契约（TDD 红阶段先编写测试，绿阶段实现）：**

```typescript
interface MediaManager {
  register(file: File): { blobUrl: string; fileId: string };
  getFile(blobUrl: string): File | undefined;
  getAllFiles(): Map<string, File>;
  persist(draftKey: string): Promise<void>;
  restore(draftKey: string): Promise<Map<string, File>>;
  clear(draftKey: string): Promise<void>;
}

function createMediaManager(): MediaManager;
```

**关键约束：**
- IndexedDB 数据库名：`feijia-media-cache`，store 名：`media-files`
- 单文件上限 50MB，超限时 `register()` 抛出错误
- `persist()` 存储的是 `File` 对象（包含二进制数据），非仅元数据
- `restore()` 返回的 File 需要使用 `URL.createObjectURL()` 重新生成 blob URL（旧 blob URL 跨会话失效）
- `clear()` 同时清除 IndexedDB 记录并释放所有 blob URL

**TDD 测试场景（红→绿→重构）：**

| 序号 | 测试场景 | 验收点 |
|------|---------|--------|
| 1 | `register` 图片文件 | 返回 `blobUrl`（以 `blob:` 开头）和 `fileId` |
| 2 | `register` 超过 50MB 文件 | 抛出错误，包含 "超过大小限制" 提示 |
| 3 | `getFile` 已注册的 blob URL | 返回原始 File 对象 |
| 4 | `getFile` 未注册的 blob URL | 返回 `undefined` |
| 5 | `getAllFiles` 多个文件 | 返回包含所有文件的 Map |
| 6 | `persist` + `restore` 完整周期 | `restore` 返回的 File 与 `register` 时一致（name/size/type） |
| 7 | `persist` 覆盖已有 draft key | 旧数据被替换 |
| 8 | `restore` 不存在的 draft key | 返回空 Map |
| 9 | `clear` 后 `restore` | 返回空 Map |
| 10 | `restore` 后 blob URL 重新生成 | `restore` 返回的 File 生成的新 blob URL 与旧的不同 |

**完成标准：**
1. 10 个 TDD 测试场景全部通过
2. IndexedDB 数据库名和 store 名符合规范
3. `register()` 对超限文件抛出明确错误信息
4. `persist()`/`restore()`/`clear()` 异步操作正确处理 IndexedDB 异常
5. JSDoc 注释覆盖所有公开 API（`@param`、`@returns`、`@throws`）
6. TypeScript 严格模式无错误

---

### TASK-003: 构建共享编辑器组件 + 延迟上传

- **task_name**: 共享 WangEditor 组件（延迟上传版）
- **requirement_ids**: [REQ-001, REQ-003, REQ-004]
- **type**: DDD（编辑器状态管理、媒体生命周期、组件聚合）
- **priority**: P0
- **estimated_lines**: ~260 (L) - 风险任务
- **test_strategy**: test_after（组件渲染、props 透传、回调触发、variant 样式）
- **owner**: frontend-ui-worker
- **dependencies**: [TASK-001, TASK-002]
- **parallel_group**: [TASK-004]（与批量上传器可并行，两者共享 index.ts 导出但各自追加不同行）
- **risk**: 高
  - 变更行数 >200，属于风险任务
  - 涉及 WangEditor customUpload 纵深改造
  - video-module 时序问题根因不在代码层面而在异步链路，改用 blob URL 规避
  - 必须兼容 Web 和 Admin 两套样式体系

**风险缓解：**
- 先在隔离环境验证 blob URL + video insertFn 的同步行为
- 保留原有两个组件文件不动（先并行开发新组件，迁移时再替换）

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `packages/rich-text-editor/src/rich-text-editor.tsx` | 共享 WangEditor 封装 |
| 新建 | `packages/rich-text-editor/src/__tests__/rich-text-editor.test.tsx` | 组件单元测试 |
| 修改 | `packages/rich-text-editor/src/index.ts` | 追加 `RichTextEditor` 导出 |

**组件 Props（契约）：**

```typescript
interface RichTextEditorProps {
  /** 编辑器 HTML 内容（受控） */
  value: string;
  /** 占位文本 */
  placeholder?: string;
  /**
   * HTML 变化回调。
   * 统一传递 `{ html, plainText }`，不再分别提供两种签名。
   * Web 端消费者可仅读取 `html`，忽略 `plainText`。
   */
  onChange: (value: { html: string; plainText: string }) => void;
  /** 编辑器变体：web 端使用 wang-editor-shell 样式，admin 使用 admin-editor 样式 */
  variant?: "web" | "admin";
  /** 编辑器最小高度（px），默认 420 */
  minHeight?: number;
  /** 是否禁用编辑器 */
  disabled?: boolean;
  /** MediaManager 实例，由页面层注入（实现 DI，便于测试） */
  mediaManager: MediaManager;
}
```

**延迟上传改造要点：**

1. `MENU_CONF.uploadImage.customUpload`：
   - 旧：`onUploadImage(file)` → 上传 API → `insertFn(url)`（异步，有延迟）
   - 新：`mediaManager.register(file)` → `insertFn(blobUrl)`（同步，即时显示）
   - 文件暂存于 MediaManager，提交时统一上传

2. `MENU_CONF.uploadVideo.customUpload`：
   - 旧：`onUploadVideo(file)` → 上传 API → `insertFn(url)`（异步，视频 insertFn 时序 Bug 根因）
   - 新：`mediaManager.register(file)` → `insertFn(blobUrl)`（同步，修复时序 Bug）
   - 视频 blob URL 可直接在 `<video>` 中播放（验证通过）

3. 粘贴过滤：`file:///` 移除逻辑从现有组件复制到共享组件

4. `variant="web"` 时底部显示字符计数，`variant="admin"` 时不显示

**测试场景（test_after）：**

| 序号 | 场景 | 验收点 |
|------|------|--------|
| 1 | 默认渲染 | 编辑器工具栏 + 编辑区正常渲染 |
| 2 | `variant="web"` 样式 | 使用 `wang-editor-shell` CSS 类名体系 |
| 3 | `variant="admin"` 样式 | 使用 `admin-editor` CSS 类名体系 |
| 4 | `onChange` 触发 | 输入文字后回调收到 `{ html, plainText }` |
| 5 | `minHeight` 生效 | 编辑器高度符合设定值 |
| 6 | `disabled` 生效 | 编辑器不可编辑 |
| 7 | 图片延迟上传 | 选择图片 → blob URL 插入 → 编辑器内显示图片 |
| 8 | 视频延迟上传 | 选择视频 → blob URL 插入 → 编辑器内显示视频（可播放） |
| 9 | 粘贴 `file:///` 过滤 | WPS 粘贴 → `file:///` URL 被移除 |
| 10 | 空 props 不崩溃 | `value=""`, 无 `placeholder` 正常运行 |

**完成标准：**
1. `RichTextEditor` 组件从 `@feijia/rich-text-editor` 导出
2. 支持 `variant="web"` 和 `variant="admin"`，样式正确
3. `onChange` 统一回传 `{ html, plainText }`
4. 图片/视频选择后编辑器内即时显示（使用 blob URL）
5. 视频插入不再出现"上传成功但不显示"问题
6. 粘贴 `file:///` 过滤生效
7. `disabled`、`minHeight`、`placeholder` props 正常工作
8. 10 个 test_after 场景全部通过
9. TypeScript 编译无错误，ESLint 无 error

---

### TASK-004: 实现批量上传 + URL 替换（TDD）

- **task_name**: 批量上传与 URL 替换工具
- **requirement_ids**: [REQ-005]
- **type**: TDD
- **priority**: P0
- **estimated_lines**: ~140 (M) - 生产代码 ~80 行 + 测试 ~300 行
- **test_strategy**: tdd
- **owner**: frontend-implementer
- **dependencies**: [TASK-001]（需要 `UploadedMediaAsset` 类型）
- **parallel_group**: [TASK-003]（两者可并行，共享 index.ts 但各行独立）
- **risk**: 中（并行上传、部分失败处理、URL 替换的正则/DOMParser 双路径）

**涉及文件：**

| 操作 | 文件 |
|------|------|
| 新建 | `packages/rich-text-editor/src/media-uploader.ts` |
| 新建 | `packages/rich-text-editor/src/__tests__/media-uploader.test.ts` |
| 修改 | `packages/rich-text-editor/src/index.ts`（追加 export） |

**API 契约（TDD 红阶段先写测试）：**

```typescript
/** 从 HTML 提取所有 blob URL */
function collectBlobUrls(html: string): string[];

/** 批量上传并返回 blob URL -> 真实 URL 映射 */
function uploadMediaBatch(
  files: Map<string, File>,
  uploadImageFn: (file: File) => Promise<{ id: string; url: string }>,
  uploadVideoFn: (file: File) => Promise<{ id: string; url: string }>
): Promise<{
  urlMapping: Map<string, string>;
  imageIds: string[];
  videoIds: string[];
  errors: Array<{ blobUrl: string; message: string }>;
}>;

/** 用上传结果替换 HTML 中的 blob URL */
function replaceBlobUrls(html: string, urlMapping: Map<string, string>): string;
```

**TDD 测试场景：**

| 序号 | 分类 | 测试场景 | 验收点 |
|------|------|---------|--------|
| 1 | `collectBlobUrls` | HTML 含 2 个图片 blob URL | 返回 2 个 blob URL |
| 2 | `collectBlobUrls` | HTML 含图片 + 视频 blob URL | 返回所有 blob URL |
| 3 | `collectBlobUrls` | HTML 含真实 URL（非 blob） | 不返回真实 URL |
| 4 | `collectBlobUrls` | 空 HTML | 返回空数组 |
| 5 | `collectBlobUrls` | HTML 无媒体元素 | 返回空数组 |
| 6 | `uploadMediaBatch` | 正常流程：3 个图片 file | 全部成功，`imageIds` 包含 3 个 ID |
| 7 | `uploadMediaBatch` | 混合图片 + 视频 | 正确分类，`imageIds` + `videoIds` 独立 |
| 8 | `uploadMediaBatch` | 1 个文件上传失败 | `errors` 包含错误信息，其他文件正常上传 |
| 9 | `uploadMediaBatch` | 空 Map | 返回空结果，不调用上传函数 |
| 10 | `replaceBlobUrls` | 2 个 blob URL 全部有映射 | HTML 中 blob URL 替换为真实 URL |
| 11 | `replaceBlobUrls` | 1 个 blob URL 无映射 | 该 URL 保留（不替换），其他替换 |
| 12 | `replaceBlobUrls` | `src` 和 `poster` 属性中的 blob | 两者均被替换 |

**完成标准：**
1. 12 个 TDD 测试场景全部通过（红→绿→重构）
2. `collectBlobUrls` 覆盖 `<img src>`、`<video src>`、`<source src>` 中的 blob URL
3. `uploadMediaBatch` 并行上传，失败不阻塞成功文件
4. `replaceBlobUrls` 同时处理 DOMParser 路径和字符串替换回退路径
5. 所有函数 JSDoc 注释完整

---

### TASK-005: Web 端文章编辑器迁移到共享组件

- **task_name**: Web 发布页接入共享编辑器
- **requirement_ids**: [REQ-001]
- **type**: test_after
- **priority**: P0
- **estimated_lines**: ~120 (M)
- **test_strategy**: test_after（验证发布流程完整链路）
- **owner**: frontend-state-worker
- **dependencies**: [TASK-003, TASK-004]（需要共享组件 + 批量上传器）
- **parallel_group**: [TASK-006]（Admin 迁移可并行，不同页面无共享文件冲突）
- **risk**: 高（修改已有生产路径 publish-article-page，必须确保无回归）

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `apps/web/src/components/rich-text-editor.tsx` | 替换为 re-export from `@feijia/rich-text-editor` |
| 修改 | `apps/web/src/components/rich-text-editor-helpers.ts` | 替换为 re-export from `@feijia/rich-text-editor` |
| 修改 | `apps/web/src/routes/publish-article-page.tsx` | 适配新 Props 接口 |
| 修改 | `apps/web/src/components/rich-text-toolbar-config.ts` | 调整 import 路径 |
| 检查 | `apps/web/tests/rich-text-editor-helpers.test.ts` | 确认测试仍通过 |

**改造要点：**

1. `RichTextEditor` Props 适配：
   - `onChange` 从 `(html: string) => void` 改为 `({ html, plainText }) => void`
   - 移除 `onUploadImage` / `onUploadVideo` props（延迟上传不需要）
   - 新增 `mediaManager` prop（注入 MediaManager 实例）
   - 设置 `variant="web"`

2. 页面层改动：
   - 创建 `MediaManager` 实例（与页面生命周期绑定）
   - 提交时改为：收集 blob URL → `uploadMediaBatch()` → `replaceBlobUrls()` → 组装 payload
   - 封面图延迟上传逻辑保持不变（已为 blob 预览 + 提交时上传）
   - 草稿恢复时调用 `mediaManager.restore()` 恢复文件

3. 兼容性保证：
   - 现有 `rich-text-toolbar-config.ts` 仅需更新 import 路径
   - 现有测试 `rich-text-editor-helpers.test.ts` 仍能通过（函数签名不变）

**完成标准：**
1. Web 端 `yarn dev:web` 启动无错误
2. 文章发布页编辑器正常加载，工具栏功能完整
3. 选择图片/视频 → 编辑器内即时显示（blob 预览）
4. 填写标题、摘要、封面 → 点击提交 → 文章发布成功
5. 编辑已有文章（`?edit=`） → 内容正常加载
6. 草稿保存/恢复功能正常（IndexedDB）
7. 关闭页面后重新打开 → 草稿恢复成功
8. `rich-text-editor-helpers.test.ts` 全部通过

---

### TASK-006: Admin 端文章编辑器迁移 + 延迟上传

- **task_name**: Admin 官方文章编辑器切换共享组件
- **requirement_ids**: [REQ-006]
- **type**: test_after
- **priority**: P0
- **estimated_lines**: ~170 (M)
- **test_strategy**: test_after（验证创建/编辑完整链路）
- **owner**: frontend-state-worker
- **dependencies**: [TASK-003, TASK-004]
- **parallel_group**: [TASK-005]（Web 迁移可并行）
- **risk**: 高（修改 Admin 核心创建流程，含 React.lazy + Suspense 动态加载链路）

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `apps/admin/src/components/admin-rich-text-editor.tsx` | 替换为 re-export from `@feijia/rich-text-editor` |
| 修改 | `apps/admin/src/features/posts/official-article-editor-page.tsx` | 适配新 Props + 延迟上传 + 批量上传提交 |
| 修改 | `apps/admin/src/features/posts/official-articles-helpers.ts` | 调整 helpers import 路径 |
| 检查 | `apps/admin/tests/admin-rich-text-editor-helpers.test.ts` | 确认 trim 后测试仍通过 |

**改造要点：**

1. **编辑器组件切换：**
   - `LazyAdminRichTextEditor` 从 lazy import `admin-rich-text-editor` 改为 lazy import `@feijia/rich-text-editor`
   - Props：`onChange` 统一接受 `{ html, plainText }`（EditorChange 类型已一致）
   - 新增 `mediaManager` prop，移除 `onUploadImage`/`onUploadVideo`
   - 设置 `variant="admin"`

2. **延迟上传改造：**
   - 编辑器内图片/视频选择后 blob 预览（由共享组件处理）
   - 移除 `uploadImages()` / `uploadVideos()` 中的即时 API 调用
   - 改为 `mediaManager.register()` 调用来跟踪文件

3. **提交时批量上传：**
   - `handleSubmit` 中新增：`collectBlobUrls(html)` → `uploadMediaBatch()` → `replaceBlobUrls()`
   - 封面图同步改为延迟上传（选择文件 → blob 预览 → 提交时上传）
   - 组装 payload 时使用替换后的 HTML 和真实 media ID

4. **兼容性保证：**
   - `buildOfficialArticleDocument` / `parseOfficialArticleDocument` 保留在 admin helpers
   - `AdminRichTextHtml` 预览组件不变
   - 官方文章摘要嵌入 HTML 的逻辑不变

**完成标准：**
1. Admin 文章编辑器正常加载（含 `React.lazy` + `Suspense` 按需加载）
2. 选择图片/视频后编辑器内即时预览（blob URL）
3. 填写标题、摘要、分类 → 点击发布 → 图片/视频批量上传 → 文章创建成功
4. 编辑已有文章（`?edit=`） → 内容正常加载（含已有图片/视频）
5. 封面图选择后本地预览 + 提交时上传
6. 移除媒体资源功能正常（同步清理编辑器 HTML）
7. `admin-rich-text-editor-helpers.test.ts` 全部通过

---

### TASK-007: Admin 其他创建页改为延迟上传

- **task_name**: Admin 飞行器/品牌/榜单延迟上传
- **requirement_ids**: [REQ-007]
- **type**: test_after
- **priority**: P1
- **estimated_lines**: ~200 (L) - 风险任务（跨 3 个页面）
- **test_strategy**: test_after（各页面创建流程验证）
- **owner**: frontend-state-worker
- **dependencies**: [TASK-002, TASK-004]（需要 MediaManager + 批量上传器，不需要共享编辑器组件）
- **parallel_group**: [TASK-005, TASK-006]（与编辑器迁移无共享文件冲突）
- **risk**: 中（变更行数 >200，跨 3 个独立页面；但改造模式一致，属重复操作）
- **风险缓解：** 三页面改造模式统一：文件选择 → 本地 blob 预览 → MediaManager 跟踪 → 提交时批量上传

**涉及文件：**

| 操作 | 文件 | 关键改动 |
|------|------|---------|
| 修改 | `apps/admin/src/features/models/aircraft-creator-page.tsx` | 封面/图库/视频：即时上传 → 延迟上传 |
| 修改 | `apps/admin/src/features/models/brand-creator-page.tsx` | Logo：即时上传 → 延迟上传 |
| 修改 | `apps/admin/src/features/rankings/ranking-editor-page-content.tsx` | 封面/条目图片：即时上传 → 延迟上传 |

**各页面改造要点：**

**1. 飞行器创建页 (`aircraft-creator-page.tsx`)：**
- 封面图：`uploadCover()` 改为 blob 预览 → 提交时上传
- 图库图片：选择文件 → 生成 blob URL → 本地预览列表 → 提交时批量上传
- 视频：同图片流程
- 提交时：`MediaManager.getAllFiles()` → `uploadMediaBatch()` → 获取真实 ID 组装 payload

**2. 品牌创建页 (`brand-creator-page.tsx`)：**
- Logo：`uploadCover()` 改为 blob 预览 → 提交时上传
- 改动量最小（仅封面图 1 个上传点）

**3. 榜单创建/编辑页 (`ranking-editor-page-content.tsx`)：**
- 封面图 + 条目图片：即时上传 → 延迟上传
- 条目图片可能多个，需要 `uploadMediaBatch()` 并行上传

**完成标准：**
1. 飞行器创建页：选择封面/图库/视频 → 本地预览正常 → 提交成功（图片/视频已上传）
2. 品牌创建页：选择 Logo → 本地预览 → 提交成功
3. 榜单创建/编辑页：选择封面 + 条目图片 → 本地预览 → 提交成功
4. 所有页面提交成功后清除本地媒体缓存
5. 三页面均无功能回归（现有字段提交正常）

---

### TASK-008: Admin 端草稿持久化

- **task_name**: Admin 草稿支持（IndexedDB）
- **requirement_ids**: [REQ-008]
- **type**: 直接开发
- **priority**: P2
- **estimated_lines**: ~100 (S)
- **test_strategy**: test_after（草稿保存/恢复手动验证）
- **owner**: frontend-state-worker
- **dependencies**: [TASK-006, TASK-007]（需在对应页面完成后接入）
- **parallel_group**: [TASK-009]（与安全扫描验证无冲突）
- **risk**: 低（可复用 Web 端现有 `draft-store.ts` 的 IndexedDB 模式）

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `apps/admin/src/lib/uploads/draft-store.ts` | Admin 端 IndexedDB 草稿存储（参考 Web 端实现） |
| 修改 | `apps/admin/src/features/posts/official-article-editor-page.tsx` | 接入草稿自动保存/恢复 |
| 修改 | `apps/admin/src/features/models/aircraft-creator-page.tsx` | 可选接入草稿 |
| 修改 | `apps/admin/src/features/rankings/ranking-editor-page-content.tsx` | 可选接入草稿 |

**实现策略：**
- 数据库名：`feijia-admin-drafts`（独立于 Web 端的 `feijia-publish-drafts`）
- 草稿键名规则：`feijia:admin-{entity}-draft`（如 `feijia:admin-article-draft`）
- 自动保存：debounce 500ms，仅编辑模式（非 `?edit=` 模式）保存
- 恢复流程：打开页面 → 检查草稿 → 如有则恢复文字 + 媒体文件 + 重新生成 blob URL
- 提交成功后清除草稿

**草稿数据结构参考（Web 端已验证的模式）：**
```typescript
interface DraftSnapshot<T> {
  key: string;
  version: number;
  updatedAt: number;
  data: T;
  filesBySlot: Record<string, DraftFileRecord[]>;
}
```

**完成标准：**
1. Admin 文章创建页支持草稿保存/恢复（文字 + 图片 + 视频）
2. 关闭页面后重新打开可恢复编辑内容
3. 提交成功后草稿被清除
4. `?edit=` 模式下不触发自动保存
5. Admin 飞行器/品牌/榜单创建页草稿支持（可选，按 P2 优先级）

---

### TASK-009: 内容安全扫描接入验证

- **task_name**: 提交链路内容安全验证
- **requirement_ids**: [REQ-009]
- **type**: 直接开发（验证为主，可能含少量修复）
- **priority**: P0
- **estimated_lines**: ~50 (XS)
- **test_strategy**: manual_only（安全性验证需要真实服务端环境）
- **owner**: frontend-state-worker
- **dependencies**: [TASK-005, TASK-006, TASK-007]
- **parallel_group**: [TASK-008]
- **risk**: 低（现有审核基础设施无需变更，仅验证接入）

**验证范围（无需新增代码，仅验证现有路径畅通）：**

| 验证项 | 验收标准 | 验证方法 |
|--------|---------|---------|
| Web 文章提交 | 敏感词过滤生效，命中返回拒绝 | 构造含敏感词标题 → 提交 → 期望返回错误含命中词 |
| Admin 文章提交 | 审核队列接入正常 | 提交文章 → Admin 审核列表可见 → 状态为 "pending" |
| Admin 飞行器/品牌/榜单 | 敏感词过滤生效 | 同上 |
| 图片/视频审核 | 批量上传后进入 AI 审核异步处理 | 上传含 `ads` 类图片 → 提交 → 检查审核状态 |
| AI 审核自动发布 | 审核通过后自动发布 | 提交合规内容 → 自动 `status: published` |
| 审核驳回 | 不通过时驳回并记录原因 | 提交违规内容 → `rejectionReason` 非空 |

**可能需要的修复：**
- 确保延迟上传后 `imageIds` / `videoIds` 正确传入 API（审核需要关联媒体）
- 确保 `UploadRecord` 在批量上传时正确创建（调用 `uploadPostImage`/`uploadPostVideo` API）

**完成标准：**
1. 所有发布路径的敏感词过滤正常工作
2. 命中敏感词时返回明确提示（包含命中词汇）
3. 通过敏感词过滤后内容进入审核队列
4. AI 审核（七牛云）异步处理正常工作
5. 用户可见审核状态流转（"审核中" → "已发布" / "已驳回"）
6. 提交时图片/视频的正确 ID 传入后端（确认为真实 URL，非 blob URL）

---

### TASK-010: 死代码清理 + 配置统一

- **task_name**: 死代码清理与构建配置统一
- **requirement_ids**: [REQ-010]
- **type**: 直接开发
- **priority**: P2
- **estimated_lines**: ~80 (S)
- **test_strategy**: --（TypeScript 编译 + ESLint 验证替代测试）
- **owner**: frontend-implementer
- **dependencies**: [TASK-005, TASK-006]（需在迁移完成后才能移除旧实现）
- **parallel_group**: [TASK-009]
- **risk**: 低（清理式变更，CI 可自动验证）

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `apps/web/src/components/rich-text-editor.tsx` | 原有实现替换为 re-export（约 219 → 3 行） |
| 修改 | `apps/admin/src/components/admin-rich-text-editor.tsx` | 原有实现替换为 re-export（约 216 → 3 行） |
| 删除 | `apps/web/src/components/rich-text-editor-helpers.ts` | 合并后替换为 re-export |
| 修改 | `apps/admin/src/components/admin-rich-text-editor-helpers.ts` | 删除共享函数，仅保留 Admin 独有逻辑 |
| 修改 | `apps/admin/vite.config.ts` | 统一 WangEditor manualChunks（参考 Web 端配置） |
| 修改 | `apps/web/vite.config.ts` | 如有差异则统一 |
| 检查 | `apps/admin/package.json` | 移除未使用的 `@tiptap/*` 依赖（当前仅在 vite.config 中出现） |
| 检查 | `apps/web/package.json` | 移除未使用的 `@tiptap/*` 依赖 |
| 检查 | 全局 | 确认无死 import 残留 |

**清理清单：**

| 检查项 | 方法 | 预期结果 |
|--------|------|---------|
| 旧编辑器组件文件 | 检查 import 引用，确认仅 re-export | 无业务代码残留 |
| 旧 helpers 文件 | 确认所有导入来源已切换到 `@feijia/rich-text-editor` | `import { extractPlainTextFromHtml } from "@feijia/rich-text-editor"` |
| `@tiptap/*` 依赖 | `bun remove @tiptap/core @tiptap/extension-link ...` | `package.json` 中无 tiptap 依赖 |
| vite.config WangEditor chunks | 两端配置一致 | 两端 `getWangeditorManualChunk` 函数相同 |
| ESLint/TS 验证 | `bun run lint` + `bun run typecheck` | 无 error |

**完成标准：**
1. `apps/web/src/components/rich-text-editor.tsx` 仅为 re-export
2. `apps/admin/src/components/admin-rich-text-editor.tsx` 仅为 re-export
3. `apps/web/src/components/rich-text-editor-helpers.ts` 仅为 re-export
4. `apps/admin/src/components/admin-rich-text-editor-helpers.ts` 仅含 Admin 编辑域逻辑
5. `@tiptap/*` 依赖确认已移除（如未被其他模块引用）
6. Admin 和 Web 的 vite.config.ts WangEditor 手动分块配置一致
7. TypeScript 编译无错误、ESLint 无 error、现有测试全部通过

---

## 四、DDD 与 TDD 分类

### DDD 任务（1 项）

| TASK | 名称 | DDD 理由 |
|------|------|---------|
| TASK-003 | 共享编辑器组件 + 延迟上传 | 核心业务规则集中：编辑器生命周期、媒体状态流转（blob → 上传中 → 已上传）、组件聚合根（WangEditor + MediaManager + 批量上传器协同）、两套变体（Web/Admin）的样式策略 |

领域建模要点：
- **聚合根**：`RichTextEditor` 组件封装 WangEditor 实例 + 媒体状态
- **值对象**：`EditorChange { html, plainText }` 不可变
- **领域服务**：延迟上传流程编排（register → preview → batch upload → replace）
- **领域事件**：`onChange`（内容变化）、`customUpload`（媒体插入）

### TDD 任务（2 项）

| TASK | 名称 | TDD 理由 |
|------|------|---------|
| TASK-002 | MediaManager | IndexedDB CRUD + blob URL 生命周期 + 跨会话恢复 = 高风险数据完整性 |
| TASK-004 | 批量上传 + URL 替换 | 并行上传容错 + HTML 解析替换 + 部分失败处理 = 必须测试覆盖 |

### 直接开发任务（7 项）

| TASK | 名称 | 理由 |
|------|------|------|
| TASK-001 | 共享包脚手架 | 配置文件创建，无复杂逻辑 |
| TASK-005 | Web 端迁移 | 接口适配 + 集成验证（test_after），非算法逻辑 |
| TASK-006 | Admin 端迁移 | 同上 |
| TASK-007 | Admin 其他页面延迟上传 | 改造模式清晰，重复操作，test_after 验证即可 |
| TASK-008 | Admin 草稿 | 复用现有 IndexedDB 模式，S 级规模 |
| TASK-009 | 内容安全扫描 | 验证为主，可能含少量修复 |
| TASK-010 | 死代码清理 | 删除 + 重导出，无逻辑变更 |

---

## 五、风险任务

| TASK | 风险等级 | 风险描述 | 缓解措施 |
|------|---------|---------|---------|
| TASK-003 | **高** | L 级（~260 行），WangEditor customUpload 纵深改造，video-module 时序 Bug | 先在隔离环境验证 blob URL + insertFn 同步行为；保留原组件不动 |
| TASK-004 | **中** | 并行上传容错逻辑、HTML 解析双路径（DOMParser + 正则回退） | TDD 全覆盖 12 个场景 |
| TASK-005 | **高** | 修改 Web 端生产发布路径 | test_after 覆盖创建/编辑/草稿恢复全链路 |
| TASK-006 | **高** | 修改 Admin 端核心创建流程，含 React.lazy + Suspense 加载链路 | test_after 覆盖创建/编辑流程 |
| TASK-007 | **中** | L 级（~200 行），跨 3 个独立页面 | 改造模式一致，可逐页面验证 |

---

## 六、文件所有权与共享区域

### 共享区域（需协调写入）

| 文件 | 主要负责人 | 其他访客 | 协调方式 |
|------|-----------|---------|---------|
| `packages/rich-text-editor/src/index.ts` | TASK-001（创建） | TASK-002/003/004（追加 export） | 各任务追加独立行，无冲突 |
| `packages/rich-text-editor/src/rich-text-editor-helpers.ts` | TASK-001（创建 + 合并） | TASK-003（可能新增类型） | TASK-003 依赖 TASK-001 完成 |
| `apps/admin/src/components/admin-rich-text-editor-helpers.ts` | TASK-001（trim 共享函数） | TASK-006（调整 import） | TASK-001 先执行，TASK-006 后续 |
| `apps/admin/vite.config.ts` | TASK-010（清理 tiptap + 统一 chunk） | -- | 独占 |

### 独立文件（无冲突）

- TASK-002 独有：`media-manager.ts`、`media-manager.test.ts`
- TASK-003 独有：`rich-text-editor.tsx`、`rich-text-editor.test.tsx`
- TASK-004 独有：`media-uploader.ts`、`media-uploader.test.ts`
- TASK-005 独有：`apps/web/src/components/rich-text-editor.tsx`、`publish-article-page.tsx`
- TASK-006 独有：`apps/admin/src/components/admin-rich-text-editor.tsx`、`official-article-editor-page.tsx`
- TASK-007 独有：3 个 Admin 创建页文件（互不重叠）
- TASK-008 独有：`apps/admin/src/lib/uploads/draft-store.ts`
- TASK-009 独有：仅验证，无代码变更（或微量修复）

### 串行约束

以下任务因共享文件必须串行执行：
- TASK-003 依赖 TASK-001（需共享 helpers 类型）
- TASK-005 依赖 TASK-003（需共享组件完成）
- TASK-006 依赖 TASK-003（需共享组件完成）
- TASK-010 依赖 TASK-005 + TASK-006（需在迁移完成后方可清理旧文件）

---

## 七、推荐交付顺序

```
第 1 轮: 基础设施  (~330 行)
  ├── TASK-001 创建共享包脚手架 + helpers 合并 (P0)
  └── TASK-002 实现 MediaManager (P0, TDD)
  → 验证: 共享包可 install，helpers 测试通过，MediaManager 10 个 TDD 场景全绿

第 2 轮: 核心组件  (~400 行)
  ├── TASK-003 构建共享编辑器组件 + 延迟上传 (P0, L)
  └── TASK-004 实现批量上传 + URL 替换 (P0, TDD)
  → 验证: 编辑器 blob 预览正常，视频插入 Bug 修复，12 个上传测试全绿

第 3 轮: 页面迁移  (~490 行)
  ├── TASK-005 Web 端文章编辑器迁移 (P0)
  ├── TASK-006 Admin 端文章编辑器迁移 + 延迟上传 (P0)
  └── TASK-007 Admin 其他创建页改为延迟上传 (P1, L)
  → 验证: Web 和 Admin 端文章创作全链路正常

第 4 轮: 增强与收尾  (~230 行)
  ├── TASK-008 Admin 端草稿持久化 (P2)
  ├── TASK-009 内容安全扫描验证 (P0)
  └── TASK-010 死代码清理 + 配置统一 (P2)
  → 验证: 全平台发布流程 + 审核流程 + 代码整洁
```

**总预估变更行数**: 1,420 行（超出 1,000 行阈值，必须分轮次交付）

---

## 八、验证清单（任务分解自检）

- [x] 所有 REQ-XXX 至少映射到 1 个 TASK
  - REQ-001: TASK-001, TASK-003, TASK-005
  - REQ-002: TASK-002
  - REQ-003: TASK-003
  - REQ-004: TASK-003
  - REQ-005: TASK-004
  - REQ-006: TASK-006
  - REQ-007: TASK-007
  - REQ-008: TASK-008
  - REQ-009: TASK-009
  - REQ-010: TASK-010
- [x] 使用垂直切片策略（组件 → 页面 → 提交链路）
- [x] 无水平切片（按技术层级拆分）
- [x] 每个任务有明确 test_strategy
- [x] 依赖关系无循环依赖
- [x] 并行机会已识别
  - 第 1 轮：TASK-001 || TASK-002
  - 第 2 轮：TASK-003 || TASK-004
  - 第 3 轮：TASK-005 || TASK-006 || TASK-007
  - 第 4 轮：TASK-008 || TASK-009 || TASK-010
- [x] 风险任务已标注（TASK-003 高、TASK-005 高、TASK-006 高、TASK-007 中、TASK-004 中）
- [x] 分轮次交付（4 轮，单轮最大 ~490 行，<1000 行阈值）
- [x] 共享区域已指定协调方式
- [x] 每个任务有可独立验证的完成标准

---

## 九、推荐的下一步

运行 Planner Agent，从第 1 轮开始编制实现计划：

```
/jarvis --plan --round=1 --task-doc=docs/tasks/2026-05-04-rich-text-editor-unification-tasks.md
```
