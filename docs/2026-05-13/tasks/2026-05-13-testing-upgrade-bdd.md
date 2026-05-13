# 贾维斯高价值聚合行为 BDD 场景

> DDD 分析: `docs/2026-05-13/tasks/2026-05-13-testing-upgrade-ddd.md`
> 需求文档: `docs/2026-05-13/requirements/REQ-2026-05-13-testing-upgrade.md`
> 日期: 2026-05-13
> 版本: v1.0

本文档为 5 个 BDD 路由聚合行为编写 Gherkin 验收场景，每个聚合至少包含 1 个 Happy Path 和 1 个异常/边界场景。

---

## 场景 1: `/test-unit` 覆盖率门禁不通过

**聚合**: TestExecutionPipeline + QualityGate
**领域服务**: CoverageAnalysisService, QualityGateEvaluationService
**领域事件**: CoverageThresholdNotMet, QualityGateFailed
**不变条件**: 覆盖率低于阈值 → 必须退回 Gate C-impl 修复

### Happy Path — 单元测试通过且覆盖率达标，流水线顺利推进

```gherkin
Feature: 单元测试覆盖率门禁检查
  作为开发流程的 Gate C2 门禁，
  当执行 `/test-unit` 指令时，
  系统应自动比对覆盖率报告与 quality-gates.yml 阈值，
  覆盖率达标则允许流水线推进。

  Scenario: 新增模块单元测试覆盖率达标，顺利通过 Gate C2
    Given 开发者已通过 Gate A（需求澄清）和 Gate B（设计与任务分解）
      And 项目根目录 `.jarvis/quality-gates.yml` 配置了单元测试覆盖率阈值为 80%
      And 引擎当前处于 Gate C-impl（实现阶段）
      And 新增模块 `src/services/order-service.ts` 包含 3 个公开函数和 2 个私有工具函数
    When 开发者发起 `/test-unit` 指令
      And TestGenerationService 自动检测到 Jest 测试框架
      And TestGenerationService 为 `order-service.ts` 生成 5 个测试用例
      And CoverageAnalysisService 执行测试套件并生成覆盖率报告
      And CoverageReport 显示 lineCoverage=87%, branchCoverage=82%, functionCoverage=100%
      And QualityGateEvaluationService 读取 quality-gates.yml 并比对覆盖率报告
    Then 门禁判定为 **PASS**
      And GateCheckpoint 记录: gate=C2, sessionId=当前会话, passedAt=当前时间, evidence=覆盖率报告路径
      And 领域事件 **TestSuiteCompleted** 被发布到 PubSub
      And 引擎允许流水线推进到 Gate C3（E2E 验证）或 Gate D（审查）
      And WebPanel Dashboard 上对应会话的 Gate C2 状态更新为绿色通过
```

### 异常场景 — 覆盖率不达标，门禁阻断并退回修复

```gherkin
  Scenario: 覆盖率低于 quality-gates.yml 阈值，门禁阻断并退回 Gate C-impl
    Given 项目根目录 `.jarvis/quality-gates.yml` 配置了单元测试覆盖率阈值为 80%
      And 开发者提交了包含 150 行新增逻辑的模块 `src/services/payment-handler.ts`
      And 该模块包含支付状态机、退款计算、手续费扣除等核心业务规则
    When `/test-unit` 指令执行完毕
      And CoverageReport 显示 lineCoverage=62%, branchCoverage=48%, functionCoverage=71%
      And 共发现 14 处未覆盖的代码行（uncoveredLines[] 包含关键状态转换分支）
    Then QualityGateEvaluationService 执行门禁判定:
      | 指标           | 实际值 | 阈值 | 结果   |
      |---------------|--------|------|--------|
      | lineCoverage   | 62%    | 80%  | FAIL   |
      | branchCoverage | 48%    | 80%  | FAIL   |
      | functionCoverage | 71%  | 80%  | FAIL   |
      And 领域事件 **CoverageThresholdNotMet** 被发布
        And 事件 payload 包含 uncoveredLines[] 的 14 个具体位置
        And 事件 payload 包含 coverageGap（18% 的行覆盖率缺口）
      And 领域事件 **QualityGateFailed** 被发布
        And violations[] 包含:
          - violation: "行覆盖率 62% 未达到阈值 80%，缺口 18%"
          - violation: "分支覆盖率 48% 未达到阈值 80%，缺口 32%"
          - violation: "函数覆盖率 71% 未达到阈值 80%，缺口 9%"
      And 引擎拒绝推进 Gate C2 → Gate C3
      And 引擎将流程状态退回 Gate C-impl
      And FlowState 记录: stuckReason="CoverageThresholdNotMet", currentGate="C-impl"
      And WebPanel Dashboard 显示 Gate C2 状态为红色阻断，附带缺口详情链接
      And Agent 向开发者输出结构化提示:
        """
        ❌ 覆盖率门禁未通过:
        - 行覆盖率: 62% (需 ≥80%) — 缺失 18%: 参见 uncoveredLines[]
        - 分支覆盖率: 48% (需 ≥80%) — 缺失 32%: 支付状态机的退款分支、手续费计算分支未覆盖
        - 函数覆盖率: 71% (需 ≥80%) — 缺失 9%: calculateRefund()、applyFeeCap() 未测试
        → 请补充测试用例后重新执行 /test-unit
        """
```

