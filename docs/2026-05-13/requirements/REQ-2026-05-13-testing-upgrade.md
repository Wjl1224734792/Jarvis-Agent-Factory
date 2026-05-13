# 贾维斯测试体系化升级 & 新指令流程 & 全平台 Gate 适配 — 需求文档

> 状态: confirmed
> 日期: 2026-05-13
> 版本: v1.0

---

## REQ-001: 单元测试生成与执行指令 `/test-unit`

**现状**: 没有指令或 Gate 强制要求生成或运行单元测试，逻辑变更后缺少快速反馈。

**需求**:
1. 新增 `/test-unit` 指令，为新增/修改的模块自动生成单元测试
2. 支持前端（Jest/Vitest）和后端（Mocha/Pytest）等多种测试框架
3. 通过率 100% + 新增覆盖率 ≥ 80% 阈值
4. 在 Gate C2 中增加测试覆盖率报告检查，不达标则退回 Gate C-impl

**验收标准**:
- `/test-unit` 指令可独立执行
- 自动检测项目测试框架并生成对应测试
- 覆盖率报告自动生成到 `docs/testing/`

---

## REQ-002: 集成测试/API 测试指令 `/test-integration`

**现状**: 后端或微服务没有 API 测试的生成和验证流程，服务间交互错误难以早期发现。

**需求**:
1. 新增 `/test-integration` 指令
2. 自动识别 API 契约（OpenAPI/Swagger）→ 生成集成测试用例 → 启动测试环境 → 执行 → 生成报告
3. 支持契约测试（Pact）集成，适用于多服务协同
4. 在 `/backend` 流程中插入专门的集成测试 Gate C2.5（或扩展 C2）

**验收标准**:
- `/test-integration` 可独立执行
- 自动解析 OpenAPI spec 生成测试用例
- 测试报告包含请求/响应快照

---

## REQ-003: 端到端测试指令 `/test-e2e`

**现状**: 前端有 `/browser-test` 但依赖已有测试文档，并非所有项目都有。

**需求**:
1. 新增 `/test-e2e` 指令
2. 基于用户故事或关键路径自动生成 Playwright/Cypress 测试脚本
3. 在 Gate D 后、Gate E 前增加 E2E 验证门禁（Gate C3）
4. 确保核心流程无回归

**验收标准**:
- `/test-e2e` 指令可独立执行
- 自动识别关键路径并生成测试脚本
- 与 `/browser-test` 互补而非重叠

---

## REQ-004: 性能测试指令 `/test-perf`

**现状**: 完全缺失，性能衰减不被发现直到生产事故。

**需求**:
1. 新增 `/test-perf` 指令
2. 支持 k6/Artillery 脚本生成与执行
3. 针对 API 端点或关键页面进行基础负载测试
4. 对比基线并生成趋势报告
5. 可选门禁，性能敏感服务建议强制

**验收标准**:
- `/test-perf` 指令可独立执行
- 生成 k6 或 Artillery 脚本
- 报告包含吞吐量、延迟、错误率对比

---

## REQ-005: 安全测试指令（动态 DAST）`/test-security`

**现状**: Gate D 安全审计仅静态分析（CVE、代码扫描），缺少动态应用安全测试。

**需求**:
1. 新增 `/test-security` 指令
2. 集成 OWASP ZAP 或类似自动化工具对运行中应用进行快速扫描
3. 在 Gate D 中增加动态 DAST 测试步骤
4. 检测注入、XSS、CSRF 等运行时漏洞

**验收标准**:
- `/test-security` 指令可独立执行
- 报告包含 OWASP Top 10 覆盖情况
- 高危漏洞必须修复后方可推进

---

## REQ-006: 测试数据管理 Skill

**现状**: 未考虑，Agent 可能使用真实敏感数据或数据不足。

**需求**:
1. 新增 `test-data-factory` Skill
2. 根据 schema 自动生成 mock 数据
3. 支持脱敏规则配置
4. 集成到所有测试指令中

