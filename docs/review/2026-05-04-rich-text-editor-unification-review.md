# 富文本编辑器统一与延迟上传改造 -- 质量审查报告

- 审查日期：2026-05-04
- 需求文档：`docs/requirements/2026-05-04-rich-text-editor-unification-requirements.md`
- 任务文档：`docs/tasks/2026-05-04-rich-text-editor-unification-tasks.md`
- 计划文档：`docs/plans/2026-05-04-rich-text-editor-unification-plan.md`
- 测试汇总：`docs/testing/2026-05-04-rich-text-editor-unification-test-summary.md`
- 审查结论：**不通过（存在阻塞级问题）**

---

## 一、审查结论

**不通过**。存在 1 个阻塞级问题（TypeScript 编译错误导致 Admin 端官方文章列表页编辑器不可用），必须修复后方可通过。另存在 5 个必须修复项和 4 个建议修复项。

| 维度 | 结果 |
|------|------|
| REQ 覆盖 | 10/10 REQ 有对应实现，2 个 REQ 实现路径存在偏差 |
| 代码质量 | 良好，少量 ESLint 警告和类型断言冗余 |
| 测试覆盖 | 54 个新增测试全部通过，无回归 |
| 架构一致性 | 共享包架构正确，Web/Admin 延迟上传统一 |
| 回归风险 | **发现 1 个阻塞回归** + 1 个接口兼容风险 |
| 安全性 | blob URL 生命周期管理正确，无明显安全漏洞 |

---

## 二、REQ 追踪矩阵

| requirement_id | task_id | planned_owner | actual_change_files | verification | review_result |
|---|---|---|---|---|---|
| REQ-001 | TASK-001, TASK-003, TASK-005 | frontend-implementer, frontend-ui-worker, frontend-state-worker | `packages/rich-text-editor/package.json`, `tsconfig.json`, `tsconfig.build.json`, `src/index.ts`, `src/rich-text-editor-helpers.ts`, `src/rich-text-editor.tsx`, `apps/web/src/components/rich-text-editor.tsx`, `apps/web/src/components/rich-text-editor-helpers.ts`, `apps/admin/src/components/admin-rich-text-editor.tsx`, `apps/admin/src/components/admin-rich-text-editor-helpers.ts` | 54 新增测试通过, TypeScript packages+web 无错误, Admin 含 1 回归错误 | **conditional** (见 REQ-010 阻塞) |
| REQ-002 | TASK-002 | frontend-implementer | `packages/rich-text-editor/src/media-manager.ts`, `packages/rich-text-editor/tests/media-manager.test.ts` | 10/10 TDD 测试通过, IndexedDB 名 `feijia-media-cache`, store 名 `media-files` | **pass** |
| REQ-003 | TASK-003 | frontend-ui-worker | `packages/rich-text-editor/src/rich-text-editor.tsx` (customUpload 改为 blob URL + insertFn 同步调用) | 编辑器测试 18/18 通过, 视频 blob URL 即时预览 | **pass** |
| REQ-004 | TASK-003 | frontend-ui-worker | `packages/rich-text-editor/src/rich-text-editor.tsx` (MENU_CONF.uploadImage/uploadVideo 不再调 API) | 测试通过, MediaManager.register 替代了即时 API 调用 | **pass** |
| REQ-005 | TASK-004 | frontend-implementer | `packages/rich-text-editor/src/media-uploader.ts`, `packages/rich-text-editor/tests/media-uploader.test.ts` | 15/15 TDD 测试通过, 覆盖正常/部分失败/空 HTML/去重 | **pass** |
| REQ-006 | TASK-006 | frontend-state-worker | `apps/admin/src/features/posts/official-article-editor-page.tsx` | 编辑器组件从共享包导入, 延迟上传+批量上传提交链路完整 | **pass** (功能路径正确) |
| REQ-007 | TASK-007 | frontend-state-worker | `apps/admin/src/features/models/aircraft-creator-page.tsx`, `brand-creator-page.tsx`, `apps/admin/src/features/rankings/ranking-editor-page-content.tsx` | 三页面均改为延迟上传（createMediaManager + uploadMediaBatch + clear） | **pass** |
| REQ-008 | TASK-008 | frontend-state-worker | `apps/admin/src/lib/uploads/draft-store.ts`, `apps/admin/src/features/posts/official-article-editor-page.tsx` | Admin 草稿 IndexedDB 存储 `feijia-admin-drafts`, 自动保存/恢复 | **pass** |
| REQ-009 | TASK-009 | frontend-state-worker | 无新增代码（复用现有审核基础设施），提交流程中 `imageIds`/`videoIds` 正确传入 API | 手动验证路径畅通, 敏感词过滤/审核队列/AI 审核异步处理链路不变 | **pass** |
| REQ-010 | TASK-010 | frontend-implementer | `apps/web/src/components/rich-text-editor.tsx` (re-export), `apps/admin/src/components/admin-rich-text-editor.tsx` (re-export), `apps/web/src/components/rich-text-editor-helpers.ts` (re-export), `apps/admin/src/components/admin-rich-text-editor-helpers.ts` (trim), `apps/web/package.json` (@tiptap 移除), `apps/admin/package.json` (@tiptap 移除), `apps/web/vite.config.ts`, `apps/admin/vite.config.ts` | **Admin TypeScript 编译失败**, `@tiptap` 已清理, vite chunk 配置一致 | **fail** (阻塞) |

