# 后端审查报告 — 测试体系化升级

**审查日期**：2026-05-13  
**变更范围**：7 文件，+482 / -16 行  
**审查者**：backend-review-expert  
**审查结论**：**有条件通过**（含 2 个 [FIX_REQUIRED] 项）

---

## 一、变更文件清单

| 文件 | 变更性质 | 行数变化 |
|------|---------|---------|
| `src/engine/gates.ts` | 新增 5 条流水线定义、22 个 Gate、权限矩阵、Agent 路由 | +169 / -5 |
| `tests/gates.test.ts` | 新增 37 个 TDD 测试用例 | +266 / -10 |
| `src/engine/quality-gate.ts` | 质量门禁配置加载与判定逻辑（存量文件，非本次变更） | 预先存在 |
| `src/engine/server.ts` | session_join 白名单扩展到 9 个 pipeline_type | +8 / -3 |
| `src/web/routes.ts` | inferPipelineType / inferCategory 扩展 5 个新类型 | +13 / -2 |
| `src/engine/db.ts` | checkpoints 表 ALTER TABLE 新增 2 列 + addCheckpoint 扩展 | +14 / -2 |
| `src/cli/utils/constants.ts` | PKG_ROOT 查找逻辑重构（无关变更混入） | +26 / -3 |

---

## 二、维度检查结果

### 2.1 API 设计审查 — 通过

- RESTful 路由未新增，仅扩展了 Web 面板的 `/api/commands` 返回数据的分类推断逻辑
- `session_join` MCP 工具白名单从 4 个值扩展到 9 个值，白名单校验逻辑一致
- 错误响应格式保持统一（`{ error: string }` 格式）
- 新 pipeline_type 命名规范：`refactor`, `hotfix`, `migrate`, `evaluate`, `debug`

### 2.2 业务逻辑审查 — 有条件通过

- **FSM 兼容性**：4 条已有流水线（full / frontend / backend / lite）的 Gate 序列未变，`sessionGates()` 按 pipeline_type 动态取 Gate 序列，`advance_gate` 使用 `gateList.indexOf()` 比较，与新增流水线无耦合。测试用例 #7 验证通过。
- **Gate 权限矩阵**：22 个新 Gate 的 allow/deny 规则合理，与各 Gate 职责一致。依赖 `allow` 列表做实际阻断，`deny` 列表是辅助信息。已知缺失的 deny 项（如 H3 未显式 deny `lint`/`build`）不构成功能缺陷，因为不在 allow 中的操作会被隐式阻断，但建议补全以保持一致性（见问题 #DE1）。
- **入口条件链**：17 条新 Gate 入口条件均正确引用前置 Gate，链式依赖完整。测试用例 #34-#37 验证通过。
- **重试策略**：H3（合规审计）和 D3（交互诊断）设为 Infinity 合理。H0 设为 1（审批拒绝不重试）合理。
- **幂等性**：`addCheckpoint` 使用 `INSERT OR REPLACE` 保持幂等。

### 2.3 数据层审查 — 通过

- `ALTER TABLE checkpoints ADD COLUMN violations TEXT` + `quality_profile_source TEXT` 使用 `try/catch` 包裹，列已存在时静默跳过，安全迁移。
- `addCheckpoint` 函数保持向后兼容：不传 violations/qualityProfileSource 参数时走旧分支（`INSERT OR REPLACE` 仅含原有 5 列）。
- 使用参数化查询，无 SQL 注入风险。
- 事务边界：`initSchema` 中的迁移重建使用明确的 BEGIN/COMMIT/ROLLBACK。

### 2.4 错误处理审查 — 通过

- `quality-gate.ts` 的 `loadQualityGates` 有三层降级路径（文件缺失 → DEFAULT / 解析失败 → FALLBACK / 阈值过低 → FALLBACK），均返回完整配置档案。
- `parse` 调用在 try/catch 中，YAML 语法错误不会导致崩溃。
- 自定义阈值无法跌破默认值 50% 的硬约束，通过 `isBelowHalf` 函数执行。

