# Web 面板性能优化与智能体分类完善 — 执行计划

**日期**: 2026-05-10
**需求文档**: `docs/requirements/2026-05-10-web-perf-and-filters.md`
**任务文档**: `docs/tasks/2026-05-10-web-perf-and-filters-tasks.md`

---

## 1. 当前轮次目标

单轮次完成全部 3 个任务（总计 ~105 行），交付可验证的端到端功能：
- **TASK-020**: 修复 "轻量" 筛选 Bug + 新增 "移动端" 流程分类（TDD）
- **TASK-018**: react-markdown 懒加载优化（直接开发）
- **TASK-019**: useMemo / React.memo 性能优化（直接开发）

---

## 2. 当前轮次范围

| TASK | 映射 REQ | 涉及文件 | 类型 | 优先级 |
|------|---------|---------|------|--------|
| TASK-020 | REQ-020, REQ-021 | `web/src/pages/Agents.tsx` | TDD | P0 |
| TASK-018 | REQ-018 | `web/src/pages/Dashboard.tsx` | 直接开发 | P1 |
| TASK-019 | REQ-019 | `web/src/pages/Dashboard.tsx`, `web/src/pages/Agents.tsx`, `web/src/components/Layout.tsx` | 直接开发 | P2 |

---

## 3. 完成标准

1. "轻量" 筛选按钮可筛选出至少 1 个智能体（REQ-021 Bug 修复）
2. "移动端" 筛选按钮出现并正确筛选 6 类移动端智能体（REQ-020）
3. "全流程" 筛选排除移动端智能体（REQ-020 副作用）
4. Dashboard 中 react-markdown 改为动态导入，文档抽屉渲染正常（REQ-018）
5. 3 个文件的派生计算 + SessionItem 均包裹在 useMemo/React.memo/useCallback 中（REQ-019）
6. 所有依赖数组正确，无 ESLint exhaustive-deps 警告
7. 构建验证：`cd web && npm run typecheck && npm run build` 通过
8. 功能无回归：各页面正常显示、筛选正常、会话列表正常

---

## 4. 先决条件

本次无需预先查阅 code-explore-expert 或 docs-research-expert。源码已由 planner 在规划阶段读取，代码结构清晰，均为单文件局部修改。

**唯一前置风险**: 项目当前无测试框架（无 vitest/jest）。TASK-020 为 TDD 任务，需先解决测试基础设施。

---

## 5. 共享区域改动归属

| 文件 | 唯一责任方 | 其他修改者 | 执行顺序约束 |
|------|-----------|-----------|-------------|
| `web/src/pages/Agents.tsx` | TASK-020（分类规则权威来源） | TASK-019（仅 useMemo 包裹） | TASK-020 必须先于 TASK-019 完成 |
| `web/src/pages/Dashboard.tsx` | TASK-018（L11-12 + L352-355） | TASK-019（L1 + L157-165） | 不同区域无逻辑依赖，但建议顺序执行以避 git 冲突 |
| `web/src/components/Layout.tsx` | TASK-019（唯一修改者） | 无 | 无冲突 |

**共享契约**: 本次无共享契约变更。所有修改限于 React 内置 API 调用模式，不改变任何组件 props 接口或函数签名。

---

## 6. 并行 / 串行策略

```
Batch 1（并行）                        Batch 2（串行，依赖 Batch 1）
┌──────────────────────┐              ┌──────────────────────────────┐
│ TASK-020 (Agents.tsx) │              │ TASK-019 (3 文件)             │
│ TASK-018 (Dashboard)  │──────────────│  Dashboard + Agents + Layout │
└──────────────────────┘              └──────────────────────────────┘
  无共享文件冲突                         依赖 TASK-020 完成后的 Agents.tsx
                                         依赖 TASK-018 完成后的 Dashboard.tsx
```

- **并行可行性**: TASK-020 与 TASK-018 修改不同文件，无任何冲突，可安全并行。
- **串行必要性**: TASK-019 的 useMemo 包裹（Agents.tsx L191-196）需基于 TASK-020 修正后的 `matchPipelineType` 规则，且需避免与 TASK-018 在 Dashboard.tsx 上的 git 合并冲突。

---

## 7. 风险提醒

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| **无测试框架**：项目无 vitest/jest，TASK-020 为 TDD 无法直接写测试 | 高 | TASK-020 需先安装 vitest（devDependency）或使用 Node.js assert 内联测试。推荐 vitest，与 Vite 生态一致。 |
| TASK-019 的 useMemo 依赖数组正确性 | 低 | 由 ESLint `exhaustive-deps` 规则 + 人工审查保证，实现代理验证 `npm run lint` |
| React.memo 包裹 SessionItem 可能影响 dropdown/popover 行为 | 低 | SessionItem 为纯展示组件，props 均为值类型或回调引用，React.memo 安全 |
| react-markdown 动态导入可能导致首次打开文档抽屉有加载闪烁 | 低 | `<Spin />` fallback 已提供加载态，体验可接受 |