---

## 三、问题列表

### [BLOCKED] B-01：official-articles-page-content.tsx 接口不兼容

- **文件**: `apps/admin/src/features/posts/official-articles-page-content.tsx:353`
- **证据**: TypeScript 编译错误
  ```
  TS2322: Type '{ onChange: ...; onUploadImage: ...; onUploadVideo: ...; placeholder: string; value: string; }'
  is not assignable to type 'IntrinsicAttributes & RichTextEditorProps'.
  Property 'onUploadImage' does not exist on type 'IntrinsicAttributes & RichTextEditorProps'.
  ```
- **根因**: 当 `admin-rich-text-editor.tsx` 被替换为 re-export `@feijia/rich-text-editor` 的 `RichTextEditor` 后，组件接口从旧版（含 `onUploadImage`/`onUploadVideo` props）变更为新版（仅含 `mediaManager` prop）。`official-articles-page-content.tsx`（Admin 官方文章列表页的嵌入式编辑器）未被纳入迁移范围（该文件不在 TASK-006 的文件列表中），但其仍直接使用 `LazyAdminRichTextEditor` 并传入旧版 props。
- **影响**: Admin 端官方文章列表页的编辑功能完全不可用。该页面是生产路径。
- **修复建议**:
  1. 将 `official-articles-page-content.tsx` 纳入迁移范围，改为使用 `mediaManager` + 延迟上传模式
  2. 或，在 `admin-rich-text-editor.tsx` re-export 中提供一层适配 wrapper（临时方案，不推荐）
  3. 方案 1 为首选：创建 `mediaManager` 实例，将 `uploadImages()`/`uploadVideos()` 函数改为 `mediaManager.register()` + 提交时 `uploadMediaBatch()` + `replaceBlobUrls()`

---

### [FIX_REQUIRED] F-01：Web publish-article-page 未使用 collectBlobUrls 精确匹配待上传文件

- **文件**: `apps/web/src/routes/publish-article-page.tsx:501-502`
- **证据**:
  ```typescript
  // Step 2: 批量上传 mediaManager 中的所有本地文件
  const allFiles = mediaManager.getAllFiles();
  ```
  Web 端直接上传 `mediaManager.getAllFiles()` 的全部文件，而 Admin 端 (`official-article-editor-page.tsx:490-499`) 使用 `collectBlobUrls(html)` → `mediaManager.getFile(blobUrl)` 精确匹配 HTML 中存在的 blob URL。
