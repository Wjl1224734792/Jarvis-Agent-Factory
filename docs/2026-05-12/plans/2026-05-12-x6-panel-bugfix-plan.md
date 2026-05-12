# 执行计划：X6 面板 Bug 修复 + 文档/CLI 修复 + 指令模板同步

> **日期:** 2026-05-12
> **平台:** Claude（仅限）
> **策略:** 单轮次，3 个串行 Batch
> **总变更规模:** ~390 行（含文档更新，未超 1000 行阈值）

---

## 1. 输入文档

| 文档 | 路径 | 状态 |
|------|------|------|
| 需求文档 | `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md` | Gate A 通过 |
| DDD 文档 | `docs/tasks/2026-05-12-x6-panel-bugfix-ddd.md` | DDD 判定完成（无领域复杂性） |
| TDD 任务文档 | `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md` | Gate B 通过 |

---

## 2. Gate B 校验通过确认

全部条件已满足：
- [x] 任务 ID 完整（TASK-001 ~ TASK-013）
- [x] 每个任务均映射到至少一个 REQ-XXX（见附录 A 追溯矩阵）
- [x] 类型完整（前端/后端/共享）
- [x] 优先级完整、完成标准完整
- [x] DDD 分类完整（0 个 DDD 任务）、TDD/直接开发分类完整（2 TDD + 11 直接开发）
- [x] 风险任务已标注（TASK-003 中、TASK-010 中）
- [x] 文件所有权提醒已写明

**测试覆盖条件：**
- [x] TDD 任务（TASK-006, TASK-010）由实现代理在 Red 阶段编写测试——TDD 流程内化测试
- [x] 无 test_strategy=test_after 任务——全部非 TDD 任务为 manual_only
- [x] 无 E2E 测试需求——所有验证为视觉/手动

---

## 3. 当前轮次目标

修复 v3.41.0 X6 面板遗留的 5 个 UI/动画问题（REQ-001~005），同步修复 5 个后端文档系统问题（REQ-006~008, REQ-010~011），完成 3 项工程规范同步（REQ-009, REQ-012~013）。共计 13 条 REQ、13 个 TASK。

---

## 4. 当前轮次范围

### 包含

全部 13 个 TASK（TASK-001 ~ TASK-013），覆盖所有 13 条 REQ。

### 不包含

- Codex/OpenCode 平台的任何改动（仅 Claude 平台）
- X6 版本升级（保持 `@antv/x6` v2.19.2）
- DDD 建模（无领域复杂性）
- 新增 E2E 自动化测试套件

---

## 5. 完成标准

1. 所有 13 个 TASK 的验收条件通过（各自 Execution Packet 中定义）
2. `web/` 前端 TypeScript 编译无错误
3. `src/` 后端 TypeScript 编译无错误
4. TDD 任务（TASK-006, TASK-010）的测试用例全部通过
5. TASK-005 视觉质量验证：FlowChart + AgentGraph + 分割线行为正常
6. 单轮次总变更行数 <= 390（实际不超过约 420 行容忍度）
7. 无残留 `explore.md` 引用（TASK-011 grep 验证通过）

---

## 6. 是否需要先查阅 code-explore-expert

**不需要。** 理由：
- DDD 文档已明确标识"无领域复杂性"
- 任务文档已精确到函数名和行号
- 所有待修改文件路径明确，边界清晰
- 变更均为参数调整 / 条件收窄 / 路径修复，无需大规模架构理解

---

## 7. 执行代理分工

| TASK | 代理类型 | 理由 |
|------|---------|------|
| TASK-001 | `frontend-ui-expert` | X6 动画 hook 重构（`useX6Animation.ts`） |
| TASK-002 | `frontend-ui-expert` | X6 FlowChart 组件动画修复（`X6FlowChart.tsx`） |
| TASK-003 | `frontend-ui-expert` | X6 AgentGraph 组件稳定性修复（`X6AgentGraph.tsx`） |
| TASK-004 | `frontend-ui-expert` | Dashboard 垂直分割器（`Dashboard.tsx`） |
| TASK-005 | `frontend-ui-expert` | X6 面板视觉质量验证（截图对比 + 控制台检查） |
| TASK-006 | `backend-dev-expert` | gates.ts 文档路径修复 + 实时扫描（TDD） |
| TASK-007 | `frontend-ui-expert` | api.ts URL 编码修复（前端 API 层） |
| TASK-008 | `backend-dev-expert` | routes.ts + server.ts 根目录锚定 |
| TASK-009 | `backend-dev-expert` | docs/ 扁平目录向后兼容迁移 |
| TASK-010 | `backend-dev-expert` | install.ts + cli.ts Hash 路径统一（TDD） |
| TASK-011 | `backend-dev-expert` | /explore 重命名为 /browser-explore |
| TASK-012 | `backend-dev-expert` | 模板补齐 browser-explore 指令 |
| TASK-013 | `backend-dev-expert` | 6 个 Skill + Agent 定义文档规范同步 |

---

## 8. 共享区域改动归属

| 共享区域文件 | 唯一责任方 | 规则 |
|-------------|-----------|------|
| `web/src/hooks/useX6Animation.ts` | **TASK-001** | 仅 TASK-001 修改。TASK-002 和 TASK-003 消费其接口但不再修改。 |
| `web/src/pages/Dashboard.tsx` | **TASK-004** | 仅 TASK-004 修改。在 X6 容器之间插入分割线，不与 X6 组件冲突。 |
| `web/src/components/X6FlowChart.tsx` | **TASK-002** | 仅 TASK-002 修改。 |
| `web/src/components/X6AgentGraph.tsx` | **TASK-003** | 仅 TASK-003 修改。 |
| `src/engine/gates.ts` | **TASK-006** | 合并 REQ-006 + REQ-008 修改，同一 commit 内完成。 |
| `src/install.ts` | **TASK-010** | 与 `src/cli.ts` 配套修改。 |
| `src/cli.ts` | **TASK-010** | 与 `src/install.ts` 配套修改。 |
| `web/src/api.ts` | **TASK-007** | 仅 TASK-007 修改。 |
| `src/web/routes.ts` | **TASK-008** | 仅 TASK-008 修改。 |
| `src/engine/server.ts` | **TASK-008** | 仅 TASK-008 修改。 |
| `.claude/commands/explore.md` → `browser-explore.md` | **TASK-011** | 重命名 + 交叉引用更新。 |
| `src/templates/platforms/claude/commands/` | **TASK-012** | 新增 `browser-explore.md`。 |
| `.claude/skills/*/SKILL.md`（6 个文件） | **TASK-013** | 仅 TASK-013 修改。 |
| `.claude/agents/*.md` | **TASK-013** | 仅 TASK-013 修改（如有需要）。 |
| `docs/` 扁平目录文件 | **TASK-009** | 文件迁移操作。 |

