# DDD 领域分析: 指令页面双源合并

**需求文档**: `.jarvis/2026-05-15/requirements/REQ-commands-merge.md`
**日期**: 2026-05-15
**分析类型**: 轻量级 DDD（纯读模型，无写操作）

---

## 1. 聚合根

| 聚合根 | 描述 | 核心职责 |
|--------|------|---------|
| `CommandCatalog` | 系统中所有可用指令的完整视图，按来源分组 | 从多源加载指令、合并去重、提供按来源和分类的查询能力 |

**聚合边界说明**：`CommandCatalog` 是一个**读模型聚合**——其内容由文件系统读取组装，不存在写操作。聚合的一致性边界为"指令名称在项目范围内唯一覆盖全局"（即 dedup 规则）。没有跨聚合事务。

---

## 2. 实体

| 实体 | 所属聚合 | 描述 | 唯一标识 |
|------|---------|------|---------|
| `Command` | `CommandCatalog` | 一个可执行的指令模板，包含名称、描述、参数提示、流水线类型和分类 | `name`（从 .md 文件名派生，不含扩展名） |

**Command 实体属性**:
- `name: string` — 唯一标识，如 `jarvis`、`bug-fix`
- `description: string` — 从 YAML frontmatter 解析的 `description` 字段
- `argumentHint: string` — 从 YAML frontmatter 解析的 `argument-hint` 字段
- `pipelineType: string` — 从文件内容推断（`inferPipelineType`）
- `category: string` — 从文件名推断（`inferCategory`）
- `source: CommandSource` — 指令来自哪个来源

---

## 3. 值对象

| 值对象 | 所属聚合 | 描述 | 不可变属性 |
|--------|---------|------|-----------|
| `CommandSource` | `CommandCatalog` | 指令来源枚举：`project`、`global`、`builtin` | 枚举值不可变 |
| `SourceGroup` | `CommandCatalog` | 按来源分组的指令集合，带来源名称 | `{ name: string, commands: Command[] }` |

**CommandSource 语义**:
- `project` — 来自 `<projectRoot>/.claude/commands/`，代表当前项目自定义指令
- `global` — 来自 `~/.claude/commands/`，代表用户全局安装的指令
- `builtin` — 来自 `src/templates/platforms/claude/commands/`，仅当 project 和 global 均为空时作为兜底（fallback）

**SourceGroup 设计说明**：`SourceGroup` 是前端 Tab 结构的数据契约。后端返回 `{ project: SourceGroup, global: SourceGroup }`，前端据此渲染 Tab。

---

## 4. 领域服务

| 领域服务 | 描述 | 涉及聚合 | 复杂度 |
|---------|------|---------|--------|
| `CommandResolver` | 编排多源指令的加载、合并与去重逻辑 | `CommandCatalog` | 中 |
| `CommandFileReader` | 从指定目录读取 .md 文件，解析 frontmatter，推断 pipelineType 和 category | `CommandCatalog` | 低 |
| `BuiltinFallbackProvider` | 当双源为空时，读取 `src/templates/platforms/claude/commands/` 作为兜底 | `CommandCatalog` | 低 |

**领域服务设计说明**:

- `CommandFileReader` 已基本存在于现有代码中（`parseFrontmatter`、`inferPipelineType`、`inferCategory`），需要改为可复用函数并增加 `source` 参数。
- `CommandResolver` 是本次核心新增逻辑——编排加载顺序、项目优先去重、构建分组结果。
- `BuiltinFallbackProvider` 是 `CommandResolver` 的一个策略步骤。

---

## 5. 领域事件

**无领域事件。** 本功能是纯读操作：用户请求 `GET /api/commands`，系统组装结果并返回。不涉及任何状态变更，因此不需要领域事件。

---

## 6. 聚合行为清单

### B1: 从多源加载并合并指令

| 属性 | 值 |
|------|-----|
| **映射 REQ** | REQ-CM-001 |
| **业务价值** | 高 — 核心功能：用户首次看到全局指令 |
| **规则复杂度** | 中 — 双目录读取 + 同名去重（项目优先） + 容错（目录不存在不报错） |
| **是否需要验收** | 是 — 四个验收场景均需验证 |
| **路由建议** | **→ TDD** |

**路由理由**：合并逻辑是纯算法——输入是目录路径，输出是分组 JSON。所有验收场景可精确转化为单元测试用例：

- 测试 1: project 目录存在 → `project.commands` 非空
- 测试 2: project 目录不存在 → `project.commands: []`，不抛异常
- 测试 3: global 目录存在 → `global.commands` 非空
- 测试 4: 同名指令在 project+global → project 保留，global 排除

**关键规则**:
1. 同名指令（如 `jarvis.md`）在项目目录和全局目录同时存在时，项目目录优先，全局列表排除该指令
2. 目录不存在时返回空数组，不抛异常
3. `project.name` 取项目根目录名

---

### B2: 双源为空时提供内置模板兜底

