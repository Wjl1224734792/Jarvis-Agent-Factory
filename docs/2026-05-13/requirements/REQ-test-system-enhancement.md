# REQ-测试体系增强与指令流程补齐

> 状态：confirmed | 日期：2026-05-13 | 版本：v1.0

## 背景

Jarvis-Agent-Factory 在测试方面的体系化程度明显不足，目前仅覆盖了 UI 视觉验证和简单的 Bug 修复验证。对于现代软件开发必需的单元、集成、E2E、性能和安全测试几乎没有自动化支持。同时，高频开发场景（重构、热修复、迁移、调试、探索评估）缺乏专用指令流程。本需求旨在补齐测试体系、新增专用指令、优化现有流程、统一质量门禁配置。

---

## 一、测试体系补齐

### REQ-TEST-001：单元测试生成与执行

**现状**：没有指令或 Gate 强制要求生成或运行单元测试。开发 Agent 可能自行运行测试但无强制要求。

**需求**：
- 新增 `/test-unit` 指令，自动为新增/修改的模块生成单元测试（Jest/Vitest/Mocha/Pytest 等），运行并要求通过率 100%
- 新增覆盖率阈值报告，不达标则退回修复
- 在 Gate C2 中强化覆盖率检查——新增覆盖率报告对比基线

**验收标准**：
- [ ] `/test-unit` 指令可用，支持前端（Jest/Vitest）和后端（Jest/Pytest）项目
- [ ] 自动识别项目测试框架并生成对应测试代码
- [ ] 覆盖率报告包含行/分支/函数覆盖率
- [ ] Gate C2 包含覆盖率检查步骤

### REQ-TEST-002：集成测试与 API 测试

**现状**：后端或微服务没有 API 测试的生成和验证流程。

**需求**：
- 新增 `/test-integration` 指令，自动识别 API 契约（OpenAPI/Swagger）→ 生成集成测试用例 → 启动测试环境 → 执行 → 生成报告
- 在 `/backend` 流程中插入集成测试 Gate
- 对多服务协同支持契约测试（Pact）

**验收标准**：
- [ ] `/test-integration` 指令可用
- [ ] 自动解析 OpenAPI 文档生成测试用例
- [ ] api-test-expert Agent 已集成到 Gate C2
- [ ] `/backend` 流程包含集成测试步骤

### REQ-TEST-003：端到端 (E2E) 测试

**现状**：前端有 `/browser-test` 但过于依赖预写文档。

**需求**：
- 新增 `/test-e2e` 指令，基于用户故事或关键路径自动生成 Playwright 测试脚本并运行
- 在 Gate D 后、Gate E 前增加 E2E 验证门禁（作为 Gate C2 步骤 3）
- e2e-test-expert Agent 增强，支持自动生成测试代码

**验收标准**：
- [ ] `/test-e2e` 指令可用
- [ ] e2e-test-expert 能根据用户故事生成 Playwright 测试
- [ ] Gate C2 步骤 3 的 e2e 测试链路完整

### REQ-TEST-004：性能测试

**现状**：完全缺失。

**需求**：
- 新增 `/test-perf` 指令，针对 API 端点或关键页面进行基础负载测试（k6/Artillery 脚本生成与执行）
- 新增 perf-test-expert Agent（已存在但未集成到流程中），对比性能基线
- 可设定为可选门禁，性能敏感服务建议强制

**验收标准**：
- [ ] `/test-perf` 指令可用
- [ ] perf-test-expert 集成到 Gate C2（可选步骤）
- [ ] 支持 k6 脚本自动生成
- [ ] 输出性能基线对比报告

### REQ-TEST-005：安全测试（动态 DAST）

**现状**：Gate D 安全审计目前是静态分析（CVE、代码漏洞扫描），缺少动态应用安全测试。

**需求**：
- 在 Gate D 中增加动态测试步骤，使用 OWASP ZAP 或类似工具对运行中的应用进行快速扫描
- 新增 `/test-security` 指令单独执行 DAST
- security-review-expert 增强，包含 DAST 能力

**验收标准**：
- [ ] `/test-security` 指令可用
- [ ] Gate D 安全审计包含动态扫描步骤
- [ ] 支持 OWASP ZAP 自动化扫描

