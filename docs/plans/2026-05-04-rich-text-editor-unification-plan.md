# 富文本编辑器统一与延迟上传改造 -- 第 1 轮执行计划

- **需求文档**: `docs/requirements/2026-05-04-rich-text-editor-unification-requirements.md`
- **任务文档**: `docs/tasks/2026-05-04-rich-text-editor-unification-tasks.md`
- **计划日期**: 2026-05-04
- **当前轮次**: 第 1 轮（基础设施）
- **总轮次**: 4 轮中的第 1 轮

---

## 一、Gate B 检查结果

| 检查项 | 结果 |
|--------|------|
| Task ID 完整（TASK-XXX 格式） | PASS |
| 每个任务映射到至少一个 REQ-XXX | PASS |
| 类型完整（前端/后端/共享/测试） | PASS |
| 优先级完整、完成标准完整 | PASS |
| DDD 分类完整、TDD/直接开发分类完整 | PASS |
| 风险任务已标注、文件所有权提醒已写明 | PASS |
| test_strategy 全部指定 | PASS |
| 垂直切片检查 | PASS（组件→页面→提交链路） |

**路径纠正**: 任务文档中测试文件路径为 `packages/rich-text-editor/src/__tests__/`，但 vitest 配置 (`vitest.config.ts`) 匹配模式为 `packages/**/tests/**/*.test.ts`。计划中统一使用 `packages/rich-text-editor/tests/` 目录以匹配项目 vitest 约定。

---

## 二、当前轮次目标

搭建共享包 `@feijia/rich-text-editor` 的基础设施，完成 helpers 合并和 MediaManager 实现，为第 2 轮核心编辑器组件提供类型契约和媒体管理能力。

---

## 三、当前轮次范围

### 纳入任务

| TASK | 名称 | 映射 REQ | 策略 | 预估行数 |
|------|------|---------|------|---------|
| TASK-001 | 创建共享包脚手架 + 合并 helpers | REQ-001 | 直接开发 | ~150 (M) |
| TASK-002 | 实现 MediaManager | REQ-002 | TDD | ~580 (M) |

### 范围外（本轮次不涉及）

- 共享 WangEditor 组件（TASK-003，第 2 轮）
- 批量上传 + URL 替换（TASK-004，第 2 轮）
- Web/Admin 页面迁移（TASK-005/006/007，第 3 轮）
- Admin 草稿、安全扫描、死代码清理（TASK-008/009/010，第 4 轮）

### 预估总变更行数

~730 行（< 1000 行阈值，可在单轮次内安全交付）

---

## 四、完成标准（轮次级）

1. `packages/rich-text-editor/` 包通过 `bun install` 正确安装为工作区成员
2. `rich-text-editor-helpers.ts` 包含 Web 端所有共享函数 + Admin 端共享函数，JSDoc 完整
3. `packages/rich-text-editor/src/index.ts` 导出 helpers 和 MediaManager 函数
4. 现有 `apps/web/tests/rich-text-editor-helpers.test.ts` 和 `apps/admin/tests/admin-rich-text-editor-helpers.test.ts` 全部通过（无回归）
5. `apps/admin/src/components/admin-rich-text-editor-helpers.ts` 仅保留 Admin 编辑域独有逻辑
6. MediaManager 全部 10 个 TDD 测试场景通过（红→绿→重构完成）
7. TypeScript 编译无错误（`tsc -p tsconfig.json`）
8. ESLint 无 error

---

## 五、代码结构查阅

**本轮次无需先查阅 repo-explorer**。原因：
- 已有 helpers 文件已在规划前完成读取（`apps/web/src/components/rich-text-editor-helpers.ts`、`apps/admin/src/components/admin-rich-text-editor-helpers.ts`）
- 包配置文件模板已从 `packages/shared/` 获取参考
- vitest 配置已确认扫描 `packages/**/tests/**/*.test.ts`

---

## 六、执行代理分工

