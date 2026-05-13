# 技能分配文档

> 基于任务文档：`docs/tasks/2026-05-13-test-system-enhancement-tasks.md`（28 个 TASK，P0-P3 四轮交付）
> 基于需求文档：`docs/2026-05-13/requirements/REQ-test-system-enhancement.md`
> 说明：`@behavioral-guidelines` 由编排者自动追加，不列入下方分配清单
> 生成时间：2026-05-13

## 技能分配清单

---

### task_id: TASK-001 | subagent: engine-implementer

**任务类型**：引擎后端实现
**风险等级**：高
**分配技能**：
- @source-driven-development
- @code-standards
- @incremental-implementation
- @verification-before-completion
- @test-driven-development
- @debugging-and-error-recovery
**原因**：修改共享区 `gates.ts`（PIPELINE_DEFS/GATE_CHECKS/GATE_OPERATIONS/GATE_AGENT_GUIDE）和 `server.ts` 白名单。TDD 策略覆盖 12 个测试用例。高风险共享区域，所有后续任务依赖此任务，追加 `@debugging-and-error-recovery` 作为防御性技能。

---

### task_id: TASK-002 | subagent: engine-implementer

**任务类型**：引擎后端实现
**风险等级**：高
**分配技能**：
- @source-driven-development
- @code-standards
- @incremental-implementation
- @verification-before-completion
- @test-driven-development
- @mcp-builder
- @debugging-and-error-recovery
**原因**：新增 `src/engine/quality-gates.ts`（配置加载/合并/验证），修改 `server.ts` 新增 MCP 工具 `quality_gates`。TDD 策略覆盖 11 个测试用例。`@mcp-builder` 因新增 MCP 工具。高风险（配置错误可阻塞流水线），追加 `@debugging-and-error-recovery` 作为防御性技能。

---

### task_id: TASK-003 | subagent: template-creator

**任务类型**：配置模板创建
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @incremental-implementation
**原因**：纯 YAML 模板文件 `src/templates/quality-gates.yml` 创建，无运行时逻辑。模板文件按规则分配 `@incremental-implementation`。

---

### task_id: TASK-004 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：中
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/refactor` 指令文件（5 道 Gate R1-R5 流程描述 + Agent 路由表）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-005 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：中
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/hotfix` 指令文件（4 道 Gate H0-H3 紧急流程 + 事后回溯审计）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-006 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/migrate` 指令文件（4 道 Gate M1-M4 迁移流程）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-007 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/evaluate` 指令文件（4 道 Gate E0-E3 技术评估流程）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-008 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：中
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
- @debugging-and-error-recovery
**原因**：创建 `/debug` 指令文件（5 道 Gate D0-D4 诊断流程 + post-mortem 子模式）。命令文件按类型分配 `@chinese-documentation`。调试诊断任务追加 `@debugging-and-error-recovery`。

---

