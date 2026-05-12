# TDD 测试驱动任务分解：X6 面板 Bug 修复 + 文档/CLI 修复 + 指令模板同步

> **日期:** 2026-05-12
> **需求文档:** `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md`
> **DDD 文档:** `docs/tasks/2026-05-12-x6-panel-bugfix-ddd.md`
> **平台:** Claude（仅限）
> **策略:** 垂直切片 + 并行分组
> **总变更规模:** ~390 行（含文档更新），无需多轮次拆分

---

## 1. 需求文档追溯

| 文档 | 状态 |
|------|------|
| `docs/requirements/2026-05-12-x6-panel-bugfix-resize-animation-layout.md` | Gate A 通过 |
| `docs/tasks/2026-05-12-x6-panel-bugfix-ddd.md` | DDD 判定完成（无领域复杂性） |

---

## 2. 任务概览

| TASK | 关联 REQ | 名称 | 类型 | 优先级 | 预估行数 | 风险 |
|------|---------|------|------|--------|---------|------|
| TASK-001 | REQ-004 | useX6Animation RAF 健壮性重构 | 直接开发 | P0 | ~60 | 低 |
| TASK-002 | REQ-002 | FlowChart 节点动画修复 | 直接开发 | P0 | ~50 | 低 |
| TASK-003 | REQ-003 | AgentGraph 编排者稳定性修复 | 直接开发 | P0 | ~40 | 中 |
| TASK-004 | REQ-001 | 上下容器可拖拽分割边框 | 直接开发 | P0 | ~50 | 低 |
| TASK-005 | REQ-005 | 视觉质量验证 | 直接开发 | P1 | 0 | 低 |
| TASK-006 | REQ-006, REQ-008 | gates.ts 文档路径修复 + 实时扫描（合并提交） | **TDD** | P0 | ~60 | 低 |
| TASK-007 | REQ-006 | api.ts URL 编码修复 | 直接开发 | P0 | ~10 | 低 |
| TASK-008 | REQ-007 | 文档根目录锚定 | 直接开发 | P2 | ~20 | 低 |
| TASK-009 | REQ-010 | 非日期目录结构向后兼容迁移 | 直接开发 | P2 | ~30 | 低 |
| TASK-010 | REQ-011 | 全局 CLI Hash 路径统一 | **TDD** | P0 | ~30 | 中 |
| TASK-011 | REQ-012 | /explore 重命名为 /browser-explore | 直接开发 | P1 | ~5 | 低 |
| TASK-012 | REQ-013 | 模板补齐 browser-explore 指令 | 直接开发 | P0 | ~5 + 新文件 | 低 |
| TASK-013 | REQ-009 | 文档目录结构规范同步（Skills + Agents） | 直接开发 | P1 | ~30 | 低 |

**分类统计：**
- TDD: 2 个任务（TASK-006, TASK-010），覆盖 3 条 REQ（REQ-006, REQ-008, REQ-011）
- 直接开发: 11 个任务，覆盖 10 条 REQ
- DDD: 0 个任务（无领域复杂性）

---

## 3. 任务详细分解

---

### TASK-001
- **task_name:** useX6Animation RAF 健壮性重构
- **requirement_ids:** [REQ-004]
- **type:** 直接开发
- **priority:** P0
- **estimated_lines:** ~60（M）
- **test_strategy:** manual_only（动画流畅度视觉验证）
- **涉及文件:**
  - `web/src/hooks/useX6Animation.ts`（主修改）
- **dependencies:** 无
- **parallel_group:** 可与 TASK-004, TASK-006, TASK-007, TASK-010, TASK-011, TASK-013 并行
- **风险等级:** 低
- **风险描述:** 去 deps 重构可能引入状态陈旧问题
- **缓解措施:** 使用 `useRef` 持有最新 filter 引用，确保 tick 函数读取的是最新值而非闭包变量
- **任务说明:**
  - 移除 `useX6Animation` 的 `deps` 参数
  - `breath.nodeFilter` 和 `dashFlow.edgeFilter` 通过 `useRef` 持有最新引用
  - tick 函数从 ref 读取 filter，而非闭包变量
  - RAF 循环仅在 `graph` 实例变化时重建（mount/unmount）
- **完成标准:**
  1. `useX6Animation` 不再接收 `deps` 参数
  2. `nodeFilter` 和 `edgeFilter` 通过 `useRef` 持有，不在依赖数组中
  3. 数据轮询（5s）不触发 RAF 循环销毁重建
  4. 呼吸动画相位和虚线偏移在数据更新后保持连续，无跳帧
  5. 动画在数据轮询前后保持流畅，无可见帧丢失
- **共享区域提示:** 本任务是 REQ-002/REQ-003 的前置依赖。修改后的 `useX6Animation` 接口由 TASK-002 和 TASK-003 消费。**TASK-001 必须先于 TASK-002 和 TASK-003 完成。**