---

## 9. 并行 / 串行策略

### 依赖关系总览

```
Batch 1（无前置，全部并行启动）
  ├── TASK-001  useX6Animation RAF 重构  [frontend-ui-expert]
  ├── TASK-004  Dashboard 分割边框        [frontend-ui-expert]
  ├── TASK-006  gates.ts TDD              [backend-dev-expert]
  ├── TASK-007  api.ts 编码修复           [frontend-ui-expert]
  ├── TASK-010  CLI Hash TDD              [backend-dev-expert]
  ├── TASK-011  explore 重命名             [backend-dev-expert]
  └── TASK-013  Skill 规范同步            [backend-dev-expert]

Batch 2（依赖 Batch 1 全部完成）
  ├── TASK-002  FlowChart 动画     [frontend-ui-expert]   ← 依赖 TASK-001
  ├── TASK-003  AgentGraph 稳定性  [frontend-ui-expert]   ← 依赖 TASK-001
  ├── TASK-008  根目录锚定         [backend-dev-expert]   ← 依赖 TASK-006
  └── TASK-012  模板补齐           [backend-dev-expert]   ← 依赖 TASK-011

Batch 3（依赖 Batch 1 + Batch 2 全部完成）
  ├── TASK-005  视觉质量验证  [frontend-ui-expert]  ← 依赖 TASK-001,002,003,004
  └── TASK-009  目录迁移      [backend-dev-expert]  ← 依赖 TASK-006
```

### 串行链

| 链 | 顺序 | 原因 |
|----|------|------|
| 链 A | TASK-001 → TASK-002, TASK-003 | useX6Animation 接口重构后，消费方才能适配 |
| 链 B | TASK-006 → TASK-008, TASK-009 | 文档路径修复后再做根目录锚定和目录迁移 |
| 链 C | TASK-011 → TASK-012 | 指令重命名完成后，模板才能复制新文件内容 |
| 链 D | TASK-001,002,003,004 → TASK-005 | 所有 X6 面板改完后再做视觉验证 |

### 并行组

| 并行组 | 涵盖 TASK | 说明 |
|--------|----------|------|
| Batch 1 内 | TASK-001, 004, 006, 007, 010, 011, 013 | 7 个任务无共享文件冲突 |
| Batch 2 内 | TASK-002, 003, 008, 012 | 4 个任务无共享文件冲突 |
| Batch 3 内 | TASK-005, 009 | 2 个任务无共享文件冲突 |

---

## 10. 风险提醒

| 风险 | 等级 | 相关 TASK | 描述 | 缓解措施 |
|------|------|-----------|------|---------|
| 力导向参数需要真实数据验证 | **中** | TASK-003 | `kRepel=800, kAttract=0.05` 可能不适用于所有场景 | 先用当前真实数据跑基线，调参后对比，目标 100-250px 范围 |
| Hash 路径影响升级安全 | **中** | TASK-010 | 路径错误可能导致用户文件误覆盖/误跳过 | TDD 覆盖全局/项目两种模式的路径一致性断言 |
| useX6Animation 去 deps 导致状态陈旧 | 低 | TASK-001 | useRef 持有 filter 引用，tick 函数读取 ref | 确保 ref.current 在每次渲染时更新 |
| X6 图在容器高度变化时布局异常 | 低 | TASK-004 | 分割线拖拽改变容器高度 | ResizeObserver 已有尺寸阈值守卫（TASK-003），松手触发 resize |
| 文档迁移破坏其他脚本引用 | 低 | TASK-009 | 迁移可能影响其他脚本对原路径的引用 | 原位置保留文件，不删除 |

### 垂直切片检查

全部 13 个 TASK 均为垂直切片——每个任务交付完整、可独立测试的端到端功能：
- TASK-001: 完整的 hook 重构，可直接在浏览器验证动画流畅度
- TASK-002/003: 完整的组件修复，可直接在浏览器观察动画行为
- TASK-004: 完整的分割线组件，可直接拖拽验证
- TASK-006: 完整的路径修复 + 实时扫描，可通过单元测试 + Dashboard 验证
- TASK-010: 完整的 Hash 路径统一，可通过单元测试 + `jarvis diff` 验证
- TASK-011~013: 完整的状态变更，可直接 grep / 文件存在性验证

**无水平切片任务。** 不存在"先全部数据库、再全部 API、再全部 UI"的拆分方式。

---

## 11. 实现者交接信息

### 给 Batch 1 代理的通用说明

1. **行为准则**：所有代理必须遵守 `behavioral-guidelines` 四项准则（先思考再编码、简单优先、精准修改、目标驱动）
2. **精准修改**：只改 Execution Packet 中 `in_scope` 的内容，不涉 `out_of_scope` 和 `forbidden_paths`
3. **共享区域红线**：TASK-001 是 `useX6Animation.ts` 的唯一修改者；TASK-006 是 `gates.ts` 的唯一修改者；TASK-010 是 `install.ts` + `cli.ts` 的唯一修改者
4. **TDD 代理**（TASK-006, TASK-010）：严格遵循 Red → Green → Refactor 三步流程

### 给 Batch 2 代理的通用说明

1. TASK-002 和 TASK-003 的代理：直接使用 TASK-001 重构后的 `useX6Animation` 接口（`nodeFilter` / `edgeFilter` 通过 `useRef` 传入，不再有 `deps` 参数）
2. TASK-008 的代理：TASK-006 已完成 `findSessionGateArtifacts` 修复，无需重复修改 `gates.ts`
3. TASK-012 的代理：TASK-011 已完成 `explore.md` → `browser-explore.md` 重命名，模板源文件直接使用 `.claude/commands/browser-explore.md`

### 给 Batch 3 代理的通用说明

1. TASK-005 的代理：不需要修改任何代码，仅执行视觉验证和截图对比
2. TASK-009 的代理：当前扁平目录文件在 `docs/requirements/` 和 `docs/tasks/` 下，需迁移到 `docs/<YYYY-MM-DD>/<subdir>/` 格式

---

## 12. Execution Packets

---