| TASK | owner | 理由 |
|------|-------|------|
| TASK-001 | frontend-implementer | 包脚手架配置 + helpers 合并 + re-export 适配，涉及多文件创建和修改 |
| TASK-002 | frontend-implementer | TDD 全程（红→绿→重构），IndexedDB/Blob URL 逻辑，归属前端实现域 |

---

## 七、共享区域改动归属

### 本轮次涉及共享区域

| 文件 | 唯一责任方 | 操作 | 说明 |
|------|-----------|------|------|
| `packages/rich-text-editor/src/index.ts` | TASK-001 | 创建 + 初始导出 | TASK-002 在 TASK-001 完成后追加导出行 |
| `packages/rich-text-editor/src/rich-text-editor-helpers.ts` | TASK-001 | 创建 + 合并 | 唯一责任方，TASK-002 仅读取类型 |
| `apps/admin/src/components/admin-rich-text-editor-helpers.ts` | TASK-001 | trim 共享函数 | TASK-001 负责删除已合并到 packages 的函数 |

### 独立文件（无冲突）

- TASK-002 独占: `packages/rich-text-editor/src/media-manager.ts`、`packages/rich-text-editor/tests/media-manager.test.ts`

### 串行约束

TASK-002 必须等待 TASK-001 完成，原因：
1. TASK-002 需要 `UploadedMediaAsset` 等类型定义（定义在 TASK-001 产出的 helpers 中）
2. TASK-002 需要 `packages/rich-text-editor/src/index.ts` 已存在的文件来追加导出
3. TASK-002 的 TDD 红阶段需要引用 TASK-001 产出的类型

---

## 八、并行/串行策略

```
Round 1 串行链:
  Batch 1: TASK-001 (frontend-implementer)
    └── 完成后，可选运行现有测试快速验证 helpers 无回归
  Batch 2: TASK-002 (frontend-implementer)
    └── TDD: Red → Green → Refactor
    └── 完成后，全部 vitest 测试通过
```

**本轮次无并行组**。TASK-001 和 TASK-002 存在共享文件依赖（index.ts）和类型依赖（UploadedMediaAsset），必须串行执行。

> 说明：任务文档标注 TASK-001 和 TASK-002 可在 parallel_group 并行，但经实际分析，TASK-002 的 dependencies 写明依赖 TASK-001，且两者共享 index.ts 写入。实际执行采用串行策略以确保契约稳定。

---

## 九、风险提醒

| 风险 | 等级 | 说明 | 缓解 |
|------|------|------|------|
| IndexedDB 测试环境 | 中 | vitest 默认使用 jsdom，IndexedDB 需要 `fake-indexeddb` 或 `happy-dom` | 在 TASK-002 绿阶段前确认测试环境 IndexedDB 可用，必要时安装 `fake-indexeddb` |
| 类型合并不一致 | 低 | Web 端 helpers 用 `type` 定义 `UploadedMediaAsset`，Admin 端用 `interface` 且缺少 `mimeType` 字段 | 合并时采用 `interface` + 包含 `mimeType?` 可选字段，Admin 端不受影响 |
| admin helpers trim 遗漏 | 中 | Admin helpers 中 `extractPlainTextFromHtml`、`buildAdminRichTextToolbarState` 等与 Web 端几乎相同但命名加 `Admin` 前缀 | 合并时统一去掉 `Admin` 前缀，保留功能差异点（admin 独有的 4 个函数） |
| vitest 测试路径不匹配 | 中 | 任务文档使用 `src/__tests__/`，vitest 配置扫描 `packages/**/tests/**/*.test.ts` | 计划中统一使用 `tests/` 目录，与项目 convention 一致 |

---

## 十、实现者交接信息

### TASK-001 向 TASK-002 的交接

TASK-001 完成后产出的关键制品（TASK-002 作为输入）：

1. **类型定义** (`packages/rich-text-editor/src/rich-text-editor-helpers.ts`):
   - `UploadedMediaAsset` interface（包含 `mimeType?` 可选字段）
   - `RichTextToolbarEditor` interface
   - `RichTextToolbarStateItem` interface
   - `RichTextToolbarKey` type