### 2.5 性能审查 — 通过（代码级）

- 新 Gate 操作矩阵只增加静态字典查找，O(1) 复杂度。
- 产物目录映射（GATE_DIRS）同样为 O(1) 键值查找。
- `inferPipelineType` / `inferCategory` 中的字符串匹配是轻量级正则操作，对 API 响应无性能影响。

---

## 三、问题列表（按严重度排序）

### [FIX_REQUIRED] CE1 — quality-gate.ts 缺少直接依赖

**文件**: `src/engine/quality-gate.ts:12`  
**证据**: `import { parse } from 'yaml';` 但 `package.json` 中无 `yaml` 依赖声明。`yaml` 目前通过传递依赖可用（存在于 `node_modules`），但不是项目的直接依赖。

**影响**: 若传递依赖的父包升级/移除 `yaml`，或执行 `npm install --production` 时 `yaml` 可能不被安装，导致 `loadQualityGates` 运行时崩溃（`import` 失败）。

**建议**: 将 `yaml` 添加到 `package.json` 的 `dependencies` 中：
```bash
npm install --save yaml
```
然后在 `package.json` 中确认出现 `"yaml": "^2.x.x"`。

---

### [FIX_REQUIRED] CE2 — 提交范围混杂无关变更

**文件**: `src/cli/utils/constants.ts`  
**证据**: 当前提交的 commit message 为 `fix: CLI PKG_ROOT resolves to dist/ instead of project root`，但变更集中包含了 5 条新流水线的所有后端代码。`constants.ts` 中的 PKG_ROOT 查找重构是独立的 bug 修复，不属于 "测试体系化升级" 范围。

**影响**: 
- 违反 behavioral-guidelines 准则 3（精准修改）
- 扩大 review 范围，增加审阅噪声
- 若需要 revert 流水线变更，会连带丢失 PKG_ROOT 修复

**建议**: 将 `constants.ts` 的 PKG_ROOT 修复拆分为独立提交，或修正 commit message 以准确反映变更范围（如 `feat: 新增 5 条任务流水线 + PKG_ROOT 修复`）。

---

### [WARNING] DE1 — 新 Gate deny 列表不一致（H3 缺失 lint/build, M3/M4 缺失 write_doc）

**文件**: `src/engine/gates.ts:182-188`  
**证据**: 
- H3 (行 182) 的 deny 列表为 `['write_code','spawn_impl','spawn_test']`，但未显式 deny `lint` 和 `build`。
- 对比：同是只读/审查/文档阶段的 Gate E (行 171) 严格 deny 了 `['write_code','spawn_impl','spawn_test','lint','build']`。
- M3/M4 (行 186-187) 允许 `lint`, `build`, `fix`, `read`，但 deny 列表中不包含 `write_doc`。M3/M4 的 GATE_CHECKS 描述是 "编译/构建通过" 和 "Lint零错误"，不应涉及文档编写。

**影响**: 当前隐式阻断依赖 `allow` 列表检查（`ops.allow.includes(operation)`），功能上安全。但 deny 列表作为元数据不一致，会误导阅读 `pipeline_guide` 输出结果的编排 Agent，可能产生操作误判。

**建议**: 
- H3 deny 列表增加 `lint` 和 `build`
- M3/M4 deny 列表增加 `write_doc`（与 Gate C1 行为对齐，行 167）
- H2 deny 列表也应检查是否缺失 `lint`（当前允许 `read`, `spawn_test`, `fix`，但未 deny `lint`）

---

### [WARNING] DE2 — inferCategory 返回值变更可能影响前端分类展示