### task_id: TASK-001
### task_name: useX6Animation RAF 健壮性重构
### requirement_ids: REQ-004
### owner: frontend-ui-expert
### objective: 移除 useX6Animation 的 deps 参数，用 useRef 持有 filter 引用，防止 RAF 循环因数据轮询频繁重建
### in_scope:
- 移除 `useX6Animation` 函数的 `deps` 参数（函数签名变更）
- `breath.nodeFilter` 和 `dashFlow.edgeFilter` 改为通过 `useRef` 持有最新引用
- tick 函数从 ref 读取 filter，而非闭包变量
- RAF 循环仅在 `graph` 实例变化时重建（mount/unmount）
- 更新函数 JSDoc 注释
### out_of_scope:
- 不修改 `breathAmplitude`、`breathDuration`、`dashSpeed` 等动画参数
- 不修改 `NODE_SIZES`、`ANIMATION_DEFAULTS` 等共享常量
- 不修改 `X6FlowChart.tsx` 或 `X6AgentGraph.tsx`
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-004 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
- `docs/tasks/2026-05-12-x6-panel-bugfix-ddd.md`
### allowed_paths:
- `web/src/hooks/useX6Animation.ts`
### forbidden_paths:
- `web/src/components/X6FlowChart.tsx`
- `web/src/components/X6AgentGraph.tsx`
- `web/src/pages/Dashboard.tsx`
- `web/src/api.ts`
- `src/` 下所有文件
- `.claude/` 下所有文件
- `docs/` 下所有文件
### dependencies:
- 无外部依赖（消费方 TASK-002 和 TASK-003 在后续 Batch 适配）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `code-simplification`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: TASK-004, TASK-006, TASK-007, TASK-010, TASK-011, TASK-013
### wait_for: 无
### acceptance_criteria:
1. `useX6Animation` 不再接收 `deps` 参数
2. `nodeFilter` 和 `edgeFilter` 通过 `useRef` 持有，不在依赖数组中
3. 数据轮询（5s）不触发 RAF 循环销毁重建
4. 呼吸动画相位和虚线偏移在数据更新后保持连续，无跳帧
5. 动画在数据轮询前后保持流畅，无可见帧丢失
6. TypeScript 编译无错误
### test_strategy: manual_only
### handoff_notes:
- 修改后的函数签名必须与 TASK-002 和 TASK-003 兼容：调用方通过 `useRef` 传入 filter
- 如果函数签名变更较大，需在 `useX6Animation.ts` 文件顶部添加注释说明新用法
### escalation_rule: 如需变更共享常量 `NODE_SIZES` 或 `ANIMATION_DEFAULTS`，必须先回编排者，不得直接修改

---

### task_id: TASK-002
### task_name: FlowChart 节点动画修复——消除呼吸动画范围过宽和入场动画重播
### requirement_ids: REQ-002
### owner: frontend-ui-expert
### objective: 收窄 FlowChart 呼吸动画范围（仅当前 Gate + active Agent），防止数据轮询触发入场动画重播
### in_scope:
- 呼吸动画 `nodeFilter` 收窄：仅 `state === 'current'` 的 Gate + `status === 'active'` 的 Agent
- 渲染 effect 移除 `allAgents` 依赖（agent 子节点变化走 `addNode`/`removeNode` 增量更新）
- 使用 `prevNodeIdsRef` 记录已有节点 ID，入场动画仅对新 ID 执行
- dagre 布局确保相同 Gate 序列产生一致坐标
- 适配 TASK-001 重构后的 `useX6Animation` 接口（filter 通过 `useRef` 传入）
### out_of_scope:
- 不修改 `X6AgentGraph.tsx`
- 不修改 `useX6Animation.ts`
- 不修改 `Dashboard.tsx`
- 不修改边的虚线流动动画逻辑
- 不修改 NODE_SIZES 等共享常量
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-002 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `web/src/components/X6FlowChart.tsx`
### forbidden_paths:
- `web/src/hooks/useX6Animation.ts`
- `web/src/components/X6AgentGraph.tsx`
- `web/src/pages/Dashboard.tsx`
- `web/src/api.ts`
- `src/` 下所有文件
- `.claude/` 下所有文件
### dependencies:
- TASK-001（useX6Animation 重构后的接口）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-003, TASK-008, TASK-012
### wait_for: TASK-001
### acceptance_criteria:
1. 仅当前活跃 Gate（`state === 'current'`）播放呼吸动画；已通过和未来 Gate 完全静止
2. 仅 `active` 状态的 Agent 子节点播放呼吸动画；completed/failed 静止
3. 容器不再"放大放小"——非活跃节点静止
4. 数据轮询更新时，已有节点不重新播放入场动画；仅新增节点执行入场动画
5. dagre 布局稳定——相同 Gate 序列上节点坐标一致
6. 边虚线流动动画正常（active 边），不受上述修改影响
7. TypeScript 编译无错误
### test_strategy: manual_only
### handoff_notes:
- 必须在 TASK-001 完成后启动（需要重构后的 `useX6Animation` 接口）
- 如果 `useX6Animation` 新接口与预期不符，先反馈编排者，不要自行修改 hook 文件
### escalation_rule: 如需修改 `useX6Animation.ts`（已由 TASK-001 独有），必须先回编排者

---

