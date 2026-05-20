# /refactor 指令引入子 Agent 执行重构和验证 -- 前端实现文档

## 1. 实现目标

将 `/refactor` 指令的 R3（执行重构）和 R4（行为漂移检测）从编排者直接执行改为 spawn 子 Agent 执行，使编排者专注于策略定义和 diff 审查，具体执行由领域实现 Agent 和测试 Agent 完成。

## 2. 对应需求 ID / 任务 ID

- 需求 ID：TASK-004
- 任务名称：`/refactor` 指令引入子 Agent 执行重构和验证

## 3. 输入依据

- 当前 `/refactor` 指令文件：`C:\Users\12247\.claude\commands\refactor.md`（v3.45.8）
- 参考实现：`/hotfix` 指令（已使用 Agent spawn 模式）
- 项目约束：`AGENTS.md`（Agent 体系、57 个 Agent 列表、Gate 约束）
- 技能参考：`refactoring` 技能（三层安全网方法论）

## 4. 变更文件 / 变更范围

| 文件 | 操作 | 变更说明 |
|------|------|---------|
| `C:\Users\12247\.claude\commands\refactor.md` | 修改 | 已安装指令文件，直接生效 |
| `src/templates/platforms/claude/commands/refactor.md` | 修改 | 模板源文件，保持与安装文件同步 |

变更行数：约 +120 行（模板文件 diff 统计）。

## 5. 实现说明

### 5.1 Frontmatter 变更

- `allowed-tools` 新增 `Agent`：`Read, Glob, Grep, Bash, Write, Edit, Skill, Agent`
- `version` 升级至 `3.47.11`，`updated` 更新至 `2026-05-18`

### 5.2 R2（建立基线测试）增强

- Gate 检查条件新增可选说明："补充基线测试已由测试 Agent 完成"
- 新增可选步骤 4：Spawn 测试 Agent 补充基线测试
  - 前端代码 -> `frontend-test-expert`
  - 后端代码 -> `backend-test-expert`
  - 跨层代码 -> `e2e-test-expert`
- 编排者审查补充测试后合并

### 5.3 R3（执行重构）重设计

**核心变更**：编排者不再直接逐文件重构，改为：

1. **编排者定义重构策略** -- 将 R1 边界文档转化为可执行的重构指令
2. **Agent 选择路由表**：
   | 重构范围 | Spawn Agent |
   |---------|------------|
   | 纯前端代码 | `frontend-dev-expert` |
   | 纯后端代码 | `backend-dev-expert` |
   | 跨层胶水改动 | `remediation-expert` |
3. **Spawn 领域实现 Agent** -- 传递完整重构策略、不变行为清单、边界约束
4. **编排者审查每步 diff** -- 确保在边界内、未夹带、不变行为保持

### 5.4 R4（行为漂移检测）增强

**核心变更**：测试运行和覆盖率对比由测试 Agent 执行：

1. **质量重检** -- 编排者执行 Lint+Type-check+Build；失败时 spawn R3 同一个领域 Agent 修复
2. **Spawn 测试 Agent** -- 按 Agent 选择路由执行：
   | 重构范围 | Spawn Agent |
   |---------|------------|
   | 前端代码 | `frontend-test-expert` |
   | 后端代码 | `backend-test-expert` |
   | 跨层代码 | `e2e-test-expert` |
3. **编排者审查报告** -- 确认测试通过、覆盖率无下降、无行为漂移
4. **手动抽查** -- 编排者执行行为漂移手动抽查（保留不变）

### 5.5 保留不变的部分

- R1（定义边界）：编排者操作，不变
- R5（生成报告）：编排者操作，不变
- 5 Gate 结构：R1 -> R2 -> R3 -> R4 -> R5
- 所有原有红线约束（6 条）
- 引擎会话注册和 Gate 检查机制
- 重构手法清单（Extract Function 等 5 种）

## 6. 测试和验证结果

### 验收标准逐项验证

| # | 验收标准 | 结果 | 证据 |
|---|---------|------|------|
| 1 | `allowed-tools` 包含 `Agent` | PASS | 第 6 行：`allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, Agent` |
| 2 | R3 包含 spawn 领域实现 Agent 调用 | PASS | R3 步骤 2：`Agent("<领域实现Agent>", prompt: ...)` |
| 3 | R4 包含 spawn 测试 Agent 调用 | PASS | R4 步骤 2：`Agent("<测试Agent>", prompt: ...)` |
| 4 | 包含 Agent 选择路由表 | PASS | R3 含领域 Agent 路由表（3 行），R4 含测试 Agent 路由表（3 行） |
| 5 | 5 Gate 结构保留 | PASS | R1/R2/R3/R4/R5 均存在，含 Gate 检查条件和引擎推进 |
| 6 | 所有原有红线约束保留 | PASS | 红线 section 完整保留 6 条约束 |

### 文件同步验证

- `diff` 命令确认安装文件与模板源文件完全一致（零差异）

### 范围验证

- `git status --short` 确认仅修改 `src/templates/platforms/claude/commands/refactor.md`
- 未修改 `jarvis.md`、其他 13 个指令文件、`agents/*.md`

## 7. 边界和异常处理

- **Agent 执行失败**：编排者审查 diff 不通过时，退回 Agent 重新执行（R3 步骤 3），附上具体审查意见
- **质量重检失败**：R4 步骤 1 中 Lint+Type-check+Build 失败时，spawn R3 同一个领域 Agent 修复，最多 2 轮
- **覆盖率下降**：测试 Agent 发现覆盖率下降时，分析原因并补充测试用例修复（R4 步骤 2）
- **跨层改动**：跨层胶水改动使用 `remediation-expert`（R3 路由表）

## 8. 风险 / 未解决项

- **无风险**：本次仅修改 markdown 指令文件，不涉及代码逻辑
- **未涉及**：未修改引擎逻辑（`gate_check`、`advance_gate` 等 MCP 工具），Agent spawn 由 Claude Code 平台原生支持

## 9. 需要后端配合的点

无。本次修改为纯前端指令文件变更。

## 10. 推荐的下一步

1. 编排者审阅变更 diff，确认 Agent 路由表和 prompt 模板符合预期
2. 在实际重构场景中测试 `/refactor` 指令的 Agent spawn 流程
3. 若 Agent prompt 模板需要调整，按实际使用反馈迭代优化
