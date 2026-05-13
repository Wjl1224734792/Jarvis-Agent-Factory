# 后端架构评审 -- 引擎扩展：6 种新 pipeline_type + quality-gates.yml

> 评审日期：2026-05-13
> 评审对象：`docs/tasks/2026-05-13-test-system-enhancement-ddd.md` + `docs/tasks/2026-05-13-test-system-enhancement-tasks.md`
> 评审范围：`src/engine/gates.ts` / `src/engine/server.ts` / quality-gates.yml 配置架构
> 评审者：backend-architect

---

## Execution Acknowledgement

- 我本次设计的后端架构域：Jarvis 引擎 Gate 序列扩展 + 质量门禁配置架构
- 对应需求 ID / 任务 ID：REQ-ENGINE-001, REQ-ENGINE-002, TASK-001, TASK-002, TASK-003
- 候选架构模式 / 技术方案：配置表驱动扩展 vs 按类型文件分发；硬编码白名单 vs 动态生成
- 我不会修改：任何生产代码；命令模板文件；Web 前端代码
- 我预计输出的文件 / 路径：`docs/2026-05-13/architecture/backend-review-test-enhancement.md`
- 我会编写的原型范围：无（纯架构评审）
- 若发现架构冲突，我将回退给编排者：是

---

## 1. 架构目标与约束

### 1.1 目标

- 将 PIPELINE_DEFS 从 4 种扩展到 10+ 种，支持重构/紧急修复/迁移/评估/调试/文档/测试共 7 大类工作流
- 引入 quality-gates.yml 统一质量门禁配置，支持全局默认 + 项目级两层覆盖
- 保证扩展不破坏现有 4 种流水线的行为
- 保证新 Gate 命名不与现有 Gate A/B/C/D/E 语义冲突
- 保证 session_join 白名单校验的安全性（拒绝未注册 pipeline_type）

### 1.2 约束

| 约束 | 来源 | 影响 |
|------|------|------|
| `gates.ts` 为共享高冲突文件，仅 TASK-001 可修改 | DDD 第 7.2 节 | 所有新 pipeline_type 的 Gate 定义必须在单次变更中完成 |
| 不可删除现有 PIPELINE_DEFS 条目 | 向后兼容 | 扩展时必须保留 full/frontend/backend/lite |
| 不可引入新中间件 | 架构红线 | quality-gates.yml 解析只能用 Node.js 内置 + `js-yaml`（已有依赖） |
| Web 面板需同步适配 | REQ-WEB-001 | Gate 序列变更需前端可渲染 |

---

## 2. PIPELINE_DEFS 扩展评审

### 2.1 当前数据结构分析

当前 `PIPELINE_DEFS`（`src/engine/gates.ts` 第 13-35 行）使用 **对象键值映射** 模式：

```typescript
export const PIPELINE_DEFS = {
  full:    { name: '全流程', gates: ['Gate A', 'Gate B-DDD', ...] },
  frontend:{ name: '前端开发', gates: [...] },
  backend: { name: '后端开发', gates: [...] },
  lite:    { name: '轻量编排', gates: [...], allow_jump: true },
};
```

**评审结论：当前设计对扩展是友好的。**

理由：
- `getPipelineGates(type)` 使用 `PIPELINE_DEFS[type]` 动态访问，新增 key 无需修改查找逻辑
- 每个 pipeline_type 是独立条目，互不依赖
- `allow_jump` 可选字段证明了表结构的灵活性（lite 有，其他无）

**需关注的风险点：**

| 风险 | 描述 | 严重度 |
|------|------|--------|
| 表扁平化 | 10+ 个条目全部平铺在一个对象中，`gates.ts` 文件会从 288 行膨胀到约 500+ 行 | 中 |
| 命名风格分裂 | 现有 Gate 用 `Gate X` 描述性命名，新 Gate 用 `R1`/`H0` 短码，同一文件中两套命名体系 | 高 |
| 默认回退逻辑 | `getPipelineGates` 对未知 type 回退到 full，新类型拼写错误时静默使用全流程 Gate 序列，难以排查 | 中 |

### 2.2 新 Gate 命名冲突分析

**逐项对比：**

