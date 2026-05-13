# BDD 行为驱动分析 -- Jarvis-Agent-Factory 测试体系增强

> DDD 文档：`docs/2026-05-13/tasks/2026-05-13-test-systematization-ddd.md`
> 需求文档：`docs/2026-05-13/requirements/REQ-test-system-enhancement.md`
> 分析日期：2026-05-13
> 分析类型：BDD（行为驱动开发 -- Given/When/Then 验收场景）
> 覆盖行为：9 个 →BDD 路由聚合行为

---

## 一、BDD 场景总览

| 序号 | 聚合行为 | 所属上下文 | 关联 REQ | Happy Path | 异常场景 |
|------|---------|-----------|---------|------------|---------|
| BDD-001 | `evaluateGate()` | QualityGate | REQ-TEST-007, REQ-ENGINE-002 | 覆盖率达标 → 通过 | 覆盖率不达标 → BLOCKED |
| BDD-002 | `generateTests()` | Test Execution | REQ-TEST-001 | 自动识别框架 → 生成测试 → 全部通过 | 生成测试失败 → 不记录完成 |
| BDD-003 | `runCodeReview()` | Review | REQ-TEST-005 | 5 Agent 并行 → 综合签核 | CRITICAL 漏洞 → BLOCKED |
| BDD-004 | `startDebugSession()` + `diagnoseBug()` | Debug Session | REQ-CMD-005 | D0→D4 完整诊断 | Post-mortem 离线分析 |
| BDD-005 | `dispatchCommand()` /hotfix | Pipeline / Command | REQ-CMD-002 | H0→H3 紧急修复闭环 | 事后审计发现缺口 |
| BDD-006 | Refactor 行为不变验证 | Refactor & Migration | REQ-CMD-001 | R1→R5 重构通过 | 覆盖率下降 → BLOCKED |
| BDD-007 | `generateOpenAPIDoc()` | Contract | REQ-ENHANCE-003, REQ-API-001 | 扫描路由 → 生成文档 | 文档与实现不一致 |
| BDD-008 | `verifyContract()` | Contract | REQ-GATE-F-001 | 字段类型全匹配通过 | 契约不一致 → BLOCKED |
| BDD-009 | `shouldSkipConfirmation()` | QualityGate | REQ-ENHANCE-005 | 低风险静默通过 | 高风险强制确认 |

---

## 二、BDD 场景详细规格

---

### BDD-001：质量门禁评估 — `evaluateGate()`

**关联需求**：`REQ-TEST-007`（质量门禁统一配置）、`REQ-ENGINE-002`（quality-gates.yml 配置加载）

**业务价值**：质量门禁是交付质量的最后防线，必须确保覆盖率阈值检查准确、可追溯、可审计。

#### 场景 1A：覆盖率达标，门禁通过（Happy Path）

```gherkin
Feature: 质量门禁评估
  作为 流水线编排系统
  我希望 在 Gate C2 自动检查代码覆盖率是否达到配置阈值
  以便 只有质量达标的代码才能推进到下一阶段

  Background:
    Given 项目根目录存在 "quality-gates.yml" 配置文件
    And 配置中定义单元测试覆盖率阈值为 80%
    And 当前处于 Gate C2

  Scenario: 单元测试覆盖率达标，门禁通过
    Given 覆盖率报告显示行覆盖率为 85%
    And 分支覆盖率为 82%
    And 函数覆盖率为 88%
    When 系统执行 "evaluateGate('C2')"
    Then 系统逐项对比覆盖率与阈值
    And 行覆盖率 85% >= 80% 阈值为通过
    And 分支覆盖率 82% >= 80% 阈值为通过
    And 函数覆盖率 88% >= 80% 阈值为通过
    And 系统输出 "Gate C2 质量检查通过"
    And 系统在 quality_gate_results 表中记录 QualityCheckResult
    And 记录的 passed 字段为 1
    And 记录的 rule_type 为 'coverage'
    And 记录的 gate 为 'C2'
    And 系统发布领域事件 "quality:check_passed"
    And 流水线可推进到 Gate D
```

#### 场景 1B：覆盖率不达标，门禁阻断（异常路径）

```gherkin
  Scenario: 覆盖率低于阈值，门禁阻断并要求退回修复
    Given 覆盖率报告显示行覆盖率为 65%
    And 分支覆盖率为 58%
    And 函数覆盖率为 70%
    And quality-gates.yml 中阈值配置为 80%
    When 系统执行 "evaluateGate('C2')"
    Then 系统逐项对比覆盖率与阈值
    And 行覆盖率 65% < 80% 阈值为不通过
    And 分支覆盖率 58% < 80% 阈值为不通过
    And 函数覆盖率 70% < 80% 阈值为不通过
    And 系统输出 "BLOCKED: 覆盖率 65% < 80% 阈值"
    And 系统提示 "请退回 Gate C-impl 补充测试用例"
    And 系统在 quality_gate_results 表中记录 QualityCheckResult
    And 记录的 passed 字段为 0
    And 记录的 threshold 字段为 "80"
    And 记录的 actual 字段为 "65"
    And 系统发布领域事件 "quality:check_failed"
    And 流水线当前 Gate 不推进，停留在 Gate C2
```

#### 场景 1C：多规则检查 — 部分通过、部分失败

