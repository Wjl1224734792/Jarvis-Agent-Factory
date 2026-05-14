# 任务分解：Jarvis 配置文件细粒度同步机制

> 需求文档：`docs/2026-05-14/requirements/fine-grained-sync.md`
> 版本：1.0 | 日期：2026-05-14 | 类型：工具链改进

---

## 1. 任务概览

| 指标 | 数值 |
|------|------|
| 总 REQ 数 | 6 |
| 总 TASK 数 | 6 |
| 预估总变更行数 | ~680 |
| 轮次 | 单轮（总计 < 1000 行） |
| 策略 | 垂直切片 + 依赖有序 |
| 测试策略 | 全部 direct（工具链改进，非业务逻辑；手动功能验证即可） |

### REQ → TASK 追溯矩阵

| REQ | 名称 | 映射 TASK |
|-----|------|----------|
| REQ-001 | Frontmatter 版本追踪 | TASK-001 |
| REQ-002 | Section 级合并引擎 | TASK-002, TASK-003 |
| REQ-003 | 冲突标记模式 | TASK-003, TASK-005 |
| REQ-004 | JSON 配置字段级增删 | TASK-004 |
| REQ-005 | `jarvis resolve` 命令 | TASK-006 |
| REQ-006 | 向后兼容与渐进升级 | TASK-001, TASK-002, TASK-004 |

---

## 2. 任务分解列表

---

### TASK-001: 模板 Frontmatter 版本追踪

- **task_name**: 模板 Frontmatter 版本追踪
- **requirement_ids**: [REQ-001, REQ-006]
- **type**: direct
- **priority**: P0（基础设施，所有后续任务的前置）
- **estimated_lines**: ~80
- **test_strategy**: manual_only
- **dependencies**: []
- **parallel_group**: [TASK-004]（TASK-004 修改 installMcp/installHooks，不涉及 mergeDir/markdown）
- **risk**: 低
- **acceptance_criteria**:
  1. 所有 `src/templates/platforms/claude/{agents,commands,skills}/**/*.md` 的 YAML frontmatter 新增 `version: "3.45.8"` 和 `updated: "2026-05-14"` 字段
  2. `src/install.ts` 新增 `readFrontmatter(filePath)` 工具函数，解析 YAML frontmatter 返回 `{ version, updated, ...rest }`
  3. `mergeDir()` 在决策是否合并 markdown 文件时（`destHash !== oldHash` 分支），调用 `readFrontmatter()` 获取源模板和目标文件的版本号
  4. 无 `version` 字段的文件视为 `version: "0.0.0"`（触发全量更新），实现向后兼容（REQ-006）
  5. 未修改的目标文件（`destHash === oldHash`）在覆盖时间步更新其 frontmatter version 为源模板版本

- **文件所有权**:
  | 文件 | 操作 | 说明 |
  |------|------|------|
  | `src/templates/platforms/claude/agents/*.md` | 修改 | frontmatter 新增 version/updated |
  | `src/templates/platforms/claude/commands/*.md` | 修改 | frontmatter 新增 version/updated |
  | `src/templates/platforms/claude/skills/*/*.md` | 修改 | frontmatter 新增 version/updated |
  | `src/install.ts` | 修改 | 新增 `readFrontmatter()`；`mergeDir()` 集成版本读取 |

- **共享区域冲突**: 无（`readFrontmatter()` 是独立工具函数，不与其他任务冲突）

---

### TASK-002: Section 级 Hash 基础设施

- **task_name**: Section 级 Hash 基础设施
- **requirement_ids**: [REQ-002, REQ-006]
- **type**: direct
- **priority**: P0（合并引擎的 hash 计算基础）
- **estimated_lines**: ~120
- **test_strategy**: manual_only
- **dependencies**: [TASK-001]（需要 `readFrontmatter()` 识别有 frontmatter 的 markdown 文件）
- **parallel_group**: [TASK-004]
- **risk**: 中（hash 文件格式变更，需兼容旧格式）
- **acceptance_criteria**:
  1. `src/install.ts` 新增 `splitMarkdownSections(content)` 函数：
     - 输入：markdown 文件原始内容
     - 输出：`{ frontmatterLineCount: number, sections: { title: string, content: string }[] }`
     - 按 `## ` 二级标题分割，不在任何 `##` 内的内容（frontmatter + 导言）作为独立 "preamble" 区块
     - 空 markdown 文件返回 `sections: []`
  2. `src/install.ts` 新增 `computeSectionHashes(filePath)` 函数：
     - 调用 `splitMarkdownSections()` 后逐 section 计算 SHA256
     - 返回 `{ preamble: string, sections: Record<sectionTitle, string> }`（hash 映射）
  3. `file-hashes.json` 格式扩展为向下兼容的双格式：
     - 旧格式（文件级）：`{ "<absolutePath>": "<sha256>" }` —— 用于非 markdown 文件，可被 TASK-002 读取
     - 新格式（section 级）：`{ "<absolutePath>": { "_v": 2, "preamble": "<hash>", "sections": { "Section A": "<hash>", ... } } }` —— 用于 markdown 文件
     - 通过 `_v` 字段区分新旧格式
  4. `loadHashes()` 保持现有接口不变，返回内容由调用方自行判断格式
  5. 无历史 hash 记录的文件按"新安装"处理（REQ-006）