---

### TASK-002
- **task_name:** FlowChart 节点动画修复——消除呼吸动画范围过宽和入场动画重播
- **requirement_ids:** [REQ-002]
- **type:** 直接开发
- **priority:** P0
- **estimated_lines:** ~50（S）
- **test_strategy:** manual_only（视觉验证：帧率、节点状态）
- **涉及文件:**
  - `web/src/components/X6FlowChart.tsx`（主修改）
  - 消费 TASK-001 重构后的 `useX6Animation` 接口
- **dependencies:** [TASK-001]
- **parallel_group:** 与 TASK-003 并行（两者修改不同文件 `X6FlowChart.tsx` vs `X6AgentGraph.tsx`）
- **风险等级:** 低
- **风险描述:** 渲染 effect 依赖优化后可能遗漏增量更新场景
- **任务说明:**
  - 呼吸动画 `nodeFilter` 收窄：仅 `state === 'current'` 的 Gate + `status === 'active'` 的 Agent
  - 渲染 effect 不依赖 `allAgents`（agent 子节点变化走增量更新 `addNode`/`removeNode` 而非全量 `clearCells`）
  - 使用 `prevNodeIdsRef` 记录已有节点 ID，入场动画仅对新 ID 执行
  - dagre 布局在相同 Gate 序列上产生一致坐标
- **完成标准:**
  1. 仅当前活跃 Gate（`state === 'current'`）播放呼吸动画；已通过和未来 Gate 完全静止
  2. 仅 `active` 状态的 Agent 子节点播放呼吸动画；completed/failed 静止
  3. 容器不再"放大放小"——非活跃节点静止
  4. 数据轮询更新时，已有节点不重新播放入场动画；仅新增节点执行入场动画
  5. dagre 布局稳定——相同 Gate 序列上节点坐标一致
  6. 边虚线流动动画正常（active 边），不受上述修改影响
  7. 动画帧率稳定 >= 30fps
- **共享区域提示:** 依赖 TASK-001 提供的 `useX6Animation` 接口。`X6FlowChart.tsx` 仅本任务修改，不与 TASK-003 冲突。

---

### TASK-003
- **task_name:** AgentGraph 编排者稳定性修复——停止呼吸动画 + 力导向参数优化
- **requirement_ids:** [REQ-003]
- **type:** 直接开发
- **priority:** P0
- **estimated_lines:** ~40（S）
- **test_strategy:** manual_only（视觉验证：编排者位置、环形分布）
- **涉及文件:**
  - `web/src/components/X6AgentGraph.tsx`（主修改）
  - 消费 TASK-001 重构后的 `useX6Animation` 接口
- **dependencies:** [TASK-001]
- **parallel_group:** 与 TASK-002 并行（两者修改不同文件）
- **风险等级:** **中**
- **风险描述:** 力导向参数调优需真实 Agent 数据验证，参数不理想需反复迭代
- **缓解措施:** 先用当前真实数据跑一遍记录基线坐标，调参后对比，目标子 Agent 距中心 100-250px
- **任务说明:**
  - 编排者从 `breath.nodeFilter` 中移除（仅保留静态发光效果）
  - 子 Agent 呼吸仅 `active` 状态；completed/failed 静止
  - 力导向参数调整：`kRepel=800, kAttract=0.05`，迭代 100 次，阻尼 0.85
  - 添加容器尺寸变化阈值守卫：`if (Math.abs(newW - prevW) < prevW * 0.1) return;`
  - 力导向后添加半径约束：节点距中心超过 300px 时回弹到 250px
- **完成标准:**
  1. 编排者节点不播放呼吸动画，仅保持静态发光效果
  2. 仅 `active` 状态的子 Agent 播放呼吸动画；completed/failed 静止
  3. ResizeObserver 触发时，容器尺寸变化 < 10% 不重建整个图
  4. 子 Agent 紧凑围绕编排者，呈环形/网状分布，距中心 100-250px
  5. 编排者始终在 canvas 视觉中心，缩放和平移后相对位置不变
  6. 无节点缩放抖动
- **共享区域提示:** 依赖 TASK-001 提供的 `useX6Animation` 接口。`X6AgentGraph.tsx` 仅本任务修改，不与 TASK-002 冲突。

---

### TASK-004
- **task_name:** 上下容器可拖拽分割边框
- **requirement_ids:** [REQ-001]
- **type:** 直接开发
- **priority:** P0
- **estimated_lines:** ~50（S）
- **test_strategy:** manual_only（手动拖拽验证）
- **涉及文件:**
  - `web/src/pages/Dashboard.tsx`（主修改——在 FlowChart 和 AgentGraph 容器之间插入分割线组件）
