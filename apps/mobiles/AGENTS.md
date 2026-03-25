# @feijia/mobiles

移动端应用占位包：当前无完整 dev/build 管线，`typecheck` 等脚本可能仍为占位。

## 目录架构

```
apps/mobiles/
├── AGENTS.md
├── README.md
├── package.json
└── tsconfig.json
```

## 预期

- 后续接入具体框架（如 React Native / Expo 等）时再扩充目录与本说明。
- 业务合约与路径应对齐 `packages/schemas` 与 `@feijia/shared`（`API_ROUTES` / `APP_ROUTES`）。

## 编辑指引

- 在落地真实技术栈前，避免让其他 workspace 包依赖本目录未稳定的导出。
