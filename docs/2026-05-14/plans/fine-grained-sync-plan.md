# 执行计划：Jarvis 配置文件细粒度同步机制

> 需求文档：`docs/2026-05-14/requirements/fine-grained-sync.md`
> 任务文档：`docs/2026-05-14/tasks/fine-grained-sync-tasks.md`
> 版本：1.0 | 日期：2026-05-14 | 类型：工具链改进

---

## 1. 当前轮次目标

实现 Jarvis 模板/配置文件的细粒度同步机制：Markdown 模板文件支持 section 级合并与冲突标记，JSON 配置支持字段级增删改，新增 `jarvis resolve` 冲突解决命令，并增强 `jarvis diff` 展示粒度。

---

## 2. 当前轮次范围

| 维度 | 说明 |
|------|------|
| 覆盖 REQ | REQ-001 ~ REQ-006（全部 6 个需求） |
| 覆盖 TASK | TASK-001 ~ TASK-006（全部 6 个任务） |
| 核心文件 | `src/install.ts`, `src/cli/commands/diff.ts`, `src/cli/commands/resolve.ts`(新建), `src/cli/index.ts`, `src/engine/server.ts`, `src/shared/mcp-config.ts`, `src/templates/**/*.md` |
| 预计总变更行数 | ~680 行（在 1000 行安全阈值内） |
| 轮次数 | 单轮 |
| 测试策略 | 全部 manual_only（工具链改进，手动功能验证） |

---

## 3. 完成标准

1. 所有 125 个模板 `.md` 文件 frontmatter 包含 `version` 和 `updated` 字段
2. `mergeDir()` 对 markdown 文件执行 section 级合并（三规则：未变保持 / 安全覆盖 / 冲突标记）
3. JSON 配置（MCP、settings.json）支持增删改全操作，白名单保护生效
4. `jarvis diff` 展示版本差异、section 差异、JSON 字段差异、冲突文件列表
5. `jarvis resolve` 命令支持交互式和批量模式
6. 旧版安装目录（无 `version` frontmatter、无 `file-hashes.json`）平滑升级无破坏
7. `lint && typecheck && build && test` 全部通过

---

## 4. Gate B 校验结果

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 任务 ID 格式 (TASK-XXX) | 通过 | TASK-001 ~ TASK-006 |
| REQ→TASK 映射完整 | 通过 | 每个 TASK 至少映射 1 个 REQ |
| 类型完整 | 通过 | 全部 direct（工具链改进） |
| 优先级/完成标准完整 | 通过 | 每个 TASK 有完整验收标准 |
| DDD/TDD 分类完整 | 通过 | 全部 direct，无 DDD 分类 |
| 风险任务已标注 | 通过 | TASK-002 中风险、TASK-003 高风险 |
| 文件所有权已写明 | 通过 | 所有权矩阵完整 |
| 垂直切片检查 | 通过 | 每个 TASK 交付完整可测试的端到端能力 |

---

## 5. 是否需要先查阅 code-explore-expert

否。代码结构已通过 planner 直接读取验证：
- `src/install.ts` 函数布局已确认：`installHooks()`(L82)、`installMcp()`(L192)、`fileHash()`(L315)、`loadHashes()`(L324)、`saveHashes()`(L334)、`mergeDir()`(L351)
- `src/cli/commands/diff.ts` 当前为文件级 hash 对比
- `src/engine/server.ts` 的 `startEngine()`(L94) 为冲突扫描注入点
- 模板文件当前 frontmatter 无 `version`/`updated` 字段

---

## 6. 执行代理分工

| TASK | 代理类型 | 理由 |
|------|----------|------|
| TASK-001 | backend-dev-expert | 安装脚本逻辑 + 模板文件批量修改 |
| TASK-002 | backend-dev-expert | Markdown 解析 + hash 计算基础设施 |
| TASK-003 | backend-dev-expert | mergeDir 核心逻辑 + 引擎启动扫描 |
| TASK-004 | backend-dev-expert | JSON 配置合并策略升级 |
| TASK-005 | backend-dev-expert | CLI diff 命令输出增强 |
| TASK-006 | backend-dev-expert | 新建 CLI resolve 命令 |

---

## 7. 共享区域改动归属

### 7.1 唯一责任方分配