2. **公开 API 入口** (`packages/rich-text-editor/src/index.ts`):
   - TASK-002 需要在此文件追加 `export { createMediaManager } from "./media-manager";` 及 `MediaManager` interface

3. **包配置** (`packages/rich-text-editor/package.json`):
   - 包名 `@feijia/rich-text-editor`，type=module，exports="./src/index.ts"

### 向下游（第 2 轮）的交接

- `MediaManager` interface 和 `createMediaManager()` 工厂函数 — TASK-003（共享编辑器组件）依赖此契约
- `UploadedMediaAsset` 等共享类型 — TASK-004（批量上传器）需要

---

## 十一、plan patch / contract change request 触发条件

1. **IndexedDB 测试环境问题**: 若 `fake-indexeddb` 无法在 vitest 环境下正常工作，需触发 plan patch 更换测试策略或改用 mock
2. **类型合并不兼容**: 若去掉 `Admin` 前缀后，Admin 端现有引用处超过 5 处需要同步修改，触发 contract change request 评估变更范围
3. **vitest include 路径**: 若 `packages/**/tests/**/*.test.ts` 模式无法匹配新包测试文件，需修改 `vitest.config.ts` 或调整文件路径 — 属于根配置变更，必须回主 Build Agent
4. **包依赖缺失**: 若 `packages/rich-text-editor` 需要额外依赖（如 `@wangeditor/editor` 仅在 TASK-003 才需要），不在本轮安装 — 记录并通过 plan patch 通知第 2 轮

---

## 十二、parallel_batches

### Batch 1（无依赖，可立即启动）

- **TASK-001** → subagent_type: frontend-implementer

本 Batch 仅含 TASK-001，创建共享包脚手架并合并 helpers。无前置依赖。

### Batch 2（依赖 Batch 1 全部完成）

- **TASK-002** → subagent_type: frontend-implementer

本 Batch 仅含 TASK-002，基于 Batch 1 产出的类型契约执行 TDD 开发 MediaManager。必须等待 Batch 1 完成。

### 本轮次测试验证（Batch 2 完成后）

- 在 TASK-002 TDD Green 阶段完成后，运行 `bun run test:unit` 确保：
  - `apps/web/tests/rich-text-editor-helpers.test.ts` 通过
  - `apps/admin/tests/admin-rich-text-editor-helpers.test.ts` 通过
  - `packages/rich-text-editor/tests/media-manager.test.ts` 通过
- 运行 `bun run typecheck`（或 `bun run --cwd packages/rich-text-editor typecheck`）确保 TypeScript 编译无错误
- 运行 `bun run lint` 确保 ESLint 无 error

---

## 十三、Execution Packets

---

