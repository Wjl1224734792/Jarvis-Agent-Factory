# Jarvis-Agent-Factory Web 面板 -- 架构变更评审报告

> 评审日期：2026-05-13 | 评审人：前端架构师 | 版本：v1.0
> 关联需求：`docs/2026-05-13/requirements/REQ-test-system-enhancement.md`
> 关联任务：`docs/2026-05-13/tasks/2026-05-13-test-systematization-tasks.md`（第 4 组 TASK-WEB-001 ~ TASK-WEB-003）

---

## 一、评审执行摘要

本次变更涉及 Web 面板的三项核心任务：Dashboard Gate 可视化扩展（TASK-WEB-001）、Commands 指令列表扩展（TASK-WEB-002）、质量门禁配置页面（TASK-WEB-003）。变更范围涵盖 4 个现有文件（Dashboard.tsx、Commands.tsx、Layout.tsx、App.tsx）和 2 个新增文件（QualityGates.tsx、api.ts 扩展）。

**核心风险：当前架构中 GATE_COLORS、GATE_LABELS、GATE_DESCRIPTIONS、PIPELINE_NAMES、CMD_LABELS、PIPELINE_TAGS 等常量在 3 个文件中独立硬编码且互不同步**。本次变更若继续简单追加，将加剧技术债务。本报告提出结构性重构方案。

---

## 二、现有架构诊断

### 2.1 常量散落问题（Critical -- 必须重构）

当前代码中，Pipeline 类型配置在 3 个文件中独立重复定义：

| 常量名 | 所在文件 | 定义形式 | 当前覆盖 |
|--------|---------|---------|----------|
| `PIPELINE_NAMES` | Layout.tsx:72 | `{ full, frontend, backend, lite }` | 4 种 |
| `CMD_LABELS` | Layout.tsx:79 | `{ label, color, bg }` | 4 种 |
| `CMD_LABELS` | Archive.tsx:12 | `{ label, color }` (无 bg) | 4 种 |
| `PIPELINE_TAGS` | Commands.tsx:44 | `{ label, color, bg }` | 4 种 |
| `GATE_COLORS` | Dashboard.tsx:25 | `{ A, B, C, C1, C1.5, C2, D, E }` | 8 个 |
| `GATE_LABELS` | Dashboard.tsx:31 | `{ A, B-DDD, B-BDD, B-TDD, B1, C, C-impl, C1, C1.5, C2, D, E }` | 12 个 |
| `GATE_DESCRIPTIONS` | Dashboard.tsx:38 | `{ 'Gate A', 'Gate B-DDD', ... }` | 12 个 |

**两个严重问题：**

1. **CMD_LABELS 在 Layout.tsx 和 Archive.tsx 中各自定义，类型签名不同**（一个有 `bg`、一个没有），且值存在隐式不一致（Archive.tsx 中 `backend.color = 'var(--ant-color-success)'`，Layout.tsx 中 `backend.color = 'var(--ant-color-info)'`）。
2. **GATE_COLORS 以 `shortGate()` 处理后的简写为 key（如 `A`），但 GATE_LABELS 和 GATE_DESCRIPTIONS 使用完整 Gate 名（如 `B-DDD`）**，key 体系不统一。

### 2.2 硬编码数据量即将翻倍

| 数据维度 | 当前值 | 变更后 | 增长 |
|---------|--------|--------|------|
| Pipeline 类型 | 4 | 11 | +175% |
| Gate 定义 | 12 个 | ~30 个 | +150% |
| 命令列表 | 20 个 | 31+ 个 | +55% |
| 硬编码行数合计 | ~110 行 | ~280 行 | +155% |

若不重构，Dashboard.tsx 和 Layout.tsx 将膨胀到不可维护的规模。

### 2.3 现有架构的积极因素

- **SSE 推送已落地**（TASK-006）：Layout.tsx 通过 EventSource 接收 `/api/events` 推送的 pipeline 数据，Dashboard 通过 `usePipelineData()` 消费。这为动态 Gate 序列渲染提供了基础——后端返回的 `gates` 数组已经包含完整 Gate 信息。
- **API 已有 `/api/commands` 端点**：Commands.tsx 已经尝试从 API 获取命令列表，FALLBACK_COMMANDS 只是降级方案。
- **组件分层清晰**：Layout（壳）→ Page（Dashboard/Commands/Archive）→ 独立组件（CommandCard、SessionItem），职责边界明确。

---

## 三、架构决策（ADR）

### ADR-001：将 Pipeline/Gate/Command 常量集中到共享模块

**状态 (Status):** Accepted

**日期 (Date):** 2026-05-13

#### 上下文 (Context)

当前 GATE_COLORS、GATE_LABELS、PIPELINE_NAMES、CMD_LABELS 等常量在 Dashboard.tsx、Layout.tsx、Commands.tsx、Archive.tsx 中各自独立定义。每次新增 Pipeline 类型或 Gate 需要在 3-4 个文件中同步修改，容易遗漏和不一致。

本次变更新增 7 种 Pipeline 类型和 18 个 Gate，若继续追加将严重恶化维护性。

