# 前端架构评审 -- 测试体系增强 Web 面板适配

> 日期：2026-05-13
> 评审域：Jarvis-Agent-Factory Web 面板（Dashboard / Commands / Quality Gates）
> 关联需求：REQ-WEB-001、REQ-ENGINE-001
> 关联任务：TASK-022
> 评审者：frontend-architect

---

## 1. 架构目标与约束

| 维度 | 说明 |
|------|------|
| **目标** | Dashboard Gate Timeline 支持新增 6 种 pipeline_type 的动态 Gate 序列可视化；Commands 列表展示新增 11 个指令；预留质量门禁配置查看能力 |
| **约束** | 不修改后端 API 契约（仅前端的消费适配）；不引入新依赖；保持单文件内联构建（vite-plugin-singlefile） |
| **当前技术栈** | React 19 + Ant Design 6 + React Router 6 + Vite 8 + TypeScript 5 + vitest |

---

## 2. 当前架构基线

### 2.1 文件结构

```
web/src/
  api.ts                    -- API 类型定义与 fetch 封装
  App.tsx                   -- 路由定义（/ /agents /commands /archive）
  theme.tsx                 -- antd ConfigProvider token
  pages/
    Dashboard.tsx           -- 流水线看板（Gate Timeline + 产物文档 + 历史 Runs）
    Commands.tsx            -- 指令列表（分类 Tab + 卡片网格）
    Agents.tsx              -- 智能体配置
    Archive.tsx             -- 归档记录
    matchPipelineType.ts    -- Agent ID → 流程分类映射
  components/
    Layout.tsx              -- 侧边栏（会话列表 + MCP 状态 + SSE 推送消费）
```

### 2.2 关键硬编码发现

Dashboard.tsx 中存在三处与新 Gate 序列直接冲突的硬编码：

1. **`GATE_COLORS`**（L25-29）— 仅映射 A/B/C/C1/C1.5/C2/D/E。新增门（R1-R5, H0-H3, M1-M4, E0-E3, D0-D4, DOC1-DOC2）无颜色映射，渲染时 fallback 到 `var(--ant-color-primary)`。

2. **`GATE_LABELS`**（L31-36）— 仅含现有 13 个 Gate 的中文标签。新 Gate 将直接显示英文原名（如 "R1"），用户不可理解。

3. **`GATE_DESCRIPTIONS`**（L38-51）— 仅含现有 Gate 的检查条件描述。新 Gate 无描述文案。

4. **`shortGate()`**（L21-23）— 逻辑为 `gate.startsWith('Gate ') ? gate.slice(5) : gate`。新门 `Gate R1` → `R1`，`Gate D0` → `D0`。与现有 `Gate D` → `D` 不冲突（D 与 D0 是不同的字符串），但语义上易混淆。

Commands.tsx 中存在：

5. **`PIPELINE_TAGS`**（L44-49）— 仅映射 full/frontend/backend/lite 四种类型。6 种新 pipeline_type 无标签，渲染时 fallback 到 `PIPELINE_TAGS.full`。

6. **`FALLBACK_COMMANDS`**（L16-37）— 静态后备数据仅含 19 个现有命令。新增 11 个指令未包含。

Layout.tsx 中存在：

7. **`PIPELINE_NAMES`**（L72-77）和 **`CMD_LABELS`**（L79-84）— 与 Commands.tsx 的 PIPELINE_TAGS 功能重叠但数据结构不同。新 pipeline_type 未覆盖。

### 2.3 API 数据流

```
Engine (server.ts)
  ├── GET /api/pipeline           → PipelineSession[]（含 gates: GateState[]）
  ├── GET /api/pipeline-runs      → PipelineRun[]
  └── GET /api/commands           → { commands: CommandItem[], total }
           │
           ▼
Web Panel (api.ts → pages/*.tsx)
  └── Dashboard.tsx 直接消费 pipeline.gates 渲染 Timeline
```

**关键结论**：前端不负责 pipeline_type → Gate 序列的映射，引擎 API 已返回完整的 `gates[]`。前端的职责是"将 API 返回的 Gate 列表渲染为可读的 Timeline"。

---

## 3. 分项评审

### 3.1 Gate Timeline 动态序列支持

**现状**：Timeline 组件本身是动态的（`gates.map(g => ...)`），可渲染任意长度的 Gate 序列。瓶颈在配色和文案——`GATE_COLORS` / `GATE_LABELS` / `GATE_DESCRIPTIONS` 是静态对象。

