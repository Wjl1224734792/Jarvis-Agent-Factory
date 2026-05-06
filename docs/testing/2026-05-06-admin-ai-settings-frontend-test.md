# Admin AI 配置页面前端测试报告

## 1. 测试目标

验证 TASK-004 实现的 `AiSettingsPage` 组件功能正确性，覆盖：
- 配置表单的渲染和交互
- 保存功能的 API 调用
- 测试连接按钮的状态反馈
- 功能开关联动

## 2. 对应需求/任务 ID

| 项目 | ID |
|------|-----|
| 需求 | REQ-002 |
| 任务 | TASK-004（实现）/ TEST-005（测试） |

## 3. 测试文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `apps/admin/tests/ai-settings-page.test.tsx` | 组件测试 | AiSettingsPage 全功能测试 |

## 4. 基础设施变更

| 文件 | 变更 | 原因 |
|------|------|------|
| `vitest.config.ts` | 新增 `plugins: [react()]` 和 `.test.tsx` include | 支持 JSX 测试文件的编译 |

## 5. 测试覆盖范围

| 类别 | 测试数 | 说明 |
|------|--------|------|
| 表单渲染 | 5 | 字段标签、按钮、回填、API Key 脱敏、加载状态 |
| 保存交互 | 2 | 完整表单提交、API Key 为空时拦截 |
| 测试连接 | 3 | 成功反馈、失败反馈、loading 状态 |
| 功能开关联动 | 4 | 默认状态、开关切换、提交联动 |
| **总计** | **14** | |

## 6. 测试用例清单

### 6.1 表单渲染

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 渲染所有表单字段标签 | 7 个 Form.Item 标签正确渲染 | PASS |
| 渲染保存和测试连接按钮 | 两个操作按钮存在 | PASS |
| 回填服务端返回的配置数据 | baseUrl 和模型名称回填到输入框 | PASS |
| API Key 字段不回填脱敏值 | apiKey 输入框为空 | PASS |
| 加载状态时 Card 显示 loading | `.ant-card-loading` class 存在 | PASS |

### 6.2 保存交互

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 填写完整表单后点击保存 | `updateAiSettings` 被调用，参数正确 | PASS |
| API Key 为空时保存触发警告 | `updateAiSettings` 未被调用 | PASS |

### 6.3 测试连接

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 点击测试连接后显示成功提示 | 显示"连接成功" Alert | PASS |
| 测试连接失败时显示错误提示 | 显示"连接失败" Alert + 错误消息 | PASS |
| 测试连接中按钮显示 loading 状态 | `.ant-btn-loading` class 出现 | PASS |

### 6.4 功能开关联动

| 用例 | 验证点 | 结果 |
|------|--------|------|
| 摘要功能开关默认为开启状态 | `.ant-switch-checked` class 存在 | PASS |
| 排版功能开关默认为开启状态 | `.ant-switch-checked` class 存在 | PASS |
| 关闭摘要功能开关后状态正确更新 | `.ant-switch-checked` class 消失 | PASS |
| 功能开关关闭后保存能正确提交 | 提交数据包含 features 字段 | PASS |

## 7. 运行结果

```
Test Files  1 passed (1)
     Tests  14 passed (14)
  Duration  8.12s
```

全量回归验证（apps/admin/tests/）：
```
Test Files  20 passed (20)
     Tests  80 passed (80)
  Duration  14.45s
```

## 8. Mock / Fixture 说明

### Mock 策略

- **`apiClient` 模块**：通过 `vi.mock` 替换整个模块，避免触发 `import.meta.env` 和网络请求
- **浏览器 API**：`window.matchMedia`、`ResizeObserver`、`scrollIntoView` 在 `beforeAll` 中 polyfill，适配 jsdom 环境
- **React Query**：每次测试创建独立 `QueryClient`，禁用 `retry` 和 `refetchOnWindowFocus`

### Fixture 数据

```ts
const DEFAULT_AI_SETTINGS = {
  provider: 'dashscope',
  apiKey: 'sk-***',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  summaryModel: 'qwen-plus',
  formatModel: 'qwen-plus',
  features: { summary: true, format: true },
};
```

### 技术说明

Ant Design 6 + React 19 在 jsdom 环境下，Form 组件可能因 StrictMode 双重渲染产生重复 DOM 节点。测试使用 `getAllBy*` 查询 + `lastOf()` 辅助函数来规避此问题。这是 jsdom 环境下的已知限制，不影响生产行为。

## 9. 未覆盖项

| 项目 | 原因 |
|------|------|
| Select 下拉选择交互 | Ant Design Select 在 jsdom 下的弹窗渲染需要额外 popup 容器配置，优先级较低 |
| 表单验证错误消息展示 | 依赖 Ant Design Form 内部验证渲染，已通过 API 调用拦截间接验证 |
| 页面整体布局断言 | CSS 样式测试属于视觉回归范畴，不适合单元测试 |

## 10. 推荐的下一步

1. **Select 交互测试**：配置 Ant Design popup 容器后补充 Provider 切换的端到端测试
2. **E2E 测试**：使用 Playwright 覆盖完整的用户操作流程
3. **错误边界测试**：验证网络异常时的用户提示
