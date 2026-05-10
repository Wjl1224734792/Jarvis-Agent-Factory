# 执行计划：紧急 Bug 修复与体验优化

> 日期: 2026-05-09 | 版本: 1.0 | 状态: ready

---

## 1. 需求文档路径

`docs/requirements/2026-05-09-critical-bugfixes.md` — REQ-001 ~ REQ-009

## 2. 任务文档路径

`docs/tasks/2026-05-09-critical-bugfixes-tasks.md` — TASK-001 ~ TASK-009

## 3. Gate B 检查结果

| 检查项 | 状态 |
|--------|------|
| 任务 ID 完整（TASK-XXX 格式） | 通过 |
| 每个任务映射到至少一个 REQ-XXX | 通过 |
| 类型完整（前端/后端/共享/测试） | 通过 |
| 优先级完整 | 通过 |
| 完成标准完整 | 通过 |
| DDD 分类完整 | 通过（仅 TASK-007） |
| TDD / 直接开发分类完整 | 通过 |
| 风险任务已标注 | 通过 |
| 文件所有权提醒已写明 | 通过 |
| test_strategy 已指定 | 通过 |

**结论：任务文档通过 Gate B，可进入规划。**

## 4. 当前轮次目标

一次性交付所有 9 个任务，修复全部紧急 Bug 与体验缺陷，分 4 个串行批次执行。

## 5. 当前轮次范围

| REQ | 描述 | 涉及 TASK |
|-----|------|-----------|
| REQ-001 | 统一 Web 面板侧边栏导航 | TASK-004 |
| REQ-002 | 构建脚本复制模板目录到 dist | TASK-001 |
| REQ-003 | 修复 install.ts 模板路径适配编译后 | TASK-002 |
| REQ-004 | 修复 agent-registry.ts 模板路径回退 | TASK-003 |
| REQ-005 | 统一 CLI add/remove 无参数行为 | TASK-006 |
| REQ-006 | MD 文档抽屉渲染为 HTML 预览 | TASK-005 |
| REQ-007 | 全局/项目级智能体配置分类读取 | TASK-007 |
| REQ-008 | 抑制 SQLite ExperimentalWarning | TASK-008 |
| REQ-009 | 模板增加平台级规则读取指引 | TASK-009 |

## 6. 完成标准（轮次级）

- `npm run build` 成功，`dist/src/templates/` 存在
- 所有 CLI 命令（`jarvis upgrade/add/remove/diff`）无路径错误
- Web 面板侧边栏在所有页面统一显示 3 项导航
- Web 面板智能体列表非空且包含多来源配置
- 文档抽屉正常渲染 Markdown
- 无 SQLite ExperimentalWarning 输出
- 所有模板文件包含平台级规则读取指引

## 7. 是否需要先查阅 code-explore-expert / docs-research-expert

**不需要。** 所有根因已在需求文档中定位，所有代码路径已在本次规划中验证，无需额外探索。

## 8. 共享区域改动归属

| 共享文件 | 唯一责任方（Owner） | 涉及任务 | 串行顺序 |
|----------|-------------------|----------|---------|
| `src/cli.ts` | **TASK-002 先写**，TASK-006 接续，TASK-008 收尾 | TASK-002, TASK-006, TASK-008 | TASK-002 → TASK-006 → TASK-008 |
| `src/engine/agent-registry.ts` | **TASK-003 先写**，TASK-007 接续 | TASK-003, TASK-007 | TASK-003 → TASK-007 |
| `package.json` | TASK-001 独占 | TASK-001 | 无冲突 |
| `src/install.ts` | TASK-002 独占 | TASK-002 | 无冲突 |
| `src/web/views/agents.html` | TASK-004 独占 | TASK-004 | 无冲突 |
| `src/web/views/pipeline.html` | TASK-005 独占 | TASK-005 | 无冲突 |
| `src/engine/server.ts` | TASK-004 可选修改（/archive 路由） | TASK-004 | 无冲突 |
| `src/templates/**` | TASK-009 独占 | TASK-009 | 无冲突 |
| `tests/agent-registry.test.ts` | TASK-003 先写（RED 测试），TASK-007 追加 | TASK-003, TASK-007 | 串行 |

## 9. 串行/并行策略

### 依赖关系总览

