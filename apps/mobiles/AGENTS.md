# @feijia/mobiles

移动端应用占位包：当前无完整 dev/build 管线，`typecheck` 为占位输出。

## 目录架构

```
apps/mobiles/
├── AGENTS.md
├── README.md
├── package.json
└── tsconfig.json
```

## 预期

- 后续接入具体框架（如 React Native / Expo 等）时再补充本文件与 `package.json` scripts。
- 业务合约仍应对齐 `packages/schemas` 与 `@feijia/http-client`（或等价客户端）。

## 编辑指引

- 在落地真实技术栈前，避免让其他 workspace 包依赖本目录中的未稳定 API。
