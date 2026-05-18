# BDD 行为验收 -- /review 与 /review-fix 审查类指令

> **需求文档**: `docs/requirements/REQ-commands-subagent-integration.md`
> **DDD 分析**: `docs/2026-05-18/tasks/commands-subagent-integration-ddd.md`
> **覆盖 REQ**: REQ-001 (`/review`), REQ-002 (`/review-fix`)
> **创建日期**: 2026-05-18

---

## 1. 场景概览

| 场景编号 | 聚合行为 | REQ | 场景数 | 复杂度 |
|---------|---------|-----|--------|--------|
| S1 | 并行审查矩阵启动 | REQ-001 | 2 (HP + EX) | 高 |
| S2 | Algorithm-Expert 条件触发 | REQ-001 | 2 (HP + EX) | 中 |
| S3 | 审查 Findings 汇聚与严重度分级 | REQ-001 | 2 (HP + EX) | 高 |
| S4 | 审查失败回退循环 | REQ-001 | 3 (HP + EX1 + EX2) | 高 |
| S5 | 五阶段流水线顺序执行 | REQ-002 | 2 (HP + EX) | 高 |
| S6 | 初审矩阵（Phase 1） | REQ-002 | 2 (HP + EX) | 高 |
| S7 | 按领域路由修复 Agent（Phase 3） | REQ-002 | 3 (HP + EX1 + EX2) | 高 |
| S8 | 验证门与修复-重验循环（Phase 4） | REQ-002 | 2 (HP + EX) | 中 |
| S9 | 复审关闭矩阵（Phase 5） | REQ-002 | 2 (HP + EX) | 高 |
| S10 | 全链路审查-修复-重审循环 | REQ-002 | 2 (HP + EX max) | 高 |

**总计**: 22 个 Gherkin 场景，覆盖 10 个聚合行为。

---

## 2. REQ-001: `/review` — 领域专项审查专家并行矩阵

### S1: 并行审查矩阵启动

**复杂度**: 高 | **TDD 要求**: 是——Agent spawn 顺序和并行性可验证

#### S1-HP: 标准审查——5 专家并行启动，全部成功返回 Findings

```gherkin
Feature: /review 并行审查矩阵启动
  编排者将审查任务委托给 5 个必选领域专家 + 1 个条件性专家并行执行

  Background:
    Given 编排者已加载 "behavioral-guidelines" 技能
    And 编排者已通过 "session_join" 注册引擎会话
    And 编排者已调用 "gate_check({ operation: "review" })" 确认 Gate D 允许审查
    And 当前变更不涉及算法/密码学/ML 领域
    And 编排者已通过 "Read/Glob/Grep" 收集了变更文件清单

  Scenario: 标准审查矩阵——五个必选专家全部成功
    When 编排者 spawn 以下 Agent 在同一消息中并行发出:
      | subagent_type            | 审查职责             |
      | frontend-review-expert   | 前端代码审查         |
      | backend-review-expert    | 后端代码审查         |
      | security-review-expert   | 安全审计             |
      | perf-review-expert       | 性能审计             |
      | qa-review-expert         | 综合签核(在4个专家完成后) |
    Then 每个 Agent 收到 Execution Packet 包含: 变更文件路径, 审查上下文, 禁止修改代码的约束
    And 所有 Agent 在保持只读模式的前提下返回结构化 Findings 报告
    And 每份报告包含: findings 列表(附文件/行号证据), 严重度分级, 风险评估摘要
    And 不存在 Agent 超时或空输出的情况
    And 编排者未执行任何 Write/Edit 操作
```

#### S1-EX: 单个专家超时——重试后仍失败，标记 BLOCKED

```gherkin
  Scenario: 后端审查专家超时——重试耗尽后标记 BLOCKED
    Given 编排者已 spawn 5 个审查 Agent 并行
    And 其他 4 个 Agent 均成功返回
    But backend-review-expert 在 120 秒内无响应(超时)
    When 编排者对该 Agent 执行重试(最多 2 次)
    And 第 1 次重试仍超时
    And 第 2 次重试返回不完整输出(仅部分 findings)
    Then 编排者标记 backend-review-expert 为 "BLOCKED"
    And 编排者向用户报告:
      | 失败 Agent          | backend-review-expert             |
      | 失败原因            | 超时(2次重试耗尽)                  |
      | 已成功 Agent 结果    | 4 份审查报告(保留不丢弃)            |
      | 阻塞影响            | 后端代码未获审查, 综合签核无法完成  |
    And 编排者询问用户: "是否接受部分审查结果继续, 或手动审查后端代码?"
    And 其他 4 个 Agent 的成功结果保留不丢弃
```

---

### S2: Algorithm-Expert 条件触发

**复杂度**: 中 | **TDD 要求**: 是——条件判断逻辑必须可测试