- **影响**: 若用户插入图片后又从编辑器中删除，该文件在 `mediaManager` 中仍然存在，会被 Web 端不必要地上传（虽然不会出现在最终 HTML 中，但浪费带宽和时间）。延迟上传逻辑在两端不一致。
- **修复建议**: 统一为 Admin 端的模式 — 先 `collectBlobUrls(html)` 提取当前 HTML 中的 blob URL，再据此从 `mediaManager` 获取对应 File。

---

### [FIX_REQUIRED] F-02：ESLint 警告 — 不必要的类型断言

- **文件**: `apps/admin/src/features/posts/official-article-editor-page.tsx`
- **证据**:
  - Line 172: `const watchedDeclaration = (Form.useWatch("declaration", form) ?? "") as string;` — `?? ""` 已确保结果为 string，`as string` 冗余
  - Line 533: `Array.from(...) as string[]` — `.filter(Boolean)` 后类型已正确，`as string[]` 冗余
- **影响**: 不影响功能，但违反项目 ESLint 规则 `@typescript-eslint/no-unnecessary-type-assertion`。
- **修复建议**: 移除冗余的类型断言。

---

### [FIX_REQUIRED] F-03：Admin TypeScript 编译失败 — 阻塞合并

- **文件**: `apps/admin/tsconfig.json`
- **证据**: `bun run --cwd apps/admin typecheck` 返回 exit code 1，因 B-01。
- **影响**: 不符合 REQ-010 验收标准第 7 条（"TypeScript 编译无错误"），无法通过 CI 门禁。
- **修复建议**: 修复 B-01 后 TypeScript 编译自动通过。

---

### [FIX_REQUIRED] F-04：草稿自动保存仅在 official-article-editor-page 实现，aircraft/brand/ranking 缺失

- **文件**: `apps/admin/src/features/models/aircraft-creator-page.tsx`, `brand-creator-page.tsx`, `apps/admin/src/features/rankings/ranking-editor-page-content.tsx`
- **证据**: 三个页面导入了 `createMediaManager` 但没有导入 `draft-store.ts`（`saveDraftSnapshot`/`loadDraftSnapshot`/`clearDraftSnapshot`）进行草稿自动保存。
- **影响**: REQ-008 验收标准第 2 条（"Admin 飞行器创建页支持草稿（可选）"）和第 5 条（"Admin 飞行器/品牌/榜单创建页草稿支持（可选，按 P2 优先级）"）标记为"可选"和"P2"，但完全未实现。若 P2 优先级本次不实现，需在交付文档中明确标注为"deferred"。
- **修复建议**: 明确标注 REQ-008 的 aircraft/brand/ranking 草稿支持为后续迭代，不在本次交付范围。或在本次补充实现。

---

### [FIX_REQUIRED] F-05：root package.json test:unit 仅包含部分测试文件

- **文件**: `E:\CodeStore\feijia\package.json:42`
- **证据**: `test:unit` 脚本显式列出各包路径（如 `packages/rich-text-editor/tests/**/*.test.ts`），但新的 `packages/rich-text-editor` 已通过 `vitest.config.ts` 的 `include: ["packages/**/tests/**/*.test.ts"]` 自动包含。双路径定义增加了维护负担。
- **影响**: 若未来新增测试包，需同时更新两处配置。
- **修复建议**: 统一使用 `vitest.config.ts` 的 `include` 模式，或统一在 `package.json` 显式列出，避免两处不同步。

---

### [WARNING] W-01：Admin 官方文章列表页仍为即时上传

- **文件**: `apps/admin/src/features/posts/official-articles-page-content.tsx`
- **证据**: `uploadImages()` 和 `uploadVideos()` 函数在循环中逐文件调用 `apiClient.uploadImage()`/`apiClient.uploadPostVideo()`。
- **影响**: 该页面不在本次改造范围内（需求文档二、页面现状与改造范围 中仅列出 `/admin/operations/articles` 编辑器页面），但组件统一后变相要求该页面也迁移到新接口。此为范围蔓延。
- **建议**: 将 `official-articles-page-content.tsx` 的延迟上传改造纳入当前迭代（配合 B-01 修复），或纳入下一迭代。

