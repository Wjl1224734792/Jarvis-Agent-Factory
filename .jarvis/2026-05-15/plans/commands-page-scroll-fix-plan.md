# Plan: 指令页面主内容区滚动修复

## 输入文档

- 需求文档: `.jarvis/2026-05-15/requirements/commands-page-scroll-fix.md`
- 任务文档: `.jarvis/2026-05-15/tasks/commands-page-scroll-fix-tasks.md`

## 当前轮次目标

修复 `/commands` 页面 flex 布局链路断裂导致的滚动失效 bug。

## 当前轮次范围

单任务 (TASK-001)，覆盖三层 flex 链路修复：
- REQ-001-1: 来源 Tab flex 容器修复
- REQ-001-2: Ant Design 内部 flex 补齐
- REQ-001-3: 卡槽网格滚动容器修复

## 完成标准

1. 卡片内容超出视口时可正常上下滚动
2. 标题和 Tab 栏滚动时保持固定
3. 分类 Tab 切换后滚动位置重置
4. 来源 Tab 切换后滚动正常
5. 不影响其他页面布局
6. 响应式布局正常（移动端/平板/桌面）

## 前置探索

无需。需求文档已提供根因分析和精确的行号定位，任务文档已给出台阶式实现步骤。代码量小（~60 行），现有代码结构在阅读时已充分理解。

## 执行代理分工

| 任务 | Agent | 职责 |
|------|-------|------|
| TASK-001 | frontend-ui-expert | 修改 Commands.tsx + 新建 Commands.css，完成后执行浏览器手动验证 |

## 共享区域改动归属

| 文件 | 操作 | 唯一责任方 |
|------|------|-----------|
| `web/src/pages/Commands.tsx` | 修改 style + className（3 处） | TASK-001 (frontend-ui-expert) |
| `web/src/pages/Commands.css` | 新建 | TASK-001 (frontend-ui-expert) |

无共享冲突。两文件仅此任务修改。

## 并行 / 串行策略

单任务，无并行。编码按步骤 1-2-3 顺序执行，完成后一并做浏览器手动验证。

## 风险提醒

| 风险 | 级别 | 缓解 |
|------|------|------|
| Ant Design CSS class 选择器依赖稳定 DOM 结构 | 低 | `.ant-tabs-content-holder`、`.ant-tabs-tabpane` 是 Ant Design 稳定 class，主版本内不变 |
| `height: 100%` 链可能被 Layout 层的 `overflow: hidden` 干扰 | 低 | Layout 层 `overflow: hidden` 是正常行为，flex 链路修复后子容器有自己的 `overflow: auto`，不会溢出到 Layout 层 |
| 其他页面受影响 | 低 | CSS 通过 `.commands-source-tabs` 前缀 class 隔离，仅作用于 `/commands` 页面 |

## 实现者交接信息

1. **编码顺序**: TSX 修改 → CSS 新建 → 启动预览 → 浏览器验证
2. **关键判断点**:
   - 入口 `<div>` 的 `height: '100%'` 已存在（Line 321），框架会正确驱动——无需改动
   - 分类 Tab 的 `flexShrink: 0` 保持不变——它不需要伸展
   - 滚动网格 div 的 `flex: 1; overflow: 'auto'` 保持不变——CSS 修复后会获得 flex 上下文
3. **验证方式**: 启动 Vite 预览服务器 → 浏览器访问 `/commands` → 手动验证滚动行为
4. **常见陷阱**: 不要在 `buildSourceContent` 中给 Fragment 添加 style（Fragment 不接受 props），必须用 `<div>` 替换 `<>`

## Plan patch / contract change request 触发条件

- 若 Ant Design 版本升级导致 CSS class 名变化 → 回编排者更新 CSS selector
- 若 Layout 层 `overflow: hidden` 行为不符合预期 → 回编排者讨论 Layout 层调整
- 无其他触发条件（纯 CSS + 行内 style 修改，无契约变更）

## 推荐的下一步

实现完成后由 qa-review-expert 评审变更。

---

## parallel_batches

### Batch 1（单任务，无依赖，可立即启动）

