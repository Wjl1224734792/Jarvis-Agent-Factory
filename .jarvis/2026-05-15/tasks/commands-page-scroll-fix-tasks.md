# TDD 任务分解 — 指令页面主内容区滚动修复

## 需求文档

`.jarvis/2026-05-15/requirements/commands-page-scroll-fix.md`

## DDD 分析结果

已确认为 **N/A**（纯 CSS 表现层修复，无领域逻辑）。详见 `.jarvis/2026-05-15/tasks/commands-page-scroll-fix-ddd.md`。

## 任务概览

| 属性 | 值 |
|------|-----|
| 总任务数 | 1（三个 REQ 子项合并为单个 TASK） |
| 总变更估算 | ~60 行（S 级：Commands.tsx ~25 行修改 + Commands.css ~35 行新建） |
| 类型 | CSS 布局修复 |
| TDD 策略 | `manual_only`（浏览器手动验证滚动行为） |
| 涉及文件 | `web/src/pages/Commands.tsx`、`web/src/pages/Commands.css`（新建） |
| 共享冲突 | 无（两文件仅此任务修改） |
| 轮次 | 单轮 |

---

## 任务分解

### TASK-001: 修复 `/commands` 页面 flex 布局链路断裂

- **task_name**: 修复指令页面 flex 布局链路，恢复主内容区滚动
- **requirement_ids**: [REQ-001-1, REQ-001-2, REQ-001-3]
- **type**: 直接开发（CSS 布局修复，无业务逻辑）
- **priority**: P0（生产 bug，用户无法访问超出视口的卡片内容）
- **estimated_lines**: ~60（S 级）
- **test_strategy**: manual_only

  > CSS 布局修复的 TDD 与传统单元测试不同。验证通过浏览器手动确认滚动行为，无需编写自动化测试。验证点见下方"完成标准"。

- **dependencies**: []
- **parallel_group**: N/A（单任务）
- **risk**: 低

  > 仅 CSS + 行内 style 修改，零业务逻辑影响。Ant Design TabPane 内部 class selector 依赖其稳定 DOM 结构，Ant Design 主版本内 CSS class 名稳定，风险可控。

- **file_ownership**:

| 文件 | 操作 | 变更行数 |
|------|------|---------|
| `web/src/pages/Commands.tsx` | 修改 style + className（3 处） | ~25 |
| `web/src/pages/Commands.css` | **新建** | ~35 |

- **acceptance_criteria**:

1. 卡片内容超出视口时，页面可正常上下滚动（鼠标滚轮 / 触摸滑动）
2. 页面标题和来源 Tab 栏在滚动时保持固定不动
3. 分类 Tab 切换后滚动位置重置到顶部
4. 来源 Tab（项目/全局）切换后滚动正常工作
5. 不影响其他页面布局（页面级 CSS 通过 className 隔离）
6. 响应式布局正常（移动端/平板/桌面均可滚动）

---

## 实现步骤（编码顺序）

三个 REQ 子项共同构成完整 flex 链路，按以下顺序编码，完成后一并验证：

### 步骤 1 — REQ-001-1: 来源 Tab flex 容器修复

**文件**: `web/src/pages/Commands.tsx`

1. 来源 Tabs 的 `style` 从 `flexShrink: 0` 改为 `flex: 1; minHeight: 0`（约第 345 行）
2. 给来源 Tabs 添加 `className="commands-source-tabs"` 用于 CSS 精准定位
3. 入口 `<div>`（约第 321 行）的 `height: '100%'` 可能冲突——若页面本身已有滚动容器，可保留；若无，添加 `className="commands-page"`

### 步骤 2 — REQ-001-2: Ant Design 内部 flex 补齐

**文件**: `web/src/pages/Commands.css`（新建）

```css
.commands-source-tabs {
  display: flex;
  flex-direction: column;
}
.commands-source-tabs > .ant-tabs-content-holder {
  flex: 1;
  min-height: 0;
}
.commands-source-tabs > .ant-tabs-content-holder > .ant-tabs-content > .ant-tabs-tabpane {
  height: 100%;
  display: flex;
  flex-direction: column;
}
```

### 步骤 3 — REQ-001-3: 卡槽网格滚动容器修复

**文件**: `web/src/pages/Commands.tsx`

`buildSourceContent` 函数的返回内容（约第 285-317 行）需包裹在 flex 列容器中：

1. `<>...</>` Fragment 改为 `<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>...</div>`
2. 分类 Tabs 的 `flexShrink: 0` 保持不变（它不应伸展）
3. 滚动网格 div（约第 302 行）的 `flex: 1; overflow: 'auto'` 保持不变（现在有了 flex 上下文）

---

## TDD / 直接开发分类

### TDD — 手动验证（manual_only）

| 验证项 | 方法 | 通过标准 |
|--------|------|---------|
| 滚动行为 | 浏览器手动操作 | 卡片区域可上下滚动，标题/Tab 固定 |
| 分类 Tab 切换 | 手动切换分类 Tab | 滚动位置重置，内容正确显示 |
| 来源 Tab 切换 | 手动切换项目/全局 | 滚动正常工作，不出现双滚动条 |
| 响应式 | 浏览器 DevTools 调整视口宽度 | 移动端/平板/桌面均正常滚动 |
| 布局隔离 | 浏览其他页面（/agents、/settings 等） | 其他页面布局无变化 |
| CSS 属性验证 | DevTools Elements → Computed | `.ant-tabs-content-holder` 有 `flex: 1`，`.ant-tabs-tabpane` 有 `display: flex` |

### 直接开发

本任务虽标记为"直接开发"类型（无业务逻辑需 TDD），但 **必须执行上述手动验证**。CSS 布局修复无需自动化测试套件——视觉和交互验证足以确保正确性。

---

## 文件所有权和共享路径提醒

| 文件 | 操作为 | 冲突风险 |
|------|--------|---------|
| `web/src/pages/Commands.tsx` | 修改 | **无**：仅此任务修改 |
| `web/src/pages/Commands.css` | 新建 | **无**：新文件，无其他任务写入 |

---

## 推荐交付顺序

单任务，无依赖。编码按步骤 1-2-3 顺序，完成后执行全部手动验证。若验证失败，CSS 调整属于同任务的增量修改。

---

## 推荐的下一步

```
planner 读取本文档 → 执行实现（约 60 行变更，单轮交付）
```
