# REQ-TEST-001: 浏览器测试文档驱动工作流

> 状态：draft
> 日期：2026-05-08
> 领域：测试工作流 + Agent 技能

---

## 背景

当前 `browser-test-expert` Agent 在执行测试时自行编写测试用例并执行，缺少统一的测试文档作为基准。需要建立"先写文档 → Agent 按文档执行 → 输出成功/失败清单 → 后续 Agent 按清单复现修复"的标准工作流。

---

## 核心原则

**分工明确：**
| 角色 | 职责 |
|------|------|
| 测试文档编写 Agent | 使用 `browser-testing` 技能编写结构化测试用例文档 |
| 测试执行 Agent | 严格按照文档执行测试，不自行发挥 |
| 修复 Agent | 根据失败清单定位、复现、修复 |

**Agent 不自己写测试用例** — 他们执行已有文档中的用例，只记录通过/未通过，不创造新的测试场景。

---

## 需求清单

### REQ-TEST-001：测试文档编写 Agent

**优先级：** P0

**描述：**
新增专门的 Agent 角色（或指令），负责在 Gate C2 之前加载 `browser-testing` 技能，根据需求文档 + 前端变更文件编写测试用例文档。

**产出格式：** `docs/testing/YYYY-MM-DD-<topic>-test-cases.md`

**文档结构：**
```markdown
# 浏览器测试用例 — <主题>

## 环境信息
- 测试 URL: http://localhost:3457
- 视口: desktop (1280x800) / tablet (768x1024) / mobile (375x812)
- 浏览器: Chrome

## 测试用例

### TC-001: <用例标题>
- **前提条件:** <描述>
- **操作步骤:**
  1. 导航到 /dashboard
  2. 点击「全部」过滤按钮
  3. 观察会话列表
- **预期结果:**
  - 会话列表显示所有平台的会话
  - 每个会话卡片显示 task_name 或指令名
- **严重度:** P0 / P1 / P2

### TC-002: ...
```

**测试用例编写原则：**
- 每个用例一个独立验证点
- 操作步骤具体到 CSS 选择器级别（如 `点击 [data-testid="session-card"]`）
- 预期结果可自动验证（包含 `preview_snapshot` 文本匹配或 `preview_inspect` CSS 属性验证）

---

### REQ-TEST-002：测试执行 Agent 按文档执行

**优先级：** P0

**描述：**
`browser-test-expert` 加载测试用例文档后，严格逐条执行，不得自行增减用例。输出结构化测试报告。

**产出格式：** `docs/testing/YYYY-MM-DD-<topic>-test-results.md`

**报告结构：**
```markdown
# 浏览器测试结果 — <主题>

## 汇总
- 总计: 12 用例
- 通过: 10 ✅
- 失败: 2 ❌
- 阻塞: 0 ⚠️

## 详细结果

### TC-001: <用例标题> — ✅ 通过
<截图或 snapshot 证据>

### TC-002: <用例标题> — ❌ 失败
- **预期:** 会话列表显示 task_name
- **实际:** 列表仍显示 session ID 截断
- **截图证据:** <截图>
- **可能原因:** session_set_name 未调用或数据未刷新
- **关联代码:** src/web/views/pipeline.html:436-445

## 失败用例清单
- [ ] TC-002: 会话列表 task_name 未显示
- [ ] TC-005: 归档按钮点击无响应
```

---

### REQ-TEST-003：修复→重测闭环

**优先级：** P0

**描述：**
测试报告中的失败用例自动流转到修复阶段。

**流程：**
```
1. browser-test-expert 输出测试报告（含失败清单）
2. Jarvis 分析失败清单，定位原因（前端/后端/数据）
3. 按领域 spawn 对应实现 Agent：
   - 前端问题 → frontend-dev-expert
   - 后端问题 → backend-dev-expert
4. 实现 Agent 读取测试报告中的失败用例，定位根因并修复
5. 修复完成后，重跑失败用例（不是全部用例，除非修复影响面大）
6. 最多 2 轮修复-重测循环
7. 2 轮仍失败 → 标记 BLOCKED，向用户报告
```

**重测策略：**
- 第 1 轮：重跑所有失败用例
- 修复后仍失败 → 第 2 轮：重跑失败用例 + 相关用例
- 全部通过 → 输出最终测试报告，标记 `✅ 全部通过`

---

### REQ-TEST-004：集成到 Gate C2 流程

**优先级：** P1

**描述：**
将上述工作流嵌入到现有 `/jarvis` 流水线的 Gate C2 阶段。

**更新后的 Gate C2 流程：**
```
Gate C2 步骤 1（并行）:
├── spawn test-doc-writer Agent（加载 browser-testing 技能，写测试用例文档）
├── spawn backend-test-expert（单元+集成测试）
└── spawn frontend-test-expert（单元+组件测试）

Gate C2 步骤 2:
└── spawn browser-test-expert（加载测试用例文档，按文档执行，输出测试报告）

Gate C2 步骤 3（有失败时）:
├── 分析失败清单 → spawn 对应修复 Agent
└── 修复后 → spawn browser-test-expert（重跑失败用例）

Gate C2 步骤 4:
└── spawn e2e-test-expert（端到端测试）

Gate C2 步骤 5:
└── 汇总测试结果到 docs/testing/YYYY-MM-DD-<topic>-test-summary.md
```

---

### REQ-TEST-005：browser-testing 技能增强

**优先级：** P2

**描述：**
更新 `browser-testing` 技能文件（`src/templates/platforms/*/skills/browser-testing/SKILL.md`），明确：
- 测试 Agent 的职责是「执行已有文档」而非「编写测试用例」
- 测试报告的输出格式模板
- 失败用例与修复 Agent 的交接格式