- **dependencies:** 无
- **parallel_group:** 可与 TASK-001, TASK-006, TASK-007, TASK-010, TASK-011, TASK-013 并行
- **风险等级:** 低
- **风险描述:** X6 图在容器高度变化时可能产生布局异常
- **缓解措施:** ResizeObserver + 尺寸变化阈值守卫（TASK-003 已有方案），分割线拖拽松手后触发一次 resize 通知
- **任务说明:**
  - 在 `Dashboard.tsx` 中 FlowChart 和 AgentGraph 容器之间插入水平拖拽分割线
  - 鼠标事件绑定响应拖拽，实时调整两个容器高度
  - 默认高度：FlowChart ~150px，AgentGraph 剩余空间
  - FlowChart 最小高度 >= 80px，AgentGraph 最小高度 >= 150px
- **完成标准:**
  1. 分割线位于 FlowChart 和 AgentGraph 之间，默认约 150px / 剩余
  2. 鼠标悬停分割线时，光标变为 `row-resize`，分割线高亮（colorPrimaryBg 背景）
  3. 按住拖拽可上下移动分割线，实时调整两个容器高度
  4. FlowChart 最小高度 >= 80px，AgentGraph 最小高度 >= 150px
  5. 拖拽松手后高度保持，不随窗口 resize 重置
  6. 分割线样式：高度 6px，背景透明，hover 时显示 2px colorPrimary 横线
  7. 分割线中央有拖拽手柄图标（`⠸` 或 `≡` 三条横线图标）
- **共享区域提示:** 仅修改 `Dashboard.tsx`，不与其他 TASK 的文件冲突。分割线插入位置在 FlowChart/AgentGraph 容器之间，不影响 X6 组件内部逻辑。

---

### TASK-005
- **task_name:** 视觉质量验证
- **requirement_ids:** [REQ-005]
- **type:** 直接开发
- **priority:** P1
- **estimated_lines:** 0（无代码变更，纯验证）
- **test_strategy:** manual_only（截图对比 + 控制台检查）
- **涉及文件:** 无（验证任务）
- **dependencies:** [TASK-001, TASK-002, TASK-003, TASK-004]
- **parallel_group:** 不可并行（需所有 X6 面板修改完成后验证）
- **风险等级:** 低
- **完成标准:**
  1. FlowChart：12 个 Gate 节点水平排列、间距 >= 60px、无重叠、非当前 Gate 静止不动、当前 Gate 呼吸动画流畅
  2. AgentGraph：编排者居中稳定、子 Agent 环形围绕、active 子 Agent 呼吸动画、无节点位置抖动
  3. 分割线：拖拽流畅、松手后高度保持、最小高度约束生效
  4. 缩放/平移：两个图均可 Ctrl+滚轮缩放和拖拽平移，不因分割线存在而受影响
  5. 三视口截图（mobile/tablet/desktop）全部通过
  6. 控制台无 X6 相关错误/警告

---

### TASK-006
- **task_name:** gates.ts 文档路径修复 + 当前 Gate 实时扫描（合并提交）
- **requirement_ids:** [REQ-006, REQ-008]
- **type:** **TDD**
- **priority:** P0
- **estimated_lines:** ~60（M）
- **test_strategy:** tdd（先编写单元测试覆盖路径分支，再修复实现）
- **涉及文件:**
  - `src/engine/gates.ts`（`findSessionGateArtifacts` 函数）
- **dependencies:** 无
- **parallel_group:** 可与 TASK-004, TASK-001, TASK-007, TASK-010, TASK-011, TASK-013 并行
- **风险等级:** 低
- **风险描述:** 同一函数两处变更，需注意合并顺序
- **缓解措施:** 合并为一个 commit，先修扁平路径前缀 bug（REQ-006），再叠加当前 Gate 实时扫描（REQ-008）
- **任务说明:**
  - **REQ-006（扁平路径回退修复）:** `findSessionGateArtifacts` 扁平目录回退分支（line 260-266）返回的 filepath 缺少 `subdir/` 前缀。修复为 `${subdir}/${f}` 格式，与 `findGateArtifacts`（line 208）一致。
  - **REQ-008（当前 Gate 实时扫描）:** 对于无 checkpoint 的 Gate（`checkpoints.length === 0`），当前逻辑直接返回空数组。新增 fallback：使用当前日期或 run 的 `started_at` 日期扫描 `docs/<date>/<subdir>/` 目录。
- **测试覆盖场景（Red → Green → Refactor）:**
  1. 日期目录 exist + flat fallback：filepath 为 `${subdir}/${filename}` 格式（非裸文件名）
  2. checkpoint Gate：按 checkpoint 日期正确匹配文档
  3. 无 checkpoint Gate：按当天日期目录正确扫描
  4. 日期目录存在但无 .md 文件：返回空数组
  5. 当天日期目录不存在：返回空数组（不报错）
