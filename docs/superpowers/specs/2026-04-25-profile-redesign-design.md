# 个人主页 / 他人主页 / 设置页 UI 重设计规格

> 日期：2026-04-25
> 范围：`apps/web` — `profile-page.tsx`、`user-profile-page.tsx`、`settings-page.tsx` 及其相关子组件
> 风格：极简扁平风

---

## 1. 现状问题

### 1.1 个人主页（自己）
- 右侧四格统计卡片 + 消息中心卡片占用大量横向空间，与左侧简介形成不对等视觉
- 操作按钮（修改资料/消息中心/去发布内容）与下方内容区之间缺少清晰的层级分隔
- 内容/收藏 Tab 下的分类 pill 与生命周期 pill 使用了两种不同的视觉样式（蓝底 vs 黑底），混乱
- 错误提示 Alert 直接插入内容区，打断阅读流

### 1.2 他人主页（访客）
- 封面/头像/统计布局与个人主页高度重复，却独立维护，增加重复代码
- 关系状态提示使用整张 `ProfileOverviewCard`，信息密度极低
- 内容区缺少分类筛选，仅展示全部内容
- 同样的错误提示位置问题

### 1.3 设置页
- 头像区块与昵称/简介编辑分散在左侧面板不同行，视觉上断裂
- 通知开关使用大尺寸圆角按钮（"开启"/"关闭"），在列表中占用过多横向空间
- 左右分栏在内容较少时右侧大片留白

---

## 2. 设计目标

1. **统一骨架**：自己主页和他人主页共用同一套布局组件，仅操作区与权限提示差异化渲染
2. **减少重复**：合并统计展示、简化筛选器、提取共用子组件
3. **提升信息密度**：去掉无意义的大卡片，用更紧凑的方式呈现同等信息
4. **极简扁平**：减少阴影、渐变装饰，依靠留白、细边框、色块对比建立层次

---

## 3. 主页统一骨架设计

### 3.1 页面结构（从上到下）

```
┌──────────────────────────────────────┐
│  Error Alert (if any) — 全宽         │
├──────────────────────────────────────┤
│  Banner Section                      │
│  ┌────────────────────────────────┐  │
│  │  [封面图]                        │  │
│  │  [渐变遮罩]  [编辑封面 btn]       │  │
│  │                                 │  │
│  │  [Avatar]  Name + IP属地 + Badge │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  Profile Meta Bar                    │
│  [简介文本...]  |  关注者 · 0  关注中 · 0  收藏 · 0  内容 · 0  |  [操作按钮组] │
├──────────────────────────────────────┤
│  Status Hint (消息/关系提示) — 轻量行  │
├──────────────────────────────────────┤
│  Content Tabs                        │
│  [内容] [收藏]  (line variant)       │
├──────────────────────────────────────┤
│  Unified Filter Bar                  │
│  [文章 3] [动态 0] [榜单 1] ... [全部] [草稿] [已发布] ... │
├──────────────────────────────────────┤
│  Content List                        │
│  [条目] [条目] ...                   │
├──────────────────────────────────────┤
│  Pagination                          │
└──────────────────────────────────────┘
```

### 3.2 Banner Section

- 封面图高度保持 `h-40 md:h-48`，底部 `border-b border-border/60`
- 遮罩改为更克制的 `from-slate-950/70 via-slate-950/20 to-transparent`
- 头像尺寸缩小为 `h-20 w-20 md:h-24 md:w-24`，底部对齐封面底部，左侧 `p-5 md:p-6`
- 头像右侧水平排列：
  - 姓名：`text-[1.5rem] md:text-[1.75rem] font-semibold tracking-[-0.03em] text-white`
  - IP 属地：与姓名同行或次行，`text-sm text-white/80`
  - Badge（自己：可见范围；他人：公开主页/内容可见）：`text-xs` 轻量 badge
- 编辑封面按钮：绝对定位右上，`size="sm" variant="ghost" className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"`