```
TASK-001 (build fix)
  ├─→ TASK-002 (install.ts + cli.ts diffPlatform)
  │     └─→ TASK-006 (cli.ts add/remove)  ──→ TASK-008 (cli.ts SQLite warning)
  ├─→ TASK-003 (agent-registry.ts fallback)
  │     └─→ TASK-007 (agent-registry.ts global/project config)
  ├─→ TASK-004 (agents.html sidebar)  [独立]
  ├─→ TASK-005 (pipeline.html MD render)  [独立]
  └─→ TASK-009 (templates rule guidance)  [独立，依赖 TASK-001 用于验证]
```

### 并行组标注

- **Batch 1**: 仅 TASK-001，无并行对象
- **Batch 2**: TASK-002、TASK-003、TASK-004、TASK-005 并行
  - 四个任务修改不同文件，无共享冲突
  - TASK-002 需等待 TASK-001 完成（功能依赖 dist/src/templates）
  - TASK-003 需等待 TASK-001 完成（fallback 逻辑依赖 dist/ 路径存在）
- **Batch 3**: TASK-006、TASK-007 并行
  - 修改不同文件（cli.ts vs agent-registry.ts + tests），无共享冲突
- **Batch 4**: TASK-008、TASK-009 并行
  - 修改不同文件（cli.ts vs templates），无共享冲突

### 串行链

- `cli.ts` 链: TASK-002 → TASK-006 → TASK-008
- `agent-registry.ts` 链: TASK-003 → TASK-007
- `tests/agent-registry.test.ts` 链: TASK-003 → TASK-007

## 10. 风险提醒

| 风险项 | 等级 | 说明 | 缓解 |
|--------|------|------|------|
| TASK-009 批量修改 156 模板文件 | 中 | 脚本逻辑需幂等（不重复追加） | 先 dry-run 预览，追加前检查已有内容 |
| TASK-007 配置合并策略 | 中 | 三来源优先级合并，缓存失效时机需精确 | TDD 先写测试，三种场景全覆盖 |
| `cli.ts` 三任务串行 | 低 | 后写覆盖前写风险 | 串行执行，每批验证后再进入下一批 |
| 本地 dev 环境 vs npm 全局安装 | 低 | 路径差异可能导致 dev 环境回退 | TASK-003 的 fallback 逻辑显式处理 |
| `node:sqlite` 实验性 API | 低 | 未来 Node.js 版本可能移除 | 当前仅抑制警告，长期考虑迁移到 better-sqlite3 |

## 11. 实现者交接信息

- **所有批次完成后**需执行: `npm run check`（lint + typecheck + test）确保无回归
- **TASK-001** 完成后立即验证: `npm run build && ls dist/src/templates/platforms/claude/agents/`
- **TASK-002** 完成后验证: `npx tsx src/cli.ts upgrade`（本地 dev）不报 Source not found
- **TASK-003** 完成后验证: `npm test -- tests/agent-registry.test.ts`
- **TASK-007** 完成后验证: `npm test -- tests/agent-registry.test.ts`（追加测试通过）
- **TASK-008** 完成后验证: `npx tsx src/cli.ts --version` 无 ExperimentalWarning

## 12. plan patch / contract change request 触发条件

以下情况必须暂停当前执行，提交 plan patch：

1. **TASK-001 后** `dist/src/templates/` 目录结构与预期不符（子目录名变更）
2. **TASK-002/TASK-003 后** 路径回退逻辑在 npm 全局安装后仍然失败
3. **TASK-007 实现中** 全局/项目级配置目录结构需要调整（与预期 `~/.jarvis/agents/` 不同）
4. **TASK-008 实现中** `node:sqlite` 已被其他方式抑制，导致重复抑制或冲突
5. **TASK-009 执行中** 发现模板文件格式不一致，批量脚本需适配多种格式
6. 任何任务发现需修改 `server.ts` 路由结构（当前计划中仅 TASK-004 可选修改）

---

## 13. parallel_batches

### Batch 1（无依赖，硬前置）

- **TASK-001** → subagent_type: backend-dev-expert

> 验证命令: `npm run build && ls dist/src/templates/platforms/claude/agents/`

### Batch 2（依赖 Batch 1 全部完成，4 任务并行）

- **TASK-002** → subagent_type: backend-dev-expert
- **TASK-003** → subagent_type: backend-dev-expert
- **TASK-004** → subagent_type: frontend-ui-expert
- **TASK-005** → subagent_type: frontend-ui-expert

