# Autopilot Spec: Jarvis 指令体系补全

## 差距分析：OMC 插件 vs Jarvis 指令

### 当前 Jarvis 指令（36条）覆盖情况

| 类别 | 已有指令 | 覆盖率 |
|------|---------|:------:|
| 全流程编排 | /jarvis, /jarvis-lite | 100% |
| 平台开发 | /frontend, /backend, /android, /ios, /flutter, /expo, /taro, /react-native | 100% |
| 需求探询 | /ask (4模式) | 100% |
| 任务分解 | /task-ddd, /task-bdd, /task-tdd | 100% |
| 代码审查 | /review, /review-fix | 80% |
| 测试 | /test-unit, /test-integration, /test-e2e, /test-perf, /test-security, /browser-test | 100% |
| 架构 | /frontend-architect, /backend-architect, /algorithm-expert | 100% |
| Bug修复 | /bug-fix | 100% |
| 重构 | /refactor (R1-R5) | 60% |
| 紧急修复 | /hotfix (H0-H3) | 100% |
| 迁移 | /migrate (M1-M4) | 100% |
| 评估 | /evaluate (E0-E3) | 100% |
| 调试 | /debug (D0-D4) | 50% |
| 研究 | /research (RS0-RS4) | 100% |
| 发布 | /release (RL0-RL4), /publish | 100% |
| 浏览器 | /browser-explore | 100% |
| 同步 | /sync | 100% |

### 识别到的 3 个关键缺口

#### 缺口 1: 代码简化/质量清理指令（对照 OMC: simplify + ai-slop-cleaner）

OMC 有 `simplify`（Review changed code for reuse, quality, and efficiency）和 `ai-slop-cleaner`（Clean AI-generated code slop with a regression-safe, deletion-first workflow）。Jarvis 有 `/refactor`（结构性重构）和 `/review`（审查发现），但缺少**专门针对代码质量简化、冗余消除、AI 痕迹清理**的指令。

#### 缺口 2: 因果追踪指令（对照 OMC: trace）

OMC 有 `trace`（Evidence-driven tracing lane that orchestrates competing tracer hypotheses）。Jarvis 有 `/debug`（调试诊断 D0-D4）和 `/research`（深度研究 RS0-RS4），但缺少**假设驱动的因果追踪**——能同时追踪多个竞态假设、收集证据、逐步缩小根因范围的科学方法。

#### 缺口 3: 自主迭代改进指令（对照 OMC: self-improve + autoresearch + ralph）

OMC 有 `self-improve`（Tournament selection improvement loop）、`autoresearch`（Stateful single-mission improvement loop）、`ralph`（Self-referential loop until task completion）。Jarvis 有 `/refactor`（单次重构）和 `/review-fix`（审查修复闭环），但缺少**带度量指标的自主迭代改进循环**——定义目标→研究→计划→执行→评估→迭代直到达标。

### 新增 3 条指令

| 指令 | Gate 序列 | 对标 OMC | 用途 |
|------|----------|---------|------|
| **/simplify** | S0→S1→S2→S3 | simplify + ai-slop-cleaner | 代码质量简化：分析→简化→验证→报告 |
| **/trace** | T0→T1→T2→T3→T4 | trace | 因果追踪：问题框架→假设生成→证据收集→因果分析→解决方案 |
| **/improve** | IM0→IM1→IM2→IM3→IM4 | self-improve + autoresearch + ralph | 自主迭代改进：目标定义→研究→计划→执行→评估→迭代 |

## 技术规格

### /simplify — 代码简化与质量清理

**Gate 序列**: S0 → S1 → S2 → S3

| Gate | 名称 | 操作 | Agent 调度 |
|------|------|------|-----------|
| S0 | 代码分析 | 分析目标代码质量/复杂度/冗余/AI痕迹 | subagent: code-explore-expert |
| S1 | 简化执行 | 删除冗余→提取复用→简化逻辑→规范化 | prefer_team: 按模块并行 |
| S2 | 回归验证 | Lint+Type-check+Build+Test | 编排者主导 |
| S3 | 报告产出 | before/after对比+简化统计 | 编排者产出 |

### /trace — 因果追踪

**Gate 序列**: T0 → T1 → T2 → T3 → T4

| Gate | 名称 | 操作 | Agent 调度 |
|------|------|------|-----------|
| T0 | 问题框架 | 定义症状、上下文、已知信息 | 编排者主导 |
| T1 | 假设生成 | 生成2-5个竞态假设，含先验概率 | subagent: algorithm-expert |
| T2 | 证据收集 | 收集每个假设的证据（for/against） | subagent: code-explore-expert 并行 |
| T3 | 因果分析 | 贝叶斯更新→假设排序→根因定位 | 编排者主导 |
| T4 | 解决方案 | 推荐修复方案+验证步骤 | 编排者产出 |

### /improve — 自主迭代改进

**Gate 序列**: IM0 → IM1 → IM2 → IM3 → IM4

| Gate | 名称 | 操作 | Agent 调度 |
|------|------|------|-----------|
| IM0 | 目标定义 | 定义改进目标+可量化指标+停止条件 | 编排者主导 |
| IM1 | 研究分析 | 分析代码库，识别改进机会 | subagent: code-explore-expert |
| IM2 | 计划制定 | 生成改进计划+假设+预期收益 | subagent: planner |
| IM3 | 执行验证 | 实施改进+运行基准 | prefer_team: executor 并行 |
| IM4 | 评估迭代 | 对比指标→决策继续/停止 | 编排者主导 |

### Agent 调度约束

遵循 AGENTS.md 约束 23（Team 模块隔离）和 24（混合编排）：
- **subagent_only**: S0, T1, T2, IM1 — 只读探索
- **prefer_team**: S1, IM3 — 并行实现，各成员独占模块
- **编排者主导**: S2, S3, T0, T3, T4, IM0, IM2, IM4 — 分析/决策/产出

## 实现范围

1. `src/engine/gates.ts` — 新增 3 条管道定义 + 全部 Gate 配置
2. `src/engine/server.ts` — 注册 3 个新管道类型
3. `src/templates/platforms/claude/commands/` — 3 个新命令模板
4. `src/web/routes.ts` — 路由分类更新
5. `AGENTS.md` — 命令列表 + 管道表更新
6. `README.md` — 命令文档更新
7. `docs/flows/` — 3 个新流程图