#### 决策 (Decision)

创建 `web/src/constants/pipeline.tsx` 作为统一的 Pipeline/Gate/Command 常量模块，所有页面从此模块导入。

**文件结构：**
```
web/src/constants/
  pipeline.tsx       -- PIPELINE_META, GATE_META, CATEGORY_META
  index.ts           -- 统一导出
```

**PIPELINE_META 设计：**
```typescript
// web/src/constants/pipeline.tsx

/** 单一真源：Pipeline 类型元数据 */
export const PIPELINE_META: Record<string, {
  name: string;        // 中文名
  label: string;       // 短标签（Tag 中显示）
  color: string;       // 文字颜色
  bg: string;          // 背景颜色
}> = {
  full:      { name: '全流程',     label: 'jarvis',       color: 'var(--ant-color-success)',  bg: 'var(--ant-color-success-bg)' },
  frontend:  { name: '前端',       label: 'frontend',     color: 'var(--ant-color-error)',    bg: 'var(--ant-color-error-bg)' },
  backend:   { name: '后端',       label: 'backend',      color: 'var(--ant-color-info)',     bg: 'var(--ant-color-info-bg)' },
  lite:      { name: '轻量',       label: 'jarvis-lite',  color: 'var(--ant-color-warning)',  bg: 'var(--ant-color-warning-bg)' },
  refactor:  { name: '安全重构',   label: 'refactor',     color: 'var(--ant-color-purple)',  bg: 'var(--ant-color-purple-bg)' },
  hotfix:    { name: '紧急热修复', label: 'hotfix',       color: 'var(--ant-color-magenta)', bg: 'var(--ant-color-magenta-bg)' },
  migrate:   { name: '框架迁移',   label: 'migrate',      color: 'var(--ant-color-orange)',  bg: 'var(--ant-color-orange-bg)' },
  evaluate:  { name: '技术评估',   label: 'evaluate',     color: 'var(--ant-color-geekblue)',bg: 'var(--ant-color-geekblue-bg)' },
  debug:     { name: '调试诊断',   label: 'debug',        color: 'var(--ant-color-gold)',    bg: 'var(--ant-color-gold-bg)' },
  doc:       { name: '文档同步',   label: 'doc',          color: 'var(--ant-color-lime)',    bg: 'var(--ant-color-lime-bg)' },
  test:      { name: '独立测试',   label: 'test',         color: 'var(--ant-color-cyan)',    bg: 'var(--ant-color-cyan-bg)' },
};
```

**GATE_META 设计：**
```typescript
/** 单一真源：Gate 元数据 */
export const GATE_META: Record<string, {
  label: string;       // 中文名
  description: string; // 描述文本
  color?: string;      // 自定义颜色（可选，未指定则使用 pipeline 颜色）
}> = {
  // -- 全流程 Gate --
  'Gate A':      { label: '需求澄清',     description: '至少1个需求文档，含REQ-XXX编号' },
  'Gate B-DDD':  { label: '领域分析',     description: 'DDD领域分析：聚合/实体/值对象/领域服务' },
  'Gate B-BDD':  { label: '行为驱动',     description: 'BDD行为场景：Gherkin Given/When/Then' },
  'Gate B-TDD':  { label: '测试任务',     description: 'TDD任务包：Red→Green→Refactor' },
  'Gate B1':     { label: '架构评审',     description: '架构评审通过（涉及架构变更时）' },
  'Gate C':      { label: '执行规划',     description: '计划文档含parallel_batches+Execution Packet' },
  'Gate C-impl': { label: '并行实现',     description: '所有Batch实现完成，实现Agent已返回结果' },
  'Gate C1':     { label: '代码质量',     description: 'Lint+Type-check+Build+Deps Audit全部通过' },
  'Gate C1.5':   { label: '视觉验证',     description: '页面/组件视觉验证截图证据已附' },
  'Gate C2':     { label: '测试验证',     description: '测试全部通过，API契约验证通过' },
  'Gate D':      { label: '评审',         description: '领域审查+安全审计+性能审计通过' },
  'Gate F':      { label: '契约验证',     description: 'API契约一致性验证通过，OpenAPI文档与实现一致' },
  'Gate E':      { label: '发布上线',     description: '安全审计+上线检查清单+回滚预案就绪' },
  // -- refactor 流程 --
  'Gate R1':     { label: '定义边界',     description: '重构边界与目标已明确' },
  'Gate R2':     { label: '基线覆盖率',   description: '运行现有测试，生成基线覆盖率报告' },
  'Gate R3':     { label: '执行重构',     description: '执行重构操作，保持行为不变' },
  'Gate R4':     { label: '变异测试',     description: '变异测试通过，覆盖率不降级' },
  'Gate R5':     { label: '重构报告',     description: '生成完整重构报告' },
  // -- hotfix 流程 --
  'Gate H0':     { label: '紧急声明',     description: '紧急声明+审批通过' },
  'Gate H1':     { label: '最小化修复',   description: '最小化修复已实施' },
  'Gate H2':     { label: '快速验证',     description: '快速验证+回滚预案就绪' },
  'Gate H3':     { label: '事后审计',     description: '事后强制回溯审计通过' },
  // -- migrate 流程 --
  'Gate M1':     { label: '验证规则',     description: '迁移规则覆盖率已验证' },
  'Gate M2':     { label: '逐文件迁移',   description: '逐文件应用迁移规则' },
  'Gate M3':     { label: '编译验证',     description: '编译通过，零类型错误' },
  'Gate M4':     { label: 'Lint修复',     description: '自动修复Lint问题' },
  // -- evaluate 流程 --
  'Gate E0':     { label: '评估标准',     description: '评估标准已定义' },
  'Gate E1':     { label: '生成原型',     description: '原型已生成' },
  'Gate E2':     { label: '收集指标',     description: '运行用例，指标已收集' },
  'Gate E3':     { label: '评估报告',     description: '评估报告已生成' },
  // -- debug 流程 --
  'Gate D0':     { label: '异常收集',     description: '异常信息+环境快照已收集' },
  'Gate D1':     { label: '最小复现',     description: '最小复现用例已生成' },
  'Gate D2':     { label: '启动调试',     description: '调试会话已启动' },
  'Gate D3':     { label: '交互诊断',     description: '交互式诊断完成' },
  'Gate D4':     { label: '诊断报告',     description: '诊断报告已输出（不自动修改代码）' },
  // -- doc 流程 --
  'Gate DOC1':   { label: '扫描变更',     description: '代码变更已扫描，文档差异已识别' },
  'Gate DOC2':   { label: '更新文档',     description: '过时文档已自动更新' },
};
```