> 验证命令: 
> - `npx tsx src/cli.ts diff`（TASK-002）
> - `npm test -- tests/agent-registry.test.ts`（TASK-003）
> - 浏览器访问 `/agents` 侧边栏 3 项（TASK-004）
> - 浏览器访问 `/dashboard` 点击产物文件打开文档抽屉（TASK-005）

### Batch 3（依赖 Batch 2 全部完成，2 任务并行）

- **TASK-006** → subagent_type: backend-dev-expert
- **TASK-007** → subagent_type: backend-logic-expert

> 验证命令:
> - `npx tsx src/cli.ts add`（TASK-006，确认交互提示后安装全部平台）
> - `npm test -- tests/agent-registry.test.ts`（TASK-007）

### Batch 4（依赖 Batch 3 全部完成，2 任务并行）

- **TASK-008** → subagent_type: backend-dev-expert
- **TASK-009** → subagent_type: backend-dev-expert

> 验证命令:
> - `npx tsx src/cli.ts --version 2>&1 | grep -c ExperimentalWarning` 期望输出 0（TASK-008）
> - `grep -r "\.claude/rules/\*\.md" src/templates/platforms/claude/agents/ | wc -l` 期望 ≥53（TASK-009）

### 最终验证 Batch（依赖 Batch 4 全部完成）

> `npm run check`（lint + typecheck + test 全部通过）

---

## 14. Execution Packets

---

### task_id: TASK-001
### task_name: 构建脚本复制 templates 到 dist
### requirement_ids: REQ-002
### owner: backend-dev-expert
### objective: 在 `package.json` 的 `build` 脚本中追加 `cpSync` 调用，确保 `tsc` 编译后复制 `src/templates/` 目录到 `dist/src/templates/`
### in_scope:
- 修改 `package.json` 的 `build` 脚本，在现有 `cpSync('src/web/views', ...)` 之后追加 `cpSync('src/templates', 'dist/src/templates', {recursive: true})`
- 执行 `npm run build` 验证 `dist/src/templates/` 存在
- 执行 `ls dist/src/templates/platforms/claude/agents/` 验证 agent 模板文件存在
### out_of_scope:
- 不修改 `files` 字段（`dist/` 已包含）
- 不修改其他构建配置
- 不修改 `tsconfig.json`
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `package.json`
### forbidden_paths:
- `src/` 下任何文件
- `tsconfig.json`
- `.gitignore`
### dependencies: 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: []
### wait_for: []
### acceptance_criteria:
- `npm run build` 后 `dist/src/templates/` 目录存在
- `dist/src/templates/platforms/claude/agents/frontend-dev-expert.md` 文件存在
- `dist/src/templates/mcp-claude.json` 等 MCP 模板文件存在
- 原有 `dist/src/web/views/` 复制逻辑不受影响
### test_strategy: manual_only
### handoff_notes: 此任务为所有后续任务的前置条件。完成后必须执行 `npm run build` 验证，下游任务 TASK-002/TASK-003 依赖 `dist/src/templates/` 路径的存在。
### escalation_rule: 如需变更 `files` 字段、`tsconfig.json` 或其他构建配置，必须先回编排者，不得直接修改。

---

### task_id: TASK-002
### task_name: 修复 install.ts / diffPlatform 模板路径
### requirement_ids: REQ-003
### owner: backend-dev-expert
### objective: 将 `install.ts` 和 `cli.ts` 中从 `src/` 读取模板的路径改为从 `dist/src/` 读取，确保 npm 全局安装后正常工作
### in_scope:
1. `src/install.ts` 第 40 行：
   - 当前: `const srcRoot = resolve(pkgRoot, 'src', 'templates', 'platforms', platform);`
   - 修改为: `const srcRoot = resolve(pkgRoot, 'dist', 'src', 'templates', 'platforms', platform);`
2. `src/cli.ts` 第 298 行（`diffPlatform` 函数）：
   - 当前: `const srcRoot = resolve(PKG_ROOT, 'src', 'templates', 'platforms', platform);`
   - 修改为: `const srcRoot = resolve(PKG_ROOT, 'dist', 'src', 'templates', 'platforms', platform);`