---

## 8. 实现者交接信息

1. **测试基础设施**: 所有 Agent 启动后应首先确认 vitest 已安装。若未安装，TASK-020 Agent 负责通过 `cd web && npm install -D vitest` 添加。
2. **验证命令**: 每个任务完成后执行 `cd web && npm run typecheck`。全部完成后执行 `cd web && npm run typecheck && npm run build`。
3. **Agents.tsx 变更顺序**: TASK-020 是 Agents.tsx 分类规则的权威修改者，TASK-019 在此基础上添加 useMemo 包裹。
4. **Dashboard.tsx 区域分配**:
   - TASK-018: L11-L12 删除导入、组件外部新增 LazyMarkdown、L352-356 替换 JSX
   - TASK-019: L1 添加 useMemo 导入、L157-165 包裹 useMemo 计算

---

## 9. parallel_batches

### Batch 1（无依赖，可同时启动）

- **TASK-020** → subagent_type: `frontend-dev-expert`
- **TASK-018** → subagent_type: `frontend-dev-expert`

> 两个任务修改不同文件（Agents.tsx vs Dashboard.tsx），零文件冲突，可安全并行。

### Batch 2（依赖 Batch 1 全部完成）

- **TASK-019** → subagent_type: `frontend-dev-expert`

> TASK-019 需等待 TASK-020（Agents.tsx 分类规则就绪）和 TASK-018（Dashboard.tsx L1/L11-12 稳定）完成后执行。

---

## 10. Execution Packets

---

### task_id: TASK-020
### task_name: 流程分类筛选修复与移动端新增
### requirement_ids: REQ-020, REQ-021
### owner: frontend-dev-expert
### objective: 修复 `matchPipelineType()` 的轻量筛选 Bug 并新增移动端分类规则
### in_scope:
- 修改 `matchPipelineType()` 中 `'全流程'` case：从中移除 6 类移动端智能体匹配
- 修改 `'轻量'` case：扩展为匹配 `jarvis-lite` + `remediation-expert` + `remediation-planner` + `fix-retest`
- 新增 `'移动端'` case：匹配 `android-*` / `ios-*` / `flutter-*` / `expo` / `taro-*` / `react-native-*`
- 流程筛选按钮行（第 279 行）在 `'后端'` 之后插入 `'移动端'` 按钮
- TDD 流程：Red（测试验证 Bug）→ Green（实现修复）→ Refactor（检查冗余匹配）
### out_of_scope:
- 不修改 `matchFunctionRole()` 函数
- 不修改其他 case（前端/后端/架构/测试/审查）
- 不修改 Agents.tsx 的 JSX 渲染逻辑（除按钮行增加一项）
- 不修改 Dashboard.tsx 或 Layout.tsx
### input_documents:
- `docs/requirements/2026-05-10-web-perf-and-filters.md`
- `docs/tasks/2026-05-10-web-perf-and-filters-tasks.md`
### allowed_paths:
- `web/src/pages/Agents.tsx`
- `web/src/pages/Agents.test.ts`（新建，TDD 测试文件）
- `web/package.json`（若需安装 vitest devDependency）
- `web/vitest.config.ts`（若需创建 vitest 配置）
### forbidden_paths:
- `web/src/pages/Dashboard.tsx`
- `web/src/components/Layout.tsx`
- `web/src/api/`（不修改 API 接口）
- 根目录 `package.json`
- 后端/模板/引擎目录
### dependencies:
- 无外部契约依赖。`matchPipelineType` 为纯函数，仅依赖 `id: string` 参数。
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-018]
### wait_for: []
### acceptance_criteria:
1. `'轻量'` case 匹配 `jarvis-lite`、`remediation-expert`、`remediation-planner`、`fix-retest` 四个智能体 ID
2. 点击 "轻量" 按钮可筛选出至少 1 个智能体
3. `'移动端'` case 正确匹配 `android-*`、`ios-*`、`flutter-*`、`expo`、`taro-*`、`react-native-*` 六类 ID 前缀
4. `'全流程'` case 不再匹配移动端智能体（仅匹配 frontend-/backend-/通用 agent）
5. 流程筛选按钮从 8 个变为 9 个，"移动端" 按钮位于 "后端" 和 "轻量" 之间
6. 各 case 不重复匹配已在其他分类出现的 agent
7. 单元测试覆盖 `'轻量'` 和 `'移动端'` 两个 case 的匹配逻辑，全部通过
8. `cd web && npm run typecheck && npm run build` 通过
### test_strategy: tdd
### handoff_notes:
- 此为 P0 Bug 修复 + P1 功能新增的组合任务，修复结果直接影响 TASK-019 的 useMemo 包裹逻辑
- 测试文件 `Agents.test.ts` 新增，qa-review-expert 需审查测试用例覆盖是否完整
- 若 vitest 安装涉及版本兼容性问题，记录到 execution_acknowledgement
### escalation_rule:
- 如需修改 `matchPipelineType` 的 TypeScript 类型签名或导出方式：先回编排者，不直接修改
- 如需修改 Agents.tsx 的 import 行（React hooks 解构）：先回编排者，这可能与 TASK-019 冲突

