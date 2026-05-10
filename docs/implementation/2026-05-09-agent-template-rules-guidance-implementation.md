# TASK-009：智能体模板增加 .{platform}/rules/* 读取指引

## 1. 当前实现目标

在所有三个平台（Claude / OpenCode / Codex）的智能体模板 system prompt 中追加 `.{platform}/rules/*.md` 读取指引，确保智能体启动时自动加载平台级编码规范。

## 2. 对应需求 ID / 任务 ID

- 需求 ID：TASK-009
- 关联：上游编排者直接分配的后端子任务

## 3. 输入依据

- 任务分配文档（TASK-009）
- 现有模板结构（源码驱动开发下已全面读取）
- 项目章程：CLAUDE.md、AGENTS.md、通用编程规范与指南

## 4. 变更文件 / 变更范围

### 4.1 Claude 平台（53 个文件）

路径：`src/templates/platforms/claude/agents/*.md`

每个文件在正文开头（frontmatter 之后、第一个 `## ` 段落之前）新增 `## 必读规范` 段落：

```markdown
## 必读规范
开始任何分析、规划、审查或实现前，必须先读取任务范围内的根 `AGENTS.md`、`CLAUDE.md` 和相关子目录 `AGENTS.md`。若这些文件不存在，继续执行并在输出中说明缺失的规范文件。

此外必须读取 `.claude/rules/*.md` — 平台级编码规范。
```

### 4.2 OpenCode 平台（58 个文件）

路径：`src/templates/platforms/opencode/agents/*.md`

在正文开头新增 `## 必读规范` 段落：

```markdown
## 必读规范
开始任何分析、规划、审查或实现前，必须先读取任务范围内的根 `AGENTS.md` 和相关子目录 `AGENTS.md`。若这些文件不存在，继续执行并在输出中说明缺失的规范文件。

此外必须读取 `.opencode/rules/*.md` — 平台级编码规范。
```

> 注意：`test-doc-writer.md` 已有 `## 必读规范` 段落，仅追加 rules 行。

### 4.3 Codex 平台（46 个文件）

路径：`src/templates/platforms/codex/agents/*.toml`

**含 `## 必读规范` 段落的文件（32 个）**：在 AGENTS.md 引用行后追加：

```toml
此外必须读取 `.codex/rules/*.md` — 平台级编码规范。
```

**不含该段落的简单 worker（14 个）**：在 `developer_instructions` 末尾追加 rules 行并补全闭合 `"""`：

```toml
此外必须读取 `.codex/rules/*.md` — 平台级编码规范。
"""
```

> 注意：原 14 个简单 worker 模板缺少闭合 `"""`，本次一并修复。

## 5. 实现说明

### 5.1 实现策略

采用三阶段批处理方案处理 157 个模板文件：

1. **第一阶段**：处理标准结构模板（含 `## 工作流编排位置` 的 Pattern A 及含 `# XXX智能体` 的 Pattern B）
2. **第二阶段**：处理特殊结构模板（无 `## 工作流编排位置` 的专项 worker、生命周期模板、primary agent 模板）
3. **第三阶段**：修复 Codex 简单 worker 模板（原文件缺少闭合 `"""` 导致首批处理位置错误）

### 5.2 幂等性保证

所有批处理脚本内建幂等检查：
- 检测 `rules/*.md`（Claude/OpenCode）或 `.codex/rules`（Codex）是否已存在于文件内容中
- 已包含的自动跳过，确保可反复安全运行

### 5.3 边界情况处理

| 情况 | 处理方式 |
|------|---------|
| UTF-8 BOM 文件（6 个 OpenCode 文件） | 剥离 BOM 后正常处理 |
| 缺少闭合 `"""` 的 TOML 文件（14 个 Codex 文件） | 追加 rules 行并补全闭合 `"""` |
| AGENTS.md 引用文本变体（"开始任何分析前" vs "开始任何分析、规划、审查或实现前"） | 使用灵活正则匹配 |
| 多种段落首标题（`## 工作流编排位置` / `## 你的职责` / `## 核心原则` / `## 角色定位`） | 统一在第一个 `## ` 段落前插入 |
| Windows CRLF 行尾 | 统一规范化为 LF 后处理 |

## 6. 测试和验证结果

### 6.1 覆盖率验证

| 平台 | 总文件数 | 含 rules 文件数 | 覆盖率 |
|------|---------|---------------|--------|
| Claude | 53 | 53 | 100% |
| OpenCode | 58 | 58 | 100% |
| Codex | 46 | 46 | 100% |
| **合计** | **157** | **157** | **100%** |

### 6.2 内容校验

- **Claude**：`grep -c 'rules/\*\.md'` → 53 处匹配（每个文件 1 处）
- **OpenCode**：`grep -c 'rules/\*\.md'` → 58 处匹配（每个文件 1 处）
- **Codex**：`grep -c '\.codex/rules'` → 46 处匹配（每个文件 1 处）

### 6.3 手动抽查

随机检查了以下文件，内容正确：
- `claude/agents/backend-dev-expert.md` — rules 在 `## 必读规范` 内，位于 `## 工作流编排位置` 前
- `claude/agents/android-state-expert.md` — rules 在 `## 必读规范` 内，位于 `## 你的职责` 前
- `opencode/agents/android.md` — rules 在 `## 必读规范` 内，位于 `## 会话启动` 前
- `codex/agents/backend_architect.toml` — rules 在 AGENTS.md 引用行后
- `codex/agents/android_state_worker.toml` — rules 在 developer_instructions 末尾，`"""` 闭合正确

### 6.4 幂等性验证

重复运行任一处理脚本，所有文件均被正确跳过（"already has rules"）。

## 7. 数据与接口边界

- **无新增依赖**：不引入新的 npm 包、数据库表、API 端点
- **无共享契约变更**：模板是独立静态文件，不影响运行时契约
- **无破坏性变更**：所有修改均为文件内追加，不删除或重排原有内容
- **代码格式兼容**：Codex TOML 文件补全闭合 `"""` 后变为合法 TOML

## 8. 风险 / 未解决项

| 风险 | 等级 | 说明 |
|------|------|------|
| Codex 简单 worker 原文件缺少闭合 `"""` | 低 | 本次已修复，且原文件在之前环境中可正常工作（解析器容错） |
| 模板内容未来变更可能覆盖 rules 行 | 低 | 正常维护风险，rules 行作为模板的一部分已融入 |
| 新增"必读规范"段落可能影响 agent 上下文长度 | 极低 | 增加约 120 字符，对上下文窗口影响可忽略 |

## 9. 需要前端配合的点

无需前端配合。本任务纯粹修改后端模板静态文件。

## 10. 推荐的下一步

1. 若后续新增智能体模板，应确保模板生成器自动包含此 `## 必读规范` 段落
2. 建议在 CI/CD 中增加模板规范检查：lint 规则确认所有 agent 模板包含对应的 `rules/*.md` 引用
3. 建议检查 `src/templates/` 下的其他非 agent 模板（如 skills 目录）是否也需要类似的规范加载指引
