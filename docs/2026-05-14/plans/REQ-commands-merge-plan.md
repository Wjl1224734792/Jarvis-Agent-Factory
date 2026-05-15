# 执行计划: 指令页面双源合并

**日期**: 2026-05-15
**需求文档**: `docs/2026-05-15/requirements/REQ-commands-merge.md`
**DDD 文档**: `docs/2026-05-15/tasks/REQ-commands-merge-ddd.md`
**任务文档**: `docs/2026-05-15/tasks/REQ-commands-merge-tasks.md`

---

## 1. 当前轮次目标

本轮次交付完整垂直切片：后端 `GET /api/commands` 实现双源读取+内置兜底，前端指令页面展示双 Tab 布局、保留分类筛选并移除硬编码降级数据。

## 2. 当前轮次范围

| 需求 | 任务 | 类型 |
|------|------|------|
| REQ-CM-001 (后端双源读取) | TASK-CM-001 | TDD |
| REQ-CM-003 (后端内置兜底) | TASK-CM-001 | TDD |
| REQ-CM-002 (前端分 Tab 展示) | TASK-CM-002 | 直接开发 |
| REQ-CM-003 (前端移除硬编码) | TASK-CM-002 | 直接开发 |
| REQ-CM-004 (分类筛选联动) | TASK-CM-002 | TDD |

**变更规模**: ~310 行（TASK-CM-001 ~245 行，TASK-CM-002 ~65 行），S 级，单轮次可交付。

## 3. 完成标准

1. TASK-CM-001 14 个测试用例全部通过
2. TASK-CM-002 6 个过滤逻辑测试用例通过
3. 后端编译无错误 (`npx tsc --noEmit`)
4. 前端编译无错误 (`cd web && npx tsc --noEmit`)
5. API 响应格式符合新契约 `{ project: { name, commands }, global: { commands } }`
6. 前端指令页面显示两个来源 Tab，切换正确
7. 分类筛选与来源 Tab 联动正确
8. `FALLBACK_COMMANDS` 已从 `Commands.tsx` 移除
9. API 错误时显示错误提示 + 重试按钮

## 4. 代码结构探索

本轮次不需要前置 code-explore-expert。关键代码位置已在任务文档和 DDD 文档中精确定位：

| 位置 | 文件 | 行号 |
|------|------|------|
| 现有 `/api/commands` handler | `src/web/routes.ts` | 611-641 |
| 现有辅助函数 (parseFrontmatter, inferPipelineType, inferCategory) | `src/web/routes.ts` | 700-757 |
| 现有 `CommandItem` 接口 | `web/src/api.ts` | 51-57 |
| 现有 `commands()` API 调用 | `web/src/api.ts` | 148-149 |
| 现有 `FALLBACK_COMMANDS` (需删除) | `web/src/pages/Commands.tsx` | 16-49 |
| 现有 `usingFallback` 状态 (需删除) | `web/src/pages/Commands.tsx` | 208 |
| 现有 Fallback Tag (需删除) | `web/src/pages/Commands.tsx` | 298-309 |
| 现有 Fallback Alert (需删除) | `web/src/pages/Commands.tsx` | 314-321 |
| 现有 `useEffect` 数据加载 | `web/src/pages/Commands.tsx` | 210-239 |
| 现有分类筛选逻辑 | `web/src/pages/Commands.tsx` | 241-247 |
| 模板目录 (32 个 .md) | `src/templates/platforms/claude/commands/` | - |

## 5. 执行代理分工

| 任务 | 代理 | 职责 |
|------|------|------|
| TASK-CM-001 | `backend-dev-expert` | Red→Green→Refactor：编写 14 个 API 集成测试 → 实现 CommandResolver + fallback → 重构清理 → 验证 |
| TASK-CM-002 | `frontend-dev-expert` | TDD+直接开发：提取纯函数并编写 6 个单元测试 → 更新 api.ts 类型 → 改造 Commands.tsx UI → 验证 |

## 6. 共享区域改动归属

