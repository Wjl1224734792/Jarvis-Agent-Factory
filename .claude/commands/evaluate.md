---
name: evaluate
description: 技术评估指令——E0定义标准→E1生成原型→E2收集指标→E3生成报告，4Gate评估流程
model: deepseek-v4-pro
effort: max
argument-hint: [评估对象，如"是否采用Bun替代Node.js"或"React vs Vue技术选型"]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill, WebFetch, WebSearch
version: "4.3.8"
updated: "2026-05-24"
---

# 技术评估

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("source-driven-development")
```

**引擎会话注册**（硬约束——引擎确保评估操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "evaluate", task_name: "评估: <评估对象>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
- E1 阶段写原型代码前调用 `mcp__jarvis-engine__gate_check({ operation: "write_code" })`

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

---

## E0：定义评估标准与用例

**Gate 检查条件**：评估标准文档已产出，含评估维度+权重+用例清单

### 步骤
1. 明确评估对象和备选方案：
   - 方案 A：当前方案（基线）
   - 方案 B / C / D：备选方案

2. 定义评估维度（至少 4 个维度）：

   | 维度 | 权重 | 评分标准 |
   |------|------|---------|
   | **性能** | 30% | 延迟、吞吐量、资源消耗 |
   | **开发效率** | 25% | 学习曲线、文档质量、社区支持 |
   | **可维护性** | 20% | 类型安全、测试基础设施、调试工具 |
   | **生态兼容** | 15% | 现有工具链集成、依赖迁移成本 |
   | **运维成本** | 10% | 部署复杂度、监控、日志 |

3. 设计验证用例清单（对每个备选方案执行相同的任务）：
   ```
   | 用例ID | 场景描述 | 输入 | 预期输出 | 验证维度 |
   |--------|---------|------|---------|---------|
   | UC-01 | JWT 签名/验证 | 用户对象 | 有效 token | 性能+正确性 |
   | UC-02 | 数据库 CRUD | 100条记录 | 响应 < 50ms | 性能 |
   | UC-03 | 并行请求处理 | 100并发 | 0 错误 | 吞吐量 |
   ```

4. 输出 `.jarvis/YYYY-MM-DD/evaluation/evaluation-criteria.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "E1" })`

---

## E1：生成快速原型

**Gate 检查条件**：快速原型已生成（沙箱/独立分支），可独立运行

### 步骤
1. 为每个备选方案创建独立原型：
   - 使用独立分支/沙箱环境
   - 不污染主项目代码
   - 只实现 E0 定义的验证用例

2. 原型要求：
   - **最小化**：只写验证用例需要的代码，不建完整应用
   - **可运行**：能独立跑起来验证核心假设
   - **可对比**：不同方案的原型解决相同问题，输入输出一致

3. 原型目录建议：
   ```
   prototypes/
   ├── solution-a/      # 方案 A 原型
   │   ├── package.json
   │   └── src/
   └── solution-b/      # 方案 B 原型
       ├── package.json
       └── src/
   ```

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "E2" })`

---

## E2：运行评估用例并收集指标

**Gate 检查条件**：评估用例全部运行完毕，指标数据已收集

### 步骤
1. 对每个备选方案运行相同的验证用例

2. 收集性能指标：
   ```bash
   # 运行时间
   time node prototype-a/src/uc01-jwt.js
   time bun prototype-b/src/uc01-jwt.ts
   
   # 资源消耗
   /usr/bin/time -v node prototype-a/src/uc02-crud.js
   ```

3. 填充指标矩阵：

   | 用例 | 指标 | 方案 A | 方案 B | 方案 C |
   |------|------|--------|--------|--------|
   | UC-01 | 延迟(P50) | __ms | __ms | __ms |
   | UC-01 | 延迟(P95) | __ms | __ms | __ms |
   | UC-02 | 延迟(P50) | __ms | __ms | __ms |
   | UC-03 | 错误率 | __% | __% | __% |
   | UC-03 | 吞吐量 | __rps | __rps | __rps |

4. 收集非功能指标：
   | 维度 | 方案 A | 方案 B | 备注 |
   |------|--------|--------|------|
   | 依赖数量 | __ | __ | npm ls --depth=0 |
   | 打包体积 | __KB | __KB | 生产构建 |
   | 文档质量(1-5) | __ | __ | 主观评分 |
   | 社区活跃度 | __ | __ | GitHub stars/issues |

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "E3" })`

---

## E3：汇总评估报告

**Gate 检查条件**：评估报告已产出，含各维度评分+综合结论+推荐方案

### 步骤
输出 `.jarvis/YYYY-MM-DD/evaluation/evaluation-report.md`：
```markdown
# 技术评估报告
## 评估对象
- 评估目标和备选方案说明

## 评估方法论
- 维度权重表
- 验证用例清单

## 各维度评分
| 维度 | 权重 | 方案 A | 方案 B | 方案 C |
|------|------|--------|--------|--------|
| 性能 | 30% | 8/10 | 9/10 | 7/10 |
| 开发效率 | 25% | 7/10 | 8/10 | 6/10 |

综合得分：方案 A = 7.2, 方案 B = 8.5, 方案 C = 6.2

## 关键发现
- 每个方案的优势和劣势
- 迁移成本估计
- 风险评估

## 推荐方案
- 推荐方案 B，理由：...
- 替代方案：若资源允许可选 A，因为...

## 后续行动
- [ ] 确认选型决策
- [ ] 制定试点迁移计划
- [ ] 更新技术栈文档
```

---

## 红线
- 不定义评估标准就开始写代码（先有尺子，再量东西）
- 原型代码写太多（原型不是产品，只验证假设）
- 指标按喜好挑选（必须对所有方案运行相同用例）
- 忽略非功能维度（性能不是唯一标准）
- 评估中修改评估标准（标准在 E0 确定后不可变）
- 不清除原型残留（原型用完即弃，不混入主项目）

---
## Agent 编排参考

| Gate | 推荐 Agent | 操作类型 | 说明 |
|------|-----------|---------|------|
| E0 | code-explore-expert | read | 调研候选技术方案 |
| E1 | planner, code-explore-expert | write_code | 生成概念验证原型 |
| E2 | perf-test-expert | read/build | 收集基准测试指标 |
| E3 | — | write_doc | 编排者汇总多维评估报告 |

> Gate 权限由 `gate_check({ operation })` 强制执行。Agent 不可递归 spawn。