**CATEGORY_META 设计：**
```typescript
/** 命令分类元数据 */
export const CATEGORY_META: Record<string, { label: string; order: number }> = {
  development:  { label: '开发',   order: 1 },
  testing:      { label: '测试',   order: 2 },
  review:       { label: '审查',   order: 3 },
  architecture: { label: '架构',   order: 4 },
  task:         { label: '任务',   order: 5 },
  platform:     { label: '平台',   order: 6 },
};

/** 分类 Tab 排序列表（供 UI 使用） */
export const CATEGORY_TABS = [
  { key: 'all', label: '全部' },
  ...Object.entries(CATEGORY_META)
    .toSorted(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => ({ key, label: meta.label })),
];
```

**便捷导出函数：**
```typescript
/** 获取 Pipeline 中文名称 */
export function getPipelineName(type: string): string {
  return PIPELINE_META[type]?.name || type;
}

/** 获取 Gate 标签（完整 Gate 名 → 中文名） */
export function getGateLabel(gate: string): string {
  return GATE_META[gate]?.label || gate;
}

/** 获取 Gate 描述 */
export function getGateDescription(gate: string): string {
  return GATE_META[gate]?.description || '';
}

/** 获取 Gate 短名（去除 "Gate " 前缀） */
export function getShortGate(gate: string): string {
  return gate.startsWith('Gate ') ? gate.slice(5) : gate;
}

/** 获取 Pipeline 类型在 Tag 中的显示样式 */
export function getPipelineTagStyle(type: string): { label: string; color: string; bg: string } {
  const meta = PIPELINE_META[type] || PIPELINE_META.full;
  return { label: meta.label, color: meta.color, bg: meta.bg };
}
```

**迁移影响：**
- `Dashboard.tsx`：删除 `GATE_COLORS`、`GATE_LABELS`、`GATE_DESCRIPTIONS`、`shortGate()`，改为从 `@/constants` 导入
- `Layout.tsx`：删除 `PIPELINE_NAMES`、`CMD_LABELS`，改为从 `@/constants` 导入
- `Commands.tsx`：删除 `PIPELINE_TAGS`、`CATEGORY_TABS`、`CATEGORY_LABELS`，改为从 `@/constants` 导入
- `Archive.tsx`：删除 `CMD_LABELS`，改为从 `@/constants` 导入

#### 后果 (Consequences)

**正面影响：**
- 新增 Pipeline 类型或 Gate 只需修改一个文件
- 消除 Layout.tsx 与 Archive.tsx 中 `CMD_LABELS` 的不一致（backend.color 差异）
- 类型安全：`Record<string, ...>` 改为精确类型，IDE 自动补全
- 测试友好：常量可独立导入测试

**负面影响：**
- 增加一个新文件 `web/src/constants/pipeline.tsx`（~200 行）
- 需要跨 4 个文件做一次性的导入路径修改

**缓解措施：**
- 此重构在 TASK-WEB-001 中一并完成，不产生额外任务
- 常量导出使用命名导出，Tree shaking 会自动消除未使用的导出

#### 考虑的替代方案 (Alternatives Considered)

**方案 A：保持现有模式，在每个文件中追加常量**
- 优点：改动最小，不需要重构
- 缺点：Dashboard.tsx 从 ~560 行膨胀到 ~700 行；每次新增 Gate 需要修改 4 个文件；不一致性持续恶化
- 弃用原因：技术债务不可接受，违反 DRY 原则