| 文件 | 唯一责任方 | 说明 |
|------|-----------|------|
| `src/web/routes.ts` | TASK-CM-001 (独占) | 修改范围严格限定在 `/api/commands` handler (611-641) 及辅助函数 (700-757) |
| `web/src/api.ts` | TASK-CM-002 (独占) | 更新 `CommandItem` 类型 + `commands()` 返回类型 |
| `web/src/pages/Commands.tsx` | TASK-CM-002 (独占) | UI 改造，本需求周期唯一修改者 |
| `tests/commands-api.test.ts` | TASK-CM-001 (独占) | 新建文件 |
| `tests/commands-filter.test.ts` | TASK-CM-002 (独占) | 新建文件 |

**所有文件独占，无并行冲突风险。**

## 7. 并行/串行策略

**串行链**: TASK-CM-001 (全部 TDD 阶段) → TASK-CM-002

**串行理由**: TASK-CM-002 的前端实现依赖 TASK-CM-001 确定的新 API 契约 `{ project: { name, commands }, global: { commands } }`。两个任务无文件冲突，但不能并行。

**TASK-CM-001 内部的 TDD 步骤**（由 backend-dev-expert 自行管理）:
- Red: 编写 14 个失败测试
- Green: 实现 CommandResolver + 路由 handler
- Refactor: 清理代码，验证测试通过

**TASK-CM-002 内部的步骤**（由 frontend-dev-expert 自行管理）:
1. TDD 部分：提取 `filterCommands` 和 `onSourceTabChange` 纯函数，编写 6 个单元测试
2. 直接开发部分：更新 `api.ts` 类型 → 改造 `Commands.tsx` UI → 验证

## 8. 风险提醒

| 风险 | 等级 | 缓解 |
|------|------|------|
| `src/web/routes.ts` 包含大量其他路由，可能误修改 | 中 | 严格限定在 `/api/commands` handler 和辅助函数范围内；14 个测试覆盖所有边界 |
| 文件系统容错（目录不存在）未正确处理 | 中 | TDD 测试用例 T1.2/T1.4 显式覆盖目录不存在场景 |
| 前端 TDD 提取纯函数的接口设计可能不对齐 | 低 | 纯函数签名已在任务文档中预定义 |
| 首次 Vitest 前端测试（跨模块引用 `web/src/` 代码）可能有路径配置问题 | 低 | 任务文档已确认测试文件在 `tests/` 目录，Vitest globals 已启用 |

## 9. 实现者交接信息

**对 backend-dev-expert**:
- 测试模式：`new Hono()` + `setupApiRoutes(app, null, root)` + `app.request('/api/commands')`（参考 `docs-api.test.ts` 模式）
- 全局目录路径：`homedir()/.claude/commands/`（需 `import { homedir } from 'node:os'`）
- 去重规则：同名指令项目优先，全局列表排除。使用 `Set` + `filter` 实现
- 旧格式 `{ commands, total }` 完全废弃，新格式 `{ project: {...}, global: {...} }`
- 辅助函数 `parseFrontmatter`/`inferPipelineType`/`inferCategory` 已存在，可能需要调整为支持 `source` 参数或完全复用

**对 frontend-dev-expert**:
- 新 API 类型：`CommandsData = { project: { name: string; commands: CommandItem[] }; global: { commands: CommandItem[] } }`
- `CommandItem` 接口保持现有 5 个字段不变
- 纯函数 `filterCommands`/`onSourceTabChange` 从 React 组件中提取，放在 `tests/commands-filter.test.ts` 同文件或单独工具文件
- Tab 库：使用 antd `Tabs` 组件（已在页面中使用）
- 删除清单：`FALLBACK_COMMANDS`(16-49行)、`usingFallback`(208行)、Fallback Tag(298-309行)、Fallback Alert(314-321行)

## 10. plan patch / contract change request 触发条件

