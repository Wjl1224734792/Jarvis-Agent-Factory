# X6 面板 Bug 修复：可拖拽分割边框 + 节点动画修复 + 编排者居中环形布局

> **日期:** 2026-05-12
> **平台:** Claude（仅限，Codex/OpenCode 不涉及）
> **关联:** 上一轮 v3.41.0 X6 面板修复（REQ-008）
> **状态:** draft

## 背景

v3.41.0 修复了 X6 面板的核心布局（dagre 水平布局 + 力导向拓扑），但用户实际使用中发现以下遗留问题：

1. **上下容器高度固定不可调**：FlowChart（120px）和 AgentGraph（剩余空间）之间的分割线无法拖拽调整高度比例，用户无法根据需要灵活分配空间
2. **节点动画异常**：FlowChart 中 Gate 节点在一条直线上"鬼畜"抖动——所有节点（包括已通过和未来的）都在播放呼吸动画，且每次数据轮询（5s）触发整个图重建+入场动画重播
3. **编排者节点不稳定**：AgentGraph 中编排者节点莫名其妙地缩放抖动——编排者也被呼吸动画缩放，且 ResizeObserver 触发重建导致位置漂移
4. **环形布局效果不理想**：力导向布局参数不当（排斥力过大/引力过小），子 Agent 分散过远，未形成以编排者为中心的紧凑环形

## 根因分析（代码层面）

### 根因 1：呼吸动画范围过宽（X6FlowChart.tsx:488-497 + X6AgentGraph.tsx:595-603）

```typescript
// FlowChart — 所有 Gate + Agent 节点都呼吸
nodeFilter: (node) => {
  const data = node.getData();
  return data?.isGate || data?.isAgent;  // ← 应为仅 current Gate + active Agent
}

// AgentGraph — 编排者也呼吸
nodeFilter: (node) => {
  const data = node.getData();
  return data?.type === 'subagent' || data?.type === 'orchestrator'; // ← orchestrator 不应呼吸
}
```

### 根因 2：渲染 effect 依赖过多导致频繁重建（X6FlowChart.tsx:485）

```typescript
}, [gateStatusMap, currentGate, selectedGate, allAgents, bddSkipped, containerSize]);
```
每次数据轮询（5s）时 `agentStatus` 变化 → `allAgents` 重新计算 → 整个图 `clearCells()` + 重加节点 → 入场动画重播。

### 根因 3：useX6Animation deps 数组导致 RAF 循环频繁重建（useX6Animation.ts:159-167）

perf-review F3 已识别：`deps` 参数变化导致整个 tick 函数和 RAF 循环被销毁重建，丢失帧相位。

### 根因 4：力导向参数失衡（X6AgentGraph.tsx:182-183）

```typescript
const kRepel = 5000;     // 排斥力过大——节点被推远
const kAttract = 0.01;   // 引力过小——拉不回中心
```

80 次迭代后节点分散过远，未形成围绕编排者的紧凑拓扑。

### 根因 5：Dashboard 无垂直分割器（Dashboard.tsx:400-424）

FlowChart `height: 120` 固定不可调，AgentGraph `flex: 1` 填充剩余。两者之间无拖拽分割器。

---

## 需求清单

### REQ-001: 上下容器可拖拽分割边框

**优先级:** P0
**描述:** 在 FlowChart（上）和 AgentGraph（下）之间添加可拖拽的水平分割线，用户可上下拖动调整两个容器的高度比例。

**验收标准:**
- 分割线位于 FlowChart 和 AgentGraph 之间，默认高度约 150px（FlowChart）/ 剩余（AgentGraph）
- 鼠标悬停分割线时，光标变为 `row-resize`，分割线高亮（colorPrimaryBg 背景）
- 按住拖拽可上下移动分割线，实时调整两个容器高度
- FlowChart 最小高度 ≥ 80px，AgentGraph 最小高度 ≥ 150px
- 拖拽松手后高度保持，不随窗口 resize 重置
- 分割线样式：高度 6px，背景透明，hover 时显示 2px colorPrimary 横线
- 视觉提示：分割线中央有 `⠸` 拖拽手柄图标（或三条横线 ≡ 图标）

### REQ-002: 修复 FlowChart 节点动画——消除"直线上鬼畜"和容器整体缩放

**优先级:** P0
**描述:** 修复 FlowChart 中的异常动画行为。当前问题包括：(a) 所有 Gate 节点（已通过/当前/未来）都在播放呼吸动画，导致整个容器看起来在"放大放小"；(b) 数据轮询每 5s 触发 `clearCells()` + 入场动画重播，造成节点闪烁抖动。

