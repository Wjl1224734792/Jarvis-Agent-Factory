# 任务文档：OpenCode 原生插件/工具机制集成

> 需求文档: `docs/requirements/2026-05-09-opencode-native-integration.md`
> 状态: confirmed | 日期: 2026-05-09 | 版本: 1.0

---

## 1. 任务概览

| 任务 | 映射 REQ | 名称 | 类型 | 优先级 | 预估行数 | 并行组 |
|------|---------|------|------|--------|---------|--------|
| TASK-001 | REQ-001 | Gate Hook 增强 | TDD | P0 | ~150 | Phase 1 |
| TASK-002 | REQ-002 | 原生自定义工具创建 | TDD | P0 | ~200 | Phase 1 |
| TASK-003 | REQ-003 | Agent 模板集对齐 | 直接开发 | P0 | ~120 | Phase 1 |
| TASK-004 | REQ-004 | Web 面板 OpenCode 适配 | 直接开发 | P1 | ~150 | Phase 2 |
| TASK-005 | REQ-005, REQ-006 | 引擎 MCP 与 platform_info 增强 | TDD | P0 | ~120 | Phase 1 |
| TASK-006 | REQ-007 | Install/Upgrade OpenCode 验证 | 直接开发 | P1 | ~80 | Phase 1 |

**总预估变更**: ~820 行（在 1000 行限制内）

---

## 2. 依赖关系与交付顺序

```
Phase 1（可并行，无共享文件冲突）
├── TASK-001 (jarvis-gate-check.ts)          ← 独立
├── TASK-002 (tools/*.ts，新目录)            ← 独立
├── TASK-003 (agents/*.md，两平台)           ← 独立
├── TASK-005 (server.ts)                     ← 独立
└── TASK-006 (install.ts)                    ← 独立

Phase 2（依赖 TASK-003 完成后的 Agent 数据）
└── TASK-004 (agent-registry.ts + routes.ts + agents.html)
    ↑ 依赖 TASK-003 完成 Agent 模板对齐后，验证 Web 面板显示完整性
```

### 并行性说明

- Phase 1 的 5 个任务各自修改不同文件集，无共享文件冲突，可**全部并行**执行。
- TASK-004 依赖 TASK-003 的 Agent 模板对齐结果（需要完整的 Agent 列表来验证 Web 面板显示），因此排在 Phase 2。TASK-004 与 Phase 1 的其他任务无依赖关系。

### 文件所有权与共享路径冲突检查

| 文件 | 唯一归属 | 共享冲突 |
|------|---------|---------|
| `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts` | TASK-001 | 无 |
| `src/templates/platforms/opencode/tools/*.ts` (新建) | TASK-002 | 无 |
| `src/templates/platforms/opencode/agents/*.md` | TASK-003 | 无 |
| `src/templates/platforms/claude/agents/*.md` | TASK-003 | 无 |
| `src/engine/agent-registry.ts` | TASK-004 | 无（TASK-005 只调用已有导出，不修改本文件） |
| `src/engine/server.ts` | TASK-005 | 无 |
| `src/web/routes.ts` | TASK-004 | 无 |
| `src/web/views/agents.html` | TASK-004 | 无 |
| `src/templates/mcp-opencode.json` | TASK-005 | 无 |
| `src/install.ts` | TASK-006 | 无 |

---

## 3. 任务分解

### TASK-001：OpenCode Gate Hook 增强

| 属性 | 值 |
|------|---|
| **任务 ID** | TASK-001 |
| **映射 REQ** | REQ-001 |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | ~150 行 (M) |
| **test_strategy** | tdd |
| **依赖** | 无 |
| **被依赖** | 无 |
| **风险等级** | 低 |
| **变更文件** | `src/templates/platforms/opencode/plugins/jarvis-gate-check.ts`（1 文件） |

**当前状态**: 仅实现 `tool.execute.after`（事后软告警）和 `session.idle`（状态显示）。缺少事前硬阻断和事件上报。

**变更内容**:
1. 增加 `tool.execute.before` hook：在 Task/Agent/Write/Edit/Bash 执行前，调用 `jarvis hook gate-check`；Gate 不满足时 `throw new Error(...)` 实现硬阻断
2. 增强 `tool.execute.after`：Task 执行后自动 `fetch()` 上报状态变更到引擎 Web API（`http://localhost:3456/api/events`）
3. 增强 `session.idle`：调用引擎 Web API 同步流水线状态到 dashboard
4. 增加 `session.error` 事件处理：错误时记录到引擎（`POST /api/events`）
5. 增加 `permission.asked` 事件处理：记录权限请求用于审计