### REQ-TEST-006：测试数据管理

**现状**：未考虑测试数据管理。

**需求**：
- 新增测试数据工厂 Skill（`test-data-factory`），根据 schema 自动生成 mock 数据
- 支持脱敏规则配置
- 在所有测试指令中集成此 Skill

**验收标准**：
- [ ] `test-data-factory` Skill 创建并可用
- [ ] 支持 JSON Schema / OpenAPI Schema 输入
- [ ] 支持脱敏规则（email、phone、credit card 等）

### REQ-TEST-007：质量门禁统一配置

**现状**：测试分散在不同指令中，无统一的质量策略配置。

**需求**：
- 新增 `quality-gates.yml` 配置文件，定义各阶段必须通过的测试类型、覆盖率阈值、性能基线
- 所有流程在适当 Gate 处读取配置，强制检查
- 支持项目级覆盖

**验收标准**：
- [ ] `quality-gates.yml` 模板已创建
- [ ] 引擎在 Gate C1/C2/D 读取配置强制检查
- [ ] 支持项目级覆盖配置

---

## 二、新增指令流程

### REQ-CMD-001：`/refactor` — 重构指令

**需求**：
- 流程：Gate R1（定义重构边界与目标）→ R2（运行现有测试，生成基线覆盖率）→ R3（执行重构）→ R4（对比覆盖率，验证行为不变）→ R5（生成重构报告）
- 集成变异测试工具（Stryker/pytest-mutmut）
- 严禁行为漂移

**验收标准**：
- [ ] `/refactor` 指令文件创建
- [ ] 5 道 Gate 流程完整
- [ ] 变异测试集成
- [ ] 重构报告模板

### REQ-CMD-002：`/hotfix` — 紧急热修复

**需求**：
- 流程：Gate H0（紧急声明+审批）→ H1（最小化修复）→ H2（快速验证+回滚预案）→ H3（事后强制回溯审计）
- 绕过常规 Gate A/B，但事后补齐合规

**验收标准**：
- [ ] `/hotfix` 指令文件创建
- [ ] 紧急声明模板
- [ ] 回滚预案步骤
- [ ] 事后审计强制回溯机制

### REQ-CMD-003：`/migrate` — 框架迁移

**需求**：
- 流程：Gate M1（验证迁移规则覆盖率）→ M2（逐文件应用迁移）→ M3（编译验证）→ M4（自动修复 Lint）
- 支持用户提供迁移脚本或规则文件

**验收标准**：
- [ ] `/migrate` 指令文件创建
- [ ] 迁移规则文件格式定义
- [ ] 逐文件执行与回滚能力

### REQ-CMD-004：`/evaluate` — 技术评估

**需求**：
- 流程：Gate E0（定义评估标准）→ E1（生成原型）→ E2（运行用例收集指标）→ E3（生成评估报告）
- 轻量、非破坏性，运行在隔离沙箱或分支上

**验收标准**：
- [ ] `/evaluate` 指令文件创建
- [ ] 评估标准模板
- [ ] 支持隔离分支执行

### REQ-CMD-005：`/debug` — 调试诊断

**需求**：
- 流程：Gate D0（收集异常信息+环境快照）→ D1（生成最小复现用例）→ D2（启动调试会话）→ D3（交互式诊断）→ D4（输出诊断报告，不自动修改代码）
- 集成运行时调试工具（agent-browser + browser-use），让 Agent 能通过标准协议附加到进程、设置断点、捕获异常
- 支持事后调试（Post-mortem）：自动解析 core dump、崩溃日志、堆栈跟踪，进行离线根因分析，适合难以复现的生产问题
- post-mortem 作为 `/debug` 的子模式（`/debug --post-mortem <crash-log-path>`），解析堆栈 → 定位代码位置 → 推断可能根因 → 输出诊断报告
- `/bug-fix` 前置诊断增强：在步骤 3（定位根因）中增加显式的运行时证据收集，强制要求 Agent 调用调试工具获取运行时证据后再生成修复方案

