# 执行计划 — 第三轮修正与增强

> 日期：2026-05-11 | 规划者：planner

---

## 1. 需求文档路径

- `docs/2026-05-11/requirements/REQ-round3.md`

## 2. 任务文档路径

- `docs/2026-05-11/tasks/REQ-round3-tasks.md`

## 3. 当前轮次目标

执行 9 个修正/增强任务，涵盖：模板职责修正、Web UI 硬编码颜色清除、Release 工作流修复、CI/CD 分支约束、临时文件清理、路由补充、分支策略搭建。本轮为单轮次执行，预计总变更约 **330 行**（不含文件删除），远低于 1000 行阈值。

## 4. 当前轮次范围

| REQ | 说明 | 对应 TASK |
|-----|------|-----------|
| REQ-032 | 纠正 docs-engineer 智能体职责 | TASK-001 |
| REQ-033 | Web UI 移除所有硬编码颜色，回归 antd 默认风格 | TASK-002, TASK-003, TASK-004, TASK-005 |
| REQ-034 | 修复 GitHub Release 自动创建 & README 版本同步 | TASK-007 |
| REQ-035 | CI/CD 仅 main 分支触发 | TASK-007 |
| REQ-036 | 临时文件目录重构 | TASK-008 |
| REQ-037 | 添加 /dashboard 路由 | TASK-006 |
| REQ-038 | dev/main 分支策略 | TASK-009 |

## 5. 完成标准

1. `npm run typecheck` 通过（Web 项目 TypeScript 编译无错误）
2. `npm run build:web` 通过（Web 生产构建成功）
3. 视觉验证：所有页面呈现 antd 蓝白默认风格，无硬编码颜色残留
4. README.md 版本徽章显示 `v3.35.0`（与 `package.json` 一致）
5. `git status` 干净：仅有预期文件变更，无临时文件（agents-filter-buttons.yml 等）
6. `.github/workflows/release.yml` 符合 REQ-034 + REQ-035 要求
7. `/dashboard` 路由可访问
8. `dev` 分支已创建并推送到 GitHub + Gitee

## 6. 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要。** 理由：
- 所有涉及文件均已在任务文档中明确路径，且经 planner 逐文件验证存在
- 每个任务的完成标准已详细定义，无需额外代码探索
- 变更范围小、单文件独占，现有文件结构已知

## 7. 执行代理分工

| TASK | 关联 REQ | 目标 | 代理类型 | 预估行数 | 预估耗时 |
|------|---------|------|---------|---------|---------|
| TASK-001 | REQ-032 | 修复 docs-engineer 模板职责描述 | remediation-expert | ~25 | ~5min |
| TASK-002 | REQ-033 | Layout.tsx 硬编码颜色清理 | frontend-dev-expert | ~70 | ~15min |
| TASK-003 | REQ-033 | Dashboard.tsx 硬编码颜色清理 | frontend-dev-expert | ~90 | ~20min |
| TASK-004 | REQ-033 | Agents.tsx 硬编码颜色清理 | frontend-dev-expert | ~60 | ~15min |
| TASK-005 | REQ-033 | Archive.tsx 硬编码颜色清理 | frontend-dev-expert | ~35 | ~10min |
| TASK-006 | REQ-037 (+REQ-033 顺带) | 添加 /dashboard 路由 + App.tsx 颜色清理 | frontend-dev-expert | ~5 | ~3min |
| TASK-007 | REQ-034, REQ-035 | 修复 Release 工作流 + CI/CD 分支 + README 版本同步 | remediation-expert | ~40 | ~20min |
| TASK-008 | REQ-036 | 临时文件目录清理 | remediation-expert | ~5 | ~5min |
| TASK-009 | REQ-038 | dev/main 分支策略 | remediation-expert | 0（Git 操作） | ~2min |

## 8. 共享区域改动归属

**本轮无共享文件冲突。** 每个文件仅被唯一 TASK 修改：

