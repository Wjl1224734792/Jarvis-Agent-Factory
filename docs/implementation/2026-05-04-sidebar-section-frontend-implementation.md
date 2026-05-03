# 侧边卡片统一规范 — 前端实现文档

## 1. 当前实现目标

创建统一的 `SidebarSection<T>` 泛型组件，封装"最大 N 项截断"逻辑，并重构首页侧边面板使用该组件。

## 2. 对应需求 ID / 任务 ID

- **requirement_ids:** [REQ-006]
- **task_id:** TASK-006

## 3. 输入依据

- Execution Packet TASK-006（侧边卡片统一规范）
- TASK-005 完成后的 `home-page.tsx`（排行榜查询已改为 `sort=hot&limit=3`）
- `site-shell.tsx` 中 `SitePanel` / `SitePanelBody` / `SiteRail` API
- TypeScript 与 Interface 使用规范（Props 使用 `interface`）

## 4. 变更文件 / 变更范围

### 新建

| 文件 | 说明 |
|------|------|
| `apps/web/src/components/sidebar-section.tsx` | 通用侧边栏面板组件，65 行 |

### 修改

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/web/src/routes/home-page.tsx` | 重构 | 移除 `HomeRailPanels` 组件，改用 `SidebarSection`；清理无用 import |

### 未触碰（符合 forbidden_paths）

- `apps/web/src/routes/rankings-page.tsx`
- `apps/web/src/routes/rankings-page-helpers.ts`
- `apps/server/*`
- `packages/*`

## 5. 实现说明

### 5.1 `SidebarSection<T>` 组件

**Props (`interface SidebarSectionProps<T>`):**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | (必填) | 面板标题 |
| `icon` | `ReactNode` | `undefined` | 标题图标 |
| `items` | `T[]` | (必填) | 展示项列表 |
| `maxItems` | `number` | `3` | 最大展示数量 |
| `renderItem` | `(item: T, index: number) => ReactNode` | (必填) | 单项渲染函数 |
| `isLoading` | `boolean` | `false` | 加载态 |
| `skeletonCount` | `number` | `maxItems` | 骨架屏数量 |
| `className` | `string` | `undefined` | 外层样式扩展 |

**核心逻辑:**

- `items.slice(0, maxItems)` 自动截断，避免外部重复写截断逻辑
- `isLoading` 为 `true` 时渲染骨架屏（简单的两行文本骨架）
- 包装 `SitePanel` + `SitePanelBody` 保持与现有布局一致

### 5.2 `home-page.tsx` 重构

**移除内容:**
- `HomeRailPanels` 函数定义（原 112 行）
- `HomeModelListItem` 类型别名
- `RankingListItem` import（不再直接使用）
- `SitePanel` / `SitePanelBody` / `Skeleton` import（不再直接使用）

**新增内容:**
- `SidebarSection` import
- 两个 `SidebarSection` 实例替代原 `HomeRailPanels` 调用

**行为一致性:**
- 热门榜单：`maxItems={2}`，骨架数量 2
- 热门机型：`maxItems={3}`，骨架数量 3
- 渲染内容与原 `HomeRailPanels` 完全相同

## 6. 测试和验证结果

| 验证项 | 命令 | 结果 |
|--------|------|------|
| ESLint（变更文件） | `npx eslint apps/web/src/components/sidebar-section.tsx apps/web/src/routes/home-page.tsx` | 0 errors, 0 warnings |
| TypeScript typecheck | `bun run typecheck` | 全部包通过（shared, schemas, http-client, db, server, web, admin） |
| 全仓 ESLint | `bun run lint` | 5 errors 均为预存（admin/2, server/1, test-type.ts/1, 与本次变更无关） |

## 7. 边界和异常处理

- **空数据**：`items` 为空时，`items.slice(0, maxItems)` 返回空数组，不渲染列表项（仅显示标题行）
- **加载态**：`isLoading=true` 时完全替换列表为骨架屏，防止闪烁
- **泛型安全**：组件使用 `<T>` 泛型，`renderItem` 签名自动推导类型
- **骨架数量**：`skeletonCount` 未传递时默认使用 `maxItems` 值

## 8. 风险 / 未解决项

- 骨架屏样式简化为通用文本骨架（两行 Skeleton），与原"热门机型"面板的图片+文字骨架不同。视觉效果略有差异，但功能等价。如需自定义骨架样式，后续可扩展 `renderSkeleton` prop。
- `SidebarSection` 目前固定使用 `SitePanel` + `SitePanelBody` 包装，如需其他布局容器可后续通过 `className` 扩展。

## 9. 需要后端配合的点

无。纯前端重构，不涉及 API 改动。

## 10. 推荐的下一步

- 其他页面的侧边面板（如详情页相关推荐）可逐步迁移到 `SidebarSection`
- 如需自定义骨架样式，考虑添加 `renderSkeleton?: (index: number) => ReactNode` prop
