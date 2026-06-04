---
description: AI 驱动的分层架构文档初始化——扫描目录树，并行 spawn AI agent 读取源码、理解架构、撰写含架构图和功能说明的 AGENTS.md
name: deepinit
argument-hint: "[--force | --quick]"
model: inherit
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Skill", "Agent", "mcp__jarvis-engine__session_join", "mcp__jarvis-engine__pipeline_guide", "mcp__jarvis-engine__gate_check", "mcp__jarvis-engine__advance_gate", "mcp__jarvis-engine__gate_enforce", "mcp__plugin_oh-my-claudecode_t__deepinit_manifest", "WebFetch", "WebSearch", "mcp__jarvis-engine__session_context", "mcp__jarvis-engine__jarvis_priority_context"]
---

# DeepInit — AI 驱动的分层架构文档初始化

扫描项目的完整目录树，为每个目录级联生成 AGENTS.md（AI agent 读代码 → 理解架构 → 撰写文档）和极简 CLAUDE.md（AI 入口）。

## 原则

- **AI 理解代码**：每个模块由 agent 读取该目录的全部源码后撰写，不做正则/模板填充
- **架构优先**：输出包含架构角色、关键抽象、功能说明，不只是文件列表
- **分层渐进**：从根到叶逐级生成，每层 CLAUDE.md 作为 AI 入口指向同层 AGENTS.md

## 可用代理路由

| 层级 | subagent_type |
|------|--------------|
| 架构设计 | `frontend-architect`、`backend-architect`、`mobile-architect` |
| 只读探索 | `code-explore-expert`、`external-resource-expert` |

## 执行

### Step 1: 加载技能 + 注册引擎

1. 加载基座技能：
   - `Skill("behavioral-guidelines")`
   - `Skill("using-agent-skills")`

2. 注册引擎会话（硬约束——引擎驱动全流程，不可绕过）：
   - `mcp__jarvis-engine__session_join({ platform: "claude", pipeline_type: "deepinit" })`
   - 在开始目录扫描前调用 `mcp__jarvis-engine__pipeline_guide()` 获取当前上下文

产物输出目录: `.jarvis/YYYY-MM-DD/deepinit/`

在开始项目发现前调用 `mcp__jarvis-engine__gate_check({ operation: "write_doc" })` 验证当前 Gate 条件。

### Step 2: 项目发现

**2.1 收集项目元信息**

读取以下文件（存在则读，不存在跳过）：
- `package.json` → 提取 name、description、scripts、dependencies、bin
- `tsconfig.json` → TypeScript 配置
- `README.md` → 项目整体说明

**2.2 扫描目录结构**

使用 Glob 发现所有目录（排除 `node_modules`、`.git`、`dist`、`build`、`.claude`、`.jarvis`、`.omc`、`coverage`、`__pycache__`、`.next`、`.nuxt`）。

**2.3 划分逻辑模块**

将目录树组织为若干逻辑模块：

| 规则 | 说明 |
|------|------|
| 根目录 | 配置类文件（package.json、tsconfig.json、*.config.*）作为一个模块 |
| 一级子目录 | `src/` 下的每个子目录各为一个模块（如 src/engine、src/web） |
| 合并小目录 | 源码文件 < 3 个的目录合并到父模块 |
| 拆分大目录 | 源码文件 > 20 个的目录按子目录拆分为多个模块 |
| 非源码目录 | 只有 Markdown/JSON/配置文件的目录合并到父模块 |

输出模块清单：

```
Module 1: 根配置 — package.json, tsconfig.json, *.config.*, README.md
Module 2: src/engine — <子目录数> 子目录, <文件数> 源文件
Module 3: src/cli   — <子目录数> 子目录, <文件数> 源文件
...
Module N: ...
```

### Step 3: 模块分析（并行 Agent）

为每个模块 spawn 一个只读分析 agent，**所有 agent 在同一条消息中并行启动**。

Agent 配置：
- `subagent_type`: 通用 agent（具备 Read、Glob、Grep、Bash 能力）
- `model`: `sonnet`（注重代码理解质量）
- 只读权限