| 新 Gate 前缀 | 现有 Gate | 键名冲突？ | 语义冲突风险 |
|-------------|-----------|-----------|-------------|
| R1-R5 (refactor) | 无 | 无 | 无 |
| H0-H3 (hotfix) | 无 | 无 | 无 |
| M1-M4 (migrate) | 无 | 无 | 无 |
| E0-E3 (evaluate) | **Gate E** (发布) | 无（`E0` !== `Gate E`） | **有**：evaluate 的 E0-E3 和发布阶段的 Gate E 使用相同字母 E，人工阅读时容易混淆 |
| D0-D4 (debug) | **Gate D** (审查) | 无（`D0` !== `Gate D`） | **有**：debug 的 D0-D4 和审查阶段的 Gate D 使用相同字母 D，且 `/debug` 命令与 Gate D 无直接关系 |
| DOC1-DOC2 (doc) | 无 | 无 | 无 |
| test (测试) | 无 | 无 | `test` pipeline_type 复用现有 Gate 序列 |

**架构建议：**

1. **重命名 E0-E3 为 EV0-EV3**（evaluate 的缩写），避免与 Gate E 混淆
2. **重命名 D0-D4 为 DG0-DG4**（debug 的缩写），避免与 Gate D 混淆
3. **或者，统一采用前缀命名规范**：所有新 Gate 使用两字母前缀，如：
   - `RF1-RF5` (refactor)
   - `HF0-HF3` (hotfix)
   - `MG1-MG4` (migrate)
   - `EV0-EV3` (evaluate)
   - `DG0-DG4` (debug)
   - `DC1-DC2` (doc)

**不推荐方案：** 将新 Gate 改为 `Gate R1` 格式。原因：`Gate R1` 与 `Gate C1` 会产生层级混淆（C1 是 C 的子阶段，但 R1 是 refactor 的第一阶段，含义不同）。

### 2.3 GATE_OPERATIONS 扩展

当前模式：`{ allow: string[], deny: string[] }` — **灵活性足够**。

每个新 Gate 需要独立定义操作权限，不允许与现有 Gate 共享条目。关键约束：

| 新 Gate | 核心操作约束 |
|---------|------------|
| R1 (定义边界) | `allow: [read, write_doc]`, `deny: [write_code, spawn_impl, spawn_test, build, deploy]` |
| R2 (基线测试) | `allow: [read, spawn_test]`, `deny: [write_code, spawn_impl, build, deploy]` |
| R3 (执行重构) | `allow: [read, write_code, spawn_impl]`, `deny: [deploy]` — 仅允许等价结构变换 |
| R4 (验证等价) | `allow: [read, spawn_test]`, `deny: [write_code, spawn_impl, deploy]` |
| R5 (报告) | `allow: [read, write_doc]`, `deny: [write_code, spawn_impl, spawn_test, build, deploy]` |
| H0 (紧急声明) | `allow: [read, write_doc]`, `deny: [write_code, spawn_impl, spawn_test, build, deploy]` |
| H1 (最小修复) | `allow: [read, write_code, spawn_impl]`, `deny: [deploy]` — 严格限定修改范围 |
| H2 (验证+回滚) | `allow: [read, spawn_test]`, `deny: [write_code, deploy]` |
| H3 (事后审计) | `allow: [read, write_doc, audit]`, `deny: [write_code, spawn_impl, spawn_test, build, deploy]` |
| D0-D3 (诊断) | `allow: [read, spawn_impl]`, `deny: [write_code, deploy]` — 诊断工具可 spawn |
| D4 (报告) | `allow: [read, write_doc]`, `deny: [write_code, spawn_impl, spawn_test, build, deploy]` |

**潜在新增操作类型建议：**

当前 11 种操作类型无法表达"受限代码修改"（如重构中禁止行为变更）和"隔离执行"（如评估中原型代码不可污染主分支）的语义。建议新增：

- `write_code_sandbox`：允许写代码，但限定在隔离分支/沙箱目录
- `audit_trail`：审计日志写入权限（hotfix 流程必需）

若不加新操作类型，则需在 GATE_AGENT_GUIDE 的 `note` 字段中补充约束说明，由编排者提示词强制执行（软约束而非硬约束）。

### 2.4 GATE_DIRS 映射

需要为新 Gate 定义 `docs/` 子目录映射。建议：

| Gate | 产物子目录 | 理由 |
|------|-----------|------|
| R1-R5 | `refactor/` | 重构边界文档 + 基线报告 + 重构报告 |
| H0-H3 | `hotfix/` | 紧急声明 + 回滚预案 + 审计报告 |
| M1-M4 | `migration/` | 迁移规则 + 执行日志 + 编译/Lint 报告 |
| E0-E3 → EV0-EV3 | `evaluation/` | 评估标准 + 原型 + 基准测试 + 评估报告 |
| D0-D4 → DG0-DG4 | `debug/` | 异常快照 + 复现用例 + 诊断报告 |
| DOC1-DC2 → DC1-DC2 | `docs/` | 变更扫描 + 文档更新建议 |