### out_of_scope:
- 不修改路径 A 的 `TEMPLATES_DIR`（`install.ts` 第 10 行 `resolve(__dirname, 'templates')`，编译后自动指向 `dist/src/templates`）
- 不修改其他路径解析逻辑
- 不修改 `install.ts` 中 MCP 模板路径（`TEMPLATES_DIR` 已正确）
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/install.ts`
- `src/cli.ts`（仅第 298 行 diffPlatform 函数）
### forbidden_paths:
- `src/engine/agent-registry.ts`
- `src/web/views/` 下任何文件
- `package.json`
### dependencies:
- TASK-001 已完成（`dist/src/templates/` 存在）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-003, TASK-004, TASK-005]
### wait_for: [TASK-001]
### acceptance_criteria:
- 本地 dev 环境 `npx tsx src/cli.ts diff` 正常工作，不报 "Source not found"
- `npx tsx src/cli.ts upgrade` 正常执行（本地 dev 测试）
- `src/cli.ts` 第 298 行的 `diffPlatform` 使用 `dist/src/templates/...` 路径
- `src/install.ts` 第 40 行使用 `dist/src/templates/...` 路径
### test_strategy: manual_only
### handoff_notes:
- 此任务修改了 `src/cli.ts`，TASK-006 和 TASK-008 将在此修改基础上继续
- 确保 `diffPlatform` 函数的行为与 `install` 函数保持一致（都从 `dist/src/` 读）
- 本地 dev 环境测试使用 `npx tsx src/cli.ts diff` 而非 `npm run jarvis`
### escalation_rule: 如需修改 `TEMPLATES_DIR`、MCP 模板路径或其他路径解析逻辑，必须先回编排者。

---

### task_id: TASK-003
### task_name: 修复 agent-registry.ts 模板路径回退
### requirement_ids: REQ-004
### owner: backend-dev-expert
### objective: 为 `agent-registry.ts` 的 `getAgentList` 增加 fallback 逻辑，当编译后 `dist/src/templates` 不存在时回退到源码目录读取，确保本地 dev 和 npm 全局安装后均正常
### in_scope:
1. [RED] 在 `tests/agent-registry.test.ts` 编写测试：
   - 测试场景: 模拟 `dist/src/templates` 不存在时，自动 fallback 到 `src/templates`
   - Mock `existsSync` 控制路径存在与否
   - 验证 `getAgentList()` 返回非空数组
2. [GREEN] 在 `src/engine/agent-registry.ts` 实现：
   - 新增 `resolveTemplatesDir()` 函数，使用 `existsSync` 检测：
     - 优先路径: `dist/src/templates/platforms`（编译后）
     - 回退路径: 从源码目录读取（`resolve(__dirname, '..', '..', 'templates', 'platforms')`）
   - 将 `TEMPLATES_DIR` 改为惰性求值（通过 `resolveTemplatesDir()` 调用）
3. [REFACTOR] 确保 `getAgentList` 和 `scanPlatform` 使用惰性解析的路径
### out_of_scope:
- 不修改 `PLATFORM_CONFIG`
- 不修改图标推断、分类推断等逻辑
- 不添加新的 API 端点
- 不修改前端 `agents.html`
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/engine/agent-registry.ts`
- `tests/agent-registry.test.ts`（新建）
### forbidden_paths:
- `src/cli.ts`
- `src/install.ts`
- `src/web/views/`
- `package.json`
### dependencies:
- TASK-001 已完成（`dist/src/templates/` 存在，用于验证优先路径）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-002, TASK-004, TASK-005]
### wait_for: [TASK-001]
### acceptance_criteria:
- `npm test -- tests/agent-registry.test.ts` 全部通过
- 测试覆盖: dist 路径存在时返回非空列表；dist 路径不存在时 fallback 到源码
- `npx tsx src/cli.ts engine start` 后 Web 面板 `/agents` 页面能显示智能体列表
- 三个平台（Claude/OpenCode/Codex）切换均显示对应列表
### test_strategy: tdd
### handoff_notes:
- 此任务修改了 `src/engine/agent-registry.ts`，TASK-007 将在此 fallback 逻辑之上继续构建
- 测试文件 `tests/agent-registry.test.ts` 也会被 TASK-007 追加测试
- 确保 `resolveTemplatesDir()` 返回的路径在两种场景下都有效
- 注意: 当前 `__dirname` 是 `src/engine/`，回退路径是 `resolve(__dirname, '..', '..', 'templates', 'platforms')`
### escalation_rule: 如需修改 `PLATFORM_CONFIG`、`AgentItem` 类型或 API 响应结构，必须先回编排者。

