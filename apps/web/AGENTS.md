# @feijia/web

用户端单页应用：Vite + React 19 + React Router + TanStack Query + Zustand；UI 含 `components/ui`（shadcn 风格）。

## 目录架构

```
apps/web/
├── AGENTS.md
├── components.json           # shadcn/ui 配置
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tests/                      # 例如 model-review-form 等单测
└── src/
    ├── main.tsx
    ├── app.tsx
    ├── styles.css
    ├── lib/
    │   ├── api-client.ts
    │   ├── query-client.ts
    │   ├── utils.ts
    │   └── aviation-media.ts
    ├── store/
    │   └── use-app-shell-store.ts
    ├── components/
    │   └── ui/                 # Button、Card、Sheet 等
    ├── routes/                 # 页面级路由组件
    │   ├── home-page.tsx
    │   ├── circle-page.tsx
    │   ├── models-page.tsx
    │   ├── model-detail-page.tsx
    │   ├── model-review-form.ts
    │   ├── post-detail-page.tsx
    │   ├── compose-page.tsx
    │   ├── rankings-page.tsx
    │   ├── ranking-editor-page.tsx
    │   ├── notifications-page.tsx
    │   └── settings-page.tsx
    └── features/
        ├── auth/               # 登录、布局、受保护路由、会话引导
        └── posts/              # 帖子相关 UI（如互动条）
```

## 功能要点

- **路由与文案路径**：与 `@feijia/shared` 的 `APP_ROUTES` 保持一致。
- **接口调用**：`lib/api-client.ts` + React Query；类型与合约来自 `@feijia/schemas` / `@feijia/http-client`。

## 依赖

- `@feijia/http-client`、`@feijia/schemas`、`@feijia/shared`。

## 编辑指引

- 默认开发端口见 `APP_PORTS.web`（一般为 3000）。
- 新页面优先落在 `routes/` 或 `features/<域>/`，鉴权模式对齐 `features/auth`。