### 3.3 Profile Meta Bar

**布局**：`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-5 md:px-6 py-4 border-b border-border/60`

- **左侧**：简介文本
  - `text-sm text-muted-foreground line-clamp-2 max-w-md`
  - 自己：`bio` 或默认文案；他人：根据 `canViewProfile` 显示对应提示

- **中间**：统计数字条
  - 使用 `<dl>` 语义化：`<dt>` 标签 + `<dd>` 数字
  - 布局：`flex items-center gap-4 text-sm`
  - 样式：标签 `text-muted-foreground`，数字 `font-semibold text-foreground`
  - 分隔：项目之间用 `text-border/60` 竖线或 `gap-4` 留白分隔（优先留白，更极简）
  - 项目：关注者 · {n} / 关注中 · {n} / 收藏 · {n} / 内容 · {n}
  - 数字为 0 时不特殊处理，正常显示

- **右侧**：操作按钮组
  - 自己：`修改资料` (outline) · `消息` (outline) · `发布` (default/hero)
  - 他人：`关注` (default/hero) · `返回我的主页` (outline)
  - 使用 `size="sm"`，去掉多余图标或仅保留关键图标（如铃铛、笔）
  - 按钮排列：`flex flex-wrap gap-2`

### 3.4 Status Hint

**目的**：替代原来的 `ProfileOverviewCard` 大卡片。

- 仅在有需要提示的内容时渲染（自己有未读消息、他人有权限限制）
- 样式：轻量 Alert，`variant="default"` 或 `variant="muted"`，`py-2.5 px-4`
- 内容精简为一行：图标 + 标题 + 描述 + 可选操作链接
- 自己未读：`🔔 你有 3 条未读消息 → 进入消息中心`
- 他人受限：`👁 内容暂不可见 — 建立关注关系后自动刷新`

### 3.5 Content Tabs

- 继续使用 `Tabs variant="line"`
- 自己：`内容` / `收藏`
- 他人：`内容` / `收藏(disabled)`

### 3.6 Unified Filter Bar

**重大变更**：将原来的两行不同样式 pill 合并为**一组统一的 pill 行**。

- **内容 Tab 下**：分类 pill + 生命周期 pill 放在同一行
  - 分类（文章/动态/榜单/品牌/飞行器）在前，带有计数 badge
  - 生命周期（全部/草稿/审核中/已发布/已驳回）在后
  - 两者使用**完全相同的 pill 样式**
- **收藏 Tab 下**：仅分类 pill（去掉品牌）
- **访客内容 Tab 下**：仅分类 pill，无生命周期

**Pill 样式统一**：
```
默认：border border-border/60 bg-transparent text-muted-foreground text-sm px-3 py-1.5 rounded-full
激活：border-primary bg-primary text-primary-foreground
hover：border-border text-foreground bg-muted/30
```
- 不使用 `site-tab-trigger` 类（那是给 TabsTrigger 用的）
- 计数 badge 用 `text-xs opacity-80` 内联在 pill 内，如 `文章 <span class="ml-1">3</span>`
- 生命周期 pill 不需要计数

### 3.7 Content List

- 保持现有 `ContentFeedListRow` 不变
- 容器：`bg-white border border-border/60 divide-y divide-border/60`
- 空状态：`py-8 text-center text-sm text-muted-foreground`

### 3.8 Pagination

- 保持现有逻辑，样式微调：
  - 去掉 `border-t`，使用 `pt-4`
  - 按钮 `size="sm" variant="ghost"`
  - 页码显示用 `text-sm tabular-nums text-muted-foreground`

---

## 4. 设置页设计

### 4.1 页面结构