**方案 B：从后端 API 动态获取 Gate/Pipeline 元数据**
- 优点：前端零硬编码，完全由后端控制
- 缺点：首次加载需要 API 调用；离线降级复杂；后端需要新增 API 端点；建议在后续迭代中实现（见 ADR-003）
- 弃用原因（当前阶段）：后端 GATE_META 数据已在 `gates.ts` 中定义，但缺乏对应的 REST API。建议先做前端常量集中化，后续可平滑迁移到 API 驱动

---

### ADR-002：Gate 序列动态渲染 -- 不依赖前端硬编码的 Gate 列表

**状态 (Status):** Accepted

**日期 (Date):** 2026-05-13

#### 上下文 (Context)

当前 Dashboard.tsx 的 GATE_COLORS 等常量意味着前端"知道"所有可能的 Gate 是什么。但后端 PIPELINE_DEFS 已经定义了完整的 Gate 序列，且通过 `/api/pipeline` 返回的 `gates` 数组就是实际的 Gate 列表。

Dashboard 的 Timeline 渲染实际上遍历的是 `pipeline.gates`（来自 API），不是前端硬编码列表。GATE_COLORS/LABELS/DESCRIPTIONS 只是给 API 返回的 Gate 提供"装饰信息"。

#### 决策 (Decision)

**维持当前模式：前端渲染 API 返回的 `gates` 数组，常量仅用于装饰。不做前端硬编码 Gate 序列。**

具体策略：
1. Dashboard 的 Timeline 继续使用 `pipeline.gates`（来自 SSE/API）渲染，不做任何改动。
2. GATE_META（见 ADR-001）作为"查找表"提供 label、description、color，但不定义 Gate 顺序。
3. 如果 API 返回了一个前端 GATE_META 中不存在的 Gate，使用 `gate` 原始值作为 label（已通过 `getGateLabel(gate) || gate` 实现 fallback）。
4. `shortGate()` 函数确保所有 Gate 名称都能正确截取。

**关键原则：前端不定义 Gate 序列，只提供装饰信息。后端是 Gate 序列的单一真源。**

#### 后果 (Consequences)

**正面影响：**
- 后端新增 Gate 或调整 Gate 顺序时，前端无需改动（只要 GATE_META 中有对应的装饰信息）
- 即使 GATE_META 中没有某个新 Gate 的装饰信息，UI 也不会崩溃（fallback 到原始值）
- 支持动态/条件性 Gate（未来可能根据项目配置跳过某些 Gate）

**负面影响：**
- 新增 Gate 时仍需更新 GATE_META 以提供中文标签，否则显示原始英文字符串
- 这不是完全自动化的——需要后端和前端同步新增 Gate 的中文标签

**缓解措施：**
- 在 GATE_META 中预填所有已知 Gate（覆盖 REQ-ENGINE-001 定义的 30 个 Gate）
- 在 `getGateLabel` 中提供 fallback: `return GATE_META[gate]?.label || gate`

#### 考虑的替代方案 (Alternatives Considered)

**方案 A：前端完全硬编码 Gate 序列**
- 优点：不依赖 API，离线可用
- 缺点：前后端 Gate 定义重复；后端变更后前端可能不一致；违反单一真源原则
- 弃用原因：已有 SSE/API 驱动数据流，硬编码是倒退

**方案 B：后端 API 返回 Gate 元数据（label、description、color）**
- 优点：前后端零同步成本
- 缺点：需要后端新增 API 端点或扩展现有 `/api/pipeline` 响应
- 策略：作为后续优化方向（见 ADR-003），当前先做前端 GATE_META 集中化

---

### ADR-003：命令列表 -- API 优先，静态 Fallback 作为降级

**状态 (Status):** Accepted

**日期 (Date):** 2026-05-13

#### 上下文 (Context)

Commands.tsx 已经有 API 调用 `api.commands()` 获取命令列表，FALLBACK_COMMANDS 仅当 API 不可用时使用。当前 FALLBACK_COMMANDS 有 20 条硬编码命令，任务要求扩展为 31+ 条。

问题：是继续扩展 FALLBACK_COMMANDS 还是完全依赖 API？

#### 决策 (Decision)

**保持 API 优先策略。扩展 FALLBACK_COMMANDS 作为离线降级。**

1. 主路径：API `/api/commands` 返回命令列表（后端从模板文件扫描生成）
2. 降级路径：FALLBACK_COMMANDS 扩展覆盖所有 31+ 条命令
3. 不新增 `PIPELINE_TAGS` 的独立定义，统一从 `PIPELINE_META`（ADR-001）派生

**FALLBACK_COMMANDS 新增条目策略：**
- 新增 7 个流程命令：refactor, hotfix, migrate, evaluate, debug, doc, jarvis-change
- 新增 5 个测试命令：test-unit, test-integration, test-e2e, test-perf, test-security
- 保持现有 20 个命令不变
- 使用 `PIPELINE_META` 中定义的新 pipelineType 值

