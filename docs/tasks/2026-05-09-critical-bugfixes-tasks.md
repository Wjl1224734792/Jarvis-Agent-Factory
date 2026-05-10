# 任务文档：紧急 Bug 修复与体验优化

> 日期: 2026-05-09 | 来源: [需求文档](../requirements/2026-05-09-critical-bugfixes.md) | 版本: 1.0

---

## 需求文档

- 路径: `docs/requirements/2026-05-09-critical-bugfixes.md`
- 状态: confirmed
- REQ 数量: 9 (REQ-001 ~ REQ-009)

---

## 任务概览

| 轮次 | TASK | REQ | 名称 | 类型 | 优先级 | 粒度 | 并行组 |
|------|------|-----|------|------|--------|------|--------|
| R1 | TASK-001 | REQ-002 | 构建脚本复制 templates 到 dist | 直接开发 | P0 | XS | - |
| R2 | TASK-002 | REQ-003 | 修复 install.ts / diffPlatform 模板路径 | 直接开发 | P0 | XS | G1 |
| R2 | TASK-003 | REQ-004 | 修复 agent-registry.ts 模板路径回退 | TDD | P0 | S | G1 |
| R2 | TASK-004 | REQ-001 | 统一 agents.html 侧边栏导航 | 直接开发 | P0 | XS | G1 |
| R2 | TASK-005 | REQ-006 | 修复 MD 文档抽屉渲染 | 直接开发 | P0 | XS | G1 |
| R3 | TASK-006 | REQ-005 | 统一 CLI add/remove 无参数行为 | 直接开发 | P1 | XS | G2 |
| R3 | TASK-007 | REQ-007 | 全局/项目级智能体配置分类读取 | DDD + TDD | P1 | M | G2 |
| R4 | TASK-008 | REQ-008 | 抑制 SQLite ExperimentalWarning | 直接开发 | P0 | XS | G3 |
| R4 | TASK-009 | REQ-009 | 模板增加平台级规则读取指引 | 直接开发 | P2 | M | G3 |

**总预估变更**: ~200 行，单轮交付，分 4 个串行批次。

---

## 依赖关系图

```
TASK-001 (build fix) ──┬── TASK-002 (install.ts path + cli.ts diffPlatform) ── TASK-006 (CLI add/remove) ── TASK-008 (SQLite warning)
                       │                           (同文件 cli.ts)                      (同文件 cli.ts)
                       │
                       ├── TASK-003 (agent-registry fallback) ── TASK-007 (global/project config merge)
                       │               (同文件 agent-registry.ts)
                       │
                       ├── TASK-004 (agents.html sidebar) ─── [独立]
                       │
                       └── TASK-005 (MD rendering) ─── [独立]

TASK-009 (template rules) ─── [独立, 随时可做]
```

**注释:**
- `--` 表示硬依赖（功能依赖）
- `(同文件)` 表示串行约束（共享文件，避免 merge conflict）
- 箭头方向 = 必须先完成左侧，再做右侧

---

## 任务分解列表

### TASK-001: 构建脚本复制 templates 到 dist

| 属性 | 值 |
|------|-----|
| task_id | TASK-001 |
| task_name | 构建脚本复制 templates 到 dist |
| requirement_ids | [REQ-002] |
| type | 直接开发 |
| priority | P0 |
| estimated_lines | ~5 行 |
| granularity | XS |
| test_strategy | manual_only |
| dependencies | [] |
| dependents | [TASK-002, TASK-003] |
| risk | 低 |

**涉及文件:**
| 文件 | 所有权 |
|------|--------|
| `package.json` (build 脚本) | 唯一修改者 |

**变更说明:**
- 在 `build` 脚本的 `node -e "..."` 内联脚本中，于现有 `cpSync('src/web/views', ...)` 之后新增一行:
  ```
  cpSync('src/templates','dist/src/templates',{recursive:true});
  ```
- `package.json` 的 `files` 字段已经包含 `dist/`，无需修改