| 文件 | 负责 TASK | 独占状态 |
|------|-----------|---------|
| `src/templates/platforms/claude/agents/docs-engineer.md` | TASK-001 | 独占 |
| `web/src/components/Layout.tsx` | TASK-002 | 独占 |
| `web/src/pages/Dashboard.tsx` | TASK-003 | 独占 |
| `web/src/pages/Agents.tsx` | TASK-004 | 独占 |
| `web/src/pages/Archive.tsx` | TASK-005 | 独占 |
| `web/src/App.tsx` | TASK-006 | 独占 |
| `.github/workflows/release.yml` | TASK-007 | 独占 |
| `README.md` | TASK-007 | 独占 |
| 根目录临时文件（删除） | TASK-008 | 独占 |
| Git 分支（dev） | TASK-009 | 独占 |

> **特别说明**：`App.tsx` 第 13 行 `color: '#9CD3D3'` 属于 REQ-033 范围，但由 TASK-006（唯一修改 `App.tsx` 的任务）顺带处理，避免为一行颜色修改另起任务造成双任务写同一文件。

## 9. 并行/串行策略

### Batch 1 — 8 个任务全并行（无共享文件冲突）

```
TASK-001 ─┐
TASK-002 ─┤
TASK-003 ─┤
TASK-004 ─┼── 同时启动，各自独立修改独立文件
TASK-005 ─┤
TASK-006 ─┤
TASK-007 ─┤
TASK-008 ─┘
     │
     ▼ 全部完成后统一验证大门
     │  npm run typecheck
     │  npm run build:web
     │  视觉检查（npm run dev:web）
     │  README 版本号验证
     │  git status 确认
     │
     ▼
Batch 2（串行，依赖 Batch 1 全部通过）
     │
TASK-009 ── 创建并推送 dev 分支
```

### 并行组标注

- **并行组 1**: [TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008]
- **串行链**: Batch 1 全部完成 → TASK-009

## 10. 风险提醒

| 风险 | 等级 | 说明 | 缓解 |
|------|------|------|------|
| TASK-003 颜色语义错位 | 中 | Dashboard.tsx 含 GATE_COLORS 常量表、MARKDOWN_CSS 内联样式块，变更面最大（~90 行）。功能色（进度条绿/红）错误映射可能破坏 Gate 进度卡片语义。 | 逐项替换后保留原语义色作为注释；实现者需理解每个颜色在上下文中的功能含义后再替换 |
| TASK-007 CI/CD 配置错误 | 中 | release.yml 修改直接影响生产发布通道。分支过滤逻辑错误可能导致 tag push 不触发 release 或允许非 main 分支发布。 | TDD 策略：先在本地验证语法正确；分支过滤使用 `github.ref` 判断；README 版本同步用 `sed` 精确替换 |
| 视觉验证主观性 | 低 | 4 个页面（Layout/Dashboard/Agents/Archive）并行修改后视觉一致性需统一检查 | Batch 1 全部完成后通过统一验证大门，人工审查所有页面 |

## 11. 实现者交接信息

- 每个实现 Agent 收到 Execution Packet 后按照 `acceptance_criteria` 逐项完成
- 完成后统一在 Batch 1 验证大门汇聚：运行 `typecheck`、`build:web`、`dev:web` 视觉检查
- TASK-007 实现者需特别关注 release.yml 的分支过滤逻辑——需在推送到 GitHub 前通过本地审查或 `act` 模拟
- TASK-009 执行者需等待前面所有任务全部完成且验证通过后方可操作

## 12. parallel_batches

### Batch 1（无依赖，可同时启动）

- TASK-001 → subagent_type: remediation-expert
- TASK-002 → subagent_type: frontend-dev-expert
- TASK-003 → subagent_type: frontend-dev-expert
- TASK-004 → subagent_type: frontend-dev-expert
- TASK-005 → subagent_type: frontend-dev-expert
- TASK-006 → subagent_type: frontend-dev-expert
- TASK-007 → subagent_type: remediation-expert
- TASK-008 → subagent_type: remediation-expert

### Batch 2（依赖 Batch 1 全部完成并验证通过）

- TASK-009 → subagent_type: remediation-expert

---

## 13. Execution Packets

---