**验收标准**：
- [ ] `/debug` 指令文件创建（含 post-mortem 子模式）
- [ ] 5 道 Gate 流程完整（D0→D1→D2→D3→D4）
- [ ] post-mortem 支持解析：堆栈跟踪、崩溃日志、core dump 摘要
- [ ] `/bug-fix` 步骤 3 包含运行时证据收集子步骤
- [ ] 诊断报告模板（含根因、代码位置、建议修复方案）
- [ ] 与 agent-browser 调试协议集成

### REQ-CMD-006：`/doc` — 文档同步

**需求**：
- 流程：扫描代码变更 → 对比文档站 → 自动更新过时文档
- 在 Gate E 中集成文档同步检查子步骤

**验收标准**：
- [ ] `/doc` 指令文件创建
- [ ] 自动检测文档与代码不一致
- [ ] docs-engineer Agent 增强

### REQ-CMD-007：`/jarvis-change` — 中途变更管理

**需求**：
- 允许用户在 Gate D 进行中发起变更请求
- 系统评估影响范围，决定回退到 Gate A 或作为新子任务插入

**验收标准**：
- [ ] `/jarvis-change` 指令文件创建
- [ ] 影响范围评估逻辑
- [ ] 回退/插入决策机制

---

## 三、现有指令增强

### REQ-ENHANCE-001：`/bug-fix` 增强

**需求**：
- 在步骤 3（定位根因）中增加显式的运行时证据收集
- 强制要求 Agent 调用调试工具获取运行时证据
- 与 `/debug` 指令联动——可先诊断再修复

**验收标准**：
- [ ] `/bug-fix` 步骤 3 包含运行时证据收集子步骤
- [ ] 支持 agent-browser 调试工具调用
- [ ] 与 `/debug` 指令联动文档

### REQ-ENHANCE-002：移动端/跨端 Gate B 分析

**需求**：
- `/android`、`/ios`、`/flutter`、`/expo`、`/taro` 指令增加 Gate B-DDD、B-BDD、B-TDD 分析
- 移动端生命周期的命令文件中明确写出 DDD/BDD/TDD 三步流程

**验收标准**：
- [ ] 5 个移动端指令文件均包含 Gate B 三步
- [ ] 移动端 Agent 路由表包含 task-design (DDD/BDD/TDD 模式)
- [ ] 对应 `docs/flows/` 流程图更新

### REQ-ENHANCE-003：API 文档维护（OpenAPI/Swagger）

**需求**：
- api-contract-expert 增强，支持 OpenAPI 文档生成与维护
- 在 Gate C-impl 完成后、Gate C2 前，自动更新 API 文档
- 在 Gate E 发布时验证 API 文档与实现一致性

**验收标准**：
- [ ] api-contract-expert 支持 OpenAPI 生成
- [ ] `/backend` 和 `/jarvis` 流程包含 API 文档更新步骤
- [ ] Gate E 包含 API 文档一致性检查

---

## 四、引擎与 Web 同步

### REQ-ENGINE-001：新 Gate 定义

**需求**：
- 在 `src/engine/gates.ts` 中定义新指令的 Gate 序列：
  - refactor: R1→R2→R3→R4→R5
  - hotfix: H0→H1→H2→H3
  - migrate: M1→M2→M3→M4
  - evaluate: E0→E1→E2→E3
  - debug: D0→D1→D2→D3→D4
  - doc: DOC1→DOC2
  - test-unit/test-integration/test-e2e/test-perf/test-security: 作为独立指令不需要新Gate序列，但需要 pipeline_type 映射

**验收标准**：
- [ ] PIPELINE_DEFS 表增加所有新流程类型
- [ ] GATE_CHECKS 表增加所有新 Gate 检查条件
- [ ] GATE_AGENT_GUIDE 表增加新 Gate 的 Agent 指引
- [ ] GATE_OPERATIONS 表增加新 Gate 的操作权限

### REQ-ENGINE-002：quality-gates.yml 配置加载

**需求**：
- 引擎启动时加载项目根目录的 `quality-gates.yml`
- 提供 API 端点查询当前质量门禁配置
- Gate C1/C2/D 执行时读取配置强制检查

**验收标准**：
- [ ] 配置文件模板已加入 `src/templates/`
- [ ] API 端点 `/api/quality-gates` 可用
- [ ] MCP 工具 `quality_gates` 查询配置