### 边界场景 — 覆盖率精确等于阈值（临界通过）

```gherkin
  Scenario: 覆盖率恰好等于阈值 80%，边界通过
    Given `.jarvis/quality-gates.yml` 配置 lineCoverage 阈值为 80%
    When CoverageAnalysisService 执行测试并生成覆盖率报告
      And CoverageReport 显示 lineCoverage=80%, branchCoverage=82%, functionCoverage=85%
      And lineCoverage 精确等于阈值 80%
    Then QualityGateEvaluationService 比对逻辑使用 >= 操作符
      And 门禁判定为 **PASS**（80% ≥ 80% 成立）
      And 引擎允许流水线推进
```

### 边界场景 — 项目自定义阈值低于默认值 50%，拒绝配置

```gherkin
  Scenario: 项目级 quality-gates.yml 将覆盖率设为 30%，低于默认值 50% 的硬约束
    Given 全局默认覆盖率阈值为 80%
      And 项目 `.jarvis/quality-gates.yml` 中覆盖值 lineCoverage=30%
    When QualityGateEvaluationService 加载配置文件
      And 检查 projectOverride.minLineCoverage=30% 与 defaultThreshold=80%
    Then 30% < 80% * 50% = 40%
      And 配置校验失败: 项目自定义阈值不可低于默认值的 50%
      And 系统拒绝使用该配置值，回退到默认阈值 80%
      And GateCheckpoint 记录配置覆盖被拒绝的 evidence
```

---

## 场景 2: `/hotfix` H0 紧急声明

**聚合**: HotfixSession (CommandFlow 子聚合)
**领域服务**: HotfixApprovalService
**领域事件**: HotfixApproved, AgentSpawned
**不变条件**: H3 不可跳过（合规审计强制）

### Happy Path — 生产 P0 故障声明通过审批，热修复链路启动

```gherkin
Feature: 热修复 H0 紧急声明与人工审批
  当生产环境发生 P0 故障时，
  开发者通过 `/hotfix` 指令声明紧急情况，
  系统应执行人工审批链并记录完整链路供合规审计。

  Scenario: 生产 P0 故障通过审批人确认，热修复流程顺利启动
    Given 生产环境 `api-gateway` 服务返回 500 错误率超过 50%
      And 根因初步定位为最新部署引入的数据库连接池配置错误
      And 影响范围: 全部用户的登录和支付功能不可用
      And 开发者拥有 hotfix 发起权限（在引擎 allow 矩阵中通过 Gate H0 spawn 权限检查）
      And 审批人 `tech-lead` 在引擎用户清单中已注册
    When 开发者发起 `/hotfix api-gateway 数据库连接池配置错误`
      And 引擎解析指令，加载 HotfixSession 聚合
      And EmergencyDeclaration 实体被创建:
        - severity=CRITICAL
        - impactScope="全部用户登录与支付不可用"
        - declaredBy="当前开发者"
        - declaredAt=当前时间戳
      And HotfixApprovalService 执行审批流程:
        1. 生成 ApprovalRecord (approver=tech-lead, channel=CLI, status=PENDING)
        2. 将审批请求发送给指定审批人（通过 CLI / Webhook / Web 面板通知）
        3. 挂起当前会话，等待人工确认
    Then 审批人 `tech-lead` 在 CLI 中输入确认信息并附上理由:
        "确认紧急修复数据库连接池配置，回滚预案已审查"
      And HotfixApprovalService 更新 ApprovalRecord:
        - status=APPROVED, approvedAt=当前时间, rationale=确认理由
      And 领域事件 **HotfixApproved** 被发布到 PubSub
        And 事件 payload 包含: emergencyDeclaration, approvalRecord, sessionId
      And 引擎将流程状态从 Gate H0 推进到 Gate H1（最小化修复）
      And 引擎在 checkpoints 表中记录完整的审批轨迹:
        - 紧急声明（谁、何时、什么严重程度）
        - 审批记录（谁审批、何时、通过什么渠道、审批理由）
        - 链路时间戳（从 H0 发起到审批完成的总耗时）
      And WebPanel Dashboard 上该 hotfix 会话显示:
        - Gate H0 状态: 绿色（已审批）
        - 审批人: tech-lead
        - 总耗时: XX 秒
```

