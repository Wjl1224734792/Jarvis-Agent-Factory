# AGENTS.md 流水线结构与约束更新

## 修复目标

更新 AGENTS.md 项目约束文档，反映新流水线 Gate 结构（新增 Gate B1 和 Gate C-impl），添加 Command 与 Agent 边界约束，更新 Gate 序列及条件性 Gate 说明。

## 对应 Finding / Task ID

任务：更新 AGENTS.md 项目约束文档以反映新流水线结构

## 变更文件 / 变更范围

| 文件 | 类型 | 范围 |
|------|------|------|
| `E:\CodeStore\jarvis\AGENTS.md` | 修改 | 4 处改动，仅涉新流水线结构相关内容 |

## 修复说明

### 1. 生命周期流水线图（第 25-28 行）

旧序列（8 道 Gate）：
```
Gate 0 → Gate A → Gate B → Gate C → Gate C1 → Gate C1.5 → Gate C2 → Gate D → Gate E
```

新序列（10 道 Gate）：
```
Gate 0 → Gate A → Gate B → Gate B1 → Gate C → Gate C-impl → Gate C1 → Gate C1.5 → Gate C2 → Gate D → Gate E
```

Stage 映射对照：

| Stage | Gate | 说明 |
|-------|------|------|
| 想法细化 | Gate 0 | （不变） |
| 需求澄清 | Gate A | （不变） |
| 任务分解 | Gate B | （不变） |
| 架构评审 | Gate B1 | 新增，条件性 |
| 执行规划 | Gate C | 原「执行规划」Gate C，语义明确为规划阶段 |
| 并行实现 | Gate C-impl | 原分散标注为 Gate C 的第二阶段，现独立为 Gate |
| 代码质量 | Gate C1 | （不变） |
| 视觉验证 | Gate C1.5 | （不变） |
| 测试 | Gate C2 | （不变） |
| 评审 | Gate D | （不变） |
| 发布 | Gate E | （不变） |

### 2. Gate 说明表（第 46-51 行）

新增 Gate 说明小节，位于「工作模式」表之后：

- **Gate B1（架构评审）**：条件性 Gate，涉及前端/后端/数据库/算法变更时强制执行；由编排者自动 spawn 对应架构 Agent
- **Gate C-impl（并行实现）**：必选 Gate，Gate C 规划完成后由编排者 spawn 实现类 Agent 并行执行

### 3. 约束 #5 闸门不可绕过（第 92-94 行）

更新 Gate 序列为 10 道，并附条件性 Gate 说明：

- Gate B1 为条件性：涉及前端/后端/数据库/算法变更时强制执行
- Gate C1.5 为条件性：纯后端/逻辑/算法任务可跳过

### 4. 约束 #16 Command 与 Agent 边界（第 105-109 行）

新增约束：
- Command 是用户交互入口，Agent 由编排者在对应 Gate spawn
- 架构对话类 Command 仅用于方案讨论，不进入流水线
- 流水线中的架构 Agent 由编排者在 Gate B1 自动 spawn

### 5. Gate C 引用消歧

原流水线图中 Gate C 同时标注「执行规划」和「并行实现」两个 Stage，现已清晰区分为 Gate C（规划）和 Gate C-impl（实现）。文档中其他部分（发布流程、技能体系、智能体体系）不涉及 Gate C 引用，无需修改。

## 验证命令与结果

```bash
# 确认 diff 仅涉及目标任务范围
git diff AGENTS.md
# 确认无尾随空白符
git diff --check AGENTS.md
# 无输出，通过
```

diff 仅包含 4 处变更：
1. 流水线图（+2/-2 行）
2. Gate 说明表（+6 行）
3. 约束 #5 更新（+3/-1 行）
4. 新增约束 #16（+5 行）

共 16 行新增，3 行删除。无其他文件变更。

## 未处理风险

无。本次变更为纯文档更新，不涉及代码逻辑修改。

## 推荐的下一步

无后续步骤。本次更新仅同步 AGENTS.md 文档以反映已实施的流水线结构变更。后续若有 Gate 序列或条件规则调整，应同步更新本文档。
