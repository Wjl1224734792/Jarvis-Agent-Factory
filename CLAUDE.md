# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 加载链路

```
CLAUDE.md (本文件) → AGENTS.md (L0–L5 代码约束)
  → .claude/rules/ (专项编程规范)
    → .claude/agents/ (子代理定义)
```

## 规则源

| 层级 | 文件 | 内容 |
|------|------|------|
| 项目级约束 | [`AGENTS.md`](./AGENTS.md) | L0–L5：硬约束、编码、范围、修改规则、收尾验证 |
| 专项规范 | [`.claude/rules/`](./.claude/rules/) | TypeScript/Interface、团队协作（Prettier/ESLint/提交/CI）、通用编程规范（DDD/TDD/嵌套/数组等） |
| 子代理定义 | [`.claude/agents/`](./.claude/agents/) | 47 个专项子代理 |
| 子路径规则 | `apps/*/AGENTS.md` · `packages/AGENTS.md` · `docker/AGENTS.md` | 按工作目录自动加载 |

## 模式入口

- `/jarvis` — 贾维斯编排模式（需求→文档→任务→计划→实现→评审→发布）
- `/review` — 只读审查模式
- `/review-fix` — 审查修复优化闭环

---

## 常用命令

### 开发

```bash
bun run dev:server    # API 服务 (localhost:17382)
bun run dev:web       # 用户端 (localhost:17380)
bun run dev:admin     # 管理后台 (localhost:17381)
bun run dev           # 三端并行启动
```

### 质量校验

```bash
bun run lint          # ESLint
bun run typecheck     # tsc --noEmit（全仓）
bun run test          # 单元测试（快速）
bun run test:server   # 服务端集成测试（会重置 DB/Redis）
bun run test:e2e      # Playwright E2E（需先 setup:test）
bun run build         # 构建
bun run check         # = lint + test + typecheck + build
```

### 数据库

```bash
bun run db:generate   # 生成 Drizzle 迁移
bun run db:migrate    # 执行迁移
bun run db:push       # 直接推送 schema（开发用）
bun run db:seed       # 导入 demo 数据
bun run db:reset      # wipe → migrate → seed（默认 demo）
bun run db:clear      # 清空业务数据（保留表结构）
bun run setup:dev     # infra:up + db:reset:demo
bun run setup:test    # infra:up + db:reset:mock
```

### 基础设施

```bash
bun run infra:up      # 启动 Postgres + Redis + MinIO
bun run infra:down    # 停止
bun run infra:ps      # 查看状态
```

---

## 仓库架构

```
feijia/
├─ apps/
│  ├─ web/         # 用户端前端（React 19 + Vite + Tailwind CSS 4）
│  ├─ admin/       # 管理后台（React 19 + Vite + antd 5 + Tailwind CSS 4）
│  └─ server/      # API 服务（Hono + Bun + Drizzle ORM）
├─ packages/
│  ├─ shared/      # 路由常量 API_ROUTES、重定向配置
│  ├─ schemas/     # Zod schema + 共享类型（请求/响应/枚举）
│  ├─ http-client/ # 基于 schemas 的 API 调用封装
│  ├─ db/          # Drizzle schema、迁移、seed 脚本
│  └─ config/      # 共享构建/工具链配置
├─ docker/         # 本地开发基础设施（Postgres/Redis/MinIO）
└─ docs/           # 需求文档、设计系统、PRD
```

**依赖方向**：`apps/*` → `packages/*` → 外部。禁止 `packages` → `apps` 或循环依赖。

### 共享协议修改顺序

改 API 形状、路由常量、请求/响应类型时，按序评估影响：

```
packages/schemas → packages/http-client → packages/shared → apps/server → apps/web | apps/admin
```

禁止在 `apps/*` 重复定义应属于 `packages/*` 的结构。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 运行时 | Bun 1.3+ |
| 前端框架 | React 19 + Vite |
| UI | Tailwind CSS 4 + Radix UI (web) / antd 5 (admin) |
| 后端 | Hono (TypeScript) |
| 数据库 | PostgreSQL + Drizzle ORM |
| 缓存/会话 | Redis |
| 对象存储 | MinIO（本地）/ 七牛 Kodo（生产） |
| 测试 | Vitest（单元）+ Playwright（E2E） |
| 包管理 | Bun workspace（monorepo） |

## 关键模式

### API 路由约定

- 所有业务 API 前缀 `/api/v1`
- 路由常量定义在 `packages/shared/src/index.ts` 的 `API_ROUTES` 对象
- 路由文件和 OpenAPI 文档必须使用 `API_ROUTES` 常量，禁止硬编码路径字符串
- OpenAPI 文档在 `apps/server/src/openapi/paths/` 下，Swagger UI 在 `/docs`

### 文件上传协议（三步）

```
1. POST /api/v1/uploads/init { bizType, fileName, fileSize, contentType } → uploadId + signedUrl
2. PUT 文件到 signedUrl（直传对象存储）
3. POST /api/v1/uploads/complete { uploadId } → fileId + accessUrl
```

业务类型：`post-image`、`post-video`、`avatar-image`、`aircraft-cover-image`、`aircraft-video`、`ranking-cover-image`、`ranking-item-image`、`report-image`

### 认证体系

- 短信登录 + 密码登录双模式
- 短信验证码需先通过图形验证码（SVG Captcha）
- 新用户首次短信登录自动注册，需补全显示名和头像
- Session 基于 Cookie，401 自动 refresh
- 开发环境验证码万能绕过码：`0000`（仅 `NODE_ENV=development`）

### 种子数据分层

| 类型 | 命令 | 用途 |
|------|------|------|
| `base` | `db:seed:base` | 最小可运行（管理员、站点设置、分类） |
| `demo` | `db:seed:demo` | 演示内容（机型、帖子、榜单） |
| `mock` | `db:seed:mock` | 大规模测试数据 |

### Git Flow

```
main（生产）→ dev（集成）→ feature/* | hotfix/* | release/*
```

- Feature 从 dev 创建，合并回 dev（`--no-ff`）
- 提交格式：`<type>(scope): <subject>`（Conventional Commits）
- Tag 只打在 main 的 merge commit 上

---

## 测试账号

### Demo 数据

| 账号 | 密码 |
|------|------|
| admin | Admin#123 |

### Mock 数据

| 登录方式 | 凭据 |
|----------|------|
| 管理员 testadmin | TestAdmin#123 |
| 短信登录 | 13800138000 / 888888 |

---

## App 端参考文档

| 文档 | 路径 | 用途 |
|------|------|------|
| PRD | `docs/web-frontend-features-prd.md` | 21 个页面功能、交互模式、Flutter 方案 |
| 设计系统 | `docs/web-design-system.md` | 色彩、排版、间距、圆角、阴影、组件规范 |
| API 文档 | `/docs`（Swagger UI）或 `/openapi.json` | 168 个端点 |

Flutter App 不在本仓库维护。
