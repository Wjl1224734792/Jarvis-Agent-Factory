# Web 面板性能优化与智能体分类任务分解

**日期**: 2026-05-10
**需求文档**: `docs/requirements/2026-05-10-web-perf-and-filters.md`
**状态**: 任务分解完成

---

## 1. 需求文档路径

- `docs/requirements/2026-05-10-web-perf-and-filters.md`

## 2. 任务概览

| TASK | 映射 REQ | 名称 | 类型 | 优先级 | 变更行数 | 涉及文件 |
|------|---------|------|------|--------|---------|---------|
| TASK-020 | REQ-020, REQ-021 | 流程分类筛选修复与移动端新增 | TDD | P0 | ~30 行 | Agents.tsx |
| TASK-018 | REQ-018 | react-markdown 懒加载 | 直接开发 | P1 | ~20 行 | Dashboard.tsx |
| TASK-019 | REQ-019 | useMemo / React.memo 性能优化 | 直接开发 | P2 | ~55 行 | Dashboard.tsx, Agents.tsx, Layout.tsx |

**总变更行数**: ~105 行（XS-M 范围，单轮次可完成）

---

## 3. 任务分解列表

### TASK-020: 流程分类筛选修复与移动端新增

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-020 |
| **映射 REQ** | REQ-020, REQ-021 |
| **类型** | TDD（REQ-021 为可复现 Bug，需先编写测试验证修复；REQ-020 为新增分类规则，核心业务逻辑变更） |
| **优先级** | P0（REQ-021 为 Bug 驱动优先级） |
| **预期变更行数** | ~30 行（S） |
| **涉及文件** | `web/src/pages/Agents.tsx` |
| **依赖** | 无 |
| **被依赖** | TASK-019（共享 Agents.tsx，需 TASK-020 先行完成） |

#### 变更详情

**文件**: `web/src/pages/Agents.tsx`

1. **修改 `'全流程'` case（第 35-45 行）**: 从中移除移动端智能体匹配逻辑（`android-*`, `ios-*`, `flutter-*`, `expo`, `taro-*`, `react-native-*`），移动端独立分类后不再属于全流程。

2. **修改 `'轻量'` case（第 50-51 行）**: 从仅匹配 `jarvis-lite` 扩展为匹配：
   - `jarvis-lite`（轻量编排入口）
   - `remediation-expert`（通用修复执行者）
   - `remediation-planner`（修复规划者）
   - `fix-retest`（修复重测协调者）

3. **新增 `'移动端'` case**: 在 `'轻量'` 和 `'架构'` case 之间插入，匹配 6 类移动端智能体：
   ```ts
   case '移动端':
     return (
       idStartsWith('android-') || idStartsWith('ios-') ||
       idStartsWith('flutter-') || idIncludes('expo') ||
       idStartsWith('taro-') || idStartsWith('react-native-')
     );
   ```

4. **新增筛选按钮（第 279 行）**: 在流程筛选按钮数组中，`'后端'` 之后插入 `'移动端'`，按钮总数从 8 变为 9。

#### TDD 要求

- **Red**: 先编写测试用例验证当前 Bug 行为（`'轻量'` 筛选无结果；移动端智能体被归入 `'全流程'`）
- **Green**: 实现上述修改使测试通过
- **Refactor**: 检查 `matchPipelineType` 各 case 是否有冗余匹配

#### 完成标准

1. `matchPipelineType()` 新增 `'移动端'` case，正确匹配 6 类移动端智能体
2. `'全流程'` case 排除移动端智能体，仅匹配 frontend-/backend-/通用 agent
3. `'轻量'` case 匹配 `jarvis-lite` + `remediation-expert` + `remediation-planner` + `fix-retest`
4. 流程筛选按钮行新增"移动端"按钮（`'后端'` 之后，`'轻量'` 之前）
5. 点击"轻量"按钮能筛选出至少 1 个智能体（Bug 修复验证）
6. 点击"移动端"按钮能正确筛选出移动端智能体
7. 各 case 不重复匹配已在其他分类中出现的 agent
8. 单元测试覆盖 `'轻量'` 和 `'移动端'` 两个 case 的匹配逻辑

---