- **完成标准:**
  1. `findSessionGateArtifacts` 扁平目录回退返回 `${subdir}/${f}` 格式
  2. 当前 Gate（无 checkpoint）产生的文档在 Dashboard 中立即可见
  3. 无需刷新浏览器，下次数据轮询（<= 8s）后文档标签自动出现
  4. 已通过的 Gate 无回归影响（仍通过 checkpoint 日期匹配）
  5. 所有测试用例通过
- **共享区域提示:** 本任务合并了 REQ-006 和 REQ-008 的 `gates.ts` 修改。**两个 REQ 修改同一函数 `findSessionGateArtifacts`，不可拆分并行，必须合并为一个提交。**

---

### TASK-007
- **task_name:** api.ts URL 编码修复
- **requirement_ids:** [REQ-006]
- **type:** 直接开发
- **priority:** P0
- **estimated_lines:** ~10（XS）
- **test_strategy:** manual_only（Dashboard 点击文档验证加载成功）
- **涉及文件:**
  - `web/src/api.ts`（line ~191，`encodeURIComponent` 调用点）
- **dependencies:** 无
- **parallel_group:** 可与 TASK-001, TASK-004, TASK-006, TASK-010, TASK-011, TASK-013 并行
- **风险等级:** 低
- **任务说明:**
  - 将 `encodeURIComponent(filepath)` 改为 `filepath.split('/').map(encodeURIComponent).join('/')`
  - 逐段编码保留 `/` 不被编码为 `%2F`
- **完成标准:**
  1. 包含 `/` 的文件路径（如 `2026-05-12/requirements/REQ-001.md`）的 API 请求中 `/` 不被编码为 `%2F`
  2. 含特殊字符的路径段仍正确编码（如空格 → `%20`）
  3. Dashboard 中所有 Gate 产物文档均可点击打开
- **共享区域提示:** 仅修改 `web/src/api.ts`。与 TASK-006 修改不同文件（`api.ts` vs `gates.ts`），可完全并行。

---

### TASK-008
- **task_name:** 文档根目录锚定——projectRoot 传递 + 防御性日志
- **requirement_ids:** [REQ-007]
- **type:** 直接开发
- **priority:** P2
- **estimated_lines:** ~20（XS）
- **test_strategy:** manual_only（访问 `docs/README.md` 验证 + 日志检查）
- **涉及文件:**
  - `src/web/routes.ts`（`/api/docs/:filepath{.*}` 路由）
  - `src/engine/server.ts`（`startEngine` 传递 `projectRoot`）
- **dependencies:** [TASK-006]（同属文档系统模块，建议在文档路径修复后处理）
- **parallel_group:** 不可并行
- **风险等级:** 低
- **任务说明:**
  - 后端 `/api/docs/:filepath{.*}` 的 `docsDir` 基于 `startEngine({ projectRoot })` 传入的 `projectRoot`，而非 `process.cwd()`
  - 文档 404 时添加防御性日志，打印实际查找的完整路径
- **完成标准:**
  1. `docsDir` 基于 `projectRoot` 而非 `process.cwd()`
  2. 文档 404 时打印完整查找路径便于排查
  3. `docs/README.md` 可正常加载（根级文档支持验证）
- **共享区域提示:** 修改 `src/web/routes.ts` 和 `src/engine/server.ts`，不与其他 TASK 冲突。

---

### TASK-009
- **task_name:** 非日期目录结构向后兼容迁移
- **requirement_ids:** [REQ-010]
- **type:** 直接开发
- **priority:** P2
- **estimated_lines:** ~30（XS）
- **test_strategy:** manual_only（Dashboard 文档加载验证）
- **涉及文件:**
  - `docs/requirements/`、`docs/tasks/`、`docs/plans/`、`docs/reviews/`、`docs/testing/` 下的 .md 文件
- **dependencies:** [TASK-006]（需在文档路径修复完成后，确保迁移后路径解析正常）
- **parallel_group:** 与 TASK-005, TASK-008, TASK-012 并行
- **风险等级:** 低
- **风险描述:** 迁移可能影响其他脚本对原路径的引用
- **缓解措施:** 原位置保留文件或软链接
- **任务说明:**
  - 将扁平日录（`docs/requirements/`、`docs/tasks/`、`docs/plans/`、`docs/reviews/`、`docs/testing/`）下的 .md 文件迁移到对应的 `docs/<YYYY-MM-DD>/<subdir>/` 目录
  - 原位置保留文件
  - 后端路径查找回退逻辑（已在 TASK-006 修复）可继续解析历史 DB 记录中的扁平路径