| 共享区域 | 唯一责任方 | 说明 |
|---------|-----------|------|
| `src/install.ts` — `mergeDir()` 区域 (L351-394) | TASK-001 → TASK-002 → TASK-003 （串行） | 三任务在同一区域叠加修改，严格顺序执行 |
| `src/install.ts` — `installMcp()`/`installHooks()` (L82, L192) | TASK-004 | 独立于 mergeDir 区域，无代码重叠 |
| `src/install.ts` — `loadHashes()`/`saveHashes()` (L324-338) | TASK-002 | hash 格式扩展的写入点 |
| `src/cli/commands/diff.ts` | TASK-005 | 仅此任务修改 |
| `src/cli/commands/resolve.ts` (新建) | TASK-006 | 仅此任务修改 |
| `src/cli/index.ts` — `COMMANDS` 字典 | TASK-006 | 仅 1 行注册变更 |
| `src/engine/server.ts` | TASK-003 | `startEngine()` 中 ~10 行冲突扫描 |
| `src/shared/mcp-config.ts` | TASK-004 | 按需更新类型签名 |
| `src/templates/**/*.md` | TASK-001 | 仅此任务修改模板 frontmatter |

### 7.2 共享文件冲突管控

**核心风险：`src/install.ts` 被 4 个任务修改。**

| 冲突场景 | 涉及函数 | 管控策略 |
|---------|---------|---------|
| TASK-001 vs TASK-004 | 不同函数区域（mergeDir vs installMcp/installHooks） | 同文件不同区域；Batch 内顺序执行（TASK-001 先行，TASK-004 后行），确保后者读取前者提交后的文件状态 |
| TASK-002 vs TASK-004 | 不同函数区域（新增工具函数 vs installMcp/installHooks） | 同文件不同区域；TASK-004 需要在 TASK-002 提交后读取其新增的辅助函数，避免覆盖 |
| TASK-003 vs TASK-004 | 同文件（mergeMarkdownSections + mergeDir 分支 vs installMcp/installHooks） | 同文件不同区域；TASK-004 若在 Batch 2 已完成则可跳过 |

**原则**：任何实现代理在修改 `src/install.ts` 前，必须先通过 `git log --oneline -5` 确认最新提交状态，确保基于最新版本进行修改。

---

## 8. 并行 / 串行策略

### 8.1 依赖链全貌

```
TASK-001 ──→ TASK-002 ──→ TASK-003 ──→ TASK-006
                 │              │
                 │              └──→ (TASK-005 需要冲突格式定义)
                 │
                 └──→ TASK-005（需要 section hash 格式 + diffJsonConfig）

TASK-004 ───────────────────→ TASK-005（需要 JSON diff 能力）
```

### 8.2 关键路径

**串行关键路径**（4 步）：TASK-001 → TASK-002 → TASK-003 → TASK-006
- 每步 ≤ 160 行，总关键路径 ~ 470 行

### 8.3 并行机会

| 并行对 | 阶段 | 共享文件冲突？ | 可行？ |
|--------|------|---------------|--------|
| TASK-001 ∥ TASK-004 | Batch 1 | 同文件（install.ts），但非重叠区域 | 是（见下方管控措施） |
| TASK-002 ∥ TASK-004 | Batch 2 | 同文件（install.ts），但非重叠区域 | 是（TASK-004 若完成，Batch 2 仅 TASK-002） |
| TASK-005 ∥ TASK-006 | Batch 4 | 无（不同文件） | 是（完全并行） |

---

## 9. 风险提醒

### 9.1 高风险：TASK-003（合并引擎 + 冲突标记）

| 维度 | 评估 |
|------|------|
| 变更规模 | ~160 行，触及 `mergeDir()` 核心分支 |
| 失败后果 | 用户定制内容被覆盖或模板更新静默丢弃 |
| 缓解措施 | ① TASK-001 + TASK-002 先行交付基础函数；② 验证时用 git 备份的安装目录做前后 diff 对比 |
| 回滚方案 | `git revert` 该 commit，mergeDir 回退到文件级逻辑 |

### 9.2 中风险：TASK-002（Section 级 Hash 基础设施）

| 维度 | 评估 |
|------|------|
| 变更规模 | ~120 行 |
| 失败后果 | hash 格式不兼容 → 全量覆盖用户文件 |
| 缓解措施 | 双格式兼容（`_v` 字段区分），`loadHashes()` 接口不变 |

### 9.3 中风险：同文件并行编辑

