# 2026-04-03 XSS 防护前端实现

## 实现目标

对飞甲 Web 前端进行 XSS 防护加固，确保所有用户输入的 HTML 内容在渲染前经过安全清理，消除 `dangerouslySetInnerHTML` 带来的注入风险。

## 变更文件

### 新增文件

| 文件 | 说明 |
|------|------|
| `apps/web/src/lib/sanitize.ts` | 共享 HTML 清理工具，封装 DOMPurify |

### 修改文件

| 文件 | 变更说明 |
|------|----------|
| `apps/web/package.json` | 新增依赖 `dompurify`、`@types/dompurify` |
| `apps/web/src/routes/post-detail-page.tsx` | `dangerouslySetInnerHTML` 包裹 `sanitizeHtml()` |
| `apps/web/src/routes/publish-article-page.tsx` | `dangerouslySetInnerHTML` 包裹 `sanitizeHtml()` |

### 已扫描确认安全的文件（无需修改）

| 文件 | 安全原因 |
|------|----------|
| `apps/web/src/components/rich-text-editor.tsx` | 使用 TipTap `EditorContent`，不直接使用 `dangerouslySetInnerHTML` |
| `apps/web/src/routes/model-detail-page.tsx` | 无 `dangerouslySetInnerHTML`，用户文本通过 JSX 自动转义 |
| `apps/web/src/routes/circle-page.tsx` | 无 `dangerouslySetInnerHTML`，用户文本通过 JSX 自动转义 |
| `apps/web/src/routes/user-profile-page.tsx` | 无 `dangerouslySetInnerHTML`，用户文本通过 JSX 自动转义 |
| `apps/web/src/features/posts/post-interaction-bar.tsx` | 纯交互组件，不渲染用户 HTML |
| `apps/web/src/features/posts/post-comment-thread.tsx` | 评论内容通过 JSX `{}` 渲染，React 自动转义 |
| `apps/web/src/features/posts/inline-comment-composer.tsx` | 纯输入组件，不渲染 HTML |

## 实现说明

### 1. 依赖安装

```bash
bun add dompurify          # 浏览器端 HTML 清理库 v3.3.3
bun add -d @types/dompurify  # 类型声明
```

### 2. `sanitize.ts` 工具设计

#### `sanitizeHtml(dirty: string): string`

- 封装 DOMPurify 的 `sanitize()` 方法
- **允许的标签**：`a`, `img`, `strong`, `em`, `p`, `br`, `ul`, `ol`, `li`, `h1`-`h6`, `blockquote`, `code`, `pre`，以及 TipTap 编辑器需要的 `figure`, `figcaption`, `video`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `span`, `div`, `hr`, `mark`, `del`, `ins`, `sub`, `sup`, `u`, `s`
- **允许的属性**：`href`, `src`, `alt`, `title`, `class`, `target`, `rel`, `width`, `height`, `controls`, `preload`, `poster`, `colspan`, `rowspan`, `style`, `data-video-block`, `data-type`
- **禁止的属性**：`onerror`, `onload`, `onclick`, `onmouseover`, `onfocus`, `onblur`（所有事件处理器）
- **禁止的标签**：`script`, `iframe`, `object`, `embed`, `form`
- **URL 协议白名单**：`http`, `https`, `ftp`, `ftps`, `mailto`, `tel`, `callto`, `cid`, `xmpp`
- **链接安全**：自动添加 `target` 和 `rel` 属性，链接默认在新标签页打开
- **SSR 兼容**：服务端环境下使用正则表达式做基本清理（剥离 `<script>`, `<iframe>`, 事件处理器, `javascript:` 协议）

#### `escapeHtml(text: string): string`

- 将纯文本转义为 HTML 实体（`&`, `<`, `>`, `"`, `'`, `/`）
- 用于需要将用户输入嵌入 HTML 属性或文本内容的场景
- 当前项目中 React JSX 已自动处理转义，此函数作为备用工具

### 3. 组件修复

#### `post-detail-page.tsx`

```tsx
// 修复前
dangerouslySetInnerHTML={{ __html: articleHtml }}

// 修复后
dangerouslySetInnerHTML={{ __html: sanitizeHtml(articleHtml) }}
```

#### `publish-article-page.tsx`

```tsx
// 修复前
dangerouslySetInnerHTML={{ __html: articleHtml || "<p>正文预览会显示在这里。</p>" }}

// 修复后
dangerouslySetInnerHTML={{ __html: articleHtml ? sanitizeHtml(articleHtml) : "<p>正文预览会显示在这里。</p>" }}
```

## 测试验证

### 类型检查

```bash
bun run --cwd apps/web typecheck
# ✅ 通过，无错误
```

### 全仓库类型检查

全仓库 `bun run typecheck` 存在 2 个预存错误（`apps/server/src/modules/auth/sms-provider.ts`），与本次 XSS 防护变更无关。

### 安全验证清单

| 检查项 | 状态 |
|--------|------|
| 所有 `dangerouslySetInnerHTML` 已包裹 `sanitizeHtml()` | ✅ |
| 无残留的 `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write` | ✅ |
| 无 `eval()`/`new Function()` 等代码执行 | ✅ |
| 事件处理器属性（onclick 等）被禁止 | ✅ |
| 危险标签（script, iframe, object, embed, form）被禁止 | ✅ |
| URL 协议白名单限制 | ✅ |
| SSR 兼容性 | ✅ |
| 富文本编辑器功能不受影响（TipTap 标签已加入白名单） | ✅ |

## 边界处理

1. **空值/非字符串输入**：`sanitizeHtml()` 返回空字符串 `""`
2. **SSR 环境**：使用正则表达式做基本清理，不依赖 DOM API
3. **TipTap 自定义标签**：`data-video-block` 等自定义属性已加入白名单
4. **链接安全**：所有 `<a>` 标签自动获得 `target` 和 `rel` 属性支持

## 风险项

1. **DOMPurify 版本升级**：DOMPurify v3 的 API 与 v2 有差异，后续升级需注意兼容性
2. **SSR 清理不如浏览器环境严格**：SSR 回退方案使用正则表达式，覆盖范围有限。如果将来引入 SSR 渲染，建议评估是否需要更严格的服务端清理方案
3. **`style` 属性**：允许 `style` 属性可能带来 CSS 注入风险（如 `expression()` 在旧版 IE 中），但现代浏览器中 DOMPurify 会自动处理此类风险

## 需后端配合点

1. **CSP 响应头**：建议后端添加 `Content-Security-Policy` 响应头，限制 `script-src` 为 `self`，禁止 `unsafe-inline` 和 `unsafe-eval`
2. **输入验证**：后端 API 应在接收富文本内容时同样进行 HTML 清理，实现纵深防御
3. **X-Content-Type-Options**：建议后端设置 `X-Content-Type-Options: nosniff` 防止 MIME 类型嗅探

## 后续建议

1. 考虑引入 ESLint 规则 `react/no-danger` 来强制所有 `dangerouslySetInnerHTML` 使用 `sanitizeHtml()`
2. 对 `escapeHtml()` 函数编写单元测试
3. 定期更新 DOMPurify 版本以获取最新的安全修复
