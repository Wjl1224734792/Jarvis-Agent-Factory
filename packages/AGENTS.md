# packages 层

Workspace 内部库，供 `apps/*` 消费；保持无环依赖、导出稳定。

## 目录架构

```
packages/
├── AGENTS.md
├── config/              # 共享 tsconfig 片段（无 src）
│   ├── tsconfig.base.json
│   ├── tsconfig.react.json
│   └── tsconfig.server.json
├── shared/              # 跨端常量与工具
│   └── src/
├── schemas/             # Zod 合约 + 类型
│   ├── src/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   └── health.ts
│   └── tests/
│       ├── auth.test.ts
│       └── health.test.ts
└── http-client/         # 面向前端的 HTTP 封装
    └── src/
```

## 成员

| 包 | 作用 |
|----|------|
| `@feijia/config` | 共享 `tsconfig` 片段（`exports` 子路径），无业务逻辑 |
| `@feijia/shared` | 跨端常量与工具（如路由前缀等），尽量保持轻量 |
| `@feijia/schemas` | Zod 模式与类型，API/表单的单一事实来源；含单测 |
| `@feijia/http-client` | 基于 schemas 的 HTTP 封装，供前端调用后端 |

## 依赖方向（示意）

```
config（独立）
shared
  ↑
schemas → http-client
```

应用侧：`server` 使用 `shared` + `schemas`；`web` / `admin` 使用 `http-client` + `schemas` + `shared`。

## 编辑指引

- 变更对外类型或校验规则时，优先改 `schemas`，再适配 `http-client` 与 `server`。
- 避免在 `shared` 中堆积仅某一 app 使用的逻辑。
