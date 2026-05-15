# TDD 任务分解: 指令页面双源合并

**需求文档**: `docs/2026-05-15/requirements/REQ-commands-merge.md`
**DDD 文档**: `docs/2026-05-15/tasks/REQ-commands-merge-ddd.md`
**日期**: 2026-05-15
**拆分策略**: 垂直切片 + TDD 优先
**任务总数**: 2

---

## 1. 需求条目盘点

| REQ ID | 名称 | 优先级 | 路由 |
|--------|------|--------|------|
| REQ-CM-001 | 后端双源读取 | P0 | TDD |
| REQ-CM-002 | 前端分 Tab 展示 | P0 | 直接开发 |
| REQ-CM-003 | 移除前端硬编码降级 + 后端内置兜底 | P0 | TDD(BE) + 直接开发(FE) |
| REQ-CM-004 | 分类筛选与来源 Tab 联动 | P0 | TDD |

---

## 2. 行为到任务映射

| 行为 | 映射 REQ | DDD 路由 | 所属任务 | 说明 |
|------|---------|---------|---------|------|
| B1: 多源加载合并 | REQ-CM-001 | TDD | TASK-CM-001 | 后端核心算法 |
| B2: 内置模板兜底 | REQ-CM-003(BE) | TDD | TASK-CM-001 | 后端 fallback，与 B1 同一路由 handler |
| B3: 分 Tab 展示 | REQ-CM-002 | 直接开发 | TASK-CM-002 | 前端 UI 渲染 |
| B4: 分类 Tab 联动 | REQ-CM-004 | TDD | TASK-CM-002 | 前端纯函数状态逻辑 |
| B5: 错误状态降级 | REQ-CM-003(FE) | 直接开发 | TASK-CM-002 | 前端错误 UI |

---

## 3. 任务分解

### TASK-CM-001: [BE TDD] 后端双源指令读取 + 内置模板兜底

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-CM-001 |
| **映射 REQ** | REQ-CM-001, REQ-CM-003 |
| **DDD 行为** | B1 (多源加载合并), B2 (内置模板兜底) |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | ~245 行（L 级，含 ~140 行测试 + ~105 行实现） |
| **test_strategy** | tdd (Red -> Green -> Refactor) |
| **依赖** | 无 |
| **被依赖** | TASK-CM-002 (前端依赖新 API 契约) |
| **风险等级** | 中 (L 级变更 + 共享路由文件) |
| **涉及文件** | `src/web/routes.ts` (修改), `tests/commands-api.test.ts` (新建) |

**风险说明**: 预估 245 行，处于 L 级（200-400 行）。不拆分理由：本任务的 Red 测试和 Green 实现是原子 TDD 单元——测试与实现在同一路由 handler 内紧密耦合，分离后各自无法独立验证。B1 和 B2 因为共享同一个 `/api/commands` handler 的 orchestration 逻辑，也无法合理拆分。

**文件冲突检查**: `src/web/routes.ts` 包含大量其他路由（SSE、agents、pipeline 等），修改范围严格限定在 `/api/commands` handler（当前第 611-641 行）及相关的辅助函数（第 700-757 行的 `parseFrontmatter`、`inferPipelineType`、`inferCategory`）。不修改无关路由。

**TDD 测试用例清单**:

**测试组 1: 双源加载与合并 (B1 / REQ-CM-001)**

| 编号 | 测试用例 | 验证点 |
|------|---------|--------|
| T1.1 | 项目目录存在且有 .md 文件 | `project.commands` 非空，`project.name` = 项目根目录名 |
| T1.2 | 项目 `.claude/commands/` 目录不存在 | `project.commands: []`，不抛异常，HTTP 200 |
| T1.3 | 全局 `~/.claude/commands/` 目录存在且有 .md 文件 | `global.commands` 非空 |
| T1.4 | 全局目录不存在 | `global.commands: []`，不抛异常，HTTP 200 |
| T1.5 | 同名指令（如 `jarvis.md`）同时存在于项目和全局 | 项目列表包含该指令，全局列表排除该指令 |
| T1.6 | 两个目录各有不同指令文件 | 两组指令分别正确返回，无交叉污染 |
| T1.7 | 指令的 YAML frontmatter 正确解析 | `description`、`argumentHint` 字段正确提取 |
| T1.8 | `pipelineType` 和 `category` 正确推断 | 基于文件内容推断 `pipelineType`，基于文件名推断 `category` |
| T1.9 | 指令按名称字母序排列 | `project.commands` 和 `global.commands` 均按 name 排序 |