**注意：** `docs/` 子目录与现有 `docs/` 根目录存在命名重叠。建议 doc pipeline 使用 `doc-sync/` 或 `documentation/` 子目录以避免混淆。

### 2.5 session_join 白名单动态化

当前实现（`server.ts` 第 358 行）：

```typescript
if (!['full', 'frontend', 'backend', 'lite'].includes(pt)) {
```

**架构决策 ADR：白名单从硬编码改为从 `Object.keys(PIPELINE_DEFS)` 动态生成。**

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **A: 保持硬编码** | 显式控制，新增类型需显式审核 | 每次新增需改两处（PIPELINE_DEFS + 白名单），漏改 = 拒绝合法类型 | 不推荐 |
| **B: 动态生成** | 单一事实来源，新增 PIPELINE_DEFS 自动生效 | 误添加 PIPELINE_DEFS 条目会立即生效 | **推荐**（TASK-001 重构阶段已计划） |
| **C: 动态生成 + 显式标记** | `PIPELINE_DEFS` 中增加 `enabled: boolean` 字段，白名单过滤 `enabled !== false` | 增加配置复杂度 | 过度设计，不推荐 |

**结论：选 B。** 实现方式：

```typescript
// 替换硬编码为
const VALID_PIPELINE_TYPES = Object.keys(PIPELINE_DEFS);
if (!VALID_PIPELINE_TYPES.includes(pt)) {
  return resp({
    error: `Invalid pipeline_type: ${pt}. Valid: ${VALID_PIPELINE_TYPES.join(', ')}`
  });
}
```

### 2.6 新流水线操作权限矩阵独立性

**结论：每个新 pipeline_type 需要独立完整的操作权限定义。**

理由：
- `refactor` 的 R3 允许写代码但不允许行为变更——这是不同于 `backend` 流水线中 Gate C-impl 的语义
- `hotfix` 的 H0/H3 完全禁止写代码——紧急流程的事后合规要求
- `debug` 的 D0-D3 允许 spawn 诊断 Agent 但不允许写代码——诊断专用约束
- `migrate` 的全流程允许自动化代码修改——这是其他流水线中没有的操作模式

这意味着 **GATE_OPERATIONS 中的每个 Gate 必须有独立条目**，不能与其他流水线的同名或类似 Gate 共享。

---

## 3. quality-gates.yml 配置架构

### 3.1 文件位置

**ADR：quality-gates.yml 应放在项目根目录。**

| 候选位置 | 优点 | 缺点 | 结论 |
|---------|------|------|------|
| **项目根目录** | 符合业界惯例（与 .eslintrc、.prettierrc 同级）；CI 系统直接可见；模板安装目标明确 | 与 CLAUDE.md 等引擎配置分离 | **推荐** |
| `.claude/` | 与其他引擎配置文件统一 | 隐藏目录不利于用户发现和编辑；CI 系统需特殊配置 | 不推荐 |
| `src/templates/` | 仅模板存在此位置 | 运行时配置文件不应在源码模板目录 | 不推荐 |

引擎加载路径：`path.resolve(projectRoot, 'quality-gates.yml')`，与 `CLAUDE.md` 同级的 `projectRoot` 参数。

### 3.2 加载策略

**ADR：启动时加载 + 缓存 + 可选热加载。**

| 策略 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **启动时加载一次** | 简单，无文件监听开销 | 修改配置需重启引擎 | 最小可行方案 |
| **每次 Gate 检查时加载** | 配置实时生效 | 每次检查都做 YAML 解析 + 文件 I/O，性能浪费 | 不推荐 |
| **启动时加载 + fs.watch 热加载** | 配置变更实时生效，正常路径无额外开销 | 增加文件监听复杂度；fs.watch 跨平台不稳定 | TASK-002 重构阶段可选 |

**推荐最小可行方案：启动时加载一次，提供 MCP 工具 `quality_gates_reload` 手动触发重载。**

降级策略：
```
文件不存在 → 使用全局默认配置 (60% 覆盖率等) → WARN 日志
YAML 解析失败 → 回退全局默认 → ERROR 日志 + 解析错误详情
值越界(>100%) → 重置为默认值 → WARN 日志
字段缺失 → 该字段使用全局默认值 → INFO 日志
项目值 < 全局默认 → 使用全局默认值 → WARN 日志（"不允许降低标准"）
```