以下情况时实现代理应暂停并回编排者：
- API 响应契约需要添加新字段超出 `{ project: { name, commands }, global: { commands } }` 范围
- 需要修改 `setupApiRoutes` 函数签名
- 需要修改 `src/web/routes.ts` 中非 `/api/commands` handler 的代码
- 需要修改 `src/templates/platforms/claude/commands/` 中的模板文件
- 前端测试需要额外 Vitest 配置（如 jsdom 环境）

---

## parallel_batches

### Batch 1（无依赖，TDD 后端核心）
- **TASK-CM-001** → subagent_type: backend-dev-expert

**完成条件**: 14 个测试全部通过，`npx tsc --noEmit` 通过，API 返回新契约格式。

### Batch 2（依赖 Batch 1 全部完成——新 API 契约已确立）
- **TASK-CM-002** → subagent_type: frontend-dev-expert

**完成条件**: 6 个过滤逻辑测试通过，`cd web && npx tsc --noEmit` 通过，页面双 Tab 正确渲染。

---

## Execution Packets

### task_id: TASK-CM-001
### task_name: 后端双源指令读取 + 内置模板兜底
### requirement_ids: REQ-CM-001, REQ-CM-003
### owner: backend-dev-expert
### objective: 将 `GET /api/commands` 改为双源读取（项目+全局）+ 空数据内置模板兜底，返回新契约格式 `{ project: {...}, global: {...} }`
### in_scope:
- 编写 14 个 API 集成测试用例（测试组 1: B1 双源加载合并 9 个；测试组 2: B2 内置兜底 3 个；测试组 3: API 契约验证 2 个）
- 实现 `CommandResolver` 逻辑：从项目目录 `<root>/.claude/commands/` 和全局目录 `~/.claude/commands/` 读取 .md 文件
- 实现同名指令去重（项目优先，全局列表排除被覆盖项）
- 实现兜底逻辑：双源均为空时读取 `src/templates/platforms/claude/commands/`，放入 `global.commands`
- 实现指令排序：`project.commands` 和 `global.commands` 均按 name 字母序
- 复用现有 `parseFrontmatter`、`inferPipelineType`、`inferCategory` 辅助函数
- 容错处理：某个目录不存在时对应 commands 为空数组，不抛异常
- 新契约响应格式：`{ project: { name: string, commands: CommandItem[] }, global: { commands: CommandItem[] } }`
### out_of_scope:
- 不修改 `private/integrations/` 中的 `cli-commands.ts` 或 MCP 相关代码
- 不修改 `src/web/routes.ts` 中 `/api/commands` handler 以外任何路由
- 不修改模板目录 `src/templates/platforms/claude/commands/` 中的文件
- 不修改前端代码
### input_documents:
- `docs/2026-05-15/requirements/REQ-commands-merge.md`
- `docs/2026-05-15/tasks/REQ-commands-merge-ddd.md`
- `docs/2026-05-15/tasks/REQ-commands-merge-tasks.md`
### allowed_paths:
- `src/web/routes.ts` — 仅限于 `/api/commands` handler (当前行 611-641) 和辅助函数区域 (当前行 700-757)
- `tests/commands-api.test.ts` — 新建文件
### forbidden_paths:
- `src/web/routes.ts` 中非 `/api/commands` handler 的所有其他路由代码
- `web/src/` — 前端代码
- `src/templates/platforms/claude/commands/` — 模板文件
- `src/engine/` — 数据库引擎
- `src/server.ts`
### dependencies:
- Hono (已在项目中)
- `node:os` 的 `homedir()` 获取全局目录路径
- `node:fs` 的 `readdirSync`/`readFileSync` 读取目录和文件
- `node:path` 的 `resolve`/`join` 拼接路径
- Vitest 测试框架 (配置: `vitest.config.ts`)
- `setupApiRoutes` (从 `src/web/routes` 导出)
- 现有辅助函数: `parseFrontmatter`、`inferPipelineType`、`inferCategory` (位于 `src/web/routes.ts` 700-757)
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [] (本 Batch 唯一任务)
### wait_for: [] (无依赖，Batch 1 首个任务)
### acceptance_criteria:
1. 14 个测试用例全部通过 (`npx vitest run tests/commands-api.test.ts`)
2. `npx tsc --noEmit` 后端编译无错误
3. 项目 `.claude/commands/` 不存在时返回 `project.commands: []`，HTTP 200，不报错
4. 全局目录不存在时返回 `global.commands: []`，HTTP 200，不报错
5. 同名指令在项目优先规则下正确去重（项目保留，全局排除）
6. 双源均为空时触发内置兜底，`global.commands` 包含模板目录 32 条指令
7. API 响应格式 `{ project: { name, commands }, global: { commands } }`，不存在 `total` 字段
8. 两组指令均按 name 字母序排列
9. 所有测试在单次 `npx vitest run` 中通过，无超时失败
### test_strategy: tdd
### handoff_notes:
- 新 API 契约 `{ project: { name: string, commands: CommandItem[] }, global: { commands: CommandItem[] } }` 是 TASK-CM-002 的前置依赖
- 测试文件 `tests/commands-api.test.ts` 应在 cleanup 后将临时目录清理干净
- `parseFrontmatter`/`inferPipelineType`/`inferCategory` 辅助函数签名若需调整（如增加 `source` 参数），须在 Green 阶段一同完成
- 旧 `{ commands, total }` 格式已废除，前端 Consumer 需要更新（TASK-CM-002 负责）
### escalation_rule: 如需修改 `setupApiRoutes` 函数签名、修改非 `/api/commands` 相关路由、或模板目录文件，必须先回编排者

