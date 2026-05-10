# TASK-020 流程分类筛选修复与移动端新增 -- 前端实现文档

**日期**: 2026-05-10
**任务 ID**: TASK-020
**需求 ID**: REQ-020, REQ-021
**状态**: 已完成

---

## 1. 实现目标

修复 `matchPipelineType()` 函数中 `'轻量'` 筛选无结果的 Bug（REQ-021），并新增 `'移动端'` 流程分类（REQ-020）。

## 2. 输入依据

- 需求文档: `docs/requirements/2026-05-10-web-perf-and-filters.md`
- 任务文档: `docs/tasks/2026-05-10-web-perf-and-filters-tasks.md`

## 3. 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `web/src/pages/Agents.tsx` | 修改 | 移除内联 `matchPipelineType` 函数，改为从独立模块导入；新增"移动端"筛选按钮 |
| `web/src/pages/matchPipelineType.ts` | 新增 | 提取 `matchPipelineType` 为独立可测试模块，包含所有修改后的分类逻辑 |
| `web/src/pages/__tests__/matchPipelineType.test.ts` | 新增 | 29 个单元测试，覆盖轻量、移动端、全流程排除移动端、分类不重复、原有分类不变 |
| `web/vitest.config.ts` | 新增 | vitest 测试框架配置 |

## 4. 实现说明

### 4.1 REQ-021: '轻量' Bug 修复

**问题**: `'轻量'` case 仅匹配 `jarvis-lite`，导致轻量流水线的 `remediation-expert`、`remediation-planner`、`fix-retest` 无法被筛选。

**修复**: 扩展 `'轻量'` case 同时匹配 4 个 ID：
```ts
case '轻量':
  return (
    idStartsWith('jarvis-lite') ||
    ['remediation-expert', 'remediation-planner', 'fix-retest']
      .some(n => idLower === n || idStartsWith(n))
  );
```

### 4.2 REQ-020: '移动端' 分类新增

**新增 `'移动端'` case**，匹配 6 类移动端智能体：
- `android-*` (Android 原生)
- `ios-*` (iOS 原生)
- `flutter-*` (Flutter 跨端)
- `expo` (React Native Expo，使用 `idIncludes` 匹配)
- `taro-*` (Taro 小程序)
- `react-native-*` (React Native 原生)

**从 `'全流程'` 中排除移动端智能体**：移除了 `android-*`、`ios-*`、`flutter-*`、`expo`、`taro-*`、`react-native-*` 的匹配条件，以及 `fix-retest`（已移入轻量分类）。

### 4.3 函数提取

将 `matchPipelineType` 从 `Agents.tsx` 内联函数提取为独立模块 `matchPipelineType.ts`，使纯分类逻辑可独立测试，不依赖 React 运行时。`Agents.tsx` 改为 import 导入。

### 4.4 筛选按钮

流程筛选按钮数组从 `['all', '全流程', '前端', '后端', '轻量', '架构', '测试', '审查']` 变为 `['all', '全流程', '前端', '后端', '移动端', '轻量', '架构', '测试', '审查']`（8 -> 9 个）。

## 5. 测试和验证结果

### 5.1 单元测试

使用 vitest 框架，共 29 个测试用例，全部通过：

```
Test Files  1 passed (1)
     Tests  29 passed (29)
```

测试覆盖：
- 轻量 case: 5 个测试（jarvis-lite 匹配、remediation-expert/planner/fix-retest 匹配、非轻量排除）
- 移动端 case: 7 个测试（6 类移动端智能体匹配 + 非移动端排除）
- 全流程排除移动端: 9 个测试（6 类移动端排除 + frontend/backend/通用仍匹配）
- 分类不重复: 2 个测试（移动端不与全流程重复、轻量不与全流程重复）
- 原有分类保持不变: 6 个测试（前端、后端、架构、测试、审查、default）

### 5.2 类型检查

`npx tsc --noEmit` 通过，零类型错误。

### 5.3 构建

`vite build` 失败，原因是预置依赖 `@vitejs/plugin-react` 缺失（npm install 后仍缺失，与本次变更无关）。已验证在变更前同样构建失败。

## 6. 边界和异常处理

- 所有匹配均使用 `toLowerCase()` 确保大小写不敏感
- `'移动端'` case 中 `expo` 使用 `idIncludes` 而非 `idStartsWith`，因为 expo 智能体 ID 可能为 `expo-dev` 或含 `expo` 的其他形式
- `'轻量'` case 使用 `.some()` 数组匹配模式，与项目现有风格一致
- `default` case 保持 `return true`，确保未知分类不遗漏智能体

## 7. 风险 / 未解决项

- **构建环境问题**: `@vitejs/plugin-react` 依赖缺失导致 `vite build` 失败，这是预置问题，与本次变更无关。需要单独修复依赖安装问题。
- **TASK-019 依赖**: TASK-019 (useMemo 优化) 需要在此基础上修改 Agents.tsx 的 `filteredByPipeline`/`agents` 变量区域。本任务完成的函数提取不影响 TASK-019 的实施。

## 8. 需要后端配合的点

无。本次变更纯前端，不涉及后端 API 或数据结构。

## 9. 推荐的下一步

1. 修复 `@vitejs/plugin-react` 依赖缺失问题
2. TASK-019 可以在此基础上继续实施 useMemo 优化
3. 考虑为 `matchFunctionRole` 也提取为独立可测试模块（可选重构）