### 异常场景 — 审批人拒绝或超时，紧急链路阻断

```gherkin
  Scenario: 审批人拒绝热修复请求，H0 阻断
    Given 开发者发起 `/hotfix` 指令，EmergencyDeclaration 已生成
      And HotfixApprovalService 已将审批请求发送给审批人
    When 审批人在 CLI 中输入拒绝:
        "根因未充分确认，当前有可用降级方案，无需绕过常规流程"
    Then HotfixApprovalService 更新 ApprovalRecord: status=REJECTED
      And Engine 将 FlowState 标记为 stuckReason="HotfixRejected"
      And 领域事件 **QualityGateFailed** 被发布（在 H0 阶段）
      And 开发者收到拒绝通知及审批人给出的理由
      And H1 不会被激活
      And 紧急链路记录完整保留（声明 + 拒绝 = 完整的合规证据）

  Scenario: 审批人在 30 分钟内未响应，紧急链路超时阻断
    Given 审批请求已发送给审批人
    When 系统等待 30 分钟后仍未收到审批响应
    Then HotfixApprovalService 触发超时策略
      And ApprovalRecord 状态更新为 TIMEOUT
      And 系统通知开发者和审批人: "紧急审批已超时，请重新发起或联系其他审批人"
      And 引擎阻断当前 hotfix 会话，不做推进
      And FlowState 记录: stuckReason="HotfixApprovalTimeout", stuckAt=当前时间
      And Gate H0 审批超时事件被写入引擎 checkpoints 供事后审计
```

### 边界场景 — H0 审批通过但非紧急（误报），事后审计可追溯

```gherkin
  Scenario: 开发者误将非紧急问题声明为 P0 热修复，事后审计发现
    Given 开发者将 P2 级别的 UI 文案错误声明为 P0 紧急热修复
      And 审批人未充分审查即通过审批
      And 热修复流程完成（H1→H2→H3）
    When 合规审计流程在 H3 阶段回溯审批链路
      And 引擎对比 EmergencyDeclaration.severity=CRITICAL 与实际影响范围
    Then 审计报告标记: "H0 紧急声明严重程度与实际不符"
      And ApprovalRecord 中审批人承担连带审查责任
      And 引擎在 checkpoints 中留下审计标记供合规归档
      And 该事件不阻塞热修复代码发布（热修复已经部署），但纳入审批人绩效审计
```

---

## 场景 3: `/refactor` R4 行为漂移检测

**聚合**: RefactorSession (CommandFlow 子聚合)
**领域服务**: RefactorSafetyNetService
**领域事件**: RefactorDriftDetected
**不变条件**: 行为漂移 > 0% → 必须阻断 R5
**关键实体**: CoverageBaseline, CoverageReport, MutationTestResult

### Happy Path — 重构后覆盖率完全一致，R4 通过允许推进 R5

```gherkin
Feature: 重构行为漂移检测
  当开发者通过 `/refactor` 指令重构代码时，
  系统必须在 R4 阶段对比重构前后的测试覆盖率，确保无行为漂移，
  只允许覆盖率完全一致（或提升）的重构通过。

  Scenario: 重构后覆盖率和关键断言与基线完全一致，R4 通过
    Given 开发者执行 `/refactor` 指令，重构目标为 `src/utils/date-formatter.ts`
      And Gate R1 已完成：重构边界定义为仅重构内部实现，保持对外接口不变
      And Gate R2 已完成：RefactorSafetyNetService 已生成 CoverageBaseline:
        - snapshotAt=重构前的时间戳
        - lineCoverage=92%, branchCoverage=88%, functionCoverage=100%
        - mutationScore=75（突变测试评分）
        - 关键断言快照 hash="sha256:abc123..."
      And Gate R3 已完成：实现 Agent 完成了以下重构:
        - 提取了 3 个内部辅助函数
        - 消除了 switch-case 分支，改用 Map 映射
        - 没有修改任何 public API 签名
    When 引擎推进到 Gate R4，RefactorSafetyNetService 执行行为漂移检测:
      1. 再次运行完整测试套件
      2. CoverageAnalysisService 生成新的 CoverageReport:
         - lineCoverage=92%, branchCoverage=90%, functionCoverage=100%
      3. 与 CoverageBaseline 逐项对比
      4. MutationTestResult 新评分 = 78（killedMutants 增加，评分提升）
    Then 对比结果:
      | 指标           | 基线 | 重构后 | 差异 | 判定 |
      |---------------|------|--------|------|------|
      | lineCoverage   | 92%  | 92%    | 0%   | PASS |
      | branchCoverage | 88%  | 90%    | +2%  | PASS |
      | functionCoverage | 100% | 100%  | 0%   | PASS |
      | mutationScore  | 75   | 78     | +3   | PASS |
      And 行为漂移 = 0%（无覆盖率下降，无断言变更）
      And RefactorSafetyNetService 判定: **DRIFT_NOT_DETECTED**
      And 领域事件 **TestSuiteCompleted** 被发布（R4 测试套件完成）
      And 引擎允许推进到 Gate R5（生成重构报告）
      And RefactorSession 记录: coverageBaseline + coverageReport 双快照存档
```

