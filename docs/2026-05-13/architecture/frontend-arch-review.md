# 前端架构评审：贾维斯 Web 面板测试体系化升级适配

> **评审范围**: REQ-019 Web 面板同步适配 (TASK-020)
> **评审日期**: 2026-05-13
> **评审者**: frontend-architect
> **相关文档**:
> - 需求: `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md`
> - DDD: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-ddd.md`
> - 任务: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-tasks.md`
> **产出**: 风险点 + 建议 + 组件拆分方案

---

## 1. 架构评审范围

本评审聚焦于 React SPA 前端（`web/src/`）适配 TASK-001 引入的 5 条新流水线类型和 10+ 个新指令。评审覆盖以下文件：

| 文件 | 当前大小 | 所需变更类型 |
|------|---------|------------|
| `web/src/pages/Dashboard.tsx` | 27KB / 560 行 | 拆分重构 + Gate 配置扩展 |
| `web/src/pages/Commands.tsx` | 13KB / 323 行 | 新增指令条目 + 分类扩展 |
| `web/src/pages/Agents.tsx` | 17KB / 429 行 | Pipeline 类型筛选扩展 |
| `web/src/pages/Archive.tsx` | 7KB / 209 行 | Pipeline 类型筛选 + 标签扩展 |
| `web/src/components/Layout.tsx` | 19KB / 514 行 | Pipeline 标签配置扩展 |
| `web/src/pages/matchPipelineType.ts` | 1KB / 54 行 | 新增 5 种 pipeline 匹配 |
| `web/src/api.ts` | 3KB / 184 行 | 不变 |
| `web/src/theme.tsx` | 1KB / 33 行 | 不变 |

后端同步依赖（不在前端修改范围，但必须识别）：`src/web/routes.ts` 中的 `inferPipelineType()` 和 `inferCategory()` 函数需同步更新。

---

## 2. 风险清单

### R1（高危）：Dashboard.tsx 的 Gate 配置硬编码瓶颈

**位置**: `web/src/pages/Dashboard.tsx` 第 25-51 行

**现状**:
```typescript
const GATE_COLORS: Record<string, string> = {
  A: 'var(--ant-color-primary)', B: 'var(--ant-color-primary)', C: 'var(--ant-color-primary)',
  C1: 'var(--ant-color-success)', 'C1.5': 'var(--ant-color-text)', C2: 'var(--ant-color-error)',
  D: 'var(--ant-color-primary)', E: 'var(--ant-color-primary)',
};

const GATE_LABELS: Record<string, string> = {
  A: '需求澄清', 'B-DDD': '领域分析', 'B-BDD': '行为驱动', 'B-TDD': '测试任务',
  B1: '架构评审', C: '执行规划',
  'C-impl': '并行实现', C1: '代码质量', 'C1.5': '视觉验证', C2: '测试验证',
  D: '评审', E: '发布上线',
};

const GATE_DESCRIPTIONS: Record<string, string> = {
  // ... 12 条 Gate 描述
};
```

**冲突**: TASK-001 将注册 22 个新 Gate：
- `refactor`: R1, R2, R3, R4, R5 (5 个)
- `hotfix`: H0, H1, H2, H3 (4 个)
- `migrate`: M1, M2, M3, M4 (4 个)
- `evaluate`: E0, E1, E2, E3 (4 个)
- `debug`: D0, D1, D2, D3, D4 (5 个)

**影响**:
- `GATE_COLORS` 从 9 个条目膨胀至 30+ 个
- `GATE_LABELS` 同等膨胀
- `GATE_DESCRIPTIONS` 同等膨胀
- Dashboard.tsx 从 27KB 推向 35KB+，超出可维护阈值
- 所有配置耦合在组件内，缺少关注点分离

**建议**:
1. 提取 Gate 配置到独立文件 `web/src/constants/gateConfig.ts`
2. 按 `pipelineType` 维度分组组织，不同流水线使用不同颜色/标签
3. 新建 `web/src/constants/pipelineConfig.ts` 统一 pipeline 类型元数据

---

### R2（高危）：Gate 命名空间冲突

**位置**: `web/src/pages/Dashboard.tsx` 第 21-23 行的 `shortGate()` 函数

**冲突矩阵**:

| 现有 Gate | 新 Gate | 所属流水线 | 冲突性质 |
|-----------|---------|-----------|---------|
| Gate D (评审) | D0, D1, D2, D3, D4 | debug | 首字母相同，`shortGate('Gate D')` = `shortGate('D0')` = `'D'` |
| Gate E (发布上线) | E0, E1, E2, E3 | evaluate | 首字母相同，存在相同风险 |

**补充说明**: R1/H0 等新 Gate 不存在首字母冲突（full 流水线无 R/H/M 等 Gate），M1/M2/M3/M4 也无冲突。

**`shortGate` 截断逻辑分析**:
```typescript
function shortGate(gate: string): string {
  return gate.startsWith('Gate ') ? gate.slice(5) : gate;
}
```
- `'Gate D'` → `'D'`
- `'D0'` → `'D0'`
- 两者键值不同，`GATE_COLORS['D']` vs `GATE_COLORS['D0']` 不会冲突
- 但在 `GATE_LABELS` 中，`'D'` 和 `'D0'` 并存时不会互相覆盖（键值不同）

**更正分析**: 由于 `shortGate` 保留新 Gate 的原始标识（`D0` 不含 `Gate ` 前缀），实际运行中不存在键冲突。风险降级为设计建议——用于区分不同 pipeline 的同字母 Gate，方便用户理解。

**建议**:
1. **推荐方案**: 前后端约定新 Gate 使用全限定名 `pipelineType:gateName`（如 `debug:D0`、`evaluate:E0`）
2. 前端按 `:` 分割展示：前缀为流水线类型标签，后缀为 Gate 步骤名
3. 如果引擎层不修改，前端在 Dashboard 接收数据后自行拼接前缀（基于 `pipeline.pipeline_type`）

---

### R3（中危）：Commands.tsx 分类体系扩容不足

**位置**: `web/src/pages/Commands.tsx` 第 52-60 行 (`CATEGORY_TABS`) + `web/src/pages/Commands.tsx` 第 16-37 行 (`FALLBACK_COMMANDS`)

**现状**: 仅 6 个分类 Tab（全部/开发/测试/审查/架构/任务/平台），FALLBACK_COMMANDS 仅 20 条命令。

**新增 12+ 条指令的分类需求**:

| 指令 | 应归属分类 | 后端 `inferCategory()` 能否识别 |
|------|-----------|-------------------------------|
| `/test-unit` | testing | 能 (`/test/` 正则) ✅ |
| `/test-integration` | testing | 能 ✅ |
| `/test-e2e` | testing | 能 ✅ |
| `/test-perf` | testing | 能 ✅ |
| `/test-security` | testing | 能 ✅ |
| `/refactor` | refactoring（新建） | 不能 ❌（归入 development） |
| `/hotfix` | operations（新建） | 不能 ❌ |
| `/migrate` | operations（新建） | 不能 ❌ |
| `/evaluate` | research（新建） | 不能 ❌ |
| `/debug` | operations（新建） | 不能 ❌ |
| `/doc` | documentation（新建） | 不能 ❌ |
| `/jarvis-change` | development | 能 ✅ |

**建议**:
1. 新增 3 个分类 Tab（视团队决策可合并）：
   - **refactoring**（重构）：`/refactor`
   - **operations**（运维）：`/hotfix`、`/migrate`、`/debug`
   - **documentation**（文档）：`/doc`
   - **research**（研究评估）：`/evaluate`
2. 后端 `inferCategory()` 同步新增正则匹配（见后端依赖说明）
3. `FALLBACK_COMMANDS` 新增 12 条命令条目，含 description / argumentHint / pipelineType

---

### R4（中危）：Layout.tsx 的 Pipeline 标签系统需扩展（5 处影响点）

**位置**: 涉及 5 个文件中的 pipeline 类型映射

**需新增的 5 种 pipeline 类型**:

| Pipeline 类型 | 显示名称 | 建议颜色令牌 | 十六进制色 |
|--------------|---------|------------|-----------|
| refactor | 重构 | `var(--ant-color-geekblue)` | `#2f54eb` |
| hotfix | 热修复 | `var(--ant-color-error)` | `#ff4d4f` |
| migrate | 迁移 | `var(--ant-color-purple)` | `#722ed1` |
| evaluate | 评估 | `var(--ant-color-cyan)` | `#13c2c2` |
| debug | 调试 | `var(--ant-color-orange)` | `#fa8c16` |