- **文件所有权**:
  | 文件 | 操作 | 说明 |
  |------|------|------|
  | `src/install.ts` | 修改 | 新增 `splitMarkdownSections()`、`computeSectionHashes()` |
  | `src/hash-paths.ts` | 不修改 | 路径解析逻辑不变 |

- **共享区域冲突**: 与 TASK-003 共享 `file-hashes.json` 格式定义（TASK-002 定义格式，TASK-003 消费和写入）

---

### TASK-003: Section 级合并引擎 + 冲突标记

- **task_name**: Section 级合并引擎 + 冲突标记
- **requirement_ids**: [REQ-002, REQ-003]
- **type**: direct
- **priority**: P0（核心合并逻辑）
- **estimated_lines**: ~160
- **test_strategy**: manual_only
- **dependencies**: [TASK-002]（需要 `splitMarkdownSections()` 和 section hash 格式）
- **parallel_group**: [TASK-004]
- **risk**: 高（修改 `mergeDir()` 核心合并分支；共享 `install.ts` 文件与 TASK-001/002/004；需仔细处理合并顺序）
- **acceptance_criteria**:
  1. `src/install.ts` 新增 `mergeMarkdownSections(srcPath, destPath, hashRecord)` 函数：
     - 三规则合并表格：
       | 场景 | 行为 |
       |------|------|
       | 源 section hash == 记录 hash | 保持目标 section 不变 |
       | 记录不存在 或 目标 section hash == 旧记录 hash | 用新源 section 覆盖 |
       | 目标 section hash != 旧记录 hash **且** 源也变了 | 保留用户内容，**写入冲突标记** |
     - 返回值：`{ written: boolean, conflicts: string[] }`（冲突 section 标题列表）
  2. 冲突标记格式（符合 REQ-003）：
     ```markdown
     <<<<<<< user (2026-05-14 修改)
     ## Section 名称
     用户修改的内容...
     =======
     ## Section 名称
     新模板的内容...
     >>>>>>> template v3.45.8
     ```
  3. `mergeDir()` 的 `else` 分支（文件已存在）中，对 `.md` 文件调用 `mergeMarkdownSections()` 替代原有的文件级覆盖
  4. 非 `.md` 文件保持原有文件级合并逻辑不变
  5. Preamble（frontmatter + 非 section 导言）做整体 hash 对比，与 section 处理逻辑一致
  6. `src/engine/server.ts` 的 `startEngine()` 函数中增加启动时扫描：
     - 扫描 `.claude/{agents,commands,skills}/` 下所有 markdown 文件
     - 若发现 `<<<<<<< user` 冲突标记 → 输出 `⚠ 冲突文件: <relativePath>` 警告
     - 不阻塞引擎启动

- **文件所有权**:
  | 文件 | 操作 | 说明 |
  |------|------|------|
  | `src/install.ts` | 修改 | 新增 `mergeMarkdownSections()`；修改 `mergeDir()` 分支逻辑 |
  | `src/engine/server.ts` | 修改 | `startEngine()` 中新增冲突文件扫描（~10 行） |

- **共享区域冲突**: 
  - 与 TASK-001 共享 `mergeDir()` 函数（TASK-001 在 `else` 分支读 frontmatter；TASK-003 在 `else` 分支调用 `mergeMarkdownSections()`）
  - 顺序：TASK-001 → TASK-003 串行执行确保合并正确

---

### TASK-004: JSON 配置字段级增删改

