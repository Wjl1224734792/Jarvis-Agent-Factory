# Web 端滚动位置保持 + 首页 Tab 状态持久化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 用户从首页信息流点击进入详情页（帖子详情、机型详情、榜单详情等）后返回时，保持信息流的滚动位置和当前选中的 Tab 标签。

**架构：** 
1. 在 `WebLayout` 组件中渲染 `<ScrollRestoration />` 组件（React Router v7 的方式），利用浏览器 history 自动保存和恢复滚动位置。
2. 创建 `home-tab-store.ts` Zustand store，使用 localStorage 持久化首页 activeTab 状态，返回时恢复之前选中的标签。

**技术栈：** React Router v7, Zustand, localStorage

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `apps/web/src/features/auth/web-layout.tsx` | 修改 | 添加 `<ScrollRestoration />` 组件到布局中 |
| `apps/web/src/store/home-tab-store.ts` | 创建 | Zustand store，持久化首页 activeTab 状态到 localStorage |
| `apps/web/src/routes/home-page.tsx` | 修改 | 使用 home-tab-store 替代 useState 管理 activeTab |

---

### 任务 1：启用 React Router ScrollRestoration

**文件：**
- 修改：`apps/web/src/features/auth/web-layout.tsx`

- [ ] **步骤 1：在 WebLayout 中添加 ScrollRestoration 组件**

在 `web-layout.tsx` 中：

1. 添加 import（在第 15 行的 react-router-dom import 中）：
```typescript
import { Link, NavLink, Outlet, useLocation, ScrollRestoration } from "react-router-dom";
```

2. 在 `WebLayout` 组件的 return JSX 中，在 `<Outlet />` 之后、`</div>` 之前（约第 341 行），添加 `<ScrollRestoration />`：

```tsx
<div className="min-w-0">
  <Outlet />
  <ScrollRestoration />
</div>
```

`<ScrollRestoration />` 是 React Router v7 提供的组件，会自动在浏览器 history stack 中保存和恢复每个历史条目的滚动位置。

- [ ] **步骤 2：运行 typecheck 验证**

运行：`bun run typecheck`
预期：PASS，无类型错误

- [ ] **步骤 3：运行 lint 验证**

运行：`bun run lint`
预期：PASS

---

### 任务 2：创建首页 Tab 状态持久化 Store

**文件：**
- 创建：`apps/web/src/store/home-tab-store.ts`

- [ ] **步骤 1：创建 home-tab-store.ts**

```typescript
import { create } from "zustand";

const STORAGE_KEY = "feijia.web.home-tab";

type HomeTabState = {
  kind: "fixed";
  id: "recommended" | "latest" | "following";
} | {
  kind: "category";
  slug: string;
};

type HomeTabStore = {
  activeTab: HomeTabState;
  setActiveTab: (tab: HomeTabState) => void;
};

function readPersistedTab(): HomeTabState {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return { kind: "fixed", id: "recommended" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { kind: "fixed", id: "recommended" };
    }

    const parsed = JSON.parse(raw) as HomeTabState;
    // 校验基本结构
    if (parsed && typeof parsed.kind === "string") {
      return parsed;
    }

    return { kind: "fixed", id: "recommended" };
  } catch {
    return { kind: "fixed", id: "recommended" };
  }
}

function writePersistedTab(tab: HomeTabState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tab));
}

export const useHomeTabStore = create<HomeTabStore>((set) => ({
  activeTab: readPersistedTab(),
  setActiveTab: (tab) => {
    writePersistedTab(tab);
    set({ activeTab: tab });
  }
}));
```

- [ ] **步骤 2：运行 typecheck 验证**

运行：`bun run typecheck`
预期：PASS

- [ ] **步骤 3：运行 lint 验证**

运行：`bun run lint`
预期：PASS

---

### 任务 3：HomePage 使用持久化 Store

**文件：**
- 修改：`apps/web/src/routes/home-page.tsx:54-57`（activeTab 状态）
- 修改：`apps/web/src/routes/home-page.tsx:136-138`（setActiveTab 调用处）

- [ ] **步骤 1：修改 HomePage 使用 home-tab-store**

在 `home-page.tsx` 中：

1. 添加 import：
```typescript
import { useHomeTabStore } from "@/store/home-tab-store";
```

2. 删除第 54-57 行的 useState：
```typescript
// 删除：
const [activeTab, setActiveTab] = useState<HomeTabState>({
  kind: "fixed",
  id: "recommended"
});
```

3. 替换为 store 读取：
```typescript
const activeTab = useHomeTabStore((state) => state.activeTab);
const setActiveTab = useHomeTabStore((state) => state.setActiveTab);
```

4. 删除不再需要的 import：`useState`（如果文件中没有其他使用）

查看 home-page.tsx 第 11 行：`import { useMemo, useState } from "react";`
改为：`import { useMemo } from "react";`

- [ ] **步骤 2：运行 typecheck 验证**

运行：`bun run typecheck`
预期：PASS

- [ ] **步骤 3：运行 lint 验证**

运行：`bun run lint`
预期：PASS

---

### 任务 4：全量验证

- [ ] **步骤 1：运行 typecheck**

运行：`bun run typecheck`
预期：PASS，无类型错误

- [ ] **步骤 2：运行 lint**

运行：`bun run lint`
预期：PASS

- [ ] **步骤 3：运行 build**

运行：`bun run build`
预期：BUILD SUCCEEDED，无错误

- [ ] **步骤 4：运行测试（如果有）**

运行：`bun run test`
预期：所有测试通过

---

## 规格自检

1. **占位符扫描：** 无 TODO、待定、未完成章节。所有代码完整。
2. **内部一致性：** 
   - `HomeTabState` 类型在 store 和 HomePage 中一致（都来自同一类型定义）
   - `activeTab` 的默认值 `{ kind: "fixed", id: "recommended" }` 与原 useState 默认值一致
   - `STORAGE_KEY = "feijia.web.home-tab"` 遵循项目已有的 `feijia.web.auth` 命名规范
3. **范围检查：** 聚焦，3 个文件变更，一个实现计划可覆盖。
4. **模糊性检查：** 
   - `<ScrollRestoration />` 是 React Router v7 的标准组件，放在 `<Outlet />` 同级即可生效
   - localStorage 持久化方案与项目已有的 auth-store-persistence.ts 模式一致
   - HomeTabState 类型直接复用 home-page.tsx 中已有的类型定义