**测试组 2: 内置模板兜底 (B2 / REQ-CM-003)**

| 编号 | 测试用例 | 验证点 |
|------|---------|--------|
| T2.1 | 项目和全局目录均不存在 | 读取 `src/templates/platforms/claude/commands/`，指令放入 `global.commands` |
| T2.2 | 项目和全局目录存在但均为空（无 .md 文件） | 触发模板兜底，`global.commands` 包含 32 条模板指令 |
| T2.3 | 至少一个来源有指令时，不触发兜底 | `global.commands` 不包含模板指令（模板仅在双源为空时使用） |

**测试组 3: API 契约验证**

| 编号 | 测试用例 | 验证点 |
|------|---------|--------|
| T3.1 | `GET /api/commands` 返回正确 JSON 结构 | `{ project: { name: string, commands: CommandItem[] }, global: { commands: CommandItem[] } }` |
| T3.2 | 不再返回旧格式 `{ commands, total }` | 响应中不存在 `total` 字段（旧契约废除） |

**完成标准**:
1. 所有 14 个测试用例通过
2. 后端编译无错误（`npx tsc --noEmit`）
3. 项目 `.claude/commands/` 不存在时不报错
4. 同名指令在项目优先规则下正确去重
5. 双源均为空时自动读取模板目录作为兜底
6. API 响应格式符合新契约：`{ project: {...}, global: {...} }`

---

### TASK-CM-002: [FE TDD+直接开发] 前端指令页面双 Tab 改造

| 属性 | 值 |
|------|-----|
| **任务 ID** | TASK-CM-002 |
| **映射 REQ** | REQ-CM-002, REQ-CM-003, REQ-CM-004 |
| **DDD 行为** | B3 (分 Tab 展示), B4 (分类筛选联动), B5 (错误状态降级) |
| **任务类型** | TDD (B4) + 直接开发 (B3, B5) |
| **优先级** | P0 |
| **预估变更行数** | ~65 行（S 级） |
| **test_strategy** | tdd (过滤逻辑纯函数) + manual_only (UI 渲染) |
| **依赖** | TASK-CM-001（新 API 契约 `{ project, global }` 格式） |
| **被依赖** | 无 |
| **风险等级** | 低 |
| **涉及文件** | `web/src/api.ts` (修改), `web/src/pages/Commands.tsx` (修改), `tests/commands-filter.test.ts` (新建) |

**文件冲突检查**: 与 TASK-CM-001 无文件冲突（前端/后端文件独立）。`Commands.tsx` 是本任务独占修改，无并行冲突风险。

**TDD 部分 (B4) — 纯函数提取与测试**:

B4 的"分类筛选与 Tab 联动"涉及两个纯逻辑，提取为可测试的纯函数：

```typescript
// 函数 1: 根据来源 Tab 和分类 Tab 过滤指令列表
function filterCommands(
  projectCommands: CommandItem[],
  globalCommands: CommandItem[],
  sourceTab: 'project' | 'global',
  categoryTab: string
): CommandItem[]

// 函数 2: 来源 Tab 切换时的状态转换逻辑
function onSourceTabChange(newSourceTab: string): { sourceTab: string; categoryTab: string }
```

**TDD 测试用例 (B4)**:

| 编号 | 测试用例 | 验证点 |
|------|---------|--------|
| F1.1 | 来源 Tab="project"，分类="全部" | 返回 projectCommands 完整列表 |
| F1.2 | 来源 Tab="global"，分类="全部" | 返回 globalCommands 完整列表 |
| F1.3 | 来源 Tab="project"，分类="development" | 仅返回 projectCommands 中 category="development" 的指令 |
| F1.4 | 来源 Tab="global"，分类="testing" | 仅返回 globalCommands 中 category="testing" 的指令 |
| F1.5 | 切换来源 Tab (project -> global) | `onSourceTabChange('global')` 返回 `{ sourceTab: 'global', categoryTab: 'all' }` |
| F1.6 | 切换来源 Tab (global -> project) | `onSourceTabChange('project')` 返回 `{ sourceTab: 'project', categoryTab: 'all' }` |

**直接开发部分 (B3 + B5) — UI 渲染变更**:

指令页面 `Commands.tsx` 改为双 Tab 布局：

1. **移除旧代码**:
   - 删除 `FALLBACK_COMMANDS` 静态数组（第 16-49 行，31 条指令）
   - 删除 `usingFallback` 状态变量
   - 删除"离线数据" Tag（第 298-309 行）
   - 删除 Fallback Alert（第 314-321 行）