### task_id: TASK-001
### task_name: 共享包脚手架与 helpers 合并
### requirement_ids: REQ-001
### owner: frontend-implementer
### objective: 创建 `@feijia/rich-text-editor` 包，将 Web/Admin 两端的共享 helpers 合并到新包，保留 Admin 编辑域独有逻辑在原文件。
### in_scope:
1. 新建 `packages/rich-text-editor/package.json`（命名 `@feijia/rich-text-editor`，type=module，private=true）
2. 新建 `packages/rich-text-editor/tsconfig.json`（extends `../config/tsconfig.base.json`，composite=true）
3. 新建 `packages/rich-text-editor/tsconfig.build.json`（构建产物配置，参考 `packages/shared`）
4. 新建 `packages/rich-text-editor/src/index.ts`（公开 API 入口，导出所有共享函数和类型）
5. 新建 `packages/rich-text-editor/src/rich-text-editor-helpers.ts`（合并后的共享 helpers）
6. 新建 `packages/rich-text-editor/tests/rich-text-editor-helpers.test.ts`（helpers 回归测试）
7. 修改 `apps/admin/src/components/admin-rich-text-editor-helpers.ts`（删除已合并的共享函数，仅保留 4 个 Admin 编辑域独有函数）
8. 更新根 `package.json` 的 `typecheck`/`lint` scripts 包含新包（如需要）
### out_of_scope:
- 共享 WangEditor 组件（TASK-003）
- MediaManager（TASK-002）
- 修改 `apps/web/src/components/rich-text-editor.tsx` 和 `apps/admin/src/components/admin-rich-text-editor.tsx`（这些在第 3 轮 TASK-005/TASK-006 处理）
- 修改 `apps/web/src/components/rich-text-editor-helpers.ts`（本轮仅处理 Admin helpers trim，Web helpers re-export 留到第 3 轮）
- 安装 `@wangeditor/editor` 依赖
### input_documents:
- `docs/requirements/2026-05-04-rich-text-editor-unification-requirements.md`
- `docs/tasks/2026-05-04-rich-text-editor-unification-tasks.md`
### allowed_paths:
- `packages/rich-text-editor/package.json`（新建）
- `packages/rich-text-editor/tsconfig.json`（新建）
- `packages/rich-text-editor/tsconfig.build.json`（新建）
- `packages/rich-text-editor/src/index.ts`（新建）
- `packages/rich-text-editor/src/rich-text-editor-helpers.ts`（新建）
- `packages/rich-text-editor/tests/rich-text-editor-helpers.test.ts`（新建）
- `apps/admin/src/components/admin-rich-text-editor-helpers.ts`（修改：trim 共享函数）
- `package.json`（修改：更新根 scripts 如 typecheck 包含新包）
### forbidden_paths:
- `apps/server/src/`（后端代码，不涉及）
- `apps/web/src/components/rich-text-editor.tsx`（第 3 轮再动）
- `apps/admin/src/components/admin-rich-text-editor.tsx`（第 3 轮再动）
- `apps/web/src/components/rich-text-editor-helpers.ts`（Web helpers re-export 留到第 3 轮）
- `packages/shared/src/`（不涉及）
### dependencies:
- 无外部任务依赖（本轮次首个任务）
- 参考现有文件: `apps/web/src/components/rich-text-editor-helpers.ts`（Web 端定义）、`apps/admin/src/components/admin-rich-text-editor-helpers.ts`（Admin 端定义）、`packages/shared/package.json`（包配置模板）、`packages/config/tsconfig.base.json`（TS 配置模板）
### parallel_group:
- 无（本轮次仅此任务在 Batch 1，TASK-002 在 Batch 2 依赖本任务）
### wait_for:
- 无
### acceptance_criteria:
1. `packages/rich-text-editor/` 包创建完成，`bun install` 无错误
2. `rich-text-editor-helpers.ts` 包含以下合并后的函数/类型（统一命名，去掉 Admin 前缀）:
   - `extractPlainTextFromHtml`（来源：web/admin 相同实现）
   - `buildRichTextToolbarState`（原 Web 端 `buildRichTextToolbarState`，Admin 端 `buildAdminRichTextToolbarState` 同名合并）
   - `getRichTextMediaInsertions`（来源：web，合并 Admin 同名逻辑）
   - `shouldSyncRichTextValue`（来源：web，合并 Admin 同名逻辑）
   - `UploadedMediaAsset` interface（使用 `interface`，包含 `mimeType?` 字段）
   - `RichTextToolbarKey` type
   - `RichTextToolbarEditor` interface
   - `RichTextToolbarStateItem` interface
3. `apps/admin/src/components/admin-rich-text-editor-helpers.ts` 仅保留 4 个 Admin 编辑域独有函数:
   - `buildOfficialArticleDocument`
   - `parseOfficialArticleDocument`
   - `removeAdminRichTextMediaReferenceFromHtml`
   - `escapeHtml` / `decodeHtml`（内部辅助，不导出或保留导出）
