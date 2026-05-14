# REQ-001: Jarvis 配置文件细粒度同步机制

> 版本：1.0 | 日期：2026-05-14 | 状态：draft

## 问题陈述

当前 `install.ts` 的 `mergeDir()` 采用**文件级全有或全无**策略：
- 源模板未变 → 跳过
- 用户未改目标文件 → 安全覆盖
- 用户改了目标文件 + 源模板也变了 → **完全跳过**，用户永远收不到模板更新

JSON 配置文件（MCP、settings.json）做到了键级合并（只增不删），但：
- 不支持**删除**过时的配置项
- Agent 模板文件（`.md`）没有**段级合并**能力

## 需求列表

---

### REQ-001: Frontmatter 版本追踪

**描述**：每个 Agent/Command/Skill 模板文件的 YAML frontmatter 中增加 `version` 和 `updated` 字段，用于追踪模板版本和最后更新时间。

**验收标准**：
- 所有 `src/templates/` 下的 `.md` 文件 frontmatter 包含 `version: "x.y.z"` 字段
- `jarvis upgrade` 时对比 frontmatter version 与已安装文件的版本
- 版本号使用 semver，遵循项目 package.json 版本节奏
- `jarvis diff` 能显示每个文件的版本差异

**关联**：REQ-002（段级合并依赖版本信息判断是否需合��）

---

### REQ-002: Section 级合并引擎

**描述**：对 Markdown 模板文件（Agent/Command/Skill），按 `## ` 二级标题分段，逐 section 对比 SHA256 hash，实现精准的部分更新。

**验收标准**：
- `mergeDir()` 新增 `mergeMarkdownSections()` 函数
- 每个 `## Section` 独立计算 hash 并记录到 `file-hashes.json`
- Section 合并规则：
  | 场景 | 行为 |
  |------|------|
  | 源 section 未变 | 保持目标不变 |
  | 目标 section = 旧源 section（用户未改此段） | 用新源 section 覆盖 |
  | 目标 section ≠ 旧源 section（用户改了此段）+ 源也变了 | 保留用户版本，**写入冲突标记**（REQ-003） |
- 不在任何 `##` section 内的内容（frontmatter、导言）只做整体 hash 对比

**关联**：REQ-001（版本号决定是否触发合并）、REQ-003（冲突处理）

---

### REQ-003: 冲突标记模式

**描述**：当用户修改的 section 与模板更新冲突时，不静默丢弃，而是在目标文件中插入标记让用户知晓并手动解决。

**验收标准**：
- 冲突格式：
  ```markdown
  <<<<<<< user (2026-04-15 修改)
  ## Section 名称
  用户修改的内容...
  =======
  ## Section 名称
  新模板的内容...
  >>>>>>> template v3.47.0
  ```
- `jarvis diff` 命令能列出所有存在冲突的文件
- 冲突文件在 engine 启动时输出警告（不阻塞）
- 冲突标记能通过 `jarvis resolve <file> --accept user|template` 命令自动解决

---

### REQ-004: JSON 配置字段级增删

**描述**：对 `.claude/settings.json`、`.mcp.json` 等 JSON 配置，从"只增不删"升级为"增删改全支持"。

**验收标准**：
- **新增字段**：模板有但目标没有的 → 添加
- **删除字段**：目标有但模板没有的（由版本升级主动移除）→ 删除
- **修改字段**：模板和目标都有但值不同 → 按类型处理：
  - 数组：合并去重
  - 对象：递归深度合并
  - 标量：用模板值覆盖（模板为权威源）
- **白名单保护**：`settings.local.json` 和 `settings.json` 中的 `permissions.allow.rules` 永不被删除
- `jarvis diff` 显示 JSON 配置的字段级变更（新增/删除/修改）

---

### REQ-005: `jarvis resolve` 命令

**描述**：新增 CLI 命令 `jarvis resolve` 用于交互式或自动化解决合并冲突。

**验收标准**：
- `jarvis resolve <file>` — 交互式选择接受用户版本或模板版本
- `jarvis resolve <file> --accept user` — 批量接受所有用户修改
- `jarvis resolve <file> --accept template` — 批量接受所有模板更新
- `jarvis resolve --all --accept template` — 一键接受所有冲突中模板侧
- 解决后自动清除冲突标记并更新 hash 记录

---

### REQ-006: 向后兼容与渐进升级

**描述**：现有已安装的模板文件（无 `version` frontmatter）能平滑过渡到新机制。

**验收标准**：
- 无 `version` frontmatter 的文件被视为 `version: "0.0.0"`（始终触发更新）
- 无 `file-hashes.json` 记录的文件按"新安装"处理
- 旧的全局级 `file-hashes.json` 格式兼容新的 section 级 hash 存储
- 新机制的首次运行不破坏用户现有定制