```gherkin
  Scenario: Lint 检查通过但覆盖率不达标
    Given quality-gates.yml 定义了两条规则：
      | rule_type | threshold | enabled |
      | coverage  | 80        | true    |
      | lint      | 0 errors  | true    |
    And 覆盖率报告显示 72%（< 80%）
    And Lint 报告显示 0 errors
    When 系统执行 "evaluateGate('C1')"
    Then lint 规则检查通过
    And coverage 规则检查失败
    And 系统输出汇总结果：1/2 规则通过
    And 门禁判定为 "BLOCKED"
    And quality_gate_results 表生成 2 条记录（通过 1 条，失败 1 条）
```

#### 场景 1D：规则禁用 — 跳过检查

```gherkin
  Scenario: 已禁用的规则不参与检查
    Given quality-gates.yml 中 security 规则 enabled 为 false
    When 系统执行 "evaluateGate('C2')"
    Then 系统跳过 security 规则检查
    And 不在 quality_gate_results 表中为 security 生成记录
    And 仅在日志中注明 "security 规则已禁用，跳过"
```

---

### BDD-002：测试自动生成 — `generateTests()`

**关联需求**：`REQ-TEST-001`（单元测试生成与执行）

**业务价值**：自动测试生成是测试体系的基石，必须正确识别项目框架、生成有效测试代码、且生成后立即验证。

#### 场景 2A：Jest 项目自动生成测试（Happy Path）

```gherkin
Feature: 测试自动生成
  作为 开发者
  我希望 执行 /test-unit 后系统自动为指定模块生成单元测试
  以便 减少手工编写测试的工作量，并确保基础测试覆盖率

  Background:
    Given 项目使用 Jest 作为测试框架
    And 项目根目录存在 "jest.config.ts"
    And 源码文件 "src/utils/math.ts" 包含 3 个导出函数：add, subtract, multiply

  Scenario: 为指定源文件自动生成并运行单元测试
    Given 用户执行 "/test-unit --target src/utils/math.ts"
    When 系统分析 "src/utils/math.ts" 的函数签名和导出
    Then 系统识别测试框架为 Jest（通过 jest.config.ts 检测）
    And 系统在 "__tests__/math.test.ts" 生成测试文件
    And 生成的测试文件包含 3 个 describe 块（每个函数 1 个）
    And 每个 describe 块包含至少 2 个测试用例（正常输入 + 边界条件）
    And 系统运行 "npx jest __tests__/math.test.ts --coverage"
    And 所有生成的测试用例状态为 "pass"
    And 系统输出覆盖率报告，包含：
      | 指标     | 覆盖率 |
      | 行覆盖   | >= 80% |
      | 分支覆盖 | >= 70% |
      | 函数覆盖 | = 100% |
    And 系统记录 TestResult 到数据库
    And 系统发布事件 "test:completed"
```

#### 场景 2B：生成的测试失败 — 不记录完成（异常路径）

```gherkin
  Scenario: 生成的测试中有失败用例，不标记为已完成
    Given 系统为 "src/utils/math.ts" 生成了 6 个测试用例
    And 其中有 1 个测试用例因逻辑错误而失败
    When 系统运行 "npx jest __tests__/math.test.ts"
    Then 测试运行结果包含 5 pass + 1 fail
    And 系统输出失败用例的具体信息：
      | 文件名       | 测试名               | 错误信息           |
      | math.test.ts | should handle zero   | Expected 0 got NaN |
    And 系统不将此次运行记录为 "已完成"
    And 系统提示 "1 个测试失败，请检查生成逻辑或源码"
    And 系统不发布 "test:completed" 事件
    And TestResult 中 result 字段记录为 'fail'
```

#### 场景 2C：未检测到测试框架

```gherkin
  Scenario: 项目无测试框架配置，提示用户
    Given 项目根目录不存在 jest.config.ts 或 vitest.config.ts
    And 项目 package.json 中未声明任何测试框架依赖
    When 用户执行 "/test-unit --target src/utils/math.ts"
    Then 系统无法识别测试框架
    And 系统输出 "未检测到测试框架，请安装 Jest 或 Vitest"
    And 系统不生成测试代码
    And 系统返回退出码 1
```

#### 场景 2D：Pytest 项目（Python 后端）

```gherkin
  Scenario: Python 后端项目使用 Pytest 生成测试
    Given 项目使用 Pytest 作为测试框架
    And 源码文件 "app/services/user.py" 包含 2 个函数
    When 用户执行 "/test-unit --target app/services/user.py"
    Then 系统识别测试框架为 Pytest
    And 系统在 "tests/test_user.py" 生成测试文件
    And 系统运行 "pytest tests/test_user.py --cov=app/services"
    And 输出覆盖率报告
```

---

### BDD-003：代码审查调度 — `runCodeReview()`

**关联需求**：`REQ-TEST-005`（安全测试 DAST）

**业务价值**：Gate D 多维审查是代码质量的最后一道检查，必须确保并行调度正确、汇聚结果完整、CRITICAL 发现能阻止推进。

#### 场景 3A：多 Agent 并行审查，综合签核（Happy Path）

