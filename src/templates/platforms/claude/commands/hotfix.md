---
name: hotfix
description: 紧急热修复指令——H0紧急声明→H1最小化修复→H2快速验证+回滚→H3事后审计，4Gate紧急流程
model: deepseek-v4-pro
argument-hint: [故障描述或issue编号]
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Skill
---

# 紧急热修复

立即执行以下初始化步骤：

## 步骤 0：加载技能 + 注册引擎
```
Skill("behavioral-guidelines")
Skill("debugging-and-error-recovery")
```

**引擎会话注册**（硬约束——引擎确保热修复操作按 Gate 权限执行）：
- `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "hotfix", task_name: "热修复: <故障简述>" })`
- 每个 Gate 开始前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前 Gate 允许的操作
- H0 阶段只读（紧急声明），H1 阶段方可写代码
- 部署前调用 `mcp__jarvis-engine__gate_check({ operation: "deploy" })`

代码注释语言：遵从 `behavioral-guidelines` 准则 5（注释语言约定）。

---

## H0：紧急声明与审批

**Gate 检查条件**：紧急声明已提交，审批人已确认，回滚预案已就绪

### 步骤
1. 填写紧急声明：
   ```
   ## 紧急故障声明
   - 故障发现时间：YYYY-MM-DD HH:MM
   - 严重级别：P0 服务中断 / P1 核心功能受损
   - 影响范围：受影响用户数 / 受影响功能
   - 故障现象：具体表现 + 错误信息
   - 初步定位：可能的根因方向
   ```

2. 确认回滚预案：
   - 回滚方式：`git revert <commit>` / 回退部署版本
   - 回滚验证步骤
   - 回滚负责人

3. 获得审批确认，输出 `docs/YYYY-MM-DD/hotfix/hotfix-declaration.md`

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "H1" })`

---

## H1：最小化修复

**Gate 检查条件**：最小化修复代码已提交，修复范围严格限定在故障根因，未夹带无关改动

### 步骤
1. 定位根因（参考 debugging-and-error-recovery 技能）：
   - 二分法定位引入故障的 commit
   - 追踪调用链找到故障点
   - 确认根因，不满足于表象修复

2. 实施最小化修复：
   - **只改必须改的代码**——一行能修好不改两行
   - **不重构**——即使代码很丑，现在不是时候
   - **不加测试**（紧急情况）——修复后补回归测试
   - **不升级依赖**——不引入新变量

3. 提交格式：
   ```bash
   git commit -m "hotfix: <故障简述>

   根因: <一句话根因>
   修复: <修改说明>
   影响: <受影响文件列表>

   Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
   ```

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "H2" })`

---

## H2：快速验证与回滚确认

**Gate 检查条件**：快速验证通过，修复后功能正常，回滚预案可执行

### 步骤
1. 🔴 **质量重检（不可跳过）**：
   - Lint + Type-check + Build：修复后代码质量通过
   - Test：运行现有测试套件，确保无回归
   - 失败 → 修复后重跑，最多 2 轮

2. 功能验证：
   - 确认故障现象消失
   - 抽查受影响功能的正常路径
   - 检查修复是否引入新错误

3. 回滚预演：
   ```bash
   # 记录当前 HEAD
   git rev-parse HEAD  # 保存到 hotfix 文档
   
   # 验证回滚命令
   git revert --no-commit HEAD  # 试运行，不提交
   git revert --abort           # 取消试运行
   ```

4. 快速部署：
   - 合并到 main 分支
   - 触发部署流水线
   - 监控部署后指标（错误率、延迟）

**引擎推进**：`mcp__jarvis-engine__advance_gate({ gate: "H3" })`

---

## H3：事后回溯审计

**Gate 检查条件**：事后回溯审计报告已产出，含根因分析+修复措施+预防改进

### 步骤
输出 `docs/YYYY-MM-DD/hotfix/hotfix-postmortem.md`：
```markdown
# 事后回溯审计报告
## 故障时间线
| 时间 | 事件 |
|------|------|
| HH:MM | 故障发现 |
| HH:MM | 定位根因 |
| HH:MM | 修复部署 |
| HH:MM | 服务恢复 |

## 根因分析（5 Why）
1. 为什么服务挂了？→ ...
2. 为什么那个条件触发了？→ ...
3. 为什么没有提前发现？→ ...
4. 为什么监控没告警？→ ...
5. 为什么这个逻辑会存在？→ ...

## 修复措施
- 代码修改摘要
- 测试补充（必须补上回归测试）

## 预防改进
- [ ] 添加单元测试防止回归
- [ ] 添加监控告警
- [ ] 更新操作手册
- [ ] 修复类似代码模式
```

---

## 红线
- H0 未审批就开始改代码（跳过审批 = 不可追溯的变更）
- 夹带重构或优化（热修复唯一目标是恢复服务）
- 不验证回滚预案（修复失败时无退路）
- 修复后不补回归测试（同一个故障允许发生两次）
- 跳过事后审计（不分析根因 = 下次还会发生）
- 在生产环境调试（调试流量影响真实用户）