#### S2-HP: 触发条件满足——spawn algorithm-expert

```gherkin
Feature: Algorithm-Expert 条件触发
  编排者根据变更文件内容判断是否需要 spawn algorithm-expert

  Background:
    Given 编排者已收集变更文件清单
    And 编排者已通过 Read 工具预览了变更文件的关键代码段

  Scenario: 变更涉及自定义加密实现——触发 algorithm-expert
    Given 变更文件中包含文件 "src/utils/crypto.ts"
    And 该文件内容涉及 "AES-256-GCM" 和 "PBKDF2" 的自定义实现
    When 编排者评估 algorithm-expert 触发条件:
      | 条件                                | 匹配结果 |
      | 涉及加密/哈希/签名等密码学操作       | YES      |
    Then 编排者 spawn algorithm-expert 与其他 5 个 Agent 并行
    And algorithm-expert 收到 Execution Packet 包含: crypto.ts 文件路径, "审查自定义加密实现的正确性和安全性"
    And 审查矩阵实际启动 Agent 数量为 6(含 algorithm-expert)

  Scenario: 变更涉及图算法——触发 algorithm-expert
    Given 变更文件中包含文件 "src/algorithms/pathfinding.ts"
    And 该文件实现了 Dijkstra 最短路径算法
    When 编排者评估 algorithm-expert 触发条件:
      | 条件                                    | 匹配结果 |
      | 涉及图计算/动态规划/回溯等复杂逻辑      | YES      |
    Then 编排者 spawn algorithm-expert 与其他 Agent 并行
    And algorithm-expert 收到 Execution Packet 包含: 算法文件路径和算法类型说明
```

#### S2-EX: 触发条件不满足——不 spawn algorithm-expert

```gherkin
  Scenario: 变更仅涉及 UI 样式修改——不触发 algorithm-expert
    Given 变更文件仅包含:
      | src/components/Button.css |
      | src/components/Modal.tsx  |
    And 变更内容仅涉及 CSS 样式调整和 JSX 布局
    When 编排者评估 algorithm-expert 触发条件:
      | 条件                                                | 匹配结果 |
      | 涉及自定义排序/搜索/匹配算法                         | NO       |
      | 涉及加密/哈希/签名等密码学操作                       | NO       |
      | 涉及图计算/动态规划/回溯等复杂逻辑                   | NO       |
      | 涉及 ML 推理/特征工程/模型优化                       | NO       |
      | 涉及大数据量处理(N > 10^5)的性能敏感代码             | NO       |
      | 编排者判断代码复杂度高、需算法专项审查               | NO       |
    Then 编排者不 spawn algorithm-expert
    And 审查矩阵实际启动 Agent 数量为 5(不含 algorithm-expert)
    And 编排者在审查过程中不提及 algorithm-expert
```

---

### S3: 审查 Findings 汇聚与严重度分级

**复杂度**: 高 | **TDD 要求**: 是——严重度分级和 Findings 合并逻辑必须可测试

#### S3-HP: QA 综合签核——汇聚各专家 Findings，按严重度分级

```gherkin
Feature: 审查 Findings 汇聚与综合签核
  qa-review-expert 等待前 4~5 个领域审查专家完成后，汇聚所有 Findings 并产出综合签核报告

  Background:
    Given 前 4~5 个领域审查专家(不含 qa-review-expert)已全部完成
    And 各专家返回的 Findings 如下:
      | 专家                     | Critical | Major | Minor | Info |
      | frontend-review-expert  | 0        | 2     | 3     | 1    |
      | backend-review-expert   | 1        | 1     | 0     | 2    |
      | security-review-expert  | 1        | 3     | 1     | 0    |
      | perf-review-expert      | 0        | 1     | 2     | 3    |

  Scenario: QA 综合签核——汇聚 Findings，产出分层报告
    When 编排者 spawn qa-review-expert
    And qa-review-expert 接收 4 份领域审查报告作为输入
    Then qa-review-expert 产出综合签核报告, 包含:
      | 章节               | 内容                                      |
      | 汇聚 Findings      | 所有 Findings 按严重度合并排列            |
      | 严重度分布          | Critical:2, Major:7, Minor:6, Info:6     |
      | REQ 追踪矩阵       | 每个 REQ-XXX 对应的审查覆盖状态           |
      | Gate 条件检查       | 当前 Gate D 的所有进入/退出条件是否满足   |
      | 综合判定            | PASS / FIX_REQUIRED / BLOCKED            |
    And 综合判定为 FIX_REQUIRED(存在 Critical 和 Major)
    And 报告中给出具体的修复建议和归属领域
```

#### S3-EX: Findings 冲突——两个专家对同一文件给出矛盾结论