---

### task_id: TASK-004
### task_name: 统一 agents.html 侧边栏导航
### requirement_ids: REQ-001
### owner: frontend-ui-expert
### objective: 在 `agents.html` 的侧边栏 `<nav>` 中补充"归档记录"链接，与 `pipeline.html` 的 3 项导航保持一致
### in_scope:
1. 修改 `src/web/views/agents.html` 的第 42-50 行 `<nav>` 区域：
   - 在"流水线看板"和"智能体配置"之间插入"归档记录"链接
   - 参照 `pipeline.html` 第 47-50 行样式：
     ```html
     <a href="/dashboard#/archive" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border-l-[3px] border-transparent transition-colors">
       <i data-lucide="archive" class="w-4 h-4"></i>
       归档记录
     </a>
     ```
2. 可选: 在 `src/engine/server.ts` 添加 `/archive` 路由重定向到 `/dashboard#/archive`
### out_of_scope:
- 不修改 `pipeline.html`（已正确包含归档链接）
- 不修改侧边栏其他部分（Logo、统计、MCP 状态）
- 不抽取共享侧边栏片段（超出本次修复范围）
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/web/views/agents.html`
- `src/engine/server.ts`（可选，仅追加 `/archive` 路由）
### forbidden_paths:
- `src/cli.ts`
- `src/install.ts`
- `src/engine/agent-registry.ts`
- `src/web/views/pipeline.html`
### dependencies: 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-002, TASK-003, TASK-005]
### wait_for: [TASK-001]
### acceptance_criteria:
- `agents.html` 侧边栏显示 3 项导航: 流水线看板、归档记录、智能体配置
- 点击"归档记录"链接跳转到 `/dashboard#/archive`
- 链接样式与 `pipeline.html` 侧边栏中一致
- 如果新增了 `/archive` 路由重定向，直接访问 `/archive` 不返回 404
### test_strategy: manual_only
### handoff_notes:
- 验证时启动引擎 `npx tsx src/cli.ts engine start`，浏览器访问 `http://localhost:3456/agents`
- 确认侧边栏有 3 项后，点击"归档记录"确认跳转到看板归档面板
### escalation_rule: 如需修改侧边栏结构、抽取共享片段或新增其他页面路由，必须先回编排者。

---

### task_id: TASK-005
### task_name: 修复 MD 文档抽屉渲染
### requirement_ids: REQ-006
### owner: frontend-ui-expert
### objective: 确保 `pipeline.html` 中"文档预览"抽屉的 Markdown 渲染正确工作，加强 CDN 加载失败的 fallback 提示
### in_scope:
1. 检查 `pipeline.html` 第 11 行 `marked` CDN 引入是否正确加载：
   - 当前: `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`
2. 检查 `openDocDrawer` 函数（第 815-851 行）：
   - 确认 `marked.parse(md)` 调用和 `innerHTML` 赋值逻辑正确
3. 加强 fallback 体验：
   - 当 `marked` 未加载时，显示友好提示而非仅纯文本源码：
     ```javascript
     content.innerHTML = '<div class="text-center py-12"><i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-3 text-amber-400"></i><p class="text-sm text-slate-500">Markdown 渲染库加载失败</p><p class="text-xs text-slate-400 mt-1">请检查网络连接后刷新页面</p></div>';
     ```
4. 可选: 添加备用 CDN（`unpkg.com/marked`）作为 `<script>` fallback
### out_of_scope:
- 不添加语法高亮库（如 highlight.js）
- 不修改文档抽屉的 UI 结构（宽度、动画等）
- 不修改其他 `.html` 文件
- 不添加 `marked` 的 `renderer` 自定义
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/web/views/pipeline.html`
### forbidden_paths:
- `src/cli.ts`
- `src/engine/`
- `src/web/views/agents.html`
### dependencies: 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-002, TASK-003, TASK-004]
### wait_for: [TASK-001]
### acceptance_criteria:
- 打开文档抽屉后，Markdown 内容渲染为格式化 HTML（标题/列表/代码块可见）
- 若 `marked` 库加载失败，显示明确的错误提示（而非纯文本源码）
- 正常情况：`marked` CDN 加载成功，`openDocDrawer` 渲染 HTML 内容
### test_strategy: manual_only
### handoff_notes:
- 验证时启动引擎，浏览器访问 `http://localhost:3456/dashboard`
- 选择有产物的会话，点击产物文件名旁的 span 打开文档抽屉
- 确认 Markdown 渲染为 HTML 而非纯文本
- 可通过浏览器 DevTools 阻止 `marked` CDN 加载来测试 fallback 提示
### escalation_rule: 如需添加语法高亮库、修改文档抽屉 UI 结构或修改 API 端点的文档获取逻辑，必须先回编排者。