**评估**：架构层面**已支持动态序列**，需要的是补齐新增 Gate 的配色和文案配置。

**方案**（ADR-001）：

将三张硬编码表扩展为引擎侧的统一配置，或在前端建立按前缀分组的 fallback 规则。推荐**两级策略**：

- **精确匹配层**：保留 `GATE_COLORS` / `GATE_LABELS` / `GATE_DESCRIPTIONS` 的精确 key 匹配
- **前缀推断层**：精确匹配未命中时，按 Gate 前缀分组推断样式：

```typescript
// Gate 前缀 → 配色与标签策略
const GATE_PREFIX_META: Record<string, { colorVar: string; labelPattern: (gate: string) => string }> = {
  'R': { colorVar: '--ant-color-purple', labelPattern: g => `重构·${g}` },
  'H': { colorVar: '--ant-color-error',  labelPattern: g => `热修复·${g}` },
  'M': { colorVar: '--ant-color-info',   labelPattern: g => `迁移·${g}` },
  'E': { colorVar: '--ant-color-warning',labelPattern: g => `评估·${g}` },
  'D': { colorVar: '--ant-color-primary',labelPattern: g => `调试·${g}` },
  'DOC':{ colorVar: '--ant-color-success',labelPattern: g => `文档·${g}` },
};
```

**Gate 前缀冲突分析**：
- `Gate D` vs `Gate D0-D4`：`shortGate('Gate D')` → `'D'`，`shortGate('Gate D0')` → `'D0'`。无字符串冲突。
- `Gate E` vs `Gate E0-E3`：同上，`'E'` 与 `'E0'` 是不同的 key。
- 但在 `GATE_COLORS` 中建议将现有 `D` / `E` key 保留，新增 `D0`-`D4` / `E0`-`E3` 走前缀推断。

**结论**：无实质冲突，但需要区分精确 key（现有 Gate）与前缀推断（新 Gate）。

---

### 3.2 Commands 列表展示

**现状**：`Commands.tsx` 使用 Tab 分类筛选（全部/开发/测试/审查/架构/任务/平台），卡片网格展示。API 不可用时 fallback 到硬编码的 `FALLBACK_COMMANDS`。

**变化**：新增 11 个指令：
- 7 个流程指令：refactor、hotfix、migrate、evaluate、debug、doc、jarvis-change
- 4 个测试指令：test-unit、test-integration、test-e2e、test-perf、test-security

**方案**（ADR-002）：

1. **分类映射**：利用 `CommandItem.category` 字段，后端返回指令时携带分类：

| 指令 | category | 说明 |
|------|----------|------|
| refactor | `development` | 重构流程，属于开发大类 |
| hotfix | `development` | 紧急修复，属于开发大类 |
| migrate | `development` | 迁移流程，属于开发大类 |
| evaluate | `architecture` | 技术评估，归入架构 |
| debug | `testing` | 诊断调试，归入测试 |
| doc | `task` | 文档同步，归入任务 |
| jarvis-change | `task` | 变更管理，归入任务 |
| test-unit / test-integration / test-e2e / test-perf / test-security | `testing` | 测试指令 |

2. **移动端命令**：已在当前 `FALLBACK_COMMANDS` 中以 `platform` 分类存在，新增的 Gate B 三步不影响前端展示——指令列表只显示指令名、描述、参数提示、流水线类型，不展示 Gate 内部细节。

3. **pipeline_type 标签扩展**：`PIPELINE_TAGS` 需新增 7 个类型（refactor/hotfix/migrate/evaluate/debug/doc/test）的颜色和标签配置。建议采用语义色：

| pipeline_type | 标签 | 颜色 |
|---------------|------|------|
| refactor | refactor | 紫色（重构 = 改进） |
| hotfix | hotfix | 红色（紧急 = 高优先级） |
| migrate | migrate | 青色（迁移 = 数据流动） |
| evaluate | evaluate | 橙色（评估 = 决策前） |
| debug | debug | 蓝色（调试 = 分析） |
| doc | doc | 绿色（文档 = 产出） |
| test | test | 品红（测试 = 验证） |

---

### 3.3 质量门禁配置 UI

**现状**：Web 面板无质量门禁相关页面。

**需求分析**：`quality-gates.yml` 是项目根目录的 YAML 配置文件，引擎启动时加载，提供 `/api/quality-gates` 端点查询。TASK-002 实现引擎加载和 API 端点。

**方案**（ADR-003）：