```gherkin
  Scenario: 两个专家对同一文件存在矛盾发现——QA 标记为需人工裁决
    Given frontend-review-expert 对 "src/components/DataTable.tsx" 给出 Finding(F-001, severity: Major):
      "useMemo 过度使用, 建议简化为普通计算, 减少内存开销"
    And perf-review-expert 对同一文件给出 Finding(P-003, severity: Major):
      "缺少 useMemo 缓存, 每次渲染重新计算导致性能瓶颈, 建议增加 useMemo"
    When qa-review-expert 在汇聚时检测到冲突 Findings(F-001 和 P-003 矛盾)
    Then qa-review-expert 在综合报告中:
      | 处理方式           | 详情                                            |
      | 标记冲突           | 标注 F-001 与 P-003 矛盾, 不自动合并            |
      | 提供双方理据       | 附上两位专家的原文分析                           |
      | 建议人工裁决       | 推荐用户在"正确性优先"和"性能优先"之间决策       |
      | 不阻塞流水线       | 冲突不导致 BLOCKED, 归类为 WARNING              |
    And 综合判定不因该冲突而降级为 BLOCKED
```

---

### S4: 审查失败回退循环

**复杂度**: 高 | **TDD 要求**: 是——回退策略的有限状态机必须可测试

#### S4-HP: Major 级别 Findings——回退修复后重新审查通过

```gherkin
Feature: 审查失败回退循环
  根据 QA 综合签核报告的严重度判定, 执行修复-重审循环

  Background:
    Given QA 综合签核报告已完成
    And 综合判定为 FIX_REQUIRED
    And 严重度分布: Critical:0, Major:3, Minor:5, Info:2

  Scenario: Major 级别 Findings——按领域回退, 修复后重审通过
    Given Major Findings 分别归属于:
      | Finding ID | 领域      | 归属 Agent               |
      | F-003      | frontend  | frontend-review-expert   |
      | B-002      | backend   | backend-review-expert    |
      | S-001      | security  | security-review-expert   |
    When 编排者按领域回退:
      | 领域      | 操作                                      |
      | frontend  | spawn frontend-dev-expert 修复 F-003      |
      | backend   | spawn backend-dev-expert 修复 B-002       |
      | security  | spawn backend-dev-expert(传递安全报告)修复 S-001 |
    And 所有修复 Agent 完成后
    Then 编排者重新 spawn 受影响领域的审查 Agent:
      | 审查 Agent              | 审查范围     |
      | frontend-review-expert | 仅审查 F-003 修复文件 |
      | backend-review-expert  | 仅审查 B-002 修复文件 |
      | security-review-expert | 仅审查 S-001 修复文件 |
    And 重新 spawn qa-review-expert 做综合签核
    And 本次综合判定为 PASS
    And Gate D 总循环次数 = 1(第 1 轮修复后即通过)
```

#### S4-EX1: Critical 级别 Finding——立即 BLOCKED

```gherkin
  Scenario: Critical 级别安全漏洞——立即标记 BLOCKED
    Given QA 综合签核报告显示:
      | Finding ID | 严重度   | 领域     | 描述                         |
      | S-C01      | CRITICAL | security | 硬编码 JWT 密钥在源代码中     |
    When 编排者读取综合判定, 发现存在 CRITICAL
    Then 编排者立即标记 Gate D 为 "BLOCKED"
    And 编排者不进入修复-重审循环
    And 编排者向用户报告:
      """
      [BLOCKED] Gate D 评审发现 CRITICAL:
      - Finding S-C01: 硬编码 JWT 密钥在 src/config/secrets.ts:12
      - 风险: 密钥泄露导致任意令牌伪造
      - 建议: 立即移除硬编码密钥, 改用环境变量或密钥管理服务
      - 修复后重新执行完整 Gate D(步骤 1→2→3)
      """
    And 当前会话保留所有产物不丢弃
```

#### S4-EX2: 最多 2 轮循环——第 2 轮仍不通过则 ABORT

```gherkin
  Scenario: 修复-重审循环达上限——标记 ABORT
    Given 第 1 轮修复-重审循环完成后, QA 综合判定仍为 FIX_REQUIRED(剩余 1 个 Major Finding)
    And 编排者执行第 2 轮修复
    When 第 2 轮修复 Agent 完成
    And 重新 spawn 对应审查 Agent
    And qa-review-expert 综合判定仍为 FIX_REQUIRED(该 Finding 未被满意修复)
    Then 编排者标记 Gate D 为 "ABORT"
    And 编排者汇总向用户报告:
      | 项目             | 详情                                    |
      | 总循环次数       | 2(已达上限)                              |
      | 未关闭 Finding   | B-005: TaskScheduler 竞态条件未根除      |
      | 修复历史         | 第1轮: backend-dev-expert #1(部分修复)   |
      |                  | 第2轮: backend-dev-expert #2(未修复)     |
      | 审查报告路径     | docs/.../review-findings.md             |
      | 建议             | 人工介入排查 B-005 根因                  |
    And 会话产物全部保留, Gate D 不可推进到 Gate E
```