**验收标准**:
- `test-data-factory` Skill 可被所有测试 Agent 加载
- 生成数据可重复、安全
- 支持 JSON Schema / OpenAPI Schema 输入

---

## REQ-007: 质量门禁配置文件 `quality-gates.yml`

**现状**: 测试分散在不同指令中，无统一质量策略配置。

**需求**:
1. 引入质量配置文件 `quality-gates.yml`（位于项目根目录 `.jarvis/`）
2. 定义各阶段必须通过的测试类型、覆盖率阈值、性能基线
3. 所有流程在适当 Gate 处读取配置，强制检查
4. 支持项目级自定义覆盖默认值

**验收标准**:
- 模板文件中包含 `quality-gates.yml` 模板
- 引擎在 Gate C2/D 读取配置
- 不达标时自动阻断并提示具体缺口

---

## REQ-008: 新增 `/refactor` 指令

**现状**: `/bug-fix` 隐含问题驱动，重构是"代码改善"驱动，不一致。直接用 `/jarvis` 太重。

**需求**:
1. 新增 `/refactor` 指令，独有 Gate 序列: R1→R2→R3→R4→R5
2. Gate R1: 定义重构边界与目标
3. Gate R2: 自动运行现有测试套件，生成基线覆盖率报告
4. Gate R3: 执行重构（由实现 Agent 完成）
5. Gate R4: 再次运行测试，对比覆盖率及关键断言，严禁行为漂移
6. Gate R5: 生成重构报告
7. 集成突变测试工具（Stryker/MutPy 等）

**验收标准**:
- `/refactor` 指令可独立执行
- R2/R4 覆盖率对比差异 ≤ 阈值（默认 0%）
- 重构报告自动生成

---

## REQ-009: 新增 `/hotfix` 指令

**现状**: 生产 P0 故障需要绕过 Gate A/B 直接修 Bug，`/bug-fix` 节奏太慢。

**需求**:
1. 新增 `/hotfix` 指令，独有 Gate 序列: H0→H1→H2→H3
2. Gate H0: 紧急声明 + 指定审批人 + 人工确认
3. Gate H1: 最小化修复（仅修复根因，不重构）
4. Gate H2: 快速验证 + 自动回滚预案
5. Gate H3: 事后强制回溯到 Gate E 进行完整审计和根因分析

**验收标准**:
- `/hotfix` 指令可独立执行
- H0 阶段支持 CLI/Webhook 人工确认
- 引擎记录完整紧急链路供合规审计

---

## REQ-010: 新增 `/migrate` 指令

**现状**: 框架迁移/依赖升级需要对大量文件进行模式化修改，无专门流程支持。

**需求**:
1. 新增 `/migrate` 指令，独有 Gate 序列: M1→M2→M3→M4
2. Gate M1: 验证迁移规则的覆盖率
3. Gate M2: 应用迁移（逐文件执行）
4. Gate M3: 编译/构建验证
5. Gate M4: 自动修复迁移脚本无法覆盖的 Lint 错误

**验收标准**:
- `/migrate` 指令可独立执行
- 支持用户提供迁移脚本或规则文件
- M3/M4 自动循环修复

---

## REQ-011: 新增 `/evaluate` 指令

**现状**: 没有探索性流程，开发者需要原型验证后再决定。

**需求**:
1. 新增 `/evaluate` 指令，独有 Gate 序列: E0→E1→E2→E3
2. Gate E0: 定义评估标准和用例
3. Gate E1: 生成快速原型（隔离沙箱或分支）
4. Gate E2: 运行用例并收集指标
5. Gate E3: 生成评估报告（结论 + 建议）

**验收标准**:
- `/evaluate` 指令可独立执行
- 运行在隔离的沙箱或独立分支上
- 非破坏性，不影响主工作区

---

## REQ-012: 新增 `/debug` 指令

**现状**: 无专门的"问题定位"流程，诊断隐含在 `/bug-fix` 中。