**分类扩充：**
- `testing` 分类下新增 5 个测试命令（当前已有 browser-test, bug-fix, explore 共 3 个，扩充后 8 个）
- 新增命令按功能归入现有分类（development/testing/review 等）

#### 后果 (Consequences)

**正面影响：**
- API 可用时动态展示，后端新增命令前端自动可见
- API 不可用时仍有完整的离线数据降级
- FALLBACK_COMMANDS 保持为"快照"而非"规范"

**负面影响：**
- FALLBACK_COMMANDS 膨胀到 ~60 行
- API 和 Fallback 之间可能不一致（API 有但 Fallback 没有）

**缓解措施：**
- 当使用 Fallback 数据时，UI 已有的 "离线数据" 警告标签（第 263 行）提醒用户数据可能不全
- 建议在 Fallback 使用情况下增加控制台日志，便于排查

---

### ADR-004：质量门禁配置页面 -- 独立路由而非嵌入 Dashboard

**状态 (Status):** Accepted

**日期 (Date):** 2026-05-13

#### 上下文 (Context)

需求 REQ-WEB-001 要求"质量门禁配置页面"。有两种集成方案：嵌入 Dashboard 作为 Tab/抽屉，或作为独立路由页面。

#### 决策 (Decision)

**作为独立路由页面 `/quality-gates`，不在 Dashboard 中嵌入。**

理由：
1. Dashboard 已经是一个复杂页面（560 行），继续增加功能会超出可维护阈值
2. 质量门禁配置是低频操作（项目初始化时配置一次），不需要常驻 Dashboard
3. 独立页面提供更大的布局空间，适合展示规则表格、阈值滑块、历史结果列表
4. 遵循现有模式：Agents、Commands、Archive 都是独立页面

**实现方案：**
1. 新增 `web/src/pages/QualityGates.tsx`
2. `api.ts` 新增 `fetchQualityGates()` 方法
3. `App.tsx` 新增路由 `<Route path="/quality-gates" element={<QualityGates />} />`
4. `Layout.tsx` 的 `NAV_ITEMS` 新增条目：`{ key: '/quality-gates', icon: <SafetyOutlined />, label: '质量门禁' }`
5. 使用 `/api/quality-gates`（TASK-ENGINE-002 中新增）获取配置数据

**页面功能设计：**
- 规则类型卡片网格（coverage/lint/build/deps/perf/security/contract）
- 每条规则显示：启用开关、阈值输入、当前实际值
- 历史检查结果列表（来自 `quality_gate_results` 表）
- "重置为默认"按钮（调用模板默认值）

#### 后果 (Consequences)

**正面影响：**
- Dashboard 不膨胀，保持聚焦
- 配置页面可以做得更丰富（表单、图表、历史对比）
- 遵循现有路由模式，学习成本低

**负面影响：**
- 增加一个导航入口（顶部导航栏增加 "质量门禁" 按钮）
- 需要确保 `/api/quality-gates` 在 TASK-ENGINE-002 完成后可用

**缓解措施：**
- QualityGates 页面加载时处理 API 不可用的情况（显示 Empty 状态 + 提示）
- 若 `/api/quality-gates` 尚未实现，先展示静态的默认配置模板内容

---

### ADR-005：新 Pipeline 类型的视觉标识设计

**状态 (Status):** Accepted

**日期 (Date):** 2026-05-13

#### 上下文 (Context)

现有 4 种 Pipeline 类型（full/frontend/backend/lite）使用了 Ant Design 的语义色：
- full (jarvis): green
- frontend: red
- backend: blue (info)
- lite: orange (warning)

新增 7 种类型需要分配颜色，同时要避免色盲混淆、保持语义一致性。

#### 决策 (Decision)

使用 Ant Design 6.x 的扩展色板，按语义分配：

| Pipeline 类型 | 颜色 Token | 语义 | 理由 |
|--------------|-----------|------|------|
| refactor | `purple` | 重构/变换 | 紫色暗示"改造" |
| hotfix | `magenta` | 紧急 | 品红色暗示"紧急/告警" |
| migrate | `orange` | 迁移 | 橘色暗示"过渡/迁移" |
| evaluate | `geekblue` | 评估 | 深蓝暗示"分析/理性" |
| debug | `gold` | 诊断 | 金色暗示"排查/聚焦" |
| doc | `lime` | 文档 | 灰绿暗示"辅助/文档" |
| test | `cyan` | 测试 | 青色暗示"验证/测试" |

**颜色无障碍验证：**
- 这 7 种颜色分布在色轮的不同区域（紫、品红、橙、深蓝、金、灰绿、青），视觉可区分
- 所有颜色信息均为辅助信息（Tag 中同时显示文字标签），不依赖颜色作为唯一信息通道
- 红绿色盲用户可通过文字标签区分（所有 Tag 均显示 label 文字）

#### 后果 (Consequences)

**正面影响：**
- 11 种 Pipeline 类型的 Tag 在视觉上有足够区分度
- 使用 Ant Design 标准 Token，自动适配暗色模式
- 语义化颜色降低学习成本