**完成标准:**
- [x] `npm run build` 后 `dist/src/templates/` 目录存在
- [x] `dist/src/templates/platforms/claude/agents/frontend-dev-expert.md` 文件存在
- [x] `dist/src/templates/mcp-claude.json` 等 MCP 模板文件存在

---

### TASK-002: 修复 install.ts / diffPlatform 模板路径

| 属性 | 值 |
|------|-----|
| task_id | TASK-002 |
| task_name | 修复 install.ts / diffPlatform 模板路径 |
| requirement_ids | [REQ-003] |
| type | 直接开发 |
| priority | P0 |
| estimated_lines | ~8 行 |
| granularity | XS |
| test_strategy | manual_only |
| dependencies | [TASK-001] |
| dependents | [TASK-006] (同文件 cli.ts) |
| risk | 低 |

**涉及文件:**
| 文件 | 所有权 | 共享冲突 |
|------|--------|----------|
| `src/install.ts` | 唯一修改者 | 无 |
| `src/cli.ts` | 与 TASK-006、TASK-008 共享 | 串行依赖 |

**变更说明:**
1. **`src/install.ts`** 第 42 行路径 B:
   - 当前: `const srcRoot = resolve(pkgRoot, 'src', 'templates', 'platforms', platform);`
   - 修改为: `const srcRoot = resolve(pkgRoot, 'dist', 'src', 'templates', 'platforms', platform);`
   - 理由: npm 全局安装后 `src/` 不在发布包中，编译产物在 `dist/src/`

2. **`src/cli.ts`** `diffPlatform` 函数（约第 298 行）:
   - 当前: `const srcRoot = resolve(PKG_ROOT, 'src', 'templates', 'platforms', platform);`
   - 修改为: `const srcRoot = resolve(PKG_ROOT, 'dist', 'src', 'templates', 'platforms', platform);`

**完成标准:**
- [x] npm 全局安装后 `jarvis upgrade` 不报 "Source not found" 错误
- [x] `jarvis diff` 正常工作（对比源与目标目录变更）
- [x] 本地 dev 环境（`tsx src/cli.ts`）仍然正常工作

---

### TASK-003: 修复 agent-registry.ts 模板路径回退

| 属性 | 值 |
|------|-----|
| task_id | TASK-003 |
| task_name | 修复 agent-registry.ts 模板路径回退 |
| requirement_ids | [REQ-004] |
| type | TDD |
| priority | P0 |
| estimated_lines | ~30 行 |
| granularity | S |
| test_strategy | tdd |
| dependencies | [TASK-001] |
| dependents | [TASK-007] (同文件 agent-registry.ts) |
| risk | 低 |

**涉及文件:**
| 文件 | 所有权 | 共享冲突 |
|------|--------|----------|
| `src/engine/agent-registry.ts` | 与 TASK-007 共享 | 串行依赖 |
| `tests/agent-registry.test.ts` | 唯一修改者（新增测试） | 无 |

**变更说明:**
1. TASK-001 完成后，编译后 `TEMPLATES_DIR` 路径 `resolve(__dirname, '..', 'templates', 'platforms')` 指向 `dist/src/templates/platforms`，该路径在 `npm run build` 后有效
2. 额外加固: `getAgentList` 增加 fallback 逻辑:
   - 主路径: `dist/src/templates/platforms`（编译后）
   - 回退路径: 从项目源码目录读取（当 `dist/` 不存在时适用，如本地 `tsx` 开发）
3. 使用 `existsSync` 检测，优先使用 `dist/` 路径

**TDD 实现步骤:**
1. [RED] 编写测试: 模拟 `dist/src/templates` 不存在的场景，验证 fallback 到源码目录
2. [GREEN] 实现 `resolveTemplatesDir()` 函数，自动检测可用路径
3. [REFACTOR] 将 `TEMPLATES_DIR` 改为惰性求值，避免模块加载时路径已固定的问题

**完成标准:**
- [x] Web 面板 `/agents` 页面能显示智能体列表（非空）
- [x] 三个平台（Claude/OpenCode/Codex）切换均显示对应智能体列表
- [x] 单元测试覆盖 fallback 路径分支
- [x] `npm run build` 后，访问 `/api/agents` 返回非空列表