### task_id: TASK-003
### task_name: AgentGraph 编排者稳定性修复——停止呼吸动画 + 力导向参数优化
### requirement_ids: REQ-003
### owner: frontend-ui-expert
### objective: 停止编排者呼吸动画、优化力导向参数使子 Agent 紧凑环形围绕、添加容器尺寸变化阈值守卫
### in_scope:
- 编排者从 `breath.nodeFilter` 中移除（仅保留静态发光效果）
- 子 Agent 呼吸仅 `active` 状态；completed/failed 静止
- 力导向参数调整：`kRepel=800, kAttract=0.05`，迭代 100 次，阻尼 0.85
- 添加容器尺寸变化阈值守卫：`if (Math.abs(newW - prevW) < prevW * 0.1) return;`
- 力导向后添加半径约束：节点距中心超过 300px 时回弹到 250px
- 适配 TASK-001 重构后的 `useX6Animation` 接口（filter 通过 `useRef` 传入）
### out_of_scope:
- 不修改 `X6FlowChart.tsx`
- 不修改 `useX6Animation.ts`
- 不修改 `Dashboard.tsx`
- 不修改编排者的静态发光效果 CSS/属性（如已有则保留）
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-003 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `web/src/components/X6AgentGraph.tsx`
### forbidden_paths:
- `web/src/hooks/useX6Animation.ts`
- `web/src/components/X6FlowChart.tsx`
- `web/src/pages/Dashboard.tsx`
- `web/src/api.ts`
- `src/` 下所有文件
- `.claude/` 下所有文件
### dependencies:
- TASK-001（useX6Animation 重构后的接口）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-002, TASK-008, TASK-012
### wait_for: TASK-001
### acceptance_criteria:
1. 编排者节点不播放呼吸动画，仅保持静态发光效果
2. 仅 `active` 状态的子 Agent 播放呼吸动画；completed/failed 静止
3. ResizeObserver 触发时，容器尺寸变化 < 10% 不重建整个图
4. 子 Agent 紧凑围绕编排者，呈环形/网状分布，距中心 100-250px
5. 编排者始终在 canvas 视觉中心，缩放和平移后相对位置不变
6. 无节点缩放抖动
7. TypeScript 编译无错误
### test_strategy: manual_only
### handoff_notes:
- **风险任务**：力导向参数可能需多轮微调。先用真实数据记录基线坐标，调参后对比
- 如果 `useX6Animation` 新接口与预期不符，先反馈编排者
- 力导向参数建议标记为可调常量，便于后续微调
### escalation_rule: 如需修改 `useX6Animation.ts`（已由 TASK-001 独有），必须先回编排者

---

### task_id: TASK-004
### task_name: 上下容器可拖拽分割边框
### requirement_ids: REQ-001
### owner: frontend-ui-expert
### objective: 在 Dashboard 的 FlowChart 和 AgentGraph 之间插入可拖拽的水平分割线，支持拖拽调整高度
### in_scope:
- 在 `Dashboard.tsx` 中 FlowChart 和 AgentGraph 容器之间插入水平拖拽分割线组件
- 鼠标事件绑定（mousedown/mousemove/mouseup）响应拖拽，实时调整两个容器高度
- 默认高度：FlowChart ~150px，AgentGraph 剩余空间
- FlowChart 最小高度 >= 80px，AgentGraph 最小高度 >= 150px
- 拖拽松手后高度保持，不随窗口 resize 重置
- 分割线样式：高度 6px，背景透明，hover 时显示 2px colorPrimary 横线
- 分割线中央拖拽手柄图标（`⠸` 或 `≡` 三条横线）
- 鼠标悬停光标 `row-resize`
### out_of_scope:
- 不修改三栏布局结构（中+右保持不变）
- 不修改 FlowChart 或 AgentGraph 组件的内部逻辑
- 不修改 `useX6Animation.ts`
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-001 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `web/src/pages/Dashboard.tsx`
### forbidden_paths:
- `web/src/hooks/useX6Animation.ts`
- `web/src/components/X6FlowChart.tsx`
- `web/src/components/X6AgentGraph.tsx`
- `web/src/api.ts`
- `src/` 下所有文件
- `.claude/` 下所有文件
### dependencies:
- 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-001, TASK-006, TASK-007, TASK-010, TASK-011, TASK-013
### wait_for: 无
### acceptance_criteria:
1. 分割线位于 FlowChart 和 AgentGraph 之间，默认约 150px / 剩余
2. 鼠标悬停分割线时，光标变为 `row-resize`，分割线高亮（colorPrimaryBg 背景）
3. 按住拖拽可上下移动分割线，实时调整两个容器高度
4. FlowChart 最小高度 >= 80px，AgentGraph 最小高度 >= 150px
5. 拖拽松手后高度保持，不随窗口 resize 重置
6. 分割线样式：高度 6px，背景透明，hover 时显示 2px colorPrimary 横线
7. 分割线中央有拖拽手柄图标（`⠸` 或 `≡`）
8. TypeScript 编译无错误
### test_strategy: manual_only
### handoff_notes:
- 分割线插入位置在 FlowChart 和 AgentGraph 的容器 div 之间，使用 inline style 控制高度
- 推荐使用 `useRef` 跟踪拖拽状态，避免 React 重渲染影响拖拽性能
- 使用 antd token `colorPrimary` 和 `colorPrimaryBg`，禁止硬编码颜色
### escalation_rule: 如需改变 Dashboard 三栏布局结构（非仅中栏内部），必须先回编排者

---

### task_id: TASK-005
### task_name: 视觉质量验证
### requirement_ids: REQ-005
### owner: frontend-ui-expert
### objective: 对 X6 面板所有修复进行全面的视觉验证，确保动画、布局、交互无回归
### in_scope:
- FlowChart 验证：12 个 Gate 节点水平排列、间距 >= 60px、无重叠、非当前 Gate 静止、当前 Gate 呼吸流畅
- AgentGraph 验证：编排者居中稳定、子 Agent 环形围绕、active 子 Agent 呼吸、无抖动
- 分割线验证：拖拽流畅、松手高度保持、最小高度约束生效
- 缩放/平移验证：两个图 Ctrl+滚轮缩放和拖拽平移正常
- 三视口截图对比（mobile/tablet/desktop）
- 控制台错误/警告检查（重点关注 X6 相关）
- 数据轮询验证：5s 轮询不触发动画重建
### out_of_scope:
- 不编写自动化测试脚本
- 不修改任何代码（纯验证任务）
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-005 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths: 无（纯验证）
### forbidden_paths: 全部（不修改任何文件）
### dependencies:
- TASK-001, TASK-002, TASK-003, TASK-004
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `verification-before-completion`
- `debugging-and-error-recovery`
### parallel_group: TASK-009
### wait_for: TASK-001, TASK-002, TASK-003, TASK-004
### acceptance_criteria:
1. FlowChart：12 个 Gate 节点水平排列、间距 >= 60px、无重叠、非当前 Gate 静止不动、当前 Gate 呼吸动画流畅
2. AgentGraph：编排者居中稳定、子 Agent 环形围绕、active 子 Agent 呼吸动画、无节点位置抖动
3. 分割线：拖拽流畅、松手后高度保持、最小高度约束生效
4. 缩放/平移：两个图均可 Ctrl+滚轮缩放和拖拽平移，不因分割线存在而受影响
5. 三视口截图（mobile/tablet/desktop）全部通过
6. 控制台无 X6 相关错误/警告
### test_strategy: manual_only
### handoff_notes:
- 本任务为 Gate C1（qa-review-expert）的前置验证，产出为视觉验证报告
- 如果发现问题，标注对应的 TASK 并提交 plan patch
- 截图保存到临时目录供审查使用
### escalation_rule: 如发现 X6 面板严重回归（节点不可见、图无法渲染），立即回编排者并阻止 merge