### TASK-018: react-markdown 懒加载

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-018 |
| **映射 REQ** | REQ-018 |
| **类型** | 直接开发（性能优化，无复杂业务逻辑变更） |
| **优先级** | P1 |
| **预期变更行数** | ~20 行（XS） |
| **涉及文件** | `web/src/pages/Dashboard.tsx` |
| **依赖** | 无 |
| **被依赖** | TASK-019（共享 Dashboard.tsx，但变更区域不同） |

#### 变更详情

**文件**: `web/src/pages/Dashboard.tsx`

1. **移除静态导入（第 11-12 行）**: 删除以下两行：
   ```ts
   import ReactMarkdown from 'react-markdown';
   import remarkGfm from 'remark-gfm';
   ```

2. **新增懒加载组件**: 在 `Dashboard` 组件外部定义懒加载的 Markdown 渲染组件，同时处理 `react-markdown` 和 `remark-gfm` 的动态导入。建议模式 —— 创建一个封装组件：

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

   注：使用命名组件而非内联 `React.lazy`，便于 Suspense 正确捕获加载状态。

3. **包裹 Suspense（第 352-355 行）**: 将 Drawer 内的 `<ReactMarkdown>` 替换为：
   ```tsx
   <React.Suspense fallback={<Spin />}>
     <LazyMarkdown content={docDrawer.content} />
   </React.Suspense>
   ```

> 注意：`Spin` 已在第 4 行从 antd 导入，无需新增导入。`React.lazy` 和 `React.Suspense` 均为 React 19 内置 API，无需修改 React 导入行。

#### 完成标准

1. `react-markdown` 和 `remark-gfm` 的静态导入已移除
2. 使用 `React.lazy()` 动态导入 `react-markdown` 和 `remark-gfm`
3. 懒加载组件使用 `<React.Suspense fallback={<Spin />}>` 包裹
4. 文档抽屉（Drawer）打开时 markdown 渲染正常，无控制台错误
5. `npm run build` 或 `npm run typecheck` 通过
6. Dashboard chunk 体积减小（可通过构建产物对比验证）

---

### TASK-019: useMemo / React.memo 性能优化

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-019 |
| **映射 REQ** | REQ-019 |
| **类型** | 直接开发（性能优化，使用 React 内置 Hook 包裹已有逻辑） |
| **优先级** | P2 |
| **预期变更行数** | ~55 行（S，跨 3 个文件） |
| **涉及文件** | `web/src/pages/Dashboard.tsx`, `web/src/pages/Agents.tsx`, `web/src/components/Layout.tsx` |
| **依赖** | TASK-020（Agents.tsx 需先行完成，避免合并冲突） |
| **被依赖** | 无 |

#### 变更详情

##### 文件 A: `web/src/pages/Dashboard.tsx`

1. **修改 React 导入（第 1 行）**: 在解构中添加 `useMemo`：
   ```ts
   import React, { useState, useEffect, useCallback, useMemo } from 'react';
   ```

2. **包裹派生计算（第 157-165 行）**: 将以下变量包裹在 `useMemo` 中：
   ```tsx
   const { gates, completedGates, totalGates, progressPct, currentGateInfo,
           totalArtifacts, totalDuration, durationDisplay } = useMemo(() => {
     const gates = pipeline.gates || [];
     const completedGates = gates.filter(g => g.passed).length;
     const totalGates = gates.length;
     const progressPct = totalGates > 0 ? Math.round((completedGates / totalGates) * 100) : 0;
     const currentGateInfo = gates.find(g => g.gate === currentGate);
     const totalArtifacts = gates.reduce((sum, g) => sum + (g.artifacts?.length || 0), 0);
     const totalDuration = gates.reduce((sum, g) => sum + (g.duration_seconds || 0), 0);
     const durationDisplay = totalDuration > 0 ? formatDurationDisplay(totalDuration) : '-';
     return { gates, completedGates, totalGates, progressPct, currentGateInfo,
              totalArtifacts, totalDuration, durationDisplay };
   }, [pipeline?.gates, currentGate]);
   ```

   注意：`currentGate` 在第 161 行引用自 `pipeline.current_gate`，需要先在 useMemo 外部解构或将其纳入依赖。

   > 需要调整：`currentGate` 从 `pipeline.current_gate` 提取，也应在 `useMemo` 外部或内部计算以保持依赖正确。推荐将 `currentGate` 也收入 `useMemo` 内部计算。

##### 文件 B: `web/src/pages/Agents.tsx`

1. **修改 React 导入（第 1 行）**: 在解构中添加 `useMemo`。