### 异常场景 — 重构后覆盖率下降，行为漂移阻断

```gherkin
  Scenario: 重构导致分支覆盖率下降，涉及关键断言变更，R4 阻断
    Given Gate R2 CoverageBaseline 已生成:
        - lineCoverage=90%, branchCoverage=85%, functionCoverage=95%
        - 关键断言快照 hash="sha256:def456..."
      And Gate R3 实现 Agent 执行了 "优化" 操作:
          - 合并了两个函数，但删除了一个边界条件检查
          - 简化了错误处理路径（移除了 `catch` 块中的状态回滚逻辑）
    When Gate R4 RefactorSafetyNetService 执行覆盖率对比:
      And 新 CoverageReport 显示:
        - lineCoverage=82%（下降 8%）
        - branchCoverage=71%（下降 14%）
        - functionCoverage=90%（下降 5%）
      And 关键断言快照 hash="sha256:xyz789..."（与基线不匹配）
      And MutationTestResult: killedMutants 从 45 下降到 38（6 个原本被 kill 的突变变为存活）
    Then RefactorSafetyNetService 生成差异报告:
      | 指标           | 基线 | 重构后 | 差异   | 判定 |
      |---------------|------|--------|--------|------|
      | lineCoverage   | 90%  | 82%    | -8%    | FAIL |
      | branchCoverage | 85%  | 71%    | -14%   | FAIL |
      | functionCoverage | 95% | 90%   | -5%    | FAIL |
      | mutationScore  | 75   | 65     | -10    | FAIL |
      And 领域事件 **RefactorDriftDetected** 被发布:
        - driftSeverity=HIGH
        - affectedAssertions[] 包含变化的关键断言列表
        - uncoveredLines[] 包含重构引入的 8% 行覆盖率缺失位置
      And 引擎拒绝推进 Gate R4 → Gate R5
      And FlowState 记录: stuckReason="RefactorDriftDetected", currentGate="R4"
      And Agent 向开发者输出:
        """
        ❌ 重构行为漂移检测不通过:
        - 分支覆盖率下降 14%: 合并函数时删除了 `processRefundEdgeCase()` 的边界条件测试
        - 关键断言变化: 错误处理回滚逻辑被移除，`handlePaymentError` 不再恢复状态
        - 突变存活增加: 6 个原本被测试杀死的突变变为存活
        → 建议: 回退此次重构，或先恢复所有被影响的测试覆盖后再重试
        """
      And 领域事件 **QualityGateFailed** 被发布，阻断流水线
```

### 边界场景 — 重构后覆盖率提升但引入了新的不测试代码路径

```gherkin
  Scenario: 重构后整体覆盖率提升，但新增路径中有 0% 覆盖的风险代码
    Given CoverageBaseline lineCoverage=78%
      And Gate R3 执行重构时新增了 `src/utils/retry-policy.ts` 模块（100 行）
      And `/test-unit` 未为新模块自动生成测试（该模块在重构边界内但被遗漏）
    When Gate R4 执行覆盖率对比
      And CoverageReport 显示整体 lineCoverage=83%（提升 5%）
      But 新增模块 `retry-policy.ts` 的局部 lineCoverage=0%
    Then RefactorSafetyNetService 检测到: 重构边界内的新增模块未覆盖
      And 按不变量 "行为漂移 > 0%" 判定: **DRIFT_DETECTED**
      And 差异报告标记新增模块为 ZERO_COVERAGE_NEW_MODULE
      And 引擎阻断推进，要求对新增模块补充测试
      And Agent 提示: "重构范围包含新增模块 `retry-policy.ts`，该模块当前 0% 覆盖，请为其生成单元测试"
```

---

## 场景 4: `quality-gates.yml` 质量门禁阻断

**聚合**: QualityGate
**领域服务**: QualityGateEvaluationService
**领域事件**: QualityGateFailed, PipelineAdvanced
**不变条件**:
- 默认阈值必须合法且不可为空
- 项目自定义值不可低于默认值的 50%
- 门禁判定结果必须在 engine checkpoints 表中记录