---

### TASK-004: 统一 agents.html 侧边栏导航

| 属性 | 值 |
|------|-----|
| task_id | TASK-004 |
| task_name | 统一 agents.html 侧边栏导航 |
| requirement_ids | [REQ-001] |
| type | 直接开发 |
| priority | P0 |
| estimated_lines | ~10 行 |
| granularity | XS |
| test_strategy | manual_only |
| dependencies | [] |
| dependents | [] |
| risk | 低 |

**涉及文件:**
| 文件 | 所有权 | 共享冲突 |
|------|--------|----------|
| `src/web/views/agents.html` | 唯一修改者 | 无 |
| `src/engine/server.ts` (可选) | 无冲突 | 无 |

**变更说明:**
1. **`src/web/views/agents.html`** 侧边栏 `<nav>` 区域（第 42-50 行）:
   - 在"流水线看板"和"智能体配置"之间插入"归档记录"链接:
     ```html
     <a href="/dashboard#/archive" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border-l-[3px] border-transparent transition-colors">
       <i data-lucide="archive" class="w-4 h-4"></i>
       归档记录
     </a>
     ```
   - 参照 `pipeline.html` 第 47-50 行的相同链接

2. **`src/engine/server.ts`**（可选）:
   - 添加 `/archive` 路由重定向到 `/dashboard#/archive`，防止用户直接输入 URL 时 404

**完成标准:**
- [x] `agents.html` 侧边栏显示 3 项导航: 流水线看板、归档记录、智能体配置
- [x] 点击"归档记录"链接跳转到归档面板（`/dashboard#/archive`）
- [x] 可选: 直接访问 `/archive` 被重定向到 `/dashboard#/archive`

---

### TASK-005: 修复 MD 文档抽屉渲染

| 属性 | 值 |
|------|-----|
| task_id | TASK-005 |
| task_name | 修复 MD 文档抽屉渲染 |
| requirement_ids | [REQ-006] |
| type | 直接开发 |
| priority | P0 |
| estimated_lines | ~15 行 |
| granularity | XS |
| test_strategy | manual_only |
| dependencies | [] |
| dependents | [] |
| risk | 低 |

**涉及文件:**
| 文件 | 所有权 | 共享冲突 |
|------|--------|----------|
| `src/web/views/pipeline.html` | 唯一修改者 | 无 |

**变更说明:**
1. 当前 `openDocDrawer` 函数（第 815-851 行）已有 `marked` 检测和 fallback 逻辑，但 fallback 显示纯文本源码而非渲染内容
2. 增强措施:
   - 检查 `marked` CDN 是否加载成功: `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>` 已在第 11 行
   - 如果 `marked` 未加载（CDN 失败），在抽屉内容中显示友好提示而非仅纯文本
   - 可选: 添加备用 CDN（如 `unpkg.com/marked`）作为 fallback `script` 标签加载
3. 或者简化为: 使用 `fetch` 加载 marked 库以确保可靠性

**完成标准:**
- [x] 打开文档抽屉后，Markdown 内容渲染为格式化 HTML（标题/列表/代码块）
- [x] 若 `marked` 库加载失败，显示明确的错误提示（而非纯文本源码）
- [x] 代码块有适当的语法高亮或至少等宽字体展示

---

### TASK-006: 统一 CLI add/remove 无参数行为

| 属性 | 值 |
|------|-----|
| task_id | TASK-006 |
| task_name | 统一 CLI add/remove 无参数行为 |
| requirement_ids | [REQ-005] |
| type | 直接开发 |
| priority | P1 |
| estimated_lines | ~20 行 |
| granularity | XS |
| test_strategy | manual_only |
| dependencies | [TASK-002] (同文件 cli.ts) |
| dependents | [TASK-008] (同文件 cli.ts) |
| risk | 低 |

**涉及文件:**
| 文件 | 所有权 | 共享冲突 |
|------|--------|----------|
| `src/cli.ts` | 与 TASK-002、TASK-008 共享 | 串行依赖 |