| 风险 | TASK-001/004 和 TASK-002/004 均需修改 `src/install.ts` |
|------|------|
| 后果 | 后写入的 Agent 可能覆盖前者的变更 |
| 缓解措施 | Batch 内任务不真正并行——按 TASK-001 → TASK-004 内部顺序执行；每个 Agent 开始前通过 `git log` 确认基础版本 |

---

## 10. 实现者交接信息

1. **TASK-001 完成后**：告知 TASK-002/004 的 Agent `readFrontmatter()` 的函数签名（`readFrontmatter(filePath: string): { version?: string, updated?: string }`）和插入位置
2. **TASK-002 完成后**：告知 TASK-003/005 的 Agent `splitMarkdownSections()` 返回结构、`computeSectionHashes()` 签名、`_v: 2` 格式的 hash 记录结构
3. **TASK-004 完成后**：告知 TASK-005 的 Agent `diffJsonConfig()` 的调用位置和依赖的函数
4. **TASK-003 完成后**：告知 TASK-006 的 Agent 冲突标记的精确正则模式（`<<<<<<< user ... ======= ... >>>>>>> template`）

---

## 11. Execution Packets

---

### task_id: TASK-001
### task_name: 模板 Frontmatter 版本追踪
### requirement_ids: REQ-001, REQ-006
### owner: backend-dev-expert
### objective: 为所有模板 markdown 文件添加 frontmatter 版本字段，并在 mergeDir 中集成版本读取逻辑。
### in_scope:
- 125 个 `src/templates/platforms/claude/{agents,commands,skills}/**/*.md` 文件的 YAML frontmatter 新增 `version: "3.45.8"` 和 `updated: "2026-05-14"` 字段
- `src/install.ts` 新增 `readFrontmatter(filePath)` 工具函数：解析 YAML frontmatter，返回 `{ version, updated, ...rest }`
- `mergeDir()` 的 `else if (!oldHash || destHash === oldHash)` 分支（安全覆盖）增加 frontmatter 版本更新逻辑
- 无 `version` 字段的文件视为 `"0.0.0"`（REQ-006 向后兼容）
### out_of_scope:
- 不修改 mergeDir 的跳过逻辑（`else` 分支——用户已修改 → 保留），该部分由 TASK-003 处理
- 不修改 section 级 hash 计算
- 不修改 installMcp / installHooks
### input_documents: docs/2026-05-14/requirements/fine-grained-sync.md, docs/2026-05-14/tasks/fine-grained-sync-tasks.md
### allowed_paths:
- `src/templates/platforms/claude/agents/*.md`
- `src/templates/platforms/claude/commands/*.md`
- `src/templates/platforms/claude/skills/*/SKILL.md`
- `src/install.ts`（仅新增 `readFrontmatter()` 和修改 `mergeDir()` 安全覆盖分支）
### forbidden_paths:
- `src/cli/commands/*`（所有 CLI 命令文件）
- `src/engine/*`
- `src/shared/*`
- `src/install.ts` 中 `installMcp()`、`installHooks()`、`writeMcpJson()` 函数
### dependencies:
- 无外部依赖。需要从 `package.json` 读取当前版本号 `3.45.8`
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-004（逻辑无关，但共享 install.ts 文件——执行时 TASK-001 先行，TASK-004 在其提交后读取）
### wait_for: []
### acceptance_criteria:
1. 随机抽查 3 个模板文件确认 frontmatter 含 `version: "3.45.8"` 和 `updated: "2026-05-14"`
2. `readFrontmatter()` 正确解析 YAML frontmatter，返回 `{ version, updated }`（缺少字段时默认 `version: "0.0.0"`）
3. 运行 `jarvis init` 新安装 → 目标文件 frontmatter version 被正确写入
4. 模拟旧版安装目录（目标文件无 version frontmatter）→ `jarvis upgrade` 识别为 `0.0.0` 并触发全量更新
5. `lint && typecheck && build` 通过
### test_strategy: manual_only
### handoff_notes:
- `readFrontmatter()` 导出给 TASK-002/003 复用。签名需与 TASK-002 中的 `splitMarkdownSections()` 协作——两者都读取 markdown 文件。
- 模板文件 125 个，建议用脚本批量处理而非手动逐个编辑。
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

---