**受影响文件清单**:

| 文件 | 需修改的映射 | 当前条目数 |
|------|------------|-----------|
| `Layout.tsx:72-77` `PIPELINE_NAMES` | 新增 5 条 | 4 条 |
| `Layout.tsx:79-84` `CMD_LABELS` | 新增 5 条（含 bg 色） | 4 条 |
| `Commands.tsx:44-49` `PIPELINE_TAGS` | 新增 5 条（含 bg 色） | 4 条 |
| `Archive.tsx:12-17` `CMD_LABELS` | 新增 5 条 | 4 条 |
| `matchPipelineType.ts` | 新增 5 个 switch case | 8 个 case |

**建议**: 创建 `web/src/constants/pipelineConfig.ts` 统一管理上述配置，5 个文件改为引用同一数据源，消除重复定义。

---

### R5（中危）：Dashboard.tsx 单文件体积过大，需拆分

**现状**: 27KB，560 行，包含以下关注点：
- Gate 配置常量和映射（~50 行）
- Markdown 渲染懒加载逻辑（~40 行）
- 工具函数（formatTime、formatDurationDisplay、shortGate）（~20 行）
- SSE + API 数据获取与合并（~60 行）
- 拖拽调整逻辑（~30 行）
- 状态管理（~20 行）
- UI 渲染：统计卡片、产物卡片、Gate Timeline、历史 Runs、帮助弹窗（~340 行）

**评估**: 新增 22 个 Gate + 5 种 pipeline 类型后预计膨胀至 800+ 行（约 40KB），严重违反单一职责原则。

**建议的组件拆分方案**:

```
web/src/
├── constants/
│   ├── gateConfig.ts          [新建] Gate 颜色/标签/描述（按 pipelineType 分组，~150行）
│   └── pipelineConfig.ts      [新建] Pipeline 类型名称/颜色/标签，~80行
├── components/
│   ├── Layout.tsx             [修改] 引用 pipelineConfig
│   ├── GateTimeline.tsx        [新建] Gate 步骤时间线，~120行
│   ├── ArtifactCard.tsx        [新建] 产物文档卡片，~80行
│   ├── MarkdownPreview.tsx    [新建] Markdown 预览模态，~100行
│   └── ErrorBoundary.tsx      [不变]
├── hooks/
│   └── usePipelineData.ts     [新建] 流水线数据获取 + SSE 合并，~40行
├── pages/
│   ├── Dashboard.tsx          [瘦身] 主骨架（~250行），引用拆分子组件
│   ├── Commands.tsx           [修改] ~80行新增
│   ├── Agents.tsx             [修改] ~20行新增
│   ├── Archive.tsx            [修改] ~30行新增
│   └── matchPipelineType.ts   [修改] ~25行新增
```

**拆分后 Dashboard.tsx 预计体积**: ~250 行（减少 55%）

---

### R6（低危）：Agents.tsx 的 Pipeline 类型匹配需扩展

**位置**: `web/src/pages/matchPipelineType.ts`

**现状**: `matchPipelineType()` 支持 8 种流程分类（全流程/前端/后端/轻量/移动端/架构/测试/审查），但缺少新增的 5 种类型。

**需新增的 case**:

```typescript
case '重构':
  return idLower.includes('refactor');
case '热修复':
  return idLower.includes('hotfix');
case '迁移':
  return idLower.includes('migrate');
case '评估':
  return idLower.includes('evaluate');
case '调试':
  return idLower.includes('debug');
```

**影响**: 若 Agent 列表有与这些新增类型关联的 Agent（如 `refactor-dev-expert`），当前无法按流程分类筛选。

**现有覆盖检查**:
- `matchFunctionRole()` 的"测试者"正则 `idIncludes('-test-')` 可覆盖新增的 test-* Agent ✅
- `matchFunctionRole()` 的"编排者"列表需要补充 refactor/hotfix/migrate/evaluate/debug 标识 ❌

---

### R7（低危）：Archive.tsx 缺少 Pipeline 类型筛选

**位置**: `web/src/pages/Archive.tsx`

**现状**: 仅有文本搜索（搜索 task_name / session_id），无按 pipeline 类型筛选。当 5 种新 pipeline 类型上线后，用户需在大量混合归档记录中手动查找。