**首期仅做配置查看，不做可视化编辑**。理由：
- quality-gates.yml 是 YAML 文件，结构清晰，CLI 编辑亦可
- 可视化编辑器（表单→YAML 序列化）约 200+ 行工作量，ROI 不高
- 当前 Web 面板定位是"监视面板"而非"管理控制台"

**实现**：在 Dashboard 页的 Gate Timeline 区域增加一个"质量门禁"折叠面板，调用 `/api/quality-gates` 展示当前生效的阈值配置。

```typescript
// api.ts 新增
qualityGates: (): Promise<QualityGateConfig> => fetchJSON('/api/quality-gates'),
```

**后续迭代**：当 quality-gates.yml 配置项超过 20 个或用户反馈 YAML 编辑门槛高时，再考虑可视化编辑器。

---

### 3.4 性能评估

**风险**：pipeline_type 从 4 种增加到 10+ 种，是否影响 Dashboard 渲染性能？

**分析**：

| 指标 | 现状 | 变化后 | 影响 |
|------|------|--------|------|
| Dashboard 渲染的 Gate 数量 | 当前会话的 gates[] 长度（8-12 个） | 同等（每会话仍是一个 pipeline_type） | 无影响 |
| Gate Timeline 渲染项数 | gates.length | gates.length | 无变化（不因类型增多而增多） |
| Commands 列表项数 | 19 | 30（19+11） | 卡片网格从 19→30 项，轻微增加 |
| 硬编码查找表大小 | ~50 key | ~90 key | 对象属性查找 O(1)，无影响 |
| SSE 推送频率 | 状态变更时 | 不变 | 无影响 |
| Bundle 大小 | 单文件构建 | 预计增加 ~2KB（新增配置数据） | 可忽略 |

**结论**：**性能无劣化风险**。Dashboard 只渲染一个会话的 Gate 序列（8-12 个 Timeline 项），不随 pipeline_type 总数变化。Commands 列表从 19→30 项是 trivial 级别的增长。

**建议的优化**（非必须，按需执行）：
- Commands 列表的 `CommandCard` 已使用 `React.memo`，无需额外优化
- 如果后续 Commands 超过 100 个，考虑虚拟滚动（当前 30 个不需要）

---

## 4. ADR 记录

### ADR-001：Gate 配色采用精确匹配 + 前缀推断两级策略

**状态**：Proposed
**日期**：2026-05-13

**上下文**：新增 6 种 pipeline_type 带来 27 个新 Gate（R1-R5, H0-H3, M1-M4, E0-E3, D0-D4, DOC1-DOC2）。若每个 Gate 都手动配置三张映射表（颜色/标签/描述），维护成本高且易遗漏。

**决策**：采用两级查找策略：
1. 精确匹配：`GATE_COLORS[shortGate]` 查精确 key（覆盖现有 13 个 Gate）
2. 前缀推断：精确未命中时，提取 Gate 的字母前缀（R/H/M/E/D/DOC），按 `GATE_PREFIX_META` 推断颜色和标签

**后果**：
- 优点：新增 pipeline_type 只需在 `GATE_PREFIX_META` 添加一行前缀配置
- 优点：现有 Gate 不受影响，保持精确配色
- 缺点：同前缀的所有 Gate 使用相同颜色（如 R1-R5 皆为紫色），差异仅靠标签文字区分

**替代方案**：
- 方案 A：每个新 Gate 单独配置 → 精确但维护成本高（27 条新配置），且新 Gate 的描述文案需等待 BDD 文档产出后才知道
- 弃用原因：违反 DRY 原则

---

### ADR-002：Commands 分类沿用现有 Tab 体系

**状态**：Proposed
**日期**：2026-05-13

**上下文**：新增 11 个指令，需要在前端 Commands 页面展示。当前已有 7 个分类 Tab。

**决策**：不新增分类 Tab，利用现有分类体系映射新指令。

**后果**：
- 优点：用户无需学习新分类
- 优点：开发量最小（仅需在后端返回的 CommandItem 中设置正确的 category 字段）
- 缺点：`testing` 分类下包含 debug、test-unit、test-integration、test-e2e、test-perf、test-security 共 6 个指令，可能需要子分组

**替代方案**：
- 方案 A：新增"修复"和"流程"分类 Tab → Tab 数量从 7 增加到 9，Tab 栏拥挤
- 弃用原因：Tab 数量已接近上限，继续增加降低可用性

---

### ADR-003：质量门禁首期仅做配置查看

**状态**：Proposed
**日期**：2026-05-13