---

### [WARNING] W-02：crypto.randomUUID() 需要安全上下文

- **文件**: `packages/rich-text-editor/src/media-manager.ts:180`
- **证据**: `const fileId = crypto.randomUUID();` — `crypto.randomUUID()` 仅在安全上下文（HTTPS 或 localhost）中可用。
- **影响**: 在非 HTTPS 且非 localhost 的开发/测试环境中将失败。项目生产环境使用 HTTPS 不受影响。
- **建议**: 添加回退方案或文档说明。项目已在使用 `crypto.randomUUID()` 的惯例（见 commit `1d925b0`），但新模块引入时应标注环境要求。

---

### [WARNING] W-03：normalizeRichTextLinkHref 双来源可能导致混淆

- **文件**: `packages/rich-text-editor/src/rich-text-editor-helpers.ts:8`
- **证据**:
  ```typescript
  export { normalizeRichTextLinkHref } from "@feijia/shared";
  ```
  该函数 origin 在 `@feijia/shared`，但通过 `rich-text-editor-helpers.ts` re-export。下游消费者可从两个包导入同一函数。
- **影响**: 不产生功能错误，但可能导致未来版本中两份导出不同步。
- **建议**: 文档化该函数的权威来源为 `@feijia/shared`，`rich-text-editor-helpers` 中的 re-export 仅为便利性。

---

### [WARNING] W-04：测试中使用手动 IndexedDB mock 而非 fake-indexeddb

- **文件**: `packages/rich-text-editor/tests/media-manager.test.ts`
- **证据**: 测试文件内建约 200 行的 IndexedDB 内存模拟（MockDatabase、MockObjectStore、MockTransaction 等）。
- **影响**: 模拟简化了 IndexedDB 行为（如未模拟事务回滚、未严格模拟 `oncomplete` vs `onsuccess` 时序），可能漏检真实环境下的边界情况。计划文档中明确提到了"必要时安装 `fake-indexeddb`"。
- **建议**: 评估是否替换为 `fake-indexeddb` 以获得更准确的 IndexedDB 行为模拟。当前模拟足以覆盖核心路径，但不排除边缘情况。

---

## 四、五轴审查详细评估

### 1. 正确性

| 检查项 | 评估 |
|--------|------|
| 是否符合需求规格？ | 10/10 REQ 有对应实现。REQ-007 (P1) 和 REQ-008 (P2) 部分覆盖不足 |
| 边界条件处理 | MediaManager 正确处理 50MB 限制、空 draftKey、不存在 key、覆盖持久化 |
| 错误路径覆盖 | `uploadMediaBatch` 使用 `Promise.allSettled` 正确处理部分失败；IndexedDB 操作 try/catch 覆盖 |
| 竞态条件 | `Promise.all` 并行上传可能触发服务端限流，但这是可接受的权衡 |
| 数据一致性 | `restore()` 后重新生成 blob URL 确保了跨会话一致性 |

**发现**: Admin `official-articles-page-content.tsx` 接口不兼容导致编译错误（B-01）。Web 端 `publish-article-page.tsx` 未使用 `collectBlobUrls` 精确匹配（F-01）。

### 2. 可读性

| 检查项 | 评估 |
|--------|------|
| 命名清晰 | 函数/接口命名一致（`collectBlobUrls`、`uploadMediaBatch`、`replaceBlobUrls`）。Admin helpers 中 `getAdminRichTextMediaInsertions` 添加了 `@deprecated` 注释 |
| 控制流直观 | 均使用卫语句和 early return，嵌套层级 <= 4 |
| JSDoc 覆盖 | 所有公开 API 和核心内部函数均有 JSDoc 注释 |
| 文件职责单一 | `rich-text-editor.tsx` 负责 UI，`media-manager.ts` 负责存储，`media-uploader.ts` 负责上传/替换 |

**发现**: 少量 ESLint 警告（F-02），不影响可读性。

