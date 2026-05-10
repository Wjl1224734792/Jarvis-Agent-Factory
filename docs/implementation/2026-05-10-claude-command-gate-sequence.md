# Claude Code Command 文件更新

## 修复目标

更新 Jarvis 流水线 Gate 序列，明确区分流水线入口 Command 与方案讨论 Command。

## 对应 task ID

任务：更新 Claude Code Command 文件

## 变更文件 / 变更范围

以下 7 个文件均位于 `E:\CodeStore\jarvis\src\templates\platforms\claude\commands\`：

### A组：方案讨论 Command（3 个文件）

| 文件 | 变更 |
|------|------|
| `frontend-architect.md` | frontmatter 后添加说明行 |
| `backend-architect.md` | frontmatter 后添加说明行 |
| `algorithm-expert.md` | frontmatter 后添加说明行 |

### B组：流水线入口 Command（4 个文件）

| 文件 | 变更内容 |
|------|---------|
| `jarvis.md` | Gate 序列 8道→10道；更新 advance_gate 目标；更新子节标题 |
| `jarvis-lite.md` | 对比表中的 Gate 序列更新 |
| `frontend.md` | Gate 序列 8道→10道；描述文本更新 |
| `backend.md` | Gate 序列 7道→9道；描述文本更新 |

## 修复说明

### A组：方案讨论 Command 添加说明行

三个架构/专家 Command 在 frontmatter 后的第一行添加引用说明，明确其仅用于方案讨论与技术咨询，不参与流水线编排。流水线中架构评审由编排者在 Gate B1 自动 spawn 对应 Agent。

- `frontend-architect.md`：前缀含"前端架构"
- `backend-architect.md`：前缀含"后端架构"
- `algorithm-expert.md`：前缀含"算法方案"

### B组：流水线入口 Command Gate 序列更新

新 Gate 序列：**A → B → B1 → C → C-impl → C1 → C1.5 → C2 → D → E**（10 道）

核心变更：
- **新增 Gate B1**：架构评审（条件性），从原有的"Gate B→C 之间：架构评审"升级为独立 Gate
- **新增 Gate C-impl**：批量并行实现，从原有的"Gate C 执行"子节升级为独立 Gate
- **advance_gate 链调整**：
  - B → B1（原 B → C）
  - C → C-impl（原 C → C1）
  - 其他不变

各文件具体变更：

**jarvis.md**（6 处变更）：
1. 初始化步骤：`Gate C` → `Gate C-impl`
2. Gate 序列定义：`8 道闸门` → `10 道闸门`
3. Gate B advance：`advance_gate({ gate: "Gate C" })` → `advance_gate({ gate: "Gate B1" })`
4. 架构评审 section：`## Gate B→C 之间` → `## Gate B1`
5. Gate C advance：`advance_gate({ gate: "Gate C1" })` → `advance_gate({ gate: "Gate C-impl" })`
6. 实现子节：`## Gate C 执行：批量并行 spawn 实现 Agent` → `## Gate C-impl：批量并行实现`

**jarvis-lite.md**（1 处变更）：
7. 对比表：Gate 序列 `A→B→C→...` → `A→B→B1→C→C-impl→...`

**frontend.md**（2 处变更）：
8. Gate 序列：`8 道闸门` → `10 道闸门`
9. 描述文本：补充 `B1 架构评审（条件性）` 和 `C-impl 批量实现`

**backend.md**（2 处变更）：
10. Gate 序列：`7 道闸门` → `9 道闸门`，保持跳过 C1.5
11. 描述文本：补充 `B1 架构评审（条件性）` 和 `C-impl 批量实现`

## 验证命令与结果

```bash
git diff -- src/templates/platforms/claude/commands/
```

验证结果：
- 7 个文件共 14 处变更，全部在授权范围内
- A组：3 个文件各增加 1 行说明
- B组：4 个文件的 Gate 序列引用全部更新
- 无 frontmatter 被修改
- 无不在指定路径的文件被修改

## 未处理风险

- `src/engine/gates.ts` 存在由并行改动产生的 Gate 序列更新，与本次任务无关，未做审查或回滚
- Gate B1 section 在 jarvis.md 中无显式 `advance_gate` 调用（因架构评审为条件性 Gate），引擎层应处理跳过逻辑

## 推荐的下一步

1. 验证 `src/engine/gates.ts` 的同步修改是否完整且正确
2. 确认引擎层（`mcp__jarvis-engine__`）已实现 Gate B1 和 Gate C-impl 的跳过/执行逻辑
3. 如有其他 Command 文件（如 `review.md`、`review-fix.md` 等）引用原 8 道 Gate 序列，一并更新
