# Web面板缺陷修复 + 玻璃主题重构 — 任务分解

## TASK-001：前端 — 玻璃主题 + 亮暗切换
- **REQ**: REQ-006
- **类型**: 直接开发
- **文件**: `web/src/theme.tsx`（重写）、`web/src/App.tsx`、`web/src/components/Layout.tsx`
- **内容**：用 glassTheme 替换 illustration 主题；在 Header 添加亮/暗切换按钮；localStorage 持久化主题选择
- **验收**: 
  1. 玻璃效果正常渲染（卡片、按钮、输入框有 backdrop-blur 效果）
  2. 亮暗切换按钮可点击切换
  3. 刷新后主题状态保持

## TASK-002：前端 — 修复会话列表 SSE 跳转
- **REQ**: REQ-001
- **类型**: Bug 修复
- **文件**: `web/src/components/Layout.tsx`
- **内容**：修复 SSE `onmessage` 中的 stale closure 问题——用 `useRef` 追踪 `selectedSession`，避免每 8 秒覆盖用户选择
- **验收**: 手动选中非活跃会话后，SSE 推送不跳转到活跃会话

## TASK-003：后端 — MCP 任务标题优化
- **REQ**: REQ-002
- **类型**: DDD（数据层改动）
- **文件**: `src/engine/server.ts`
- **内容**：
  - `advance_gate`：移除 `gate === 'Gate A'` 条件，任意 Gate 推进时均可设置 `task_name`
  - `pipeline_init`：增加 `task_name` 可选参数
  - `session_join`：增加 `task_name` 可选参数
- **验收**: 编排者调用 `advance_gate({ gate: "Gate B", task_name: "xxx" })` 后 Web 面板显示正确的标题

## TASK-004：前端 — 智能体分类按钮修复
- **REQ**: REQ-003
- **类型**: Bug 修复
- **文件**: `web/src/pages/Agents.tsx`、`src/engine/agent-registry.ts`
- **内容**：
  - 过滤 `categories` 中的 `"全部"` 避免重复按钮
  - 从 `getCategories()` 返回值中移除 `"模板默认"`
- **验收**: 分类行只有一个"全部"按钮；无"模板默认"按钮

## TASK-005：前端 — Gate 步骤条优化
- **REQ**: REQ-004
- **类型**: 直接开发
- **文件**: `web/src/pages/Dashboard.tsx`
- **内容**：
  - Timeline 步骤图标放大（用更大的图标尺寸）
  - 每个 Gate 步骤下方增加功能说明（从后端 `GATE_CHECKS` 获取）
  - 步骤标题字体加粗加大
- **验收**: 步骤图标明显更大；每个步骤下有功能说明文字

## TASK-006：前端 — 修复 MD 文档预览抽屉
- **REQ**: REQ-005
- **类型**: Bug 修复
- **文件**: `web/src/pages/Dashboard.tsx`
- **内容**：
  - 行级点击改为只打开第一个 `.md` 文件
  - 确保 Tag 点击正确打开 Drawer
  - 确保 `ReactMarkdown` 渲染正常
- **验收**: 点击 artifact 标签能打开 Drawer 查看 Markdown 内容

## TASK-007：审计 — Pipeline Type 覆盖检查
- **REQ**: REQ-007
- **类型**: 只读审计
- **文件**: 只读扫描 `src/templates/platforms/claude/commands/`、`src/templates/platforms/opencode/agents/`、`src/engine/gates.ts`
- **内容**：输出 Claude 命令 → pipeline_type 映射表、OpenCode 主智能体 → pipeline_type 映射表、缺失/异常标注
- **验收**: 审计报告列出所有命令/智能体的 pipeline_type 覆盖情况

## TASK-008：构建 + 发布
- **REQ**: REQ-008
- **类型**: 直接开发
- **内容**：`npm run build:web && npm test` → 提交 → 推送 → `v3.34.0`
- **验收**: tag 推送成功，构建和测试通过
