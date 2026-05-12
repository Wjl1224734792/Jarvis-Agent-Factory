# SVG 重写前端实现文档

## 1. 当前实现目标

将两个核心画布组件（FlowChart、AgentGraph）从 @antv/x6 依赖重写为纯 React + SVG + CSS 实现，同时清理相关废弃依赖和文件。

## 2. 对应需求 ID / 任务 ID

- SvgRewrite-FlowChart：重写上方面布（Gate 流水线）
- SvgRewrite-AgentGraph：重写下方面布（Agent 同心圆布局）
- CleanupX6Deps：清理 X6/dagre 依赖和废弃文件

## 3. 输入依据

- 编排者任务分配：用纯 React + SVG + CSS 重写画布组件，完全移除 @antv/x6 依赖
- 现有源文件：X6FlowChart.tsx、X6AgentGraph.tsx、Dashboard.tsx、package.json
- 共享常量：constants/x6-theme.ts（保留不变）
- API 类型：api.ts（AgentStatusResponse、AgentUsageResponse、AgentGateStatusResponse 等）

## 4. 变更文件 / 变更范围

### 重写的文件
| 文件 | 变更说明 |
|------|---------|
| `web/src/components/X6FlowChart.tsx` | 从 X6 Graph + dagre 改为纯 SVG ellipses + bezier paths |
| `web/src/components/X6AgentGraph.tsx` | 从 X6 Graph + dagre 改为纯 SVG circles + lines + force layout |

### 修改的文件
| 文件 | 变更说明 |
|------|---------|
| `web/src/pages/Dashboard.tsx` | 新增 `agentUsage` prop 传递给 AgentGraph |
| `web/package.json` | 移除 `@antv/x6`、`@antv/x6-plugin-selection`、`@antv/x6-plugin-snapline`、`dagre`、`@types/dagre` 共 5 个依赖 |

### 删除的文件
| 文件 | 原因 |
|------|------|
| `web/src/hooks/useX6Graph.ts` | X6 Graph 封装 hook，不再需要 |
| `web/src/hooks/useX6Animation.ts` | X6 RAF 动画 hook，改为 CSS 动画 |
| `web/src/components/X6Controls.tsx` | X6 缩放控件，内联到新组件 |
| `web/src/hooks/__tests__/useX6Graph.test.ts` | 对应 hook 测试 |
| `web/src/hooks/__tests__/useX6Animation.test.ts` | 对应 hook 测试 |

### 保留的文件
| 文件 | 说明 |
|------|------|
| `web/src/constants/x6-theme.ts` | NODE_SIZES、ANIMATION_DEFAULTS、AGENT_TYPE_COLORS 仍被使用 |

## 5. 实现说明

### 5.1 FlowChart（X6FlowChart.tsx）

**渲染方式：** 纯 SVG，使用 `<svg viewBox>` + `<ellipse>` + `<path>` + `<text>`

**布局：** 手动等距垂直排列（移除 dagre 依赖）
- 12 个 Gate 节点从上到下均匀分布
- 固定内容坐标系（1200x1200），通过 `viewBox` + `preserveAspectRatio="xMidYMid meet"` 自适应容器

**连接线：** SVG `<path>` 贝塞尔曲线（`M...C...`）
- 正常边：垂直曲线，控制点在 1/3 处
- 跳过边（B-DDD→B-TDD）：右侧偏移 120px 绕过中间节点

**视觉样式：**
- 已通过 Gate：绿色（`colorSuccess`）
- 当前 Gate：蓝色（`colorPrimary`），带 SVG `<filter>` 发光 + CSS `flowPulse` 呼吸动画
- 未来 Gate：灰色（`colorBorderSecondary`），虚线描边

**动画：** 纯 CSS `@keyframes`
- `flowPulse`：scale 1→1.06→1，2s ease-in-out infinite
- `flowDashMove`：虚线流动（用于边，如需启用）
- `flowFadeInScale`：节点入场动画

**交互：**
- 点击 Gate → `onGateSelect(gateId)`
- Hover → React state 驱动 tooltip（JSX 渲染，无 innerHTML）
- Tooltip 显示：Gate 名称、状态、描述、耗时、"点击查看详情"提示

**不再显示：** Agent 子节点（按要求移除）

### 5.2 AgentGraph（X6AgentGraph.tsx）

**渲染方式：** 纯 SVG，使用 `<svg viewBox>` + `<circle>` + `<line>` + `<text>`