---

### task_id: TASK-006
### task_name: gates.ts 文档路径修复 + 当前 Gate 实时扫描（合并提交）
### requirement_ids: REQ-006, REQ-008
### owner: backend-dev-expert
### objective: 修复 findSessionGateArtifacts 扁平路径回退缺少 subdir 前缀的 bug，新增当前 Gate（无 checkpoint）的日期目录实时扫描功能
### in_scope:
- **REQ-006 修复（扁平路径回退）**：`findSessionGateArtifacts` 扁平目录回退分支返回的 filepath 改为 `${subdir}/${f}` 格式（与 `findGateArtifacts` line 208 一致）
- **REQ-008 新增（实时扫描）**：对于无 checkpoint 的 Gate（`checkpoints.length === 0`），使用当前日期（`new Date().toISOString().slice(0, 10)`）扫描 `docs/<today>/<subdir>/` 目录
- 编写单元测试覆盖：日期目录 + 扁平回退路径格式、有/无 checkpoint Gate、日期目录存在但无 .md、日期目录不存在
### out_of_scope:
- 不修改 `findGateArtifacts` 函数（它与 `findSessionGateArtifacts` 不同，聚焦 Session 级 artifact）
- 不修改前端代码
- 不修改 `GATE_DIRS` 映射
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-006, REQ-008 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
- `docs/tasks/2026-05-12-x6-panel-bugfix-ddd.md`
### allowed_paths:
- `src/engine/gates.ts`
- 测试文件（新建，路径遵循项目测试约定）
### forbidden_paths:
- `web/src/` 下所有文件
- `src/install.ts`
- `src/cli.ts`
- `src/web/routes.ts`
- `src/engine/server.ts`
- `.claude/` 下所有文件
### dependencies:
- 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-001, TASK-004, TASK-007, TASK-010, TASK-011, TASK-013
### wait_for: 无
### acceptance_criteria:
1. `findSessionGateArtifacts` 扁平目录回退返回 `${subdir}/${f}` 格式（非裸文件名）
2. 当前 Gate（无 checkpoint）产生的文档在 Dashboard 中立即可见
3. 无需刷新浏览器，下次数据轮询（<= 8s）后文档标签自动出现
4. 已通过的 Gate 无回归影响（仍通过 checkpoint 日期匹配）
5. 所有 5 个测试场景通过（日期+扁平路径格式、checkpoint Gate、无 checkpoint Gate、目录存在无 .md、目录不存在）
6. TypeScript 编译无错误
7. 现有测试（如有）不受影响
### test_strategy: tdd
### handoff_notes:
- **TDD 流程**：先写 Red（失败测试）→ 再写 Green（修复实现）→ 最后 Refactor（消除重复）
- 两个 REQ 合并提交：先修扁平路径 bug（REQ-006），再叠加实时扫描（REQ-008）
- 测试文件参考项目现有测试目录结构（`src/__tests__/` 或 `tests/`）
### escalation_rule: 如需修改 `findGateArtifacts`（非 `findSessionGateArtifacts`），必须先回编排者确认影响范围

---

### task_id: TASK-007
### task_name: api.ts URL 编码修复
### requirement_ids: REQ-006
### owner: frontend-ui-expert
### objective: 将前端 API 调用中的 `encodeURIComponent(filepath)` 改为逐段编码，保留路径分隔符 `/` 不被编码为 `%2F`
### in_scope:
- `web/src/api.ts` 中 line ~191 的 `encodeURIComponent(filepath)` 调用点
- 改为 `filepath.split('/').map(encodeURIComponent).join('/')`
- 逐段编码：每个路径段仍正确编码特殊字符，但 `/` 保留原样
### out_of_scope:
- 不修改后端路由或文档服务逻辑
- 不修改其他 API 调用点
- 不修改 `gates.ts`
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-006 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `web/src/api.ts`
### forbidden_paths:
- `web/src/hooks/useX6Animation.ts`
- `web/src/components/X6FlowChart.tsx`
- `web/src/components/X6AgentGraph.tsx`
- `web/src/pages/Dashboard.tsx`
- `src/` 下所有文件
- `.claude/` 下所有文件
### dependencies:
- 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-001, TASK-004, TASK-006, TASK-010, TASK-011, TASK-013
### wait_for: 无
### acceptance_criteria:
1. 包含 `/` 的文件路径（如 `2026-05-12/requirements/REQ-001.md`）的 API 请求中 `/` 不被编码为 `%2F`
2. 含特殊字符的路径段仍正确编码（如空格 → `%20`，中文 → `%E4%B8%AD`）
3. Dashboard 中所有 Gate 产物文档均可点击打开
4. TypeScript 编译无错误
### test_strategy: manual_only
### handoff_notes:
- 修改点极简（~10 行），确保精准修改，不引入额外逻辑
- 如果 `filepath` 可能为 `undefined`/`null`，添加空值保护
### escalation_rule: 如需修改 `gates.ts`（已由 TASK-006 独有），必须先回编排者

---

### task_id: TASK-008
### task_name: 文档根目录锚定——projectRoot 传递 + 防御性日志
### requirement_ids: REQ-007
### owner: backend-dev-expert
### objective: 确保后端文档服务的 docsDir 基于 projectRoot 而非 process.cwd()，并添加 404 防御性日志
### in_scope:
- `src/web/routes.ts` 中 `/api/docs/:filepath{.*}` 路由的 `docsDir` 基于 `projectRoot`（从 `startEngine({ projectRoot })` 传入）
- `src/engine/server.ts` 中确保 `projectRoot` 正确传递到路由处理函数
- 文档 404 时打印防御性日志（实际查找的完整路径）
### out_of_scope:
- 不修改 `gates.ts`
- 不修改前端 API 调用逻辑
- 不修改路径遍历防护（`startsWith(docsDir)` 不可移除）
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-007 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `src/web/routes.ts`
- `src/engine/server.ts`
### forbidden_paths:
- `src/engine/gates.ts`
- `src/install.ts`
- `src/cli.ts`
- `web/src/` 下所有文件
- `.claude/` 下所有文件
### dependencies:
- TASK-006（文档路径修复完成后处理，确保路径解析逻辑一致）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-002, TASK-003, TASK-012
### wait_for: TASK-006
### acceptance_criteria:
1. `docsDir` 基于 `projectRoot` 而非 `process.cwd()`
2. 文档 404 时打印完整查找路径便于排查
3. `docs/README.md` 可正常加载（根级文档支持验证）
4. 路径遍历防护 `startsWith(docsDir)` 保持完整
5. TypeScript 编译无错误
### test_strategy: manual_only
### handoff_notes:
- 如果 `projectRoot` 在当前 `startEngine` 签名中不可用，需要先确认如何获取（从配置、从环境变量、还是需新增参数）
- 防御性日志使用 `console.warn` 或项目统一日志工具
### escalation_rule: 如需变更 `startEngine` 的函数签名（新增 `projectRoot` 参数），必须确认调用方不受影响，必要时回编排者