### task_id: TASK-001
### task_name: 修复 docs-engineer 模板职责
### requirement_ids: REQ-032
### owner: remediation-expert
### objective: 纠正 docs-engineer 智能体模板中的错误输出路径，将职责从"向流水线产物目录写入报告"修正为"检查并就地修复项目级同步文档"
### in_scope:
- 移除模板中所有对 `docs/<YYYY>-<MM>-<DD>/shipping/` 路径的引用
- 将"输出文件"路径改为 `.jarvis/docs-sync-report.md`
- 明确职责描述：检查并同步 AGENTS.md、README.md、CLAUDE.md 与最新代码变更
- 输出改为直接在仓库根目录修改上述文档（就地修复不一致）
### out_of_scope:
- 不修改其他模板文件
- 不修改引擎代码中的模板加载逻辑
- 不新增文档或 README
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-032)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-001)
### allowed_paths:
- `src/templates/platforms/claude/agents/docs-engineer.md`
### forbidden_paths:
- 所有其他文件（模板目录下其他 Agent 模板、引擎源码等）
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards
### parallel_group: TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
### wait_for: 无
### acceptance_criteria:
1. 模板中不再引用 `docs/<YYYY>-<MM>-<DD>/shipping/` 路径
2. "输出文件" 路径改为 `.jarvis/docs-sync-report.md`
3. 职责描述明确为：检查并同步 AGENTS.md、README.md、CLAUDE.md 与最新代码变更
4. 输出改为直接在仓库根目录修改上述文档（就地修复不一致），可选同步报告写 `.jarvis/`
### test_strategy: manual_only
### handoff_notes: 模板文档变更，人工阅读确认即可。无需运行 typecheck 或自动化测试。
### escalation_rule: 如需变更模板引擎逻辑或修改其他模板文件，必须先回编排者，不得直接修改。

---

### task_id: TASK-002
### task_name: Layout.tsx 移除硬编码颜色
### requirement_ids: REQ-033
### owner: frontend-dev-expert
### objective: 将 Layout.tsx 中所有内联 style 硬编码颜色替换为 antd token 语义色，回归 antd 蓝白默认风格
### in_scope:
- 移除所有内联 style 中的硬编码颜色值：`#52C41A` × 7, `#FFF9F0` × 3, `#2C2C2C` × 20+, `#E8F5E9`, `#FFD93D`, `#FA5252`
- 语义化颜色改用 antd token：通过 `useToken()` 获取 `token.colorSuccess`、`token.colorError`、`token.colorText` 等
- 背景色统一使用 `transparent` 或 `token.colorBgContainer`
- `PLATFORM_INFO`、`CMD_LABELS` 中的颜色常量使用 antd token 语义色
- 修改后运行 `npm run typecheck` 确认通过
### out_of_scope:
- 不修改 Layout.tsx 以外的任何文件
- 不调整 Layout 的布局结构或功能逻辑
- 不新增组件或功能
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-033)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-002)
### allowed_paths:
- `web/src/components/Layout.tsx`
### forbidden_paths:
- `web/src/pages/*` (其他页面文件)
- `web/src/theme.tsx` (主题配置，已正确无需修改)
- `web/src/App.tsx` (路由入口，TASK-006 负责)
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
### wait_for: 无
### acceptance_criteria:
1. 移除所有内联 style 中的硬编码颜色值
2. 语义化颜色改用 antd token（通过 `useToken()` 获取）
3. 背景色统一使用 `transparent` 或 `token.colorBgContainer`
4. `PLATFORM_INFO`、`CMD_LABELS` 中的颜色常量使用 antd token 语义色
5. `npm run typecheck` 通过
6. 视觉效果回归 antd 蓝白默认风格（主色 `#1677ff`）
### test_strategy: test_after
### handoff_notes:
- 修改后务必运行 `npm run typecheck` 验证类型安全
- 颜色映射参考：`#52C41A` → `token.colorSuccess`, `#FA5252` → `token.colorError`, `#2C2C2C` → `token.colorText`, `#FFF9F0` → `token.colorBgContainer`, `#FFD93D` → `token.colorWarning`, `#E8F5E9` → `token.colorSuccessBg`, `#CBC4AF` → `token.colorTextSecondary`
- 若某处使用 `useToken()` 不便（非组件函数内），可改用 CSS 变量 `var(--ant-color-success)` 等形式
### escalation_rule: 如需修改 `theme.tsx` 的 ConfigProvider token 配置，必须先回编排者确认。