2. **新增 API 类型** (`web/src/api.ts`):
   ```typescript
   export interface CommandsData {
     project: { name: string; commands: CommandItem[] };
     global: { commands: CommandItem[] };
   }
   ```
   更新 `api.commands()` 返回类型为 `Promise<CommandsData>`

3. **新增双 Tab 布局** (`web/src/pages/Commands.tsx`):
   - 第一层 Tab: 来源 Tab（项目指令 / 全局指令），标签名动态（项目名 / "全局"）
   - 第二层 Tab: 分类筛选 Tab（保持现有 15 个分类），对当前来源 Tab 内指令生效
   - 切换来源 Tab 时重置分类筛选为"全部"
   - Tab 切换仅做客户端过滤，不重新请求数据

4. **空状态处理**:
   - 项目指令为空时显示空状态提示："当前项目无自定义指令，运行 `jarvis add claude` 安装"
   - 全局指令为空时显示空状态提示："暂无全局指令"

5. **错误状态** (B5):
   - API 请求失败时显示错误提示 "+ 重试按钮"，不再降级使用硬编码数据

**完成标准**:
1. TDD 部分：6 个过滤/状态逻辑测试用例通过
2. 前端编译无错误（`cd web && npx tsc --noEmit`）
3. 页面顶部显示两个来源 Tab：项目名 Tab + "全局" Tab
4. 来源 Tab 切换时分类筛选重置为"全部"
5. 分类筛选正确过滤当前来源 Tab 内的指令
6. `FALLBACK_COMMANDS` 已从代码中完全移除
7. API 错误时显示错误提示 + 重试按钮，无硬编码降级
8. 项目指令为空时显示带安装提示的空状态
9. 全局指令为空时显示空状态

---

## 4. DDD 分类汇总

| 行为 | DDD 路由 | 所属任务 |
|------|---------|---------|
| B1: 多源加载合并 | TDD | TASK-CM-001 |
| B2: 内置模板兜底 | TDD | TASK-CM-001 |
| B3: 分 Tab 展示 | 直接开发 | TASK-CM-002 |
| B4: 分类 Tab 联动 | TDD | TASK-CM-002 |
| B5: 错误状态降级 | 直接开发 | TASK-CM-002 |

**DDD 分析复用**: 本任务采用 DDD 文档中定义的领域模型：
- `CommandCatalog` 聚合根：映射到 `CommandResolver` + 路由 handler
- `CommandSource` 值对象（project/global/builtin）：映射到前端 `sourceTab` 状态
- `SourceGroup` 值对象：直接映射为 API 响应 JSON 结构 `{ project: {...}, global: {...} }`

---

## 5. TDD vs 直接开发分类

### TDD 任务

| 任务 | 测试文件 | 测试用例数 | TDD 策略 |
|------|---------|-----------|---------|
| TASK-CM-001 | `tests/commands-api.test.ts` | 14 | 纯算法验证：多源合并、去重、兜底逻辑均可通过 API 集成测试精确验证 |
| TASK-CM-002 (B4) | `tests/commands-filter.test.ts` | 6 | 纯函数状态逻辑：过滤和 Tab 切换是可精确测试的状态机行为 |

**TDD 适用理由**:
- B1 合并去重逻辑是纯算法（输入=目录路径，输出=分组 JSON），所有验收场景可转化为断言
- B4 Tab-分类联动是确定性状态机（输入=用户切换动作，输出=新状态），纯函数可精确验证
- 这些逻辑如果出错会直接影响用户体验（指令丢失、分类错乱），需要测试防护

### 直接开发任务

| 任务 | 范围 | 理由 |
|------|------|------|
| TASK-CM-002 (B3) | 双 Tab UI 布局 | 纯 UI 渲染行为，无复杂业务规则 |
| TASK-CM-002 (B5) | 错误状态 + 重试 UI | 简单 React 状态管理，无需 TDD |

---

## 6. 风险任务

| 任务 ID | 风险等级 | 原因 | 缓解措施 |
|---------|---------|------|---------|
| TASK-CM-001 | 中 | L 级变更 (~245 行)；修改 `src/web/routes.ts` 共享路由文件；涉及 3 个文件系统路径的容错处理 | 14 个 TDD 测试覆盖所有路径场景（存在/不存在/空/冲突）；变更严格限定在 `/api/commands` handler 范围内 |

---

## 7. 文件所有权与共享路径