### REQ-WEB-001：Web 面板适配

**需求**：
- Dashboard 支持新指令的 Gate 序列可视化
- 新指令的流程展示（流程图/时序）
- 质量门禁配置页面

**验收标准**：
- [ ] Dashboard Gate Timeline 支持所有新流程
- [ ] Commands 列表包含所有新指令
- [ ] 质量门禁配置 UI（如适用）

### REQ-GATE-F-001：Gate F — 联调与契约验证

**需求**：
- 在 `/jarvis` 全流程的 Gate E 之前增加 Gate F（联调 & 契约验证）
- 专门用于跨服务的 API 契约检查，集成 Pact 或类似契约测试工具
- 自动对比 API 实现与 OpenAPI 文档的一致性
- 新的 Gate 序列：A→B-DDD→B-BDD→B-TDD→B1→C→C-impl→C1→C1.5→C2→D→F→E

**验收标准**：
- [ ] PIPELINE_DEFS 中 full/frontend/backend 类型增加 Gate F
- [ ] GATE_CHECKS 定义 Gate F 通过条件
- [ ] GATE_AGENT_GUIDE 定义 Gate F 可用 Agent
- [ ] api-contract-expert 增强契约验证能力
- [ ] Web Dashboard Gate Timeline 显示 Gate F

### REQ-CI-001：CI/CD 模式支持

**需求**：
- 将每个 Gate 封装为独立的 CLI 命令：`jarvis gate-check <gate>`，使其能被 CI 脚本调用
- CI 模式环境变量 `JARVIS_CI=true`：Agent 在非交互环境中运行，跳过需要人工确认的步骤
- 所有 Gate 检查结果通过退出码和 JSON 输出传递
- CI 模式保留完整日志，用于审计

**验收标准**：
- [ ] `jarvis gate-check <gate>` CLI 命令可直接调用
- [ ] `JARVIS_CI=true` 跳过交互步骤
- [ ] JSON 格式输出（`--format json`）
- [ ] CI 模式日志完整性（所有 Gate 检查结果）

### REQ-CLI-001：CLI 命令更新

**需求**：
- `jarvis gate-check <gate>` 支持 CI 模式
- CI 环境变量支持（跳过交互步骤）
- 新指令的 CLI 入口（如需要）

**验收标准**：
- [ ] CI 模式环境变量 `JARVIS_CI=true`
- [ ] gate-check CLI 命令可用
- [ ] 非交互模式日志输出

### REQ-ENHANCE-004：任务分解粒度控制

**需求**：
- 在 Agent 系统提示中加入动态粒度策略
- 根据项目规模（文件数/代码行数）自动限制最大子任务数（≤5）
- 提示 Agent 对高度依赖的子任务使用串行执行
- 在 planner 和 task-design Agent 中强制此策略

**验收标准**：
- [ ] planner Agent 文件增加粒度控制规则
- [ ] task-design Agent 文件增加粒度控制规则
- [ ] `/jarvis` 命令 Gate C 增加粒度说明

### REQ-ENHANCE-005：人类干预智能中断点

**需求**：
- 引入风险评估模型：代码变更幅度小、影响范围窄时自动降低确认级别，实现"静默通过"
- 复杂风险操作强制等待人工输入
- 在引擎中增加变更影响评分（基于文件数、行数、模块关键度）

**验收标准**：
- [ ] 变更影响评分算法实现
- [ ] 低风险变更静默通过机制
- [ ] 高风险变更强制确认机制
- [ ] 引擎支持 `risk_level` 字段和 API

### REQ-ENHANCE-006：跨会话上下文继承

**需求**：
- 利用会话历史，当 `/jarvis-lite` 或新任务启动时自动注入「相似任务摘要」作为少样本上下文
- 会话列表 API 支持查询历史任务及结果
- 相似任务检测（基于任务名称/关键词/文件路径）

**验收标准**：
- [ ] `session_list` MCP 工具返回历史会话摘要
- [ ] 相似任务匹配算法
- [ ] 编排者启动时自动查询并注入相似任务摘要

### REQ-API-001：OpenAPI/Swagger 文档维护流程