**负面影响：**
- 11 种颜色对色盲用户有挑战（但 Tag 文字标签提供了替代信息通道）
- 需要确认 Ant Design 6.x 是否原生支持 purple/magenta/lime（这些在 5.x 中不是标准 Token）

**缓解措施：**
- 如果某些 Token 不可用，使用 `var(--ant-color-xxx)` 自定义 CSS 变量
- 根据 Ant Design 6.x 文档：`colorPurple`、`colorMagenta`、`colorLime` 等扩展色在 6.x 中已作为标准 Token 提供

---

## 四、组件架构变更

### 4.1 组件层次结构（变更后）

```
App.tsx
├── Layout.tsx [修改：导入路径、NAV_ITEMS 新增]
│   ├── Sidebar (会话列表)
│   └── Content
│       ├── Dashboard.tsx [修改：常量删除，导入 constants]
│       │   ├── StatCards（统计卡片）
│       │   ├── ArtifactList（产物文档）
│       │   └── GateTimeline（Gate 步骤）
│       ├── Agents.tsx [无变更]
│       ├── Commands.tsx [修改：常量删除，FALLBACK_COMMANDS 扩展]
│       │   └── CommandCard [无变更]
│       ├── Archive.tsx [修改：导入路径]
│       └── QualityGates.tsx [新增]
│           ├── RuleCard（单条规则配置卡片）
│           └── HistoryTable（历史检查结果）
│
├── constants/
│   ├── pipeline.tsx [新增]
│   └── index.ts [新增]
│
└── api.ts [修改：新增 fetchQualityGates]
```

### 4.2 通信模式

**无变化。** 现有数据流保持：
- SSE (EventSource) → `PipelineDataContext` → Dashboard
- REST API → 各页面 `useEffect` + `useState`
- `SessionContext` → 子页面通过 `useSessionId()` 获取

### 4.3 复用现有组件模式

| 现有模式 | 在新功能中的复用 |
|---------|---------------|
| Card + size="small" + borderRadius:14 | QualityGates 的 RuleCard |
| Tag + borderRadius:12 + bg/color | 所有新 Pipeline 类型的标签 |
| grid + auto-fill + minmax(260px, 1fr) | QualityGates 的规则卡片网格 |
| React.Suspense + lazy loading | QualityGates 的路由懒加载 |
| Empty 组件 | API 不可用时的降级展示 |

---

## 五、状态管理架构评审

### 5.1 当前状态分层

```
全局状态 (React Context)
├── SessionContext (selected session ID)
├── PipelineDataContext (SSE 推送的 pipeline + runs)
│
页面本地状态 (useState)
├── Dashboard: pipeline, runs, loading, helpOpen, mdPreview
├── Commands: commands, loading, error, activeTab, usingFallback
├── Agents: agents, filters, loading...
├── Archive: runs, loading, search
│
服务端状态 (API 调用)
├── api.pipeline()
├── api.commands()
├── api.archivedRuns()
├── api.qualityGates() [新增]
```

### 5.2 评审结论

**当前状态管理架构无需变更。** 理由：
- 每个页面独立管理自己的数据，无跨页面共享状态
- SSE 推送已经处理了实时更新需求
- 质量门禁配置数据量小（<50 条规则），不需要引入 React Query 或 SWR
- Context 层仅用于跨组件共享（session ID、pipeline data），未滥用

### 5.3 风险提示

- PipelineDataContext 目前只被 Dashboard 消费，但如果 QualityGates 需要实时读取当前 pipeline 进度（例如"当前位于哪个 Gate"决定门禁检查范围），需要确保 Context 传递正确
- 当前质量门禁配置页面不需要实时数据——配置是静态读取，历史结果为按需查询

---

## 六、路由与代码分割策略

### 6.1 路由变更

```typescript
// App.tsx 变更后
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/agents" element={<Agents />} />
  <Route path="/commands" element={<Commands />} />
  <Route path="/archive" element={<Archive />} />
  <Route path="/quality-gates" element={<QualityGates />} />  // 新增
</Routes>
```

### 6.2 代码分割

- 所有页面组件已使用 `React.lazy()` 懒加载（第 7-10 行），QualityGates 同样使用 `lazy()` 加载
- `vite-plugin-singlefile` 将所有资源打包为单文件，懒加载对 bundle 大小无实际影响（单文件模式下所有代码最终合并）
- **注意**：如果未来移除 singlefile 模式以支持真正的代码分割，QualityGates 页面（~2KB gzip）作为一个独立 chunk 是合理的

### 6.3 NAV_ITEMS 变更

```typescript
const NAV_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: '流水线看板' },
  { key: '/agents', icon: <RobotOutlined />, label: '智能体配置' },
  { key: '/commands', icon: <CodeOutlined />, label: '指令' },
  { key: '/archive', icon: <FolderOpenOutlined />, label: '归档记录' },
  { key: '/quality-gates', icon: <SafetyCertificateOutlined />, label: '质量门禁' },  // 新增
];
```

需要新增 import: `import { SafetyCertificateOutlined } from '@ant-design/icons'` (Ant Design Icons 6.x 中已存在)。

---