---

### task_id: TASK-009
### task_name: 非日期目录结构向后兼容迁移
### requirement_ids: REQ-010
### owner: backend-dev-expert
### objective: 将 docs/ 下扁平目录中的文件迁移到日期目录结构，原位置保留文件实现向后兼容
### in_scope:
- 迁移 `docs/requirements/` 下 .md 文件到 `docs/2026-05-12/requirements/`
- 迁移 `docs/tasks/` 下 .md 文件到 `docs/2026-05-12/tasks/`
- 迁移 `docs/plans/` 下 .md 文件到对应日期目录（如有）
- 迁移 `docs/reviews/` 下 .md 文件到对应日期目录（如有）
- 迁移 `docs/testing/` 下 .md 文件到对应日期目录（如有）
- 原位置保留文件（复制而非移动，实现向后兼容）
### out_of_scope:
- 不删除原始文件（保留向后兼容）
- 不修改 `gates.ts` 的回退逻辑（已在 TASK-006 修复）
- 不修改其他脚本的文件引用
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-010 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `docs/requirements/`
- `docs/tasks/`
- `docs/plans/`
- `docs/reviews/`
- `docs/testing/`
- `docs/2026-05-12/`
### forbidden_paths:
- `web/src/` 下所有文件
- `src/` 下所有文件
- `.claude/` 下所有文件
### dependencies:
- TASK-006（文档路径修复完成后，确保迁移后路径解析正常）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: TASK-005
### wait_for: TASK-006
### acceptance_criteria:
1. 扁平目录中的 .md 文件已迁移到对应日期目录
2. 原位置保留文件（不删除）
3. 迁移后 Dashboard 文档加载不受影响
4. 历史 artifact 记录（DB 中的扁平路径）可继续解析
### test_strategy: manual_only
### handoff_notes:
- 当前已知扁平目录：`docs/requirements/`（1 个文件）、`docs/tasks/`（2 个文件）、`docs/plans/`（将由本计划创建）
- 文件日期从文件名前缀提取（如 `2026-05-12-xxx.md`），或使用文件修改日期
- 使用 `cp` 复制而非 `mv` 移动，确保原路径不受影响
### escalation_rule: 如需删除原位置文件（非保留），必须先回编排者确认

---

### task_id: TASK-010
### task_name: 全局 CLI Hash 路径统一——install.ts + cli.ts 对齐
### requirement_ids: REQ-011
### owner: backend-dev-expert
### objective: 统一 install.ts mergeDir 和 cli.ts diffPlatform 的 hash 文件存储/读取路径
### in_scope:
- 全局 hash 统一到 `~/.jarvis/file-hashes.json`（`mergeDir` 已使用此路径，`diffPlatform` 需从 `~/.claude/.jarvis/` 对齐）
- 项目级 hash 统一到 `<project>/.jarvis/file-hashes.json`
- 编写单元测试覆盖：全局模式路径一致性、项目模式路径一致性、jarvis diff 输出准确性
### out_of_scope:
- 不修改 hash 计算算法（`crypto.createHash` 逻辑）
- 不修改 `mergeDir` 的合并策略
- 不修改其他 CLI 命令
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-011 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
- `docs/tasks/2026-05-12-x6-panel-bugfix-ddd.md`
### allowed_paths:
- `src/install.ts`
- `src/cli.ts`
- 测试文件（新建，路径遵循项目测试约定）
### forbidden_paths:
- `web/src/` 下所有文件
- `src/engine/gates.ts`
- `src/web/routes.ts`
- `src/engine/server.ts`
- `.claude/` 下所有文件
### dependencies:
- 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `test-driven-development`
- `source-driven-development`
- `incremental-implementation`
- `verification-before-completion`
### parallel_group: TASK-001, TASK-004, TASK-006, TASK-007, TASK-011, TASK-013
### wait_for: 无
### acceptance_criteria:
1. 全局 hash 存储/读取统一到 `~/.jarvis/file-hashes.json`
2. `diffPlatform` 全局模式从 `~/.jarvis/file-hashes.json` 读取 hash（不再从 `~/.claude/.jarvis/`）
3. 项目级别 hash 存储/读取统一到 `<project>/.jarvis/file-hashes.json`
4. `jarvis diff` 输出准确：未修改文件显示 "up to date"，源变更但用户未改显示 "update"，用户已改显示 "skip (modified by user)"
5. `jarvis upgrade` 仅覆盖真正需要更新的文件
6. `jarvis add` 首次安装正确记录 hash，后续 upgrade 正确识别增量
7. 所有测试用例通过
8. TypeScript 编译无错误
### test_strategy: tdd
### handoff_notes:
- **风险任务**：hash 路径修改影响所有用户的 upgrade/diff 行为
- **TDD 流程**：先写 Red（路径一致性断言）→ 再写 Green（修改 diffPlatform 路径）→ 最后 Refactor（提取公共路径常量）
- 建议将全局 hash 路径和项目 hash 路径提取为共享常量，避免未来再次不一致
- 测试覆盖：全局模式读写路径一致、项目模式读写路径一致、未修改/需更新/用户修改三种 diff 输出
### escalation_rule: 如需修改 `mergeDir` 的写入逻辑（而非仅对齐 `diffPlatform` 的读取路径），必须先回编排者确认

---