### Happy Path — 全部门禁通过，流水线正常推进

```gherkin
Feature: 质量门禁配置与执行
  作为流水线的质量守门员，
  QualityGate 聚合应在各关键 Gate 处读取 quality-gates.yml 配置，
  对所有测试报告进行门禁判定，全通过才允许推进。

  Scenario: 全部门禁指标达标，流水线顺利通过 Gate C2 和 Gate D
    Given `.jarvis/quality-gates.yml` 配置如下:
        ```yaml
        gates:
          C2:
            unit_test:
              line_coverage: { min: 80, on_violation: block }
              branch_coverage: { min: 80, on_violation: block }
            integration_test:
              pass_rate: { min: 100, on_violation: block }
          D:
            security_scan:
              high_vulns: { max: 0, on_violation: block }
              medium_vulns: { max: 0, on_violation: warn }
            lint:
              errors: { max: 0, on_violation: block }
              warnings: { max: 5, on_violation: warn }
        ```
    When 引擎执行 Gate C2 门禁检查:
      And CoverageReport: lineCoverage=87%, branchCoverage=82%
      And IntegrationTestReport: passRate=100%
    Then QualityGateEvaluationService 读取 quality-gates.yml 的 Gate C2 条件
      And 逐一比对:
        | 条件                    | 实际值 | 操作符 | 阈值 | 判定 |
        |------------------------|--------|--------|------|------|
        | unit_test.line_coverage | 87%    | >=     | 80%  | PASS |
        | unit_test.branch_coverage | 82%  | >=     | 80%  | PASS |
        | integration_test.pass_rate | 100% | >=    | 100% | PASS |
      And 门禁判定: **ALL_PASS**
      And GateCheckpoint 写入引擎 checkpoints:
        - gate=C2, sessionId=当前, passedAt=当前, violations=[]
      And 领域事件 **PipelineAdvanced** 被发布（Gate C2→C3）
      And 流程推进到 Gate C3（E2E 验证）
    When 引擎继续执行到 Gate D 门禁检查:
      And SecurityScanResult: highVulns=0, mediumVulns=1
      And LintReport: errors=0, warnings=3
    Then QualityGateEvaluationService 逐一比对:
        | 条件                      | 实际值 | 操作符 | 阈值 | 判定 |
        |--------------------------|--------|--------|------|------|
        | security_scan.high_vulns   | 0      | <=     | 0    | PASS |
        | security_scan.medium_vulns | 1      | <=     | 0    | WARN |
        | lint.errors               | 0      | <=     | 0    | PASS |
        | lint.warnings             | 3      | <=     | 5    | PASS |
      And 1 个 WARN（medium_vulns=1），不符合 block 级别，允许推进
      And GateCheckpoint 记录: gate=D, violations=[{type: WARN, detail: "中危漏洞 1 个"}]
      And 流水线继续推进到 Gate E（发布）
```

### 异常场景 — 高危安全漏洞触发强制阻断

```gherkin
  Scenario: 安全扫描发现高危漏洞，无论其他指标如何，强制阻断 Gate D
    Given quality-gates.yml Gate D 配置:
        security_scan.high_vulns: { max: 0, on_violation: block }
      And 其他各项指标均达标（测试覆盖率、Lint 等全部通过）
    When Gate D 执行 `/test-security` DAST 扫描
      And SecurityScanResult:
        - highVulns=2（CWE-89 SQL 注入、CWE-79 反射型 XSS）
        - mediumVulns=3
        - lowVulns=1
    Then QualityGateEvaluationService 判定 security_scan.high_vulns:
        - 实际值 2 > 阈值 0 → **BLOCK**
        - on_violation=block，必须阻断
      And 领域事件 **SecurityVulnerabilityFound** 被发布:
        - vulnCount=6, severity=HIGH
        - cveIds=[...]
        - owaspCategories=["A03:2021-Injection", "A07:2021-XSS"]
        - remediationSteps=["参数化查询", "输出编码"]
      And 领域事件 **QualityGateFailed** 被发布
        - violations 包含 2 个高危漏洞的详细信息
      And 引擎阻断流水线推进 Gate D → Gate E
      And FlowState 记录: stuckReason="UnresolvedHighVulnerabilities"
      And **无论**其他指标（测试覆盖率、Lint）是否全部 PASS，高危安全漏洞强制阻断
      And Agent 向开发者输出阻断详情和修复建议

  Scenario: 多门禁复合失败——测试覆盖率和安全扫描同时不通过
    Given Gate C2 覆盖率报告显示 lineCoverage=65%（未达 80%）
      And Gate D 安全扫描发现 1 个高危漏洞和 5 个中危漏洞
    When QualityGateEvaluationService 依次执行所有门禁检查
    Then 复合失败报告:
        | Gate | 失败条件                         | on_violation |
        |------|---------------------------------|--------------|
        | C2   | unit_test.line_coverage 65%<80% | block        |
        | D    | security.high_vulns 1>0          | block        |
        | D    | security.medium_vulns 5>0        | warn         |
      And engine checkpoints 记录所有失败条件的完整 violations[]
      And 流水线被阻断在当前 Gate，不跳过任何检查点
      And 开发者必须逐一修复所有 block 级别的违反项后方可重新触发门禁检查
```

