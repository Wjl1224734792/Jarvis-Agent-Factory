---
description: 同步项目文件——从 npm 模板同步最新指令/技能/智能体到项目 .claude/ 目录
argument-hint: [--dry-run 预览模式] [--force 强制覆盖自定义内容]
version: "3.47.2"
updated: "2026-05-14"
---

# 同步项目文件

从 `jarvis-agent-factory` npm 包的模板目录同步最新配置到当前项目的 `.claude/` 目录。

## 步骤 0：定位模板源

模板文件随 npm 包分发。按以下优先级定位：

1. **项目本地安装**（优先）：
   ```
   <项目根>/node_modules/jarvis-agent-factory/dist/src/templates/platforms/claude/
   ```

2. **全局安装**（本地未安装时）：
   执行 `npm root -g` 获取全局 node_modules 路径，拼接 `/jarvis-agent-factory/dist/src/templates/platforms/claude/`

3. **未找到**：输出以下提示并**停止**：
   ```
   未找到 jarvis-agent-factory 模板源。

   请先安装：
     npm install jarvis-agent-factory

   或全局安装后使用 jarvis CLI 同步：
     npm install -g jarvis-agent-factory
     jarvis init --yes
   ```

> 模板路径在 npm 包内（`node_modules/jarvis-agent-factory/dist/src/templates/`），不要使用项目仓库内的 `src/templates/` 路径。普通用户项目中没有该目录。

> 若项目已安装 `jarvis` CLI，可直接执行 `jarvis init --yes` 完成同步——该命令使用 SHA256 hash 三级对比和 Markdown section 级冲突标记，比手动比对更精确。执行后跳过以下手动步骤。

## 步骤 1：同步指令

从 `<模板源>/commands/` 同步到 `.claude/commands/`：

- 扫描模板 `commands/` 下所有 `.md` 文件
- 对每个模板文件：
  - 读取模板文件内容
  - 检查目标 `.claude/commands/<文件名>` 是否存在
  - **目标不存在** → 创建文件，写入模板内容
  - **目标存在、内容相同** → 无需操作
  - **目标存在、内容不同** → 默认跳过（视为用户已自定义）
- `--force` 模式：内容不同时以模板覆盖目标

## 步骤 2：同步技能

从 `<模板源>/skills/` 同步到 `.claude/skills/`：

- 扫描模板 `skills/` 下的子目录，每个子目录是一个技能
- 对每个技能目录，逐文件比对：
  - **目标不存在** → 递归创建整个技能目录
  - **目标存在** → 逐文件比对：
    - 模板有、目标无 → 新增文件
    - 模板有、目标有、内容相同 → 跳过
    - 模板有、目标有、内容不同 → 默认跳过（用户已自定义）
    - 目标有、模板无 → 跳过（用户自行添加的文件，不删除）

## 步骤 3：同步智能体

从 `<模板源>/agents/` 同步到 `.claude/agents/`（若模板中存在 `agents/` 目录）：

- 扫描模板 `agents/` 下所有 `.md` 文件
- 比较策略与步骤 1 相同
- 若模板中无 `agents/` 目录 → 跳过此步骤

## 跳过保护

以下情况**不做任何操作**：

- 目标文件已存在且内容与模板不同 → 视为用户自定义，**不覆盖**（`--force` 除外）
- 目标目录中存在但模板中不存在的文件/目录 → 视为用户自行添加，**不删除**
- 以下路径始终跳过：
  - `node_modules/`、`.git/`
  - `dist/`、`build/`、`.next/`（构建产物）
  - `docs/` 下含日期路径的子目录（`YYYY-MM-DD/`）
  - `*.log`、`.cache`、`.tmp`（临时文件）

## 同步策略

- **默认模式**：仅新增模板中存在但目标中不存在的文件，不覆盖任何已有文件
- **--dry-run 模式**：预览全部变更（新增/覆盖/跳过），不实际修改任何文件
- **--force 模式**：模板与目标内容不同时，以模板为准覆盖目标文件
- **保守删除**：不自动删除目标目录中的任何文件或目录

## 同步报告

完成后输出结构化报告：

```
=== 同步报告 ===

模板源: <绝对路径>
模式: 正常 / --dry-run / --force

【指令】(.claude/commands/)
  新增: N 个
    + <文件名1>
    + <文件名2>
  更新: N 个（--force 覆盖）
    ~ <文件名>
  跳过: N 个（用户已自定义）
    · <文件名>（目标存在且内容不同）
  一致: N 个（无需操作）

【技能】(.claude/skills/)
  新增: N  更新: N  跳过: N  一致: N
  （列出各分类下的具体技能名）

【智能体】(.claude/agents/)
  新增: N  更新: N  跳过: N  一致: N
  （若模板中无 agents 目录则显示"模板中无 agents 目录，已跳过"）

总计: 新增 N / 更新 N / 跳过 N / 一致 N
预览模式: 是 / 否
```

## 运行约束

- 所有文件操作使用绝对路径
- 文件对比需实际读取内容，禁止仅凭文件名或猜测判断
- `--dry-run` 模式下**不执行任何写操作**
- 不修改 `.claude/settings.json`、`.mcp.json` 等配置文件（这些由 `jarvis init` 统一管理）
- 路径分隔符使用 `/`（Unix 风格，跨平台兼容）