**完成标准**:
- `tool.execute.before` 返回的 Error 能在 OpenCode 中阻断被监听工具的调用
- 会话结束后，Web dashboard（`/dashboard`）能展示该 OpenCode 会话的实时流水线状态
- 引擎数据库中能查询到 OpenCode 会话的错误事件和权限请求事件

---

### TASK-002：创建 OpenCode 原生自定义工具

| 属性 | 值 |
|------|---|
| **任务 ID** | TASK-002 |
| **映射 REQ** | REQ-002 |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | ~200 行 (M) |
| **test_strategy** | tdd |
| **依赖** | 无 |
| **被依赖** | 无 |
| **风险等级** | 低 |
| **变更文件** | `src/templates/platforms/opencode/tools/` 下 5 个新文件 |

**说明**: 新建 `tools/` 目录，每个工具是 MCP 引擎工具的语义化薄包装，使用 `@opencode-ai/plugin` 的 `tool()` 函数。

**变更内容（5 个工具文件，每个 ~30-40 行）**:

| 文件名 | 工具名 | 包装的 MCP 工具 | 产出 |
|--------|--------|----------------|------|
| `jarvis-gate-check.ts` | `jarvis-gate-check` | `gate_check` | 中文可读的 Gate 状态报告 |
| `jarvis-gate-advance.ts` | `jarvis-gate-advance` | `advance_gate` | 推进结果 + 下一步 Gate |
| `jarvis-pipeline-status.ts` | `jarvis-pipeline-status` | `pipeline_status` | 格式化流水线进度 |
| `jarvis-report.ts` | `jarvis-report` | `report_status` | 完整中文报告 |
| `jarvis-agent-config.ts` | `jarvis-agent-config` | `agent_config` | 配置确认中文回显 |

每个工具的共同要求：
- 使用 `tool()` 函数定义
- `describe()` 用中文描述参数和返回值
- args schema 有完整的中文 `describe()`
- 返回结果是格式化中文文本（非原始 JSON）

**完成标准**:
- OpenCode 会话中 AI 可调用这 5 个工具完成完整 Gate 流水线（检查 → 推进 → 状态查询 → 报告 → 配置）
- 每个工具返回格式化为中文可读文本
- 工具的 args schema 通过 `describe()` 提供中文参数说明

---

### TASK-003：对齐 OpenCode Agent 模板集与 Claude

| 属性 | 值 |
|------|---|
| **任务 ID** | TASK-003 |
| **映射 REQ** | REQ-003 |
| **任务类型** | 直接开发 |
| **优先级** | P0 |
| **预估变更行数** | ~120 行 (M) |
| **test_strategy** | test_after |
| **依赖** | 无 |
| **被依赖** | TASK-004（Phase 2 依赖） |
| **风险等级** | 低 |
| **变更文件** | `src/templates/platforms/opencode/agents/*.md`（若干文件修改/新增）、`src/templates/platforms/claude/agents/*.md`（可能新增） |

**说明**: Claude 平台 53 个 Agent，OpenCode 平台 58 个 Agent。两者命名体系不同（Claude 用 `-expert` 后缀，OpenCode 用 `-worker`/`-implementer` 后缀）。需确保功能覆盖一致。

**变更内容**:
1. 对比两平台 Agent 清单，列出缺失项（按角色/功能维度，非按命名维度）
2. 补充缺失 Agent 到对应平台（如 Claude 有但 OpenCode 无的功能角色，反之亦然）
3. 确保 OpenCode 模板使用正确的 frontmatter 格式（`mode: subagent/primary`、`permission:`、`model:`）
4. 确保 Agent 模板中不包含平台特定工具引用：
   - OpenCode 模板中不应有 `mcp__jarvis-engine__*` 前缀，应使用 `jarvis-*` 工具名（待 TASK-002 产出后）
   - Claude 模板中保留 `mcp__jarvis-engine__*` 前缀

**完成标准**:
- 两平台的 Agent 类型功能覆盖一致（同一角色在两边都有对应 Agent）
- OpenCode 模板的 frontmatter 格式符合 OpenCode 规范（YAML `---` 分隔，`mode`/`permission`/`model` 字段正确）
- Web 面板切换 OpenCode 平台后显示 50+ Agent（配合 TASK-004 验证）

> **注意**: TASK-003 不负责验证 Web 面板显示（由 TASK-004 负责）。TASK-003 仅确保模板文件内容正确。

---

### TASK-004：Web 面板 OpenCode 适配