**上下文**：quality-gates.yml 是新增的配置文件，需要前端展示。但可视化编辑器工作量约 200+ 行，且需求文档未明确要求可视化编辑。

**决策**：首期只实现配置查看（调用 `/api/quality-gates` 展示 JSON/YAML 渲染），不做表单编辑器。

**后果**：
- 优点：快速交付，不阻塞 TASK-022
- 优点：配置修改由 CLI 或直接编辑 YAML 完成，不引入前端编辑器的 YAML 序列化风险
- 缺点：用户体验不如可视化编辑器友好

---

## 5. 变更范围与文件影响

### 5.1 需修改的文件

| 文件 | 变更内容 | 预估行数 |
|------|---------|---------|
| `web/src/pages/Dashboard.tsx` | 扩展 GATE_COLORS/LABELS/DESCRIPTIONS；新增 GATE_PREFIX_META 前缀推断；新增 Quality Gate 配置查看面板 | ~80 行 |
| `web/src/pages/Commands.tsx` | 扩展 PIPELINE_TAGS（+7 种）；扩展 FALLBACK_COMMANDS（+11 条） | ~40 行 |
| `web/src/components/Layout.tsx` | 扩展 PIPELINE_NAMES 和 CMD_LABELS（+7 种） | ~10 行 |
| `web/src/api.ts` | 新增 qualityGates() 方法 + QualityGateConfig 类型 | ~15 行 |

**总预估**：~145 行（符合 TASK-022 的 120 行预估范围）。

### 5.2 不修改的文件

- `web/src/pages/Agents.tsx` — 不涉及
- `web/src/pages/Archive.tsx` — 不涉及
- `web/src/pages/matchPipelineType.ts` — 不涉及（Agent 分类不受新命令影响）
- `web/vite.config.ts` — 不修改构建配置
- `web/package.json` — 不引入新依赖

---

## 6. 实施建议

### 6.1 实施顺序

1. **先改配置层**（Dashboard.tsx 的 GATE_COLORS/LABELS/前缀推断 + Commands.tsx 的 PIPELINE_TAGS + Layout.tsx 的 CMD_LABELS）
2. **再改数据层**（api.ts 新增 qualityGates + 类型）
3. **最后改视图层**（Dashboard 新增 Quality Gate 面板、Commands FALLBACK_COMMANDS 扩展）

### 6.2 建议添加的测试

```typescript
// web/src/pages/__tests__/Dashboard.test.tsx（新增）
describe('shortGate', () => {
  it('"Gate R1" → "R1"', () => { ... });
  it('"Gate D0" → "D0"（不与 "Gate D" 冲突）', () => { ... });
  it('"Gate DOC1" → "DOC1"', () => { ... });
});

describe('GATE_PREFIX_META 覆盖', () => {
  it('R1-R5 均命中 "R" 前缀', () => { ... });
  it('D 和 D0-D4 走不同的查找路径', () => { ... });
});
```

### 6.3 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| Hardcoded 配置与引擎 gates.ts 不同步 | 低 | 前端从 API `pipeline.gates` 读取序列，仅配色/标签本地兜底；新增 Gate 即使前端未配置也能展示（fallback 蓝色 + 英文名） |
| DOC 前缀包含 "D" 子串 | 低 | 前缀推断按长度降序匹配（DOC 先于 D），避免误匹配 |
| 质量门禁 API 未就绪时 Dashboard 报错 | 低 | qualityGates 面板 try-catch 包裹，API 失败时静默隐藏面板 |

---

## 7. 验证清单

- [ ] Dashboard 展示 refactor 流水线时，Timeline 正确渲染 R1→R2→R3→R4→R5
- [ ] Dashboard 展示 hotfix 流水线时，Timeline 正确渲染 H0→H1→H2→H3
- [ ] 新 Gate 使用正确的颜色（前缀推断）和标签
- [ ] `Gate D`（评审）与 `Gate D0`（调试）颜色不冲突
- [ ] Commands 列表包含全部 30 个指令（19 现有 + 11 新增）
- [ ] 新增 pipeline_type 的标签在 Commands 卡片、Layout 侧边栏中正确显示
- [ ] Quality Gate 配置查看面板正常展示（API 可用时）
- [ ] Quality Gate 配置查看面板静默隐藏（API 不可用时）
- [ ] TypeScript 编译通过：`tsc --noEmit`
- [ ] 测试通过：`vitest run`
- [ ] 构建成功：`npm run build`（单文件输出）