---

### task_id: TASK-006
### task_name: 统一 CLI add/remove 无参数行为
### requirement_ids: REQ-005
### owner: backend-dev-expert
### objective: 修改 `jarvis add` 和 `jarvis remove` 的无参数默认行为，使其与 `jarvis init` 一致（默认安装/移除全部平台）
### in_scope:
1. `src/cli.ts` `case 'add':`（第 138-159 行）：
   - 当前: `platforms.length === 0` 时报错 `No valid platform specified`
   - 修改: 无平台参数时，`platforms = ALL_PLATFORMS`（全部平台）并弹出交互确认
2. `src/cli.ts` `case 'remove':`（第 162-195 行）：
   - 当前: `platforms.length === 0` 时报错 `No valid platform specified`
   - 修改: 无平台参数时，`platforms = ALL_PLATFORMS`（全部平台）并弹出交互确认
3. 非法平台名时保留原有报错逻辑
4. 不影响 `-y/--yes` 跳过确认的行为
### out_of_scope:
- 不修改 `jarvis init` 行为（已默认全部平台）
- 不修改 `jarvis upgrade` 行为
- 不修改 `parseArgs` 函数
- 不新增 CLI 参数
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/cli.ts`（仅 `case 'add'` 和 `case 'remove'` 代码块）
### forbidden_paths:
- `src/install.ts`
- `src/engine/`
- `src/web/views/`
- `package.json`
### dependencies:
- TASK-002 已完成（`src/cli.ts` 的 diffPlatform 路径已修复，此为在此基础上继续修改）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-007]
### wait_for: [TASK-002]
### acceptance_criteria:
- `jarvis add` 不带参数 → 提示"将安装全部平台（Claude Code / OpenCode / Codex）"并等待确认后执行
- `jarvis remove` 不带参数 → 提示"将移除全部平台"并等待确认后执行
- `jarvis add invalid-platform` → 报错 `No valid platform specified`，列出可用平台
- `jarvis add claude` 仍然正常工作（仅安装指定平台）
- `jarvis add -y` 跳过交互确认直接安装
### test_strategy: manual_only
### handoff_notes:
- TASK-008 将在此修改后的 `src/cli.ts` 上继续添加 SQLite warning 过滤
- 验证: `npx tsx src/cli.ts add`（无参数），确认交互确认后安装全部平台
- 注意: 如果此任务修改了 cli.ts 中的区域与 TASK-002 修改的区域有重叠，需先合并 TASK-002 的变更
### escalation_rule: 如需修改 `parseArgs`、`resolveScope`、`confirm` 或 `PLATFORMS` 常量，必须先回编排者。

---

### task_id: TASK-007
### task_name: 全局/项目级智能体配置分类读取
### requirement_ids: REQ-007
### owner: backend-logic-expert
### objective: 扩展 `agent-registry.ts`，增加全局配置（`~/.jarvis/agents/`）和项目级配置（`<project>/.claude/agents/`）扫描，实现三来源合并展示，项目级覆盖全局级
### in_scope:
1. [RED] 在 `tests/agent-registry.test.ts` 追加测试（在 TASK-003 测试基础上）：
   - 场景 1: 仅模板无全局/项目级 → 只返回模板 agents
   - 场景 2: 模板 + 全局配置 → 返回合并列表，source 标记正确
   - 场景 3: 模板 + 全局 + 项目级，同名 agent 项目级覆盖 → 验证覆盖优先级
2. [GREEN] 在 `src/engine/agent-registry.ts` 实现：
   - 新增值对象类型: `AgentSource = 'template' | 'global' | 'project'`
   - `AgentItem` 增加 `source?: AgentSource` 字段
   - 新增领域服务函数: `scanUserAgents(projectRoot?: string)`
     - 扫描 `~/.jarvis/agents/` 或 `~/.claude/agents/`（全局配置）
     - 扫描 `<projectRoot>/.claude/agents/`（项目级配置）
   - 合并策略: 项目级 > 全局级 > 模板默认（同名 id 按优先级覆盖）
   - 合并后的 agents 列表的 `source` 字段标记为实际来源
3. [REFACTOR] 缓存机制: 确保 `_agentList` 缓存与 source 信息兼容
### out_of_scope:
- 不修改前端 `agents.html` 的 UI（source 字段由前端自行使用）
- 不修改 `/api/agents` 的 API 路由（仅数据源变更）
- 不修改 MCP 工具接口
- 不修改数据库 Schema
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/engine/agent-registry.ts`
- `tests/agent-registry.test.ts`（追加测试）
### forbidden_paths:
- `src/cli.ts`
- `src/install.ts`
- `src/web/views/`
- `src/engine/server.ts`
- `src/engine/db.ts`
### dependencies:
- TASK-003 已完成（`agent-registry.ts` 的 fallback 逻辑已就位，`resolveTemplatesDir()` 已存在）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `test-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-006]
### wait_for: [TASK-003]
### acceptance_criteria:
- `npm test -- tests/agent-registry.test.ts` 全部通过
- 测试覆盖: 仅模板、模板+全局、模板+全局+项目级（项目级覆盖）三种场景
- `/api/agents` 返回的 `agents` 列表中 `source` 字段正确（`'template'` / `'global'` / `'project'`）
- 项目级同名智能体覆盖全局级和模板默认配置
- 空目录（无全局/项目级配置）不报错，仅返回模板 agents
### test_strategy: tdd
### handoff_notes:
- 确保在 TASK-003 的 `resolveTemplatesDir()` 基础上构建，不要覆盖 TASK-003 的变更
- 使用 `existsSync` 检查目录存在性，避免 `readdirSync` 在空目录上抛异常
- 全局目录 `~/.jarvis/agents/` 和 `~/.claude/agents/` 两个路径都需检查
- 项目级目录通过 `projectRoot` 参数传入，默认为 `'.'`
- 同名 agent 的匹配基于 `id`（如 `frontend-dev-expert`）
### escalation_rule: 如需修改数据库 Schema、API 端点签名、或变更合并策略优先级规则，必须先回编排者。

---

### task_id: TASK-008
### task_name: 抑制 SQLite ExperimentalWarning
### requirement_ids: REQ-008
### owner: backend-dev-expert
### objective: 在 `src/cli.ts` 入口添加 process warning 过滤，抑制 `node:sqlite` 的 `ExperimentalWarning`，同时保留其他实验性警告
### in_scope:
1. 在 `src/cli.ts` 文件最顶部（在所有 `import` 语句之前）添加 warning 过滤：
   ```typescript
   // 抑制 node:sqlite ExperimentalWarning（db.ts 使用 DatabaseSync）
   process.on('warning', (warn) => {
     if (warn.name === 'ExperimentalWarning' && String(warn.message).includes('SQLite')) return;
     console.warn(warn);
   });
   ```
2. 确认 `src/engine/db.ts` 第 1 行使用 `node:sqlite` 的 `DatabaseSync`
3. 验证所有 CLI 命令不再输出 SQLite 相关 ExperimentalWarning
### out_of_scope:
- 不修改 `src/engine/db.ts`
- 不使用 `--no-warnings` flag（会抑制所有实验性警告）
- 不修改 `bin/jarvis.js`
- 不迁移 `node:sqlite` 到 `better-sqlite3`
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/cli.ts`（仅文件顶部添加 warning 过滤代码）
### forbidden_paths:
- `src/engine/db.ts`
- `src/install.ts`
- `src/engine/agent-registry.ts`
- `bin/jarvis.js`
### dependencies:
- TASK-006 已完成（`src/cli.ts` 的 add/remove 修改已就位）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-009]
### wait_for: [TASK-006]
### acceptance_criteria:
- 执行 `npx tsx src/cli.ts --version` 不输出 `ExperimentalWarning: SQLite`
- 执行 `npx tsx src/cli.ts add claude` 不输出该警告
- 执行 `npx tsx src/cli.ts engine start` 不输出该警告
- 其他非 SQLite 的 `ExperimentalWarning` 仍然正常输出
### test_strategy: manual_only
### handoff_notes:
- 验证命令: `npx tsx src/cli.ts --version 2>&1 | grep -c "ExperimentalWarning"` 期望输出 `0`
- 如果其他 ExperimentalWarning 仍输出但被过滤，说明过滤逻辑范围过大，需调整
- 此任务是 cli.ts 链的最后一个修改，完成后不再有任务修改 cli.ts
### escalation_rule: 如需修改 `db.ts`、`bin/jarvis.js` 或引入其他 SQLite 库，必须先回编排者。

