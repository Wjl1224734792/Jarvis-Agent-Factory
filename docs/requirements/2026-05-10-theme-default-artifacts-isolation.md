# 需求文档：主题默认化 + Artifacts 数据库隔离 + Bug 修复 + 文档更新

**日期**：2026-05-10
**状态**：confirmed
**关联**：REQ-025 ~ REQ-031

---

## REQ-025：主题改为 antd 默认 ConfigProvider token 配置

**现状**：`theme.tsx` 仅使用 `theme.defaultAlgorithm`，无显式 token 配置。`App.tsx` 通过 `{...defaultTheme}` 展开传递。

**需求**：
1. 替换 `theme.tsx` 为显式 token 配置，使用用户指定的 token 值
2. 主色 `#1677ff`（antd 默认蓝），成功 `#52c41a`，警告 `#faad14`，错误 `#ff4d4f`
3. 圆角 `borderRadius: 6`，各级别圆角 XS=2, SM=4, LG=8
4. 间距 padding/margin 体系：16/12/24
5. 阴影使用 antd 默认 boxShadow 值
6. 移除不再需要的 `useIllustrationTheme` 或旧主题相关代码

**验收标准**：
- [ ] `ConfigProvider` 使用显式 token 而非仅 `defaultAlgorithm`
- [ ] 主色为蓝色 `#1677ff`，非之前的绿色 `#52C41A`
- [ ] 圆角/间距/阴影与指定值一致
- [ ] 所有页面（Dashboard/Agents/Archive）视觉正常

---

## REQ-026：Artifacts 数据库关联（方案B）

**现状**：`findSessionGateArtifacts` 通过「文件名日期前缀」匹配 checkpoint 日期来关联产物。同一天多个任务的产物会互相污染。

**需求**：
1. 新增 `artifacts` 数据库表：
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `run_id` TEXT NOT NULL — 关联 pipeline_runs.id
   - `gate` TEXT NOT NULL — Gate 标识（如 "A", "C-impl"）
   - `filepath` TEXT NOT NULL — 相对于 docs/ 的文件路径
   - `created_at` TEXT DEFAULT (datetime('now'))
   - 唯一约束 `UNIQUE(run_id, gate, filepath)`
2. Gate checkpoint 写入时记录 artifact：
   - 在 `advance_gate` 或 Gate 通过后，扫描 `docs/{gate_subdir}/` 新增的 .md 文件
   - 写入 artifacts 表，关联当前活跃 run_id
3. `findSessionGateArtifacts` 改用 DB 查询：
   - 通过 `SELECT filepath FROM artifacts WHERE run_id = ? AND gate = ?` 精确获取
   - 不再依赖日期前缀匹配
4. 向后兼容：旧数据（无 artifacts 表记录）回退到日期匹配逻辑

**验收标准**：
- [ ] 不同 session 在同一天的产物不再互相污染
- [ ] artifacts 表自动记录新产生的文档
- [ ] 旧数据不受影响（回退到日期匹配）

---

## REQ-027：修复会话列表"更多选择"无变化 bug

**现状**：点击会话项的 `···` → 置顶/归档/删除，调用 API 后只弹 `message.success`，UI 不更新。原因是完全依赖 SSE 回推，但 SSE 推送可能不及时。

**需求**：
1. 置顶/归档/删除操作后，**乐观更新**本地 sessions 状态
2. SSE 推送到达时覆盖本地状态（最终一致性）
3. 操作失败时回滚本地状态

**验收标准**：
- [ ] 置顶后列表立即重新排序（置顶项移到顶部）
- [ ] 归档后列表项立即消失
- [ ] 删除后列表项立即消失
- [ ] 操作失败时恢复原状态并提示错误

---

## REQ-028：修复 MD 预览抽屉 resizable 不工作

**现状**：Drawer 有 `resizable` 属性但无法左右拖动调整宽度。

**需求**：
1. 确认 `resizable` 在 antd v6.3.7 中的正确用法
2. 添加 `minWidth: 380, maxWidth: 900` 显式范围
3. 如果 antd v6 的 `resizable` 需要特定 DOM 结构或 CSS，确保条件满足
4. 拖拽手柄可见且可交互

**验收标准**：
- [ ] 抽屉左边缘出现拖拽手柄
- [ ] 拖拽可调整宽度（380-900px）
- [ ] 拖拽过程中内容正常渲染

---

## REQ-029：更新项目文档（README + AGENTS.md）

**现状**：
- README 未声明平台维护状态
- AGENTS.md 未说明 OpenCode/Codex 暂不维护
- 产物目录规范不明确：临时产物散落根目录，智能产出无明确路径约定

**需求**：
1. **README.md**：
   - 补充说明：当前只维护 Claude Code 平台
   - OpenCode/Codex 暂不维护，后续按需启动
   - 产物目录规范：临时产物 `tmp/*`，智能产出 `docs/*`，临时文档 `docs/tmp/*`
2. **AGENTS.md**：
   - 新增约束：不做 OpenCode/Codex 同步修改优化，除非用户明确说明要开始做
   - 明确产物目录规范（智能体产出路径规则）
3. **CLAUDE.md**（如有必要）同步更新

**验收标准**：
- [ ] README 明确声明平台维护范围
- [ ] AGENTS.md 含 OpenCode/Codex 不做同步的约束
- [ ] 产物目录规范在文档中有明确说明

---

## REQ-030：Mermaid 流程图 — 每个指令流程

**现状**：README 无流程图，新用户难以理解 16 个指令的工作流程。

**需求**：
1. 为每个 Claude Code 命令绘制 Mermaid 流程图
2. 覆盖 `src/templates/platforms/claude/commands/` 下所有 16 个命令：
   - `jarvis.md`, `jarvis-lite.md`
   - `frontend.md`, `backend.md`, `android.md`, `ios.md`, `flutter.md`, `expo.md`, `taro.md`
   - `browser-test.md`, `bug-fix.md`, `review.md`, `review-fix.md`
   - `frontend-architect.md`, `backend-architect.md`, `algorithm-expert.md`
3. 流程图放入 `docs/flows/` 目录
4. README 中添加链接指向各流程图

**验收标准**：
- [ ] 16 个 Mermaid 流程图覆盖所有指令
- [ ] 每个图正确反映指令的 Gate 序列和 Agent 调度逻辑
- [ ] README 中有链接可跳转到流程图

---

## REQ-031：清理旧数据库 + 全局重装

**现状**：引擎数据库积累了大量历史 session 数据（155 条），需要清理。

**需求**：
1. 停止引擎
2. 删除旧数据库文件 `~/.jarvis/engine.db`
3. 全局重新安装：`npm install -g .`
4. 更新工作区（项目目录内 `npm ci`）
5. 重启引擎

**验收标准**：
- [ ] 旧数据库已删除
- [ ] 全局安装新版
- [ ] 工作区依赖已更新
- [ ] 引擎启动后侧边栏会话数为 0（新数据库）