---

## 3. REQ-002: `/review-fix` — 五阶段审查修复闭环

### S5: 五阶段流水线顺序执行

**复杂度**: 高 | **TDD 要求**: 是——阶段顺序性和不可跳过性必须可验证

#### S5-HP: 完整五阶段流水线——全部通过

```gherkin
Feature: /review-fix 五阶段流水线顺序执行
  编排者按 初审→规划→执行→验证→复审 顺序推进, 不可跳过

  Background:
    Given 编排者已调用 "session_join({ platform: "claude", pipeline_type: "full" })"
    And 编排者已加载 "behavioral-guidelines" 和 "using-agent-skills" 技能
    And 用户指定的审查范围为 "src/services/order-service.ts"

  Scenario: 五阶段顺序执行——Phase 1 到 Phase 5 全部通过
    When 编排者进入 Phase 1(初审):
      | 操作                                              | 验证                          |
      | spawn frontend-review-expert + backend-review-expert + security-review-expert + perf-review-expert 并行 | 所有 Agent 返回结构化 Findings |
      | spawn algorithm-expert(条件性)                    | 无需触发(纯后端服务代码)       |
      | spawn qa-review-expert(汇聚)                     | 综合判定为 FIX_REQUIRED       |
    And Phase 1 产出: 初审 Findings 报告(含 2 个 Major + 4 个 Minor)
    Then 编排者进入 Phase 2(修复规划):
      | 操作                                              | 验证                          |
      | spawn remediation-expert                         | 产出可执行修复计划             |
      | 修复计划包含: 修复顺序, 责任 Agent 类型, 共享区域标注 | 计划无循环依赖                 |
    And Phase 2 产出: 修复计划文档(标注 6 个 Finding 的修复路径)
    Then 编排者进入 Phase 3(执行修复):
      | 操作                                              | 验证                          |
      | spawn backend-dev-expert(第1批: 无共享冲突)       | 修复 4 个 Minor Finding       |
      | spawn backend-dev-expert(第2批: 共享区域串行)     | 修复 2 个 Major Finding       |
      | 所有修复 Agent 完成                                | 变更仅限修复范围, 无夹带       |
    And Phase 3 产出: 修复后的源代码
    Then 编排者进入 Phase 4(验证):
      | 操作                                              | 验证                          |
      | 运行 Lint                                        | 0 errors, 0 warnings          |
      | 运行 Type-check(tssc --noEmit)                   | 通过                          |
      | 运行 Build(npm run build)                        | 通过                          |
      | 运行测试(npm test)                               | 全部通过, 无回归               |
    And Phase 4 产出: 验证通过证据
    Then 编排者进入 Phase 5(复审关闭矩阵):
      | 操作                                              | 验证                          |
      | spawn change-review-expert                      | 逐项确认所有 Finding 已修复   |
      | spawn qa-review-expert(并行)                    | 综合签核通过                  |
    And Phase 5 产出: 关闭矩阵报告(6/6 Finding 已关闭)
    And 编排者向用户报告: "审查修复闭环完成——6 个 Finding 全部关闭, 验证通过"
```

#### S5-EX: 跳过 Phase 1 直接修复——编排者行为违规被阻断

```gherkin
  Scenario: 编排者尝试跳过初审直接进入修复——被契约约束阻断
    Given 编排者已确认进入审查修复闭环模式
    But 编排者跳过 Phase 1 和 Phase 2
    When 编排者尝试直接进入 Phase 3(spawn backend-dev-expert 修改代码)
    Then 编排者内部契约检查触发:
      | 检查项                   | 结果                          |
      | Phase 1 初审是否完成?    | NO——Findings 报告不存在        |
      | Phase 2 修复计划是否存在? | NO——修复计划不存在             |
    And 编排者停止当前操作
    And 编排者回退到 Phase 1, 先执行初审矩阵
    And 编排者向用户说明: "已检测到跳过 Phase 1/2, 按五阶段顺序重新执行"
```

---

### S6: 初审矩阵 (Phase 1)

**复杂度**: 高 | **TDD 要求**: 是——与 REQ-001 共享相同的审查矩阵逻辑

#### S6-HP: 初审矩阵——与 /review 一致的 5+1 并行矩阵

