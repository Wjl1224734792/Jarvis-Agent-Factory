# 前端审查报告：Web 面板 Gate 任务时长统计

> 审查日期: 2026-05-09 | 审查人: frontend-review-expert | 变更规模: +111 行（单一文件）

## 审查结论

**有条件通过** — 存在 1 项必须修复（FIX_REQUIRED）的缺陷，以及 2 项建议修复项（WARNING）。核心功能实现正确，需求覆盖完整。

---

## 一、变更概要

| 文件 | 变更行数 | 关联需求 |
|------|---------|----------|
| `src/web/views/pipeline.html` | +111 | REQ-005, REQ-006, REQ-007 |

变更内容：
1. 统计卡片区：`grid-cols-4` 扩展为 `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`，新增第 5 张"任务耗时"卡片
2. Gate 步骤列表：已通过 Gate 显示开始时间 / 通过时间 / 耗时；当前 Gate 显示开始时间 + "进行中"
3. 历史 Runs 列表：新增耗时列，已完成/中止显示 `total_duration_display`，运行中显示"运行中"
4. 新增辅助函数：`formatDateTime()`、`formatDuration()`、`updateDurationCard()`

---

## 二、五轴审查结果

### 1. 正确性

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 是否符合需求规格？ | 通过 | REQ-005/006/007 三项需求全部覆盖，验收标准逐条满足 |
| 边界条件处理 | **部分缺陷** | 见 [FIX_REQUIRED #1]；其余 null/undefined 降级正确 |
| DOM 安全（null→`--`） | 通过 | `formatDateTime(null)` → `'--'`、`formatDuration(null)` → `'--'`、`g.duration_display \|\| '--'` 等均正确降级 |
| 错误路径覆盖 | 通过 | `fetchPipelineRuns` 所有 4 个错误/空数据路径均调用 `updateDurationCard([])` |
| Gate 点击验证保留 | 通过 | `onclick="checkGate(...)"` 及 `checkGate()` 函数完整保留，未受影响 |

### 2. 可读性与简洁性

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 命名清晰？ | 通过 | `formatDateTime`/`formatDuration`/`updateDurationCard` 命名自解释 |
| 控制流直观？ | 通过 | 卫语句风格（null 检查提前返回）、分支 ≤2 层 |
| 是否能用更少代码？ | 建议 | 见 [WARNING #2] 冗余 `replace` 调用 |
| 注释质量 | 通过 | 三个新函数均有 JSDoc 风格注释，使用中文，符合项目约定 |

### 3. 架构

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 模块边界 | 通过 | 三个新函数均为文件级全局函数，与现有模式一致（单文件 HTML，无模块系统） |
| 依赖方向 | 通过 | `fetchPipelineRuns` → `updateDurationCard` 调用链正确，数据从 API 到 UI 单向流动 |
| 抽象层级 | 通过 | 未引入不必要的抽象层，函数粒度合理 |
| 无侵入性 | 通过 | 仅新增代码，不修改现有 API 调用签名、不改变数据流方向 |

### 4. 安全性

| 检查项 | 结果 | 说明 |
|--------|------|------|
| XSS 防护 | 通过 | `g.duration_display` 经 `escHtml()` 处理（第 466 行）；`updateDurationCard` 使用 `textContent`（非 `innerHTML`）设置文本内容 |
| 硬编码密钥 | 通过 | 无 |
| 用户输入处理 | 通过 | `formatDateTime` 只输出安全字符（数字、`-`、`:`、空格、`--`） |
| `updateDurationCard` 动态内容安全性 | 通过 | `run.started_at`/`completed_at` 经 `formatDateTime` 处理后赋值给 `textContent`，不经过 HTML 解析 |

### 5. 性能

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 5 秒轮询开销 | 通过 | `updateDurationCard` 单次调用仅做 1 次 `Date` 构造 + 1 次 `formatDuration` 调用 + `textContent` 赋值，计算量可忽略 |
| 不必要重渲染 | 通过 | Gate 列表用 `innerHTML` 全量替换（现有模式），`updateDurationCard` 仅更新卡片文本不触发列表重绘 |
| 无内存泄漏 | 通过 | 无新增事件监听、无闭包持有大对象 |
| 大列表优化 | N/A | Runs 列表以会话为单位，单次数据量小（通常 < 100 条） |

---

## 三、问题清单

### [FIX_REQUIRED] #1 — `updateDurationCard` 进行中状态 `started_at` null 安全

**文件**: `src/web/views/pipeline.html`  
**行号**: 986  
**严重度**: FIX_REQUIRED  
**类型**: 正确性 / 边界条件

**证据**:
```javascript
// 第 982 行：startStr 有 null 防护
var startStr = run.started_at ? formatDateTime(run.started_at.replace(' ', 'T')) : '--';

if (run.status === 'active') {
  // 第 986 行：此处直接调用 run.started_at.replace()，无 null 防护
  var elapsed = Math.floor((Date.now() - new Date(run.started_at.replace(' ', 'T')).getTime()) / 1000);
  //                        ↑ 如果 run.started_at 为 null/undefined，此处抛出 TypeError
```

**影响**: 如果后端返回一个 `status === 'active'` 但 `started_at` 为 null/undefined 的异常数据，`TypeError: Cannot read properties of null (reading 'replace')` 会在轮询中持续抛出，阻塞后续卡片更新逻辑。

**建议**: 在 `run.status === 'active'` 分支内增加 `run.started_at` 的 null 防护，例如：
```javascript
if (run.status === 'active') {
  if (!run.started_at) {
    cardEl.textContent = '--';
    detailEl.textContent = '进行中';
    return;
  }
  var elapsed = Math.floor((Date.now() - new Date(run.started_at.replace(' ', 'T')).getTime()) / 1000);
  // ...
```

---

### [WARNING] #1 — `formatDateTime` 调用方冗余 `replace(' ', 'T')` 预处理

**文件**: `src/web/views/pipeline.html`  
**行号**: 982, 992  
**严重度**: WARNING  
**类型**: 可读性 / 行为准则 3

**证据**:
```javascript
// formatDateTime 内部已处理空格格式（第 535 行）
function formatDateTime(isoStr) {
  if (!isoStr) return '--';
  try {
    var d = new Date(isoStr.replace(' ', 'T'));  // ← 内部已做 replace
    // ...

// 但调用方又做了一次 replace，导致冗余
// 第 982 行
var startStr = run.started_at ? formatDateTime(run.started_at.replace(' ', 'T')) : '--';
//                                                     ↑ 冗余的 replace
// 第 992 行
var completedStr = run.completed_at ? formatDateTime(run.completed_at.replace(' ', 'T')) : '--';
//                                                        ↑ 冗余的 replace
```

**影响**: 功能正确（冗余 `replace` 在 ISO 格式字符串上是 no-op），但代码语义不清晰——`formatDateTime` 声称接受 "ISO 或空格分隔的日期字符串"，调用方却假定输入不是 ISO 格式。如果未来 `formatDateTime` 行为变更，这些调用点可能产生意外行为。

**建议**: 将调用方改为直接传入原始字符串，信任 `formatDateTime` 的内部处理：
```javascript
var startStr = run.started_at ? formatDateTime(run.started_at) : '--';
var completedStr = run.completed_at ? formatDateTime(run.completed_at) : '--';
```
注意：第 986 行的 `new Date(run.started_at.replace(' ', 'T'))` 不经过 `formatDateTime`，其 `replace` 是必要的，保持不变。

---

### [WARNING] #2 — Gate 步骤时间信息字体过小（无障碍）

**文件**: `src/web/views/pipeline.html`  
**行号**: 463, 469  
**严重度**: WARNING  
**类型**: 可访问性 / 视觉

**证据**:
```html
<!-- 第 463 行：已通过 Gate 的时间信息 -->
<div class="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono space-y-0.5">

<!-- 第 469 行：当前 Gate 的时间信息 -->
<div class="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono space-y-0.5">
```

**影响**: `text-[10px]` 远低于 WCAG 建议的最小字体（12px），视力障碍用户难以阅读。与文案内容（第 494 行的 `text-[11px]`）同样偏小，但新增的时间信息是关键业务数据（耗时、时间戳），字体过小降低可读性。

**注意**: 页面中现有元素也大量使用 `text-[10px]`（产物标签、历史 Runs 列表等），属于既有模式，不阻塞本次变更。

**建议**: 考虑将时间信息容器字体提升至 `text-[11px]`，与 Gate 描述文字保持一致。

---

## 四、优化建议（INFO）

### INFO #1 — 新统计卡片字号不一致

**文件**: `src/web/views/pipeline.html`  
**行号**: 154  
**说明**: "任务耗时"卡片使用 `text-xl`（20px），而其他 4 张卡片使用 `text-3xl`（30px，进度/通过数/产物）和 `text-2xl`（24px，当前阶段）。这是合理的——耗时文本（如 `1小时23分45秒`）更长，需要更大空间——但视觉权重与其他卡片不一致。

### INFO #2 — 历史 Runs 日期列移除 `ml-auto`

**文件**: `src/web/views/pipeline.html`  
**行号**: 954  
**说明**: 旧代码中日期的 `<span>` 带有 `ml-auto` 类（将日期推至行尾），新增耗时列后移除了该类。这改变了 flex 布局行为：日期不再右对齐，而是作为普通 flex 子项参与 `gap-4` 间距布局。建议在 1024px 以上视口宽度验证 Runs 列表列对齐效果。

### INFO #3 — `pad` 函数每次调用时重新定义

**文件**: `src/web/views/pipeline.html`  
**行号**: 537  
**说明**: `formatDateTime` 内部每次调用都定义 `var pad = function(n) { ... }`。由于 `formatDateTime` 在 5 秒轮询的 Gate 列表渲染中每个 Gate 调用 1-2 次（共约 8-16 次），开销可忽略。不阻塞。

---

## 五、需求覆盖验证

| 需求 | 验收标准 | 实现位置 | 状态 |
|------|---------|---------|------|
| REQ-005 | Gate 显示开始/通过/耗时 | 第 459-474 行 (`timeHtml`) | 满足 |
| REQ-005 | 已通过和进行中 Gate 都有展示 | 第 461/468 行 (`isPassed`/`isCurrent` 分支) | 满足 |
| REQ-005 | 进行中 Gate 显示"进行中" | 第 472 行 | 满足 |
| REQ-005 | 耗时人类可读格式 | 第 550-558 行 (`formatDuration`) | 满足 |
| REQ-006 | 统计卡片显示总耗时 | 第 149-156 行 (HTML) + 第 968-995 行 (`updateDurationCard`) | 满足 |
| REQ-006 | 未完成任务显示"进行中"和已用时长 | 第 984-989 行 | 满足 |
| REQ-006 | 卡片风格一致 | 第 149-156 行 (复用相同 Tailwind 类) | 满足 |
| REQ-007 | 历史 Run 显示耗时 | 第 937-943 行 (`durationText`) + 第 955 行 (渲染) | 满足 |
| REQ-007 | 已完成/中止显示完整耗时 | 第 942 行 | 满足 |
| REQ-007 | 运行中显示"运行中" | 第 940 行 | 满足 |
| 数据兼容 | 缺失时长降级 `--` | 第 466/942/550/533/974 行 (多处) | 满足 |

---

## 六、必须修复项（汇总）

| # | 严重度 | 问题 | 位置 |
|---|--------|------|------|
| 1 | FIX_REQUIRED | `updateDurationCard` 第 986 行缺少 `run.started_at` null 防护 | `pipeline.html:986` |
| 2 | WARNING | 调用 `formatDateTime` 前冗余 `replace(' ', 'T')` | `pipeline.html:982,992` |
| 3 | WARNING | 时间信息 `text-[10px]` 低于无障碍最小字号 | `pipeline.html:463,469` |

---

## 七、变更文件清单

| 文件 | 变更类型 | 审查结论 |
|------|---------|---------|
| `src/web/views/pipeline.html` | 修改 (+111) | 有条件通过 |

---

## 八、未覆盖的验证范围

- 暗色模式适配（页面未启用暗色模式）
- 移动端（< 640px）新统计卡片折叠为 2 列后的视觉验证
- 后端的 `duration_display` / `total_duration_display` 格式化逻辑（不在前端审查范围）
- 后端 API 字段兼容性（`entered_at`、`duration_seconds` 等新字段的数据库迁移）