- **TASK-001** → subagent_type: frontend-ui-expert

---

## Execution Packets

### task_id: TASK-001
### task_name: 修复指令页面 flex 布局链路，恢复主内容区滚动
### requirement_ids: REQ-001-1, REQ-001-2, REQ-001-3
### owner: frontend-ui-expert
### objective: 修复 `/commands` 页面三层 flex 链路断裂，使卡片区域可正常滚动
### in_scope:
1. `Commands.tsx` Line 345：来源 Tabs 的 `style` 从 `flexShrink: 0` 改为 `flex: 1; minHeight: 0`，添加 `className="commands-source-tabs"`
2. `Commands.tsx` `buildSourceContent()`：Fragment `<>...</>` 改为 `<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>...</div>`
3. `Commands.css` 新建：补齐 Ant Design 内部 flex 链（`.ant-tabs-content-holder` → `flex: 1; min-height: 0`，`.ant-tabs-tabpane` → `height: 100%; display: flex; flex-direction: column`）
4. `Commands.tsx` 顶部添加 `import './Commands.css'`
### out_of_scope:
- 不修改 Layout.tsx 的 `overflow: hidden`
- 不改动分类 Tab 的 `flexShrink: 0`
- 不改动滚动网格 div 的 `flex: 1; overflow: 'auto'`
- 不改动任何其他页面
- 不添加自动化测试（CSS 布局修复，手动验证即可）
### input_documents:
- `.jarvis/2026-05-15/requirements/commands-page-scroll-fix.md`
- `.jarvis/2026-05-15/tasks/commands-page-scroll-fix-tasks.md`
### allowed_paths:
- `web/src/pages/Commands.tsx`
- `web/src/pages/Commands.css`
### forbidden_paths:
- `web/src/pages/` 下除 Commands.tsx 外的所有文件
- `web/src/components/` 全部
- `web/src/Layout.tsx`
- 根配置文件
### dependencies: []
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: N/A（单任务）
### wait_for: []
### acceptance_criteria:
1. 卡片内容超出视口时，页面可正常上下滚动（鼠标滚轮 / 触摸滑动）
2. 页面标题和来源 Tab 栏在滚动时保持固定不动
3. 分类 Tab 切换后滚动位置重置到顶部
4. 来源 Tab（项目/全局）切换后滚动正常工作
5. 不影响其他页面布局（CSS 通过 `.commands-source-tabs` 前缀隔离）
6. 响应式布局正常（移动端/平板/桌面均可滚动）
### test_strategy: manual_only

**手动验证清单（实现者启动预览服务器后执行）**:

| # | 验证项 | 操作 | 通过标准 |
|---|--------|------|---------|
| 1 | 基础滚动 | 浏览器访问 `/commands`，确认卡片数量超过视口高度时鼠标滚轮可上下滚动 | 卡片区域滚动，标题和 Tab 栏固定 |
| 2 | 分类 Tab 重置 | 滚动到中间位置，切换分类 Tab（如"开发"→"测试"） | 滚动位置重置到顶部，内容正确显示 |
| 3 | 来源 Tab 切换 | 在项目 Tab 滚动到中间，切换到全局 Tab | 全局 Tab 内容显示，滚动正常，无双滚动条 |
| 4 | 响应式 | DevTools 依次切换 375px / 768px / 1280px 视口 | 各宽度下均可滚动，卡片网格自动适配列数 |
| 5 | 布局隔离 | 访问 `/agents`、`/settings` 等其他页面 | 布局无变化，无不正常滚动 |
| 6 | CSS 属性 | DevTools Elements → Computed 检查 `.ant-tabs-content-holder` 的 `flex` 和 `.ant-tabs-tabpane` 的 `display` | `flex: 1`，`display: flex` |

### handoff_notes:
- 若手动验证失败，CSS 调整属于同任务增量修改，无需回编排者
- 验证截图建议保存到对话中，供 qa-review-expert 参考
- `Commands.css` 中使用的 Ant Design class 选择器依赖其稳定 DOM 结构，若未来升级 Ant Design 需检查此项

### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改
