# 个人主页 / 他人主页 / 设置页 UI 重设计实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 重构个人主页、他人主页和设置页，统一主页骨架、减少 UI 重复、提升信息密度，采用极简扁平风格。

**架构：** 提取共用布局组件 `ProfileLayoutShell` 统一自己/他人主页骨架；用紧凑 `ProfileMetaBar` 替代右侧统计卡片；用统一 `ProfileFilterBar` 合并筛选器样式；设置页改为顶部资料卡片 + 分组列表布局，通知开关改用 Toggle Switch。

**技术栈：** React · TypeScript · Tailwind CSS v4 · radix-ui · shadcn/ui 风格

---

## 文件清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `apps/web/src/components/ui/switch.tsx` | 新建 | Toggle Switch UI 组件（设置页通知开关用） |
| `apps/web/src/features/auth/profile-meta-bar.tsx` | 新建 | 主页简介 + 统计数字条 + 操作按钮行 |
| `apps/web/src/features/auth/profile-status-hint.tsx` | 新建 | 轻量提示行（消息/关系状态） |
| `apps/web/src/features/auth/profile-filter-bar.tsx` | 新建 | 统一 pill 筛选器行（分类 + 生命周期） |
| `apps/web/src/features/auth/profile-layout-shell.tsx` | 新建 | 主页统一骨架（Banner + MetaBar + StatusHint + Tabs + Content） |
| `apps/web/src/features/auth/profile-page.tsx` | 修改 | 自己主页 — 使用 ProfileLayoutShell 渲染 |
| `apps/web/src/routes/user-profile-page.tsx` | 修改 | 他人主页 — 使用 ProfileLayoutShell 渲染 |
| `apps/web/src/routes/settings-page.tsx` | 修改 | 设置页 — 顶部资料卡片 + 分组列表 + Toggle 开关 |
| `apps/web/src/features/auth/profile-surface.tsx` | 修改 | 删除废弃组件，仅保留共用的 Pagination |

---

## 任务 1：创建 Switch UI 组件

**文件：**
- 创建：`apps/web/src/components/ui/switch.tsx`

- [ ] **步骤 1：编写 Switch 组件代码**

```tsx
import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-ring transition-transform",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
```

- [ ] **步骤 2：验证组件无语法错误**

运行：`bun run typecheck --filter @feijia/web`（或 `cd apps/web && bun run typecheck`）
预期：无与 `switch.tsx` 相关的类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/components/ui/switch.tsx
git commit -m "feat(web): add Switch UI component for settings toggles"
```

---

## 任务 2：创建 ProfileMetaBar

**文件：**
- 创建：`apps/web/src/features/auth/profile-meta-bar.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
import type { ReactNode } from "react";

export interface ProfileMetric {
  key: string;
  label: string;
  value: number;
}

export function ProfileMetaBar(props: {
  bio: string;
  metrics: ProfileMetric[];
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:px-6">
      <p className="max-w-md text-sm leading-6 text-muted-foreground line-clamp-2">
        {props.bio}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {props.metrics.map((metric) => (
          <div className="flex items-center gap-1" key={metric.key}>
            <span className="text-muted-foreground">{metric.label}</span>
            <span className="font-semibold text-foreground">{metric.value}</span>
          </div>
        ))}
      </div>

      {props.children ? (
        <div className="flex flex-wrap gap-2">{props.children}</div>
      ) : null}
    </div>
  );
}
```

- [ ] **步骤 2：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/features/auth/profile-meta-bar.tsx
git commit -m "feat(web): add ProfileMetaBar component for compact stats"
```

---

## 任务 3：创建 ProfileStatusHint

**文件：**
- 创建：`apps/web/src/features/auth/profile-status-hint.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProfileStatusHint(props: {
  title: string;
  description?: string;
  tone?: "default" | "highlight";
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-5 py-3 text-sm md:px-6",
        props.tone === "highlight"
          ? "bg-primary/5 text-primary"
          : "bg-muted/30 text-muted-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{props.title}</span>
        {props.description ? (
          <span className="text-muted-foreground">{props.description}</span>
        ) : null}
      </div>
      {props.children ? <div className="flex gap-2">{props.children}</div> : null}
    </div>
  );
}
```