### task_id: TASK-002
### task_name: Section 级 Hash 基础设施
### requirement_ids: REQ-002, REQ-006
### owner: backend-dev-expert
### objective: 实现 markdown 文件的 section 级分割和 SHA256 hash 计算，扩展 file-hashes.json 为向下兼容的双格式。
### in_scope:
- `src/install.ts` 新增 `splitMarkdownSections(content)` 函数：
  - 输入：markdown 文件原始内容字符串
  - 输出：`{ frontmatterLineCount: number, sections: { title: string, content: string, hash: string }[] }`
  - 按 `## ` 二级标题分割；非 section 内容（frontmatter + 导言）作为独立 "preamble" 区块
  - 空文件返回 `sections: []`
- `src/install.ts` 新增 `computeSectionHashes(filePath)` 函数：
  - 调用 `splitMarkdownSections()` 后逐 section 计算 SHA256
  - 返回 `{ preamble: string, sections: Record<title, hash> }`
- `saveHashes()` 扩展：对 markdown 文件存入 `{ "_v": 2, "preamble": "<hash>", "sections": {...} }` 格式
- `loadHashes()` 保持不变——调用方自行通过 `_v` 字段判断新旧格式
- 向后兼容：无 `_v` 的记录视为旧格式（文件级 hash）；无历史记录的文件按"新安装"处理
### out_of_scope:
- 不实现 section 合并逻辑（TASK-003 负责）
- 不修改 mergeDir 调用链
- 不涉及 installMcp/installHooks
### input_documents: docs/2026-05-14/requirements/fine-grained-sync.md, docs/2026-05-14/tasks/fine-grained-sync-tasks.md
### allowed_paths:
- `src/install.ts`（新增 `splitMarkdownSections()`, `computeSectionHashes()`；修改 `saveHashes()` 写入逻辑）
### forbidden_paths:
- `src/install.ts` 中 `mergeDir()` 主体逻辑、`installMcp()`、`installHooks()`、`install()`、`readFrontmatter()`（TASK-001 产物，可调用但不可修改）
- `src/cli/*`
- `src/engine/*`
- `src/hash-paths.ts`（路径解析逻辑不变）
### dependencies:
- TASK-001 产出的 `readFrontmatter(filePath)` 函数（用于判断文件是否为 markdown 并获取 frontmatter 行数）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []
### wait_for: TASK-001
### acceptance_criteria:
1. 用真实模板文件（如 `backend-dev-expert.md`）测试 `splitMarkdownSections()`——正确分割各 `##` section，preamble 不含 section 内容
2. `computeSectionHashes()` 返回的 hash 在内容不变时稳定一致
3. 新安装后 `file-hashes.json` 中 markdown 文件条目为 `_v: 2` 格式
4. 旧格式 `file-hashes.json`（无 `_v` 字段）被正确识别为文件级 hash，不做 section 拆分
5. `lint && typecheck && build` 通过
### test_strategy: manual_only
### handoff_notes:
- `splitMarkdownSections()` 和 `computeSectionHashes()` 的返回结构是 TASK-003（mergeMarkdownSections）和 TASK-005（diff section 展示）的关键输入。
- `saveHashes()` 的格式变更必须不影响非 markdown 文件的旧格式记录。
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

---

### task_id: TASK-003
### task_name: Section 级合并引擎 + 冲突标记
### requirement_ids: REQ-002, REQ-003
### owner: backend-dev-expert
### objective: 实现 `mergeMarkdownSections()` 函数，按三规则表格执行 section 级合并，冲突时写入标准冲突标记。同时修改 `mergeDir()` 和 `startEngine()` 集成冲突检测。
### in_scope:
- `src/install.ts` 新增 `mergeMarkdownSections(srcPath, destPath, hashRecord)` 函数：
  - 三规则合并表格：
    | 场景 | 行为 |
    |------|------|
    | 源 section hash == 记录 hash | 保持目标 section 不变 |
    | 记录不存在 或 目标 section hash == 旧记录 hash | 用新源 section 覆盖 |
    | 目标 section hash != 旧记录 hash 且源也变了 | 保留用户内容，写入冲突标记 |
  - 返回值：`{ written: boolean, conflicts: string[] }`
  - Preamble（frontmatter + 非 section 导言）做整体 hash 对比