**建议**: 在搜索框旁新增 Pipeline 类型下拉筛选器（复用 `pipelineConfig.ts` 中的类型列表），参考 `Agents.tsx` 的筛选 UI 模式。

---

### R8（信息）：后端 API 层同步变更点（前端依赖）

**位置**: `src/web/routes.ts`（后端代码，不在前端修改范围）

以下后端函数需要同步更新才能支撑前端正确展示：

| 函数 | 当前逻辑 | 所需变更 | 影响前端 |
|------|---------|---------|---------|
| `inferPipelineType()` (第 835-841 行) | 仅识别 full/frontend/backend/lite | 新增识别 refactor/hotfix/migrate/evaluate/debug | Commands API 返回的 `pipelineType` 字段 |
| `inferCategory()` (第 848-855 行) | 正则: `test|explore|bug→testing`, `review→review`, `architect→architecture`, `task-→task`, 平台→platform, 其余→development | 新增 `refactor→refactoring`, `hotfix|migrate|debug→operations`, `evaluate→research`, `doc→documentation` | Commands API 返回的 `category` 字段 |
| GET `/api/commands` | 已能自动读取 `.claude/commands/*.md` | 无需代码变更 ✅ | - |
| GET `/api/pipeline` | 已能从 `getPipelineGates(pt)` 动态获取 Gate 序列 | 无需代码变更 ✅（依赖 TASK-001 在 `PIPELINE_DEFS` 中正确注册） | - |

---

## 3. 架构决策记录 (ADR)

### ADR-0001: Gate 配置提取到独立常量文件

**状态 (Status)**: Proposed
**日期 (Date)**: 2026-05-13
**决策者 (Deciders)**: @frontend-architect

**上下文 (Context)**:
Dashboard.tsx 当前将 `GATE_COLORS`、`GATE_LABELS`、`GATE_DESCRIPTIONS` 硬编码在组件文件内。随着 TASK-001 新增 22 个 Gate（refactor 5 个、hotfix 4 个、migrate 4 个、evaluate 4 个、debug 5 个），这些映射的总数将从 12 个膨胀至 30+ 个，Dashboard.tsx 将超过 800 行。此外，多个文件（Layout.tsx、Commands.tsx、Archive.tsx）各自定义了重复的 pipeline 类型映射。

**决策 (Decision)**:
将 Gate 配置和 Pipeline 类型配置提取为独立常量文件：
- `web/src/constants/gateConfig.ts`：Gate 颜色/标签/描述，按 `pipelineType` 分组
- `web/src/constants/pipelineConfig.ts`：Pipeline 类型名称、颜色令牌、标签的统一配置

**后果 (Consequences)**:
- **正面**: 消除重复定义，Dashboard.tsx 体积减少 ~200 行，单一事实来源，新增 pipeline 或 Gate 只需修改一个文件
- **负面**: 新增两个文件，初始时需要迁移现有映射关系
- **缓解**: 迁移过程仅涉及移动代码，不改逻辑，可通过类型检查验证正确性

**考虑的替代方案 (Alternatives Considered)**:
- **方案 A: 保持硬编码在 Dashboard.tsx 中**: 最简单但不可持续，文件将膨胀至 800+ 行
- **方案 B: 后端 API 提供配置**: 灵活性高但增加网络请求和首屏等待时间，配置属于静态数据不适合动态获取
- **弃用理由**: 方案 A 不可维护，方案 B 过度设计

---

### ADR-0002: Dashboard 组件拆分策略

**状态 (Status)**: Proposed
**日期 (Date)**: 2026-05-13
**决策者 (Deciders)**: @frontend-architect

**上下文 (Context)**:
Dashboard.tsx 当前为 560 行的单体组件，包含 5 个关注点（Gate Timeline、产物卡片、Markdown 预览、统计卡片、帮助弹窗）。新增 5 条流水线类型后可视化逻辑显著增长。

**决策 (Decision)**:
按关注点拆分为 4 个子组件：
- `GateTimeline.tsx`：Gate 步骤 Timeline + Progress（~120 行）
- `ArtifactCard.tsx`：产物文档卡片网格（~80 行）
- `MarkdownPreview.tsx`：Markdown 预览模态 + react-markdown 懒加载（~100 行）
- `usePipelineData.ts`：数据获取与 SSE 合并 Hook（~40 行）