```gherkin
Feature: 代码审查调度
  作为 流水线编排系统
  我希望 在 Gate D 并行调度多个审查 Agent 进行全面审查
  以便 从多个维度保障代码质量，统一输出签核报告

  Background:
    Given 当前 PipelineRun 已推进至 Gate D
    And 代码变更涉及前端（React）+ 后端（Hono API）

  Scenario: 并行调度 5 个审查 Agent 并汇聚结果
    When 编排者执行 "runCodeReview()"
    Then 系统并行 spawn 以下 Agent：
      | Agent                    | 审查维度   |
      | frontend-review-expert   | 前端代码   |
      | backend-review-expert    | 后端代码   |
      | security-review-expert   | 安全审计   |
      | perf-review-expert       | 性能审计   |
      | algorithm-expert         | 算法逻辑   |
    And 各 Agent 完成审查，分别返回 Finding[]
    And 各 Finding 包含字段：severity, file_path, line, description, suggestion
    And qa-review-expert 等待所有 Agent 完成后开始汇聚
    And qa-review-expert 合并所有 Finding 并去重
    And qa-review-expert 输出综合签核报告，包含：
      | 项目         | 值                     |
      | 总 Finding   | 各 Agent 之和          |
      | 严重 Finding | severity=CRITICAL 数量 |
      | 签核结论     | APPROVED / BLOCKED     |
      | REQ 追溯矩阵 | 完整映射               |
    And 系统发布事件 "review:submitted"
```

#### 场景 3B：安全审查发现 CRITICAL 漏洞，阻止推进（异常路径）

```gherkin
  Scenario: security-review-expert 发现 CRITICAL 级别漏洞
    Given frontend-review-expert 返回 3 个 Finding（2 LOW + 1 MEDIUM）
    And backend-review-expert 返回 1 个 Finding（LOW）
    And security-review-expert 返回 1 个 Finding（CRITICAL）
    And 该 Finding 描述为 "SQL 注入漏洞，未对用户输入做参数化处理"
    And perf-review-expert 和 algorithm-expert 均无 Finding
    When qa-review-expert 汇聚所有 Finding
    Then qa-review-expert 检测到 severity=CRITICAL 的 Finding
    And 综合签核报告标记为 "BLOCKED"
    And 报告输出阻断原因："security-review-expert 发现 1 个 CRITICAL 漏洞"
    And 系统阻止推进到 Gate E
    And 系统要求修复后重新提交 Gate D
    And 系统发布事件 "review:submitted"（载荷含 blocked=true）
```

#### 场景 3C：审查 Agent 超时

```gherkin
  Scenario: 单个审查 Agent 超时未返回结果
    Given 系统并行 spawn 5 个审查 Agent
    And security-review-expert 在 120 秒后仍未返回结果
    When 系统检测到超时
    Then 系统重试 1 次（最多重试 1 次）
    And 若重试仍超时，记录该 Agent 的审查结果为 "TIMEOUT"
    And 在综合签核报告中标注 "security-review-expert: 审查超时，结果不可用"
    And 签名结论降级为 "APPROVED_WITH_WARNING"
    And 系统仍然推进 Gate（不阻断流程）
```

---

### BDD-004：调试诊断 — `startDebugSession()` + `diagnoseBug()`

**关联需求**：`REQ-CMD-005`（调试诊断）

**业务价值**：调试是开发的核心场景，系统化的诊断流程能大幅缩短定位问题的时间。支持在线调试和事后分析两种模式。

#### 场景 4A：在线调试完整流程 — Live 模式（Happy Path）

```gherkin
Feature: 调试诊断
  作为 开发者
  我希望 执行 /debug 后系统自动收集信息、复现、诊断并输出报告
  以便 快速定位线上问题的根因，而不需要手工一步步排查

  Background:
    Given 用户报告 API "GET /api/users" 返回 HTTP 500
    And 生产环境日志可访问

  Scenario: 完整在线调试 D0→D4 流程
    When 用户执行 "/debug --issue 'GET /api/users 返回 500'"
    Then Gate D0 开始：收集异常信息与环境快照
    And 系统收集：
      | 信息类型       | 来源                  |
      | 错误日志       | 应用日志文件/stderr   |
      | 请求信息       | HTTP method + URL + headers |
      | 环境快照       | Node 版本、内存使用、CPU |
      | 最近的代码变更 | git log（最近 10 条） |
    And Gate D1：根据收集信息生成最小复现请求
    And 系统生成 curl 命令或 Playwright 脚本用于复现
    And Gate D2：启动调试会话
    And 系统通过 agent-browser 协议附加到进程
    And Gate D3：交互式诊断
    And 系统设置断点在疑似出错函数
    And 系统捕获变量快照
    And 系统推断根因（疑似文件 + 行号 + 置信度）
    And Gate D4：生成诊断报告
    And 报告包含：
      | 字段         | 示例值                                        |
      | 根因         | 数据库连接池耗尽，未处理连接超时              |
      | 疑似文件     | src/db/connection-pool.ts                      |
      | 疑似行号     | 42                                            |
      | 置信度       | 0.85                                          |
      | 建议修复方案 | 增加连接超时处理 + 连接池大小限制             |
      | 证据列表     | [日志片段, 变量快照, 堆栈帧]                  |
    And 系统不自动修改任何代码
    And 系统发布事件 "debug:report_generated"
```

#### 场景 4B：Post-mortem 事后诊断（异常/离线模式）

```gherkin
  Scenario: 使用 crash log 进行事后诊断分析
    Given 用户提供了文件 "crash-log.txt"
    And crash-log.txt 包含：
      | 内容             |
      | 完整堆栈跟踪     |
      | 错误类型 TypeError |
      | 错误消息 "Cannot read property 'id' of undefined" |
    When 用户执行 "/debug --post-mortem crash-log.txt"
    Then 系统解析堆栈跟踪，提取 StackFrame[]
    And 系统定位到疑似文件 "src/middleware/auth.ts"
    And 系统定位到疑似行号 128
    And 系统从堆栈帧推断：
      | 推断项       | 结果                                          |
      | 异常类型     | TypeError                                    |
      | 直接原因     | 中间件中未检查 user 对象是否为 null          |
      | 调用链       | auth.ts:128 → route.ts:56 → server.ts:200     |
    And 系统输出诊断报告（内容格式同在线模式）
    And 置信度 >= 0.7
```