**布局函数（替代 X6 布局）：**
- `circularLayout`：编排者居中，Agent 等角度分布在外层圆上
  - 半径 = `max(130, agents.length * 18)`
- `forceLayout`：力导向布局（Gate C-impl 专用）
  - 弹簧模型：节点间排斥力 + 编排者引力 + 阻尼衰减 + 半径约束
- `getLayoutForGate`：根据 Gate 类型选择布局

**编排者节点：** SVG `<rect rx={40} ry={40}>` 胶囊形，居中固定，橙色发光（SVG filter `orchGlow`）

**Agent 子节点：** SVG `<circle>`，按 Agent 类型着色（基于 `AGENT_TYPE_COLORS` 匹配）

**连接线：** SVG `<line>`，活跃状态虚线 + CSS `agentDashFlow` 流动动画

**Token 显示（REQ-021）：**
- 已完成 Agent 下方显示 `📥1.2k 📤0.8k`
- 从 `agentUsage` prop 读取（Dashboard 已更新传递该 prop）
- 使用 `formatTokens()` 格式化数字

**动画：**
- `agentPulse`：活跃节点呼吸动画（scale 1→1.08→1）
- `agentDashFlow`：活跃连线虚线流动（`stroke-dashoffset` 动画）
- `agentFadeInScale`：新节点入场动画

**Tooltip：** React state 驱动，JSX 渲染，显示 Agent 名称、状态、模型、运行提示

**辅助元素：**
- Gate 标题栏（左上角）
- Agent 类型图例面板
- Agent 计数标签栏（活跃/已完成/失败）
- 空状态 overlay（无 Agent 时）

### 5.3 Dashboard.tsx 更新

仅一行变更：向 `X6AgentGraph` 传递 `agentUsage={agentUsage}` prop

### 5.4 依赖清理

移除 5 个 npm 包，净减少 126 个子依赖包（从 310→184 审计包数）。

## 6. 测试和验证结果

| 验证项 | 结果 |
|--------|------|
| TypeScript type-check（web） | PASS，0 errors |
| TypeScript type-check（root） | PASS，0 errors |
| Frontend tests（vitest） | 5 files, 66 tests PASS |
| Backend tests（vitest） | 10 files, 142 tests PASS |
| ESLint（root） | PASS，0 errors |
| Vite production build | PASS，3842 modules，2.8MB output |

## 7. 边界和异常处理

- **runId 为 null：** FlowChart 显示"无运行中的任务"占位
- **无 Agent 数据：** AgentGraph 显示"等待子 Agent 启动..."空状态
- **无 pipelineGates：** 所有 Gate 显示为"future"（灰色）
- **bddSkipped 为 true：** 渲染跳过边（B-DDD→B-TDD），隐藏 B-BDD 相关边
- **selectedGate 为 null：** currentGate 作为默认选中
- **容器尺寸为 0：** 不渲染 SVG（layoutData 为 null）
- **Tooltip 视口边界：** 左侧/上方智能翻转防止溢出
- **XSS 防护：** 所有用户数据通过 `escapeHtml()` 处理后再渲染

## 8. 风险 / 未解决项

### 风险
- **性能：** 大量 Agent 节点（50+）时 SVG 渲染性能待验证。当前力导向布局最多 60 次迭代，可调整。
- **响应式：** 布局在极小容器（<100px 高度）下节点会非常小，建议保持默认 150px+ 高度。

### 未解决项
- **npm 环境问题：** `NODE_ENV=production` 导致 npm 不安装 devDependencies。已在本次实现中通过显式设置 `NODE_ENV=development` 解决，但环境变量可能需要持久化配置。
- **Preview 截图：** 由于 Dashboard 需要 session 数据才能渲染实际内容，截图验证未能在本次实现中完成（仅空状态可见）。

## 9. 需要后端配合的点

无。本次重写仅涉及前端渲染层，API 接口和数据类型保持不变。

## 10. 推荐的下一步

1. **视觉验证：** 在真实流水线数据下启动前端，验证 FlowChart 和 AgentGraph 的视觉效果
2. **性能测试：** 模拟 30+ Agent 的 Gate C-impl 场景，验证 SVG 渲染性能
3. **E2E 测试：** 添加 Cypress/Playwright 测试覆盖 Gate 点击、Hover tooltip、动画效果
4. **文件重命名：** 考虑将 `X6FlowChart.tsx` → `FlowChart.tsx`、`X6AgentGraph.tsx` → `AgentGraph.tsx`，清除 X6 命名残留