---

### task_id: TASK-009
### task_name: 模板增加平台级规则读取指引
### requirement_ids: REQ-009
### owner: backend-dev-expert
### objective: 在三个平台的所有智能体模板文件中追加平台级规则读取指引，确保新创建的智能体配置自动包含规则读取逻辑
### in_scope:
1. Claude 模板（53 个 `src/templates/platforms/claude/agents/*.md`）:
   - 在每个文件的"技能加载"章节附近或文件末尾追加：
     ```markdown
     ## 平台规则加载
     
     启动时自动加载以下规则文件（如存在）：
     - `.claude/rules/*.md` — Claude Code 平台级规则
     - `AGENTS.md` / `CLAUDE.md` — 项目级行为准则
     规则变更后无需重启，下次对话自动生效。
     ```
2. OpenCode 模板（约 57 个 `src/templates/platforms/opencode/agents/*.md`）:
   - 相同格式，引用 `.opencode/rules/*.md`
3. Codex 模板（46 个 `src/templates/platforms/codex/agents/*.toml`）:
   - 在 TOML 的 `description` 字段或文件末尾追加规则读取说明，引用 `.codex/rules/*.md`
4. 使用脚本批量追加，确保幂等（不重复追加已包含指引的文件）
### out_of_scope:
- 不修改模板的 frontmatter 字段
- 不修改模板的现有内容
- 不创建新的模板文件
- 不修改 MCP 配置文件
### input_documents:
- `docs/requirements/2026-05-09-critical-bugfixes.md`
- `docs/tasks/2026-05-09-critical-bugfixes-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/agents/*.md`
- `src/templates/platforms/opencode/agents/*.md`
- `src/templates/platforms/codex/agents/*.toml`
### forbidden_paths:
- `src/` 下非 templates 的文件
- `src/templates/mcp-*.json` / `src/templates/mcp-*.toml`
- `package.json`
### dependencies:
- TASK-001 已完成（模板已复制到 dist/src/templates/，验证时需 rebuild）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: [TASK-008]
### wait_for: [TASK-001]
### acceptance_criteria:
- 所有 Claude agent 模板（53 个）包含 `.claude/rules/*` 规则读取指引
- 所有 OpenCode agent 模板（约 57 个）包含 `.opencode/rules/*` 规则读取指引
- 所有 Codex agent 模板（46 个）包含 `.codex/rules/*` 规则读取指引
- 已包含指引的模板不会被重复追加（幂等性验证：运行脚本两次，grep 计数不变）
- `npm run build` 后 dist 中的模板也包含规则读取指引
### test_strategy: manual_only
### handoff_notes:
- **推荐使用 Node.js 脚本批量追加**，而非手动编辑 156 个文件
- 脚本逻辑: `readdirSync` → `readFileSync` → 检查是否已含 `.${platform}/rules/*.md` → 未包含则 `appendFileSync`
- 先 dry-run（列出将要修改的文件），经检查后再执行实际写入
- Claude/OpenCode 模板在末尾追加 Markdown 段落（`\n\n## 平台规则加载...`）
- Codex TOML 模板末尾以注释格式追加（`# 平台规则加载...`）
- 完成后执行 `npm run build` 验证 dist 模板同步
### escalation_rule: 如需修改模板 frontmatter、模板文件内容结构或新增模板文件，必须先回编排者。

---

## 15. 推荐下一步

1. 编排者按 Batch 1 → Batch 2 → Batch 3 → Batch 4 顺序派发 Execution Packet 给对应 subagent
2. Batch 2 是最大并行窗口（4 任务），建议同时启动以最大化并行效率
3. 所有批次完成后执行 `npm run check` 作为最终验证
4. 如需 E2E 验证，可用 `browser-test-expert` 手动验证 Web 面板的侧边栏和文档抽屉