### 3.3 两层覆盖实现方式

**全局默认（硬编码常量）：**

```typescript
// src/engine/quality-gates.ts
const GLOBAL_DEFAULTS: QualityGateConfig = {
  coverage: { lines: 60, branches: 60, functions: 60 },
  stages: {
    c1: { checks: ['lint', 'typecheck', 'build', 'deps-audit'] },
    c2: {
      test_types: ['unit'],
      coverage: { lines: 80, branches: 80, functions: 80 },
      performance: { enabled: false, p95_ms: 500 },
    },
    d: {
      security: { static_analysis: true, dast: { enabled: false, tool: 'owasp-zap' } },
    },
  },
};
```

**mergeConfig 逻辑（伪代码）：**

```
function mergeConfig(project: Partial<QualityGateConfig>, global: QualityGateConfig):
  for each top-level key in global:
    if project[key] is missing:
      result[key] = global[key]          // 回退全局
    else if key is 'coverage':
      result.coverage.lines   = max(project.coverage.lines,   global.coverage.lines)
      result.coverage.branches = max(project.coverage.branches, global.coverage.branches)
      result.coverage.functions = max(project.coverage.functions, global.coverage.functions)
    else if key is 'stages':
      // 递归合并，同样取 max 阈值
```

**关键约束：不降低原则。** 项目级配置只能提高（更严格）或新增（补充测试类型），不能降低全局默认的任何阈值。

### 3.4 配置格式设计建议

TASK-003 模板结构基本合理。补充建议：

1. **增加 `version` 字段**：方便未来配置格式迁移
2. **增加 `$schema` 可选字段**：IDE 自动补全支持
3. **`performance` 的 `p95_ms` 应支持多端点**：不同 API 端点性能基线不同
4. **`test_types` 应使用枚举而非自由字符串**：防止拼写错误

建议模板：

```yaml
# quality-gates.yml -- Jarvis 质量门禁配置
version: 1

stages:
  c1:
    checks: [lint, typecheck, build, deps-audit]
  c2:
    test_types: [unit]  # 可选: unit, integration, e2e, perf, security
    coverage:
      lines: 80
      branches: 80
      functions: 80
    performance:
      enabled: false
      endpoints:  # 按端点设置基线（可选）
        "GET /api/users":
          p95_ms: 500
          rps: 100
  d:
    security:
      static_analysis: true
      dast:
        enabled: false
        tool: owasp-zap
```

---

## 4. 性能与可靠性

### 4.1 新增 6 种 pipeline_type 对引擎性能的影响

**结论：无实际性能影响。**

| 维度 | 评估 | 说明 |
|------|------|------|
| 内存 | +约 2KB | PIPELINE_DEFS/GATE_OPERATIONS/GATE_CHECKS/GATE_AGENT_GUIDE 均为启动时一次性加载的静态配置对象，新增条目只增加少量内存 |
| Gate FSM 推进 | 无影响 | `advance_gate` 基于当前 run 的 `current_gate` 字段执行，O(1) 查表 |
| Gate 检查 | 无影响 | `getGateOperations(gate)` 是对象属性访问，O(1) |
| session_join | 无影响 | 白名单从硬编码改为 `Object.keys(PIPELINE_DEFS)` 后，`Array.includes()` 从 4 元素增长到 11 元素，差异不可测量 |
| Web 面板 API | 微小 | `/api/pipeline-guide` 需返回更多 Gate 序列数据，响应体增加约 1KB |

### 4.2 quality-gates.yml 解析失败的降级策略

**分层降级方案（已在 TASK-002 TDD 测试用例中覆盖）：**

| 失败场景 | 处理策略 | 对应测试 |
|---------|---------|---------|
| 文件不存在 | 使用全局默认配置，记录 WARN 日志 | `qg-001` |
| YAML 格式错误 | 不抛异常，回退全局默认，记录 ERROR + 解析器错误详情 | `qg-004` |
| 覆盖率值 > 100% | 重置该字段为全局默认值，记录 WARNING | `qg-005` |
| 性能基线缺单位 | 跳过 perf 检查（不阻塞流水线），记录 WARNING | `qg-006` |
| 字段缺失（如 security） | 该字段使用全局默认值 | `qg-011` |
| 项目值 < 全局默认 | 使用全局默认值，记录 WARNING（不降低标准） | `qg-003` |

**关键原则：配置有误时，绝不阻塞流水线。宽松默认 + 警告日志 + 明确错误信息 > 严格配置 + 全局阻塞。**