```gherkin
Feature: /review-fix Phase 1 初审矩阵
  使用与 /review 完全一致的 5+1 审查专家并行矩阵

  Background:
    Given 编排者处于 Phase 1(初审)
    And 变更涉及前端(React 组件)和后端(Express API)

  Scenario: 全领域变更——5+1 矩阵完整触发
    When 编排者并行 spawn:
      | frontend-review-expert  | 审查 src/components/ 和 src/pages/ |
      | backend-review-expert   | 审查 src/services/ 和 src/routes/  |
      | security-review-expert  | 审查全量代码安全                    |
      | perf-review-expert      | 审查全量代码性能                    |
    And 等待以上 4 个 Agent 全部返回
    Then 编排者 spawn qa-review-expert(汇聚 Findings)
    And 编排者判断: algorithm-expert 是否触发?
    When 变更不涉及算法/密码学/ML
    Then algorithm-expert 不触发
    And 最终审查矩阵为 5 个 Agent(不含 algorithm-expert)
    And Phase 1 产出的 Findings 报告与 /review 命令产出格式一致
```

#### S6-EX: 初审即发现 Critical——阻止进入后续 Phase

```gherkin
  Scenario: 初审 matrix 发现硬编码密钥——Phase 1 即 BLOCKED
    Given 编排者执行 Phase 1 初审矩阵
    And security-review-expert 返回 Finding SEC-C02(severity: CRITICAL):
      "src/config/database.ts:8 硬编码 PostgreSQL 连接密码"
    When qa-review-expert 汇聚报告确认 CRITICAL 存在
    Then 编排者立即停止, 不进入 Phase 2
    And 编排者标记当前会话为 BLOCKED
    And 编排者向用户报告:
      """
      [BLOCKED] Phase 1 初审发现 CRITICAL:
      - Finding SEC-C02: 硬编码数据库密码
      - 建议: 修复后重新执行 /review-fix
      - 当前 Phase 1 产物已保留: docs/.../phase1-findings.md
      """
    And Phase 2/3/4/5 均不执行
```

---

### S7: 按领域路由修复 Agent (Phase 3)

**复杂度**: 高 | **TDD 要求**: 是——路由表的确定性必须可测试

#### S7-HP: 混合领域 Findings——按领域分组路由

```gherkin
Feature: /review-fix Phase 3 按领域路由修复 Agent

  Background:
    Given Phase 1 初审产出 Findings:
      | Finding ID | 严重度 | 领域     | 文件路径                              |
      | F-001      | Major  | frontend | src/components/OrderForm.tsx          |
      | F-002      | Minor  | frontend | src/components/OrderForm.tsx          |
      | B-001      | Major  | backend  | src/services/order-service.ts         |
      | B-002      | Minor  | backend  | src/routes/order-routes.ts            |
      | S-001      | Major  | security | src/middleware/auth.ts                |
    And Phase 2 修复计划已产出, 标注了共享区域冲突

  Scenario: 按领域无冲突分组——两批并行修复
    Given Phase 2 修复计划将 Findings 分为两批:
      | Batch | Finding IDs         | 理由                       |
      | 1     | F-001, F-002, B-001 | 三个文件互不重叠, 无共享冲突 |
      | 2     | B-002, S-001        | B-002 依赖 Batch 1 修复完成 |
    When 编排者执行 Batch 1 并行:
      | 操作                                    | 对应 Finding |
      | spawn frontend-dev-expert              | F-001, F-002 |
      | spawn backend-dev-expert               | B-001        |
    And Batch 1 所有 Agent 完成
    When 编排者执行 Batch 2 并行:
      | 操作                                    | 对应 Finding |
      | spawn backend-dev-expert               | B-002        |
      | spawn backend-dev-expert(传递安全报告)  | S-001        |
    Then Batch 2 所有 Agent 完成
    And 所有修复变更仅限 Finding 指定的文件和行范围
    And 无修复 Agent 修改了未分配的共享区域
```

#### S7-EX1: 共享区域冲突——Plan Patch 机制介入

```gherkin
  Scenario: 两个 Finding 修改同一文件的不同区域——Plan Patch 协调
    Given Findings 涉及同一文件 "src/services/order-service.ts":
      | B-001 | Major | 修复第 45-60 行(支付验证逻辑) |
      | B-002 | Minor | 修复第 120-125 行(日志格式)    |
    When 编排者准备 spawn 两个 backend-dev-expert 并行修复
    Then 编排者检测到共享区域冲突(同一文件)
    And 编排者不并行, 改为串行:
      | 顺序 | Agent                    | 修复范围        |
      | 1    | backend-dev-expert #1   | B-001(第45-60行)|
      | 2    | backend-dev-expert #2   | B-002(第120-125行) |
    And 第 2 个 Agent 需要基于第 1 个 Agent 的修复结果工作
    And 编排者向用户说明: "检测到共享区域冲突, 改为串行修复"
```

#### S7-EX2: 领域路由失败——无匹配的 Agent 类型

