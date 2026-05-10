# 需求文档：Markdown 渲染完善 + 抽屉可拖拽 + 会话检查

**日期**：2026-05-10
**状态**：confirmed
**关联**：REQ-022, REQ-023, REQ-024

---

## REQ-022：完善 Markdown 预览渲染

**现状**：`Dashboard.tsx` 中的 `LazyMarkdown` 组件仅使用 `remark-gfm` 插件，无 CSS 样式，导致：
- 围栏代码块无语法高亮（全部灰色纯文本）
- 表格/引用块/标题无排版样式（浏览器默认，与 antd 主题不协调）
- `.markdown-body` class 是孤立引用，无对应 CSS 规则

**需求**：
1. 为围栏代码块添加语法高亮（使用 `react-syntax-highlighter` + 浅色主题如 `oneLight`）
2. 添加 GitHub 风味的 `.markdown-body` CSS 排版样式（表格边框/斑马纹、引用块左边框、标题层级字号、代码块背景等）
3. 样式以 `<style>` 标签或 CSS-in-JS 方式注入，保持项目现有风格（主色 #52C41A，粗边框 #2C2C2C，背景 #FFF9F0）

**验收标准**：
- [ ] 代码块显示语法着色（JS/TS/Python/Shell/JSON 等常见语言）
- [ ] 表格有边框和斑马纹
- [ ] 引用块有绿色左边框
- [ ] 标题有层级字号区分
- [ ] 内联代码有背景色
- [ ] 构建大小增加可控（react-syntax-highlighter + 样式 < 50KB gzipped）

---

## REQ-023：MD 预览抽屉增加动态拖拽拉伸

**现状**：Dashboard 的文档抽屉使用 `antd Drawer`，固定宽度 `size={560}`，不可拖拽调整。

**关键发现**：antd v6 已内置 `resizable` 属性（`DrawerResizableConfig`），无需第三方库或自定义实现。

**需求**：
1. 为文档抽屉添加 `resizable` 属性
2. 支持拖拽左侧边缘（放置位置默认 `right`，拖拽手柄在左边缘）调整宽度
3. 拖拽范围合理（最小 380px，最大 900px）

**验收标准**：
- [ ] 抽屉左边缘出现拖拽手柄
- [ ] 拖拽可平滑调整抽屉宽度
- [ ] 宽度在 380px-900px 范围内
- [ ] 不影响抽屉内容渲染

---

## REQ-024：检查所有指令和 OpenCode 主智能体会话显示

**现状**：引擎通过 SSE 每 8 秒广播所有会话给 Web 面板。会话由各平台通过 `session_join` MCP 工具主动注册。

**检查结果**（实时验证）：
| 平台 | 总会话 | 活跃 | 非活跃 |
|------|--------|------|--------|
| Claude Code | 154 | 12 | 142 |
| OpenCode | 0 | 0 | 0 |
| Codex | 0 | 0 | 0 |

**结论**：
- Claude Code 的 16 个命令正常注册会话（154 条历史记录），侧边栏显示"会话列表 · 154"
- OpenCode 会话数为 0，因为当前无 OpenCode 实例连接到引擎
- 旧计划中的 OpenCode 模板同步（9 项计划第 9 条）尚未执行——`frontend.md`、`backend.md` 等 7 个主智能体仍是旧版格式，不含 `session_join` 调用

**建议**（不阻塞本次发布）：
- OpenCode 模板同步作为独立任务，后续单独处理
- 当前 Claude Code 会话显示正常，无缺陷

**验收标准**：
- [x] 侧边栏会话数量与 API 返回一致（154）
- [x] 平台筛选按钮正常（Claude 154 条，OpenCode 0 条，Codex 0 条）
- [ ] OpenCode 模板同步（后续任务，不在本次范围）