### 边界场景 — quality-gates.yml 文件缺失，使用系统默认值

```gherkin
  Scenario: 项目根目录不存在 quality-gates.yml，引擎使用内置默认值
    Given 项目根目录没有 `.jarvis/quality-gates.yml` 文件
    When QualityGateEvaluationService 初始化时尝试加载项目配置
      And 文件不存在
    Then 使用引擎内置默认 QualityProfile:
        - unit_test.line_coverage: 80%
        - unit_test.branch_coverage: 80%
        - integration_test.pass_rate: 100%
        - security_scan.high_vulns: 0
        - lint.errors: 0
      And GateCheckpoint 记录: qualityProfileSource=DEFAULT（非 project）
      And 门禁判定使用默认阈值正常运行
      And Agent 提示开发者: "未检测到项目质量配置，使用内置默认值。可通过 /jarvis 流程中的 Gate B-DDD 生成 quality-gates.yml"
```

### 边界场景 — quality-gates.yml 格式错误，拒绝加载

```gherkin
  Scenario: quality-gates.yml 存在 YAML 语法错误，加载失败并回退默认值
    Given `.jarvis/quality-gates.yml` 文件存在但包含非法的 YAML 语法
        (例如 `unit_test` 的缩进使用了 Tab 而非空格)
    When QualityGateEvaluationService 尝试解析配置文件
      And YAML 解析器抛出 ParseError
    Then QualityGateEvaluationService:
      1. 记录解析错误到 engine checkpoints（含错误行号和原因）
      2. 回退使用内置默认 QualityProfile
      3. 继续执行门禁判定（不因配置错误而阻塞流水线，但降级到默认值）
      And GateCheckpoint 记录: qualityProfileSource=FALLBACK, parseError="Tab 缩进非法，第 5 行"
      And Agent 提示开发者: "quality-gates.yml 解析失败，已回退默认值。请修复 YAML 语法后重新加载"
```

---

## 场景 5: `/evaluate` 评估报告生成

**聚合**: CommandFlow (evaluate 子流程)
**领域服务**: EvaluationOrchestrationService
**领域事件**: AgentSpawned, PipelineAdvanced
**Gate 序列**: E0→E1→E2→E3
**不变条件**: 运行在隔离沙箱或独立分支，非破坏性，不影响主工作区

### Happy Path — 完整的评估流程产出高质量结论报告