**验收标准:**
- **呼吸动画范围收窄**：仅当前活跃 Gate（`state === 'current'`）播放呼吸动画；已通过和未来 Gate 保持完全静止
- **Agent 子节点**：仅 `active` 状态的 Agent 播放呼吸动画；completed/failed 静止
- **容器不再缩放**：非活跃节点静止 → 容器视觉稳定性显著提升，无"放大放小"观感
- **防止入场动画重播**：数据轮询更新时，已有节点不重新播放入场动画；仅真正新增的节点执行入场动画
- **布局稳定性**：dagre 布局在相同 Gate 序列上产生一致坐标，节点不因数据刷新而移位
- **边动画保留**：虚线流动动画正常（active 状态的边），不受上述修改影响
- 动画帧率稳定 ≥30fps，无可见抖动

**技术方案要点:**
- `useX6Animation` 的 `breath.nodeFilter` 改为仅匹配 `state === 'current'` 的 Gate 和 `status === 'active'` 的 Agent
- 渲染 effect 不依赖 `allAgents`（agent 子节点变化走增量更新 `addNode`/`removeNode` 而非全量 `clearCells`）
- 使用 `prevNodeIdsRef` 记录已有节点 ID，入场动画仅对新 ID 执行

### REQ-003: 修复 AgentGraph 编排者稳定性——停止"莫名其妙乱动"

**优先级:** P0
**描述:** 修复编排者节点的异常抖动：停止编排者的呼吸动画、防止 ResizeObserver 触发不必要的布局重建、调整力导向参数使子 Agent 紧凑围绕编排者。

**验收标准:**
- **编排者静止**：编排者节点不播放呼吸动画（仅保持静态发光效果）
- **子 Agent 呼吸**：仅 `active` 状态的子 Agent 播放呼吸动画；completed/failed 静止
- **编排者位置稳定**：ResizeObserver 触发时，如果容器尺寸变化 < 10%，不重建整个图（仅调整 Graph 尺寸）
- **环形布局效果**：子 Agent 紧凑围绕编排者，呈环形/网状分布，无明显过远节点
- **力导向参数优化**：子 Agent 距编排者中心距离在 100px-250px 范围内（取决于子 Agent 数量）
- 编排者始终在 canvas 视觉中心，缩放和平移后相对位置不变

**技术方案要点:**
- 编排者从 `breath.nodeFilter` 中移除
- 力导向参数调整：`kRepel=800, kAttract=0.05`，迭代 100 次，阻尼 0.85
- 添加容器尺寸变化阈值守卫：`if (Math.abs(newW - prevW) < prevW * 0.1) return;` 防止微小尺寸变化触发重建
- 力导向后添加半径约束：节点距中心超过 300px 时回弹到 250px

### REQ-004: 动画系统健壮性——防止 RAF 循环频繁重建

**优先级:** P1
**描述:** 修复 `useX6Animation` hook 因 deps 参数变化导致 RAF 循环频繁销毁重建的问题（perf-review F3）。

**验收标准:**
- `useX6Animation` 不因数据轮询（deps 变化）重建 RAF 循环
- 呼吸动画相位和虚线偏移在数据更新后保持连续（不跳帧）
- `nodeFilter` 和 `edgeFilter` 通过 `useRef` 持有最新引用，不在依赖数组中
- 动画在数据轮询前后保持流畅，无可见帧丢失

**技术方案要点:**
- `useX6Animation` 移除 `deps` 参数
- `breath.nodeFilter`、`dashFlow.edgeFilter` 通过 ref 持有，tick 函数读取 ref 而非闭包变量
- RAF 循环仅在 `graph` 实例变化时重建（mount/unmount）

### REQ-005: 视觉质量验证

**优先级:** P1
**描述:** 对所有修复进行全面的视觉验证，确保无回归。

**验收标准:**
- FlowChart：12 个 Gate 节点水平排列、间距 ≥60px、无重叠、非当前 Gate 静止不动、当前 Gate 呼吸动画流畅
- AgentGraph：编排者居中稳定、子 Agent 环形围绕、active 子 Agent 呼吸动画、无节点位置抖动
- 分割线：拖拽流畅、松手后高度保持、最小高度约束生效
- 缩放/平移：两个图均可 Ctrl+滚轮缩放和拖拽平移，不因分割线存在而受影响
- 三视口截图（mobile/tablet/desktop）全部通过
- 控制台无 X6 相关错误/警告