#### 场景 4C：调试会话中断恢复

```gherkin
  Scenario: 调试过程中系统崩溃，支持恢复会话
    Given 上一次调试会话在 D2 阶段因系统重启中断
    And 数据库中保留了该 DebugSession 的状态快照
    When 用户执行 "/debug --resume <session_id>"
    Then 系统从数据库中恢复 D2 阶段的断点信息
    And 系统从 D2 继续执行（不重复 D0/D1）
    And 最终产出完整的 D4 诊断报告
```

---

### BDD-005：紧急热修复 — `dispatchCommand()` /hotfix

**关联需求**：`REQ-CMD-002`（紧急热修复）

**业务价值**：生产 P0 故障需要绕过常规流程快速修复，但事后必须补齐合规审计，平衡速度与安全。

#### 场景 5A：紧急热修复完整闭环（Happy Path）

```gherkin
Feature: 紧急热修复
  作为 SRE 或值班开发者
  我希望 通过 /hotfix 绕过常规流程执行最小化修复
  以便 在生产 P0 故障时快速恢复服务

  Background:
    Given 生产环境所有 API 返回 502 Bad Gateway
    And 日志显示数据库连接池已耗尽
    And 用户拥有 hotfix 权限

  Scenario: 执行完整 hotfix 流程 H0→H3
    When 用户执行 "/hotfix '修复数据库连接池耗尽'"
    Then Gate H0：紧急声明
    And 系统创建 hotfix 声明记录，包含：
      | 字段       | 值                                |
      | 故障描述   | 数据库连接池耗尽导致 502           |
      | 影响范围   | 全部 API 端点                     |
      | 严重级别   | P0                                |
      | 审批人     | <指定审批人>                      |
      | 声明时间   | <当前时间>                        |
    And 系统通知审批人
    And Gate H1：最小化修复
    And 系统只修改连接池配置（maxConnections: 10 → 50）
    And 修复变更仅涉及 1 个配置文件
    And Gate H2：快速验证 + 回滚预案
    And 系统验证 API 恢复正常（HTTP 200）
    And 系统生成回滚预案：记录修改前的配置值
    And Gate H3：事后强制回溯审计
    And 系统将该 hotfix 关联到常规流程 Gate E
    And 系统补录跳过 Gate A/B/C/D 的原因
    And 系统生成完整审计报告，包含：
      | 项目         | 内容                    |
      | 跳过的 Gate  | A, B, C, D              |
      | 跳过原因     | P0 生产故障，紧急修复   |
      | 修复内容     | 连接池配置变更          |
      | 验证结果     | API 恢复正常             |
      | 回滚方案     | 恢复原配置值            |
    And 系统发布事件 "run:changed"
```

#### 场景 5B：事后审计发现合规缺口（异常路径）

```gherkin
  Scenario: hotfix 事后审计发现未补全的合规要求
    Given 3 天前执行过一个 hotfix
    And hotfix 只执行到 H2，未触发 H3 事后审计
    When 定时审计任务检测到未关闭的 hotfix
    Then 系统标记该 hotfix 为 "AUDIT_PENDING"
    And 系统向对应审批人发送通知
    And 系统阻止该 session 的新 hotfix 直至完成审计
    And 系统在 Dashboard 显示 "1 个 hotfix 待审计"
```

#### 场景 5C：无权限用户执行 hotfix

```gherkin
  Scenario: 无 hotfix 权限的用户尝试执行
    Given 用户没有 hotfix 权限
    When 用户执行 "/hotfix '修复连接池'"
    Then 系统返回 "权限不足：hotfix 需要审批人角色"
    And 系统不创建 hotfix 记录
    And 系统返回退出码 3（权限拒绝）
```

---

### BDD-006：重构安全网 — 行为不变验证

**关联需求**：`REQ-CMD-001`（重构指令）

**业务价值**：重构不改变外部行为，安全网通过覆盖率基线对比 + 变异测试双重保障，确保重构后的代码行为与原代码一致。

#### 场景 6A：重构通过行为不变验证（Happy Path）

```gherkin
Feature: 重构安全网
  作为 开发者
  我希望 执行 /refactor 时系统自动确保重构前后行为不变
  以便 放心地改进代码结构而不引入缺陷

  Background:
    Given 用户要对 "src/core/" 模块执行重构
    And 该模块有 50 个现有测试用例

  Scenario: 完整重构流程 R1→R5，行为不变验证通过
    When 用户执行 "/refactor src/core/"
    Then Gate R1：定义重构边界
    And 系统列出重构目标文件列表：src/core/ 下 8 个文件
    And 系统确认重构类型为 "extract"（提取公共逻辑）
    And Gate R2：生成基线覆盖率
    And 系统运行现有测试套件
    And 系统生成覆盖率基线：
      | 指标     | 覆盖率 |
      | 行覆盖   | 85%    |
      | 分支覆盖 | 78%    |
      | 函数覆盖 | 90%    |
    And Gate R3：执行重构
    And 系统按用户指示重构代码
    And Gate R4：对比验证
    And 系统重新运行所有测试
    And 测试结果：50/50 通过（0 失败）
    And 系统重新生成覆盖率报告：
      | 指标     | 覆盖率 |
      | 行覆盖   | 85%    |
      | 分支覆盖 | 79%    |
      | 函数覆盖 | 90%    |
    And 覆盖率对比：无降低（分支覆盖率 +1%）
    And 系统运行变异测试（Stryker）
    And 变异测试得分 >= 80%
    And Gate R5：生成重构报告
    And 报告包含：
      | 项目         | 值              |
      | 重构文件数   | 8               |
      | 测试通过率   | 100% (50/50)    |
      | 覆盖率变化   | 无降低          |
      | 变异得分     | 83%             |
      | 结论         | 行为不变验证通过 |
```

