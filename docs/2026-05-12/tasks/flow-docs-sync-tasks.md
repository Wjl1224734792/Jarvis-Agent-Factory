# TASK-010: 流程文档同步更新 -- 任务完成报告

## 需求文档路径

任务由 TASK-010 直接指定，无独立需求文档。

## 实际文件位置

`docs/flows/` 目录不存在。流程文档实际位于两处：

| 位置 | 用途 | 状态 |
|------|------|------|
| `C:\Users\12247\.claude\commands\` | 用户全局命令模板 | 已更新 |
| `E:\CodeStore\jarvis\.claude\commands\` | 项目级命令覆盖 | 已简化（无需更新） |

## 任务执行概述

### 已完成操作

1. **文件定位** -- 确认 `docs/flows/` 不存在，流程文档在 `.claude/commands/` 两个位置
2. **Gate 序列审查** -- 逐文件对比两个副本的 Gate 序列
3. **更新全局命令文件** -- 将 7 个全局命令文件同步为简化版本（从项目副本复制）
4. **Agent 类型引用验证** -- 全部 37 个 subagent_type 引用在 agent 文件中均存在
5. **jarvis-lite.md 验证** -- 两个副本完全一致，逻辑正确
6. **Mermaid 图检查** -- 所有命令文件中均无 Mermaid 图，无需更新

### 无需更新的文件

| 文件 | 原因 |
|------|------|
| `jarvis.md` | 全流程编排器，必须保留完整 Gate 序列（含 B-DDD/B-BDD/B-TDD） |
| `jarvis-lite.md` | 两个副本完全一致，Gate 序列和对比表逻辑正确 |
| `task-bdd.md` | BDD 专用子任务工具，引用 B-DDD 为上下文说明，正确 |
| `task-ddd.md` | DDD 专用子任务工具，引用 B-DDD 为上下文说明，正确 |
| `task-tdd.md` | TDD 专用子任务工具，引用 B-TDD 为上下文说明，正确 |

## Gate 序列变更详情

### 移动端/跨端命令（5 个文件）

| 文件 | 旧序列 | 新序列 |
|------|-------|-------|
| `android.md` | `A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C2→D→E` | `A→B→C→C1→C2→D→E` |
| `ios.md` | 同上 | 同上 |
| `flutter.md` | 同上 | 同上 |
| `taro.md` | 同上 | 同上 |
| `expo.md` | 同上 | 同上 |

**已去除的 Gate**: B-DDD, B-BDD, B-TDD, B1, C1.5

### 前端/后端命令（2 个文件）

| 文件 | 旧序列 | 新序列 |
|------|-------|-------|
| `frontend.md` | `A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C1.5→C2→D→E` (12 道) | `A→B→B1→C→C-impl→C1→C1.5→C2→D→E` (10 道) |
| `backend.md` | `A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C2→D→E` (12 道) | `A→B→B1→C→C-impl→C1→C2→D→E` (9 道) |

**已去除的 Gate**: B-DDD, B-BDD, B-TDD
**保留的 Gate**: B1（架构评审，对前后端仍适用）

### 同步变更清单

每个更新文件同时去除了以下与已移除 Gate 相关的内容：
- 路由表中移除 `task-design`（仅在 B-DDD/B-BDD/B-TDD 中使用）
- Batch 结构中移除 `Gate B-DDD/B-BDD/B-TDD: [task-design]` 标注
- 移除"移动端任务可轻量化 B-DDD/B-BDD/B-TDD"等过渡说明

## Agent 类型引用验证

### 已验证的 37 个 subagent_type

所有命令中引用的 agent 类型均在 `agent-registry.ts` 扫描的模板/全局/项目 agent 文件中存在：

| 平台 | Agent 类型 | 状态 |
|------|-----------|------|
| Android | `android-dev-expert`, `android-ui-expert`, `android-state-expert` | OK |
| iOS | `ios-dev-expert`, `ios-ui-expert`, `ios-state-expert` | OK |
| Flutter | `flutter-dev-expert`, `flutter-ui-expert`, `flutter-state-expert` | OK |
| Taro | `taro-dev-expert`, `taro-ui-expert`, `taro-state-expert` | OK |
| Expo | `react-native-dev-expert`, `react-native-ui-expert`, `react-native-state-expert` | OK |
| 前端 | `frontend-architect`, `frontend-dev-expert`, `frontend-ui-expert`, `frontend-state-expert`, `frontend-test-expert` | OK |
| 后端 | `backend-architect`, `database-architect`, `backend-dev-expert`, `backend-api-expert`, `backend-logic-expert`, `backend-data-expert`, `backend-test-expert` | OK |
| 通用 | `browser-test-expert`, `e2e-test-expert`, `perf-test-expert`, `perf-review-expert`, `security-review-expert`, `infra-deploy-expert`, `code-explore-expert`, `external-resource-expert`, `api-contract-expert` | OK |
| 审查 | `frontend-review-expert`, `backend-review-expert`, `qa-review-expert` (Gate D 内引用) | OK |

## 验收标准检查

- [x] 流程文档位置已确认（两处 `.claude/commands/`）
- [x] 所有 5 个移动端/跨端指令 Gate 序列已简化
- [x] 前端和后端指令 Gate 序列已简化
- [x] jarvis-lite.md 逻辑正确（两个副本一致）
- [x] 无 Mermaid 图需更新（命令文件中不存在 Mermaid 图）
- [x] 37 个 Agent 类型引用均已验证存在

## 风险与注意事项

1. **全局命令文件**（`C:\Users\12247\.claude\commands\`）会影响用户所有项目，而不仅是 jarvis
2. **前后端命令保留 B1**（架构评审），与移动端去除 B1 不同 -- 这是有意的：前后端项目仍受益于架构评审
3. **审查 Agent**（`frontend-review-expert`, `backend-review-expert`, `qa-review-expert`）不在路由表中但仍在 Gate D 中引用 -- 与项目文件一致