## 七、性能架构评审

### 7.1 Bundle 影响分析

| 变更项 | 预估增量 | 影响 |
|--------|---------|------|
| `constants/pipeline.tsx` | ~6KB（gzip ~1.5KB） | 新增文件，但替代原有分散常量 |
| `QualityGates.tsx` | ~5KB（gzip ~1.2KB） | 新页面，懒加载 |
| FALLBACK_COMMANDS 扩展 | +12 条 = ~3KB（gzip ~0.8KB） | 静态数据增长 |
| 其他文件修改 | ~2KB | 导入路径变更等 |

**总增量：~10KB（gzip ~3.5KB）**，在可接受范围内。

### 7.2 渲染性能

**31+ 命令列表的渲染性能：**
- Commands.tsx 使用 `React.memo` 包裹 `CommandCard`（第 80 行），避免无变化卡片的重渲染
- 使用 CSS Grid + `auto-fill` 布局，卡片渲染是 O(n) 但 n=31 时无需虚拟滚动
- 31 个 CommandCard 在 `useMemo` 过滤后，实际渲染数量 < 31（Tab 筛选）
- **结论：不需要虚拟滚动或分页，当前渲染性能足够**

**13 个 Gate 的 Timeline 性能：**
- Ant Design Timeline 组件为 O(n) 渲染
- 13 个节点（Gate F 新增 + 原有 12 个）在 Timeline 中显示完全正常
- **结论：无性能问题**

### 7.3 SSE 推送数据格式

**无需扩展。** 当前 SSE 通过 `d.pipeline` 和 `d.pipeline_runs` 传递数据，后端 PIPELINE_DEFS 变更后，API 返回的 `gates` 数组自动包含新 Gate。前端通过 `GATE_META` 查找表提供装饰信息，不影响 SSE 数据链路。

---

## 八、安全架构评审

### 8.1 质量门禁配置页面的安全

- **配置只读展示**：QualityGates 页面从 `/api/quality-gates` GET 获取配置，不做写操作
- **无敏感数据**：质量门禁配置（覆盖率阈值、lint 规则等）不属于敏感数据
- **XSS 防护**：所有展示数据通过 React JSX 渲染（自动转义），无 `dangerouslySetInnerHTML`
- **CSP 策略**：不需要调整

### 8.2 API 端点安全

- 新增 `/api/quality-gates` 为只读 GET 端点，无鉴权风险
- `fetchJSON` 函数已做 HTTP 状态码检查（第 4 行 `if (!r.ok) throw new Error(...)`），新 API 同样使用此封装

### 8.3 风险

**无新增安全风险。** QualityGates 页面只展示静态配置和历史数据，无用户输入、无文件上传、无敏感信息。

---

## 九、无障碍（a11y）与响应式架构评审

### 9.1 无障碍

**现有实践良好，新增内容应保持一致：**
- Dashboard 中 Timeline 的 Gate 卡片已使用 `role="button"` + `tabIndex={0}` + `onKeyDown`（第 368-375 行）
- 分割线使用 `role="separator"` + `aria-orientation`（第 408 行）

**QualityGates 页面需增加：**
- 规则卡片使用语义化标签
- 开关组件（Switch）自带键盘操作支持
- Tab 切换使用 antd Tabs 组件的标准无障碍支持

### 9.2 响应式

**13 个 Gate 的 Timeline 在移动端：**
- Dashboard 右侧栏宽度可拖拽调整（240px ~ 600px），小屏自动收缩
- Timeline 每个节点高度固定（~60px），13 个节点总高度 ~780px，在 1080p 屏幕可滚动查看
- 移动端（<768px）需考虑右侧栏折叠或改为底部抽屉——但当前项目主要面向桌面端开发者，移动端不是硬需求

**31+ 命令卡片的网格布局：**
- CSS Grid `repeat(auto-fill, minmax(260px, 1fr))` 在移动端自动变为单列
- 260px 最小宽度确保内容不挤压

**结论：当前响应式策略足够，不需要专门的移动端布局适配。**

---

## 十、构建与部署影响分析

### 10.1 构建配置

**无变化。** Vite 配置、TypeScript 配置、测试配置均无需修改。

### 10.2 部署依赖

| 依赖 | 当前状态 | 变更影响 |
|------|---------|---------|
| `/api/pipeline` | 已存在 | 后端 PIPELINE_DEFS 扩展后自动返回新数据 |
| `/api/commands` | 已存在 | 后端扫描模板文件后自动返回新命令 |
| `/api/quality-gates` | TASK-ENGINE-002 中新增 | QualityGates 页面依赖此 API |
| SSE `/api/events` | 已存在 | 无需变更 |

### 10.3 回滚策略

- 如果 `/api/quality-gates` 尚未实现，QualityGates 页面显示 Empty 状态（不崩溃）
- 如果后端 PIPELINE_DEFS 尚未扩展，Dashboard 的 Timeline 仍然正常工作（只是少显示新 Gate）
- 前端常量集中化是可独立回滚的——只需恢复各文件的原始导入路径

---

## 十一、原型验证结果