**需求**:
1. 新增 `/debug` 指令，独有 Gate 序列: D0→D1→D2→D3→D4
2. Gate D0: 描述异常现象，收集日志/报错/环境快照
3. Gate D1: 自动生成最小复现用例
4. Gate D2: 插入智能日志/断点，启动调试会话
5. Gate D3: 交互式诊断（Agent 通过工具发送继续执行/查看变量/求值表达式）
6. Gate D4: 输出诊断报告（根因 + 代码位置 + 建议修复方案），不自动修改代码
7. 集成运行时调试工具（browser-use/agent-browser 通过标准协议附加进程）
8. 支持事后调试（Post-mortem）：自动解析 core dump/崩溃日志/堆栈跟踪

**验收标准**:
- `/debug` 指令可独立执行
- D3 阶段支持交互式断点调试
- 诊断报告与修复方案分离
- Post-mortem 模式支持离线分析

---

## REQ-013: 增强 `/bug-fix` 前置诊断能力

**现状**: 诊断步骤隐含在流程中，不够显式。

**需求**:
1. 在 `/bug-fix` 流程中增加显式诊断 Gate
2. 复现后强制要求 Agent 调用调试工具获取运行时证据
3. 生成诊断报告后再进入修复流程
4. 选项：若已有 `/debug` 指令，`/bug-fix` 可先调用 `/debug` 再自动进入修复

**验收标准**:
- `/bug-fix` 流程包含显式诊断阶段
- 修复前必须有运行时证据支撑

---

## REQ-014: 全平台移动端/跨端 Gate B 三分析补齐

**现状**: Android/iOS/Flutter/Expo/Taro 等平台的 command 文件缺少 Gate B-DDD、Gate B-BDD、Gate B-TDD 三个分析阶段。

**需求**:
1. 为以下平台 command 补齐 Gate B 三分析:
   - `android.md` — 增加 Gate B-DDD / B-BDD / B-TDD
   - `ios.md` — 增加 Gate B-DDD / B-BDD / B-TDD
   - `flutter.md` — 增加 Gate B-DDD / B-BDD / B-TDD
   - `expo.md` — 增加 Gate B-DDD / B-BDD / B-TDD
   - `taro.md` — 增加 Gate B-DDD / B-BDD / B-TDD
2. 每个平台的 DDD 分析产出对应平台的领域模型
3. 每个平台的 BDD 场景覆盖平台特定交互

**验收标准**:
- 5 个平台 command 文件均包含 Gate B 三分析
- 流程与 `/frontend`/`/backend` 对齐

---

## REQ-015: OpenAPI/Swagger API 文档维护 Agent

**现状**: API 文档维护没有专门的 Agent 和流程支持。

**需求**:
1. 在 `api-contract-expert` Agent 模板中增加 OpenAPI/Swagger 文档维护职责
2. 支持从代码注解/装饰器自动生成 OpenAPI spec
3. 支持从 OpenAPI spec 生成 API 文档页面
4. 在 Gate E 发布阶段检查 API 文档与代码一致性

**验收标准**:
- `api-contract-expert` 支持 OpenAPI 生成与校验
- Gate E 中检查 API 文档一致性

---

## REQ-016: 流水线深度优化

**现状**: 任务分解粒度、中途变更管理、人机干预策略、跨会话上下文等存在提升空间。

**需求**:
1. **动态粒度策略**: Agent 系统提示加入根据项目规模自动限制最大子任务数（≤ 5）
2. **变更请求处理**: 新增 `/jarvis-change` 指令，评估影响范围，决定回退或插入
3. **风险评估模型**: 小范围变更自动降低确认级别，复杂风险操作强制人工确认
4. **跨会话上下文继承**: 新任务启动时自动注入相似任务摘要

**验收标准**:
- planner Agent 模板包含动态粒度说明
- `/jarvis-change` 指令工作流完整
- 风险评估模型在引擎中有对应阈值配置