**文件**: `src/web/routes.ts:853-865`  
**证据**: 
- 旧逻辑：`/test|explore|bug/.test(name)` 统一返回 `'testing'`
- 新逻辑：`/^test-/.test(name)` 返回 `'test'`，`/^debug/.test(name) || /bug/.test(name)` 返回 `'debug'`，`/explore/.test(name)` 返回 `'testing'`
- Agent ID `test-doc-writer` 旧分类为 `'testing'`，新分类为 `'test'`

**影响**: Web 面板的 Agent 配置页面按 category 筛选时，`test-*` 前缀的 Agent 会从原来的 "testing" 分类变更为 "test" 分类。前端分类筛选下拉框若仍沿用旧名称 "testing" 会导致这些 Agent 不可见。

**建议**: 
1. 确认前端分类筛选是否已同步更新为支持 `'test'` 和 `'debug'` 分类
2. 若前端未同步，将 `'test'` 恢复为 `'testing'`，或在返回时添加映射

---

### [WARNING] DE3 — quality-gate.ts 引擎集成缺失

**文件**: `src/engine/gates.ts:109-110` (GATE_CHECKS)，`src/engine/quality-gate.ts`  
**证据**: GATE_CHECKS 中 Gate C2 和 Gate D 的描述提及 "quality-gates.yml门禁判定通过"，但 `server.ts` 中的 `advance_gate` MCP 工具和 `routes.ts` 中的 `/api/gate/advance` REST 端点均未调用 `loadQualityGates()` 或 `evaluateQualityGate()` 执行实际的自动化门禁判定。目前仅作为文本描述提示编排 Agent 自行检查。

**影响**: 质量门禁判定完全依赖 LLM 自我检查，不可靠。若 LLM 忽略或误解 GATE_CHECKS 描述，可能绕过门禁判定。`quality-gate.ts` 模块和 `checkpoints` 表的 `violations`/`quality_profile_source` 列已就绪但未被使用。

**建议**: 在 `advance_gate`（MCP 工具 + REST 端点）中，当推进到 Gate C2 或 Gate D 时，自动调用 `loadQualityGates(root)` + `evaluateQualityGate(profile, metrics)`（metrics 可从测试 Agent 的输出或外部 CI 报告中获取），不通过则阻止推进并记录 violations。

---

### [WARNING] DE4 — PKG_ROOT 查找逻辑依赖 .git/ 目录存在

**文件**: `src/cli/utils/constants.ts:37-38`  
**证据**: `findPkgRoot` 通过检查 `existsSync(resolve(dir, '.git'))` 判断是否为项目根目录。此逻辑在以下场景失效：
1. 项目初始化为 git 仓库但 `.git/` 是符号链接（不常见，但可能）
2. 从 git worktree 运行（`.git` 是文件而非目录）
3. 作为子模块使用（`.git` 是文件）

**影响**: 在上述场景中，`findPkgRoot` 会跳过有效目录，最终回退到硬编码 4 级上行路径，可能指向错误目录。

**建议**: 
- 增加对 `.git` 文件的检查（worktree/子模块场景）：`existsSync(resolve(dir, '.git'))` 对目录和文件均返回 true
- 或优先检查 `package.json` 中的 `"name": "jarvis-agent-factory"` 匹配即可，移除 `.git/` 检查（原先的 PKG_ROOT 定义不需要 `.git` 目录验证）

---

### [INFO] NI1 — 补全历史遗留 deny 列表项（Gate C1 缺失 write_doc deny）

**文件**: `src/engine/gates.ts:167`  
**证据**: Gate C1 的 deny 列表为 `['spawn_impl','spawn_test','deploy','write_code']`，与其他相似 "检查验证" 类 Gate（如 R4 行 176、R5 行 177、E0 行 189）的一致性不足。Gate C1 的职责是 "Lint+Type-check+Build+Deps Audit 全部通过"，不应编写文档，但 `write_doc` 不在 deny 列表中。

**影响**: 功能上安全（`write_doc` 不在 allow 列表中），但元数据不一致。

**建议**: Gate C1 的 deny 列表增加 `write_doc`。

---