- **task_name**: JSON 配置字段级增删改
- **requirement_ids**: [REQ-004]
- **type**: direct
- **priority**: P0（配置升级核心能力）
- **estimated_lines**: ~110
- **test_strategy**: manual_only
- **dependencies**: []
- **parallel_group**: [TASK-001, TASK-002]（操作 install.ts 的不同函数，无逻辑依赖）
- **risk**: 中（修改 settings.json/permissions 处理逻辑，需确保白名单保护不遗漏）
- **acceptance_criteria**:
  1. `src/install.ts` 的 `installMcp()` 函数中 JSON 合并逻辑从"只增"升级为"增删改全支持"：
     - **新增**：模板有、目标无的 `mcpServers` 条目 → 添加
     - **删除**：目标有、模板无的 `mcpServers` 条目 → 删除（版本升级主动移除）
     - **修改**：同名但值不同的条目 → 按类型处理：
       - 数组字段（如 `args`）：合并去重
       - 对象字段（如 `env`）：递归深度合并
       - 标量字段（如 `command`、`url`）：模板值覆盖（模板为权威源）
  2. `src/install.ts` 的 `installHooks()` 函数中 settings.json 合并同样升级：
     - `permissions.allow` 新增条目，但**永不被删除**（白名单保护，REQ-004）
     - `hooks` 中系统必需的 key 自动补充，用户自定义 key 保留
     - 模板中移除的 hooks 条目在目标中删除
  3. `src/shared/mcp-config.ts` 更新 `writeMcpConfig()` 类型签名支持深度合并（如需），确保 `readMcpConfig` / `writeMcpConfig` 的契约与新的合并语义一致
  4. `force` 模式（`--force` / `opts.yes`）：不删除用户配置字段，而是完全替换为目标文件（保留权限白名单不变）

- **文件所有权**:
  | 文件 | 操作 | 说明 |
  |------|------|------|
  | `src/install.ts` | 修改 | `installMcp()` 和 `installHooks()` 函数升级 |
  | `src/shared/mcp-config.ts` | 可能修改 | 如需新增辅助类型或工具函数 |

- **共享区域冲突**: 与 TASK-001/002/003 操作 `install.ts` 的不同函数（`installMcp` vs `mergeDir`），无代码级冲突。但修改 `install.ts` 同一文件，需注意合并顺序。

---

### TASK-005: 增强 `jarvis diff` 命令

- **task_name**: 增强 jarvis diff 命令
- **requirement_ids**: [REQ-001, REQ-002, REQ-003, REQ-004]
- **type**: direct
- **priority**: P1（需要新的 diff 输出验证上游修改正确性）
- **estimated_lines**: ~100
- **test_strategy**: manual_only
- **dependencies**: [TASK-002, TASK-004]（需要 section hash 格式才能展示 section 差异；需要 JSON 差异计算能力）
- **parallel_group**: [TASK-006]（diff 与 resolve 操作不同文件）
- **risk**: 低
- **acceptance_criteria**:
  1. `src/cli/commands/diff.ts` 的 `diffPlatform()` 函数增强输出：
     - **版本差异**：显示 `version: 3.44.0 → 3.45.8`（对每个有变化的 `.md` 文件显示 frontmatter version 变化）
     - **Section 级差异**：展示哪些 section 新增/修改/冲突，而不仅仅是文件级 `update`/`skip`
     - **冲突文件列表**：汇总显示所有存在 `<<<<<<< user` 标记的文件
     - **JSON 差异**：对 `.mcp.json` / `settings.json` 展示字段级的新增/删除/修改
  2. 新增 `diffJsonConfig()` 辅助函数，对比两个 JSON 对象输出字段级差异
  3. 输出格式保持简洁，每个平台的关键变更一目了然
  4. 向后兼容：当 `file-hashes.json` 还是旧格式（无 `_v: 2`）时，diff 按文件级展示（降级模式）

- **文件所有权**:
  | 文件 | 操作 | 说明 |
  |------|------|------|
  | `src/cli/commands/diff.ts` | 修改 | 增强 `diffPlatform()`，新增 `diffJsonConfig()` |

- **共享区域冲突**: 无（唯一修改 diff.ts，不与其他 TASK 共享文件）

---

### TASK-006: `jarvis resolve` 命令