---

### task_id: TASK-003
### task_name: Dashboard.tsx 移除硬编码颜色
### requirement_ids: REQ-033
### owner: frontend-dev-expert
### objective: 将 Dashboard.tsx 中所有内联 style 硬编码颜色替换为 antd token 语义色，重构 GATE_COLORS / MARKDOWN_CSS 等色彩常量为语义化引用
### in_scope:
- 移除所有内联 style 中的硬编码颜色值（`#52C41A` × 15+, `#FFF9F0` × 3, `#2C2C2C` × 15+, `#51CF66`, `#FA5252`）
- `GATE_COLORS` 常量表改为使用 antd token 语义色，或直接通过组件属性（如 `color` prop）传递
- `MARKDOWN_CSS` 内联样式块中的硬编码颜色替换为 antd token 引用
- `RUN_STATUS` 颜色常量使用 antd token
- `Statistic` 组件的 `styles.content.color` 移除硬编码 `#52C41A`
- `LoadingOutlined` 的 `style={{ color: '#52C41A' }}` 改用 token 引用
- 修改后运行 `npm run typecheck` 确认通过
### out_of_scope:
- 不修改 Dashboard.tsx 以外的任何文件
- 不调整 Dashboard 的功能逻辑或数据结构
- 不新增图表或看板功能
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-033)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-003)
### allowed_paths:
- `web/src/pages/Dashboard.tsx`
### forbidden_paths:
- `web/src/components/*` (Layout 等组件)
- `web/src/pages/Agents.tsx` (TASK-004 负责)
- `web/src/pages/Archive.tsx` (TASK-005 负责)
- `web/src/theme.tsx` (主题配置，已正确无需修改)
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-002, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
### wait_for: 无
### acceptance_criteria:
1. 移除所有内联 style 中的硬编码颜色值
2. `GATE_COLORS` 常量表改为使用 antd token 语义色，或直接通过组件属性传递
3. `MARKDOWN_CSS` 内联样式块中的硬编码颜色替换为 antd token 引用
4. `RUN_STATUS` 颜色常量使用 antd token
5. `Statistic` 组件的 `styles.content.color` 移除硬编码 `#52C41A`
6. `LoadingOutlined` 的 `style={{ color: '#52C41A' }}` 改用 token 引用
7. `npm run typecheck` 通过
8. 视觉效果回归 antd 蓝白默认风格
### test_strategy: test_after
### handoff_notes:
- **高风险任务**：Dashboard.tsx 共约 474 行，颜色实例最多（15+ 处 `#52C41A`、15+ 处 `#2C2C2C`），变更面最大
- 逐项替换，每替换完一类颜色即做类型检查
- 关键映射：Gate 进度条绿色 → `token.colorSuccess`，红色 → `token.colorError`，暗色文字 → `token.colorText`
- 保留原语义色作为注释（如 `// 原 #52C41A → token.colorSuccess`）便于审查
### escalation_rule: 如需修改 `theme.tsx` 的 ConfigProvider token 配置来配合 Dashboard 颜色更改，必须先回编排者确认。

---