---

## 5. ADR 记录

### ADR-1: 新 Gate 命名规范

**状态 (Status):** Proposed
**日期 (Date):** 2026-05-13

**上下文:** PIPELINE_DEFS 从 4 种扩展到 10+ 种。现有 Gate 使用 `Gate A` / `Gate B-DDD` 等描述性命名。新 Gate 使用 `R1-R5` / `H0-H3` / `E0-E3` / `D0-D4` 等缩写前缀命名。

**决策:** 采用双字母前缀 + 数字编号的命名规范，避免与现有 Gate 字母冲突：
- `RF1-RF5` (refactor) 替代 `R1-R5`
- `HF0-HF3` (hotfix) 替代 `H0-H3`
- `MG1-MG4` (migrate) 替代 `M1-M4`
- `EV0-EV3` (evaluate) 替代 `E0-E3`
- `DG0-DG4` (debug) 替代 `D0-D4`
- `DC1-DC2` (doc) 替代 `DOC1-DOC2`

**后果:** 正面：消除 E0-E3/Gate E、D0-D4/Gate D 的语义混淆。负面影响：短码可读性略低于全称，需在 GATE_CHECKS 的 `check` 字段中补充中文说明。

**考虑的替代方案:**
- 使用 `Gate R1` 格式：与 `Gate C1` 产生层级混淆，C1 是 C 的子阶段但 R1 是独立第一阶段
- 保持单字母前缀：E0/D0 与 Gate E/Gate D 字母重叠，人工阅读混淆风险高

### ADR-2: session_join 白名单动态生成

**状态 (Status):** Proposed
**日期 (Date):** 2026-05-13

**上下文:** 当前 `session_join` 使用硬编码数组 `['full', 'frontend', 'backend', 'lite']` 校验 pipeline_type。每次新增类型需要同步修改两处（PIPELINE_DEFS + 白名单），存在遗漏风险。

**决策:** 将白名单改为从 `Object.keys(PIPELINE_DEFS)` 动态生成，使 PIPELINE_DEFS 成为 pipeline_type 的单一事实来源。

**后果:** 正面：新增 pipeline_type 只需在 PIPELINE_DEFS 添加条目，白名单自动生效。负面影响：误添加 PIPELINE_DEFS 条目会立即生效（建议在 TDD 测试中覆盖无效类型的拒绝路径）。

**考虑的替代方案:**
- 硬编码 + 注释提醒：依赖人工审查，不可靠
- 动态生成 + `enabled: boolean` 字段：过度设计，当前无禁用 pipeline_type 的需求

### ADR-3: quality-gates.yml 加载策略

**状态 (Status):** Proposed
**日期 (Date):** 2026-05-13

**上下文:** quality-gates.yml 作为质量门禁配置，引擎需要读取它来验证 Gate C1/C2/D 是否达标。

**决策:** 采用启动时加载 + 内存缓存 + MCP 手动重载工具的策略。不采用 fs.watch 热加载（跨平台稳定性差，增加复杂度）。提供 `quality_gates_reload` MCP 工具作为手动触发重载的机制。

**后果:** 正面：简单可靠，无文件监听开销。负面影响：修改 quality-gates.yml 后需调用 `quality_gates_reload` 或重启引擎才能生效。对于 CI 模式（每次运行独立引擎实例），启动时加载即等同于实时生效。

**考虑的替代方案:**
- 每次 Gate 检查时读取文件：浪费 I/O，YAML 解析开销累积
- fs.watch 实时监听：Windows/macOS/Linux 行为不一致，增加引擎复杂度

---

## 6. Web 前端适配影响

`web/src/pages/matchPipelineType.ts` 使用中文分类名（全流程/前端/后端/轻量/移动端/架构/测试/审查）而非 `pipeline_type` 键。新增 pipeline_type 后需要扩展：

| 新 pipeline_type | 建议中文分类 | matchPipelineType 变更 |
|-----------------|-------------|----------------------|
| refactor | 重构 | 新增 case |
| hotfix | 紧急修复 | 新增 case |
| migrate | 迁移 | 新增 case |
| evaluate | 评估 | 新增 case |
| debug | 调试 | 新增 case |
| doc | 文档 | 新增 case |
| test | 测试 | 已有"测试"分类，但需区分是以 pipeline_type=test 启动的专用指令 |

`web/src/api.ts` 中的 TypeScript 接口（`Session`, `PipelineRun` 等）已使用 `pipeline_type: string` 类型，无需修改类型定义。

---