#### 场景 6B：覆盖率下降，重构阻断（异常路径）

```gherkin
  Scenario: 重构后覆盖率下降，系统阻断
    Given Gate R2 基线覆盖率：行覆盖 85%
    When Gate R4 重新运行测试
    And 行覆盖率降至 72%
    Then 系统判定覆盖率下降（72% < 85%）
    And 系统输出 "BLOCKED: 覆盖率从 85% 降至 72%"
    And 系统列出覆盖率下降的具体函数：
      | 文件               | 函数       | 基线 | 当前 | 变化  |
      | src/core/auth.ts   | validate() | 95%  | 60%  | -35%  |
      | src/core/parse.ts  | parseXML() | 80%  | 45%  | -35%  |
    And 系统阻止推进到 R5
    And 系统提示 "重构引入了行为变化，请检查上述函数"
```

#### 场景 6C：变异测试得分过低

```gherkin
  Scenario: 测试通过但变异测试检测到存活变异体过多
    Given R4 所有测试通过
    And 覆盖率未降低
    But 变异测试得分仅为 45%（< 80% 阈值）
    When 系统评估变异测试结果
    Then 系统输出 "WARNING: 变异测试得分 45%，测试套件可能不够健壮"
    And 系统列出存活变异体数量：killed=12, survived=15
    And 系统建议 "增加测试用例以提高变异覆盖"
    And 重构报告标记为 "PASSED_WITH_WARNING"（不阻断流程）
```

---

### BDD-007：OpenAPI 文档生成 — `generateOpenAPIDoc()`

**关联需求**：`REQ-ENHANCE-003`（API 文档维护）、`REQ-API-001`（OpenAPI/Swagger 文档维护流程）

**业务价值**：自动生成 API 文档消除手工维护文档的成本和不一致风险，确保文档始终与代码同步。

#### 场景 7A：后端 API 完成后自动生成 OpenAPI 文档（Happy Path）

```gherkin
Feature: OpenAPI 文档生成
  作为 后端开发者
  我希望 系统在 Gate C-impl 完成后自动生成 OpenAPI 文档
  以便 API 文档始终与实际实现保持一致

  Background:
    Given 后端项目基于 Hono 框架
    And Gate C-impl 已完成
    And 项目中新增了以下路由：
      | 方法 | 路径              | 说明           |
      | POST | /api/users        | 创建用户       |
      | GET  | /api/users/:id    | 获取用户详情   |
      | GET  | /api/users        | 获取用户列表   |

  Scenario: 从路由定义自动生成 OpenAPI 3.0 文档
    When api-contract-expert 执行 "generateOpenAPIDoc()"
    Then 系统扫描所有路由定义
    And 系统识别出 3 个 API 端点
    And 系统从 Zod schema / TypeScript 类型推断请求体和响应体
    And 系统生成 "openapi.yaml"，内容包含：
      | 组件           | 验证条件                              |
      | openapi 版本   | 3.0.0                                |
      | info.title     | 项目名称                             |
      | paths          | 3 个路径项（POST /api/users, GET /api/users/:id, GET /api/users） |
      | paths.*.responses | 每个端点至少定义 200 和错误响应    |
      | paths.*.requestBody | POST 端点包含 JSON Schema 请求体 |
      | components.schemas | User 类型定义                       |
    And 生成的 openapi.yaml 通过 OpenAPI 3.0 规范校验
    And 系统将文件写入项目根目录
    And 系统在 artifacts 表中记录该产物
```

#### 场景 7B：文档与实现不一致检测（异常路径）

```gherkin
  Scenario: 代码变更后文档未更新，检测到不一致
    Given 已存在 openapi.yaml（上次生成）
    And 代码中新增了 GET /api/users/:id/orders 端点
    And 代码中删除了 GET /api/users（已废弃）
    When 系统执行 "generateOpenAPIDoc()"
    Then 系统对比新旧文档
    And 系统检测到新增端点：GET /api/users/:id/orders
    And 系统检测到过时端点：GET /api/users（代码中已不存在）
    And 系统更新 openapi.yaml 覆盖变更
    And 系统在变更日志中记录：
      | 变更类型 | 端点                      | 操作     |
      | 新增     | GET /api/users/:id/orders | 已添加   |
      | 删除     | GET /api/users            | 已移除   |
```

#### 场景 7C：无 Zod/类型定义，仅基础信息生成

```gherkin
  Scenario: 代码缺少类型定义，生成最简文档
    Given 路由定义存在但无 Zod schema 或 TypeScript 类型注解
    When api-contract-expert 执行 "generateOpenAPIDoc()"
    Then 系统仍可提取路径和方法
    But 请求体和响应体标记为 "{}"（empty schema）
    And 系统在文档顶部添加警告注释："部分 schema 缺失，请手动补充"
    And 系统仍然生成合法的 OpenAPI 3.0 文件
```

---

### BDD-008：契约验证 — `verifyContract()`

**关联需求**：`REQ-GATE-F-001`（Gate F 联调与契约验证）

**业务价值**：Gate F 是上线前的最后验证，确保 API 实现与契约文档的一致性，避免因字段不匹配导致的生产问题。