### task_id: TASK-004
### task_name: Agents.tsx 移除硬编码颜色
### requirement_ids: REQ-033
### owner: frontend-dev-expert
### objective: 将 Agents.tsx 中所有内联 style 硬编码颜色替换为 antd token 语义色，包括 PixelAvatar 组件的颜色常量
### in_scope:
- 移除所有内联 style 中的硬编码颜色值（`#52C41A` × 8, `#FFF9F0` × 3, `#2C2C2C` × 15+, `#FA5252`, `#51CF66`）
- `PLATFORM_INFO` 颜色常量使用 antd token 语义色
- `PixelAvatar` 组件中的硬编码颜色（`#52C41A`、`#51CF66`、`#FA5252`、`#2C2C2C`）替换为 antd token
- `PixelAvatar` 背景色 `#FFF9F0` 改为 `token.colorBgContainer`
- 修改后运行 `npm run typecheck` 确认通过
### out_of_scope:
- 不修改 Agents.tsx 以外的任何文件
- 不调整 Agents 的功能逻辑或 Agent 卡片交互
- 不修改筛选/编辑弹窗的业务逻辑
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-033)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-004)
### allowed_paths:
- `web/src/pages/Agents.tsx`
### forbidden_paths:
- `web/src/components/*` (Layout 等组件)
- `web/src/pages/Dashboard.tsx` (TASK-003 负责)
- `web/src/pages/Archive.tsx` (TASK-005 负责)
- `web/src/theme.tsx` (主题配置，已正确无需修改)
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-002, TASK-003, TASK-005, TASK-006, TASK-007, TASK-008
### wait_for: 无
### acceptance_criteria:
1. 移除所有内联 style 中的硬编码颜色值
2. `PLATFORM_INFO` 颜色常量使用 antd token 语义色
3. `PixelAvatar` 组件中的硬编码颜色替换为 antd token
4. `PixelAvatar` 背景色 `#FFF9F0` 改为 `token.colorBgContainer`
5. `npm run typecheck` 通过
### test_strategy: test_after
### handoff_notes:
- PixelAvatar 是组件内自定义静态组件，需注意 token 引用方式
- 颜色映射参考：`#52C41A` / `#51CF66`（绿色） → `token.colorSuccess`, `#FA5252`（红色） → `token.colorError`, `#2C2C2C`（粗黑） → `token.colorText`, `#FFF9F0`（暖黄底） → `token.colorBgContainer`
### escalation_rule: 如需修改 `theme.tsx` 来配合 Agents 页面颜色更改，必须先回编排者确认。

---

### task_id: TASK-005
### task_name: Archive.tsx 移除硬编码颜色
### requirement_ids: REQ-033
### owner: frontend-dev-expert
### objective: 将 Archive.tsx 中所有内联 style 硬编码颜色替换为 antd token 语义色
### in_scope:
- 移除所有内联 style 中的硬编码颜色值（`#52C41A` × 4, `#FFF9F0` × 1, `#2C2C2C` × 8+, `#FA5252`, `#51CF66`）
- `CMD_LABELS`、`STATUS_LABELS` 颜色常量使用 antd token 语义色
- 修改后运行 `npm run typecheck` 确认通过
### out_of_scope:
- 不修改 Archive.tsx 以外的任何文件
- 不调整 Archive 的功能逻辑或数据展示
- 不修改 App.tsx（TASK-006 负责）
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-033)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-005)
### allowed_paths:
- `web/src/pages/Archive.tsx`
### forbidden_paths:
- `web/src/components/*` (Layout 等组件)
- `web/src/pages/Dashboard.tsx` (TASK-003 负责)
- `web/src/pages/Agents.tsx` (TASK-004 负责)
- `web/src/App.tsx` (TASK-006 负责)
- `web/src/theme.tsx` (主题配置，已正确无需修改)
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-002, TASK-003, TASK-004, TASK-006, TASK-007, TASK-008
### wait_for: 无
### acceptance_criteria:
1. 移除所有内联 style 中的硬编码颜色值
2. `CMD_LABELS`、`STATUS_LABELS` 颜色常量使用 antd token 语义色
3. `npm run typecheck` 通过
### test_strategy: test_after
### handoff_notes:
- 变更面最小（~35 行），作为 REQ-033 的收尾任务
- 颜色映射参考同其他页面：绿色 → `token.colorSuccess`，红色 → `token.colorError`，暗色 → `token.colorText`
### escalation_rule: 如需修改 `theme.tsx` 来配合 Archive 页面颜色更改，必须先回编排者确认。

---