- **完成标准:**
  1. 扁平目录中的 .md 文件已迁移到最近日期目录
  2. 原位置保留文件（不删除）
  3. 迁移后 Dashboard 文档加载不受影响
  4. 历史 artifact 记录（DB 中的扁平路径）可继续解析

---

### TASK-010
- **task_name:** 全局 CLI Hash 路径统一——install.ts + cli.ts 对齐
- **requirement_ids:** [REQ-011]
- **type:** **TDD**
- **priority:** P0
- **estimated_lines:** ~30（S）
- **test_strategy:** tdd（先编写路径一致性测试，再统一实现）
- **涉及文件:**
  - `src/install.ts`（`mergeDir` 函数，line ~276）
  - `src/cli.ts`（`diffPlatform` 函数，line ~326）
- **dependencies:** 无
- **parallel_group:** 可与 TASK-001, TASK-004, TASK-006, TASK-007, TASK-011, TASK-013 并行
- **风险等级:** **中**
- **风险描述:** hash 路径修改影响所有用户的 upgrade/diff 行为，路径错误可能导致文件误覆盖
- **缓解措施:** TDD 覆盖全局/项目两种模式的路径一致性断言
- **任务说明:**
  - **根因:** `mergeDir`（install.ts）写入 hash 到 `~/.jarvis/file-hashes.json`，但 `diffPlatform`（cli.ts）从 `~/.claude/.jarvis/file-hashes.json` 读取——路径不一致导致永远找不到 hash
  - **修复:** 全局 hash 统一到 `~/.jarvis/file-hashes.json`；项目级统一到 `<project>/.jarvis/file-hashes.json`
- **测试覆盖场景（Red → Green → Refactor）:**
  1. 全局模式：`mergeDir` 写入路径与 `diffPlatform` 读取路径一致（`~/.jarvis/file-hashes.json`）
  2. 项目模式：写入路径与读取路径一致（`<project>/.jarvis/file-hashes.json`）
  3. `jarvis diff` 输出：未修改文件显示 "up to date"
  4. `jarvis diff` 输出：源变更但用户未改显示 "update"
  5. `jarvis diff` 输出：用户已改显示 "skip (modified by user)"
  6. `jarvis upgrade` 仅覆盖真正需要更新的文件
  7. `jarvis add` 首次安装正确记录 hash
- **完成标准:**
  1. 全局 hash 存储/读取统一到 `~/.jarvis/file-hashes.json`
  2. `diffPlatform` 全局模式从 `~/.jarvis/file-hashes.json` 读取 hash
  3. 项目级别 hash 存储/读取统一到 `<project>/.jarvis/file-hashes.json`
  4. `jarvis diff` 输出准确（up to date / update / skip）
  5. `jarvis upgrade` 仅覆盖真正需要更新的文件
  6. `jarvis add` 首次安装正确记录 hash，后续 upgrade 正确识别增量
  7. 所有测试用例通过
- **共享区域提示:** `src/install.ts` 和 `src/cli.ts` 配套修改，必须同一 TASK 完成。

---

### TASK-011
- **task_name:** /explore 重命名为 /browser-explore
- **requirement_ids:** [REQ-012]
- **type:** 直接开发
- **priority:** P1
- **estimated_lines:** ~5（XS）
- **test_strategy:** manual_only（grep 验证无残留引用）
- **涉及文件:**
  - `.claude/commands/explore.md` → `.claude/commands/browser-explore.md`（重命名）
  - `~/.claude/commands/explore.md` → `~/.claude/commands/browser-explore.md`（用户级同步）
  - 所有引用 `/explore` 或 `explore.md` 的 : 指令文档、skill 引用、Agent 文档、Web Commands 页面
- **dependencies:** 无
- **parallel_group:** 可与 TASK-001, TASK-004, TASK-006, TASK-007, TASK-010, TASK-013 并行
- **风险等级:** 低
- **任务说明:**
  - 重命名指令文件：`explore.md` → `browser-explore.md`
  - 更新所有交叉引用（Grep 搜索 `/explore` 和 `explore.md`，逐一替换）
  - 用户级 `.claude/commands/` 目录同步
- **完成标准:**
  1. `/explore` 重命名为 `/browser-explore`
  2. 旧文件 `explore.md` 删除，新文件 `browser-explore.md` 创建
  3. 所有引用 `/explore` 或 `explore.md` 的 Claude 平台文件同步更新
  4. 用户级目录同步：`~/.claude/commands/explore.md` → `~/.claude/commands/browser-explore.md`
  5. Web 面板 `/commands` 页面中的指令名称自动更新
  6. `grep -r "explore\.md"` 和 `grep -r "/explore"` 无残留匹配（除浏览器相关非指令用途）

---