- `mergeDir()` 的 `else` 分支（用户已修改目标文件）：对 `.md` 文件调用 `mergeMarkdownSections()` 替代原有文件级跳过逻辑
- 冲突标记格式：
  ```
  <<<<<<< user (2026-05-14 修改)
  ## Section 名称
  用户修改的内容...
  =======
  ## Section 名称
  新模板的内容...
  >>>>>>> template v3.45.8
  ```
- `src/engine/server.ts` 的 `startEngine()` 中增加启动时冲突扫描（~10 行）：
  - 扫描 `.claude/{agents,commands,skills}/` 下所有 markdown 文件
  - 检测 `<<<<<<< user` 标记 → 输出 `⚠ 冲突文件: <relativePath>` 警告
  - 不阻塞引擎启动
- 非 `.md` 文件保持原有文件级合并逻辑不变
### out_of_scope:
- 不实现 `jarvis resolve` 命令（TASK-006 负责）
- 不修改 installMcp / installHooks
- 不修改 JSON 配置合并逻辑
### input_documents: docs/2026-05-14/requirements/fine-grained-sync.md, docs/2026-05-14/tasks/fine-grained-sync-tasks.md
### allowed_paths:
- `src/install.ts`（新增 `mergeMarkdownSections()`；修改 `mergeDir()` 的 else 分支）
- `src/engine/server.ts`（`startEngine()` 中新增冲突扫描代码块）
### forbidden_paths:
- `src/install.ts` 中 `installMcp()`、`installHooks()`、`readFrontmatter()`（可调用不修改）、`splitMarkdownSections()`（可调用不修改）
- `src/cli/*`
- `src/shared/*`
### dependencies:
- TASK-001 产出的 `readFrontmatter()` 函数（获取版本信息用于冲突标记中的 template 版本号）
- TASK-002 产出的 `splitMarkdownSections()` 和 `computeSectionHashes()` 函数，以及 `_v: 2` 格式的 hash 记录结构
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: []
### wait_for: TASK-002, TASK-004
### acceptance_criteria:
1. 模拟场景一（源未变）：目标文件某 section 与源一致 → 该 section 保持不变
2. 模拟场景二（安全覆盖）：目标文件某 section 与旧源一致 → 用新源内容覆盖
3. 模拟场景三（冲突）：目标文件某 section 被用户修改 + 源也变了 → 写入冲突标记，用户内容保留
4. 冲突标记格式符合规范（`<<<<<<< user ... ======= ... >>>>>>> template`）
5. `startEngine()` 启动时输出冲突文件警告（不阻塞）
6. 非 markdown 文件保持原有合并行为不变
7. `lint && typecheck && build` 通过
### test_strategy: manual_only
### handoff_notes:
- 冲突标记的正则模式：`/<<<<<<< user/` —— 此模式供 TASK-006（resolve 命令）使用，确保解析一致。
- `mergeMarkdownSections()` 的冲突列表（`conflicts: string[]`）需要与 TASK-006 的 `resolve` 命令契约一致。
- 验证时建议 git stash 安装目录做前后对比。
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

---

### task_id: TASK-004
### task_name: JSON 配置字段级增删改
### requirement_ids: REQ-004
### owner: backend-dev-expert
### objective: 升级 `installMcp()` 和 `installHooks()` 的 JSON 合并逻辑，从"只增"升级为"增删改全支持"，并确保白名单保护不遗漏。
### in_scope:
- `installMcp()` 函数中 JSON 合并逻辑从"只增"升级为"增删改全支持"：
  - 新增：模板有、目标无的 `mcpServers` 条目 → 添加
  - 删除：目标有、模板无的 `mcpServers` 条目 → 删除
  - 修改：同名但值不同 → 数组字段（args）合并去重；对象字段（env）递归深度合并；标量字段（command、url）模板值覆盖
- `installHooks()` 函数中 `settings.json` 合并同样升级：
  - `permissions.allow` 新增条目，永不被删除（白名单保护）
  - `hooks` 中系统必需的 key 自动补充，用户自定义 key 保留
  - 模板中移除的 hooks 条目在目标中删除