**变更说明:**
1. **`jarvis add`** 命令（当前第 146-150 行）:
   - 当前: `platforms.length === 0` 时报错 `No valid platform specified`
   - 修改: 无平台参数时，默认安装全部平台（与 `jarvis init` 行为一致），弹出交互确认
   - 报错信息保留但仅在传入非法平台名时触发

2. **`jarvis remove` / `jarvis rm`** 命令（当前第 171-174 行）:
   - 同样处理: 无平台参数时，默认移除全部平台，弹出交互确认

**完成标准:**
- [x] `jarvis add` 不带参数: 提示"将安装全部平台（Claude Code / OpenCode / Codex）"并等待确认后执行
- [x] `jarvis remove` 不带参数: 提示"将移除全部平台"并等待确认后执行
- [x] `jarvis add invalid-platform`: 报错 `No valid platform specified`，列出可用平台
- [x] 不影响原有指定平台的行为（如 `jarvis add claude`）

---

### TASK-007: 全局/项目级智能体配置分类读取

| 属性 | 值 |
|------|-----|
| task_id | TASK-007 |
| task_name | 全局/项目级智能体配置分类读取 |
| requirement_ids | [REQ-007] |
| type | DDD + TDD |
| priority | P1 |
| estimated_lines | ~80 行 |
| granularity | M |
| test_strategy | tdd |
| dependencies | [TASK-003] (同文件 agent-registry.ts) |
| dependents | [] |
| risk | 中 |

**涉及文件:**
| 文件 | 所有权 | 共享冲突 |
|------|--------|----------|
| `src/engine/agent-registry.ts` | 与 TASK-003 共享 | 串行依赖 |
| `tests/agent-registry.test.ts` (新增/追加) | 唯一修改者 | 无 |

**变更说明:**
DDD 建模（配置聚合）:

1. **值对象**: `AgentSource` 类型
   ```typescript
   type AgentSource = 'template' | 'global' | 'project';
   ```

2. **聚合根扩展**: `AgentItem` 增加 `source: AgentSource` 字段

3. **领域服务**: 新增 `scanUserAgents(projectRoot?: string)` 函数
   - 扫描 `~/.jarvis/agents/` 或 `~/.claude/agents/` 目录（全局配置）
   - 扫描 `<projectRoot>/.claude/agents/` 目录（项目级配置）
   - 合并策略: 项目级 > 全局级 > 模板默认（同名智能体按优先级覆盖）

4. **API 变更**: `/api/agents` 响应中的 `agents` 列表包含 `source` 字段

**TDD 实现步骤:**
1. [RED] 编写测试: 模拟全局目录和项目目录存在同名 agent，验证项目级覆盖
2. [GREEN] 实现 `scanUserAgents` + 合并逻辑
3. [REFACTOR] 确保缓存机制正确（`_agentList` 缓存需考虑 source）

**完成标准:**
- [x] Web 面板智能体列表包含模板 + 全局 + 项目级智能体
- [x] 项目级智能体卡片标记 `source: 'project'`
- [x] 项目级同名智能体覆盖全局级/模板默认配置
- [x] 单元测试覆盖: 模板无全局、有全局无项目、全局被项目覆盖 三种场景

---

### TASK-008: 抑制 SQLite ExperimentalWarning

| 属性 | 值 |
|------|-----|
| task_id | TASK-008 |
| task_name | 抑制 SQLite ExperimentalWarning |
| requirement_ids | [REQ-008] |
| type | 直接开发 |
| priority | P0 |
| estimated_lines | ~10 行 |
| granularity | XS |
| test_strategy | manual_only |
| dependencies | [TASK-006] (同文件 cli.ts) |
| dependents | [] |
| risk | 低 |

**涉及文件:**
| 文件 | 所有权 | 共享冲突 |
|------|--------|----------|
| `src/cli.ts` | 与 TASK-002、TASK-006 共享 | 串行依赖 |

**根因确认:**
`src/engine/db.ts` 第 1 行: `import { DatabaseSync } from 'node:sqlite';`
Node.js 22+ 的 `node:sqlite` 是实验性 API，首次导入时自动打印 `ExperimentalWarning`。