### TASK-012
- **task_name:** 模板补齐 browser-explore 指令
- **requirement_ids:** [REQ-013]
- **type:** 直接开发
- **priority:** P0
- **estimated_lines:** ~5 + 1 新文件（XS）
- **test_strategy:** manual_only（`jarvis add claude --global` 验证）
- **涉及文件:**
  - `src/templates/platforms/claude/commands/browser-explore.md`（新建）
- **dependencies:** [TASK-011]（需 TASK-011 重命名完成后的 `browser-explore.md` 内容作为模板源）
- **parallel_group:** 不可并行（依赖 TASK-011）
- **风险等级:** 低
- **任务说明:**
  - 将 TASK-011 重命名后的 `.claude/commands/browser-explore.md` 内容复制到模板目录
  - 模板目录当前有 19 条指令，新增后为 20 条
- **完成标准:**
  1. `src/templates/platforms/claude/commands/browser-explore.md` 文件存在
  2. 模板内容与项目 `.claude/commands/browser-explore.md` 一致
  3. `jarvis add claude --global` 安装后，`~/.claude/commands/browser-explore.md` 存在且可被 Claude Code 发现
  4. 现有 19 条模板指令继续正常工作

---

### TASK-013
- **task_name:** 文档目录结构规范同步——Skills + Agents
- **requirement_ids:** [REQ-009]
- **type:** 直接开发
- **priority:** P1
- **estimated_lines:** ~30（S）
- **test_strategy:** manual_only（`git diff` 审查修改内容）
- **涉及文件:**
  - `.claude/skills/spec-driven-development/SKILL.md`
  - `.claude/skills/planning-and-task-breakdown/SKILL.md`
  - `.claude/skills/test-driven-development/SKILL.md`
  - `.claude/skills/code-review-and-quality/SKILL.md`
  - `.claude/skills/shipping-and-launch/SKILL.md`
  - `.claude/skills/documentation-and-adrs/SKILL.md`
  - `.claude/agents/` 下有写文件说明的 Agent 定义文件
- **dependencies:** 无
- **parallel_group:** 可与 TASK-001, TASK-004, TASK-006, TASK-007, TASK-010, TASK-011 并行
- **风险等级:** 低
- **任务说明:**
  - 检查每个 Skill 文件中涉及文件输出路径的说明
  - 未使用日期目录格式的，统一更新为 `docs/<YYYY>-<MM>-<DD>/<subdir>/<filename>.md`
  - 日期格式使用 `new Date().toISOString().slice(0, 10)`，Gate→subdir 映射见 `GATE_DIRS`
  - 同步更新 Agent 定义中有写文件说明的内容
- **完成标准:**
  1. 6 个 Skill 文件首段或"产物"章节明确标注日期目录格式
  2. Agent 定义中如有写文件说明，同步更新目录约定
  3. 所有 Skill 修改内容一致（统一使用日期目录结构）
  4. `git diff` 审查通过，无无关修改

---

## 4. DDD 分类

**结论：无领域复杂性，无 DDD 任务。**

| 判定依据 | 说明 |
|---------|------|
| DDD 适用条件 | "仅复杂业务逻辑（状态流转、多聚合交互）" |
| 本需求特征 | 全部为 Bug 修复、参数调整、文件重命名、模板补齐、文档更新 |
| 无领域要素 | 无聚合、无实体、无值对象、无领域服务、无领域事件 |
| REQ-008 条件分支 | 仅路径选择（日期目录 vs 扁平目录），非状态机/工作流 |

---

## 5. TDD 与直接开发分类

### TDD 任务（2 个）

| TASK | 覆盖 REQ | TDD 理由 |
|------|---------|---------|
| TASK-006 | REQ-006, REQ-008 | `findSessionGateArtifacts` 路径拼接涉及多个分支（日期目录 vs 扁平目录，有/无 checkpoint，当天目录存在/不存在），不同 filepath 格式产出不同结果。这是可复现 Bug，条件分支需单元测试覆盖。 |
| TASK-010 | REQ-011 | 三条 hash 路径（install.ts:mergeDir vs cli.ts:diffPlatform 全局 vs 项目级）一致性是高风险接口契约，路径错误会导致用户文件被误覆盖或误跳过。需测试覆盖全局/项目两种模式下的读写一致性。 |

**TDD 执行流程（Red → Green → Refactor）:**
1. Red: 先编写失败测试，覆盖各分支路径
2. Green: 用最小代码使测试通过
3. Refactor: 消除重复，改善可读性

### 直接开发任务（11 个）