---

### task_id: TASK-CM-002
### task_name: 前端指令页面双 Tab 改造 + 移除硬编码降级
### requirement_ids: REQ-CM-002, REQ-CM-003, REQ-CM-004
### owner: frontend-dev-expert
### objective: 将指令页面改为项目/全局双 Tab 布局，提取过滤逻辑为可测试纯函数（6 个 TDD 测试），移除 `FALLBACK_COMMANDS` 硬编码数组和所有降级 UI
### in_scope:
- **TDD 部分 (B4)**：
  - 提取 `filterCommands(projectCommands, globalCommands, sourceTab, categoryTab): CommandItem[]` 纯函数
  - 提取 `onSourceTabChange(newSourceTab): { sourceTab, categoryTab }` 纯函数
  - 编写 6 个单元测试（F1.1-F1.6）
- **直接开发部分 (B3 + B5)**：
  - 更新 `web/src/api.ts`：新增 `CommandsData` 接口，更新 `commands()` 返回类型为 `Promise<CommandsData>`
  - 改造 `web/src/pages/Commands.tsx`：
    - 删除 `FALLBACK_COMMANDS` 静态数组 (行 16-49)
    - 删除 `usingFallback` 状态变量 (行 208)
    - 删除"离线数据"Tag (行 298-309)
    - 删除 Fallback Alert (行 314-321)
    - 新增第一层来源 Tab（项目名/"全局"），使用新 API 数据
    - 保留第二层分类筛选 Tab，联动当前来源 Tab
    - 切换来源 Tab 时重置分类筛选为"全部"
    - 项目指令为空时显示空状态提示
    - 全局指令为空时显示空状态提示
    - API 错误时显示错误提示 + 重试按钮
