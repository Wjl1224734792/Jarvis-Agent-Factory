# 技能分配文档 — antV G6 可视化 + Token 追踪

> 日期：2026-05-11 | 分配者：编排者（skill-assignment-expert 暂未在 agent-registry 注册，由编排者直接分配）

---

## 分配摘要

| Agent | TASK | 类型 | 风险 | 技能分配 |
|-------|------|------|------|---------|
| backend-dev-expert | TASK-001 | DDD+TDD | 中 | @source-driven-development @test-driven-development @code-standards @verification-before-completion |
| backend-dev-expert | TASK-002 | TDD | 中 | @source-driven-development @test-driven-development @verification-before-completion |
| remediation-expert | TASK-003 | 直接开发 | 中 | @source-driven-development @verification-before-completion |
| frontend-dev-expert | TASK-004 | 直接开发 | **高** | @source-driven-development @incremental-implementation @verification-before-completion @debugging-and-error-recovery |
| frontend-dev-expert | TASK-005 | 直接开发 | 中 | @source-driven-development @incremental-implementation @verification-before-completion |
| remediation-expert | TASK-006 | 直接开发 | 低 | @source-driven-development @verification-before-completion |

---

## 详细分配

### TASK-001：backend-dev-expert
**任务**: 引擎核心 — Agent 事件追踪基础设施（DDD + TDD）
**风险**: 中
**技能**:
- `@source-driven-development` — 先读 db.ts/server.ts/gates.ts 现有代码再写
- `@test-driven-development` — Red→Green→Refactor 流程：先写 agent-events.test.ts
- `@code-standards` — 通用编程规范（中文注释、类型安全、禁止物理外键等）
- `@verification-before-completion` — 交付前自检：agent_event/agent_usage/agent_status 三个 MCP 工具均可用

---

### TASK-002：backend-dev-expert
**任务**: Web API 扩展 — Agent 数据查询端点（TDD）
**风险**: 中
**技能**:
- `@source-driven-development` — 先读 routes.ts 了解现有 API 风格和 SSE 广播机制
- `@test-driven-development` — 先写 agent-api.test.ts 测试 GET/POST 端点
- `@verification-before-completion` — 交付前自检：4 个端点全通过 + SSE 数据含 agent_status

---

### TASK-003：remediation-expert
**任务**: Plugin + Hook 体系 — 配置与脚本（直接开发）
**风险**: 中
**技能**:
- `@source-driven-development` — 先读现有 .claude/ 目录结构和 AGENTS.md 了解项目约定
- `@verification-before-completion` — 交付前自检：plugin.json/hooks.json/脚本文件均存在且格式正确

---

### TASK-004：frontend-dev-expert
**任务**: G6 流程可视化 — 10-Gate 实时状态图（直接开发，**高风险**）
**风险**: **高**（L 级任务，~380 行 + G6 v5 API 不稳定）
**技能**:
- `@source-driven-development` — 先读现有 Dashboard.tsx/api.ts/Layout.tsx 了解前端架构
- `@incremental-implementation` — 分步交付：1) 基础布局渲染 → 2) Agent 状态显示 → 3) 交互（点击/悬停/缩放）→ 4) 动画
- `@verification-before-completion` — 交付前自检：10-Gate 渲染正确、主题变量读取正常、cleanup 无泄漏
- `@debugging-and-error-recovery` — G6 Canvas 渲染问题系统化调试

---

### TASK-005：frontend-dev-expert
**任务**: Token 仪表盘 — 实时消耗统计面板（直接开发）
**风险**: 中
**技能**:
- `@source-driven-development` — 先读 TASK-004 完成后的 Dashboard.tsx 和 api.ts
- `@incremental-implementation` — 分步：1) Token 计数+数字动画 → 2) 模型分布 → 3) Agent 排行 → 4) 成本估算
- `@verification-before-completion` — 交付前自检：所有统计数据正确渲染、空状态/加载状态处理

---

### TASK-006：remediation-expert
**任务**: 命令模板优化 — Agent 名称与路由同步（直接开发）
**风险**: 低
**技能**:
- `@source-driven-development` — 先读所有 16 个命令模板 + AGENTS.md Agent 清单
- `@verification-before-completion` — 交付前自检：所有 16 个模板引用正确、无旧名称残留

---

## 基座技能说明

`@behavioral-guidelines` 是所有 Agent 的基座技能（自动加载），包含 6 项核心准则：
1. 先思考，再编码
2. 简单优先
3. 精准修改
4. 目标驱动执行
5. 注释语言约定（中文项目用中文注释）
6. 多模态回退（纯文本模型使用 visual-primitives-mcp）

**不在上述分配清单中列出**。

---