**每个 Agent 的任务指令**（编排者为每个模块填充 `{{PLACEHOLDER}}`）：

```
你是项目架构分析专家。你的任务是深入理解一个模块的代码，输出结构化分析报告。

## 目标模块
- 目录: {{MODULE_DIR}}
- 文件清单: {{FILE_LIST}}

## 分析要求

1. 读取该目录内 ALL 源码文件（.ts/.tsx/.js/.jsx）
2. 对每个文件：
   - 理解它做了什么（不是列出导出，而是解释其职责）
   - 识别关键函数/类/类型及其用途
   - 追踪 import 理解模块间依赖关系
3. 汇总成模块级理解：
   - 模块目的（1-3 句话，解释该模块在项目中的角色）
   - 架构角色（它属于引擎核心？CLI 入口？Web 层？数据库层？工具集？）
   - 关键抽象（最重要的 3-10 个导出符号，每个标注类型和用途）
   - 关键文件（每个文件一句话描述其具体职责，不是 "Exports: xxx"）
   - 约定与模式（编码风格、错误处理、命名约定等）
   - 入口点（外部如何调用/初始化此模块）
   - 内部依赖（依赖项目中哪些其他模块）
   - 外部依赖（关键 npm 包）
   - AI Agent 指引（未来 agent 修改此模块时需要知道什么）

## 输出格式

以下格式输出你的分析结果。不要输出其他内容。

---MODULE_REPORT---
### 模块: {{MODULE_NAME}}

#### Purpose
{{1-3 句话}}

#### Architecture Role
{{引擎核心 / CLI 入口 / Web API / 共享工具 / 数据层 / ...}}

#### Key Abstractions
| Symbol | File | Kind | Description |
|--------|------|------|-------------|
| xxx | xxx.ts | function | 具体做什么 |
| ... | ... | class/type/const | ... |

#### Key Files
| File | Role | Description |
|------|------|-------------|
| xxx.ts | 核心引擎 | 负责 xxx |
| ... | ... | ... |

#### Conventions
- 具体约定（不是泛泛的 "use TypeScript"）

#### Entry Points
- **入口名称**: 描述

#### Internal Dependencies
{{逗号分隔的其他模块目录}}

#### External Dependencies
{{关键 npm 包，逗号分隔}}

#### For AI Agents
- 具体指引（不是泛泛的 "run tests"）
---END---
```

**并行 spawn 示例**：

```
第一条消息中同时发送：
Agent(module="根配置", prompt="你是项目架构分析专家...目标是: 根配置, 文件: package.json tsconfig.json ...")
Agent(module="src/engine", prompt="你是项目架构分析专家...目标是: src/engine, 文件: server.ts gates.ts db.ts ...")
Agent(module="src/cli", prompt="你是项目架构分析专家...目标是: src/cli, 文件: index.ts ...")
...
```

**失败处理**：Agent 超时/失败 → 重试一次。仍失败 → 编排者自己快速阅读该模块关键文件后产出简化分析（标记 `[SLIM]`）。

### Step 4: 文档写入

**4.1 写根 AGENTS.md**

汇总所有模块分析，撰写根 AGENTS.md：

```markdown
<!-- Generated: ISO时间戳 | Parent: (root) -->

# <项目名> — <一句话描述>

## 项目身份
<项目是什么、做什么用>

## 整体架构
<ASCII 架构图，展示模块间关系>
<模块地图表格：目录 | 职责 | 链接>

## 关键数据模型（如有）
<核心数据流/状态机/数据库模型>

## 技术栈
<框架、关键依赖>

## 入口点
<CLI / API / Web 等外部入口>

## 核心约定
<跨模块的通用约定>

## 给 AI Agent 的指引
<全局指引——读本文 → 深入各模块 AGENTS.md>

<!-- MANUAL:START -->
<!-- MANUAL:END -->
```

**重要**：Markdown 表格、代码块、链接语法正确。架构图使用 ASCII art。

**4.2 写各模块 AGENTS.md**

为每个有源码的目录写 AGENTS.md：