### task_id: TASK-011
### task_name: /explore 重命名为 /browser-explore
### requirement_ids: REQ-012
### owner: backend-dev-expert
### objective: 将 `/explore` 指令文件重命名为 `/browser-explore`，同步更新所有交叉引用
### in_scope:
- `.claude/commands/explore.md` → `.claude/commands/browser-explore.md`（文件重命名）
- 用户级目录同步：`~/.claude/commands/explore.md` → `~/.claude/commands/browser-explore.md`（如存在）
- Grep 搜索 `/explore` 和 `explore.md` 的所有引用，逐一更新（Claude 平台文件：指令文档、skill 引用、Agent 文档、Web Commands 页面）
- 旧文件 `explore.md` 删除，新文件 `browser-explore.md` 创建
### out_of_scope:
- 不修改 `browser-explore.md` 的 frontmatter description（保持 "浏览器自由探索..." 不变）
- 不修改 Codex/OpenCode 平台文件（仅 Claude 平台）
- 不修改模板目录（`src/templates/`）——由 TASK-012 处理
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-012 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `.claude/commands/explore.md`（重命名为 `browser-explore.md`）
- `.claude/commands/browser-explore.md`（新建）
- `.claude/skills/` 下有 `explore` 引用的文件
- `.claude/agents/` 下有 `explore` 引用的文件
- `web/src/` 下有 `explore` 引用的文件（如 Web Commands 页面）
- `~/.claude/commands/` 用户级目录
### forbidden_paths:
- `src/` 下所有文件（除 `src/templates/`，由 TASK-012 处理）
- `node_modules/`
- `.codex/`
- `.opencode/`
### dependencies:
- 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: TASK-001, TASK-004, TASK-006, TASK-007, TASK-010, TASK-013
### wait_for: 无
### acceptance_criteria:
1. `/explore` 重命名为 `/browser-explore`
2. 旧文件 `explore.md` 删除，新文件 `browser-explore.md` 创建
3. 所有引用 `/explore` 或 `explore.md` 的 Claude 平台文件同步更新
4. 用户级目录同步：`~/.claude/commands/explore.md` → `~/.claude/commands/browser-explore.md`（如存在）
5. `grep -r "explore\.md" --include="*.md" --include="*.ts" --include="*.tsx" .claude/ web/src/` 无残留匹配（除文件名本身和上下文说明）
6. `grep -r "/explore" --include="*.md" .claude/` 无残留匹配（除 `/browser-explore` 自身）
### test_strategy: manual_only
### handoff_notes:
- 当前 `.claude/commands/` 下有 20 个指令文件（含 `explore.md`）
- 交叉引用范围需 grep 确认：`.claude/skills/` 下可能有 `/explore` 引用，`.claude/agents/` 下可能有 `explore.md` 引用
- 注意区分 `explore.md`（指令文件）和 `browser-explore`（通用描述）——仅替换指令文件引用
### escalation_rule: 如发现 Codex/OpenCode 平台文件也引用 explore.md（非仅 Claude 平台），先回编排者确认是否需要同步修改

---

### task_id: TASK-012
### task_name: 模板补齐 browser-explore 指令
### requirement_ids: REQ-013
### owner: backend-dev-expert
### objective: 将重命名后的 browser-explore.md 指令复制到模板目录，确保 jarvis install 安装时包含该指令
### in_scope:
- 创建 `src/templates/platforms/claude/commands/browser-explore.md`（内容来自 `.claude/commands/browser-explore.md`）
- 确保模板内容与项目指令文件一致
### out_of_scope:
- 不修改其他 19 条模板指令
- 不修改 `install.ts` 或 `cli.ts` 的安装逻辑
- 不修改 `browser-explore.md` 的内容（仅复制）
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-013 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `src/templates/platforms/claude/commands/browser-explore.md`（新建）
### forbidden_paths:
- `.claude/commands/` 下所有文件（TASK-011 已处理）
- `web/src/` 下所有文件
- `src/engine/` 下所有文件
- `.claude/skills/` 下所有文件
### dependencies:
- TASK-011（需要重命名完成后的 `.claude/commands/browser-explore.md` 作为模板源）
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `verification-before-completion`
### parallel_group: TASK-002, TASK-003, TASK-008
### wait_for: TASK-011
### acceptance_criteria:
1. `src/templates/platforms/claude/commands/browser-explore.md` 文件存在
2. 模板内容与项目 `.claude/commands/browser-explore.md` 一致（可 `diff` 验证）
3. 模板目录文件数从 19 变为 20
### test_strategy: manual_only
### handoff_notes:
- 当前模板目录 `src/templates/platforms/claude/commands/` 有 19 个 .md 文件
- 直接复制 `.claude/commands/browser-explore.md` 到模板目录即可
- 验证方式：`diff .claude/commands/browser-explore.md src/templates/platforms/claude/commands/browser-explore.md`
### escalation_rule: 如需修改 `browser-explore.md` 的内容（非仅复制），必须先回编排者

---

### task_id: TASK-013
### task_name: 文档目录结构规范同步——Skills + Agents
### requirement_ids: REQ-009
### owner: backend-dev-expert
### objective: 检查并更新 6 个 Skill 文件和 Agent 定义中的文件输出路径说明，统一使用日期目录结构
### in_scope:
- 检查 6 个 Skill 文件中涉及文件输出路径的说明：
  - `.claude/skills/spec-driven-development/SKILL.md`
  - `.claude/skills/planning-and-task-breakdown/SKILL.md`
  - `.claude/skills/test-driven-development/SKILL.md`
  - `.claude/skills/code-review-and-quality/SKILL.md`
  - `.claude/skills/shipping-and-launch/SKILL.md`
  - `.claude/skills/documentation-and-adrs/SKILL.md`