| 文件 | 负责任务 | 变更类型 | 冲突风险 |
|------|---------|---------|---------|
| `src/web/routes.ts` | TASK-CM-001 (独占) | 修改 `/api/commands` handler + 辅助函数 | 无（本需求周期内唯一修改者） |
| `web/src/api.ts` | TASK-CM-002 (独占) | 更新 `CommandItem` / 新增 `CommandsData` 类型 | 无冲突 |
| `web/src/pages/Commands.tsx` | TASK-CM-002 (独占) | 双 Tab 布局 + 移除硬编码 + 分类联动 | 无冲突 |
| `tests/commands-api.test.ts` | TASK-CM-001 (独占) | 新建 | 新建文件，无冲突 |
| `tests/commands-filter.test.ts` | TASK-CM-002 (独占) | 新建 | 新建文件，无冲突 |

**共享区域提醒**: 所有文件各自独占，无并行任务修改同一文件的风险。

---

## 8. 推荐交付顺序

```
轮次: 单轮次（总变更 ~310 行，无需分轮）

第 1 步: TASK-CM-001  Red 阶段    ← 编写 14 个测试用例（全部预计失败）
第 2 步: TASK-CM-001  Green 阶段  ← 实现 CommandResolver + 路由 handler 使测试通过
第 3 步: TASK-CM-001  Refactor 阶段 ← 清理代码，确认 14 个测试仍然通过
          ↓ (新 API 契约已确立)
第 4 步: TASK-CM-002  TDD 部分    ← 编写 6 个过滤逻辑测试 → 提取纯函数 → 测试通过
第 5 步: TASK-CM-002  直接开发部分 ← 更新 api.ts 类型 → 改造 Commands.tsx UI → 验证
```

**TASK-CM-002 可启动条件**: TASK-CM-001 的 Green 阶段完成后（API 响应格式 `{ project, global }` 确定后即可开始前端工作，不必等 Refactor 完成）。

---

## 9. 关键实现细节备忘

这些来自需求文档和 DDD 文档的已知事实，实现时直接参考，无需额外调研：

| 项目 | 值 |
|------|-----|
| 全局命令目录 | `os.homedir()/.claude/commands/` |
| 项目命令目录 | `<projectRoot>/.claude/commands/` |
| 命令文件格式 | `.md` 文件，带 YAML frontmatter |
| 包内置模板路径 | `src/templates/platforms/claude/commands/` |
| 模板文件数量 | 32 个 .md 文件 |
| 当前项目 `.claude/commands/` | 不存在（常见 case） |
| 测试框架 | Vitest，配置文件 `vitest.config.ts`，测试文件目录 `tests/` |
| 后端路由测试模式 | `new Hono()` + `setupApiRoutes(app, null, root)` + `app.request()` |
| 前端过滤逻辑提取位置 | 新建 `tests/commands-filter.test.ts`，与后端测试同目录 |
| 同名去重规则 | 项目目录优先，全局列表中排除已被项目覆盖的指令 |
| 兜底触发条件 | `project.commands` 和 `global.commands` 均为空数组时 |
| 兜底数据归属 | 模板指令放入 `global.commands` 返回 |

---

## 10. 验证清单

- [x] 所有 REQ-XXX 都至少映射到 1 个 TASK（REQ-CM-001~004 全部覆盖）
- [x] 任务使用垂直切片策略（每个任务交付完整功能路径）
- [x] 无水平切片（没有按"设计数据库表/实现 API/构建 UI"拆分）
- [x] 每个任务有明确的优先级和 test_strategy
- [x] 依赖关系已明确（TASK-CM-002 依赖 TASK-CM-001 的 API 契约）
- [x] 无循环依赖
- [x] 并行机会：无（只有 2 个任务且串行依赖）
- [x] 风险任务已标注（TASK-CM-001 L 级变更已说明不拆分理由）
- [x] 单轮次总变更 ~310 行，不超过 1000 行
- [x] 共享区域已指定唯一责任方（所有文件独占）
- [x] 每个任务有可独立验证的完成标准
- [x] TDD 测试用例已详细列出（14 + 6 = 20 个）
- [x] DDD 领域模型映射已明确

---

## 11. 推荐的下一步

1. 将本任务文档提交给 **planner** 制定执行计划
2. planner 应优先调度 **TASK-CM-001 Red 阶段**（编写 14 个失败测试）
3. 执行时调用 `task-tdd` 技能管理 Red -> Green -> Refactor 循环
4. TASK-CM-001 Green 阶段完成后，TASK-CM-002 可并行启动过滤逻辑的 TDD 部分