#### 场景 8A：API 实现与契约一致（Happy Path）

```gherkin
Feature: 契约验证
  作为 流水线编排系统
  我希望 在 Gate F 验证 API 实现与 OpenAPI 文档的一致性
  以便 确保上线时 API 契约不被破坏

  Background:
    Given OpenAPI 文档定义了 "GET /api/users" 返回 User[]
    And User 类型定义：{ id: number, name: string, email: string }
    And 当前处于 Gate F

  Scenario: API 实际响应与契约完全匹配
    When 系统执行 "verifyContract()"
    Then 系统对比实际 API 响应与契约定义
    And 系统验证：
      | 验证项     | 实际值                                   | 期望值              | 结果   |
      | 端点存在   | GET /api/users 可访问                    | 契约定义中存在      | PASS   |
      | 响应状态码 | 200                                      | 200                 | PASS   |
      | id 字段    | number                                   | number              | PASS   |
      | name 字段  | string                                   | string              | PASS   |
      | email 字段 | string                                   | string              | PASS   |
      | 字段完整性 | 3 个字段                                 | 3 个字段            | PASS   |
    And 所有验证项通过
    And 系统记录 ContractVerificationResult：
      | 字段           | 值                    |
      | provider       | 当前服务              |
      | consumer       | 契约定义              |
      | passed         | true                  |
      | discrepancies  | []                    |
    And 系统发布事件 "contract:verified"（result=passed）
    And 流水线可推进到 Gate E
```

#### 场景 8B：字段类型不匹配（异常路径）

```gherkin
  Scenario: API 响应字段类型与契约不一致
    Given 契约定义 User.id 为 number 类型
    And 实际 API 返回 User.id 为 string 类型（"123"）
    When 系统执行 "verifyContract()"
    Then 系统检测到类型不匹配
    And 系统记录 1 个 ContractDiscrepancy：
      | 字段     | 值                          |
      | endpoint | GET /api/users              |
      | field    | items[].id                  |
      | expected | number                      |
      | actual   | string                      |
    And 系统输出 "BLOCKED: 发现 1 个契约不一致"
    And ContractVerificationResult.passed = false
    And 系统发布事件 "contract:verified"（result=failed）
    And 流水线不推至 Gate E
```

#### 场景 8C：契约中定义的端点实际不可访问

```gherkin
  Scenario: 契约中有定义的端点实际返回 404
    Given 契约定义了 GET /api/users/:id/orders
    And 该端点尚未实现
    When 系统执行 "verifyContract()"
    Then 系统请求该端点，收到 HTTP 404
    And 系统记录 ContractDiscrepancy：
      | 字段     | 值                          |
      | endpoint | GET /api/users/:id/orders   |
      | expected | 200                         |
      | actual   | 404                         |
    And 门禁结果取决于 quality-gates.yml 中 contract 规则的容错配置
    And 若容错为 "strict" 则 BLOCKED
    And 若容错为 "lenient" 则标记 WARNING 但仍推进
```

---

### BDD-009：智能风险跳过 — `shouldSkipConfirmation()`

**关联需求**：`REQ-ENHANCE-005`（人类干预智能中断点）

**业务价值**：低风险变更自动跳过人工确认减少流程摩擦，高风险变更强制确认防止风险扩散，平衡效率与安全。

#### 场景 9A：低风险变更静默通过（Happy Path）

```gherkin
Feature: 智能风险跳过
  作为 流水线编排系统
  我希望 根据变更幅度自动判断是否需要人工确认
  以便 简单修改快速通过，复杂变更获得充分审查

  Background:
    Given 系统加载了风险评估模型
    And 风险模型权重配置：
      | 因素         | 权重 |
      | 文件数       | 30%  |
      | 变更行数     | 40%  |
      | 模块关键度   | 30%  |

  Scenario: 微小变更自动静默通过
    Given 当前变更仅涉及 1 个文件
    And 变更行数为 15 行（< 50 行阈值）
    And 变更文件路径为 "src/utils/format.ts"（非核心模块）
    And 模块关键度为 "low"
    When 系统执行 "shouldSkipConfirmation()"
    Then 系统计算 risk_level：
      | 因素         | 值    | 权重 | 得分  |
      | 文件数       | 1     | 30%  | 0.3   |
      | 变更行数     | 15    | 40%  | 0.4   |
      | 模块关键度   | low   | 30%  | 0.3   |
    And 综合得分为 "low"（总分 1.0 < 3.0 低风险阈值）
    And 系统返回 "shouldSkip = true"
    And 系统跳过人工确认步骤
    And 系统在日志中记录 "风险级别 low，静默通过"
    And 系统无需用户交互即推进 Gate
```

#### 场景 9B：高风险变更强制人工确认（异常路径）

```gherkin
  Scenario: 大规模变更涉及核心模块，强制等待确认
    Given 当前变更涉及 12 个文件
    And 变更行数为 500+ 行
    And 变更涉及 "src/auth/" 模块（核心安全模块）
    And 模块关键度为 "high"
    When 系统执行 "shouldSkipConfirmation()"
    Then 系统计算 risk_level：
      | 因素         | 值    | 权重 | 得分 |
      | 文件数       | 12    | 30%  | 3.6  |
      | 变更行数     | 520   | 40%  | 4.0  |
      | 模块关键度   | high  | 30%  | 3.0  |
    And 综合得分为 "high"（总分 10.6 >= 7.0 高风险阈值）
    And 系统返回 "shouldSkip = false"
    And 系统强制等待人工确认
    And 系统向审批人发送通知，等待其确认
    And 人工确认前流程不推进
    And 系统在 Dashboard 显示 "等待人工确认（风险级别: high）"
```