### task_id: TASK-006
### task_name: 添加 /dashboard 路由 + App.tsx 颜色清理
### requirement_ids: REQ-037, REQ-033
### owner: frontend-dev-expert
### objective: 在 App.tsx 中新增 `/dashboard` 路由并顺带替换 App.tsx 中的硬编码加载颜色
### in_scope:
- 在 `App.tsx` 的 `<Routes>` 中新增 `<Route path="/dashboard" element={<Dashboard />} />`
- 保持 `/` 也映射到 Dashboard（向后兼容）
- 替换 App.tsx 第 13 行 `color: '#9CD3D3'` 为 antd token 引用（如 `token.colorPrimary` 或 `token.colorText`）
- 若 `App.tsx` 中其他位置存在硬编码颜色，一并替换
### out_of_scope:
- 不修改 Dashboard 组件本身（TASK-003 负责）
- 不修改其他路由配置或页面
- 不修改 Layout 组件（TASK-002 负责）
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-033, REQ-037)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-006)
### allowed_paths:
- `web/src/App.tsx`
### forbidden_paths:
- `web/src/pages/*` (其他页面文件)
- `web/src/components/*` (Layout 等组件)
- `web/src/theme.tsx` (主题配置，已正确无需修改)
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-007, TASK-008
### wait_for: 无
### acceptance_criteria:
1. `App.tsx` 的 `<Routes>` 中新增 `<Route path="/dashboard" element={<Dashboard />} />`
2. 保持 `/` 也映射到 Dashboard（向后兼容）
3. App.tsx 中无硬编码颜色残留
4. `npm run typecheck` 通过
5. 访问 `http://localhost:3457/dashboard` 正常显示流水线看板
### test_strategy: manual_only
### handoff_notes:
- 变更极小（~5 行），路由手动验证即可
- `color: '#9CD3D9'` 加载文字颜色建议替换为 `token.colorTextSecondary`（加载提示属次要文字）
- 若 App.tsx 当前未使用 `useToken()`，需添加 import 和 hook 调用
### escalation_rule: 如需修改路由结构（如添加 Layout wrapper、Route 嵌套等），必须先回编排者确认。

---

### task_id: TASK-007
### task_name: 修复 Release 工作流 + CI/CD 分支约束 + README 版本同步
### requirement_ids: REQ-034, REQ-035
### owner: remediation-expert
### objective: 修复 release.yml 的 web 依赖缺失和分支安全问题，同步 README 版本徽章至当前 package.json 版本号
### in_scope:
- release workflow 的 `release` job 中，`npm ci` 后增加 `cd web && npm install`，确保 `build:web` 有 web 依赖
- 确认 `permissions: contents: write` 已正确配置（当前已存在，确认即可）
- release workflow 增加分支检查：仅当 tag 指向 main 分支时才触发 release job
  - 实现方式：在 `release` job 中添加 `if` 条件或 step 级 `git branch --contains` 校验
- README.md 的版本徽章从当前旧值更新为 `package.json` 版本号 `3.35.0`
- release workflow 增加步骤：自动更新 README 版本徽章为最新 tag 版本（用 `sed` 替换版本号）
- CI workflow 确认已满足 `branches: [main]`（确认即可，无需修改）
### out_of_scope:
- 不修改 CI workflow（`.github/workflows/ci.yml`）除非确认其不满足 `branches: [main]`
- 不修改 npm publish 流程
- 不修改 package.json 版本号
- 不新建 workflow 文件
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-034, REQ-035)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-007)
### allowed_paths:
- `.github/workflows/release.yml`
- `README.md`
### forbidden_paths:
- `.github/workflows/ci.yml` (除非确认需修改)
- `package.json` (版本号由发布流程自动管理)
- 所有 `web/src/` 文件
- 所有 `src/` 模板文件
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, test-driven-development, shipping-and-launch, git-workflow-and-versioning
### parallel_group: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-008
### wait_for: 无
### acceptance_criteria:
1. release workflow 的 `release` job 中 `npm ci` 后增加 `cd web && npm install`（或 `npm ci --prefix web`）
2. `permissions: contents: write` 已配置（当前正确，确认即可）
3. release workflow 增加分支检查：仅当 tag 指向 main 分支时才执行 release job
   - 推荐：在 `release` job 顶层添加 `if: github.ref_type == 'tag' && startsWith(github.ref, 'refs/tags/v')`（tag 格式过滤）
   - 或在 job steps 中用 `git branch --contains $GITHUB_SHA | grep -q 'main'` 进行运行时校验