```gherkin
  Scenario: Finding 无法匹配到合适的实现 Agent——编排者请求澄清
    Given 一个 Finding 标记领域为 "database"(数据库迁移脚本):
      | D-001 | Major | database | migrations/003_add_index.sql |
    When 编排者评估路由表:
      | 领域     | Agent 候选                  | 匹配? |
      | database | backend-data-expert        | NO(该 Agent 不存在) |
    And 路由表无法精确匹配 "database" 领域的实现 Agent
    Then 编排者不自动选择 Agent
    And 编排者向用户请求澄清:
      """
      无法为 Finding D-001 确定修复 Agent:
      - 文件: migrations/003_add_index.sql
      - 领域: database(迁移脚本)
      - 可用 Agent: backend-dev-expert, backend-api-expert, backend-logic-expert, backend-data-expert
      - 建议: 使用 backend-dev-expert(通用后端) 或其他?
      """
    And 编排者等待用户确认后再 spawn Agent
```

---

### S8: 验证门与修复-重验循环 (Phase 4)

**复杂度**: 中 | **TDD 要求**: 是——Lint/Type-check/Build 的通过/失败状态可测试

#### S8-HP: 验证全通过——直接进入 Phase 5

```gherkin
Feature: /review-fix Phase 4 验证门

  Background:
    Given Phase 3 修复已全部完成
    And 所有修复变更已写入文件

  Scenario: Lint + Type-check + Build + Test 全部通过
    When 编排者启动 Phase 4 验证(不可spawn Agent——编排者直接运行命令):
      | 验证项               | 命令                    | 预期结果   |
      | Lint                 | npm run lint            | 0 errors   |
      | Type-check           | npx tsc --noEmit        | 通过       |
      | Build                | npm run build           | 成功       |
    Then 全部通过
    When 编排者执行测试回归:
      | 验证项    | 命令        | 预期结果       |
      | 单元测试  | npm test    | 全部通过       |
    Then 编排者确认: 无回归失败
    And 编排者记录验证证据到 Phase 4 报告
    And 编排者推进到 Phase 5
```

#### S8-EX: Build 失败——回退 Phase 3 修复后重验

```gherkin
  Scenario: Type-check 失败——回退修复后重验通过
    Given 编排者执行 Phase 4 验证
    When Lint 通过(0 errors)
    But Type-check(npx tsc --noEmit) 失败:
      """
      src/services/order-service.ts:52:15 - error TS2345:
      Argument of type 'string | null' is not assignable to parameter of type 'string'.
      """
    Then 编排者分析失败根因:
      | 失败文件                                   | 归属 Finding | 归属 Agent           |
      | src/services/order-service.ts              | B-001        | backend-dev-expert   |
    Then 编排者 spawn backend-dev-expert(传递类型错误信息) 修复类型错误
    And 修复 Agent 完成后
    When 编排者重新执行完整 Phase 4 验证(Lint + Type-check + Build)
    Then 全部通过
    And 编排者记录第 1 轮修复-重验循环
    And Phase 4 循环次数 = 1(未达上限 2)
```

#### S8-EX2: 两轮验证仍失败——标记 ABORT

```gherkin
  Scenario: 两轮修复后 Type-check 仍失败——ABORT
    Given Phase 4 第 1 轮验证 Type-check 失败
    And 编排者已执行第 1 轮回退修复
    And 第 2 轮验证 Type-check 仍失败(新的类型错误)
    When 编排者检查 Phase 4 循环次数 = 2(已达上限)
    Then 编排者标记 Phase 4 为 ABORT
    And 编排者汇总:
      | 项目             | 详情                                        |
      | 失败验证项       | Type-check                                  |
      | 第 1 轮错误      | src/services/order-service.ts:52 string|null |
      | 第 1 轮修复 Agent | backend-dev-expert                          |
      | 第 2 轮错误      | src/services/order-service.ts:87 缺少类型导入 |
      | 建议             | 手动检查 order-service.ts 的类型依赖链       |
    And 编排者保留所有产物的快照
    And 编排者向用户报告阻塞情况
```

---

### S9: 复审关闭矩阵 (Phase 5)

**复杂度**: 高 | **TDD 要求**: 是——关闭矩阵的闭合逻辑必须可测试

#### S9-HP: 所有 Findings 关闭——复审通过