- `src/shared/mcp-config.ts` 按需更新类型签名（如需新增 `DeepMerge` 等辅助类型）
- `force` 模式（`--force` / `opts.yes`）：不删除用户配置字段，完全替换（保留权限白名单）
### out_of_scope:
- 不修改 `mergeDir()` 及 markdown 合并逻辑
- 不修改 CLI 命令
- 不修改 `readFrontmatter()` / `splitMarkdownSections()` / `computeSectionHashes()`
- 不修改 `file-hashes.json` 格式
### input_documents: docs/2026-05-14/requirements/fine-grained-sync.md, docs/2026-05-14/tasks/fine-grained-sync-tasks.md
### allowed_paths:
- `src/install.ts`（修改 `installMcp()` 和 `installHooks()` 函数体）
- `src/shared/mcp-config.ts`（按需新增辅助类型）
### forbidden_paths:
- `src/install.ts` 中 `mergeDir()` 函数及所有 markdown 相关函数
- `src/install.ts` 中 `readFrontmatter()`、`splitMarkdownSections()`、`computeSectionHashes()`（这些是 TASK-001/002 产物，不可修改）
- `src/cli/*`
- `src/engine/*`
- `src/templates/*`
### dependencies: 无（逻辑独立）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-001（逻辑无关，但共享 install.ts 文件——TASK-001 先行，TASK-004 在 TASK-001 提交后执行）
### wait_for: []
### acceptance_criteria:
1. 模拟 JSON 新增：模板新增 `mcpServers.xxx` → `jarvis upgrade` 后目标 `.mcp.json` 新增该条目
2. 模拟 JSON 删除：模板移除 `mcpServers.yyy` → `jarvis upgrade` 后目标 `.mcp.json` 移除该条目
3. 模拟 JSON 修改：模板修改 `mcpServers.zzz.args` → `jarvis upgrade` 后目标数组合并去重
4. 模拟白名单保护：模板删除 `permissions.allow.rules[0]` → `jarvis upgrade` 后目标 `settings.json` 的 `permissions.allow` 不受影响
5. `force` 模式下不删除用户配置字段
6. `lint && typecheck && build` 通过
### test_strategy: manual_only
### handoff_notes:
- `installMcp()` 修改后的合并语义需要与 `diffJsonConfig()`（TASK-005 产出）的展示语义一致——确保 diff 输出正确反映 upgrade 行为。
- 白名单 key 列表（`permissions.allow`）需要文档化，以便 TASK-005 的 diff 也能识别。
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

---

### task_id: TASK-005
### task_name: 增强 jarvis diff 命令
### requirement_ids: REQ-001, REQ-002, REQ-003, REQ-004
### owner: backend-dev-expert
### objective: 增强 `jarvis diff` 输出，展示版本差异、section 级差异、冲突文件列表和 JSON 字段级差异。
### in_scope:
- `diffPlatform()` 函数增强输出：
  - 版本差异：对每个有变化的 `.md` 文件显示 `version: 3.44.0 → 3.45.8`
  - Section 级差异：展示哪些 section 新增/修改/冲突
  - 冲突文件列表：汇总显示所有存在 `<<<<<<< user` 标记的文件
  - JSON 差异：对 `.mcp.json` / `settings.json` 展示字段级新增/删除/修改
- 新增 `diffJsonConfig()` 辅助函数：对比两个 JSON 对象输出字段级差异
- 向后兼容：`file-hashes.json` 为旧格式时（无 `_v: 2`），diff 降级为文件级展示
- 输出格式保持简洁，每个平台关键变更一目了然
### out_of_scope:
- 不修改 install.ts 的任何函数
- 不实现文件合并逻辑
- 不新增 CLI 子命令
### input_documents: docs/2026-05-14/requirements/fine-grained-sync.md, docs/2026-05-14/tasks/fine-grained-sync-tasks.md
### allowed_paths:
- `src/cli/commands/diff.ts`（增强 `diffPlatform()`，新增 `diffJsonConfig()`）
### forbidden_paths:
- `src/install.ts`
- `src/engine/*`
- `src/cli/commands/resolve.ts`
- `src/cli/index.ts`
- `src/templates/*`
### dependencies:
- TASK-002 产出的 `_v: 2` section hash 格式（用于解析 section 差异）
- TASK-004 产出的 JSON 合并语义（diffJsonConfig 需与 upgrade 行为一致）
- TASK-003 产出的冲突标记格式（用于检测冲突文件）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-006（无共享文件）
### wait_for: TASK-002, TASK-004
### acceptance_criteria:
1. `jarvis diff` 输出包含每个 `.md` 文件的 version diff（如 `version: 3.44.0 → 3.45.8`）
2. Section 差异：新增/修改/冲突的 section 被正确识别和展示
3. 冲突文件列表在 diff 末尾汇总显示
4. `diffJsonConfig()` 正确输出 JSON 字段级新增/删除/修改
5. 旧格式 `file-hashes.json` 下降级为文件级展示（无报错）
6. `lint && typecheck && build` 通过
### test_strategy: manual_only
### handoff_notes:
- diff 输出中冲突文件的标识应与 TASK-006 的 resolve 命令一致（都扫描 `<<<<<<< user` 标记）。
- `diffJsonConfig()` 返回的数据结构建议可供 TASK-006 复用（列出冲突的 JSON 路径）。
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