### [INFO] NI2 — 新增 22 个 Gate 的 OPERATIONS allow 列表中 `preview` 能力缺失

**文件**: `src/engine/gates.ts:172-198`  
**证据**: 所有 22 个新 Gate 的 OPERATIONS allow 列表中均不包含 `preview` 操作。这符合各 Gate 的职责定义（重构、热修复、迁移、评估、调试阶段都不涉及视觉预览），但若未来需要支持 UI 预览（如 migrate 流水线验证迁移后的 UI 渲染），需相应调整。

**影响**: 无当前影响，仅供参考。

---

### [INFO] NI3 — 测试用例编号与注释不一致

**文件**: `tests/gates.test.ts:233`  
**证据**: 该区块头注释写 "17 个 TDD 测试用例"，但实际包含 37 个测试用例（从 `describe('TASK-001: PIPELINE_DEFS...')` 到 `describe('TASK-001: GATE_ENTRY_CONDITIONS...')` 共 37 个 `it()` 块）。注释过时。

**建议**: 将 "17 个 TDD 测试用例" 更正为 "37 个测试用例"。

---

## 四、必须修复项

1. **[CE1]** 将 `yaml` 添加为 `package.json` 直接依赖（`npm install --save yaml`）
2. **[CE2]** 拆分 `constants.ts` PKG_ROOT 修复为独立提交，或在 commit message 中明确说明变更范围包含流水线升级

## 五、优化建议

1. **[DE1 建议]** 补齐 H3 deny 列表 (`lint`, `build`)，M3/M4 deny 列表 (`write_doc`)
2. **[DE3 建议]** 将 `quality-gate.ts` 集成到 `advance_gate` 工作流中，实现自动化门禁判定（当前为纯文本提示）
3. **[DE2 建议]** 与前端确认 category 筛选是否已支持 `'test'` / `'debug'` 分类
4. **[DE4 建议]** 简化 `findPkgRoot` 逻辑，移除 `.git/` 目录存在性检查（仅在 package.json 内容校验时判断 name 字段即可）
5. **[NI3 建议]** 更新测试文件注释中的用例数量

## 六、测试覆盖评估

- **gates.test.ts**：37 个新增测试用例覆盖 PIPELINE_DEFS、GATE_OPERATIONS、GATE_AGENT_GUIDE、GATE_DIRS、GATE_CHECKS、MAX_RETRY、GATE_ENTRY_CONDITIONS 7 个维度，覆盖充分
- **quality-gate.test.ts**：12 个测试用例覆盖配置加载降级路径（4 个）、门禁判定逻辑（6 个）、checkpoints 表扩展（2 个），覆盖充分
- **缺失覆盖**：未测试 `inferPipelineType` / `inferCategory` 的新增返回值（建议补充），未测试 `server.ts` 中 `session_join` 对新 pipeline_type 的接受/拒绝行为

## 七、残余风险

- **R1**：质量门禁至今未与 advance_gate 集成，自动化门禁判定缺失。在实现自动化之前，门禁有效性依赖于编排 Agent 的自觉性（DE3）
- **R2**：`yaml` 依赖当前通过传递依赖可用，若未来依赖树变化可能引入导入失败（CE1）
- **R3**：5 条新流水线的 Agent 提示词尚未在 `.claude/commands/` 中创建（缺少 `/refactor`, `/hotfix`, `/migrate`, `/evaluate`, `/debug` 指令文件），流水线定义虽完整但无可触发的用户入口

---

## 八、审查检查核对

- [x] API 设计 — 通过
- [x] 业务逻辑 — 有条件通过（DE1/DE3）
- [x] 数据层 — 通过
- [x] 错误处理 — 通过
- [x] 性能 — 通过
- [x] 代码质量 — 有条件通过（CE1/CE2/DE4）
- [x] 测试覆盖 — 通过
- [x] 安全（代码级） — 通过（无 SQL 注入、无硬编码密钥）
