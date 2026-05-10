# Web面板缺陷修复 + 玻璃主题重构 + Pipeline审计

## REQ-001：修复会话列表 SSE 覆盖用户选择（Bug）

**现状**：`Layout.tsx:175` SSE `onmessage` 处理器因 stale closure 问题，`selectedSession` 始终捕获初始值 `null`，导致每 8 秒 SSE 广播时自动选中第一个活跃会话，覆盖用户手动选择的会话。

**需求**：
- SSE 数据更新时保留用户当前选中的会话，不自动切换
- 仅在首次加载且无选中项时才自动选择第一个活跃会话

**影响文件**：`web/src/components/Layout.tsx`

---

## REQ-002：修复 advance_gate / pipeline_init 的任务标题设置（Bug）

**现状**：`server.ts:460-462` `advance_gate` 的 `task_name` 条件 `gate === 'Gate A'` 永远无法触发（Gate A 是起始 Gate，无法被 advance 到）。编排者无法在启动任务时通过 MCP 工具设置有意义的会话标题，导致 Web 面板显示 `"项目名 · MM-DD"` 而非实际任务描述。

**需求**：
- `advance_gate` 移除 `gate === 'Gate A'` 条件，任意 Gate 推进时均可设置 `task_name`
- `pipeline_init` 增加 `task_name` 可选参数，允许初始化时直接设置
- `session_join` 增加 `task_name` 可选参数，恢复会话时也可更新标题

**影响文件**：`src/engine/server.ts`

---

## REQ-003：修复智能体分类重复"全部"按钮 + 删除"模板默认"分类

**现状**：
- `Agents.tsx:153` 硬编码 `'全部'` 与 API 返回的 `categories` 可能包含 `"全部"` 导致重复按钮（截图确认有两个"全部"）
- "模板默认"分类按钮不需要（用户要求删除）

**需求**：
- 过滤 `categories` 中已有的 `"全部"`，避免重复
- 从分类列表中移除 `"模板默认"` 项
- 后端 `getCategories()` 不再返回 `"模板默认"`

**影响文件**：`web/src/pages/Agents.tsx`、`src/engine/agent-registry.ts`

---

## REQ-004：Dashboard Gate 步骤条优化

**现状**：
- Dashboard 使用 `Timeline` 组件展示 Gate 步骤
- 步骤图标较小，步骤下方描述不够清晰
- 没有展示 `GATE_CHECKS` 中的每个 Gate 的详细功能说明

**需求**：
- 步骤图标放大（用更大的 Ant Design 图标尺寸）
- 每个 Gate 步骤下方增加功能说明文字（从 `GATE_CHECKS` 获取）
- 步骤标题使用更醒目的字体

**影响文件**：`web/src/pages/Dashboard.tsx`

---

## REQ-005：修复 MD 文档预览抽屉

**现状**：
- `Dashboard.tsx:207-212` 行级点击对所有 `.md` 文件循环调用 `openDoc`，只有最后一个文件的内容实际渲染
- 用户反馈"点击md没有出现抽屉无法点击预览"

**需求**：
- 点击单个 `.md` artifact 标签时正确打开抽屉预览
- 行级点击只打开第一个 `.md` 文件而非所有
- 确保 `ReactMarkdown` 渲染正常，Drawer 可正常关闭

**影响文件**：`web/src/pages/Dashboard.tsx`

---

## REQ-006：玻璃风格主题 + 亮/暗切换

**现状**：当前插画风格主题（`useIllustrationTheme`）用户反馈"看不清"，需替换为玻璃风格。

**需求**：
- 用玻璃风格主题（`useGlassTheme`）替换当前插画风格主题
- 添加亮色/暗色模式切换按钮（Header 区域）
- 亮色模式：白底 + 玻璃效果（`backdrop-filter: blur`）
- 暗色模式：深灰底 + 玻璃效果（`darkAlgorithm`）
- 切换状态保存在 localStorage，刷新保持

**影响文件**：`web/src/theme.tsx`（重写）、`web/src/App.tsx`、`web/src/components/Layout.tsx`（切换按钮）

---

## REQ-007：审计 Pipeline Type 与 Claude 指令 / OpenCode 主智能体覆盖

**现状**：4 个 pipeline_type（`full`、`frontend`、`backend`、`lite`），17 个 Claude Code 命令，但缺少系统化覆盖检查。

**需求**：
- 输出一份审计报告，列出每个 Claude Code 命令 → pipeline_type 映射
- 列出每个 OpenCode 主智能体对应的 pipeline_type
- 标注缺失或错误的映射
- **不修改模板文件**，仅输出报告

**审计范围**：
- `src/templates/platforms/claude/commands/*.md`（17 个）
- `src/templates/platforms/opencode/agents/*.md`（~60+ 个）
- `src/engine/gates.ts` PIPELINE_DEFS

---

## REQ-008：构建验证 + Git 发布

**需求**：
- `npm run build:web` 构建通过
- `npm test` 全部通过
- 提交、推送、打 tag v3.34.0

---

## 实施顺序

1. REQ-006（主题替换 — 全局样式先行，影响所有页面）
2. REQ-001（会话列表 SSE 跳转修复）
3. REQ-002（MCP 任务标题优化）
4. REQ-003（分类按钮修复）
5. REQ-004（Gate 步骤条优化）
6. REQ-005（MD 抽屉修复）
7. REQ-007（Pipeline 审计）
8. REQ-008（构建 + 发布）