4. README.md 的版本徽章更新为 `v3.35.0`
5. release workflow 增加自动更新 README 版本徽章步骤（`sed` 替换）
6. CI workflow 已满足 `branches: [main]`，确认无需修改
### test_strategy: tdd
### handoff_notes:
- **高风险任务**：CI/CD 工作流修改直接影响生产发布通道
- TDD 流程：先编写/审查验证逻辑 → 确认语法正确 → 再应用修改
- 分支过滤推荐方案：在 `release` job 添加 `if: success() && startsWith(github.ref, 'refs/tags/v')`，结合 step 级的 `git branch -r --contains $GITHUB_SHA | grep -q 'origin/main'` 确保只有 main 分支上的 tag 触发 release
- README 版本徽章当前显示 `v3.27.1`，需改为 `v3.35.0`；release workflow 自动同步步骤用 `sed -i "s/version-v[0-9.]*/version-v${RELEASE_TAG#v}/g" README.md`
- 修改后需本地审查 YAML 语法（可用 `yamllint` 或 `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/release.yml','utf8'))"` 验证）
### escalation_rule: 如需修改 CI workflow、npm publish 流程或 package.json 版本号，必须先回编排者确认。

---

### task_id: TASK-008
### task_name: 临时文件目录清理
### requirement_ids: REQ-036
### owner: remediation-expert
### objective: 删除根目录的 5 个临时文件，确认 `.gitignore` 已正确忽略相应目录
### in_scope:
- 删除以下根目录临时文件：
  - `agents-filter-buttons.yml`
  - `agents-mobile.txt`
  - `drawer-open.txt`
  - `sessions.json`
  - `snapshot-home.txt`
- 确认 `.gitignore` 已包含 `.jarvis/`（当前第 35 行），无需修改
- 确认 `.gitignore` 已包含 `.claude/`（当前第 26 行），`.claude/.jarvis/file-hashes.json` 不会被提交
- 运行 `git status` 确认仅删除操作，无其他意外变更
### out_of_scope:
- **不删除** `skills-lock.json`（合法项目文件，在 `.npmignore` 中引用）
- **不删除** `tsconfig.json`（合法项目文件）
- 不修改引擎代码中的临时文件输出路径（REQ-036 的代码修改部分不在本轮范围——仅做手动清理）
- 不修改 `.gitignore`（已正确配置）
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-036)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-008)
### allowed_paths:
- 根目录（仅删除操作：`agents-filter-buttons.yml`, `agents-mobile.txt`, `drawer-open.txt`, `sessions.json`, `snapshot-home.txt`）
- `.gitignore`（仅确认，无需修改）
### forbidden_paths:
- `skills-lock.json`（保留）
- `tsconfig.json`（保留）
- `src/`、`web/`、`.github/` 所有子目录
- `.claude/` 目录（保留，已在 .gitignore 中）
- `.jarvis/` 目录（保留，已在 .gitignore 中）
### dependencies: 无
### required_skills: behavioral-guidelines, code-standards, finishing-a-development-branch
### parallel_group: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007
### wait_for: 无
### acceptance_criteria:
1. 根目录的 5 个临时文件已删除
2. `git status` 显示仅删除操作，无其他意外变更
3. `.gitignore` 确认 `.jarvis/` 已忽略（当前第 35 行，无需修改）
4. `skills-lock.json` 保留（合法项目文件）
### test_strategy: manual_only
### handoff_notes:
- 仅文件删除操作，无代码变更
- 执行 `rm <file>` 或 `git rm <file>` 均可；推荐 `git rm` 以使删除直接纳入暂存区
- 删除后执行 `git status` 截图/输出验证
### escalation_rule: 如需删除 `skills-lock.json`、`tsconfig.json` 或 `.claude/` 目录，必须先回编排者确认。

---