---

## 技术约束

1. **X6 版本**：`@antv/x6` v2.19.2，不可升级（避免破坏性变更）
2. **动画方式**：呼吸动画使用 `node.scale()`，不可改用 CSS animation（X6 内部机制限制）
3. **Token 体系**：所有颜色使用 antd token 或 CSS 变量，禁止硬编码 `#xxx`
4. **非侵入性**：不修改 `NODE_SIZES`、`ANIMATION_DEFAULTS` 等共享常量（除非必要）
5. **Dashboard 结构**：不改变 Dashboard 的三栏布局（中+右），仅在中栏内部添加垂直分割

### REQ-006: 修复文档加载失败——产物路径一致性

**优先级:** P0
**描述:** 修复 Dashboard 中点击 Gate 产物文档时某些文件加载失败的问题。根因有两处：

1. **`findSessionGateArtifacts` 扁平目录回退路径缺少 subdir 前缀**（`src/engine/gates.ts:260-266`）：当走"向后兼容：旧扁平结构"分支时，返回的 filepath 是裸文件名（如 `"2026-05-12-xxx.md"`），缺少 `{subdir}/` 前缀。`findGateArtifacts`（同名函数）在 line 208 已正确拼接 `${subdir}/${f}`，但 `findSessionGateArtifacts` 的扁平回退未拼接，是不一致 bug。

2. **前端 `encodeURIComponent` 将路径中的 `/` 编码为 `%2F`**（`web/src/api.ts:191`）：某些 HTTP 服务器/路由器可能在路由匹配前解码 `%2F`，导致 `/api/docs/2026-05-12%2Frequirements%2FREQ-001.md` 被错误解析。

**验收标准:**
- `findSessionGateArtifacts` 扁平目录回退返回 `${subdir}/${f}` 格式（与 `findGateArtifacts` 一致）
- 前端 API 调用改为逐段编码：`filepath.split('/').map(encodeURIComponent).join('/')`，保留 `/` 不编码
- Dashboard 中所有 Gate 产物文档均可点击打开，不再出现"文档加载失败"
- 日期目录格式（`docs/YYYY-MM-DD/subdir/file.md`）和扁平格式（`docs/subdir/file.md`）均可加载

### REQ-007: 文档根目录锚定——确保始终解析到工作区根目录

**优先级:** P2
**描述:** 加强文档路径解析的可靠性，确保无论引擎从哪个目录启动，文档路径都锚定到项目工作区根目录 `docs/`。

**验收标准:**
- 后端 `/api/docs/:filepath{.*}` 的 `docsDir` 基于引擎传入的 `projectRoot`（`startEngine({ projectRoot })`）而非 `process.cwd()`
- 添加防御性日志：文档 404 时打印实际查找的完整路径，便于排查
- `docs/README.md` 可正常加载（验证根级文档支持）

### REQ-008: 当前 Gate 文档立即可见——产物实时扫描

**优先级:** P0
**描述:** 当前 Gate（未通过）产生的文档应在 Dashboard 中立即可见，而非等到 Gate 通过后才出现。根因在 `findSessionGateArtifacts`（`src/engine/gates.ts:235-266`）：

- 当前 Gate 在 `checkpoints` 表中无记录 → `checkpoints.length === 0` → 日期目录扫描被跳过 → 返回空数组
- 应新增一条路径：对于无 checkpoint 的 Gate，使用当前日期（`new Date().toISOString().slice(0, 10)`）或 run 的 `started_at` 日期扫描 `docs/<today>/<subdir>/` 目录

**验收标准:**
- Gate A 阶段创建的需求文档（如 `docs/2026-05-12/requirements/xxx.md`）在 Gate A 的 Dashboard 中立即显示
- 无需刷新浏览器，下次数据轮询（≤8s）后文档标签自动出现
- 对已通过的 Gate 无回归影响（仍通过 checkpoint 日期匹配）
- 如果今天的日期目录存在但无匹配 .md 文件，返回空数组（不报错）

### REQ-009: 文档目录结构规范同步——Skill + Agent 统一更新

**优先级:** P1
**描述:** 所有 Skill 文件和 Agent 定义中涉及文件输出路径的说明，应统一使用 `docs/<YYYY>-<MM>-<DD>/<subdir>/` 日期目录结构。当前缺失此规范说明，导致部分文档可能写入错误的扁平目录。