```markdown
<!-- Generated: ISO时间戳 -->
<!-- Parent: ../AGENTS.md -->

# <目录名>{{#有 purpose}} — {{purpose}}{{/有 purpose}}

{{#有架构说明}}
## Architecture
<该模块的架构说明：子系统关系、数据流、关键设计>
{{/有架构说明}}

## Role
<该模块在整体架构中的角色，来自 agent 分析>

## Key Abstractions
| Symbol | File | Kind | Description |
|--------|------|------|-------------|
<来自 agent 分析的关键抽象表>

## Files
| File | Role | Description |
|------|------|-------------|
<来自 agent 分析的关键文件表，description 必须是具体职责>

## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
<每个有 AGENTS.md 的子目录一行>

## Conventions
<来自 agent 分析的具体约定>

## Entry Points
<来自 agent 分析的入口点>

## For AI Agents
<来自 agent 分析的 AI 指引>

## Dependencies
- **Internal:** <内部依赖>
- **External:** <外部依赖>

<!-- MANUAL:START -->
<!-- MANUAL:END -->
```

**4.3 写 CLAUDE.md**

每个有 AGENTS.md 的目录，同级写 CLAUDE.md：

```markdown
# <目录名>

> AI 入口 → [AGENTS.md](./AGENTS.md)

父级参考: [../AGENTS.md](../AGENTS.md)
```

**4.4 保留手动内容**

如果目录已有 AGENTS.md：
- 检测 `<!-- Generated:` 标记 → 可覆盖，但先提取 `<!-- MANUAL:START -->...<!-- MANUAL:END -->`
- 没有 `<!-- Generated:` 标记 → 这是手写文档，跳过（除非 `--force`）

**4.5 空目录 / 无源码目录**

无源码文件（.ts/.tsx/.js）但含子目录 → 写精简 AGENTS.md（Key Files 省略，Subdirectories + 父级指向即可）。
无源码文件且无子目录 → 跳过，不写 AGENTS.md。

### Step 5: 验证

| 检查项 | 方式 | 修复 |
|--------|------|------|
| 目录覆盖 | 比对 Glob 目录列表 vs 生成的 AGENTS.md 列表 | 补充遗漏 |
| 父级引用 | 检查每个 `<!-- Parent: -->` 指向的文件是否存在 | 修正路径 |
| 章节完整性 | 抽样检查非空章节 | 标记 `<!-- TODO -->` |
| 链接有效性 | 检查 Subdirectories 表格中的链接 | 修正断链 |

输出验证摘要：

```
## 初始化完成

验证完成后：
- `mcp__jarvis-engine__gate_enforce` — 验证初始化完成条件
- 通过后 `mcp__jarvis-engine__advance_gate` — 推进到下一 Gate（或结束流水线）

---

## DeepInit 完成

| 指标 | 数据 |
|------|------|
| 目录扫描 | <N> |
| AGENTS.md 生成 | <M> |
| CLAUDE.md 生成 | <K> |
| AI 分析模块 | <X>（<Y> 并行） |
| 父级引用 | 全部可解析 / <Z> 个问题 |
| 手写文档保留 | <W> 个 |
```

## 红线

- 不能直接使用 `jarvis deepinit` CLI 代替 AI 分析——CLI 输出是文件索引，不符合架构文档标准
- 不能跳过模块分析（Step 3）直接写文档——每个模块必须有 agent 分析的产物作为输入
- 不能写 "Exports: xxx" 作为文件描述——必须解释文件的具体职责
- 不能有空白的 Architecture / Key Abstractions 表格——每行必须有实际内容
- 不能覆盖手工编写的 AGENTS.md（无 `<!-- Generated:` 标记的），除非 `--force`

## 加速模式（`--quick`）

`--quick` 模式下：
- 跳过非源码目录（只有 Markdown/配置文件的目录只写 CLAUDE.md）
- Agent 只分析一级模块（src/ 下的直接子目录），不分析更深层叶子目录
- 叶子目录写精简 AGENTS.md（仅 Key Abstractions + Key Files，无 Architecture/Role）