#### 场景 9C：边界情况 — 中等风险

```gherkin
  Scenario: 中等风险变更请求用户确认但不强制
    Given 变更涉及 4 个文件，200 行
    And 涉及普通业务模块，关键度为 "medium"
    When 系统执行 "shouldSkipConfirmation()"
    Then 综合得分为 "medium"
    And 系统返回 "shouldSkip = false"
    And 系统向用户展示变更摘要
    And 用户可以一键确认或取消
    And 若有自动化测试全部通过，提供 "建议通过" 标签
```

#### 场景 9D：配置文件变更的关键度判断

```gherkin
  Scenario: 少量配置变更但涉及安全配置
    Given 变更仅 1 个文件 "quality-gates.yml"
    And 变更行数 3 行（修改覆盖率阈值）
    And 但该文件属于 "核心配置" 模块，关键度为 "critical"
    When 系统执行 "shouldSkipConfirmation()"
    Then 模块关键度 "critical" 得分为 4.0
    And 综合得分 >= 4.0（中等风险）
    And 系统不静默通过
    And 系统要求至少 1 人审核确认
```

---

## 三、BDD → TDD 映射表

BDD 场景验证业务流程正确性，TDD 任务覆盖纯技术逻辑、高风险接口、和幂等性保障。以下映射表确保每个 BDD 场景都有对应的 TDD 任务支撑。

| BDD 场景 | BDD 验证的行为 | 对应 TDD 任务 | TDD 验证内容 |
|---------|---------------|-------------|-------------|
| **BDD-001A/B/C/D** | `evaluateGate()`：门禁评估 | `loadQualityPolicy()` TDD | YAML 解析正确性、默认值覆盖、多规则合并 |
| | | `calculateRiskLevel()` TDD | 风险评估算法正确性、权重计算 |
| | | `enforceGate()` TDD | Gate 条件判断逻辑、状态转换约束 |
| **BDD-002A/B/C/D** | `generateTests()`：测试生成 | `executeTestSuite()` TDD | 测试运行器集成、结果解析（JUnit/Jest/Pytest） |
| | | CoverageAnalysisService TDD | 覆盖率解析（lcov/cobertura）、基线对比 |
| | | TestGenerationService TDD | 框架检测逻辑、模板渲染 |
| **BDD-003A/B/C** | `runCodeReview()`：审查调度 | `runSecurityAudit()` TDD | DAST 扫描集成、CVE 检查 |
| | | `runPerformanceAudit()` TDD | 性能基线对比逻辑 |
| | | `advanceGate()` TDD | Gate D→E 推进的条件校验 |
| **BDD-004A/B/C** | `startDebugSession()` + `diagnoseBug()`：调试诊断 | `analyzePostMortem()` TDD | 堆栈解析准确性、代码位置定位 |
| | | `generateDiagnosticReport()` TDD | 报告格式完整性、字段非空验证 |
| | | `collectRuntimeEvidence()` TDD | 调试工具集成、变量快照捕获 |
| **BDD-005A/B/C** | `dispatchCommand()` /hotfix：热修复 | `createRun()` + `completeRun()` TDD | Run 生命周期管理、hotfix pipeline_type 映射 |
| | | `abortRun()` TDD | 中断流程的状态保持 |
| **BDD-006A/B/C** | Refactor 行为不变验证 | `runMutationTests()` TDD | 变异测试工具集成、得分计算 |
| | | CoverageAnalysisService TDD | 重构前后覆盖率对比逻辑 |
| | | `executeTestSuite()` TDD | 测试套件批量执行、结果汇总 |
| **BDD-007A/B/C** | `generateOpenAPIDoc()`：文档生成 | `validateDocConsistency()` TDD | 文档与代码一致性对比 |
| | | OpenAPIGenerationService TDD | 路由扫描准确性、Schema 提取 |
| **BDD-008A/B/C** | `verifyContract()`：契约验证 | `verifyContract()` TDD | 字段级类型对比、端点存在性验证 |
| | | `validateDocConsistency()` TDD | 文档快照与当前代码的差异检测 |
| **BDD-009A/B/C/D** | `shouldSkipConfirmation()`：风险跳过 | `calculateRiskLevel()` TDD | 风险评分算法（所有边界组合） |
| | | RiskAssessmentService TDD | 模块关键度映射表、文件数/行数阈值边界 |

---

## 四、BDD → REQ 追溯矩阵

| BDD 场景 | 关联 REQ | 验证的验收标准 |
|---------|---------|-------------|
| BDD-001 | REQ-TEST-007, REQ-ENGINE-002 | [ ] quality-gates.yml 加载并执行检查，[ ] 不达标阻断推进 |
| BDD-002 | REQ-TEST-001 | [ ] 自动识别测试框架，[ ] 生成测试通过率 100%，[ ] 输出覆盖率报告 |
| BDD-003 | REQ-TEST-005 | [ ] 5 Agent 并行审查，[ ] CRITICAL 漏洞阻断推进 |
| BDD-004 | REQ-CMD-005 | [ ] D0→D4 完整流程，[ ] Post-mortem 解析堆栈，[ ] 不自动修改代码 |
| BDD-005 | REQ-CMD-002 | [ ] H0→H3 完整流程，[ ] 事后强制审计，[ ] 回滚预案 |
| BDD-006 | REQ-CMD-001 | [ ] R1→R5 完整流程，[ ] 覆盖率基线对比，[ ] 变异测试集成 |
| BDD-007 | REQ-ENHANCE-003, REQ-API-001 | [ ] OpenAPI 3.0 文档自动生成，[ ] 与实现一致性验证 |
| BDD-008 | REQ-GATE-F-001 | [ ] 字段类型全部匹配，[ ] 端点存在性验证 |
| BDD-009 | REQ-ENHANCE-005 | [ ] low risk 静默通过，[ ] high risk 强制确认，[ ] 评分算法正确 |

