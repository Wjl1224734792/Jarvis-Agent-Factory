# MediaManager 实现文档

- **日期**: 2026-05-04
- **任务 ID**: TASK-002
- **需求 ID**: REQ-002
- **实现者**: frontend-implementer

---

## 一、当前实现目标

实现 `MediaManager` — 媒体文件管理器，支持：
- 文件注册（生成 blob URL）→ IndexedDB 持久化 → 恢复 → 清除

按 TDD Red-Green-Refactor 流程开发。

---

## 二、输入依据

- [需求文档](../requirements/2026-05-04-rich-text-editor-unification-requirements.md) — 第三节：MediaManager 接口定义
- [任务文档](../tasks/2026-05-04-rich-text-editor-unification-tasks.md) — TASK-002 章节
- [计划文档](../plans/2026-05-04-rich-text-editor-unification-plan.md) — 第 1 轮 Batch 2

---

## 三、变更文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `packages/rich-text-editor/src/media-manager.ts` | MediaManager 实现（~230 行） |
| 新建 | `packages/rich-text-editor/tests/media-manager.test.ts` | 10 个 TDD 测试场景（~420 行） |
| 修改 | `packages/rich-text-editor/src/index.ts` | 追加 `createMediaManager` 和 `MediaManager` 导出 |

所有变更严格限制在 `allowed_paths` 内。

---

## 四、实现说明

### 4.1 架构

```
createMediaManager() 工厂函数
  ├── fileMap: Map<string, File>     // blobUrl → File 内存映射
  ├── blobUrls: Set<string>          // 所有生成的 blob URL（用于批量释放）
  ├── register(file)                 // 校验大小 → URL.createObjectURL → 存入 Map
  ├── getFile(blobUrl)               // 从 Map 查找
  ├── getAllFiles()                  // 返回 Map 副本
  ├── persist(draftKey)              // 打开 DB → 清旧数据 → 写入新数据 → 关闭 DB
  ├── restore(draftKey)              // 打开 DB → 读取 → 关闭 DB → 释放旧 URL → 重建 Map
  └── clear(draftKey)                // 释放所有 URL → 清 Map → 打开 DB → 删除 → 关闭 DB
```

### 4.2 IndexedDB 工具函数

- `openDB()` — 打开/创建数据库，处理 `onupgradeneeded`
- `storeRequest<T>()` — 将 IDBRequest 包装为 Promise
- `safeCloseDB()` — 安全关闭数据库连接（捕获关闭异常）

### 4.3 关键设计决策

1. **crypto.randomUUID()** 生成 fileId，与项目现有模式一致
2. **URL.createObjectURL / revokeObjectURL** — persist 时保留 blob URL 映射；restore 时为每个 File 重新生成 blob URL；clear 时批量释放
3. **Error 消息使用中文**，符合项目开发语言约定
4. **IndexedDB 操作均带 try/catch + console.error**，符合验收标准第 4 条
5. **persist 覆盖策略**：先 clear 后 put，确保旧数据被完全替换
6. **clear 先清内存再清 IDB**：即使 IDB 删除失败，blob URL 也能被释放

### 4.4 返回值冻结

`createMediaManager()` 返回 `Object.freeze({...})`，防止调用方意外修改 API 对象。

---

## 五、TDD 三阶段记录

### RED 阶段（10 个测试全部失败）

```
Test Files  1 failed (1)
Tests       10 failed (10)
```

失败原因：`media-manager.ts` 文件不存在，`createMediaManager` 为 `undefined`。确认测试正确表达了验收标准。

### GREEN 阶段（10 个测试全部通过）

创建 `media-manager.ts`，实现所有 API 方法。一次运行后 5 个纯内存测试（SC-01~SC-05）立即通过，其余 IndexedDB 测试因 mock 的 `onupgradeneeded` 中 `request.result` 未在回调前设置而超时。修复 mock 后全部通过。

```
Test Files  1 passed (1)
Tests       10 passed (10)
```