### out_of_scope:
- 不添加指令编辑/预览功能
- 不添加指令搜索功能
- 不修改后端代码
- 不修改 antd Tabs 组件样式库
### input_documents:
- `docs/2026-05-15/requirements/REQ-commands-merge.md`
- `docs/2026-05-15/tasks/REQ-commands-merge-ddd.md`
- `docs/2026-05-15/tasks/REQ-commands-merge-tasks.md`
### allowed_paths:
- `web/src/api.ts` — 新增 `CommandsData` 类型，修改 `commands()` 返回类型
- `web/src/pages/Commands.tsx` — 双 Tab 布局 + 移除硬编码 + 分类联动 + 错误处理
- `tests/commands-filter.test.ts` — 新建 TDD 测试文件
### forbidden_paths:
- `src/web/routes.ts` — 后端代码
- `src/engine/` — 数据库引擎
- `web/src/` 中除 `api.ts` 和 `pages/Commands.tsx` 外的所有文件
### dependencies:
- **TASK-CM-001 完成**（新 API 契约 `{ project: {...}, global: {...} }` 已确立）
- React + antd `Tabs` 组件（已在项目中使用）
- Vitest 测试框架
- 新 API 类型：`CommandsData = { project: { name: string; commands: CommandItem[] }; global: { commands: CommandItem[] } }`
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [] (本 Batch 唯一任务)
### wait_for: [TASK-CM-001]
### acceptance_criteria:
1. 6 个过滤/状态逻辑测试用例通过 (`npx vitest run tests/commands-filter.test.ts`)
2. `cd web && npx tsc --noEmit` 前端编译无错误
3. 页面顶部显示两个来源 Tab：项目名 Tab + "全局" Tab，标签名正确
4. 来源 Tab 切换时分类筛选重置为"全部"
5. 分类筛选正确过滤当前来源 Tab 内的指令
6. `FALLBACK_COMMANDS` 已从代码中完全移除（可通过 `grep` 确认）
7. `usingFallback` 状态已从代码中完全移除
8. API 错误时显示错误提示 + 重试按钮，无硬编码降级
9. 项目指令为空时显示空状态提示："当前项目无自定义指令，运行 `jarvis add claude` 安装"
10. 全局指令为空时显示空状态提示
11. 切换 Tab 不重新请求数据（仅客户端过滤）
### test_strategy: tdd (B4 过滤逻辑 6 个测试) + manual_only (B3/B5 UI 渲染手动验证)
### handoff_notes:
- `filterCommands` 和 `onSourceTabChange` 纯函数的提取位置：建议在 `tests/commands-filter.test.ts` 中定义函数并测试，前端组件 import 使用
- 或放在 `web/src/` 下的独立工具文件（如 `web/src/utils/commands-filter.ts`），测试文件从该路径 import
- 来源 Tab 标签名使用 `CommandsData.project.name`（项目名），如无项目名展示为"项目指令"
- antd Tabs 支持嵌套，第一层来源 Tab 内嵌第二层分类 Tab
- 旧的 `commands` 状态（`CommandItem[]`）需改为存储完整 `CommandsData` 结构
### escalation_rule: 如需修改 `src/web/routes.ts` 或 API 响应格式超出 `{ project, global }`，必须先回编排者

---

## 11. 验证命令

### Batch 1 完成后验证

```bash
# 运行后端测试
npx vitest run tests/commands-api.test.ts

# 后端类型检查
npx tsc --noEmit

# 确认 API 响应格式（启动后端后手动测试）
# curl http://localhost:PORT/api/commands | jq 'keys'
# 期望输出: ["project", "global"]
```

### Batch 2 完成后验证

```bash
# 运行前端过滤逻辑测试
npx vitest run tests/commands-filter.test.ts

# 前端类型检查
cd web && npx tsc --noEmit

# 确认 FALLBACK_COMMANDS 已移除
grep -r "FALLBACK_COMMANDS" web/src/pages/Commands.tsx
# 期望: 无匹配

# 确认 usingFallback 已移除
grep -r "usingFallback" web/src/pages/Commands.tsx
# 期望: 无匹配

# 运行全部测试确认无回归
npx vitest run
```

### 轮次终验

```bash
# 全部测试通过
npx vitest run

# 后端编译通过
npx tsc --noEmit

# 前端编译通过
cd web && npx tsc --noEmit
```

---

## 12. 推荐的下一步

1. 将本计划文档提交给编排者确认
2. 编排者 spawn `backend-dev-expert` 执行 TASK-CM-001
3. TASK-CM-001 全部通过后，编排者 spawn `frontend-dev-expert` 执行 TASK-CM-002
4. TASK-CM-002 完成后，编排者触发 `qa-review-expert` 做整体质量评审