---

### task_id: TASK-006
### task_name: jarvis resolve 冲突解决命令
### requirement_ids: REQ-005
### owner: backend-dev-expert
### objective: 新建 `jarvis resolve` CLI 命令，支持交互式和批量模式解决合并冲突，解决后自动清除标记并更新 hash 记录。
### in_scope:
- 新建 `src/cli/commands/resolve.ts`：
  - `jarvis resolve <file>` — 交互式逐冲突选择接受 user 或 template
  - `jarvis resolve <file> --accept user` — 移除所有 `<<<<<<< user...>>>>>>> template` 标记，保留 `=======` 之前的内容
  - `jarvis resolve <file> --accept template` — 移除所有冲突标记，保留 `=======` 之后的内容
  - `jarvis resolve --all --accept template` — 扫描所有冲突文件，批量接受模板侧
  - `jarvis resolve --list` — 列出所有存在冲突的文件（纯列表模式）
- 解决后操作：
  - 自动清除冲突标记（整段替换为选中的内容）
  - 更新 `file-hashes.json` 中的 hash 记录（使下次 merge 不再冲突）
  - 输出 `✅ Resolved <file> (N conflicts, accepted: user|template)`
- `src/cli/index.ts` 的 `COMMANDS` 字典新增 1 行注册
- 非交互模式静默处理（如 `--accept template` 不弹提示）
### out_of_scope:
- 不实现 GUI 冲突解决界面
- 不修改 install.ts 合并逻辑
- 不修改 diff 命令
### input_documents: docs/2026-05-14/requirements/fine-grained-sync.md, docs/2026-05-14/tasks/fine-grained-sync-tasks.md
### allowed_paths:
- `src/cli/commands/resolve.ts`（新建文件，核心命令实现）
- `src/cli/index.ts`（仅 `COMMANDS` 字典新增 1 行注册）
### forbidden_paths:
- `src/install.ts`
- `src/engine/*`
- `src/cli/commands/diff.ts`
- `src/cli/commands/*` (resolve.ts 除外)
- `src/templates/*`
### dependencies:
- TASK-003 产出的冲突标记格式（解析/替换冲突标记的正则模式需精确匹配 TASK-003 的生成格式）
- `getHashFilePath()` 来自 `src/hash-paths.ts`（已存在，用于定位 hash 文件）
- `loadHashes()` / `saveHashes()` 函数签名（来自 install.ts，用于更新 hash 记录）
### required_skills: behavioral-guidelines, code-standards, source-driven-development, incremental-implementation, verification-before-completion
### parallel_group: TASK-005（无共享文件）
### wait_for: TASK-003
### acceptance_criteria:
1. `jarvis resolve <file>` 交互式模式：逐冲突提示选择 user/template
2. `jarvis resolve <file> --accept user`：批量接受所有用户修改 → 文件干净无标记
3. `jarvis resolve <file> --accept template`：批量接受所有模板更新 → 文件干净无标记
4. `jarvis resolve --all --accept template`：扫描所有冲突文件并批量解决
5. `jarvis resolve --list`：列出所有存在 `<<<<<<< user` 的文件（纯路径列表）
6. 解决后 `file-hashes.json` 的 hash 记录被更新
7. `lint && typecheck && build` 通过
### test_strategy: manual_only
### handoff_notes:
- 冲突标记解析正则应与 TASK-003 生成的格式完全对应：`/<<<<<<< user \(.*?\)\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> template .*?\n/g`
- `COMMANDS` 字典注册行为：`resolve: () => import('./commands/resolve.js')`
### escalation_rule: 如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。

---

## 12. parallel_batches