```gherkin
Feature: /review-fix Phase 5 复审关闭矩阵

  Background:
    Given Phase 4 验证全部通过
    And Phase 1 初审产出 6 个 Findings(F-001, F-002, B-001, B-002, S-001, P-001)

  Scenario: 逐项关闭——复审全部通过
    When 编排者并行 spawn:
      | Agent                   | 职责                                    |
      | change-review-expert    | 逐项对比 Phase 1 Findings 与 Phase 3 修复, 确认修复正确 |
      | qa-review-expert        | 最终综合签核, 检查 REQ 追踪和 Gate 条件  |
    Then change-review-expert 产出关闭矩阵:
      | Finding ID | 状态    | 确认方式              |
      | F-001      | CLOSED  | 代码审查通过          |
      | F-002      | CLOSED  | 代码审查通过          |
      | B-001      | CLOSED  | 代码审查 + 测试通过   |
      | B-002      | CLOSED  | 代码审查通过          |
      | S-001      | CLOSED  | 安全审查通过          |
      | P-001      | CLOSED  | 性能审查通过          |
    And qa-review-expert 产出最终签核报告:
      | 判定     | PASS                     |
      | 关闭率   | 6/6 (100%)               |
      | REQ 追踪 | 全部 REQ 有对应关闭证据  |
    And 编排者向用户报告: "审查修复闭环完成——6/6 Finding 已关闭"
```

#### S9-EX: 部分 Findings 未关闭——报告遗留风险

```gherkin
  Scenario: 2 个 Findings 修复不完整——标记遗留风险
    Given Phase 1 初审产出 6 个 Findings
    When change-review-expert 逐项审查:
      | Finding ID | 审查结论                                    | 状态         |
      | F-001      | 修复正确, 通过                              | CLOSED       |
      | F-002      | 修复正确, 通过                              | CLOSED       |
      | B-001      | 修复正确, 通过                              | CLOSED       |
      | B-002      | 修复正确, 通过                              | CLOSED       |
      | S-001      | 修复不完整: 仍存在 XSS 风险(新位置)         | OPEN         |
      | P-001      | 修复后性能反而退化 15%                       | REOPENED     |
    Then change-review-expert 产出关闭矩阵:
      | 关闭率   | 4/6 (66.7%)            |
      | 未关闭   | S-001(OPEN), P-001(REOPENED) |
    And qa-review-expert 综合判定: FIX_REQUIRED(存在 OPEN 项)
    Then 编排者判断:
      | 条件                       | 结论                              |
      | S-001 为安全相关(OPEN)    | 必须修复, 不能遗留                |
      | P-001 为性能退化(REOPEN)  | 评估退化幅度; 15% 退化需修复       |
    And 编排者触发 Phase 3→4→5 的修复-重审循环
    When 循环次数 <= 1(未达上限)
    Then 编排者回到 Phase 3(spawn 对应领域 Agent 修复 S-001 和 P-001)
```

---

### S10: 全链路审查-修复-重审循环

**复杂度**: 高 | **TDD 要求**: 是——全链路有限状态机必须可测试

#### S10-HP: 标准循环——1 轮修复-重审通过

```gherkin
Feature: /review-fix 全链路审查-修复-重审循环
  五阶段中 Phase 3→4→5 可形成最多 2 轮循环

  Background:
    Given 第 1 轮运行:
      | Phase 1 初审  | 6 Findings(无 Critical)     |
      | Phase 2 规划  | 修复计划完成                |
      | Phase 3 执行  | 修复 6 个 Findings          |
      | Phase 4 验证  | Lint + Type-check + Build 通过 |
      | Phase 5 复审  | 2 个 Finding 未关闭(S-001, P-001) |

  Scenario: 第 1 轮修复-重审循环——修复后再审通过
    When 编排者检测到 Phase 5 有未关闭 Finding
    And 当前循环次数 = 0(第 1 轮尚未循环)
    Then 编排者进入修复-重审循环:
      | 步骤          | 操作                                                       |
      | 回退 Phase 3  | spawn backend-dev-expert(修复 S-001 安全 XSS)              |
      |               | spawn frontend-dev-expert(修复 P-001 性能退化)             |
      | 重进 Phase 4  | 重新运行 Lint + Type-check + Build + Test                  |
      | 重进 Phase 5  | 重新 spawn change-review-expert + qa-review-expert         |
    And Phase 4 验证通过
    And Phase 5 复审: S-001 CLOSED, P-001 CLOSED
    And qa-review-expert 最终判定: PASS
    And 循环次数 = 1(第 1 次循环即通过)
    And 编排者向用户报告: "审查修复闭环完成——2 轮(含初审)后 6/6 Finding 已关闭"
```

#### S10-EX: 2 轮上限——标记 ABORT 并汇总