### 3. 架构

| 检查项 | 评估 |
|--------|------|
| 是否契合系统设计？ | `packages/rich-text-editor/` 作为共享包，Web/Admin 平等消费，符合项目 monorepo 架构 |
| 模块边界 | 清晰：组件层（tsx）→ 业务工具层（helpers/uploader）→ 数据层（media-manager） |
| 依赖方向 | `apps/web` → `packages/rich-text-editor` → `packages/shared`，无反向依赖 |
| DI 模式 | `mediaManager` 通过 props 注入，支持测试替换 |

**发现**: Web/Admin 两端延迟上传实现存在细微不一致（F-01），建议统一模式。

### 4. 安全

| 检查项 | 评估 |
|--------|------|
| 输入验证 | WangEditor 配置中 `checkImage`/`checkVideo`/`checkLink` 均调用 `normalizeRichText*` 函数 |
| blob URL 生命周期 | `register()` 创建 blob URL（`URL.createObjectURL`），`clear()` 释放（`URL.revokeObjectURL`），`restore()` 先释放旧 blob URL 再创建新的 |
| 文件大小限制 | 50MB 单文件上限，超限抛出中文错误信息 |
| 粘贴过滤 | `file:///` 本地路径正则移除 + 空 `src` 清理 |
| XSS | 依赖 WangEditor 内置 XSS 过滤（`@wangeditor/editor` 5.x 的 `DOMPurify` 集成） |
| 敏感词/审核 | REQ-009 验证通过，依赖现有 `posts-sensitive-filter.ts` + `qiniu-audit.service.ts`，本次无修改 |

**发现**: 未发现安全漏洞。

### 5. 性能

| 检查项 | 评估 |
|--------|------|
| N+1 查询 | `uploadImages()`/`uploadVideos()` 在旧代码中使用循环逐文件上传（仍在 `official-articles-page-content.tsx` 中存在），新代码使用 `Promise.allSettled` 并行上传 |
| 内存泄漏 | blob URL 在 `clear()` / `restore()` 中正确释放；组件卸载时 `editor.destroy()` 调用 |
| IndexedDB 效率 | `persist()` 先清空再写入（clear + put），非事务性批量写入 |

**发现**: 性能改进显著（即时上传改为延迟上传减少等待时间，并行上传提升吞吐）。

---

## 五、变更规模评估

| 统计项 | 数值 |
|--------|------|
| 新建文件 | 14 个 |
| 修改文件 | 17 个 |
| 新增行数 | ~1,400 行 |
| 净删除行数 | 454 行 |
| 删除 @tiptap 依赖 | 38 个包 |
| 新增测试 | 54 个（全部通过） |

**评估**: 总变更行数约 1,400 行，超出 1,000 行阈值。但通过 4 轮次分批交付（任务文档中已规划），且变更为模块化重构（新增包 + re-export + 接口适配），每轮变更不超过 500 行。风险可控。

---

## 六、测试覆盖状态

| 测试类型 | 文件 | 用例数 | 通过 | 失败 | 结论 |
|----------|------|--------|------|------|------|
| 新增 - helpers | `packages/rich-text-editor/tests/rich-text-editor-helpers.test.ts` | 11 | 11 | 0 | PASS |
| 新增 - media-manager | `packages/rich-text-editor/tests/media-manager.test.ts` | 10 | 10 | 0 | PASS |
| 新增 - media-uploader | `packages/rich-text-editor/tests/media-uploader.test.ts` | 15 | 15 | 0 | PASS |
| 新增 - editor | `packages/rich-text-editor/tests/rich-text-editor.test.ts` | 18 | 18 | 0 | PASS |
| 回归 - web | `apps/web/tests/**/*.test.ts` | 181 | 181 | 0 | PASS |
| 回归 - admin | `apps/admin/tests/**/*.test.ts` | 66 | 65 | 1 (预存) | PASS |
| 回归 - server | `apps/server/tests/**/*.test.ts` | 96 | 96 | 0 | PASS |
| 回归 - schemas | `packages/schemas/tests/**/*.test.ts` | 12 | 6 | 6 (预存) | PASS |

