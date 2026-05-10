# Agent 职责审计——清理职责过重/越界的 Agent 定义

## 1. 修复目标

对 6 个 Agent 定义文件的 `description`（role）字段进行更新，确保：
- 每个 Agent 明确标注在哪个 Gate 由编排者 spawn
- 消除递归 spawn 子 Agent 的描述
- 职责边界清晰，不越界、不重叠

## 2. 对应 finding / task ID

Agent 职责审计任务——清理职责过重/越界的 Agent 定义。

## 3. 变更文件 / 变更范围

只修改 6 个文件的 YAML frontmatter 中 `description` 字段（第 3 行），其他字段（tools, effort, model, skills 等）保持不变。

| 文件 | 变更内容 |
|------|---------|
| `src/templates/platforms/claude/agents/frontend-dev-expert.md` | role 增加 Gate C-impl 定位；增加协调 UI+State 专项 Agent 职责；保留"不调度其他 agent" |
| `src/templates/platforms/claude/agents/fix-retest.md` | role 增加 Gate C2 定位；改为调度编排者指定的 Agent 类型；明确不自行定位根因 |
| `src/templates/platforms/claude/agents/review-fix-optimize.md` | role 增加 Gate D 定位；明确不可递归 spawn；所有修复由自身完成 |
| `src/templates/platforms/claude/agents/review-only.md` | role 增加 Gate D 定位；增加不可递归 spawn 子 Agent 约束 |
| `src/templates/platforms/claude/agents/change-review-expert.md` | role 增加 Gate D 定位；关闭矩阵输出格式明确化（open/closed/insufficient） |
| `src/templates/platforms/claude/agents/remediation-expert.md` | role 增加 Gate C1/C2/D 定位；增加不调度其他 agent、自身完成修改的约束 |

## 4. 修复说明

### 4.1 frontend-dev-expert.md

原描述中的「在编排者分配明确子任务后执行」没有明确 Gate 位置，且缺少其作为前端集成者的协调职责。

新描述增加了：
- Gate C-impl 定位（前端实现阶段）
- 协调 UI+State 专项 Agent 的职责（聚焦集成与编排）
- 保留"自身不调度其他 agent"约束

### 4.2 fix-retest.md

原描述存在问题：协调者自行"定位根因"并"调度对应实现 Agent"——这赋予了它不应有的根因分析和 Agent 调度能力。

新描述限制为：
- 在 Gate C2 由编排者 spawn
- 只调度编排者预先指定的 Agent 类型（不自行选择）
- 明确不自行定位根因，根因定位由编排者或测试 Agent 完成

### 4.3 review-fix-optimize.md

原描述是流程性描述，缺少 Gate 定位和 spawn 机制。正文中详细列出了通过 Agent 工具调度子代理的策略。

新描述明确：
- 在 Gate D 由编排者 spawn
- 不可递归 spawn 子 Agent
- 所有修复由自身完成（消除"调度子代理修复"的模式）

### 4.4 review-only.md

原描述已有完整的只审查约束。

新描述增加了：
- Gate D 定位
- 不可递归 spawn 子 Agent

### 4.5 change-review-expert.md

原描述已有复审职责。

新描述修改为：
- Gate D 定位
- 关闭矩阵输出格式加上具体枚举（open/closed/insufficient）
- 逐项复核的表述更精确

### 4.6 remediation-expert.md

原描述缺少 Gate 定位和 spawn 机制。

新描述增加：
- Gate C1/C2/D 多段定位
- 明确不调度其他 agent
- 所有修改由自身完成

## 5. 验证命令与结果

```bash
# 验证只有 6 个目标文件被修改
git diff --stat -- \
  src/templates/platforms/claude/agents/frontend-dev-expert.md \
  src/templates/platforms/claude/agents/fix-retest.md \
  src/templates/platforms/claude/agents/review-fix-optimize.md \
  src/templates/platforms/claude/agents/review-only.md \
  src/templates/platforms/claude/agents/change-review-expert.md \
  src/templates/platforms/claude/agents/remediation-expert.md
# 输出：6 files changed, 6 insertions(+), 6 deletions(-)

# 验证每个文件的 description 字段都正确
grep "^description:" src/templates/platforms/claude/agents/frontend-dev-expert.md
grep "^description:" src/templates/platforms/claude/agents/fix-retest.md
grep "^description:" src/templates/platforms/claude/agents/review-fix-optimize.md
grep "^description:" src/templates/platforms/claude/agents/review-only.md
grep "^description:" src/templates/platforms/claude/agents/change-review-expert.md
grep "^description:" src/templates/platforms/claude/agents/remediation-expert.md
```

验证结果：6 个文件的 description 已全部按预期更新，仅修改了 YAML frontmatter 中的 `description` 字段，每文件只变 1 行。

## 6. 未处理风险

无。本次变更是纯文本字段更新，不涉及逻辑代码，不存在引入 bug 的风险。

## 7. 推荐的下一步

无。任务范围已完整覆盖。