**变更说明:**
1. 在 `src/cli.ts` 文件最顶部（在所有 import 之前）添加 warning 过滤:
   ```typescript
   // 抑制 node:sqlite ExperimentalWarning（用于 db.ts 的 DatabaseSync）
   process.on('warning', (warn) => {
     if (warn.name === 'ExperimentalWarning' && String(warn.message).includes('SQLite')) return;
     console.warn(warn);
   });
   ```
2. 不推荐使用 `--no-warnings` flag（会抑制所有实验性警告，掩盖其他潜在问题）
3. 无需修改 `bin/jarvis.js`，因为 `cli.ts` 是所有命令的入口点

**完成标准:**
- [x] 执行 `jarvis upgrade` 不出现 `ExperimentalWarning: SQLite` 警告
- [x] 执行 `jarvis add claude` 不出现该警告
- [x] 执行 `jarvis engine start` 不出现该警告
- [x] 其他非 SQLite 的 `ExperimentalWarning` 仍然正常输出

---

### TASK-009: 模板增加平台级规则读取指引

| 属性 | 值 |
|------|-----|
| task_id | TASK-009 |
| task_name | 模板增加平台级规则读取指引 |
| requirement_ids | [REQ-009] |
| type | 直接开发 |
| priority | P2 |
| estimated_lines | ~30 行 |
| granularity | M (涉及 50+ 模板文件, 但每文件变更为结构化的统一补丁) |
| test_strategy | manual_only |
| dependencies | [] |
| dependents | [] |
| risk | 中（涉及大量模板文件批量修改） |

**涉及文件:**
| 文件 | 所有权 |
|------|--------|
| `src/templates/platforms/claude/agents/*.md` (53 个) | 唯一修改者 |
| `src/templates/platforms/opencode/agents/*.md` (约 30 个) | 唯一修改者 |
| `src/templates/platforms/codex/agents/*.toml` (约 17 个) | 唯一修改者 |