4. 现有 `apps/web/tests/rich-text-editor-helpers.test.ts` 全部通过
5. 现有 `apps/admin/tests/admin-rich-text-editor-helpers.test.ts` 全部通过
6. `packages/rich-text-editor/tests/rich-text-editor-helpers.test.ts` 新建并覆盖合并后的函数基本行为
7. TypeScript 编译无错误、ESLint 无 error
### test_strategy: test_after
### handoff_notes:
- 合并 `UploadedMediaAsset` 时以 Web 端定义为准（包含 `mimeType?` 可选字段），Admin 端消费者不受影响
- 合并 `buildRichTextToolbarState` 时去掉 Admin 端原函数名 `buildAdminRichTextToolbarState` 中的 `Admin` 前缀，输出统一命名为 `buildRichTextToolbarState`
- `RichTextToolbarKey` 为 type（联合类型），保留在 helpers 中
- 包导出通过 `index.ts` 统一 re-export，所有下游消费者从 `@feijia/rich-text-editor` 导入
### escalation_rule: 如需变更根 package.json scripts、vitest.config.ts、tsconfig.base.json 等根级配置，必须先回主 Build Agent，不得直接修改

---

### task_id: TASK-002
### task_name: 媒体管理器（blob <-> File <-> IndexedDB）
### requirement_ids: REQ-002
### owner: frontend-implementer
### objective: 以 TDD 方式实现 MediaManager，管理媒体文件的注册、blob URL 生成、IndexedDB 持久化和跨会话恢复。
### in_scope:
1. TDD 红阶段：编写 `packages/rich-text-editor/tests/media-manager.test.ts`（10 个测试场景，先运行确认失败）
2. TDD 绿阶段：实现 `packages/rich-text-editor/src/media-manager.ts`（最快的通过实现）
3. TDD 重构阶段：优化实现，提取 IndexedDB 封装，增强错误处理
4. 修改 `packages/rich-text-editor/src/index.ts`（追加 `createMediaManager` 和 `MediaManager` 导出）
5. IndexedDB 数据库名 `feijia-media-cache`，store 名 `media-files`
### out_of_scope:
- 批量上传（TASK-004）
- URL 替换逻辑（TASK-004）
- 共享编辑器组件集成（TASK-003）
- admin 端草稿系统（TASK-008，框架复用本模块）
### input_documents:
- `docs/requirements/2026-05-04-rich-text-editor-unification-requirements.md`（第三节：MediaManager 接口定义）
- `docs/tasks/2026-05-04-rich-text-editor-unification-tasks.md`（TASK-002 章节）
### allowed_paths:
- `packages/rich-text-editor/src/media-manager.ts`（新建）
- `packages/rich-text-editor/tests/media-manager.test.ts`（新建）
- `packages/rich-text-editor/src/index.ts`（修改：追加 2 行 export）
### forbidden_paths:
- `packages/rich-text-editor/src/rich-text-editor-helpers.ts`（由 TASK-001 唯一负责，只读使用类型）
- `packages/rich-text-editor/src/rich-text-editor.tsx`（尚未创建，第 2 轮）
- `apps/` 目录下任何文件
- `packages/shared/src/`（不涉及）
### dependencies:
- TASK-001 必须完成（需要 `UploadedMediaAsset` interface 和 `packages/rich-text-editor/src/index.ts` 已存在）
- 可能需要安装 `fake-indexeddb` 作为 devDependency（若 vitest jsdom 环境不支持 IndexedDB）
### parallel_group:
- 无（本轮次无其他可并行任务）
### wait_for:
- TASK-001
### acceptance_criteria:
1. 全部 10 个 TDD 测试场景通过:
   - SC-01: `register` 图片文件 → 返回 `blobUrl`（以 `blob:` 开头）和 `fileId`
   - SC-02: `register` 超过 50MB 文件 → 抛出错误，包含"超过大小限制"提示
   - SC-03: `getFile` 已注册的 blob URL → 返回原始 File 对象
   - SC-04: `getFile` 未注册的 blob URL → 返回 `undefined`
   - SC-05: `getAllFiles` 多个文件 → 返回包含所有文件的 Map
   - SC-06: `persist` + `restore` 完整周期 → restore 返回的 File 与 register 时一致（name/size/type）
   - SC-07: `persist` 覆盖已有 draft key → 旧数据被替换
   - SC-08: `restore` 不存在的 draft key → 返回空 Map
   - SC-09: `clear` 后 `restore` → 返回空 Map
   - SC-10: `restore` 后 blob URL 重新生成 → restore 返回的 File 生成的新 blob URL 与旧的不同
