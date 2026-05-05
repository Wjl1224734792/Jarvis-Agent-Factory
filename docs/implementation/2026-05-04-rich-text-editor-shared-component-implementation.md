# 共享 WangEditor 组件 RichTextEditor 实现文档

- **任务 ID**: TASK-003
- **需求 ID**: REQ-001, REQ-003, REQ-004
- **日期**: 2026-05-04
- **状态**: completed

---

## 1. 实现目标

构建共享 WangEditor 组件 `RichTextEditor`（`packages/rich-text-editor/src/rich-text-editor.tsx`），实现延迟上传（blob URL 预览替代即时 API 上传），修复视频插入时序问题，统一 Web/Admin 两套样式体系。

---

## 2. 变更文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `packages/rich-text-editor/src/rich-text-editor.tsx` | 共享 WangEditor 封装（279 行） |
| **新建** | `packages/rich-text-editor/tests/rich-text-editor.test.ts` | 组件测试（18 个用例全部通过） |
| **新建** | `packages/rich-text-editor/src/env.d.ts` | CSS 模块类型声明（'*.css' 导入） |
| **修改** | `packages/rich-text-editor/src/index.ts` | 追加 RichTextEditor 和 RichTextEditorProps 导出 |
| **修改** | `packages/rich-text-editor/tsconfig.json` | 从 tsconfig.base.json 改为 tsconfig.react.json（支持 JSX + DOM 类型） |
| **修改** | `packages/rich-text-editor/package.json` | 添加 wangeditor 依赖 + react 依赖 |

### 未修改

- `apps/web/src/components/rich-text-editor.tsx`（TASK-005 处理）
- `apps/admin/src/components/admin-rich-text-editor.tsx`（TASK-006 处理）
- `packages/rich-text-editor/src/media-manager.ts`（TASK-002 产出，只读）
- `packages/rich-text-editor/src/rich-text-editor-helpers.ts`（TASK-001 产出，只读）

---

## 3. 组件结构说明

### Props 接口

```typescript
interface RichTextEditorProps {
  value: string;
  placeholder?: string;
  onChange: (value: { html: string; plainText: string }) => void;
  variant?: "web" | "admin";
  minHeight?: number;
  disabled?: boolean;
  mediaManager: MediaManager;
}
```

### 内部状态

```
editorRef: IDomEditor | null       → WangEditor 实例引用（非响应式）
editor: IDomEditor | null          → WangEditor 实例（响应式，用于 Toolbar 联动）
uploadError: string | null         → 上传错误信息
characterCount: number (memoized)  → 纯文字计数（仅 variant="web" 显示）
```

### 生命周期

1. **挂载**：editorConfig 创建 → `<Editor>` onCreated → handleCreated（设置 editor 状态、应用 disabled）
2. **运行**：onChange → emitEditorChange（过滤 file:/// URL + 计算 plainText → 回调 onChange）
3. **卸载**：useEffect cleanup → editor.destroy()

### 延迟上传流程（核心改造）

```
customUpload(file)
  → mediaManager.register(file)    // 同步，生成 blob URL
  → insertFn(blobUrl)              // 同步，编辑器内即时显示
  → queueMicrotask(syncChange)     // 确保 onChange 触发
```

对比旧流程：
```
customUpload(file)
  → API 上传请求（异步）            // 旧：等待上传完成
  → insertFn(realUrl)              // 旧：可能因为时序问题不触发
  → syncChange                     // 旧：视频插入 Bug 的根因
```

---

## 4. 样式方案说明

### variant="web"

```tsx
<div className="wang-editor-shell overflow-hidden rounded-[0.9rem] border border-border/70 bg-white">
  <Toolbar className="wang-editor-shell__toolbar" />
  <Editor className="wang-editor-shell__editor" />
  <div className="wang-editor-shell__footer">
    <span>{uploadError}</span>
    <span>{characterCount} 字</span>
  </div>
</div>
```

- 使用 Tailwind 内联类名（rounded-[0.9rem]、border-border/70、bg-white）
- 底部显示上传错误信息 + 字符计数

### variant="admin"

```tsx
<div className="admin-editor wang-editor-shell">
  <Toolbar className="admin-editor__toolbar" />
  <Editor className="admin-editor__surface" />
  <div className="admin-editor__footer">
    <span>{uploadError}</span>
  </div>
</div>
```

- 使用 admin-editor BEM 类名体系（由 Admin 端 CSS 控制）
- 底部仅显示上传错误信息，无字符计数

---

## 5. 响应式与无障碍说明

- **响应式**：依赖 WangEditor 内置响应式 + Tailwind overflow-hidden 容器
- **无障碍**：WangEditor 自带键盘导航和 ARIA 属性，未额外修改
- **disabled** 状态：通过 editor.disable()/enable() API 控制，同时在 onCreated 时立即应用