2. **包裹过滤逻辑（第 191-196 行）**: 将 `filteredByPipeline` 和 `agents` 包裹在 `useMemo` 中：
   ```tsx
   const filteredByPipeline = useMemo(
     () => pipelineType === 'all'
       ? allAgents
       : allAgents.filter(a => matchPipelineType(a.id, pipelineType)),
     [pipelineType, allAgents]
   );

   const agents = useMemo(
     () => functionRole === 'all'
       ? filteredByPipeline
       : filteredByPipeline.filter(a => matchFunctionRole(a.id, functionRole)),
     [functionRole, filteredByPipeline]
   );
   ```

##### 文件 C: `web/src/components/Layout.tsx`

1. **修改 React 导入（第 1 行）**: 在解构中添加 `useMemo`（`useCallback` 已存在）。

2. **包裹派生计算（第 231-243 行）**: 将 `filteredSessions`、`sortedSessions`、`activeCount` 包裹在 `useMemo` 中：
   ```tsx
   const { filteredSessions, sortedSessions, activeCount } = useMemo(() => {
     const filtered = sessionPlatform === 'all'
       ? sessions
       : sessions.filter(s => s.platform === sessionPlatform);
     const sorted = filtered.toSorted((a, b) => {
       if (a.pinned && !b.pinned) return -1;
       if (!a.pinned && b.pinned) return 1;
       const aHb = a.heartbeat || 0;
       const bHb = b.heartbeat || 0;
       return bHb - aHb;
     });
     const active = sessions.filter(s => s.status === 'active').length;
     return { filteredSessions: filtered, sortedSessions: sorted, activeCount: active };
   }, [sessions, sessionPlatform]);
   ```

3. **React.memo 包裹 SessionItem（第 57 行）**: 将 `function SessionItem` 改为：
   ```tsx
   const SessionItem = React.memo(function SessionItem({ s, active, onSelect, onResume, onPin, onArchive, onDelete }: SessionItemProps) {
     // ... 现有实现不变
   });
   ```

4. **useCallback 包装 onSelect（第 365 行）**: 将内联箭头函数提取为 `useCallback`：
   ```tsx
   const handleSessionSelect = useCallback((id: string) => {
     setSelectedSession(id);
     navigate('/');
   }, [navigate]);
   ```
   然后将第 365 行的 `onSelect={(id) => { setSelectedSession(id); navigate('/'); }}` 替换为 `onSelect={handleSessionSelect}`。

#### 完成标准

1. **Dashboard.tsx**: `gates`/`completedGates`/`progressPct`/`totalArtifacts`/`totalDuration` 包裹在 `useMemo` 中，依赖数组包含 `[pipeline?.gates, currentGate]`
2. **Agents.tsx**: `filteredByPipeline`/`agents` 包裹在 `useMemo` 中，依赖数组分别为 `[pipelineType, allAgents]` 和 `[functionRole, filteredByPipeline]`
3. **Layout.tsx**: `filteredSessions`/`sortedSessions`/`activeCount` 包裹在一个 `useMemo` 中，依赖 `[sessions, sessionPlatform]`
4. **Layout.tsx**: `SessionItem` 用 `React.memo` 包裹
5. **Layout.tsx**: `onSelect` 回调用 `useCallback` 包装
6. 所有依赖数组正确，无 ESLint `exhaustive-deps` 警告
7. `npm run typecheck` 通过，`npm run build` 通过
8. 功能无回归：Dashboard 统计卡片正常显示、Agents 筛选正常、Layout 会话列表正常

---

## 4. DDD 分类

本次无 DDD 任务。

所有任务均为前端展示层的性能优化与分类规则修正，不涉及跨聚合交互、状态机、权限/配额/计费等复杂业务规则。`matchPipelineType` 函数虽然包含分类逻辑，但本质是纯函数映射（ID 模式匹配），不涉及领域模型或聚合根。

---

## 5. TDD 与直接开发分类

### TDD

| TASK | 原因 |
|------|------|
| TASK-020 | `matchPipelineType` 是核心业务分类规则，REQ-021 为可复现 Bug（`'轻量'` 筛选无结果），必须先编写测试验证当前 Bug 行为再修复。REQ-020 新增 `'移动端'` case 为分类规则扩展，同样需要通过测试保证匹配正确性。 |

### 直接开发

