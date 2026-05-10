# Web 面板性能优化与智能体分类完善

**日期**: 2026-05-10
**状态**: confirmed
**来源**: 上一轮审查 findings（P2 性能优化）+ 用户反馈

---

## 背景

上一轮 v3.32.4 发布后，审查阶段发现了三类剩余改进：
1. Dashboard 页面 react-markdown 静态导入导致 ~235KB chunk，可懒加载节省 80-120KB
2. 多个组件缺少 useMemo/React.memo 优化（P2 findings）
3. 智能体分类的"流程"筛选缺少"移动端"，且"轻量"筛选无匹配结果

---

## REQ-018：react-markdown 懒加载

**优先级**: P1
**类型**: 性能优化

### 描述

`Dashboard.tsx` 第 11-12 行静态导入了 `react-markdown` 和 `remark-gfm`：

```ts
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
```

这两个库合计约 80-120KB，且仅在用户点击文档时才会用到（文档抽屉）。将其转为 `React.lazy()` 动态导入可有效减少 Dashboard chunk 体积。

### 验收标准

1. `ReactMarkdown` 改为 `React.lazy(() => import('react-markdown'))` 动态导入
2. 使用 `<Suspense fallback={<Spin />}>` 包裹懒加载组件
3. 文档抽屉打开时 markdown 渲染正常，无控制台错误
4. Dashboard chunk 体积明显减小（构建后验证）

### 涉及文件

- `web/src/pages/Dashboard.tsx`

---

## REQ-019：useMemo / React.memo 优化

**优先级**: P2
**类型**: 性能优化

### 描述

以下组件中存在可优化的派生计算和子组件渲染：

| 文件 | 位置 | 问题 |
|------|------|------|
| `Dashboard.tsx` | L157-165 | `gates`, `completedGates`, `progressPct`, `totalArtifacts`, `totalDuration` 每次渲染都重新计算 |
| `Agents.tsx` | L191-196 | `filteredByPipeline`, `agents` 每次渲染都重新过滤 |
| `Layout.tsx` | L231-243 | `filteredSessions`, `sortedSessions`, `activeCount` 每次渲染都重新计算 |
| `Layout.tsx` | L57-146 | `SessionItem` 未用 React.memo，列表重渲染时所有 item 重渲染 |
| `Layout.tsx` | L361 | `onSelect` 内联箭头函数每次渲染创建新引用 |

### 验收标准

1. Dashboard.tsx: `gates`/`completedGates`/`progressPct`/`totalArtifacts`/`totalDuration` 包裹在 `useMemo` 中
2. Agents.tsx: `filteredByPipeline`/`agents` 包裹在 `useMemo` 中，依赖 `[pipelineType, functionRole, allAgents]`
3. Layout.tsx: `filteredSessions`/`sortedSessions`/`activeCount` 包裹在 `useMemo` 中
4. Layout.tsx: `SessionItem` 用 `React.memo` 包裹
5. Layout.tsx: `onSelect` 回调用 `useCallback` 包装
6. 所有依赖数组正确，无 ESLint exhaustive-deps 警告
7. 构建通过，功能无回归

### 涉及文件

- `web/src/pages/Dashboard.tsx`
- `web/src/pages/Agents.tsx`
- `web/src/components/Layout.tsx`

---

## REQ-020：移动端流程分类

**优先级**: P1
**类型**: 功能完善

### 描述

当前 `Agents.tsx` 的流程分类筛选按钮只有：全部、全流程、前端、后端、轻量、架构、测试、审查。缺少**移动端**分类。

移动端智能体包括 6 类：
- `android-*`（Android 原生）
- `ios-*`（iOS 原生）
- `flutter-*`（Flutter 跨端）
- `expo-*`（React Native Expo）
- `taro-*`（Taro 小程序）
- `react-native-*`（React Native 原生）

当前这些智能体被归入"全流程"分类中，无法单独筛选。

### 验收标准

1. `matchPipelineType()` 新增 `'移动端'` case，匹配以上 6 类移动端智能体
2. `'全流程'` case 排除移动端智能体（只匹配 frontend-/backend-/通用 agent）
3. 筛选按钮行新增"移动端"按钮
4. 点击"移动端"按钮能正确筛选出移动端智能体
5. 筛选按钮总数从 8 个变为 9 个

### 涉及文件

- `web/src/pages/Agents.tsx`

---

## REQ-021：轻量流程分类修复

**优先级**: P0（Bug）
**类型**: Bug 修复

### 描述

当前 `matchPipelineType()` 中 `'轻量'` case 仅匹配 ID 以 `jarvis-lite` 开头的智能体：

```ts
case '轻量':
  return idStartsWith('jarvis-lite');
```

但 `jarvis-lite` 是轻量编排入口，实际轻量流水线还有以下智能体：
- `remediation-expert`（通用修复执行者）
- `remediation-planner`（修复规划者）
- `fix-retest`（修复重测协调者）

这些智能体在完整流水线中也能使用，但在轻量模式下是核心工具。为"轻量"分类提供合理的匹配范围，让筛选结果有意义。

### 验收标准

1. `'轻量'` case 匹配 `jarvis-lite` + `remediation-expert` + `remediation-planner` + `fix-retest`
2. 点击"轻量"按钮能筛选出至少 1 个智能体
3. 不重复匹配已在"全流程"中出现的通用 agent

### 涉及文件

- `web/src/pages/Agents.tsx`

---

## 影响范围

| REQ | 涉及文件 | 变更类型 |
|-----|---------|---------|
| REQ-018 | `web/src/pages/Dashboard.tsx` | 懒加载重构 |
| REQ-019 | `web/src/pages/Dashboard.tsx`, `web/src/pages/Agents.tsx`, `web/src/components/Layout.tsx` | 性能优化 |
| REQ-020 | `web/src/pages/Agents.tsx` | 新增功能 |
| REQ-021 | `web/src/pages/Agents.tsx` | Bug 修复 |

所有变更仅涉及 Web 前端，无后端/引擎/模板变更。

---

## 约束

- React 19 + TypeScript 6.0 + antd v6
- 使用 `React.useMemo`, `React.memo`, `React.lazy`, `React.useCallback`（均为 React 内置 API）
- CSS-in-JS 内联样式（本项目风格）
- 不引入新依赖