| 属性 | 值 |
|------|-----|
| **映射 REQ** | REQ-CM-003（后端部分） |
| **业务价值** | 中 — 确保用户始终看到指令列表，即使没有安装任何指令 |
| **规则复杂度** | 低 — 简单条件判断 + 目录读取 |
| **是否需要验收** | 是 |
| **路由建议** | **→ TDD** |

**路由理由**：纯条件逻辑，无复杂业务规则。

**关键规则**:
1. 仅当 `project.commands` 和 `global.commands` 均为空时触发
2. 读取 `src/templates/platforms/claude/commands/` 目录
3. 模板指令放入 `global.commands` 返回（作为全局指令展示）

---

### B3: 按来源分 Tab 展示指令

| 属性 | 值 |
|------|-----|
| **映射 REQ** | REQ-CM-002 |
| **业务价值** | 高 — 用户可区分指令来源 |
| **规则复杂度** | 低 — UI 渲染，无复杂业务规则 |
| **是否需要验收** | 是 |
| **路由建议** | **→ 直接开发** |

**路由理由**：纯 UI 行为——根据 API 返回的 `SourceGroup` 渲染两个 Tab。标签名动态（项目名 / "全局"），Tab 切换只做客户端过滤。

**验收场景**:
- 两个 Tab 存在，标签名正确
- 切换 Tab 时正确显示对应指令列表，不重新请求数据
- 项目指令为空 → 显示空状态提示
- 全局指令为空 → 显示空状态提示

---

### B4: 分类筛选与来源 Tab 联动

| 属性 | 值 |
|------|-----|
| **映射 REQ** | REQ-CM-004 |
| **业务价值** | 中 — 保持现有分类筛选能力 |
| **规则复杂度** | 中 — 需处理 Tab 切换 × 分类筛选的状态联动 |
| **是否需要验收** | 是 |
| **路由建议** | **→ TDD** |

**路由理由**：Tab 切换时重置分类筛选为"全部"，这是可精确测试的状态机行为。分类筛选本身是简单的 `filter` 操作。

**关键规则**:
1. 分类筛选对当前选中 Tab（项目/全局）内的指令生效
2. 切换 Tab 时重置分类筛选为"全部"

---

### B5: API 错误时的前端降级行为

| 属性 | 值 |
|------|-----|
| **映射 REQ** | REQ-CM-003（前端部分） |
| **业务价值** | 中 — 改善错误状态用户体验 |
| **规则复杂度** | 低 |
| **是否需要验收** | 是 |
| **路由建议** | **→ 直接开发** |

**路由理由**：简单 UI 状态管理——移除 `FALLBACK_COMMANDS` 和 `usingFallback`，API 失败时显示错误提示 + 重试按钮。

**删除项**:
- `FALLBACK_COMMANDS` 静态数组（31 条）
- `usingFallback` 状态
- "离线数据" Alert 和 Tag

---

## 7. 文件所有权映射

| 文件 | 所属行为 | 变更类型 | 预估行数 |
|------|---------|---------|---------|
| `src/web/routes.ts` | B1, B2 | 修改 `/api/commands` 路由 | ~80 行 |
| `web/src/api.ts` | B1, B3 | 更新 `CommandItem` 和 `api.commands()` 返回类型 | ~15 行 |
| `web/src/pages/Commands.tsx` | B3, B4, B5 | 双 Tab 布局 + 移除 fallback + 分类联动 | ~50 行净增（含大量删除） |

**文件冲突检查**：三个文件互相独立，无共享区域冲突。但 `src/web/routes.ts` 包含大量其他路由（SSE、agents、pipeline 等），注意不修改无关部分。

---

## 8. 推荐实现顺序

```
1. B1 (后端双源读取)       ← 数据契约先行，前端依赖此 API
2. B2 (后端内置 fallback)   ← 与 B1 在同一文件，紧接实现
3. B5 (前端移除硬编码)      ← 独立的前端变更，可与 B3/B4 并行
4. B3 (前端分 Tab 展示)     ← 依赖 B1/B2 的 API 契约
5. B4 (分类筛选联动)        ← 依赖 B3 的 Tab 结构
```

**并行机会**: B3 + B4 在 `Commands.tsx` 同一文件中，宜合并为一个前端任务。B5 虽也在同一文件但逻辑独立，可视为同一任务的一部分。

---

## 9. 总结

| 维度 | 结论 |
|------|------|
| **聚合根数量** | 1 (`CommandCatalog`) — 轻量级读模型 |
| **领域事件** | 0 — 纯读操作，无状态变更 |
| **TDD 候选行为** | 3 (`B1`, `B2`, `B4`) |
| **直接开发行为** | 2 (`B3`, `B5`) |
| **BDD 候选行为** | 0 — 无复杂多步骤业务流程需要 Gherkin 场景描述 |
| **风险点** | B1 的"项目名同名指令去重"规则需要精确的单元测试覆盖 |