| 属性 | 值 |
|------|---|
| **任务 ID** | TASK-004 |
| **映射 REQ** | REQ-004 |
| **任务类型** | 直接开发 |
| **优先级** | P1 |
| **预估变更行数** | ~150 行 (M) |
| **test_strategy** | manual_only |
| **依赖** | TASK-003（Agent 模板对齐完成后，验证 Web 面板显示完整性） |
| **被依赖** | 无 |
| **风险等级** | 中 |
| **变更文件** | `src/engine/agent-registry.ts`（扫描逻辑增强）、`src/web/routes.ts`（API 数据增强）、`src/web/views/agents.html`（前端类型标注） |

**说明**: 当前 `agent-registry.ts` 的 `scanPlatform` 函数仅扫描 `agents` 子目录（第 133 行 `if (subdir !== 'agents') return []`），导致 OpenCode 的 `plugins/` 目录不被扫描。Web 面板的 `/api/agents` 接口因此无法返回 plugin 类型项目。

**变更内容**:
1. `agent-registry.ts`：修改 `scanPlatform` 函数，对 OpenCode 平台增加 `plugins` 子目录扫描，plugin 文件标记 `subdir: 'plugins'` 和 `type` 区分
2. `routes.ts`：`/api/agents` 接口在返回数据中包含 `subdir` 字段，供前端区分 agent vs plugin
3. `agents.html`：在 Agent 卡片渲染中，对 `subdir === 'plugins'` 的项增加类型标识（如"插件"标签），区别于普通 agent

**完成标准**:
- `/agents` 页面选择 OpenCode 平台后，列表同时显示 agents 和 plugins，总计 50+ 项
- Plugin 项在前端列表中有明确的类型标识（如标签或图标），与 agent 项可区分
- 点击各 Agent/Plugin 卡片能查看详情弹窗
- 平台切换（全部/Claude/OpenCode/Codex）时缓存刷新正常，不出现旧数据残留

**风险说明**: 涉及共享数据结构 `AgentItem` 的扩展（增加 `subdir` 字段），需确认不影响现有 Claude/Codex 平台逻辑和前端渲染。

---

### TASK-005：引擎 MCP 适配 + platform_info 增强

| 属性 | 值 |
|------|---|
| **任务 ID** | TASK-005 |
| **映射 REQ** | REQ-005, REQ-006 |
| **任务类型** | TDD |
| **优先级** | P0 |
| **预估变更行数** | ~120 行 (M) |
| **test_strategy** | tdd |
| **依赖** | 无 |
| **被依赖** | 无 |
| **风险等级** | 低 |
| **变更文件** | `src/engine/server.ts`（MCP tool 定义增强）、`src/templates/mcp-opencode.json`（审核） |

**说明**: REQ-005（MCP 配置审核 + tool 描述适配）和 REQ-006（platform_info 增强）都涉及 `server.ts` 中的 MCP 工具定义，合并为一个任务以避免同一文件的编辑冲突。

**变更内容**:
1. 审核 `mcp-opencode.json`：确认 jarvis-engine MCP 配置正确、playwright 配置有效
2. `server.ts` MCP 工具描述优化：`gate_check`、`advance_gate`、`pipeline_status`、`report_status`、`agent_config` 工具增加平台识别注释（当 `platform=opencode` 时的特殊说明）
3. `platform_info` MCP 工具增强（`server.ts` 第 501-526 行）：
   - 增加平台特有功能返回：OpenCode 有 `plugins`，Claude 有 `commands`
   - 模型列表从硬编码补充改为基于 `agent-registry.ts` 的 `getPlatformModels()` 动态返回（已部分实现，需确认覆盖完整）
   - 确认不传参返回三平台完整信息、传 `platform=opencode` 返回 OpenCode 详细信息

**完成标准**:
- `jarvis engine start --stdio` 在 OpenCode 环境中正常启动，MCP 工具列表正确注册
- `platform_info` 不传参时返回三个平台的 agent_count + available_models + features
- `platform_info` 传 `platform=opencode` 时返回 OpenCode 详细信息，包含 `features: ["plugins"]`
- 统计数据与实际模板文件数量一致

---

### TASK-006：Install/Upgrade OpenCode 验证

| 属性 | 值 |
|------|---|
| **任务 ID** | TASK-006 |
| **映射 REQ** | REQ-007 |
| **任务类型** | 直接开发 |
| **优先级** | P1 |
| **预估变更行数** | ~80 行 (S) |
| **test_strategy** | manual_only |
| **依赖** | 无 |
| **被依赖** | 无 |
| **风险等级** | 中 |
| **变更文件** | `src/install.ts`（审核/可能修改）、`package.json`（审核） |

**说明**: `install.ts` 已有 OpenCode 安装逻辑，本任务聚焦于验证和修复端到端安装流程。