Dashboard.tsx 保留为骨架组件（~250 行），负责布局编排和统计卡片渲染。

**后果 (Consequences)**:
- **正面**: 每个组件职责单一，可独立测试，可独立懒加载，后续维护范围可控
- **负面**: 文件数量增加，组件间需要通过 props 传递数据
- **缓解**: 使用 React Context（已有的 `SessionContext` 和 `PipelineDataContext`）减少 props drilling

**考虑的替代方案 (Alternatives Considered)**:
- **方案 A: 不拆分，忍受大文件**: 问题将在每次新增 Gate 时加剧，不可持续
- **方案 B: 拆分为更多小组件（10+ 个）**: 过度拆分，增加理解成本
- **弃用理由**: 方案 A 不可维护，方案 B 过度设计

---

## 4. 颜色方案设计

### 4.1 现有流水线 Gate 颜色（保持不变）

现有 `GATE_COLORS` 基于 Ant Design 5 语义令牌，维持 `var(--ant-color-*)` 主题联动：

| Gate | 颜色 | 含义 |
|------|------|------|
| A, B, C | `--ant-color-primary` | 分析/规划阶段（蓝色） |
| C1, C1.5 | `--ant-color-success` / `--ant-color-text` | 质量验证 |
| C2 | `--ant-color-error` | 测试验证（红色，强调必须通过） |
| D, E | `--ant-color-primary` | 评审/发布 |

### 4.2 新增流水线 Gate 颜色方案

每条独立流水线使用独特的 Ant Design 语义颜色令牌，与主题系统自动联动：

| 流水线 | Gate 范围 | Ant Design 令牌 | hex 值 | 语义理由 |
|--------|----------|----------------|--------|---------|
| refactor | R1-R5 | `--ant-color-geekblue` | `#2f54eb` | 极客蓝 — 代表技术精进、代码改善 |
| hotfix | H0-H3 | `--ant-color-error` | `#ff4d4f` | 红色 — 代表紧急、P0 故障 |
| migrate | M1-M4 | `--ant-color-purple` | `#722ed1` | 紫色 — 代表版本迁移、框架变更 |
| evaluate | E0-E3 | `--ant-color-cyan` | `#13c2c2` | 青色 — 代表探索、评估、非破坏性 |
| debug | D0-D4 | `--ant-color-orange` | `#fa8c16` | 橙色 — 代表问题诊断、警告 |

**实现方式**: 在 `gateConfig.ts` 中，每个 pipeline 类型下的所有 Gate 使用统一的主色调，通过 Timeline 组件的 `color` 属性渲染，已通过和未通过的 Gate 使用不同的透明度级别区分。

---

## 5. 响应式与无障碍兼容性

### 5.1 现有兼容性评估

| 组件 | 响应式策略 | 状态 |
|------|-----------|------|
| Dashboard 统计卡片 | `flexWrap: 'wrap'` + `minWidth: 120` | ✅ |
| Commands 卡片网格 | `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` | ✅ |
| Agents 卡片网格 | `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` | ✅ |
| Layout 侧边栏 | `collapsed` 状态可折叠 | ✅ |
| Dashboard 拖拽分割栏 | `onMouseDown` 事件 | ❌ 缺少触摸事件 |

### 5.2 待整改项

- **拖拽分割栏**: 新增 `onTouchStart`/`onTouchMove`/`onTouchEnd` 事件处理（与鼠标事件平行）
- **Gate Timeline**: 在窄屏（<400px）时可能溢出，建议 `overflow-x: auto`
- **新增 Gate 图标**: 确保每个 Gate 节点有语义化的 `aria-label`，值使用 Gate 中文标签
- **Pipeline 类型标签**: 颜色对比度需通过 WCAG AA 标准（建议文字与背景色对比度 >= 4.5:1）

---

## 6. 性能影响分析

| 变更 | 影响范围 | 评估 |
|------|---------|------|
| Dashboard.tsx 拆分为 4 个子组件 | 首屏 JS bundle | 懒加载后减少 ~40KB 首屏体积 |
| Commands.tsx 新增 12 条指令 | 渲染性能 | 无影响（总量 < 50 条，无需虚拟化） |
| SSE 数据流新增 pipeline 类型 | 网络负载 | 无影响（数据结构与现有一致，仅多 5 种 `pipeline_type` 值） |
| gateConfig.ts + pipelineConfig.ts | Tree-shaking | 常量导出确保未被引用的配置不进入 bundle |

