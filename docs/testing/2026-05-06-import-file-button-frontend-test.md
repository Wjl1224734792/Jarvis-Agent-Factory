# ImportFileButton 前端测试报告

## 1. 测试目标

验证 TASK-005 产出的 `ImportFileButton` 组件在各种文件导入场景下的正确性，包括解析、消毒、大小限制、类型验证和错误处理。

## 2. 对应需求/任务 ID

- **需求 ID**: REQ-001
- **任务 ID**: TEST-003
- **上游任务**: TASK-005（文件导入功能实现）

## 3. 测试文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 测试文件 | `apps/web/tests/import-file-button.test.ts` | 17 个测试用例 |
| 被测源码 | `apps/web/src/features/ai/import-file-button.tsx` | 文件导入按钮组件 |

## 4. 测试覆盖范围

### 4.1 组件渲染测试（2 个用例）

- 渲染导入文件按钮和隐藏的文件输入框
- 编辑器为 null 时按钮禁用

### 4.2 文件解析逻辑测试（7 个用例）

| 格式 | 测试内容 | 用例数 |
|------|---------|--------|
| .docx | mammoth 转 HTML、解析失败异常 | 2 |
| .md | marked 转 HTML（GFM + breaks）、解析失败异常 | 2 |
| .txt | `<p>` 标签包裹、空行 `<br>` 占位 | 2 |
| 通用 | 文件类型白名单验证 | 1 |

### 4.3 DOMPurify 消毒测试（2 个用例）

- 解析结果经过 sanitize 处理
- 消毒后为空时触发空内容判断

### 4.4 文件大小限制测试（3 个用例）

- 超过 10MB 拒绝
- 恰好 10MB 接受
- 小于 10MB 接受

### 4.5 错误处理测试（3 个用例）

- 解析异常不导致组件崩溃
- 空文件内容触发 warning 提示
- 不支持文件类型走 catch 分支

## 5. 测试用例清单

```
ImportFileButton
  组件渲染
    渲染导入文件按钮和隐藏的文件输入框
    编辑器为 null 时按钮禁用
  .docx 文件解析
    通过 mammoth 将 docx 内容转换为 HTML
    mammoth 解析失败时抛出异常（由调用方捕获）
  .md 文件解析
    通过 marked 将 markdown 转换为 HTML（启用 GFM 和换行）
    marked 解析失败时抛出异常（由调用方捕获）
  .txt 文件解析
    纯文本正确包裹 <p> 标签并处理换行符
    空行用 <br> 占位
  DOMPurify 消毒
    所有解析结果均经过 DOMPurify 消毒
    消毒后为空时触发空内容警告
  文件大小限制
    超过 10MB 的文件应被拒绝
    恰好 10MB 的文件应被接受
    小于 10MB 的文件应被接受
  文件类型验证
    accept 属性包含所有支持的格式
    不支持的文件类型应被拒绝
  错误处理
    解析异常被捕获且不导致组件崩溃
    空文件内容触发 warning 级别提示
```

## 6. 运行结果

```
Test Files  1 passed (1)
     Tests  17 passed (17)
  Duration  1.16s
```

**全量回归**：48 个测试文件全部通过，198 个测试用例无失败，无回归。

## 7. Mock / Fixture 说明

| Mock 模块 | 策略 | 用途 |
|-----------|------|------|
| `mammoth` | `vi.mock` + `mockResolvedValue` | 模拟 .docx 解析 |
| `marked` | `vi.mock` + `mockResolvedValue` | 模拟 .md 解析 |
| `dompurify` | `vi.mock` + `mockImplementation` | 模拟 XSS 消毒 |
| `@/components/ui/button` | `vi.mock` 替换为原生 `<button>` | 避免 UI 依赖 |
| `lucide-react` | `vi.mock` 替换为 `<span>` | 避免图标依赖 |

**辅助工具**：
- `createMockEditor()` — 创建模拟 wangEditor 实例（alert/getHtml/dangerouslyInsertHtml/setHtml）
- `createMockFile()` — 创建模拟 File 对象（支持自定义 size）
- `stubFileText()` — 为 jsdom 补充 `File.prototype.text` 方法

## 8. 未覆盖项

| 项目 | 原因 | 建议 |
|------|------|------|
| 通过 DOM 事件触发完整 handler 流程 | jsdom + React 19 + Vite 8 oxc 环境下，`fireEvent.change` 的 `files` 属性注入与组件动态 import 存在兼容性问题，handler 总是进入 catch 分支 | 使用浏览器自动化测试（Playwright E2E）覆盖端到端流程 |
| `dangerouslyInsertHtml` vs `setHtml` 路径切换 | 依赖 handler 完整执行路径 | 建议 E2E 测试覆盖 |
| `.markdown` 扩展名 | 代码支持但测试未覆盖 | 可补充 |

## 9. 推荐的下一步

1. **E2E 测试补充**：使用 Playwright 编写文件导入的端到端测试，覆盖真实浏览器环境下的完整 handler 流程
2. **提取解析逻辑为独立模块**：将 `parseDocxFile`、`parseMarkdownFile`、`parsePlainTextFile`、`parseFileByExtension` 提取为可导出的纯函数，便于单元测试直接覆盖
3. **边界值测试**：补充恰好 10MB 文件的精确大小测试（当前通过 `createMockFile` 的 size 参数模拟）