---

## REQ-017: DevOps/CI/CD 流程整合

**现状**: Jarvis 主要工作在本地环境，与 CI/CD 管线集成不深。

**需求**:
1. 每个 Gate 封装为独立 CLI 命令（如 `jarvis gate-check C2`）
2. CI 模式环境变量支持（`JARVIS_CI=true`），跳过人工确认步骤
3. CI 模式输出 JUnit/xUnit 格式测试报告

**验收标准**:
- `jarvis gate-check <Gate>` CLI 命令可被 CI 脚本调用
- CI 模式保留完整日志但不阻塞等待人工输入

---

## REQ-018: 知识库/文档自动化

**现状**: 缺乏项目文档的自动生成和维护流程，代码更新后文档过时。

**需求**:
1. 在 Gate E 增加文档同步检查子步骤
2. 新增 `/doc` 指令，专门用于更新所有自动生成文档
3. `docs-engineer` Agent 增强自动对比代码变更与文档站的能力

**验收标准**:
- `/doc` 指令可独立执行
- Gate E 文档同步检查不通过时阻断发布

---

## REQ-019: Web 面板同步适配

**现状**: 新增指令/流程未在 Web 面板中体现。

**需求**:
1. Web 面板 Dashboard 支持新指令流程状态展示
2. Commands.tsx 页面更新为包含所有新增指令
3. Archive.tsx 支持新流程归档查看
4. Agents.tsx 页面更新 agent 列表（新增的 agent）
5. 布局适配新的 Gate 图标和流程可视化

**验收标准**:
- Web 面板显示所有新增指令
- 新 Gate 序列在 Dashboard 中有对应可视化
- 归档支持新流程类型过滤

---

## REQ-020: 引擎与 CLI 更新

**现状**: 引擎 gates.ts 仅定义了 full/frontend/backend/lite 四种流水线。

**需求**:
1. 在 `PIPELINE_DEFS` 中注册新流水线: refactor, hotfix, migrate, evaluate, debug
2. 在 `GATE_OPERATIONS` 中注册新 Gate 的操作权限
3. 在 `GATE_AGENT_GUIDE` 中注册新 Gate 的可生成 Agent
4. CLI 命令注册表更新（`.claude/commands/` 新增 .md 文件）
5. CLI 入口支持新指令路由

**验收标准**:
- 引擎 FSM 正确处理所有新 Gate
- 新指令可被 Claude Code 识别并执行
- gate_check 对新 Gate 返回正确权限

---

## REQ-021: Skills 库扩展

**现状**: 现有技能库缺少测试数据工厂、性能测试、安全测试等方法论。

**需求**:
1. 新增 `test-data-factory` Skill（测试数据生成与脱敏）
2. 新增 `perf-testing` Skill（性能测试方法论）
3. 新增 `security-testing` Skill（安全测试 DAST 方法论）
4. 新增 `refactoring` Skill（重构安全网方法论）
5. 新增 `debugging-deep` Skill（深度调试与事后分析方法论）

**验收标准**:
- 5 个新 Skill 文件完整（含 SKILL.md + frontmatter）
- 与现有技能体系无循环依赖

---

## 非功能需求

- **NFR-01**: 所有新增指令的流程文档图（flows/*.md）同步更新
- **NFR-02**: 新指令 prompt 遵循现有 command 模板风格
- **NFR-03**: 向后兼容：已有指令行为不变
- **NFR-04**: 引擎 FSM 拒绝回退/跳跃的硬约束对新 Gate 同样生效
- **NFR-05**: 所有变更通过 `/jarvis` 全流程的 Gate 检查

---

## 依赖关系

```
REQ-020(引擎更新) ← 被所有其他 REQ 依赖
REQ-007(质量配置) ← 被 REQ-001~006 依赖
REQ-019(Web适配) ← 依赖 REQ-008~014
REQ-021(Skills扩展) ← 被 REQ-006 依赖
```
