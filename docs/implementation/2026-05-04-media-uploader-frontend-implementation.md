# TASK-004: 批量上传与 URL 替换工具函数 — 前端实现文档

## 1. 当前实现目标

实现三个纯工具函数，用于富文本编辑器的批量媒体上传流程：

- `collectBlobUrls` — 从 HTML 中提取所有 blob URL
- `uploadMediaBatch` — 并行批量上传媒体文件，单文件失败不阻塞其他文件
- `replaceBlobUrls` — 用上传结果替换 HTML 中的 blob URL

## 2. 对应需求 ID / 任务 ID

- 需求：REQ-005（富文本编辑器统一）
- 任务：TASK-004

## 3. 输入依据

- `docs/requirements/2026-05-04-rich-text-editor-unification-requirements.md`
- `docs/tasks/2026-05-04-rich-text-editor-unification-tasks.md`
- `docs/plans/2026-05-04-rich-text-editor-unification-plan.md`

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/rich-text-editor/src/media-uploader.ts` | **新建** | 三个工具函数的实现 |
| `packages/rich-text-editor/tests/media-uploader.test.ts` | **新建** | 15 个测试用例（12 个必选 + 3 个增强） |
| `packages/rich-text-editor/src/index.ts` | **修改** | 添加 `media-uploader` 模块的导出 |

## 5. 实现说明

### 5.1 `collectBlobUrls(html: string): string[]`

- 使用正则 `/blob:[^\s"']+/g` 匹配 HTML 属性值中所有的 blob URL
- 自动覆盖 `<img src>`、`<video src>`、`<video poster>`、`<source src>` 属性
- 使用 `Set` 去重，保持首次出现顺序
- 空 HTML / 无媒体元素的 HTML 返回空数组

### 5.2 `uploadMediaBatch(files, uploadImageFn, uploadVideoFn): Promise<MediaBatchResult>`

- 接收 `Map<string, File>`（blob URL → File）
- 根据 `file.type.startsWith("video/")` 区分图片/视频
- 使用 `Promise.allSettled` 并行上传所有文件
- 上传成功的文件加入 `urlMapping` 和对应的 `imageIds`/`videoIds`
- 上传失败的文件加入 `errors` 数组，包含 `blobUrl` 和错误消息
- 空 Map 直接返回空结果，不调用任何上传函数

### 5.3 `replaceBlobUrls(html: string, urlMapping: Map<string, string>): string`

- 优先使用 `DOMParser` 精确替换属性值（`setAttribute`），避免破坏 HTML 结构
- `DOMParser` 不可用或解析失败时，回退到正则字符串替换
- 正则替换前对 blob URL 进行特殊字符转义，防止正则注入
- 未在映射中找到的 blob URL 保持不变

### 5.4 模块导出（index.ts）

```typescript
export {
  collectBlobUrls,
  type MediaBatchResult,
  replaceBlobUrls,
  uploadMediaBatch,
} from "./media-uploader";
```

## 6. 测试和验证结果

### 6.1 TDD 三阶段记录

| 阶段 | 结果 | 说明 |
|------|------|------|
| **Red** | 0 tests, import failed | `media-uploader.ts` 尚未创建，测试文件无法导入 |
| **Green** | 15/15 passed | 一次性全部通过，无需回修 |
| **Refactor** | 15/15 passed | 代码已简洁，无需大幅重构 |

### 6.2 测试详情（15 个用例全通过）

```
collectBlobUrls:
  ✓ 提取 2 个 img blob URL（测试 1）
  ✓ 提取 img + video blob URL（测试 2）
  ✓ 不返回真实 http URL（测试 3）
  ✓ 空 HTML 返回空数组（测试 4）
  ✓ HTML 无媒体元素返回空数组（测试 5）
  ✓ 提取 video poster 和 source src 中的 blob URL（增强）
  ✓ 自动去重重复的 blob URL（增强）

uploadMediaBatch:
  ✓ 3 个图片全部上传成功（测试 6）
  ✓ 图片+视频混合上传正确分类（测试 7）
  ✓ 1 个文件上传失败，其他正常（测试 8）
  ✓ 空 Map 返回空结果，不调用上传函数（测试 9）

replaceBlobUrls:
  ✓ 2 个 blob 全部有映射，HTML 中全部替换（测试 10）
  ✓ 1 个 blob 无映射，该 URL 保留（测试 11）
  ✓ src 和 poster 属性均被替换（测试 12）
  ✓ 同时替换 img src 和 source src（增强）
```

### 6.3 全量回归

- `packages/rich-text-editor/tests/` 下 3 个测试文件共 36 个测试全部通过
- 全仓测试中与本次变更无关的预存失败（DB 连接、缺少 CSS 导入）未增加

## 7. 边界和异常处理

| 场景 | 处理方式 |
|------|---------|
| 空 HTML 字符串 | `collectBlobUrls` 返回 `[]`，`replaceBlobUrls` 原样返回 |
| HTML 无媒体元素 | `collectBlobUrls` 返回 `[]` |
| 重复 blob URL | `collectBlobUrls` 自动去重 |
| `files` Map 为空 | `uploadMediaBatch` 不调用任何上传函数，直接返回空结果 |
| 单个文件上传失败 | `Promise.allSettled` 隔离失败，其他文件继续上传 |
| 上传函数抛出非 Error 异常 | 通过 `String(reason)` 兜底转换为错误消息 |
| `DOMParser` 不可用（SSR） | 回退到正则字符串替换 |
| `DOMParser` 解析异常 | try-catch 捕获后回退到正则替换 |
| 无映射的 blob URL | `replaceBlobUrls` 保留原 URL 不变 |
| 空 `urlMapping` | `replaceBlobUrls` 原样返回 HTML |

## 8. 风险 / 未解决项

- 无。所有 12 个必选测试 + 3 个增强测试全部通过。
- 类型检查错误均为预存问题（`@wangeditor/editor` 依赖未安装、缺少 `--jsx` 标志），与本次变更无关。

## 9. 需要后端配合的点

- 无。三个函数均为纯前端工具函数，不依赖后端接口。
- 调用方（`apps/admin`）需要提供 `uploadImageFn` 和 `uploadVideoFn` 的具体实现。

## 10. 推荐的下一步

- TASK-005：实现 `useUploadAndSync` Hook，将这三个工具函数与 `MediaManager` 集成
- 在 `apps/admin` 中实现 `uploadImageFn` / `uploadVideoFn` 的具体上传逻辑