### task_id: TASK-009
### task_name: dev/main 分支策略
### requirement_ids: REQ-038
### owner: remediation-expert
### objective: 从当前 main 分支创建 dev 分支并推送到 GitHub 和 Gitee 远程
### in_scope:
- 从当前 main 分支创建 `dev` 分支：`git checkout -b dev`
- 推送到 GitHub：`git push origin dev`
- 推送到 Gitee：`git push gitee dev`
- 本地切换到 dev：`git checkout dev`（如上一步已创建则已在 dev）
### out_of_scope:
- 不修改 CI/CD 工作流（REQ-038 中关于 dev 分支 CI 检查的后续配置不在本轮范围）
- 不修改 README 或其他文档中的分支策略说明
- 不进行 merge 或 rebase 操作
- 不删除 main 分支或任何其他分支
### input_documents:
- `docs/2026-05-11/requirements/REQ-round3.md` (REQ-038)
- `docs/2026-05-11/tasks/REQ-round3-tasks.md` (TASK-009)
### allowed_paths:
- Git 分支操作（无文件变更）
### forbidden_paths:
- 所有项目文件（不进行任何文件修改）
### dependencies: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008（Batch 1 全部完成）
### required_skills: behavioral-guidelines, code-standards, git-workflow-and-versioning, finishing-a-development-branch
### parallel_group: 无（串行在最后）
### wait_for: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
### acceptance_criteria:
1. `dev` 分支已从 main 创建
2. `dev` 分支已推送到 GitHub（origin）和 Gitee（gitee）远程
3. 本地当前分支为 `dev`
4. `git branch -a` 确认 `dev` 分支存在于本地和远程
5. 后续开发在 dev 分支，仅在用户明确指令时才合并到 main
### test_strategy: manual_only
### handoff_notes:
- 纯 Git 操作，无文件变更
- 执行前确认 Batch 1 所有任务已完成且通过验证
- 推送前确认远程名称：`origin` = GitHub, `gitee` = Gitee（参考 MEMORY.md）
- 执行后输出 `git branch -a` 验证结果
### escalation_rule: 如需 merge、rebase、或删除分支，必须先回编排者确认。

---

## 14. 统一验证大门（Batch 1 完成后）

Batch 1 全部 8 个任务完成后，编排者执行以下统一验证步骤（在 TASK-009 之前）：

```bash
# 1. 类型检查
npm run typecheck

# 2. Web 构建
npm run build:web

# 3. 视觉验证（手动）
npm run dev:web  # 访问 http://localhost:3457 检查所有页面
# 确认：蓝白风格统一，无硬编码颜色残留

# 4. README 版本号
grep "version-v" README.md  # 应显示 v3.35.0

# 5. Git 状态
git status  # 应仅有预期的文件变更，无临时文件
```

## 15. plan patch / contract change request 触发条件

以下情况必须触发 plan patch（回编排者重评）：

1. **TASK-003 / TASK-004 / TASK-005 发现需要修改 `theme.tsx`**：若替换颜色的过程中发现当前 ConfigProvider token 不足以满足语义色需求，或需要新增 token 定义，必须回编排者
2. **TASK-007 分支过滤方案与 release workflow 现有结构冲突**：若 `if` 条件或 `git branch --contains` 校验导致 `jobs.release.if` 语法复杂到需要拆分 job，必须回编排者
3. **TASK-008 发现临时文件产出源未被代码清理**：若删除临时文件后发现某些引擎代码仍在根目录产出这些文件，必须回编排者评估是否需要修改引擎源码
4. **`npm run typecheck` 在 Batch 1 后失败**：若多个代理的并行修改导致类型冲突，回编排者协调修复顺序
5. **文件删除或修改与任务文档描述的允许范围不符**：任何代理发现需要改动超出 Execution Packet 中 `allowed_paths` 的文件，必须回编排者

## 16. 推荐的下一步

1. **编排者** 将 8 个 Batch 1 Execution Packet 分发给对应 Agent（`frontend-dev-expert` × 5 + `remediation-expert` × 3）
2. **编排者** 收集所有 Agent 的完成确认，执行统一验证大门
3. 验证通过后，由 **编排者** 或 **remediation-expert** 执行 TASK-009
4. 按发布流程推送变更到远程