| TASK | 原因 |
|------|------|
| TASK-018 | react-markdown 懒加载为纯技术重构（静态导入转动态导入 + Suspense 包裹），不改变任何业务行为。 |
| TASK-019 | useMemo/React.memo/useCallback 为性能优化，仅包裹已有计算逻辑和组件，不改变业务逻辑。依赖数组的正确性需人工审查和 lint 验证，非 TDD 适用场景。 |

---

## 6. 风险任务

无风险任务。三个任务变更行数均在 XS-S 范围内（总计 ~105 行），不涉及共享契约、数据迁移、第三方集成或安全敏感逻辑。

| TASK | 变更行数 | 风险等级 | 说明 |
|------|---------|---------|------|
| TASK-020 | ~30 行 | 低 | 单一文件，函数局部修改 |
| TASK-018 | ~20 行 | 低 | 单一文件，导入+JSX 局部修改 |
| TASK-019 | ~55 行 | 低 | 跨 3 文件但均为 useMemo 包裹已有逻辑，可逆性好 |

---

## 7. 文件所有权和共享路径提醒

### 文件所有权矩阵

| 文件 | 主要修改者 | 其他修改者 | 冲突区域 |
|------|-----------|-----------|---------|
| `web/src/pages/Dashboard.tsx` | TASK-018, TASK-019 | -- | TASK-018（L11-12 移除导入 + L352-355 Suspense）与 TASK-019（L1 添加 useMemo + L157-165 useMemo 包裹）位于不同区域，无重叠。 |
| `web/src/pages/Agents.tsx` | TASK-020, TASK-019 | -- | TASK-020（L35-51 matchPipelineType + L279 按钮行）与 TASK-019（L1 添加 useMemo + L191-196 useMemo 包裹）位于不同区域。TASK-020 先执行以避免 TASK-019 的 useMemo 依赖 TASK-020 修改后的过滤逻辑。 |
| `web/src/components/Layout.tsx` | TASK-019 | -- | 唯一修改者，无冲突。 |

### 共享路径提醒

1. **Agents.tsx 是共享区域**：TASK-020 和 TASK-019 都修改此文件。虽然变更区域不同（TASK-020 修改 `matchPipelineType` 函数和按钮行；TASK-019 修改 import 行和 `filteredByPipeline`/`agents` 变量），但需按顺序执行 —— **TASK-020 先于 TASK-019**，以确保 TASK-019 的 useMemo 包裹的过滤逻辑基于 TASK-020 修正后的分类规则。

2. **Dashboard.tsx 为轻共享**：TASK-018 和 TASK-019 都修改此文件，但变更区域独立。TASK-018 使用 `React.lazy`（无需修改 import 行），TASK-019 修改 import 行添加 `useMemo`。可并行但建议顺序执行以避免 git 合并冲突。

---

## 8. 推荐交付顺序

```
第 1 步: TASK-020 (P0, TDD)
  └─ 先修复 Bug + 新增移动端分类，确保分类规则正确
  └─ 编写测试 → 修复代码 → 测试通过

第 2 步: TASK-018 (P1, 直接开发)  ←→  TASK-019 (P2, 直接开发)
  └─ 可并行（不同开发者）或顺序（同一开发者）
  └─ 若并行：TASK-019 需等待 TASK-020 完成后再修改 Agents.tsx
  └─ 推荐顺序：TASK-018 → TASK-019（同一开发者，避免 git 合并冲突）

并行可行性分析:
  - TASK-018 与 TASK-019 逻辑独立（分别修改 Dashboard.tsx 的不同区域）
  - 不同开发者并行时，TASK-019 需 rebase 到 TASK-018 之后（Dashboard.tsx 共享）
  - 推荐由同一开发者按序完成：TASK-020 → TASK-018 → TASK-019
```

### 时序图

```
时间 ────────────────────────────────────────────────►

TASK-020 (Agents.tsx)   ████████████
                         │
                         ▼ (Agents.tsx 就绪)
TASK-018 (Dashboard.tsx)            ████████
                                     │
                                     ▼ (Dashboard.tsx 就绪)
TASK-019 (3 文件)                              ████████████████
```

---

## 9. 推荐的下一步

1. **planner** 读取本文档，选择当前轮次执行任务
2. 推荐首轮执行：**TASK-020**（最高优先级，P0 Bug 修复）
3. 次轮执行：**TASK-018** 和 **TASK-019**（按序或并行）
4. 所有任务完成后执行验证：`npm run typecheck && npm run build`