## 7. 风险与缓解

| 风险 | 等级 | 缓解措施 | 对应 TASK |
|------|------|---------|----------|
| 两套命名体系并存（Gate X vs RF1） | 中 | 本次评审建议统一双字母前缀；若团队选择保留短码，必须在 `PIPELINE_DEFS` 的 `name` 字段和 `GATE_CHECKS` 的 `check` 字段中补充中文全称说明 | TASK-001 |
| GATE_AGENT_GUIDE 覆盖不全 | 中 | 新增 Gate 注册后，需验证 `getGateAgentGuide` 对每个新 Gate 返回非空 `can_spawn`（TDD 测试 gates-008 覆盖此点） | TASK-001 |
| Web 面板新 Gate Timeline 渲染异常 | 低 | 前端已有 `matchPipelineType` 的 default fallback `return true`，新类型不会导致崩溃，但显示可能不准确 | TASK-022 |
| quality-gates.yml 配置错误阻塞流水线 | 高 | 多层降级：文件不存在→默认；YAML 错误→默认；值越界→重置；不达标→警告不阻塞（全局默认配置值宽松） | TASK-002 |
| GATE_DIRS 新产品子目录与现有 docs/ 结构冲突 | 低 | 新增子目录（refactor/hotfix/migration/evaluation/debug/doc-sync），不与现有 requirements/tasks/plans 重叠 | TASK-001 |

---

## 8. 对 TASK 分解的反馈

### 8.1 正面确认

- TASK-001 将 `session_join` 白名单从硬编码改为 `Object.keys(PIPELINE_DEFS)` 动态生成的设计方向完全正确（ADR-2）
- TASK-002 的 11 个测试用例覆盖了 YAML 解析失败的 6 种降级路径（qg-001~qg-006, qg-011），覆盖充分
- TASK-002 中"项目配置不低于全局默认"（qg-003/qg-010）的不降低约束设计正确
- TASK-001 作为共享区单任务锁定，避免多任务冲突的策略正确

### 8.2 建议补充

1. **TASK-001 重构阶段应增加测试**：验证新 pipeline_type 的 `session_join` 白名单在动态生成后，`Object.keys(PIPELINE_DEFS)` 中所有类型均被接受（正向测试），以及随机字符串仍被拒绝（负向测试）
2. **TASK-002 的 `mergeConfig` 函数应增加测试**：验证多层嵌套合并的正确性（例如项目定义了 `stages.c2.coverage.lines` 但未定义 `stages.c2.coverage.branches`，branches 应回退全局默认）
3. **GATE_ENTRY_CONDITIONS 应在 TASK-001 中补充**：任务文档要求了此项但 Red 阶段测试列表中未显式覆盖新 Gate 的入口条件测试

---

## 9. 总结

### 9.1 架构可行性：**通过，有一项条件**

基础架构设计（PIPELINE_DEFS 表扩展、GATE_OPERATIONS 权限矩阵、quality-gates.yml 加载策略）对扩展是友好的。**条件：** 采纳 ADR-1 的双字母前缀命名规范，消除 E0-E3/Gate E、D0-D4/Gate D 的语义混淆。

### 9.2 关键架构决策汇总

| 序号 | ADR | 决策 | 影响 |
|------|-----|------|------|
| 1 | 新 Gate 命名 | 使用双字母前缀（RF1-RF5 等）| gates.ts 所有新条目 |
| 2 | session_join 白名单 | 改为 `Object.keys(PIPELINE_DEFS)` 动态生成 | server.ts 第 358 行 |
| 3 | quality-gates.yml 位置 | 项目根目录 | 引擎加载路径 |
| 4 | quality-gates.yml 加载 | 启动时加载 + 缓存 + MCP 手动重载 | quality-gates.ts 新文件 |
| 5 | 配置降级策略 | 多层降级，绝不阻塞流水线 | 所有 Gate 检查路径 |
| 6 | 两层配置合并 | 取 max(项目值, 全局默认)，不降低标准 | mergeConfig 函数 |

### 9.3 不推荐事项

- 不推荐将新 Gate 改为 `Gate X` 格式（会产生与现有 Gate 的层级混淆）
- 不推荐性能敏感路径使用 `fs.watch` 热加载 quality-gates.yml（跨平台不稳定性）
- 不推荐为 pipeline_type 增加 `enabled: boolean` 开关（当前无禁用需求，YAGNI）
- 不推荐新 pipeline_type 复用现有 GATE_OPERATIONS 条目（语义不同，必须独立定义）