```
┌──────────────────────────────────────┐
│  Settings Header                     │
│  设置 / 管理公开资料、账号安全与通知偏好。│
├──────────────────────────────────────┤
│  Profile Summary Card                │
│  ┌────────────────────────────────┐  │
│  │ [Avatar]  昵称 + 简介  [操作]   │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  Settings Group: 公开资料             │
│  ├─ 昵称 ─────────────── [编辑]      │
│  ├─ 个人简介 ─────────── [编辑]      │
│  ├─ 可见范围 ─────────── [编辑]      │
│  ├─ 头像 ─────────────── [编辑]      │
├──────────────────────────────────────┤
│  Settings Group: 账号与安全           │
│  ├─ 绑定手机 ─────────── [编辑]      │
├──────────────────────────────────────┤
│  Settings Group: 通知偏好             │
│  ├─ 评论与回复提醒 ───── [Toggle]    │
│  ├─ 提及提醒 ─────────── [Toggle]    │
│  ├─ 账号安全提醒 ─────── [Toggle]    │
│  ├─ 邮件摘要 ─────────── [Toggle]    │
├──────────────────────────────────────┤
│  Footer Actions                      │
│  查看个人主页 · 查看消息 · [退出登录]  │
└──────────────────────────────────────┘
```

### 4.2 Profile Summary Card

- 单张全宽卡片，`variant="floating"`
- 内部布局：`flex items-center gap-4 px-5 py-4`
  - 左：`UserAvatar h-16 w-16`
  - 中：
    - 昵称 `text-base font-semibold`
    - 简介 `text-sm text-muted-foreground line-clamp-1`
  - 右：`编辑资料` 按钮（跳转到 profile page 的某种快速编辑？或者就是链接到 profile）—— 实际上设置页本身就是编辑，所以这里可以省略，或者放一个 `查看主页` 链接
- **决策**：Summary Card 不放操作按钮，仅做资料预览。操作放在下方的设置项中。

### 4.3 Settings Group

- 每组一个 `SitePanel variant="muted"`
- 组头：`px-4 py-3 border-b border-border/60 text-sm font-semibold text-foreground`
- 组内行：`divide-y divide-border/60`

**SettingsRow 新结构**：
```
flex items-center justify-between px-4 py-3.5
  左侧：label (text-sm font-medium text-foreground) + description (text-sm text-muted-foreground)
  右侧：action
```
- 标签和描述垂直堆叠在左侧，而非原来三列网格。这样更适应长描述文本。
- 右侧操作区固定宽度，左对齐。

### 4.4 编辑状态交互

- 点击编辑 → 行内展开输入框（昵称用 Input，简介用 Textarea）
- 保存/取消按钮紧跟输入框下方，`flex gap-2 pt-2`
- 与原来一致，不改变交互逻辑

### 4.5 Toggle Switch（通知开关）

**重大变更**：用 Toggle Switch 替代原来的大圆角按钮。

- 需要新增/使用一个 `Switch` 组件（如果项目已存在则直接用）
- 样式：`h-5 w-9` 小型开关，激活时 `bg-primary`
- 点击后立即乐观更新 UI，同时触发 API 请求
- 请求失败时开关回弹（与原来按钮逻辑一致）

### 4.6 Footer Actions

- 放在最后一个 panel 外部，或最后一个 panel 的底部
- 布局：`flex flex-wrap items-center gap-3 pt-2`
- `查看个人主页` (ghost) · `查看消息` (ghost) · `退出登录` (destructive ghost)

---

## 5. 组件拆分计划

### 5.1 新增组件

| 组件 | 路径 | 用途 |
|------|------|------|
| `ProfileLayoutShell` | `features/auth/profile-layout-shell.tsx` | 主页统一骨架：Banner + Meta Bar + Status Hint + Tabs + Filter + Content |
| `ProfileMetaBar` | `features/auth/profile-meta-bar.tsx` | 简介 + 统计数字条 + 操作按钮 |
| `ProfileFilterBar` | `features/auth/profile-filter-bar.tsx` | 统一 pill 筛选器行 |
| `ProfileStatusHint` | `features/auth/profile-status-hint.tsx` | 轻量提示行（消息/关系） |
| `SettingsProfileCard` | `routes/settings-page.tsx` 内联或提取 | 设置页顶部资料摘要 |
| `SettingsToggleRow` | `routes/settings-page.tsx` 内联或提取 | 带 Toggle 的设置行 |