**需同步的 Skill 文件：**
| Skill | 路径 | 当前状态 |
|-------|------|----------|
| `spec-driven-development` | `.claude/skills/spec-driven-development/SKILL.md` | 需检查输出路径说明 |
| `planning-and-task-breakdown` | `.claude/skills/planning-and-task-breakdown/SKILL.md` | 需检查输出路径说明 |
| `test-driven-development` | `.claude/skills/test-driven-development/SKILL.md` | 需检查输出路径说明 |
| `code-review-and-quality` | `.claude/skills/code-review-and-quality/SKILL.md` | 需检查输出路径说明 |
| `shipping-and-launch` | `.claude/skills/shipping-and-launch/SKILL.md` | 需检查输出路径说明 |
| `documentation-and-adrs` | `.claude/skills/documentation-and-adrs/SKILL.md` | 需检查输出路径说明 |

**验收标准:**
- 每个写文件的 Skill 首段或"产物"章节明确标注：`docs/<YYYY>-<MM>-<DD>/<subdir>/<filename>.md`
- 日期格式使用当前日期（`new Date().toISOString().slice(0, 10)`），Gate→subdir 映射见 `GATE_DIRS`
- Agent 定义（`.claude/agents/`）中如有写文件说明，同步更新目录约定
- 所有 Skill 修改后 lint/typecheck 通过（Skill 为 .md 文件，无需 lint）

### REQ-010: 非日期目录结构向后兼容清理

**优先级:** P2
**描述:** 现有 `docs/requirements/`、`docs/tasks/` 等扁平目录（无日期前缀）中的文档，迁移到最近的日期目录下，保留原位置备份。减少 `findSessionGateArtifacts` / `findGateArtifacts` 中两条路径的分歧，降低未来 bug 风险。

**验收标准:**
- `docs/requirements/`、`docs/tasks/`、`docs/plans/`、`docs/reviews/`、`docs/testing/` 下的 .md 文件迁移到对应的 `docs/<YYYY-MM-DD>/<subdir>/` 目录
- 原位置保留文件或软链接（避免破坏其他脚本的引用）
- 历史 artifact 记录（DB 中的扁平路径）能继续解析（通过后端路径查找的回退逻辑）
- 迁移后 Dashboard 文档加载不受影响

### REQ-011: 全局 CLI 指令 Hash 追踪——升级/添加/覆盖一致性

**优先级:** P0
**描述:** `jarvis upgrade`、`jarvis add`、`jarvis diff` 等命令对全局级别（`~/.claude/commands/`）的指令缺少可靠的 hash 追踪机制，导致无法正确判断哪些指令需要升级、覆盖或保留用户修改。

**根因：`mergeDir` 写入与 `diffPlatform` 读取的 hash 文件路径不一致**

| 操作 | 函数 | hash 文件路径 |
|------|------|--------------|
| install/upgrade 写入 | `mergeDir()` (`install.ts:276`) | `~/.jarvis/file-hashes.json` |
| diff 读取（全局） | `diffPlatform()` (`cli.ts:326`) | `~/.claude/.jarvis/file-hashes.json` |
| diff 读取（项目） | `diffPlatform()` (`cli.ts:326`) | `<project>/.jarvis/file-hashes.json` |

三条路径互不一致 → `diffPlatform` 永远找不到 `mergeDir` 存储的 hash → 所有文件每次都显示为"new/changed" → 用户无法知晓哪些文件真正需要更新。

**验收标准:**
- 全局 hash 存储/读取统一到 `~/.jarvis/file-hashes.json`（`mergeDir` 已使用此路径，`diffPlatform` 需对齐）
- `diffPlatform` 全局模式从 `~/.jarvis/file-hashes.json` 读取 hash（而非 `~/.claude/.jarvis/`）
- 项目级别 hash 存储/读取统一到 `<project>/.jarvis/file-hashes.json`
- `jarvis diff` 输出准确：未修改文件显示"up to date"，源变更但用户未改显示"update"，用户已改显示"skip (modified by user)"
- `jarvis upgrade` 仅覆盖真正需要更新的文件，不重复覆盖未变更文件
- `jarvis add` 首次安装正确记录 hash，后续 upgrade 可正确识别增量

### REQ-012: `/explore` 指令重命名为浏览器探索相关名称

**优先级:** P1
**描述:** 当前 `/explore` 名称过于泛化，无法从名称直接判断是浏览器探索指令。重命名为更具体的浏览器探索名称，与其他浏览器相关指令保持命名一致（`/browser-test`、`/bug-fix` 等）。