- 未使用日期目录格式的，更新为 `docs/<YYYY>-<MM>-<DD>/<subdir>/<filename>.md`
- 检查 `.claude/agents/` 下有写文件说明的 Agent 定义文件，同步更新
### out_of_scope:
- 不修改 Skill 文件的核心逻辑说明（仅修改路径格式）
- 不修改 Agent 定义的功能描述（仅修改路径格式）
- 不新增或删除 Skill 文件
### input_documents:
- `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`（REQ-009 章节）
- `docs/tasks/2026-05-12-x6-panel-bugfix-tasks.md`
### allowed_paths:
- `.claude/skills/spec-driven-development/SKILL.md`
- `.claude/skills/planning-and-task-breakdown/SKILL.md`
- `.claude/skills/test-driven-development/SKILL.md`
- `.claude/skills/code-review-and-quality/SKILL.md`
- `.claude/skills/shipping-and-launch/SKILL.md`
- `.claude/skills/documentation-and-adrs/SKILL.md`
- `.claude/agents/` 下有写文件说明的 Agent 定义文件
### forbidden_paths:
- `web/src/` 下所有文件
- `src/` 下所有文件
- `.claude/commands/` 下所有文件
- `docs/` 下所有文件（本任务仅修改 Skill/Agent 的路径说明，不修改文档内容）
### dependencies:
- 无
### required_skills:
- `behavioral-guidelines`
- `code-standards`
- `source-driven-development`
- `chinese-documentation`
- `verification-before-completion`
### parallel_group: TASK-001, TASK-004, TASK-006, TASK-007, TASK-010, TASK-011
### wait_for: 无
### acceptance_criteria:
1. 6 个 Skill 文件首段或"产物"章节明确标注日期目录格式
2. 日期格式使用 `new Date().toISOString().slice(0, 10)`
3. Gate→subdir 映射使用 `GATE_DIRS` 中定义的目录名
4. Agent 定义中如有写文件说明，同步更新目录约定
5. 所有 Skill 修改内容一致（统一使用日期目录结构）
6. `git diff` 审查通过，无无关修改
### test_strategy: manual_only
### handoff_notes:
- 本任务仅修改 .md 文档，不涉及 TypeScript 编译
- 每个 Skill 文件约 5 行变更（在路径说明处添加日期格式标注）
- 如果某个 Skill 文件中没有明确的路径说明，在首段添加规范说明
- 使用 `grep -r "docs/" .claude/skills/` 和 `grep -r "docs/" .claude/agents/` 找出所有路径引用
### escalation_rule: 如需修改 Skill 的核心逻辑或功能说明（非仅路径格式），必须先回编排者

---

## 13. parallel_batches

### Batch 1（无依赖，可同时启动）
- TASK-001 → subagent_type: frontend-ui-expert
- TASK-004 → subagent_type: frontend-ui-expert
- TASK-006 → subagent_type: backend-dev-expert
- TASK-007 → subagent_type: frontend-ui-expert
- TASK-010 → subagent_type: backend-dev-expert
- TASK-011 → subagent_type: backend-dev-expert
- TASK-013 → subagent_type: backend-dev-expert

### Batch 2（依赖 Batch 1 全部完成）
- TASK-002 → subagent_type: frontend-ui-expert（依赖 TASK-001）
- TASK-003 → subagent_type: frontend-ui-expert（依赖 TASK-001，可与 TASK-002 并行）
- TASK-008 → subagent_type: backend-dev-expert（依赖 TASK-006，可与 TASK-002/003 并行）
- TASK-012 → subagent_type: backend-dev-expert（依赖 TASK-011，可与 TASK-002/003/008 并行）

### Batch 3（依赖 Batch 1 + Batch 2 全部完成）
- TASK-005 → subagent_type: frontend-ui-expert（验证，依赖 TASK-001,002,003,004）
- TASK-009 → subagent_type: backend-dev-expert（迁移，依赖 TASK-006，可与 TASK-005 并行）

---

## 14. plan patch / contract change request 触发条件

以下情况需触发 plan patch（实现代理不自行处理，回编排者重新规划）：

| 条件 | 触发场景 |
|------|---------|
| `useX6Animation` 接口变更超出预期 | TASK-001 重构后函数签名与 TASK-002/003 预期不兼容 |
| 共享常量需修改 | `NODE_SIZES`、`ANIMATION_DEFAULTS`、`GATE_DIRS` 等需变更 |
| TASK-003 力导向参数失效 | 参数 `kRepel=800, kAttract=0.05` 在真实数据下无法达到 100-250px 范围 |
| `startEngine` 缺少 `projectRoot` | TASK-008 发现 `projectRoot` 在当前函数签名中不可用 |
| 交叉引用范围超出预期 | TASK-011 grep 发现大量非 Claude 平台文件引用 explore.md |
| TASK-006 测试发现路径逻辑复杂 | `findSessionGateArtifacts` 修复后发现比预期更多的分支需处理 |

---

## 15. 推荐的下一步

1. **启动 Batch 1 的 7 个任务**：编排者按 parallel_batches 格式并行 spawn Agent
2. **TASK-001 优先完成**：作为关键路径的前置（TASK-002/003 依赖它），应最早期交付
3. **TDD 任务关注**：TASK-006 和 TASK-010 需要先完成 Red 阶段（编写失败测试），再进入 Green
4. **TASK-003 预留调试时间**：力导向参数可能需要微调，不期望一次到位
5. **Batch 3 TASK-005 验证后进入 Gate C1**：qa-review-expert 对整体变更进行五轴审查

---

## 附录 A：REQ → TASK 追溯矩阵

| REQ | TASK | 简称 |
|-----|------|------|
| REQ-001 | TASK-004 | 可拖拽分割边框 |
| REQ-002 | TASK-002 | FlowChart 动画修复 |
| REQ-003 | TASK-003 | AgentGraph 编排者稳定性 |
| REQ-004 | TASK-001 | RAF 健壮性 |
| REQ-005 | TASK-005 | 视觉质量验证 |
| REQ-006 | TASK-006, TASK-007 | 文档加载修复（后端 + 前端） |
| REQ-007 | TASK-008 | 文档根目录锚定 |
| REQ-008 | TASK-006 | 当前 Gate 实时扫描 |
| REQ-009 | TASK-013 | Skill/Agent 规范同步 |
| REQ-010 | TASK-009 | 非日期目录迁移 |
| REQ-011 | TASK-010 | CLI Hash 路径统一 |
| REQ-012 | TASK-011 | explore 重命名 |
| REQ-013 | TASK-012 | 模板补齐 |

---

## 附录 B：TASK → 代理类型速查

| TASK | 代理类型 | test_strategy | Batch |
|------|---------|--------------|-------|
| TASK-001 | frontend-ui-expert | manual_only | 1 |
| TASK-002 | frontend-ui-expert | manual_only | 2 |
| TASK-003 | frontend-ui-expert | manual_only | 2 |
| TASK-004 | frontend-ui-expert | manual_only | 1 |
| TASK-005 | frontend-ui-expert | manual_only | 3 |
| TASK-006 | backend-dev-expert | tdd | 1 |
| TASK-007 | frontend-ui-expert | manual_only | 1 |
| TASK-008 | backend-dev-expert | manual_only | 2 |
| TASK-009 | backend-dev-expert | manual_only | 3 |
| TASK-010 | backend-dev-expert | tdd | 1 |
| TASK-011 | backend-dev-expert | manual_only | 1 |
| TASK-012 | backend-dev-expert | manual_only | 2 |
| TASK-013 | backend-dev-expert | manual_only | 1 |