```gherkin
Feature: 技术方案评估与报告生成
  作为技术选型决策支持，
  `/evaluate` 指令应在隔离环境中执行评估用例，
  收集多维指标，生成结构化评估报告，为后续技术选型提供数据支撑。

  Scenario: 对两个候选技术方案执行评估，产出包含决策建议的报告
    Given 项目需要选择消息队列方案: RabbitMQ vs Kafka
      And 评估环境: 当前分支的隔离沙箱，不影响主工作区
    When 开发者发起 `/evaluate "消息队列选型: RabbitMQ vs Kafka"`
      And Gate E0 执行:
        - 定义评估维度: 吞吐量、延迟、运维复杂度、社区生态、学习成本
        - 定义用例: 10万消息/秒吞吐测试、端到端延迟测试、故障恢复测试
        - 定义权重: [throughput: 30%, latency: 25%, ops: 20%, ecosystem: 15%, learning: 10%]
        - 定义成功标准: 综合得分 ≥ 70 分为推荐方案
    Then Gate E0 产出: EvaluationCriteria 文档（评估标准+用例+权重+成功标准）
      And 引擎推进到 Gate E1
    When Gate E1 执行:
      And EvaluationOrchestrationService 在隔离沙箱中为 RabbitMQ 和 Kafka 各生成快速原型
        - 每个方案包含: Docker Compose 环境 + 生产者 + 消费者 + 监控
      And 原型代码在隔离分支 `eval/msg-queue-selection` 上执行
      And 主工作区的代码和环境不受影响
    Then Gate E1 产出: 两个独立运行的原型环境
      And 引擎推进到 Gate E2
    When Gate E2 执行:
      And EvaluationOrchestrationService 按 E0 定义的用例分别运行两个方案:
        | 用例              | RabbitMQ 结果         | Kafka 结果              |
        |-------------------|-----------------------|-------------------------|
        | 10万消息/秒吞吐    | 85,000 msg/s         | 120,000 msg/s          |
        | 端到端 p99 延迟    | 12ms                  | 8ms                     |
        | 故障恢复时间       | 3s                    | 5s                      |
        | Docker 启动耗时    | 8s（单节点）          | 15s（必含 ZK）          |
        | 运维配置复杂度     | 低（简单队列语义）    | 中（分区/offset 管理）  |
      And 所有用例自动运行 3 轮取平均值和标准差
    Then Gate E2 产出: 原始指标数据 + 可复现的测试脚本
      And 引擎推进到 Gate E3
    When Gate E3 执行:
      And EvaluationOrchestrationService 计算加权综合得分:
        | 方案      | throughput | latency | ops  | ecosystem | learning | **综合** |
        |-----------|------------|---------|------|-----------|----------|----------|
        | RabbitMQ  | 21.3       | 18.8    | 18.0 | 12.0      | 9.0      | **79.1** |
        | Kafka     | 30.0       | 25.0    | 12.0 | 13.5      | 7.0      | **87.5** |
      And 生成结构化评估报告 `docs/testing/evaluate-msg-queue-selection.md`:
        ```markdown
        # 评估报告: 消息队列选型

        ## 结论
        **推荐 Kafka**（综合得分 87.5 > RabbitMQ 79.1）

        ## 关键差异
        - 吞吐: Kafka 领先 41%（120K vs 85K msg/s）
        - 延迟: Kafka p99 低 33%（8ms vs 12ms）
        - 运维: RabbitMQ 更简单（单节点部署，无需 ZooKeeper）

        ## 风险评估
        - Kafka 运维复杂度较高，需团队投入 ZK/分区管理学习
        - RabbitMQ 吞吐瓶颈在 85K/s，若业务增长需提前规划迁移

        ## 建议
        当前业务预估峰值 50K msg/s，两者均可满足。
        考虑未来 2 年增长至 200K+，推荐 Kafka。
        若团队运维能力有限且 100K 足够，可选 RabbitMQ。
        ```
    Then 领域事件 **PipelineAdvanced** 被发布（E3 完成）
      And 评估报告落盘到 `docs/testing/`
      And 评估结论（推荐 Kafka）在引擎 checkpoints 中记录
      And WebPanel Dashboard 上该 evaluate 会话显示完整 Gate 序列（E0-E3 全部绿色）

  Scenario: 开发者看完评估报告后，在正常流程中引用评估结论做技术决策
    Given 评估报告已完成并落盘（推荐 Kafka）
    When 开发者在 `/backend` 流程的 Gate B-DDD 阶段引用评估报告:
        "消息队列选型请参见 docs/testing/evaluate-msg-queue-selection.md"
    Then DDD 分析 Agent 读取评估报告结论
      And 领域模型中的消息队列抽象直接使用 Kafka 适配器
      And 不需要在 DDD 阶段再次讨论技术选型
```

### 异常场景 — 评估原型构建失败，沙箱环境无法启动

```gherkin
  Scenario: Kafka Docker Compose 启动失败（端口冲突），评估仅完成 RabbitMQ 方案
    Given Gate E1 尝试在隔离沙箱中启动 Kafka 的 Docker Compose 环境
    When 沙箱中端口 9092 已被宿主进程占用
      And Kafka 容器启动失败，错误: "port already allocated: 0.0.0.0:9092"
    Then EvaluationOrchestrationService:
      1. 记录 Kafka 启动失败原因（端口冲突）
      2. RabbitMQ 原型正常启动（端口 5672 可用）
      3. 降级策略: 仅对比单方案指标 vs 历史基线
    Then Gate E2 执行时:
      And 仅运行 RabbitMQ 的用例
      And 对于 Kafka 列标记为 UNAVAILABLE（含失败原因）
    Then Gate E3 生成的评估报告:
      - 状态标记: PARTIAL（部分方案不可用）
      - Kafka 行显示: "环境构建失败: 9092 端口冲突"
      - 建议: "修复环境问题后重新评估，或仅基于 RabbitMQ 结果 + 文献调研做决策"
      And 报告结论置信度降级为 LOW
      And 引擎不阻断流程（评估是非阻塞指令），但明确标注数据完整性不足

  Scenario: 评估用例定义不清晰，E0 阶段校验拒绝推进
    Given 开发者发起 `/evaluate "选一个前端框架"`（需求模糊）
    When Gate E0 尝试定义评估标准:
      And 无法从输入中提取明确的评估维度（只有一个模糊的"选框架"目标）
      And 无法确定至少 2 个候选方案
    Then EvaluationOrchestrationService 拒绝创建 EvaluationCriteria
      And 返回结构化提示:
        """
        ❌ 评估标准不完整，无法推进 E0:
        - 缺失: 候选方案列表（请指定至少 2 个方案，如 "React vs Vue vs Svelte"）
        - 缺失: 评估维度（如性能、生态、学习成本、团队经验等）
        - 缺失: 成功标准（如"综合得分 ≥ X 分推荐"）
        → 请重新发起并明确以上信息
        """
      And 引擎不回退而是停留在 E0，等待开发者补充信息
      And FlowState 记录: stuckReason="IncompleteEvaluationCriteria"
```