---

### task_id: TASK-018
### task_name: react-markdown 懒加载
### requirement_ids: REQ-018
### owner: frontend-dev-expert
### objective: 将 react-markdown 静态导入改为 React.lazy 动态导入，减少 Dashboard chunk 体积
### in_scope:
- 移除 `Dashboard.tsx` 第 11-12 行的静态导入：`react-markdown` 和 `remark-gfm`
- 在 `Dashboard` 组件外部创建 `LazyMarkdown` 懒加载组件：
  ```tsx
  const LazyMarkdown = React.lazy(async () => {
    const [md, gfm] = await Promise.all([
      import('react-markdown'),
      import('remark-gfm'),
    ]);
    return {
      default: ({ content }: { content: string }) => (
        <md.default remarkPlugins={[gfm.default]}>
          {content}
        </md.default>
      ),
    };
  });
  ```
- 将 Drawer 内第 352-355 行的 `<ReactMarkdown>` 替换为 `<React.Suspense fallback={<Spin />}>`
- 保持 `Spin` 导入不变（第 5 行已有 `Spin`），保持 `React.lazy`/`React.Suspense` 使用 React 19 内置 API
### out_of_scope:
- 不修改 Dashboard.tsx 的 React 导入行（L1）
- 不修改 `formatDurationDisplay`、`shortGate` 等辅助函数
- 不修改 Drawer 的 open/close 逻辑
- 不修改 remark-gfm 的使用方式（但它在 lazy 组件内部处理）
### input_documents:
- `docs/requirements/2026-05-10-web-perf-and-filters.md`
- `docs/tasks/2026-05-10-web-perf-and-filters-tasks.md`
### allowed_paths:
- `web/src/pages/Dashboard.tsx`
### forbidden_paths:
- `web/src/pages/Agents.tsx`
- `web/src/components/Layout.tsx`
- `web/src/api/`
- 根目录 `package.json`
### dependencies:
- `react-markdown` 和 `remark-gfm` 已在 `web/package.json` 的 dependencies 中（无需新增依赖）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-020]
### wait_for: []
### acceptance_criteria:
1. `import ReactMarkdown from 'react-markdown'` 已移除
2. `import remarkGfm from 'remark-gfm'` 已移除
3. `LazyMarkdown` 组件使用 `React.lazy(() => ...)` 动态导入两个库
4. `LazyMarkdown` 被 `<React.Suspense fallback={<Spin />}>` 包裹
5. 文档抽屉打开时 markdown 渲染正常，无控制台错误
6. `Spin` 来自已有 antd 导入，无新增导入
7. `cd web && npm run typecheck && npm run build` 通过
### test_strategy: test_after
### handoff_notes:
- 此为性能优化，无业务逻辑变更。验证重点：构建产物大小 + 文档抽屉功能正常
- qa-review-expert 可通过 `npm run build` 产物对比确认 Dashboard chunk 减小
- 注意：动态导入可能增加首次打开文档抽屉的延迟（spin 提示），这是预期行为
### escalation_rule:
- 如需修改 `import React, { ... } from 'react'` 行（当前 L1）：先回编排者，此区域与 TASK-019 共享
- 如需新增 npm 依赖：先回编排者

---

