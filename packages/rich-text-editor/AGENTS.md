<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 -->

# @feijia/rich-text-editor

## Purpose
富文本编辑器组件包。基于 TipTap，提供工具栏状态管理、媒体上传、链接卡片插入等功能。`apps/web` 和 `apps/admin` 的编辑器页面均使用此包。

## Key Files

| File | Description |
|------|-------------|
| `src/index.ts` | 桶导出 |
| `src/rich-text-editor.tsx` | React 编辑器组件 `RichTextEditor` |
| `src/rich-text-editor-helpers.ts` | 工具栏状态、纯文本提取、媒体插入检测 |
| `src/media-manager.ts` | 媒体管理器（追踪已上传媒体） |
| `src/media-uploader.ts` | 批量媒体上传（blob URL 替换） |
| `src/link-card.ts` | 链接卡片 HTML 构建（飞行器/文章/飞友圈） |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `tests/` | 富文本编辑器测试 |

## For AI Agents

### Working In This Directory
- 编辑器基于 TipTap，修改前需了解 TipTap extension 机制
- 媒体上传遵循三步协议：`initUpload` → PUT signedUrl → `completeUpload`
- 链接卡片 URL 须经 `normalizeRichTextLinkHref` 规范化
- 新增编辑器功能应在此包实现，禁止在 `apps/*` 重复实现

### Testing Requirements
- 编辑器逻辑变更后运行 `tests/` 中相关测试

### Common Patterns
- `RichTextToolbarEditor` 类型描述工具栏状态
- `MediaManager` 管理插入的媒体资源生命周期
- `UploadedMediaAsset` 描述已上传媒体（blobUrl → accessUrl 映射）

## Dependencies

### Internal
- `@feijia/schemas` — 文件上传相关类型
- `@feijia/http-client` — 上传 API 调用

### External
- `@tiptap/react` — TipTap React 编辑器
- `@tiptap/starter-kit` — 基础扩展包
- `@tiptap/extension-link` — 链接扩展
- `@tiptap/extension-image` — 图片扩展
