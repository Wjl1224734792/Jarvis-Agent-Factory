---
name: skill-flow
description: 会话流程导出 — 将当前会话的流水线流程（Gate序列+Agent spawn+产物）导出为可复用的 Skill 模板
model: inherit
argument-hint: "[子命令: export|save|list|apply] [名称]"
tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write", "Skill", "mcp__jarvis-engine__session_export", "mcp__jarvis-engine__flow_skill_save", "mcp__jarvis-engine__flow_skill_list", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__gate_jump", "mcp__jarvis-engine__gate_enforce", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__report_status"]
---

# /skill-flow — 会话流程 Skill 化

将当前会话的流水线流程导出为可复用的 Skill 模板。
生成的 Skill 包含完整 Gate 序列、Agent spawn 配置、Skill 加载清单，可作为独立指令复用。

## 步骤 0：加载技能 + 注册引擎

```
Skill("behavioral-guidelines")

mcp__jarvis-engine__session_join({
  platform: "claude",
  pipeline_type: "auto",
  task_name: "[skill-flow] " + (用户输入 || "流程导出")
})

使用 mcp__jarvis-engine__gate_jump({ gate: "Gate C-impl" })
```

产物输出目录: `.jarvis/YYYY-MM-DD/skills/`

### 步骤 0：并行信息收集（同一消息同时发出）
Agent(code-explore-expert, "扫描项目的 .jarvis/ 目录和 skills/ 目录，收集现有的 Skill 模板、会话归档记录和流水线运行历史")

## 步骤 2：识别子命令

从用户输入解析子命令：

| 子命令 | 说明 | 示例 |
|--------|------|------|
| `export` | 导出当前会话的流程数据（JSON） | `/skill-flow export` |
| `save <名称>` | 导出并保存为 Skill 模板 | `/skill-flow save my-release` |
| `list` | 列出所有已保存的流程 Skill | `/skill-flow list` |
| `apply <名称>` | 将已保存的 Skill 模板应用到当前会话 | `/skill-flow apply my-release` |

## 步骤 3：执行操作

### 2a. export — 导出当前会话流程

```
mcp__jarvis-engine__session_export({})
```

从返回结果提取关键信息，展示给用户：
- 流水线类型和名称
- Gate 序列（已完成/总数）
- Agent spawn 记录
- 产物清单
- 时间线事件

### 2b. save — 导出并保存

```
1. 先执行 session_export 获取流程数据
2. 调用 flow_skill_save：
   mcp__jarvis-engine__flow_skill_save({
     name: "<用户指定名称>",
     description: "<自动生成的描述>",
     pipeline_type: "<从导出数据提取>",
     gate_sequence: "<Gate序列JSON>",
     agent_spawns: "<Agent记录JSON>",
     skill_loads: "<Skill加载JSON>"
   })
3. 将保存的 Skill 输出为 .md 文件到 .jarvis/YYYY-MM-DD/skills/flow-<名称>/SKILL.md
4. 产出：可复用的 Skill 模板文件
```

生成的 Skill 模板结构：
```markdown
---
name: flow-<名称>
description: 从会话流程导出的可复用 Skill — <流水线类型>
---

# <名称> 流水线流程

## 来源
- 导出时间：<时间戳>
- 来源会话：<session_id>
- 流水线类型：<pipeline_type>

## Gate 序列
<gate_sequence 表格>

## 每 Gate 操作指引
<从导出的 artifacts/events 生成>

## Agent spawn 配置
<agent_spawns 清单>

## Skill 加载清单
<skill_loads 清单>
```

### 2c. list — 列出已保存

```
mcp__jarvis-engine__flow_skill_list({})
```

展示已保存的所有流程 Skill 模板（名称/流水线类型/创建时间）。

### 2d. apply — 应用已保存流程

```
1. 从 flow_skill_list 中找到目标 Skill
2. 读取 Skill 的 gate_sequence，与当前会话对比
3. 如果当前会话 Gate 进度匹配，加载对应的 Skill 和 Agent 配置
4. 报告匹配状态和建议操作
```

## 步骤 4：产出

| 子命令 | 产出 |
|--------|------|
| `export` | 控制台输出完整的流程 JSON 摘要 |
| `save` | `.jarvis/YYYY-MM-DD/skills/flow-<名称>/SKILL.md` 文件 |
| `list` | 已保存 Skill 列表 + 统计 |
| `apply` | 加载指示 + Gate 对齐建议 |

## Gate 协议

**每个 Gate 完成后**调用 `mcp__jarvis-engine__gate_enforce` 验证条件，通过后 `mcp__jarvis-engine__advance_gate` 推进。

## 红线约束

1. **export 为只读操作** — 不修改任何文件
2. **save 写入 .jarvis/YYYY-MM-DD/skills/ 目录** — 不影响源码和模板
3. **flow_skill 名称仅含 [a-z0-9_-]** — 防止路径穿越
4. **agent_spawns/skill_loads 使用 JSON 格式** — 结构化存储
5. **生成的 Skill 遵循 AGENTS.md 约束** — 包含完整 Gate 序列和 Skill 加载清单