2. IndexedDB 数据库名 `feijia-media-cache`，store 名 `media-files`
3. `register()` 对超限文件抛出明确 `Error`（含中文错误信息）
4. `persist()`/`restore()`/`clear()` 异步操作正确处理 IndexedDB 异常（try/catch + 错误日志）
5. `fileId` 使用 `crypto.randomUUID()` 生成（与项目现有模式一致）
6. JSDoc 注释覆盖所有公开 API（`@param`、`@returns`、`@throws`）
7. TypeScript 严格模式无错误
8. `packages/rich-text-editor/src/index.ts` 正确导出 `createMediaManager` 和 `MediaManager` interface
### test_strategy: tdd
### handoff_notes:
- **TDD 严格流程**: 必须先写完 10 个测试（红），确认全部失败后，再开始实现（绿），最后清理重构
- **IndexedDB 测试环境**: 若 vitest jsdom 环境不支持 IndexedDB，需在 `packages/rich-text-editor/package.json` 添加 `"fake-indexeddb": "^x.x.x"` 作为 devDependency，并在测试文件中 setup
- **Blob URL 生命周期**: `clear()` 方法需要调用 `URL.revokeObjectURL()` 释放所有已生成的 blob URL，避免内存泄漏
- **persist 存储策略**: 存储完整 `File` 对象（含二进制数据），不能仅存元数据。IndexedDB 可直接存储 `File` 对象（File 实现了 Blob 接口，IndexedDB 可序列化）
- **跨会话恢复**: `restore()` 返回的 File 需要调用方使用 `URL.createObjectURL()` 重新生成 blob URL（旧 URL 在页面关闭后失效），此行为在 MediaManager 内部处理更好，但当前契约要求调用方处理——如需要可调整
- 此模块是第 2 轮 TASK-003（共享编辑器组件）的输入依赖，务必确保 API 契约稳定
### escalation_rule: 如需变更 `MediaManager` interface 契约（如增减方法、修改返回类型），必须先回主 Build Agent 触发 contract change request，同步更新需求文档和下游任务

---

## 十四、推荐的下一步

1. **执行 Batch 1**: 主 Build Agent spawn `frontend-implementer` 执行 TASK-001
2. **验证 Batch 1**: 运行现有 helpers 测试套件 + TypeScript 编译验证
3. **执行 Batch 2**: 主 Build Agent spawn `frontend-implementer` 执行 TASK-002（TDD）
4. **验证 Batch 2**: 运行 `bun run test:unit` 确认所有测试通过
5. **第 1 轮收尾**: 运行 `bun run typecheck` + `bun run lint` 确保 CI 全绿
6. **进入第 2 轮**: 执行 TASK-003（共享编辑器组件）和 TASK-004（批量上传器）

---

## 十五、计划自检

- [x] 所有 Execution Packet 包含 requirement_ids
- [x] 所有 Execution Packet 包含 allowed_paths 和 forbidden_paths
- [x] 共享区域（index.ts）唯一责任方为 TASK-001
- [x] 共享文件冲突已通过串行策略解决（TASK-001 → TASK-002）
- [x] parallel_batches 格式正确，子代理类型使用 kebab-case
- [x] 测试 Batch 时序合理（单元测试紧跟在实现 Batch 后）
- [x] 无 E2E 测试需要安排在本轮次（E2E 测试在 TASK-009 第 4 轮）
- [x] 单轮次预估变更行数 ~730 行，< 1000 行阈值
- [x] escalation_rule 已为每个任务指定
- [x] plan patch 触发条件已明确