### task_id: TASK-009 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/doc` 指令文件（2 道 Gate DOC1-DOC2 文档同步流程）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-010 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：中
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/jarvis-change` 指令文件（变更回退/插入决策流程）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-011 | subagent: command-enhancer

**任务类型**：命令模板增强
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：增强 `/bug-fix` 命令（步骤 3 增加运行时证据收集子步骤）。修改现有命令文件，按类型分配 `@chinese-documentation`。

---

### task_id: TASK-012 | subagent: command-enhancer

**任务类型**：命令模板增强
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：5 个移动端命令文件（android/ios/flutter/expo/taro）增加 Gate B 三步（DDD/BDD/TDD）。修改现有命令文件，按类型分配 `@chinese-documentation`。

---

### task_id: TASK-013 | subagent: template-verifier

**任务类型**：模板验证汇总
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
**原因**：验证 11 个新命令模板文件存在、pipeline_type 与 PIPELINE_DEFS 一致、Agent 路由表完整。纯验证汇总任务，无代码或文件创建。

---

### task_id: TASK-014 | subagent: template-verifier

**任务类型**：模板验证汇总
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
**原因**：测试命令模板验证汇总任务（与 TASK-016 合并后转为验证角色）。纯验证任务。

---

### task_id: TASK-015 | subagent: skill-writer

**任务类型**：技能文档编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @writing-skills
**原因**：创建 `mutation-testing/SKILL.md`（Stryker/pytest-mutmut 集成指南 + 变异阈值配置）。Skill 文件按类型分配 `@writing-skills`。

---

### task_id: TASK-016 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/test-unit` 指令文件（自动识别框架、生成测试、覆盖率报告）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-017 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/test-integration` 指令文件（OpenAPI 解析、集成测试生成、Pact 契约测试）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-018 | subagent: agent-writer

**任务类型**：Agent 定义文件增强
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：更新 `e2e-test-expert.md`（增加 Playwright 测试自动生成能力描述 + agent-browser/browser-use 协作说明）。Agent 定义文件按文档类型分配 `@chinese-documentation`。

---

### task_id: TASK-019 | subagent: agent-writer

**任务类型**：Agent 定义文件增强
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：更新 `security-review-expert.md`（增加 DAST 动态扫描能力 + OWASP ZAP 集成）。Agent 定义文件按文档类型分配 `@chinese-documentation`。

---

### task_id: TASK-020 | subagent: agent-writer

**任务类型**：Agent 定义文件增强
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：更新 `perf-test-expert.md`（强化 k6 脚本自动生成 + Artillery 支持）。Agent 定义文件按文档类型分配 `@chinese-documentation`。

---

### task_id: TASK-021 | subagent: agent-writer

**任务类型**：Agent 定义文件增强
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：更新 `api-contract-expert.md`（增加 OpenAPI 文档生成与维护能力）。Agent 定义文件按文档类型分配 `@chinese-documentation`。

---

### task_id: TASK-022 | subagent: frontend-implementer

**任务类型**：Web 前端实现
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @incremental-implementation
- @verification-before-completion
- @frontend-design
**原因**：修改 `web/src/`（Dashboard Gate Timeline 可视化 + Commands 列表 + 质量门禁配置页）。前端代码实现任务，分配 `@frontend-design` 支持 UI 组件更新。

---

### task_id: TASK-023 | subagent: skill-implementer

**任务类型**：Skill 实现（含 TDD 核心逻辑）
**风险等级**：中
**分配技能**：
- @source-driven-development
- @code-standards
- @incremental-implementation
- @verification-before-completion
- @test-driven-development
- @writing-skills
**原因**：创建 `test-data-factory/SKILL.md` + Schema 解析/数据生成/脱敏引擎实现代码 + 测试文件。Skill 文件需 `@writing-skills`，核心数据生成逻辑采用 TDD 策略覆盖 12 个测试用例。

---

### task_id: TASK-024 | subagent: cli-implementer

**任务类型**：CLI 引擎后端实现
**风险等级**：中
**分配技能**：
- @source-driven-development
- @code-standards
- @incremental-implementation
- @verification-before-completion
- @test-driven-development
**原因**：修改 `server.ts`（CI 模式检测 + gate-check MCP 工具 + 非交互输出 + 退出码控制），新增 `cli.spec.ts`。引擎后端代码实现 + TDD 策略覆盖 6 个测试用例（CI/非CI 两套行为路径）。

---

### task_id: TASK-025 | subagent: docs-synchronizer

**任务类型**：文档同步
**风险等级**：中
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
- @documentation-and-adrs
**原因**：创建/修改 16 个 `docs/flows/*.md` 流程图 + 更新 AGENTS.md/README.md/docs/README.md。文档同步任务按类型分配 `@chinese-documentation`（中文排版）和 `@documentation-and-adrs`（文档标准与交叉引用）。

---

### task_id: TASK-026 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/test-e2e` 指令文件（Playwright 测试脚本生成 + e2e-test-expert 集成）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-027 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
**原因**：创建 `/test-perf` 指令文件（k6/Artillery 负载测试 + perf-test-expert 集成）。命令文件按类型分配 `@chinese-documentation`。

---

### task_id: TASK-028 | subagent: command-writer

**任务类型**：命令模板编写
**风险等级**：低
**分配技能**：
- @source-driven-development
- @code-standards
- @chinese-documentation
- @security-and-hardening
**原因**：创建 `/test-security` 指令文件（OWASP ZAP DAST 动态安全扫描 + security-review-expert 集成）。命令文件按类型分配 `@chinese-documentation`；安全测试领域追加 `@security-and-hardening`。

---

## 分配规则摘要

| 规则类别 | 适用 TASK | 追加技能 |
|---------|----------|---------|
| 引擎后端代码实现 | 001, 002, 024 | `@incremental-implementation` + `@verification-before-completion` |
| Web 前端代码实现 | 022 | `@incremental-implementation` + `@verification-before-completion` + `@frontend-design` |
| Skill 实现（含代码） | 023 | `@incremental-implementation` + `@verification-before-completion` + `@writing-skills` |
| TDD 策略 | 001, 002, 023, 024 | `@test-driven-development` |
| 命令/模板/Agent 文档 | 004~012, 016~021, 026~028 | `@chinese-documentation` |
| Skill 纯文档 | 015 | `@writing-skills` |
| 文档同步 | 025 | `@chinese-documentation` + `@documentation-and-adrs` |
| 模板文件 | 003 | `@incremental-implementation` |
| 高风险防御 | 001, 002 | `@debugging-and-error-recovery` |
| 调试诊断 | 008 | `@debugging-and-error-recovery` |
| 安全测试 | 028 | `@security-and-hardening` |
| MCP 工具新增 | 002 | `@mcp-builder` |
| 验证汇总（无代码变更） | 013, 014 | 仅 `@source-driven-development` + `@code-standards` |

## 未使用的可用技能

| 技能 | 未使用原因 |
|------|-----------|
| `@agent-browser` / `@browser-use` / `@browser-testing` | 本批次无浏览器自动化或 E2E 测试执行任务（命令模板仅引用描述） |
| `@spec-driven-development` | 本批次无需求规格编写任务 |
| `@idea-refine` | 本批次无想法细化任务 |
| `@planning-and-task-breakdown` | 规划已在 Gate C 阶段由 planner 完成 |
| `@code-simplification` | 本批次无大规模简化需求 |
| `@code-review-and-quality` | 审查任务由 Gate D 另配 agent 执行 |
| `@code-quality-gate` | Gate C1 质量门检查由编排者统一调用 |
| `@shipping-and-launch` | 发布流程在 Gate E 由编排者统一处理 |
| `@finishing-a-development-branch` | 分支收尾在交付后由编排者处理 |
| `@git-workflow-and-versioning` | 本批次无版本管理或分支操作 |
| `@find-docs` / `@find-skills` | 探索类技能，本批次任务文档路径已明确给出 |