| TASK | 覆盖 REQ | 验证方式 |
|------|---------|---------|
| TASK-001 | REQ-004 | 视觉验证：数据轮询前后动画连续、无丢帧 |
| TASK-002 | REQ-002 | 视觉验证：帧率 >= 30fps、非当前 Gate 静止、数据轮询不重建 |
| TASK-003 | REQ-003 | 视觉验证：编排者位置不动、子 Agent 环形分布、无抖动 |
| TASK-004 | REQ-001 | 手动拖拽验证：最小高度约束、松手保持、窗口 resize 不重置 |
| TASK-005 | REQ-005 | 截图对比（mobile/tablet/desktop）+ 控制台错误检查 |
| TASK-007 | REQ-006 | Dashboard 点击文档验证加载成功 |
| TASK-008 | REQ-007 | 访问 `docs/README.md` 验证 + 404 日志检查 |
| TASK-009 | REQ-010 | Dashboard 文档加载手动验证 |
| TASK-011 | REQ-012 | `grep -r "explore\.md"` 验证无残留引用 |
| TASK-012 | REQ-013 | `jarvis add claude --global` 验证 + 文件存在性检查 |
| TASK-013 | REQ-009 | `git diff` 审查修改内容 |

---

## 6. 风险任务

| TASK | 风险等级 | 风险描述 | 缓解措施 |
|------|---------|---------|----------|
| TASK-003 | **中** | 力导向参数调优需真实 Agent 数据验证，参数不理想需反复迭代 | 先用当前真实数据跑一遍记录基线坐标，调参后对比，目标子 Agent 距中心 100-250px |
| TASK-010 | **中** | hash 路径修改影响所有用户的 upgrade/diff 行为，路径错误可能导致文件误覆盖 | TDD 覆盖全局/项目两种模式的路径一致性断言 |
| TASK-001 | 低 | 去 deps 重构可能引入状态陈旧问题 | useRef 持有最新 filter 引用，确保 tick 读取最新值 |
| TASK-004 | 低 | X6 图在容器高度变化时可能产生布局异常 | ResizeObserver + 尺寸变化阈值守卫，分割线松手后触发一次 resize 通知 |

---

## 7. 文件所有权与共享区域

### 文件所有权分配

| 文件 | 负责 TASK | 共享区域冲突 |
|------|----------|-------------|
| `web/src/hooks/useX6Animation.ts` | **TASK-001**（唯一修改者） | **高** — TASK-002 和 TASK-003 消费其接口但不再修改。TASK-001 必须先完成。 |
| `web/src/components/X6FlowChart.tsx` | TASK-002 | 无冲突，仅本 TASK 修改 |
| `web/src/components/X6AgentGraph.tsx` | TASK-003 | 无冲突，仅本 TASK 修改 |
| `web/src/pages/Dashboard.tsx` | TASK-004 | 无冲突，分割线插入在 X6 组件容器之间 |
| `src/engine/gates.ts` | **TASK-006**（合并 REQ-006 + REQ-008） | **高** — 同一函数 `findSessionGateArtifacts` 两处变更，必须合并为一个提交 |
| `web/src/api.ts` | TASK-007 | 无冲突，仅本 TASK 修改 |
| `src/web/routes.ts` | TASK-008 | 无冲突，仅本 TASK 修改 |
| `src/engine/server.ts` | TASK-008 | 无冲突，仅本 TASK 修改 |
| `docs/` 扁平目录文件 | TASK-009 | 无冲突（文件迁移） |
| `src/install.ts` | **TASK-010** | **高** — 与 `src/cli.ts` 配套修改，必须同一 TASK 完成 |
| `src/cli.ts` | **TASK-010** | **高** — 与 `src/install.ts` 配套修改，必须同一 TASK 完成 |
| `.claude/commands/explore.md` | TASK-011 | 无冲突（文件重命名） |
| `src/templates/platforms/claude/commands/` | TASK-012 | 无冲突（新文件） |
| `.claude/skills/*/SKILL.md`（6 个文件） | TASK-013 | 无冲突（仅本 TASK 修改文档说明） |
| `.claude/agents/*.md` | TASK-013 | 无冲突（仅本 TASK 修改文档说明） |

### 关键共享区域约束

| 约束 | 涉及 TASK | 规则 |
|------|----------|------|
| `useX6Animation.ts` 串行 | TASK-001 → TASK-002, TASK-003 | **TASK-001 必须先完成**，TASK-002 和 TASK-003 才可开始（消费重构后的接口） |
| `gates.ts` 合并提交 | TASK-006 | REQ-006 + REQ-008 的 gates.ts 修改合并在同一个 commit，不可拆分 |
| `install.ts + cli.ts` 配套 | TASK-010 | 两个文件必须同一 TASK 修改，不可拆分 |
| TASK-011 → TASK-012 串行 | TASK-011 → TASK-012 | **TASK-011 必须先完成**（TASK-012 需要重命名后的 `browser-explore.md` 内容作为模板源） |

---

## 8. 推荐交付顺序

### 并行分组