```gherkin
  Scenario: 第 2 轮修复-重审循环后仍有未关闭项——ABORT
    Given 第 1 轮修复-重审后 Phase 5 仍有 1 个 Finding 未关闭(S-001 OPEN)
    And 编排者进入第 2 轮循环:
      | Phase 3 | spawn backend-dev-expert(再次修复 S-001) |
      | Phase 4 | 验证通过                                 |
      | Phase 5 | S-001 仍为 OPEN(修复尝试再次失败)         |
    When 编排者检查循环次数 = 2(已达上限)
    Then 编排者标记为 ABORT
    And 编排者不进入第 3 轮循环
    And 编排者汇总:
      | 项目             | 详情                                         |
      | 总循环次数       | 2(已达上限)                                  |
      | 未关闭 Finding   | S-001: auth.ts 中的存储型 XSS(3 次修复未成功) |
      | 修复历史         | 第 1 轮: backend-dev-expert(修复不完整)      |
      |                  | 第 2 轮: backend-dev-expert(修复不完整)      |
      | 已关闭 Finding   | 5/6(83.3%)                                 |
      | 阻塞原因         | S-001 根因复杂, 需人工介入                   |
      | 产物保留路径     | docs/2026-05-18/review/review-fix-*.md     |
    And 编排者向用户报告不可恢复的阻塞
    And 用户确认后, 所有已关闭的修复变更保留, 仅 S-001 需人工关注
```

---

## 4. 汇总

### 4.1 复杂度分布

| 复杂度 | 场景数 | 场景编号 |
|--------|--------|---------|
| **高** | 14 | S1-HP, S1-EX, S3-HP, S3-EX, S4-HP, S4-EX1, S4-EX2, S5-HP, S6-HP, S7-HP, S7-EX1, S9-HP, S10-HP, S10-EX |
| **中** | 8  | S2-HP, S2-EX, S5-EX, S6-EX, S7-EX2, S8-HP, S8-EX2, S9-EX |

### 4.2 TDD 测试骨架需求

以下场景需要后续在 TDD 阶段产出测试骨架(from DDD 分析):

| 场景 | 需 TDD 测试骨架 | 测试类型 | 理由 |
|------|---------------|---------|------|
| S1 | 是 | 集成测试 | Agent spawn 并行性、数量、顺序可验证 |
| S2 | 是 | 单元测试 | 5 个触发条件的布尔组合(2^5=32 种情况) |
| S3 | 是 | 单元测试 | Findings 合并、严重度分级、冲突检测算法 |
| S4 | 是 | 集成测试 | 回退策略的有限状态机(FSM)可达路径 |
| S5 | 是 | 集成测试 | 五阶段顺序约束(非法跳转应被阻断) |
| S6 | 是 | 集成测试 | 与 S1 共享逻辑, 但额外验证 Phase 1 上下文 |
| S7 | 是 | 单元测试 | Agent 路由表确定性(每种领域+操作 → 唯一 Agent) |
| S8 | 是 | 集成测试 | Lint/Type-check/Build 失败→回退→重验循环 |
| S9 | 是 | 单元测试 | 关闭矩阵闭合算法(Finding 状态转换: OPEN→CLOSED) |
| S10 | 是 | 集成测试 | 全链路 FSM 所有路径可达性(含 ABORT) |

### 4.3 共享逻辑标注

REQ-001 和 REQ-002 共享以下逻辑, BDD 场景互相引用:

| 共享逻辑 | REQ-001 场景 | REQ-002 场景 | 说明 |
|---------|-------------|-------------|------|
| 5+1 审查矩阵启动 | S1 | S6 | 完全相同的 Agent spawn 序列 |
| 审查 Findings 汇聚 | S3 | S6 的汇聚部分 | 完全相同的汇聚逻辑 |
| 回退循环 | S4 | S10 | REQ-002 的回退范围更大(跨 Phase) |
| algorithm-expert 触发 | S2 | S6 的条件判断 | 完全相同的 5 条件判断 |

### 4.4 不可变约束验证

所有场景隐含验证以下不可变约束(来自需求文档):

| 约束 | 验证方式 |
|------|---------|
| 编排者禁止直接编码 | 所有场景中编排者仅 spawn Agent 或运行命令, 无 Write/Edit 操作 |
| Gate 检查强制 | 每个 spawn 前有 gate_check(场景 S1 Background) |
| 红线不减少 | 所有场景中的只读审查纪律、阶段顺序、修复范围约束均保留 |
| 失败回退循环 ≤ 2 轮 | 场景 S4-EX2 和 S10-EX 严格验证上限 |
| 共享区域唯一责任方 | 场景 S7-EX1 验证冲突串行化 |

---

## 5. 推荐的下一步

1. **TDD 阶段**: spawn `task-design` Agent (TDD mode), 传入本 BDD 文档 + DDD 文档, 产出 TDD 任务分解 `docs/2026-05-18/tasks/commands-subagent-integration-tasks.md`
2. **实现顺序**: 按 DDD 分批策略, 先实现 REQ-001 (`/review`), 因其是 REQ-002 (`/review-fix`) 的初审子集; 审查矩阵逻辑复用
3. **测试骨架优先级**: S2(条件触发) > S7(领域路由) > S3(汇聚) > S4(回退) > S10(全链路)