**变更说明:**
1. 在每个 agent 模板的"技能加载"章节附近新增一段规则读取说明:
   ```markdown
   ## 平台规则加载

   启动时自动加载以下规则文件（如存在）:
   - `.claude/rules/*.md` — Claude Code 平台级规则
   - `AGENTS.md` / `CLAUDE.md` — 项目级行为准则
   规则变更后无需重启，下次对话自动生效。
   ```
2. Claude 模板: 引用 `.claude/rules/*.md`
3. OpenCode 模板: 引用 `.opencode/rules/*.md`
4. Codex 模板: 引用 `.codex/rules/*.md`（TOML 格式中作为 description 或 instruction 的一部分）

**实施策略:**
- 使用脚本批量追加统一段落到所有模板文件末尾，避免手动编辑 100+ 文件
- 脚本逻辑: 读取文件 → 检查是否已包含规则读取指引 → 未包含则追加

**完成标准:**
- [x] 所有 Claude agent 模板包含 `.claude/rules/*` 规则读取指引
- [x] 所有 OpenCode agent 模板包含 `.opencode/rules/*` 规则读取指引
- [x] 所有 Codex agent 模板包含 `.codex/rules/*` 规则读取指引
- [x] 已包含指引的模板不会被重复追加

---

## DDD 分类

仅 **TASK-007** 涉及 DDD 建模:

| 领域概念 | 说明 |
|---------|------|
| 聚合根 | `AgentItem` — 智能体配置实体，id 唯一标识 |
| 值对象 | `AgentSource` — 枚举值: 'template' / 'global' / 'project' |
| 领域服务 | `scanUserAgents(projectRoot)` — 扫描全局和项目级配置目录 |
| 合并策略 | 项目级 > 全局级 > 模板默认（覆盖优先级） |
| 边界上下文 | 智能体配置管理上下文（与模板安装上下文分离） |

---

## TDD 与直接开发分类

### TDD 任务

| TASK | REQ | 说明 |
|------|-----|------|
| TASK-003 | REQ-004 | 路径回退逻辑是核心业务规则（文件系统路径解析 + fallback），需保证编译后和本地开发的路径都正确 |
| TASK-007 | REQ-007 | 配置合并策略是核心业务逻辑（优先级覆盖规则），需覆盖 3 种场景的测试 |

### 直接开发任务

| TASK | REQ | 说明 |
|------|-----|------|
| TASK-001 | REQ-002 | 构建脚本配置变更，无业务逻辑 |
| TASK-002 | REQ-003 | 路径字符串替换，无业务逻辑 |
| TASK-004 | REQ-001 | 纯 HTML 侧边栏 UI 修改 |
| TASK-005 | REQ-006 | 前端 CDN 加载和 DOM 操作修复 |
| TASK-006 | REQ-005 | CLI 参数解析默认值调整，无复杂逻辑 |
| TASK-008 | REQ-008 | Node.js 进程事件监听，一行过滤 |
| TASK-009 | REQ-009 | 模板文件追加统一段落，批量脚本操作 |

---

## 风险任务

| TASK | 风险等级 | 风险描述 | 缓解措施 |
|------|---------|---------|---------|
| TASK-007 | 中 | 预估 80 行变更，涉及文件系统扫描 + 配置合并 + 缓存失效；修改共享区域 `agent-registry.ts` | TDD 先写测试，三种场景覆盖；使用 `existsSync` 兜底空目录 |
| TASK-009 | 中 | 涉及 100+ 模板文件批量修改，可能误改或漏改 | 使用脚本批量追加，先 dry-run 预览变更列表 |

---

## 文件所有权与共享路径提醒

### 文件所有权矩阵

| 文件 | TASK-001 | TASK-002 | TASK-003 | TASK-004 | TASK-005 | TASK-006 | TASK-007 | TASK-008 | TASK-009 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `package.json` | O | | | | | | | | |
| `src/install.ts` | | O | | | | | | | |
| `src/cli.ts` | | O | | | | O | | O | |
| `src/engine/agent-registry.ts` | | | O | | | | O | | |
| `src/web/views/agents.html` | | | | O | | | | | |
| `src/engine/server.ts` | | | | (O) | | | | | |
| `src/web/views/pipeline.html` | | | | | O | | | | |
| `src/templates/**` | | | | | | | | | O |

O = 唯一修改者 (Owner), (O) = 可选修改

### 共享路径风险

| 共享文件 | 涉及任务 | 串行顺序 | 风险说明 |
|---------|---------|---------|---------|
| `src/cli.ts` | TASK-002, TASK-006, TASK-008 | TASK-002 -> TASK-006 -> TASK-008 | 三个任务修改同一文件的不同函数，必须串行避免合并冲突 |
| `src/engine/agent-registry.ts` | TASK-003, TASK-007 | TASK-003 -> TASK-007 | TASK-007 在 TASK-003 的 fallback 逻辑之上构建，顺次集成 |

---

## 推荐交付顺序

```
第 1 批 (先决条件): TASK-001
    → 验证: npm run build && ls dist/src/templates/

第 2 批 (可并行): TASK-002, TASK-003, TASK-004, TASK-005
    → 验证: 各任务各自验证
    → 注意: TASK-003 的 fallback 逻辑必须在 TASK-001 完成后方可测试 dist/ 路径

第 3 批 (串行): TASK-006, TASK-007
    → TASK-006 在 TASK-002 修改后的 cli.ts 上继续
    → TASK-007 在 TASK-003 修改后的 agent-registry.ts 上继续
    → 验证: jarvis add（确认默认全部平台）; /api/agents?source=project

第 4 批 (收尾): TASK-008, TASK-009
    → TASK-008 在最终的 cli.ts 上添加 warning 过滤
    → TASK-009 使用脚本批量更新模板文件
    → 验证: jarvis upgrade（无警告）; 检查样本模板文件内容
```

---

## 推荐的下一步

- **planner** 读取本文档，制定第 1 批（TASK-001）的执行计划
- TASK-001 完成后，planner 可规划第 2 批的并行执行
- 建议先执行完整的 TASK-001 + TASK-002 + TASK-003 组合，验证 `jarvis upgrade` 命令从 build 到 run 的完整链路