---

## 7. 改动汇总

### 7.1 前端文件变更清单

| 文件 | 操作 | 预计行数 | 风险 |
|------|------|---------|------|
| `web/src/constants/gateConfig.ts` | **新建** | ~150 | 低 |
| `web/src/constants/pipelineConfig.ts` | **新建** | ~80 | 低 |
| `web/src/components/GateTimeline.tsx` | **新建** | ~120 | 低 |
| `web/src/components/ArtifactCard.tsx` | **新建** | ~80 | 低 |
| `web/src/components/MarkdownPreview.tsx` | **新建** | ~100 | 低 |
| `web/src/hooks/usePipelineData.ts` | **新建** | ~40 | 低 |
| `web/src/pages/Dashboard.tsx` | **修改** | -200 行删除，+50 行重构 | 高 |
| `web/src/pages/Commands.tsx` | **修改** | +80 行新增 | 中 |
| `web/src/pages/Agents.tsx` | **修改** | +20 行新增 | 低 |
| `web/src/pages/Archive.tsx` | **修改** | +30 行新增 | 低 |
| `web/src/pages/matchPipelineType.ts` | **修改** | +25 行新增 | 低 |
| `web/src/components/Layout.tsx` | **修改** | +30 行（引用 pipelineConfig，删除重复定义） | 低 |

**前端总变更**: 新增 ~470 行，修改 ~235 行，删除 ~200 行 = 净增 ~505 行

### 7.2 后端同步变更（由后端 Agent 负责）

| 文件 | 函数 | 所需变更 |
|------|------|---------|
| `src/web/routes.ts` | `inferPipelineType()` | 新增 refactor/hotfix/migrate/evaluate/debug 识别 |
| `src/web/routes.ts` | `inferCategory()` | 新增 operations/refactoring/documentation/research 分类识别 |

---

## 8. 实施建议

### 8.1 实施顺序

```
第 1 步: 创建 constants/pipelineConfig.ts      （零依赖，先建立统一配置源）
第 2 步: 创建 constants/gateConfig.ts          （依赖 pipelineConfig）
第 3 步: 修改 Layout.tsx / Commands.tsx / Archive.tsx 引用 pipelineConfig
第 4 步: 修改 matchPipelineType.ts              （新增 5 种类型匹配）
第 5 步: 创建 hooks/usePipelineData.ts          （数据层）
第 6 步: 创建 components/GateTimeline.tsx       （UI 子组件）
第 7 步: 创建 components/ArtifactCard.tsx       （UI 子组件）
第 8 步: 创建 components/MarkdownPreview.tsx    （UI 子组件）
第 9 步: 修改 Dashboard.tsx                     （集成拆分组件）
第 10 步: 修改 Commands.tsx FALLBACK_COMMANDS   （追加新指令数据）
第 11 步: 修改 Agents.tsx                       （Pipeline 筛选扩展）
最终: 运行 lint + typecheck + 构建 + 人工视觉验证
```

### 8.2 验证清单

- [ ] `npm run typecheck` 通过（零类型错误）
- [ ] `npm run lint` 通过
- [ ] `npm run build` 成功
- [ ] Web 面板 Dashboard 显示 refactor/hotfix/migrate/evaluate/debug 流水线状态
- [ ] Gate Timeline 中正确渲染所有 30+ 个 Gate 的颜色/标签/描述
- [ ] Commands 页面显示所有 30+ 条新指令，分类 Tab 正确筛选
- [ ] Agents 页面可按 13 种流程分类正确筛选
- [ ] Archive 页面可按 9 种 pipeline 类型筛选归档记录
- [ ] SSE 实时同步对新流水线类型正常工作
- [ ] 响应式布局：窄屏下 Gate Timeline 可横向滚动，卡片网格自适应

---

> **生成信息**: 由 frontend-architect 在 2026-05-13 生成
> **输入**: REQ-019 需求 + DDD 领域分析 + 现有代码源码审查（16 个文件）
> **审查状态**: 待编排者审阅，待 diff-review-expert 或 qa-review-expert 评审