- **task_name**: jarvis resolve 冲突解决命令
- **requirement_ids**: [REQ-005]
- **type**: direct
- **priority**: P1（需要 TASK-003 产生冲突后才能验证）
- **estimated_lines**: ~110
- **test_strategy**: manual_only
- **dependencies**: [TASK-003]（需要冲突标记格式定义和引擎扫描能力）
- **parallel_group**: [TASK-005]
- **risk**: 中（新命令，新文件，需 CLI 注册）
- **acceptance_criteria**:
  1. 新建 `src/cli/commands/resolve.ts`，导出 `execute(opts, positional)` 函数：
     - `jarvis resolve <file>` — 交互式逐冲突选择接受 `user` 或 `template`
     - `jarvis resolve <file> --accept user` — 移除所有 `<<<<<<< user...>>>>>>> template` 标记，保留 `=======` 之前的内容
     - `jarvis resolve <file> --accept template` — 移除所有冲突标记，保留 `=======` 之后的内容
     - `jarvis resolve --all --accept template` — 扫描所有存在冲突的文件，批量接受模板侧
  2. 解决后：
     - 自动清除冲突标记（整段替换为选中的内容）
     - 更新 `file-hashes.json` 中的 hash 记录（使下次 merge 不再冲突）
     - 输出 `✅ Resolved <file> (N conflicts, accepted: user|template)`
  3. `src/cli/index.ts` 的 `COMMANDS` 字典新增：
     ```ts
     resolve: () => import('./commands/resolve.js'),
     ```
  4. 非交互模式静默处理（如 `--accept template` 不弹提示）
  5. `jarvis resolve --list` 列出所有存在冲突的文件（纯列表模式，无参数汇总）

- **文件所有权**:
  | 文件 | 操作 | 说明 |
  |------|------|------|
  | `src/cli/commands/resolve.ts` | 新建 | 核心命令实现 |
  | `src/cli/index.ts` | 修改 | 注册 resolve 命令（1 行新增） |

- **共享区域冲突**: `src/cli/index.ts` 中 `COMMANDS` 对象与 TASK-006 注册行——仅 1 行变更，无实际冲突风险。

---

## 3. DDD 分类

本需求为**工具链改进**，不涉及业务领域建模。无 DDD 分类任务。

- 无聚合根、值对象、领域服务
- 无状态机/状态转换
- 无跨聚合交互

---

## 4. TDD 与直接开发分类

| TASK | 分类 | 理由 |
|------|------|------|
| TASK-001 | direct | 模板文件批量修改 + 工具函数 |
| TASK-002 | direct | Markdown 解析工具 + hash 计算 |
| TASK-003 | direct | 文件合并逻辑（三段式 if/else，非业务状态机） |
| TASK-004 | direct | JSON 合并策略（工具链配置，非业务数据） |
| TASK-005 | direct | CLI 输出增强（展示逻辑） |
| TASK-006 | direct | CLI 交互命令（文件操作，非业务规则） |

**全部 direct**：本需求 6 个 TASK 均为 install/sync 工具链改进，不涉及核心业务规则、权限验证、资金/配额计算、幂等性/重试或状态机逻辑。手动功能验证（init/upgrade/diff/resolve 实际运行）即可充分验证正确性。

---

## 5. 风险任务

### TASK-003 (高风险)

| 维度 | 评估 |
|------|------|
| 变更行数 | ~160 行（M 级） |
| 共享区域 | `mergeDir()` 是核心合并入口，TASK-001/002 均有修改 |
| 业务影响 | merge 逻辑错误 → 用户定制内容被覆盖或模板更新静默丢弃 |
| 缓解措施 | 依赖 TASK-001 和 TASK-002 先完成；验证时用 git 备份的安装目录做 diff 对比 |
| 不拆分子任务的理由 | `mergeMarkdownSections()` 和 `mergeDir()` 集成逻辑是一个有机整体，拆分会导致重复修改 mergeDir 同一分支 |

### TASK-002 (中风险)

| 维度 | 评估 |
|------|------|
| 变更行数 | ~120 行（M 级） |
| 共享区域 | `file-hashes.json` 格式变更，TASK-003/005 消费 |
| 业务影响 | hash 格式不兼容 → 全量覆盖用户文件 |
| 缓解措施 | 双格式兼容（`_v` 字段区分），loadHashes 接口不变 |

---

## 6. 文件所有权和共享路径提醒

### 文件所有权矩阵

| 文件 | TASK-001 | TASK-002 | TASK-003 | TASK-004 | TASK-005 | TASK-006 |
|------|----------|----------|----------|----------|----------|----------|
| `src/install.ts` | 修改 | 修改 | 修改 | 修改 | - | - |
| `src/hash-paths.ts` | - | (不修改) | - | - | - | - |
| `src/cli/commands/diff.ts` | - | - | - | - | 修改 | - |
| `src/cli/commands/resolve.ts` | - | - | - | - | - | 新建 |
| `src/cli/index.ts` | - | - | - | - | - | 修改 |
| `src/engine/server.ts` | - | - | 修改 | - | - | - |
| `src/shared/mcp-config.ts` | - | - | - | 可能修改 | - | - |
| `src/templates/**/*.md` | 修改 | - | - | - | - | - |