### 5.2 废弃/移除

- `ProfileOverviewCard`（`profile-surface.tsx`）—— 被 `ProfileStatusHint` 替代
- `ProfileMetricStrip`（`profile-surface.tsx`）—— 被 Meta Bar 内联统计替代
- `ProfileListPagination`（`profile-surface.tsx`）—— 与现有 `ProfileGridPagination` 重复，统一后只保留一个

### 5.3 修改组件

| 组件 | 变更 |
|------|------|
| `profile-page.tsx` | 使用 `ProfileLayoutShell` 渲染，传入自己特有的 props（编辑封面、消息提示、管理操作） |
| `user-profile-page.tsx` | 使用 `ProfileLayoutShell` 渲染，传入访客特有的 props（关注按钮、关系提示） |
| `settings-page.tsx` | 重构为顶部卡片 + 分组列表布局，替换通知按钮为 Toggle |

---

## 6. 样式规范

### 6.1 色彩

- 保持现有主题变量，不新增 token
- 强调色继续使用 `primary`
- 背景层级：`bg-background` (页面) → `bg-white` (内容列表) → `bg-muted/25` (面板头)
- 边框统一用 `border-border/60`

### 6.2 间距

- 页面最大宽度：`max-w-[72rem]`（与现有一致）
- 页面级 gap：`gap-4`
- Panel padding：`px-5 md:px-6 py-4`
- 组内行 padding：`px-4 py-3.5`

### 6.3 排版

- 页面标题：`text-2xl font-bold tracking-[-0.02em]`（设置页）
- 姓名：`text-[1.5rem] md:text-[1.75rem] font-semibold tracking-[-0.03em]`
- 正文：`text-sm`
- 辅助文本：`text-xs text-muted-foreground`

---

## 7. 响应式

- **< 640px (sm)**：
  - Meta Bar 垂直堆叠：简介在上，统计在中，按钮在下
  - 统计数字条允许换行 `flex-wrap`
  - Filter Bar 允许换行 `flex-wrap`
  - 设置页 Summary Card 垂直布局：头像在上，文字在下

- **640px - 1024px (md/lg)**：
  - Meta Bar 水平：`flex-row`
  - 统计在中间，按钮在右侧

- **> 1024px (xl)**：
  - 设置页可考虑左右分栏，但根据极简原则，保持单列更统一
  - 主页保持单列（现有 `max-w-[72rem]` 已足够）

---

## 8. 交互与无障碍

- 所有 pill 按钮使用 `<button type="button">`，支持键盘聚焦
- Toggle Switch 使用原生 checkbox 或 Radix Switch，确保 `aria-checked`
- 编辑展开/收起使用 `aria-expanded`
- 头像编辑和封面编辑保持现有的 `input type="file"` + `ref` 模式
- 操作加载状态保持现有的 disabled + loading 文案

---

## 9. 验收标准

- [ ] 自己主页和他人主页共用 `ProfileLayoutShell`，代码重复度显著降低
- [ ] 统计数字条替代右侧四格卡片，视觉更紧凑
- [ ] 筛选器 pill 样式统一，不再出现两种不同视觉风格
- [ ] 错误提示 Alert 位于页面顶部，不插入内容区中间
- [ ] 设置页有顶部资料摘要卡片
- [ ] 设置页通知开关使用 Toggle 样式
- [ ] 所有页面通过 `bun run lint` 和 `bun run typecheck`
- [ ] 移动端（< 640px）布局不崩、无横向滚动

---

## 10. 不修改的范围

- 数据获取逻辑（useQuery、apiClient 调用）保持不变
- `ContentFeedListRow` 单项展示逻辑保持不变
- 路由和导航保持不变
- 文件上传/头像裁剪逻辑保持不变
- 手机号换绑弹窗保持不变