### 边界场景 — 两个方案得分完全相同，报告给出"无显著差异"结论

```gherkin
  Scenario: 两个候选方案在所有维度得分相同，报告诚实给出平局结论
    Given 开发者发起 `/evaluate "JSON Schema 库: Ajv vs Zod"`
      And Gate E0 定义评估维度: 性能、包体积、TypeScript 类型推断、学习成本
    When Gate E2 执行完毕后，Gate E3 计算得分:
        | 方案 | 性能 | 体积 | TS 类型 | 学习 | **综合** |
        |------|------|------|---------|------|----------|
        | Ajv  | 85   | 70   | 60      | 75   | **72.5** |
        | Zod  | 80   | 75   | 95      | 85   | **72.5** |
    Then 评估报告结论: **"无显著差异（Ajv 72.5 ≈ Zod 72.5），两者互有优势"**
      And 报告详细列出各维度对比:
        - Ajv 优势: 纯性能略优（+5 分），包体积更小（70 vs 75）
        - Zod 优势: TypeScript 类型推断优秀（95 vs 60），学习曲线平缓（85 vs 75）
      And 报告给出条件建议:
        - "若项目重度依赖 JSON Schema 标准且对性能敏感 → 选 Ajv"
        - "若项目以 TypeScript 为主且重视开发体验 → 选 Zod"
      And 结论置信度: MEDIUM（平局，任一选择均有充分理由支撑）
```

---

## BDD 场景与 DDD 聚合交叉引用

| BDD 场景 | 聚合根 | 领域服务 | 核心领域事件 | 对应 REQ |
|---------|--------|---------|-------------|---------|
| 场景 1: `/test-unit` 覆盖率门禁 | TestExecutionPipeline, QualityGate | CoverageAnalysisService, QualityGateEvaluationService | CoverageThresholdNotMet, QualityGateFailed | REQ-001, REQ-007 |
| 场景 2: `/hotfix` H0 紧急声明 | HotfixSession | HotfixApprovalService | HotfixApproved | REQ-009 |
| 场景 3: `/refactor` R4 行为漂移 | RefactorSession | RefactorSafetyNetService | RefactorDriftDetected | REQ-008 |
| 场景 4: `quality-gates.yml` 阻断 | QualityGate | QualityGateEvaluationService | QualityGateFailed, SecurityVulnerabilityFound | REQ-007 |
| 场景 5: `/evaluate` 评估报告 | CommandFlow (evaluate) | EvaluationOrchestrationService | PipelineAdvanced | REQ-011 |

---

## 场景覆盖率总结

| 聚合行为 | Happy Path | 异常场景 | 边界场景 | 总计 |
|---------|-----------|---------|---------|------|
| `/test-unit` 覆盖率门禁 | 1 | 1 | 2 | 4 |
| `/hotfix` H0 紧急声明 | 1 | 2 | 1 | 4 |
| `/refactor` R4 行为漂移 | 1 | 1 | 1 | 3 |
| `quality-gates.yml` 阻断 | 1 | 2 | 2 | 5 |
| `/evaluate` 评估报告 | 2 | 2 | 1 | 5 |
| **总计** | **6** | **8** | **7** | **21** |

---

## 待确认项

以下场景依赖引擎层实现细节，建议在实现阶段与引擎开发对齐：

1. **审批超时阈值**: 场景 2 中 30 分钟审批超时是否可配置？需在 `quality-gates.yml` 或引擎配置中定义 `hotfix.approval_timeout` 字段。
2. **突变测试集成**: 场景 3 中 MutationTestResult 的实际工具选择（Stryker JS / MutPy / PIT）需在 `RefactorSafetyNetService` 实现时根据项目语言动态检测。
3. **评估报告格式**: 场景 5 的评估报告模板路径（`docs/testing/evaluate-*.md`）需在 `EvaluationOrchestrationService` 中固化。
4. **安全扫描工具**: 场景 4 中的 ZAP 集成需在 `SecurityScanService` 中实现，场景中使用了 OWASP ZAP 作为默认工具，若需替换应标注。