```
## parallel_batches

### Batch 1（无依赖，串行执行——共享 install.ts）
> 注意：TASK-001 和 TASK-004 均修改 `src/install.ts`，但操作非重叠函数区域（TASK-001: readFrontmatter/mergeDir; TASK-004: installMcp/installHooks）。为安全起见，Batch 1 内部顺序执行：TASK-001 先行，TASK-004 在 TASK-001 提交后启动。
- TASK-001 → subagent_type: backend-dev-expert
  - 完成后触发 TASK-004
- TASK-004 → subagent_type: backend-dev-expert
  - 在 TASK-001 的 commit 基础上修改 installMcp/installHooks

### Batch 2（依赖 Batch 1 的 TASK-001 完成）
- TASK-002 → subagent_type: backend-dev-expert
  - 依赖 TASK-001 的 readFrontmatter()
  - 修改 install.ts（新增 splitMarkdownSections/computeSectionHashes）

### Batch 3（依赖 Batch 2 的 TASK-002 和 Batch 1 的 TASK-004 完成）
- TASK-003 → subagent_type: backend-dev-expert
  - 依赖 TASK-002 的 splitMarkdownSections/computeSectionHashes + _v:2 格式
  - 修改 install.ts（mergeMarkdownSections + mergeDir 分支）+ engine/server.ts
  - 注：TASK-004 已修改 installMcp/installHooks 区域，TASK-003 修改 mergeDir 区域，无代码重叠

### Batch 4（依赖 Batch 2 的 TASK-002 和 Batch 3 的 TASK-003 及 Batch 1 的 TASK-004 完成；内部可真正并行）
- TASK-005 → subagent_type: backend-dev-expert
  - 依赖 TASK-002 的 section hash 格式 + TASK-004 的 JSON merge 语义
  - 仅修改 src/cli/commands/diff.ts
- TASK-006 → subagent_type: backend-dev-expert
  - 依赖 TASK-003 的冲突标记格式
  - 新建 src/cli/commands/resolve.ts + 修改 src/cli/index.ts（1 行）
  - 与 TASK-005 无共享文件，可真正并行
```

---

## 13. 端到端集成验证清单（所有 Batch 完成后）

1. **渐进升级**：旧版 jarvis 安装的目录（无 `version` frontmatter、旧格式 `file-hashes.json`），运行 `jarvis upgrade`，验证无破坏
2. **新版安装**：`jarvis init` 全新安装，验证 `file-hashes.json` 中 markdown 文件为 `_v: 2` section 格式
3. **用户修改保留**：修改目标文件的某个 section，升级新版模板，验证该 section 有冲突标记，其他 section 正常更新
4. **冲突检测**：`jarvis diff` 和 `jarvis engine start` 均能输出冲突文件警告
5. **冲突解决**：`jarvis resolve --all --accept template` 后文件干净，无残留冲突标记
6. **JSON 删除**：模板移除某个 mcpServer，`jarvis upgrade` 后目标 `.mcp.json` 也移除
7. **JSON 白名单**：模板删除某个 permission，`jarvis upgrade` 后目标 `settings.json` 的 `permissions.allow` 不受影响
8. **质量门**：`lint && typecheck && build` 全部通过

---

## 14. plan patch / contract change request 触发条件

以下情况发生时，实现 Agent 应提交 plan patch：
1. `readFrontmatter()` 的实际签名与 TASK-002/003 预期不一致
2. `splitMarkdownSections()` 的输出结构需要调整以支持合并逻辑
3. `_v: 2` hash 格式在 `saveHashes()` / `loadHashes()` 中的实际实现偏离 TASK-003/005 预期
4. 冲突标记的正则模式与 TASK-006 的解析逻辑不匹配
5. `installMcp()` / `installHooks()` 修改后发现与 `mergeDir()` 有隐藏的共享状态依赖
6. 某个 TASK 的实际变更行数超过预估的 1.5 倍（如 TASK-003 超过 240 行）

---

## 15. 推荐的下一步

1. **编排者** 按 Batch 1 → Batch 2 → Batch 3 → Batch 4 顺序 spawn Agent
2. Batch 1：先启动 `backend-dev-expert` 执行 TASK-001，完成后同 Agent 继续执行 TASK-004（或新 Agent 基于 TASK-001 的 commit）
3. Batch 4：TASK-005 和 TASK-006 可同时 spawn 两个 Agent，真正并行
4. 全部完成后的质量重检：
   - `qa-review-expert` 执行 Gate D review
   - 运行端到端集成验证清单第 13 节全部 8 项
   - 通过后合并到 main
