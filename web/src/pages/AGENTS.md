<!-- Generated: 2026-05-22T08:28:05.565Z | Updated: 2026-05-25T00:20:00.000Z -->
<!-- Parent: ../AGENTS.md -->

# pages — Project subdirectory

## Purpose
页面组件 — Dashboard（流水线看板首页）、SessionDetail（会话详情含 Gate 步骤条 + Run 历史 + 文档预览）、Agents、Archive、Commands、Guide、Wiki 等。

## Key Files
| File | Description |
|------|-------------|
| AGENTS.md | Markdown documentation |
| Agents.tsx | React component — Exports: Agents |
| Archive.tsx | React component — Exports: Archive |
| CLAUDE.md | Markdown documentation |
| Commands.css | Style sheet |
| Commands.tsx | React component — Exports: Commands |
| Dashboard.tsx | React component — Exports: shortGate, GATE_COLORS, GATE_LABELS, GATE_DESCRIPTIONS, MARKDOWN_CSS |
| DashboardHome.tsx | React component — Exports: DashboardHome |
| Guide.tsx | React component — Exports: Guide |
| matchPipelineType.ts | TypeScript source — Exports: matchPipelineType |
| RunDetail.tsx | React component — Exports: RunDetail |
| SessionDetail.tsx | React component — Exports: SessionDetail |
| Wiki.css | Style sheet |
| Wiki.tsx | React component — Exports: Wiki |


## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
| __tests__/ | Project subdirectory | [AGENTS.md](__tests__/AGENTS.md) |


## For AI Agents

### Working In This Directory
- 页面组件使用 Ant Design (antd) + 内联样式，不额外引入 CSS 文件
- 可拖拽分割线模式参考 `Dashboard.tsx` 的 `handleResizeStart` 实现（mousedown/mousemove/mouseup）
- SessionDetail 的 Gate 步骤条使用 antd `Steps` 组件，Run 历史使用 CSS Grid 卡片布局

### Common Patterns
- `useRef` 用于拖拽状态追踪，`useCallback` 包裹拖拽处理器避免闭包过期
- 导出常量（`GATE_COLORS`、`GATE_LABELS`、`MARKDOWN_CSS`）在 `Dashboard.tsx` 中定义，其他页面 import 复用


## Dependencies
- **Internal:** __tests__/
- **External:** See package.json for full dependency list

<!-- MANUAL:START -->
<!-- MANUAL:END -->