```
Phase 1（并行启动，7 个任务）:
  TASK-001 (useX6Animation RAF)    ← 组1 前置
  TASK-004 (分割边框)               ← 组1 独立
  TASK-006 (gates.ts TDD)          ← 组2
  TASK-007 (api.ts 编码)           ← 组2 独立
  TASK-010 (CLI hash TDD)          ← 组3
  TASK-011 (/explore 重命名)       ← 组4 前置
  TASK-013 (Skill 规范同步)        ← 组5

Phase 2（并行启动，4 个任务）:
  TASK-002 (FlowChart 动画)        ← 依赖 TASK-001
  TASK-003 (AgentGraph 稳定性)     ← 依赖 TASK-001
  TASK-008 (根目录锚定)            ← 依赖 TASK-006
  TASK-012 (模板补齐)              ← 依赖 TASK-011

Phase 3（串行收尾，2 个任务）:
  TASK-005 (视觉质量验证)          ← 依赖 TASK-001~004
  TASK-009 (目录迁移)              ← 依赖 TASK-006
```

### 并行机会摘要

| 并行对 | 说明 |
|--------|------|
| TASK-002 + TASK-003 | 两者分别修改 `X6FlowChart.tsx` 和 `X6AgentGraph.tsx`，文件不同，可完全并行 |
| TASK-006 + TASK-007 | 两者分别修改 `gates.ts` 和 `api.ts`，文件不同，可完全并行 |
| 组1 + 组2 + 组3 + 组4 + 组5 | 五组之间无共享文件冲突，Phase 1 的 7 个任务可全部并行启动 |
| TASK-006 TDD Red + TASK-010 TDD Red | 两组测试可同时编写，互不阻塞 |

### 关键路径

```
TASK-001 (60行) → TASK-002/003 (50+40行) → TASK-005 (验证)
持续时间最长，是关键路径
```

---

## 9. 推荐的下一步

1. **TDD 任务先行编写测试**：TASK-006 和 TASK-010 应首先进入 Red 阶段（编写失败测试），确保测试覆盖所有条件分支。
2. **Phase 1 任务并行分发**：7 个 Phase 1 任务可同时开始，最大化并行效率。
3. **TASK-001 优先完成**：作为组1 的关键前置，TASK-001 应是最早完成的 Phase 1 任务。
4. **TASK-003 风险关注**：力导向参数调优可能需要多轮迭代，预留调试时间。
5. **TASK-010 风险关注**：hash 路径修改需通读 `install.ts` 和 `cli.ts` 中完整上下文后实现。

---

## 10. 验证清单

- [x] 所有 13 条 REQ 均至少映射到 1 个 TASK
- [x] 任务使用垂直切片策略（按功能路径而非技术层级）
- [x] 无水平切片任务
- [x] 每个 TASK 有明确的优先级和 test_strategy
- [x] 依赖关系已明确，无循环依赖
- [x] 并行机会已识别
- [x] 风险任务已标注（TASK-003 中、TASK-010 中）
- [x] 单轮次总变更 ~390 行，未超过 1000 行阈值
- [x] 共享区域已指定唯一责任方
- [x] 每个 TASK 有可独立验证的完成标准
- [x] TDD 任务有明确测试场景（Red → Green → Refactor）
- [x] 无 TASK 未映射到 REQ-XXX
- [x] 无 XL 任务
- [x] 共享文件冲突已标注串行依赖

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

## 附录 B：文件变更汇总

| 文件 | 操作 | TASK | 预估行数 |
|------|------|------|---------|
| `web/src/hooks/useX6Animation.ts` | 修改 | TASK-001 | ~60 |
| `web/src/components/X6FlowChart.tsx` | 修改 | TASK-002 | ~50 |
| `web/src/components/X6AgentGraph.tsx` | 修改 | TASK-003 | ~40 |
| `web/src/pages/Dashboard.tsx` | 修改 | TASK-004 | ~50 |
| `src/engine/gates.ts` | 修改 | TASK-006 | ~60 |
| `web/src/api.ts` | 修改 | TASK-007 | ~10 |
| `src/web/routes.ts` | 修改 | TASK-008 | ~10 |
| `src/engine/server.ts` | 修改 | TASK-008 | ~10 |
| `src/install.ts` | 修改 | TASK-010 | ~15 |
| `src/cli.ts` | 修改 | TASK-010 | ~15 |
| `.claude/commands/explore.md` | 删除 | TASK-011 | — |
| `.claude/commands/browser-explore.md` | 新建 | TASK-011 | ~5 |
| `src/templates/platforms/claude/commands/browser-explore.md` | 新建 | TASK-012 | ~5 |
| `.claude/skills/*/SKILL.md`（6 文件） | 修改 | TASK-013 | ~30 |
| `.claude/agents/*.md` | 修改 | TASK-013 | — |
| `docs/` 扁平目录文件 | 迁移 | TASK-009 | ~30 |