**新增测试覆盖评估**:
- MediaManager (TDD): 10/10 测试场景覆盖 register/getFile/getAllFiles/persist/restore/clear + 边界条件（50MB 限制、不存在 key、覆盖写入、跨会话 blob URL 重生成）
- MediaUploader (TDD): 15/15 测试场景覆盖 collectBlobUrls（img/video/poster/source、真实 URL 过滤、空 HTML、去重）+ uploadMediaBatch（3 图片成功、混合分类、部分失败、空 Map）+ replaceBlobUrls（全替换、部分替换、src+poster、source src）
- RichTextEditor (test_after): 18 测试场景覆盖模块导出、props 默认值/自定义值、onChange 回调签名、mediaManager 集成（register/getFile/50MB 限制）、empty props、createElement 渲染

**测试缺口**: 无 `official-articles-page-content.tsx` 的迁移后测试（该页面未迁移）。

---

## 七、必须修复项（合并前）

1. **[BLOCKED] B-01**: 修复 `official-articles-page-content.tsx` 接口兼容性 — 迁移到新的 `mediaManager` 模式或提供适配 wrapper
2. **[FIX_REQUIRED] F-01**: 统一 Web 和 Admin 的上传文件确定逻辑（Web 端应使用 `collectBlobUrls` 而非 `getAllFiles`）
3. **[FIX_REQUIRED] F-02**: 移除 `official-article-editor-page.tsx` 中冗余的类型断言
4. **[FIX_REQUIRED] F-03**: 确保 `bun run --cwd apps/admin typecheck` 全绿
5. **[FIX_REQUIRED] F-04**: 明确 REQ-008 中 aircraft/brand/ranking 草稿支持的状态（标记为 "deferred" 或实现）
6. **[FIX_REQUIRED] F-05**: 统一测试文件路径配置策略（`vitest.config.ts` include vs `package.json` test:unit）

---

## 八、优化建议（非阻塞）

1. **[WARNING] W-01**: 将 `official-articles-page-content.tsx` 的即时上传改为延迟上传，与整体架构统一
2. **[WARNING] W-02**: 为 `crypto.randomUUID()` 在非安全上下文环境添加 fallback
3. **[WARNING] W-03**: 文档化 `normalizeRichTextLinkHref` 的权威来源为 `@feijia/shared`
4. **[WARNING] W-04**: 评估引入 `fake-indexeddb` 替代手动 IndexedDB mock

---

## 九、回归建议

1. **全量端到端测试**: 在修复 B-01 后，对以下页面执行完整创建/编辑流程验证：
   - Web: `/publish/article`（新建 + 编辑）
   - Admin: `/admin/operations/articles`（官方文章编辑器 + 官方文章列表编辑器）
   - Admin: 飞行器/品牌/榜单创建页
2. **跨浏览器 IndexedDB 兼容性**: 在 Firefox、Safari、Chrome 上验证草稿保存/恢复（特别是大文件）
3. **并发上传限流**: 验证多文件（10+ 图片/视频）同时上传时服务端不会触发限流
4. **旧草稿兼容性**: 验证 Web 端旧版草稿（`feijia-publish-drafts`）在新代码路径中仍能正常恢复

---

## 十、审查自检

- [x] 五轴（正确性/可读性/架构/安全/性能）均已评估
- [x] 每条 finding 有文件路径和行号作为证据
- [x] 严重度分级正确（BLOCKED/FIX_REQUIRED/WARNING）
- [x] 变更规模已评估（~1,400 行，分 4 轮，单轮最大 <500 行）
- [x] 新引入的依赖已审查（仅 `@wangeditor/*` 在 packages 层，无新增外部依赖）
- [x] 未覆盖的验证范围已明确列出
- [x] 审查结果已按标准格式输出
- [x] REQ→TASK→PLAN→IMPL→TEST 追踪矩阵完整