### REFACTOR 阶段（保持全绿）

- 添加 try/catch + console.error 错误处理（符合验收标准第 4 条）
- 提取 `safeCloseDB()` 工具函数
- 增强 JSDoc 注释（含 `@param`、`@returns`、`@throws`、`@example`）
- `clear()` 方法调整为"先清内存，再清 IDB"，确保 blob URL 总是被释放
- 修复 ESLint 警告（`no-unsafe-return`、`no-non-null-assertion`、`no-base-to-string`）

重构后测试结果：

```
Test Files  1 passed (1)
Tests       10 passed (10)
Duration    264ms
```

---

## 六、测试结果

### 10 个测试场景最终结果

| # | 场景 | 结果 |
|---|------|------|
| SC-01 | register 图片文件，返回 blobUrl + fileId | PASS |
| SC-02 | register 超过 50MB 文件，抛出含"超过大小限制"的错误 | PASS |
| SC-03 | getFile 已注册的 blob URL，返回原始 File 对象 | PASS |
| SC-04 | getFile 未注册的 blob URL，返回 undefined | PASS |
| SC-05 | getAllFiles 多文件，返回包含所有文件的 Map | PASS |
| SC-06 | persist + restore 完整周期，File name/size/type 一致 | PASS |
| SC-07 | persist 覆盖已有 draft key，旧数据被替换 | PASS |
| SC-08 | restore 不存在的 draft key，返回空 Map | PASS |
| SC-09 | clear 后 restore，返回空 Map | PASS |
| SC-10 | restore 后 blob URL 重新生成，与旧的不同 | PASS |

**通过数：10 / 10**

### 全量回归测试

- rich-text-editor helpers 测试：11 / 11 通过
- 全量单元测试：376 个中 369 通过，7 个失败（均为 `packages/schemas` 和 `packages/http-client` 中预存的 Zod declaration 字段问题，与本次变更无关）
- TypeScript typecheck：全部 8 个包通过
- ESLint：零 error、零 warning

---

## 七、边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| 文件超过 50MB | `register()` 同步抛出 `Error`，消息含文件名和实际大小 |
| IndexedDB 打开失败 | `openDB()` reject，`persist/restore/clear` 中 catch + console.error + re-throw |
| IndexedDB 读写失败 | `storeRequest()` reject，同上处理 |
| restore 时 IDB 无数据 | 返回空 `Map`（不抛错误） |
| restore 时存储数据非数组 | 返回空 `Map`（防御性检查） |
| persist 空文件列表 | 正常写入空数组 |
| clear 时 IDB 删除失败 | blob URL 仍被释放（先清内存），错误 re-throw |
| db.close() 异常 | `safeCloseDB()` 捕获并 console.error，不中断流程 |

---

## 八、风险 / 未解决项

1. **IndexedDB 测试环境**：因网络不可用无法安装 `fake-indexeddb`，本测试使用内置内存模拟。该模拟覆盖了本次所有测试场景，但与真实 IndexedDB 的行为可能存在边缘差异（如事务自动提交时机、跨标签页锁）。建议在有网络条件时安装 `fake-indexeddb` 增强测试保真度。

2. **大文件 IndexedDB 存储**：当前 `persist` 直接存储完整 File 对象（含二进制数据）。IndexedDB 对大 Blob 的存储性能依赖浏览器实现，建议在真实环境中验证多个 50MB 文件并发 persist 的性能。

---

## 九、需要后端配合的点

无。MediaManager 是纯前端模块，不依赖后端 API。

---

## 十、推荐的下一步

1. **TASK-003**（共享编辑器组件）将依赖 `MediaManager` 接口进行媒体插入
2. **TASK-004**（批量上传器）将使用 `MediaManager.getAllFiles()` 获取待上传文件
3. 向第 2 轮传递的制品：
   - `MediaManager` interface（稳定的 API 契约）
   - `createMediaManager()` 工厂函数
   - `MediaFileEntry` interface
