<!-- Generated: 2026-05-22T08:28:05.565Z | Updated: 2026-05-25T12:10:00.000Z -->
<!-- Parent: ../AGENTS.md -->

# web — Web frontend

## Purpose
Jarvis Engine 前端 UI — React + Ant Design + Vite 构建，产物合并为单个 HTML 文件嵌入引擎。

## Key Files
| File | Description |
|------|-------------|
| AGENTS.md | Markdown documentation |
| CLAUDE.md | Markdown documentation |
| index.html | HTML 入口模板 |
| package.json | 前端依赖与 scripts |
| package-lock.json | Lock file |
| tsconfig.json | TypeScript 配置 |
| vite.config.ts | Vite 构建/开发配置 — viteSingleFile 仅 build 生效，JARVIS_DEV 控制引擎代理端口 |
| vitest.config.ts | Vitest 测试配置 |


## Subdirectories
| Directory | Description | AGENTS |
|-----------|-------------|--------|
| docs/ | Documentation | [AGENTS.md](docs/AGENTS.md) |
| public/ | Static assets | [AGENTS.md](public/AGENTS.md) |
| src/ | Full-stack source code (client + server) | [AGENTS.md](src/AGENTS.md) |


## For AI Agents

### Working In This Directory
- `JARVIS_DEV=1 npm run dev` — 开发模式，引擎代理 → 127.0.0.1:3457
- `npm run preview` — 生产构建预览（无需引擎）
- `NODE_ENV=development npm install` — 安装依赖时必须带 NODE_ENV=development，否则 devDependencies 不会安装
- vite-plugin-singlefile 通过 `apply: 'build'` 限制在构建阶段，不干扰 dev server 的 HMR


## Dependencies
- **Internal:** docs/, public/, src/
- **External:** react 19, antd 6, vite 8, @vitejs/plugin-react 6

<!-- MANUAL:START -->
<!-- MANUAL:END -->