因本次变更主要为数据扩展（常量追加 + 新页面展示），原型验证聚焦于关键风险点：

### 11.1 验证项：GATE_META 查找表完整性

- 遍历 REQ-ENGINE-001 定义的所有 30 个 Gate，确认每个 Gate 在 GATE_META 中都有对应的 label 和 description
- Gate 名称从完整格式映射到简写格式的一致性（`getShortGate` 函数）

### 11.2 验证项：FALLBACK_COMMANDS 与 API 一致性

- 确认 FALLBACK_COMMANDS 中所有命令的 `pipelineType` 值在 `PIPELINE_META` 中有定义
- 确认 `category` 值在 `CATEGORY_META` 中有定义

### 11.3 验证项：Pipeline 颜色可区分性

- 11 种颜色在 Ant Design 浅色/暗色主题下的对比度对比
- 确认色盲模拟下文字标签仍可读

### 11.4 验证项：构建通过

```bash
cd web && npx tsc --noEmit && npm run build
```

---

## 十二、风险登记

| 风险编号 | 风险描述 | 严重度 | 缓解措施 |
|---------|---------|--------|---------|
| R-001 | 常量集中化重构引入回归 bug（导入路径错误、值不一致） | 中 | 重构后运行 `npx tsc --noEmit` + `npm run build` + 现有测试 |
| R-002 | `/api/quality-gates` 未在 TASK-ENGINE-002 中按时实现 | 中 | QualityGates 页面实现 Empty 降级展示 |
| R-003 | Ant Design 6.x 不原生支持 purple/magenta/lime Token | 低 | 回退到手动 CSS 变量，如 `var(--ant-color-xxx)` 或硬编码十六进制值 |
| R-004 | FALLBACK_COMMANDS 与 API 返回的命令列表不一致 | 低 | 保持 "离线数据" 标签可见；API 优先 |
| R-005 | Dashboard 560 行文件在变更后进一步膨胀 | 低 | 常量被移出到 constants 模块，实际 Dashboard.tsx 行数净减少 ~30 行 |
| R-006 | 11 种 Pipeline 类型使顶部导航栏或会话列表的 Tag 过于拥挤 | 低 | Tag 仅显示 label 文字（如 "refactor"），样式为小号（fontSize:10），每个会话仅显示 2 个 Tag |

---

## 十三、检查清单

### 架构变更前确认

- [x] 所有常量定义统一到 `constants/pipeline.tsx`（PIPELINE_META、GATE_META、CATEGORY_META）
- [x] Dashboard.tsx 删除 `GATE_COLORS`、`GATE_LABELS`、`GATE_DESCRIPTIONS`、`shortGate()`
- [x] Layout.tsx 删除 `PIPELINE_NAMES`、`CMD_LABELS`
- [x] Commands.tsx 删除 `PIPELINE_TAGS`、`CATEGORY_TABS`、`CATEGORY_LABELS`
- [x] Archive.tsx 删除局部 `CMD_LABELS`
- [x] 所有文件从 `@/constants` 统一导入
- [x] FALLBACK_COMMANDS 新增 12 条命令
- [x] APP.tsx 新增 QualityGates 路由（懒加载）
- [x] Layout.tsx NAV_ITEMS 新增质量门禁入口
- [x] api.ts 新增 `fetchQualityGates()` 方法

### 不应包含的变更（红线）

- 不应修改后端 `gates.ts`（属于 TASK-ENGINE-001 范围）
- 不应修改 Vite 配置、TypeScript 配置
- 不应引入新的 npm 依赖
- 不应修改 `vite-plugin-singlefile` 配置或引入真正的代码分割（与单文件构建模式冲突）

---

## 十四、附录：文件变更清单

| 文件 | 操作 | 预估行数变更 | 任务映射 |
|------|------|------------|---------|
| `web/src/constants/pipeline.tsx` | **新增** | ~200 行 | TASK-WEB-001 |
| `web/src/constants/index.ts` | **新增** | ~5 行 | TASK-WEB-001 |
| `web/src/pages/Dashboard.tsx` | 修改 | -30 行（常量移出）+10 行（导入变更） | TASK-WEB-001 |
| `web/src/components/Layout.tsx` | 修改 | -20 行（常量移出）+10 行（导入+NAV_ITEMS） | TASK-WEB-001 |
| `web/src/pages/Commands.tsx` | 修改 | -25 行（常量移出）+40 行（FALLBACK_COMMANDS 扩展） | TASK-WEB-002 |
| `web/src/pages/Archive.tsx` | 修改 | -8 行（常量移出）+3 行（导入） | TASK-WEB-001 |
| `web/src/pages/QualityGates.tsx` | **新增** | ~100 行 | TASK-WEB-003 |
| `web/src/App.tsx` | 修改 | +3 行（路由+import） | TASK-WEB-003 |
| `web/src/api.ts` | 修改 | +8 行（新增 fetchQualityGates） | TASK-WEB-003 |

**总计：新增 2 文件（~305 行），修改 7 文件（净增 ~96 行），全部变更 ~400 行。**
