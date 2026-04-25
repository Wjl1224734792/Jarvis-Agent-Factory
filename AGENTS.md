# AGENTS.md

> **用途**：约束**自动化代理**在本仓库中的行为（读代码、改代码、收尾）。  
> **文体**：指令、检查清单、可判定规则；**不**承担叙事、上手教程、端口说明——那些只在 [`README.md`](./README.md)。  
> **禁止**：把本文件当作人类入职文档朗读；人类日常以 README 与各层 `README.md` 为准。

子路径 `**/AGENTS.md` 仅补充该路径下的可执行约束；与根文件冲突时 **以根文件为准**。

### 分层写作规则（各 AGENTS 共用）

- 只写**本路径职责内**边界；不复制根文件 L0–L5、不复制 [`EXAMPLES.md`](./EXAMPLES.md) 中的准则全文。
- 不越级描述兄弟目录实现；需要时用链接指向上级 [`AGENTS.md`](./AGENTS.md) 或人类文档 [`README.md`](./README.md)。
- 牵连其它包时：允许一行「须同步检查 `…`」，契约以 `schemas` / README 为准。

---

## 索引：读哪一段（渐进式披露）

自上而下按需加载；**不得**为「读完」而阅读与当前任务无关的节。

| 标记 | 节 | 触发条件 |
|------|-----|----------|
| L0 | [硬约束](#l0) | 每个任务 |
| L1 | [编码与审查](#l1) | 任意写码/改码 |
| L2 | [范围与技术栈](#l2) | 选模块、判断是否属本仓 |
| L3 | [修改规则](#l3) | 协议、DB、env、Compose |
| L4 | [CORS / OpenAPI](#l4) | 跨域、文档开关、相关 env |
| L5 | [收尾验证](#l5) | 宣称完成或提交前 |
| — | [附录：路径路由](#appendix) | 需子树或 EXAMPLES |

任务落在 `apps/*`、`packages/*`、`docker/*` 子目录：读完 **L0–L2** 后打开该目录 `AGENTS.md`。

---

<a id="l0"></a>

## L0 硬约束

- **必须**：变更范围 ⊆ 用户请求；最小正确 diff；改前扫相关目录、调用链、[`.env.example`](./.env.example)、README 中与本次相关的节。
- **必须**：删除本 diff 引入的未使用符号/导入。
- **禁止**：顺手重构、改无关注释/格式、删既有死代码（除非任务明确要求）。

---

<a id="l1"></a>

## L1 编码与审查

极简单改动可弱化执行。

- **思考**：先列假设；多解并列；有更简路径可声明；不确定则提问。
- **简洁**：最小实现；不扩需求；不单处抽象；不为不可能路径堆逻辑。
- **手术式**：只改必要行；风格贴合周边文件。
- **可验证**：产出可检查（测试、复现步骤、前后行为对比）；多步任务每步有验收。
- **注释**：关键逻辑、公共 API、边界须 TSDoc/JSDoc；**注释不足以说明意图与契约 → 视为未通过审查。**

反例库（示意代码）：[`EXAMPLES.md`](./EXAMPLES.md)。

---

<a id="l2"></a>

## L2 范围与技术栈

**在仓**：`apps/web`、`apps/admin`、`apps/server`；`packages/*`；`docker/*`（仅本地基座，非生产编排）；`docs/`。

**不在仓**：`apps/mobiles`（勿恢复）；小程序/App（Taro/Flutter 另库）。

**忽略**：`.claude/`、`.trae/`、`.cursor/` 为非 Codex 工具目录；除非用户明确点名，代理不得读取、总结或修改其中的 README / AGENTS / skills / rules / 配置。

**栈**：Bun · Vitest · Drizzle · Hono。依赖：`apps` → `packages` → 外部；**禁止** `packages` → `apps`。

---

<a id="l3"></a>

## L3 修改规则

### 共享协议

改 API 形状、路由常量、请求/响应类型 → 按序打开并评估影响：

`packages/schemas` → `packages/http-client` → `packages/shared` → `apps/server` → `apps/web` | `apps/admin`。

禁止在 `apps/*` 重复定义应属于 `packages/*` 的结构。

### 数据库

动 schema / 迁移 / seed → 涉及 `packages/db`、`apps/server`。  
语义：`db:clear` 仅清数据；`db:wipe-schema` 重建 `public`；`db:reset:*` = wipe → migrate → seed。  
若改根 `db:*` 或 `packages/db` 脚本 → **同步** [`README.md`](./README.md)「数据库与数据初始化」。

### 环境变量

改 env → **必须**同步：[`.env.example`](./.env.example)、根 [`README.md`](./README.md)、已提到该变量的子目录文档。  
`CORS_ORIGIN` / `CORS_ORIGINS` / `WEB_DEV_PORT` / `ADMIN_DEV_PORT` / `WEB_DEV_HOST` / `ADMIN_DEV_HOST` → 同步 README「CORS 与局域网访问」。

### 基础设施

优先 `bun run infra:up` · `infra:ps` · `infra:down`。禁止未接线目录、壳工程、占位脚本。

---

<a id="l4"></a>

## L4 CORS 与 OpenAPI

**CORS**

- 挂载：`apps/server/src/app.ts`；默认开发来源逻辑：`apps/server/src/lib/cors-origins.ts`。
- 未显式配置 `CORS_ORIGIN` / `CORS_ORIGINS` 时，开发环境仅允许 `localhost`、`127.0.0.1`、私网 IPv4 的 `WEB_DEV_PORT` / `ADMIN_DEV_PORT`。
- 非默认来源或生产访问 → 根 `.env` 配 `CORS_ORIGIN`；**操作说明** → [`README.md`](./README.md) 对应节。
- 生产 **禁止** `CORS_ORIGIN=all`。

**用户头像**

- 契约：未设置头像时 `avatarUrl` 保持 `null` / 空值；不得在后端写入默认头像 URL。
- 前端：真实用户头像空值应交给 `UserAvatar` fallback icon，不得回退到 seed / 随机头像图。
- 示例/预览图可以使用 seed 图片，但不得混入真实用户资料默认策略。

**OpenAPI**

- `/docs`、`/openapi.json`；`OPENAPI_ENABLED`；未配置时非生产默认开、生产默认关；生产改动 **禁止** 默认暴露文档。

---

<a id="l5"></a>

## L5 收尾验证

宣称完成前至少跑（除非用户明确跳过）：

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

---

<a id="appendix"></a>

## 附录：路径路由

| 路径 | 加载时机 |
|------|----------|
| [`EXAMPLES.md`](./EXAMPLES.md) | L1 对照、审查 |
| [`apps/AGENTS.md`](./apps/AGENTS.md) | 任务在 `apps/*` |
| [`packages/AGENTS.md`](./packages/AGENTS.md) | 任务在 `packages/*` |
| [`docker/AGENTS.md`](./docker/AGENTS.md) | 任务在 `docker/*` |
| `apps/web` \| `admin` \| `server` 下 `AGENTS.md` | 进入该应用 |
| [`README.md`](./README.md) | 脚本表、端口、账号、排障（**唯一长表源**；AGENTS 不复制） |

人类文档入口（AGENTS 不复制其正文）：[`apps/README.md`](./apps/README.md)、[`packages/README.md`](./packages/README.md)、[`docker/README.md`](./docker/README.md)。