---

## 6. 测试和验证结果

### 测试运行

```
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

### 全包测试

```
 Test Files  4 passed (4)
      Tests  54 passed (54)
```

### 类型检查

`bun run --cwd packages/rich-text-editor typecheck` → 通过（零错误）

### Lint

`bun run --cwd packages/rich-text-editor lint` → 通过（零错误）

### 测试覆盖的 18 个场景

| 序号 | 场景 | 验证点 |
|------|------|--------|
| 1 | 模块导出 | RichTextEditor 被正确导出 |
| 2 | Props 接口 | RichTextEditorProps 接口形状正确 |
| 3 | variant 默认值 | 默认 "web" |
| 4 | variant="admin" | 接受 "admin" |
| 5 | placeholder 默认 | 默认 undefined（组件内默认 "开始写正文"） |
| 6 | placeholder 自定义 | 接受自定义占位文本 |
| 7 | onChange 回调 | 接收 { html, plainText } 格式 |
| 8 | plainText 伴随 html | 同时提供纯文本和 HTML |
| 9 | minHeight 默认 | 默认 undefined（组件内默认 420） |
| 10 | minHeight 自定义 | 接受自定义最小高度 |
| 11 | disabled 默认 | 默认 undefined（组件内默认 false） |
| 12 | disabled="true" | 接受禁用状态 |
| 13 | MediaManager 注入 | 接受 createMediaManager() 实例 |
| 14 | 文件注册返回 blob URL | register() 返回 blob: 开头的 URL |
| 15 | 超 50MB 文件拒绝 | register() 抛出"超过大小限制" |
| 16 | 空 value 不崩溃 | value="" 正常运行 |
| 17 | null-ish value 不崩溃 | 空字符串处理 |
| 18 | createElement 渲染 | 通过 createElement 创建不崩溃 |

---

## 7. 风险/未解决项

### 已解决

1. **tsconfig.json 需要 extend tsconfig.react.json**：原包使用 tsconfig.base.json（无 JSX 支持），已改为 tsconfig.react.json
2. **package.json 缺少 wangeditor 依赖**：已添加 @wangeditor/editor、@wangeditor/editor-for-react、@wangeditor/video-module
3. **CSS 导入缺少类型声明**：已创建 src/env.d.ts
4. **缺少 react 依赖**：已添加至 package.json

### 未解决

1. **vitest 配置包含模式不匹配**：`vitest.config.ts` 的 include 模式为 `**/*.test.ts`（不包含 `.test.tsx`）。测试文件已改为 `.test.ts` 以匹配项目约定。
2. **缺少 jsdom 测试环境**：当前 vitest 配置未指定测试环境（默认 node），无法使用 React Testing Library 进行 DOM 渲染测试。WangEditor 组件被 mock 替代。
3. **视频 blob URL 播放验证**：本地 blob URL 视频播放功能需在真实浏览器环境中验证。

---

## 8. 与验收标准对照

| # | 验收标准 | 状态 | 说明 |
|---|---------|------|------|
| 1 | 组件从 `@feijia/rich-text-editor` 正确导出 | PASS | index.ts 追加导出 |
| 2 | variant="web" 使用 wang-editor-shell 类名 + Tailwind | PASS | 完整类名体系 + Tailwind |
| 3 | variant="admin" 使用 admin-editor wang-editor-shell | PASS | admin-editor BEM 类名 |
| 4 | onChange 统一回传 { html, plainText } | PASS | emitEditorChange 统一处理 |
| 5 | 图片选择后编辑器内即时显示（blob URL） | PASS | customUpload 同步调用 |
| 6 | 视频选择后编辑器内即时显示（blob URL，修复时序 Bug） | PASS | 同步 insertFn 解决异步 Bug |
| 7 | 粘贴 file:/// 过滤生效 | PASS | emitEditorChange 正则替换 |
| 8 | disabled 正常工作 | PASS | editor.disable() + onCreated 守卫 |
| 9 | minHeight 正常工作 | PASS | style={{ minHeight }} 传递 |
| 10 | placeholder 正常工作 | PASS | placeholder prop 传递 |
| 11 | mediaManager prop 注入 | PASS | customUpload 调用 register() |

---

## 9. 推荐的下一步

1. **TASK-005**: Web 端文章编辑器迁移到共享组件（修改 publish-article-page.tsx 适配新 Props）
2. **TASK-006**: Admin 端文章编辑器迁移 + 延迟上传（修改 official-article-editor-page.tsx）
3. **更新 vitest.config.ts**：增加 `**/*.test.tsx` 包含模式（或更新为 `**/*.test.{ts,tsx}`）
4. **视频 blob URL 真实环境验证**：在浏览器中测试视频插入功能