**更名方案:**
| 项目 | 旧名 | 新名 |
|------|------|------|
| Claude 指令 | `.claude/commands/explore.md` | `.claude/commands/browser-explore.md` |
| 用户级指令 | `~/.claude/commands/explore.md` | `~/.claude/commands/browser-explore.md` |
| 指令 frontmatter | `description: 浏览器自由探索...` | 保持不变，仅文件名和内部引用更新 |

**验收标准:**
- `/explore` 重命名为 `/browser-explore`，与 `/browser-test` 形成浏览器指令家族（explore=自主探索, test=结构化用例）
- 旧文件 `explore.md` 删除，新文件 `browser-explore.md` 创建
- 所有引用 `/explore` 或 `explore.md` 的 Claude 平台文件同步更新（指令文档、skill 引用、Agent 文档、Web Commands 页面）
- 用户级目录同步：`~/.claude/commands/explore.md` → `~/.claude/commands/browser-explore.md`
- Web 面板 `/commands` 页面中的指令名称自动更新（通过文件名扫描）

### REQ-013: 指令/技能模板同步——安装新版时包含 explore 指令

**优先级:** P0
**描述:** v3.41.0 新增的 `/explore` 指令（现 /browser-explore）和对应的 Codex 技能未添加到模板目录，导致 `jarvis install` / `jarvis add` 安装新版时缺少该指令。

**缺失清单:**
| 文件 | 项目位置（已有） | 模板位置（缺失） |
|------|-----------------|------------------|
| `browser-explore.md` | `.claude/commands/explore.md` | `src/templates/platforms/claude/commands/` ❌ |

**验收标准:**
- `src/templates/platforms/claude/commands/` 中新增 `browser-explore.md`（内容来自重命名后的指令文件）
- 模板中的 `browser-explore` 指令版本与项目 `.claude/commands/` 中的内容一致
- `jarvis add claude --global` 安装后，`~/.claude/commands/browser-explore.md` 存在且可被 Claude Code 发现
- 现有 19 条模板指令继续正常工作，不受新增影响

---

## 技术约束

1. **X6 版本**：`@antv/x6` v2.19.2，不可升级（避免破坏性变更）
2. **动画方式**：呼吸动画使用 `node.scale()`，不可改用 CSS animation（X6 内部机制限制）
3. **Token 体系**：所有颜色使用 antd token 或 CSS 变量，禁止硬编码 `#xxx`
4. **非侵入性**：不修改 `NODE_SIZES`、`ANIMATION_DEFAULTS` 等共享常量（除非必要）
5. **Dashboard 结构**：不改变 Dashboard 的三栏布局（中+右），仅在中栏内部添加垂直分割
6. **文件系统安全**：路径遍历防护（`startsWith(docsDir)`）不可移除或弱化

## 风险

- X6 `node.scale()` 的精度限制可能导致极小抖动（低风险，调低 breathAmplitude 到 0.03 可缓解）
- ResizeObserver 在不同浏览器中的触发频率不一致（低风险，使用防抖 + 阈值守卫）
- 力导向参数调优需要实际数据验证（中风险，需要在真实 Agent 数据下测试）
- 文档路径修改可能影响 Codex 平台的文件访问逻辑（低风险，仅影响 Web Dashboard）

## REQ 追踪矩阵

| REQ | 模块 | 依赖 | 优先级 |
|-----|------|------|--------|
| REQ-001 | Dashboard.tsx（垂直分割器） | 无 | P0 |
| REQ-002 | X6FlowChart.tsx + useX6Animation.ts | REQ-004 | P0 |
| REQ-003 | X6AgentGraph.tsx + useX6Animation.ts | REQ-004 | P0 |
| REQ-004 | useX6Animation.ts（RAF 健壮性） | 无 | P1 |
| REQ-005 | 全部（视觉质量验证） | REQ-001~004 | P1 |
| REQ-006 | gates.ts + api.ts（文档加载修复） | 无 | P0 |
| REQ-007 | routes.ts + server.ts（目录锚定） | REQ-006 | P2 |
| REQ-008 | gates.ts（当前 Gate 实时扫描） | 无 | P0 |
| REQ-009 | .claude/skills/ + .claude/agents/ + .codex/skills/ | 无 | P1 |
| REQ-010 | docs/ 目录迁移 | REQ-006, REQ-008 | P2 |
| REQ-011 | install.ts + cli.ts（hash 路径统一） | 无 | P0 |
| REQ-012 | 指令体系 + Codex skills（explore→browser-explore） | REQ-013 | P1 |
| REQ-013 | src/templates/（模板补齐 browser-explore） | REQ-012 | P0 |