### 共享路径冲突

| 共享区域 | 涉及 TASK | 冲突类型 | 解决方式 |
|---------|----------|---------|---------|
| `src/install.ts` | TASK-001, TASK-002, TASK-003, TASK-004 | 四任务修改同一文件 | 按依赖顺序串行执行；TASK-004 操作独立函数（`installMcp`/`installHooks`）可在 TASK-002 之后并行插入 |
| `src/cli/index.ts` | TASK-006 | 单任务修改 COMMANDS 字典 | 仅注册 1 行，无冲突 |

### 串行依赖链

```
TASK-001 ──→ TASK-002 ──→ TASK-003 ──→ TASK-006
                │              │
                │              └──→ (TASK-005 需要冲突格式)
                │
                └──→ TASK-005（需要 section hash 格式）

TASK-004 ─────────────────────────────→ TASK-005（需要 JSON diff 能力）
```

---

## 7. 推荐交付顺序

### 第 1 步：并行启动

```
TASK-001 (Frontmatter 版本追踪)     ← 无依赖，先启动
TASK-004 (JSON 配置字段级增删)      ← 无依赖，可与 TASK-001 并行
```

### 第 2 步：Serial 推进

```
TASK-002 (Section 级 Hash 基础设施) ← 依赖 TASK-001
    ↓
TASK-003 (合并引擎 + 冲突标记)      ← 依赖 TASK-002
    ↓
TASK-005 (增强 diff)  ──────┐       ← 依赖 TASK-002 + TASK-004
                             ├── 可并行
TASK-006 (resolve 命令) ────┘       ← 依赖 TASK-003
```

### 执行顺序汇总

| 顺序 | TASK | 依赖完成 |
|------|------|---------|
| 1 | TASK-001 | - |
| 1 | TASK-004 | - |
| 2 | TASK-002 | TASK-001 |
| 3 | TASK-003 | TASK-002 |
| 4 | TASK-005 | TASK-002, TASK-004 |
| 4 | TASK-006 | TASK-003 |

预计串行关键路径：TASK-001 → TASK-002 → TASK-003 → TASK-006（4 步串行，每个 ≤160 行）

---

## 8. 验证检查清单

本清单用于每个 TASK 完成后验证，以及最终集成验证。

### 单 TASK 验证

- [ ] TASK-001: 随机抽查 3 个模板文件确认 frontmatter 含 `version`/`updated`；运行 `jarvis init` 确认向后兼容
- [ ] TASK-002: 用真实模板文件测试 `splitMarkdownSections()` 输出；验证 `file-hashes.json` 新格式
- [ ] TASK-003: 模拟三类场景（未变/安全覆盖/冲突）各 1 次；验证冲突标记格式
- [ ] TASK-004: 模拟 JSON 新增/删除/修改各场景；验证白名单不被删除
- [ ] TASK-005: 运行 `jarvis diff` 确认输出包含 version diff、section diff、JSON diff
- [ ] TASK-006: 运行 `jarvis resolve <file>` 交互式/批量模式验证；确认 hash 记录更新

### 端到端集成验证

1. **渐进升级**：用旧版 jarvis 安装的目录，新版运行 `jarvis upgrade`，验证无破坏
2. **新版安装**：`jarvis init` 全新安装，验证 file-hashes.json 为 section 格式
3. **用户修改保留**：修改目标文件的某个 section，安装新版模板，验证该 section 有冲突标记且其他 section 正常更新
4. **冲突检测**：`jarvis diff` 和 `jarvis engine start` 均能发现冲突文件
5. **冲突解决**：`jarvis resolve --all --accept template` 后文件干净，无残留冲突标记
6. **JSON 删除**：模板移除某个 mcpServer，`jarvis upgrade` 后目标 `.mcp.json` 也移除
7. **JSON 白名单**：模板删除某个 permission，`jarvis upgrade` 后目标 `settings.json` 的 `permissions.allow` 不受影响

---

## 9. 推荐的下一步

1. **Planner** 读取本文档，按推荐交付顺序生成执行计划
2. 实现 Agent 发现环境不整洁时，先等待 TASK-001/004 完成并行启动
3. 每个 TASK 完成后运行对应单 TASK 验证，全部完成后运行端到端集成验证
4. 特别注意 TASK-003（高风���）需额外验证：git diff 安装目录确认无意外变更