---

## 五、验收标准可自动化性评估

以下评估每个 BDD 场景的可自动化程度及推荐的自动化方式。

| BDD 场景 | 可自动化程度 | 自动化方式 | 自动化障碍 |
|---------|------------|-----------|-----------|
| BDD-001A/B | **高** | 单元测试：模拟覆盖率报告文件，调用 `evaluateGate()`，断言返回值和数据库记录 | 无 |
| BDD-001C/D | **高** | 参数化测试：不同 YAML 配置组合 | 无 |
| BDD-002A/B | **中** | 集成测试：在 fixture 项目中运行 `/test-unit`，检查文件和运行结果 | 需实际的测试框架（Jest/Pytest）环境 |
| BDD-002C | **高** | 单元测试：模拟文件系统，断言错误输出 | 无 |
| BDD-003A/B | **中** | 集成测试：Mock Agent 响应，验证汇聚逻辑 | 5 个 Agent 并行需要执行环境 |
| BDD-003C | **高** | 单元测试：注入超时 mock，断言超时处理逻辑 | 无 |
| BDD-004A | **低** | 端到端测试：需要真实的应用异常场景 | 需要 agent-browser 调试协议环境 |
| BDD-004B | **高** | 单元测试：提供 fixture crash 日志，断言解析结果 | 无 |
| BDD-005A/B | **中** | 集成测试：模拟 pipeline 状态，验证 H0→H3 状态流转 | 需要审批人交互 |
| BDD-005C | **高** | 单元测试：Mock 权限检查，断言退出码 | 无 |
| BDD-006A/B | **中** | 集成测试：需要真实测试套件和覆盖率工具 | 需要 Jest + Stryker 环境 |
| BDD-007A/B | **中** | 集成测试：在 fixture 项目中运行，断言生成的 YAML 内容 | 需要 Hono + Zod 环境 |
| BDD-008A/B | **中** | 集成测试：启动 mock API 服务器，断言对比结果 | 需要运行中的 API 服务 |
| BDD-009A/B/C/D | **高** | 单元测试：提供不同变更数据输入，断言 risk_level 输出 | 无 |

---

## 六、推荐验证顺序

BDD 场景建议按以下顺序逐步验证，以先易后难、先独立后集成的方式推进：

```
第 1 轮（纯逻辑，无外部依赖）：
  BDD-009 → BDD-001C/D → BDD-004B → BDD-005C
  （风险评分 → 规则禁用 → Post-mortem解析 → 权限检查）
  原因：均为单元测试级别，不依赖外部系统，可最快验证核心算法

第 2 轮（配置驱动，需文件 I/O）：
  BDD-001A/B → BDD-007A/B/C → BDD-008A/B/C
  （质量门禁 → OpenAPI 生成 → 契约验证）
  原因：需要 quality-gates.yml / openapi.yaml 配置文件，但无进程级依赖

第 3 轮（需要测试框架/Agent 环境）：
  BDD-002A/B/C/D → BDD-006A/B/C
  （测试生成 → 重构安全网）
  原因：需要实际的测试框架（Jest/Pytest）运行环境

第 4 轮（需要多 Agent 并行 + 外部工具）：
  BDD-003A/B/C → BDD-004A/C → BDD-005A/B
  （审查调度 → 在线调试 → 热修复闭环）
  原因：需要 Agent 运行时、agent-browser 协议、审批交互等完整环境
```

---

## 七、共享区域与串行依赖警告

以下 BDD 场景的 TDD 支撑任务共享关键文件/模块，必须串行执行：

| 共享区域 | 涉及的 BDD | 风险 |
|---------|-----------|------|
| `src/engine/gates.ts`（PIPELINE_DEFS / GATE_CHECKS） | BDD-001, BDD-003, BDD-005, BDD-008 | **极高** -- 所有 Gate 定义共享，必须先完成扩展后锁定 |
| `quality-gates.yml` 配置 | BDD-001, BDD-009 | **高** -- 质量策略和风险模型的阈值配置共享 |
| `quality_gate_results` 表 | BDD-001（写）, BDD-009（读） | **中** -- 写入和读取需保证 schema 一致 |
| `openapi.yaml` 文档 | BDD-007（生成）, BDD-008（验证） | **高** -- 必须先有文档才能验证，形成串行依赖 |
| `CoverageReport` 值对象 | BDD-001, BDD-002, BDD-006 | **中** -- 三个场景共享覆盖率解析逻辑 |

---

## 八、文档版本

| 字段 | 值 |
|------|-----|
| 版本 | v1.0 |
| 创建日期 | 2026-05-13 |
| 源 DDD 文档 | `docs/2026-05-13/tasks/2026-05-13-test-systematization-ddd.md` |
| 源需求文档 | `docs/2026-05-13/requirements/REQ-test-system-enhancement.md` |
| BDD 场景数 | 9 个聚合行为，25 个 Gherkin 场景 |
| 下游消费者 | planner（执行计划）→ task-tdd（TDD 任务生成） |