### task_id: TASK-019
### task_name: useMemo / React.memo 性能优化
### requirement_ids: REQ-019
### owner: frontend-dev-expert
### objective: 为 Dashboard.tsx、Agents.tsx、Layout.tsx 中的派生计算和子组件添加 React 性能优化钩子
### in_scope:
- **Dashboard.tsx L1**: 在 React 解构中添加 `useMemo`
- **Dashboard.tsx L157-165**: 将 `gates`/`completedGates`/`progressPct`/`totalArtifacts`/`totalDuration` 包裹在 `useMemo` 中，依赖 `[pipeline?.gates]`（`currentGate` 和 `totalGates` 从 gates 派生，一并移入内部）
- **Agents.tsx L1**: 在 React 解构中添加 `useMemo`
- **Agents.tsx L191-196**: 将 `filteredByPipeline` 包裹在 `useMemo` 中，依赖 `[pipelineType, allAgents]`；将 `agents` 包裹在 `useMemo` 中，依赖 `[functionRole, filteredByPipeline]`
- **Layout.tsx L1**: 在 React 解构中添加 `useMemo`（`useCallback` 已存在）
- **Layout.tsx L231-243**: 将 `filteredSessions`/`sortedSessions`/`activeCount` 包裹在一个 `useMemo` 中，依赖 `[sessions, sessionPlatform]`
- **Layout.tsx L57**: 将 `SessionItem` 函数组件用 `React.memo` 包裹
- **Layout.tsx L361**: 将 `onSelect` 内联箭头函数提取为 `handleSessionSelect`，用 `useCallback` 包装
### out_of_scope:
- 不修改任何组件的业务逻辑（仅包裹已有逻辑）
- 不修改 props 接口
- 不添加新组件或新文件
- 不修改 CSS 内联样式
### input_documents:
- `docs/requirements/2026-05-10-web-perf-and-filters.md`
- `docs/tasks/2026-05-10-web-perf-and-filters-tasks.md`
### allowed_paths:
- `web/src/pages/Dashboard.tsx`
- `web/src/pages/Agents.tsx`
- `web/src/components/Layout.tsx`
### forbidden_paths:
- `web/src/api/`（不修改 API 接口）
- 根目录 `package.json`
- 后端/模板/引擎目录
### dependencies:
- 依赖 TASK-020 完成后的 Agents.tsx（`filteredByPipeline`/`agents` 的 useMemo 需基于修正后的 `matchPipelineType` 分类规则）
- 依赖 TASK-018 完成后的 Dashboard.tsx（以避免 React import 行的 git 冲突；实际上 L1 仅添加 `useMemo`，TASK-018 不修改 L1）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: []
### wait_for: [TASK-020, TASK-018]
### acceptance_criteria:
1. Dashboard.tsx: 所有 5 个派生变量包裹在单个 `useMemo` 中，依赖 `[pipeline?.gates]`
2. Agents.tsx: `filteredByPipeline` 和 `agents` 分别用 `useMemo` 包裹
3. Layout.tsx: `filteredSessions`/`sortedSessions`/`activeCount` 包裹在单个 `useMemo` 中
4. Layout.tsx: `SessionItem` 用 `React.memo` 包裹
5. Layout.tsx: `onSelect` 回调用 `useCallback` 包装
6. 所有依赖数组正确，无 ESLint `exhaustive-deps` 警告
7. `cd web && npm run typecheck && npm run build` 通过
8. 功能无回归：Dashboard 统计卡片正常、Agents 筛选正常、Layout 会话列表正常
### test_strategy: test_after
### handoff_notes:
- 此为性能优化，包裹已有逻辑不改变业务行为。验证重点：typecheck 通过 + 无回归
- TASK-019 横跨 3 个文件，是唯一跨文件任务，qa-review-expert 需确认每个文件的 useMemo 依赖数组正确性
- `currentGate` 从 `pipeline.current_gate` 提取，需移入 useMemo 内部计算或确保其依赖正确
- `formatDurationDisplay` 函数（L388+）在组件外部定义，useMemo 内调用安全
### escalation_rule:
- 如需修改 Agent 组件的 props 接口或导出方式：先回编排者
- 如 ESLint exhaustive-deps 要求添加超出预期的依赖导致性能退化：先回编排者

---

## 11. plan patch / contract change request 触发条件

1. 若 TASK-020 的分类规则修改后发现与其他现有 agent ID 冲突（如 `android-` 也匹配某个非移动端 agent），需回编排者重新评估分类范围
2. 若 TASK-019 的 useMemo 包裹后发现依赖数组难以正确设置（如 `currentGate` 来源复杂），需提交 plan patch 调整依赖策略
3. 若 `npm run typecheck` 或 `npm run lint` 报出无法在任务范围内修复的错误，需回编排者
4. 若 react-markdown 动态导入导致类型推断失败（`React.lazy` 返回类型不匹配），需回编排者

---

## 12. 推荐的下一步

1. 编排者 spawn **frontend-dev-expert** 执行 Batch 1（TASK-020 + TASK-018 同时启动）
2. Batch 1 完成后 spawn **frontend-dev-expert** 执行 Batch 2（TASK-019）
3. 全部完成后执行 `cd web && npm run typecheck && npm run build` 最终验证
4. 若 TASK-020 涉及安装 vitest，需在 AGENTS.md 和 package.json 中同步更新