**需求**：
- api-contract-expert 增强，支持从代码自动生成 OpenAPI 3.0 文档
- 在 Gate C-impl 完成后自动更新 API 文档
- 在 Gate F（契约验证）中验证 API 文档与实现一致性
- 在 Gate E 发布时确保 API 文档已同步
- 支持 Swagger UI 渲染（可选）

**验收标准**：
- [ ] api-contract-expert Agent 文件增加 OpenAPI 生成能力
- [ ] `/backend` 流程包含 API 文档更新步骤
- [ ] Gate F 包含 API 文档一致性检查
- [ ] Gate E 包含 API 文档同步验证

---

## 五、模板与文档同步

### REQ-TEMPLATE-001：模板更新

**需求**：
- `src/templates/platforms/claude/` 目录下更新所有命令模板
- 新增命令模板文件（refactor, hotfix, migrate, evaluate, debug, doc, jarvis-change, test-unit, test-integration, test-e2e, test-perf, test-security）
- 新增 quality-gates.yml 模板

**验收标准**：
- [ ] 11 个新命令模板创建
- [ ] 5 个移动端命令模板更新（含 Gate B 三步）
- [ ] quality-gates.yml 模板创建

### REQ-TEMPLATE-002：Skill 新增

**需求**：
- 新增 `test-data-factory` Skill
- 新增 `mutation-testing` Skill（变异测试方法论）

**验收标准**：
- [ ] test-data-factory/SKILL.md 创建
- [ ] mutation-testing/SKILL.md 创建

### REQ-DOCS-001：文档同步

**需求**：
- 所有新指令的流程图（`docs/flows/`）
- AGENTS.md 更新（命令入口表、Agent 体系、技能体系）
- README.md 更新（版本号、特性列表、命令表）
- docs/README.md 更新（产物目录结构）

**验收标准**：
- [ ] 11 个新流程图创建
- [ ] 5 个移动端流程图更新
- [ ] AGENTS.md 与 README.md 同步

---

## 六、Agent 体系更新

### REQ-AGENT-001：现有 Agent 角色增强

**需求**：
- `api-contract-expert`：增加 OpenAPI 文档生成与维护能力
- `security-review-expert`：增加 DAST 动态扫描能力
- `perf-test-expert`：增强 k6 脚本生成能力
- `e2e-test-expert`：增加自动生成 Playwright 测试能力

**验收标准**：
- [ ] 4 个 Agent 文件更新

### REQ-AGENT-002：Agent 路由表更新

**需求**：
- 所有命令文档中的 Agent 路由表包含新指令可用的 Agent
- GATE_AGENT_GUIDE 表更新

**验收标准**：
- [ ] 所有新指令命令文件含完整 Agent 路由表
- [ ] gates.ts GATE_AGENT_GUIDE 更新

---

## 实施优先级

| 优先级 | 模块 | 理由 |
|--------|------|------|
| P0 | REQ-ENGINE-001（新 Gate 定义） | 所有新流程的引擎基础——必须最先完成 |
| P0 | REQ-GATE-F-001（Gate F 契约验证） | 全流程 Gate 序列变更 |
| P1 | REQ-CMD-001~007（新指令 7 个） | 高频场景急需 |
| P1 | REQ-ENHANCE-002（移动端 Gate B） | 移动端流程完整性 |
| P1 | REQ-ENHANCE-003（API 文档维护） | API 文档自动化 |
| P1 | REQ-TEMPLATE-001（模板更新） | 新命令安装入口 |
| P2 | REQ-TEST-001~005（单元/集成/E2E/性能/安全） | 测试体系补齐 |
| P2 | REQ-WEB-001（Web 面板适配） | 可视化更新 |
| P2 | REQ-CLI-001 / REQ-CI-001（CLI+CI） | CLI 与 CI/CD 集成 |
| P3 | REQ-TEST-006~007（数据管理/质量配置） | 测试辅助能力 |
| P3 | REQ-ENHANCE-004~006（粒度/干预/上下文） | 流程鲁棒性优化 |
| P3 | REQ-DOCS-001（文档同步） | 文档更新 |
| P3 | REQ-AGENT-001~002（Agent 增强） | Agent 路由和能力更新 |
