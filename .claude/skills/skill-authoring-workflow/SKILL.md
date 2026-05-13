---
name: skill-authoring-workflow
description: 将原始PM内容转化为合规的、可发布的技能。用于在创建或更新仓库技能时保持标准不被破坏。
intent: >-
  无混乱地创建或更新PM技能。此工作流将粗略笔记、工作坊内容或半成品提示词转化为合规的 `skills/<skill-name>/SKILL.md` 资产，这些资产真正通过验证并属于此仓库。
type: workflow
best_for:
  - "从笔记或源材料创建新的仓库技能"
  - "在保持标准完整的同时更新现有技能"
  - "在提交前运行完整的写作与验证工作流"
scenarios:
  - "帮我把这些工作坊笔记转化为一个新的PM技能"
  - "我需要在不破坏仓库标准的情况下更新一个现有技能"
  - "在此仓库中编写新技能应使用什么工作流？"
---

## 目的

无混乱地创建或更新PM技能。此工作流将粗略笔记、工作坊内容或半成品提示词转化为合规的 `skills/<skill-name>/SKILL.md` 资产，这些资产真正通过验证并属于此仓库。

当你想要发布新技能而不是靠"看起来不错"碰运气时使用它。

## 核心概念

### 先自举

在发明定制流程之前使用仓库原生工具和标准：
- `scripts/find-a-skill.sh`
- `scripts/add-a-skill.sh`
- `scripts/build-a-skill.sh`
- `scripts/test-a-skill.sh`
- `scripts/check-skill-metadata.py`

### 选择正确的创建路径

- **引导式向导（`build-a-skill.sh`）**：当你有一个想法但没有最终文案时最佳。
- **内容优先生成器（`add-a-skill.sh`）**：当你已经有源内容时最佳。
- **手动编辑 + 验证**：用于打磨现有技能时最佳。

### 完成定义（无一例外）

技能只有在以下条件满足时才视为完成：
1. 前置元数据有效（`name`、`description`、`intent`、`type`）
2. 章节顺序合规
3. 元数据限制得到遵守（`name` <= 64字符，`description` <= 200字符）
4. 描述既说明了技能做什么又说明了何时使用它
5. Intent 承载更完整的面向仓库的总结，而不替代面向触发的描述
6. 交叉引用可解析
7. README 目录计数和表格已更新（如果添加/删除技能）

### 引导工作流的事实来源

当将此工作流作为引导式对话运行时应使用 [`workshop-facilitation`](../workshop-facilitation/SKILL.md) 作为交互协议。

它定义了：
- 会话开始提示 + 启动模式（引导、上下文倾倒、最佳推测）
- 用通俗语言的每次一问回合
- 进度标签（例如 Context Qx/8 和 Scoring Qx/5）
- 中断处理和暂停/恢复行为
- 决策点的编号推荐
- 常规问题的快速选择编号响应选项（在有用时包含 `Other (specify)`）

本文件定义工作流顺序和领域特定输出。如有冲突，遵循本文件的工作流逻辑。

## 应用

### 阶段1：预检（避免重复工作）

1. 搜索重叠的技能：

```bash
./scripts/find-a-skill.sh --keyword "<topic>"
```

2. 决定类型：
- **组件（Component）**：一个产出物/模板
- **交互式（Interactive）**：3-5个自适应问题 + 编号选项
- **工作流（Workflow）**：多阶段编排

### 阶段2：生成草稿

如果你有源材料：

```bash
./scripts/add-a-skill.sh research/your-framework.md
```

如果你想要引导式提示：

```bash
./scripts/build-a-skill.sh
```

### 阶段3：打磨技能

手动审查以下内容：
- 清晰的"何时使用"指导
- 一个具体示例
- 一个明确的反模式
- 无填充或模糊的顾问式语言

### 阶段4：严格验证

在考虑提交之前运行严格检查：

```bash
./scripts/test-a-skill.sh --skill <skill-name> --smoke
python3 scripts/check-skill-metadata.py skills/<skill-name>/SKILL.md
python3 scripts/check-skill-triggers.py skills/<skill-name>/SKILL.md --show-cases
```

### 阶段5：与仓库文档集成

如果这是新技能：
1. 将其添加到正确的 README 类别表格中
2. 更新技能总数和类别计数
3. 验证链接路径可解析

### 阶段6：可选打包

如果目标为 Claude 自定义技能上传：

```bash
./scripts/zip-a-skill.sh --skill <skill-name>
# 或打包一个类别：
./scripts/zip-a-skill.sh --type component --output dist/skill-zips
# 或使用一个精选的启动预设：
./scripts/zip-a-skill.sh --preset core-pm --output dist/skill-zips
```

## 示例

### 示例：将工作坊笔记转化为技能

输入：`research/pricing-workshop-notes.md`  
目标：新的交互式顾问

```bash
./scripts/add-a-skill.sh research/pricing-workshop-notes.md
./scripts/test-a-skill.sh --skill <new-skill-name> --smoke
python3 scripts/check-skill-metadata.py skills/<new-skill-name>/SKILL.md
```

预期结果：
- 新技能文件夹存在
- 技能通过结构和元数据检查
- README 目录条目已添加/更新

### 反模式示例

"我们写了一个很酷的技能，跳过了验证，忘记了 README 计数，但依然发布了。"

结果：
- 断裂的引用
- 不一致的目录数字
- 对贡献者和用户的困惑

## 常见陷阱

- 发布感觉，而非标准。
- 当任务实际上是组件模板时选择了 `workflow`。
- 臃肿的描述超出上传限制。
- 描述说了技能是什么但没有说 Claude 应该在何时触发它。
- 描述悄然触及200字符限制并在中间被截断。
- 让 `intent` 成为触发描述薄弱的替代品。
- 添加技能后忘记更新 README 计数。
- 将生成的输出视为最终结果而不审查。

## 参考资料

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/Building PM Skills.md`
- `docs/Add-a-Skill Utility Guide.md`
- Anthropic's [Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)
- `scripts/add-a-skill.sh`
- `scripts/build-a-skill.sh`
- `scripts/find-a-skill.sh`
- `scripts/test-a-skill.sh`
- `scripts/check-skill-metadata.py`
- `scripts/check-skill-triggers.py`
- `scripts/zip-a-skill.sh`