**变更内容**:
1. 审核 `src/install.ts`：确认 `jarvis add opencode` 流程完整（MCP 配置写入 `.opencode/opencode.json`、插件安装到 `.opencode/plugins/`、agents/skills 安装到 `.opencode/` 对应子目录）
2. 审核 `package.json` 的 `files` 字段（或 `.npmignore`）：确认 `dist/src/templates/platforms/opencode/` 目录在 npm pack 包内，且 `node_modules/` 不被错误打入
3. 检查 `dist/` 目录构建产物：确认 `agents/`、`plugins/`、`skills/`、`mcp-opencode.json` 模板文件均包含在内
4. 发现缺失或错误路径时修复

**完成标准**:
- `jarvis add opencode` 创建 `.opencode/` 目录，包含 `agents/`、`plugins/`、`skills/` 子目录及 `opencode.json` 配置
- `jarvis upgrade` 能更新已有 OpenCode 配置（增量合并，不覆写用户修改的文件）
- `npm pack --dry-run` 输出中包含 `dist/src/templates/platforms/opencode/` 的所有必要文件

**风险说明**: npm 打包配置错误可能导致生产安装丢文件；`node_modules/` 被打入包中可能导致包体积异常增大。需实际执行 `npm pack --dry-run` 验证。

---

## 4. DDD 分类

**本次需求无需 DDD**。原因：

- 所有变更均为已有架构内的增强和适配，不涉及新的聚合根、领域服务或领域事件
- Gate 逻辑（`gates.ts`）不在变更范围内
- 数据库 Schema 不在变更范围内
- 插件 Hook 事件处理属于基础设施层，非领域层

---

## 5. TDD 与直接开发分类

### TDD 任务（3 个）

| 任务 | 原因 |
|------|------|
| TASK-001 | Hook 拦截逻辑 = 核心业务规则（Gate 不满足时硬阻断）。需验证 before hook 的阻断行为、after hook 的上报行为、错误/权限事件的记录行为 |
| TASK-002 | 工具契约 = 接口契约验证。需验证每个工具的 args schema 正确性、返回结果中文格式正确性、错误处理行为 |
| TASK-005 | platform_info = 高风险接口契约 + 统计数据准确性。需验证三平台数据完整性、OpenCode 特有功能返回、模型列表动态扫描准确性 |

### 直接开发任务（3 个）

| 任务 | 原因 |
|------|------|
| TASK-003 | 模板文件 audit + frontmatter 修正 = 配置/内容工作。验证方式为文件内容对比和 Web 面板手动确认 |
| TASK-004 | Web UI + 注册表扫描逻辑 = 展示逻辑和数据适配。验证方式为浏览器手动验证显示效果 |
| TASK-006 | npm 打包验证 + 安装流程 = 部署/构建配置。验证方式为 CLI 命令实际执行确认 |

---

## 6. 风险任务

| 任务 | 风险等级 | 风险原因 |
|------|---------|---------|
| TASK-004 | 中 | 涉及 `AgentItem` 数据结构扩展（增加 `subdir` 字段），可能影响 Claude/Codex 平台的前端渲染逻辑和 API 接口返回格式 |
| TASK-006 | 中 | npm 打包配置错误可能导致生产安装时文件缺失；`node_modules/` 被打入包导致包体积膨胀 |

---

## 7. 推荐交付顺序

```
第 1 轮（Phase 1，5 个任务并行）：
  TASK-001   Gate Hook 增强              (~150 行)
  TASK-002   原生自定义工具               (~200 行)
  TASK-003   Agent 模板集对齐            (~120 行)
  TASK-005   引擎 MCP + platform_info    (~120 行)
  TASK-006   Install/Upgrade 验证        (~80 行)
  ─────────────────────────────────────────────
  小计: ~670 行

第 2 轮（Phase 2，1 个任务）：
  TASK-004   Web 面板 OpenCode 适配      (~150 行)
  ─────────────────────────────────────────────
  小计: ~150 行

总计: ~820 行
```

### 推荐执行顺序理由

1. Phase 1 全部并行：5 个任务无共享文件冲突，各自独立封闭，并行可最大化利用多人/多 Agent 资源
2. TASK-004 延迟到 Phase 2：需要 TASK-003 的 Agent 模板对齐完成后，才能验证 Web 面板显示 50+ 项的完整性

---

## 8. 推荐的下一步

1. **planner** 读取本文档，制定执行计划（第 1 轮优先）
2. Phase 1 的 5 个任务建议同时分派给不同实现者以最大化并行效率
3. TASK-003 的 Agent 差异清单产出后，planner 应将差异清单作为 TASK-004 的输入依据
4. 所有 TDD 任务（TASK-001, TASK-002, TASK-005）需在实现前编写测试用例