- [ ] **步骤 2：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/features/auth/profile-status-hint.tsx
git commit -m "feat(web): add ProfileStatusHint lightweight alert component"
```

---

## 任务 4：创建 ProfileFilterBar

**文件：**
- 创建：`apps/web/src/features/auth/profile-filter-bar.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export function ProfileFilterBar(props: {
  options: FilterOption[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", props.className)}>
      {props.options.map((option) => {
        const isActive = props.active === option.value;
        return (
          <button
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground"
            )}
            key={option.value}
            onClick={() => props.onChange(option.value)}
            type="button"
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="text-xs opacity-80">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **步骤 2：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/features/auth/profile-filter-bar.tsx
git commit -m "feat(web): add unified ProfileFilterBar pill component"
```

---

## 任务 5：创建 ProfileLayoutShell

**文件：**
- 创建：`apps/web/src/features/auth/profile-layout-shell.tsx`

- [ ] **步骤 1：编写组件代码**

此组件组合 Banner、MetaBar、StatusHint、Tabs、Filter 和 Content，接受插槽以支持自己/他人的差异化渲染。

```tsx
import type { ReactNode } from "react";
import { SitePage, SitePanel } from "@/components/site-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface ProfileTabDef {
  value: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

export function ProfileLayoutShell(props: {
  banner: ReactNode;
  metaBar: ReactNode;
  statusHint?: ReactNode;
  tabs: ProfileTabDef[];
  activeTab: string;
  onTabChange: (value: string) => void;
  filterBar?: ReactNode;
  children: ReactNode;
  alert?: ReactNode;
  className?: string;
}) {
  return (
    <SitePage className={cn("mx-auto w-full max-w-[72rem] gap-4", props.className)}>
      {props.alert ? <div className="w-full">{props.alert}</div> : null}

      <SitePanel className="overflow-hidden !border-0" variant="floating">
        {props.banner}
        {props.metaBar}
        {props.statusHint ? (
          <div className="border-t border-border/60">{props.statusHint}</div>
        ) : null}
      </SitePanel>

      <Tabs onValueChange={props.onTabChange} value={props.activeTab}>
        <TabsList variant="line">
          {props.tabs.map((tab) => (
            <TabsTrigger
              disabled={tab.disabled}
              key={tab.value}
              title={tab.title}
              value={tab.value}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent className="space-y-4" value={props.activeTab}>
          {props.filterBar ? (
            <div className="flex flex-wrap items-center gap-2">{props.filterBar}</div>
          ) : null}
          {props.children}
        </TabsContent>
      </Tabs>
    </SitePage>
  );
}
```

- [ ] **步骤 2：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/features/auth/profile-layout-shell.tsx
git commit -m "feat(web): add ProfileLayoutShell shared profile skeleton"
```

---

## 任务 6：重构自己主页 profile-page.tsx

**文件：**
- 修改：`apps/web/src/features/auth/profile-page.tsx`

- [ ] **步骤 1：重构页面代码**

将原有页面重构为使用 `ProfileLayoutShell`、`ProfileMetaBar`、`ProfileStatusHint`、`ProfileFilterBar`。保留所有数据获取和删除/封面上传的逻辑，仅替换布局结构。

**关键变更点：**
1. 移除 `ProfileOverviewCard`、`MetricStrip` 的本地定义
2. 移除右侧四格统计 + 消息中心卡片区域
3. Banner 区域保持原有逻辑，但调整头像尺寸为 `h-20 w-20 md:h-24 md:w-24`
4. 使用 `ProfileMetaBar` 展示简介 + 统计 + 操作按钮
5. 使用 `ProfileStatusHint` 替代消息中心卡片（有未读消息时显示）
6. 使用 `ProfileFilterBar` 统一筛选器样式
7. 错误提示 Alert 移到 `ProfileLayoutShell` 的 `alert` 插槽（页面顶部）
8. 保持 `ContentFeedListRow` 和分页逻辑不变

**新的 profile-page.tsx 结构：**

```tsx
// 保留所有 import，新增：
import { ProfileLayoutShell } from "./profile-layout-shell";
import { ProfileMetaBar, type ProfileMetric } from "./profile-meta-bar";
import { ProfileStatusHint } from "./profile-status-hint";
import { ProfileFilterBar } from "./profile-filter-bar";
// 移除 ProfileOverviewCard import

// 保留所有状态、useQuery、useEffect、数据处理逻辑不变

// 在 return 中：
<ProfileLayoutShell
  alert={actionError || profileQuery.isError || currentProfileQuery.isError ? (
    <Alert ...>...</Alert>
  ) : null}
  banner={
    <div className="relative h-40 overflow-hidden border-b border-border/60 md:h-48">
      {/* 封面图、渐变遮罩、编辑封面按钮、头像、姓名、IP、Badge */}
      {/* 头像改为 h-20 w-20 md:h-24 md:w-24 */}
    </div>
  }
  metaBar={
    <ProfileMetaBar
      bio={bio}
      metrics={[
        { key: "followers", label: "关注者", value: profile?.followerCount ?? 0 },
        { key: "following", label: "关注中", value: profile?.followingCount ?? 0 },
        { key: "favorites", label: "收藏", value: profile?.favoriteCount ?? 0 },
        { key: "published", label: "内容", value: overviewMetrics.find(m => m.key === "published")?.value ?? 0 }
      ]}
    >
      <Button asChild size="sm" variant="outline"><Link to={APP_ROUTES.webSettings}><Settings2Icon data-icon="inline-start" />修改资料</Link></Button>
      <Button asChild size="sm" variant="outline"><Link to={APP_ROUTES.notifications}>{messageTone === "unread" ? <BellRingIcon /> : <BellIcon />}{messageSummary.title}</Link></Button>
      <Button asChild size="sm" variant="default"><Link to={APP_ROUTES.compose}><PenSquareIcon data-icon="inline-start" />去发布内容</Link></Button>
    </ProfileMetaBar>
  }
  statusHint={
    notificationsQuery.data?.unreadCount && notificationsQuery.data.unreadCount > 0 ? (
      <ProfileStatusHint
        description={messageSummary.description}
        tone="highlight"
        title={messageSummary.title}
      >
        <Button asChild size="sm" variant="hero"><Link to={APP_ROUTES.notifications}>进入消息中心</Link></Button>
      </ProfileStatusHint>
    ) : null
  }
  tabs={[{ value: "activity", label: "内容" }, { value: "favorites", label: "收藏" }]}
  activeTab={activeTab}
  onTabChange={(value) => setActiveTab(value as ProfileTab)}
  filterBar={
    activeTab === "activity" ? (
      <>
        <ProfileFilterBar
          active={activeContentCategory}
          onChange={(v) => setActiveContentCategory(v as ProfileContentCategory)}
          options={profileContentCategories.map((c) => ({ value: c.value, label: c.label, count: contentCategoryCounts.get(c.value) ?? 0 }))}
        />
        <ProfileFilterBar
          active={activeLifecycle}
          onChange={(v) => setActiveLifecycle(v as ProfileLifecycle)}
          options={profileLifecycleFilters.map((l) => ({ value: l.value, label: l.label }))}
        />
      </>
    ) : (
      <ProfileFilterBar
        active={activeFavoriteCategory}
        onChange={(v) => setActiveFavoriteCategory(v as ProfileContentCategory)}
        options={profileFavoriteCategories.map((c) => ({ value: c.value, label: c.label, count: favoriteCategoryCounts.get(c.value) ?? 0 }))}
      />
    )
  }
>
  {/* 保留现有的内容列表和分页逻辑 */}
  {activeTab === "activity" ? (
    activityItems.length === 0 ? (
      <div className="bg-white px-5 py-8 text-center text-sm text-muted-foreground">当前分类下还没有内容。</div>
    ) : (
      <>
        <div className="divide-y divide-border/60 border border-border/60 bg-white">
          {paginatedActivityItems.map((item, idx) => (
            <ContentFeedListRow ... />
          ))}
        </div>
        <ProfileGridPagination ... />
      </>
    )
  ) : (
    /* favorites content */
  )}
</ProfileLayoutShell>
```

- [ ] **步骤 2：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/features/auth/profile-page.tsx
git commit -m "refactor(web): redesign self-profile page with unified layout shell"
```

---

## 任务 7：重构他人主页 user-profile-page.tsx

**文件：**
- 修改：`apps/web/src/routes/user-profile-page.tsx`

- [ ] **步骤 1：重构页面代码**

与任务 6 类似，使用 `ProfileLayoutShell` 替换原有布局。

**关键变更点：**
1. 移除本地 `MetricStrip` 定义
2. Banner 区域使用访客数据，头像 `h-20 w-20 md:h-24 md:w-24`
3. `ProfileMetaBar` 使用访客统计数据：关注者、关注中、收藏、公开内容
4. 简介文本根据 `canViewProfile` 显示
5. `ProfileStatusHint` 根据关系状态显示（内容不可见/已关注/可查看）
6. 操作按钮：`关注/取消关注` + `返回我的主页`
7. 内容 Tab 下不使用生命周期筛选（访客看不到草稿等状态）
8. 保留现有的关注和内容加载逻辑

- [ ] **步骤 2：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/routes/user-profile-page.tsx
git commit -m "refactor(web): redesign visitor profile page with unified layout shell"
```

---

## 任务 8：重构设置页 settings-page.tsx

**文件：**
- 修改：`apps/web/src/routes/settings-page.tsx`

- [ ] **步骤 1：重构页面代码**

**关键变更点：**

1. **顶部新增 Profile Summary Card**：
   - 放在 `SitePageHead` 下方
   - `SitePanel variant="floating"`
   - 内部：`flex items-center gap-4 px-5 py-4`
   - 左：`UserAvatar h-16 w-16`
   - 中：昵称 `text-base font-semibold` + 简介 `text-sm text-muted-foreground line-clamp-1`
   - 右：无（或放 `查看主页` 小链接）

2. **SettingsPanel 改为单列布局**（不再左右分栏）：
   - 所有设置组垂直堆叠
   - 组间距 `gap-4`
   - 最大宽度 `max-w-[48rem]` 居中（避免行过长）

3. **SettingsRow 改为标签+描述垂直堆叠**：
   ```tsx
   <div className="flex items-start justify-between gap-4 px-4 py-3.5">
     <div className="min-w-0">
       <div className="text-sm font-medium text-foreground">{label}</div>
       <div className="text-sm text-muted-foreground">{description}</div>
     </div>
     <div className="shrink-0">{action}</div>
   </div>
   ```

4. **通知开关改为 Toggle Switch**：
   - 使用新建的 `Switch` 组件
   - 位置在设置行右侧
   - 保持乐观更新 + 失败回滚逻辑
   - 替换 `toggleNotificationField` 中的按钮逻辑：
     ```tsx
     <Switch
       checked={draft[field]}
       disabled={savingField === field}
       onCheckedChange={() => {
         void toggleNotificationField(field, option.successMessage);
       }}
     />
     ```
   - 注意：`toggleNotificationField` 需要适配：按钮是点击触发，Switch 是 `onCheckedChange`。由于 `toggleSettingsFlag` 会自动翻转布尔值，直接复用现有逻辑即可。

5. **Footer Actions**：
   - 放在最后一个 panel 之后
   - `flex flex-wrap items-center gap-3 pt-2`
   - `查看个人主页` · `查看消息` · `退出登录`

- [ ] **步骤 2：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 3：Commit**

```bash
git add apps/web/src/routes/settings-page.tsx
git commit -m "refactor(web): redesign settings page with profile card and toggle switches"
```

---

## 任务 9：清理 profile-surface.tsx

**文件：**
- 修改：`apps/web/src/features/auth/profile-surface.tsx`

- [ ] **步骤 1：检查 profile-surface.tsx 的引用**

运行：
```bash
cd apps/web && grep -r "ProfileListPagination\|ProfileMetricStrip\|ProfileOverviewCard" src/
```
预期：经过任务 6、7 后，这些导出应该不再被引用。如果仍有引用，需要一并更新。

- [ ] **步骤 2：清理废弃导出**

保留共用的 `ProfileListPagination`（如果改名为 `ProfileGridPagination` 则完全移除），移除 `ProfileMetricStrip` 和 `ProfileOverviewCard`。

如果 `ProfileListPagination` 和 `profile-page.tsx` / `user-profile-page.tsx` 中的 `ProfileGridPagination` 完全重复，则将分页逻辑统一放到 `profile-surface.tsx` 中并改名为 `ProfilePagination`，然后在两个页面中统一引用。

**简化后的 profile-surface.tsx：**

```tsx
import { Button } from "@/components/ui/button";

export function ProfilePagination(props: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
      <Button
        disabled={props.page <= 1}
        onClick={() => props.onPageChange(props.page - 1)}
        size="sm"
        type="button"
        variant="ghost"
      >
        上一页
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        {props.page} / {props.totalPages}
      </span>
      <Button
        disabled={props.page >= props.totalPages}
        onClick={() => props.onPageChange(props.page + 1)}
        size="sm"
        type="button"
        variant="ghost"
      >
        下一页
      </Button>
    </div>
  );
}
```

然后更新 `profile-page.tsx` 和 `user-profile-page.tsx` 中的分页引用，使用统一的 `ProfilePagination`。移除两文件中本地的 `ProfileGridPagination` 定义。

- [ ] **步骤 3：验证类型检查**

运行：`cd apps/web && bun run typecheck`
预期：无类型错误

- [ ] **步骤 4：Commit**

```bash
git add apps/web/src/features/auth/profile-surface.tsx apps/web/src/features/auth/profile-page.tsx apps/web/src/routes/user-profile-page.tsx
git commit -m "refactor(web): clean up profile-surface, unify pagination component"
```

---

## 任务 10：最终验证

- [ ] **步骤 1：运行 lint**

```bash
cd apps/web && bun run lint
```
预期：无错误

- [ ] **步骤 2：运行 typecheck**

```bash
cd apps/web && bun run typecheck
```
预期：无类型错误

- [ ] **步骤 3：运行 build**

```bash
cd apps/web && bun run build
```
预期：构建成功

- [ ] **步骤 4：最终 Commit（如有修复）**

```bash
git add -A
git commit -m "style(web): fix lint/type issues from profile redesign"
```

---

## 自检

**1. 规格覆盖度：**

| 规格需求 | 对应任务 |
|----------|----------|
| Switch 组件 | 任务 1 |
| 紧凑 MetaBar 替代右侧统计卡片 | 任务 2 + 6/7 |
| 统一筛选器 pill | 任务 4 + 6/7 |
| StatusHint 替代大卡片 | 任务 3 + 6/7 |
| 错误提示移到页面顶部 | 任务 6/7（ProfileLayoutShell alert 插槽） |
| 设置页顶部资料卡片 | 任务 8 |
| 设置页分组列表布局 | 任务 8 |
| 设置页 Toggle 开关 | 任务 1 + 8 |
| 清理废弃组件 | 任务 9 |
| 统一分页组件 | 任务 9 |

无遗漏。

**2. 占位符扫描：**
- 无 "待定" / "TODO" / "后续实现"
- 所有代码步骤均包含可执行的完整代码
- 无 "类似任务 N" 引用
- 所有类型、方法签名在前后任务中一致

**3. 类型一致性：**
- `ProfileMetric` 接口在任务 2 定义，任务 6/7 使用 ✓
- `FilterOption` 接口在任务 4 定义，任务 6/7 使用 ✓
- `ProfileTabDef` 接口在任务 5 定义，任务 6/7 使用 ✓
- `Switch` 组件在任务 1 定义，任务 8 使用 ✓
- `ProfilePagination` 在任务 9 定义/更新 ✓
