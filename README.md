# 飞加

面向本地与团队协作的 Bun Monorepo：包含用户端 Web、管理后台、API 服务、共享包，以及用 Docker 起的开发用数据库与对象存储。日常从下面 **快速开始** 就能把环境跑起来；小程序和原生 App **不在**本仓库维护（`apps/mobiles` 已移除）。

---

## 文档怎么分：人读 README，代理读 AGENTS

- **你（人类）**：克隆、装依赖、配环境、跑脚本、查端口和测试账号——**以本 README 与各目录下的 `README.md` 为主**。文字偏说明与流程，方便同事之间对齐。
- **Cursor / Copilot 等代理**：需要遵守的硬性规矩、分层读哪些文件、什么算「收尾」——写在根目录 **[`AGENTS.md`](./AGENTS.md)**。那是给工具执行的**指令集**，文风偏硬、按 L0–L5 按需阅读，**不必**当故事念给同事听。
- **对照示例**（非业务代码）：[`EXAMPLES.md`](./EXAMPLES.md)，配合 `AGENTS` 里编码准则使用。

一句话：**协作与上手看 README；约束代理行为看 AGENTS。**

| 想做的事 | 打开 |
|----------|------|
| 装环境、跑 `dev:*`、`db:*`、端口、CORS 操作步骤 | **本 README**（及 [`docker/README.md`](./docker/README.md)） |
| 改 `packages` / `apps` 前先弄清目录分工 | [`packages/README.md`](./packages/README.md)、[`apps/README.md`](./apps/README.md) |
| 给 AI 定规矩、查审查标准、收尾要跑什么命令 | [`AGENTS.md`](./AGENTS.md) |
| Codex 相关 | [`.codex/AGENTS.md`](./.codex/AGENTS.md) |

本仓库当前以 Codex 配置为准；`.claude/`、`.trae/`、`.cursor/` 属于其它工具目录，日常文档同步和仓库扫描默认忽略。

各子目录的 **`AGENTS.md` 只写该目录范围内**的约束，细则见根 [`AGENTS.md`](./AGENTS.md) 文首「分层写作规则」。

---

## 仓库结构

```text
feijia/
├─ apps/              ← 说明见 apps/README.md
│  ├─ web/
│  ├─ admin/
│  └─ server/
├─ packages/          ← 说明见 packages/README.md
│  ├─ config/
│  ├─ shared/
│  ├─ schemas/
│  ├─ http-client/
│  └─ db/
├─ docker/            ← 说明见 docker/README.md
├─ docs/
├─ AGENTS.md          ← 代理指令（L0–L5）
├─ EXAMPLES.md        ← 编码准则正反例示意
└─ .codex/            ← Codex 配置、代理与技能
```

## 环境要求

- Bun `1.3.11`
- Docker Desktop（需支持 `docker compose`）

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

将根目录的 [`.env.example`](./.env.example) 复制为 `.env`，再按实际环境修改。

### 3. 启动本地基础设施

```bash
bun run infra:up
```

### 4. 初始化数据环境

```bash
# 部署 / 生产初始化：执行迁移并导入基础 seed
bun run setup:deploy

# 开发环境：启动基础设施、清库、迁移并导入 demo 数据
bun run setup:dev

# 测试 / E2E / 压测环境：启动基础设施、清库、迁移并导入 mock 数据
bun run setup:test
```

### 5. 启动应用

```bash
bun run dev:server
bun run dev:web
bun run dev:admin
```

## 数据环境分层

| 类型 | 含义 | 典型用途 |
|------|------|----------|
| `base` | 最小可运行（管理员、站点设置、分类等） | `setup:deploy`、`db:seed:base` |
| `demo` | 在 base 上增加演示内容（机型、帖子、榜单等） | 本地开发、`db:seed` / `db:seed:demo` |
| `mock` | 大规模测试数据（PostgreSQL + Redis + 当前 `STORAGE_PROVIDER` 指向的对象存储） | E2E、`db:seed:mock`、`setup:test` |

## 常用脚本

### 开发

```bash
bun run dev:server
bun run dev:web
bun run dev:admin
```

### 基础设施

```bash
bun run infra:up
bun run infra:ps
bun run infra:down
```

### 数据库与数据初始化

根目录 `db:*` 与 `packages/db` 中脚本一一对应；`db:seed` 即执行 `packages/db` 的 `seed`（当前与 `seed:demo` 相同）。

```bash
bun run db:generate
bun run db:migrate
bun run db:push

# 只灌数据（不删表）
bun run db:seed              # 同 packages/db seed，当前 = demo
bun run db:seed:base | demo | mock
bun run db:seed:dev          # 同 db:seed
bun run db:seed:prod         # 同 db:seed:base
bun run db:seed:test-data    # 同 packages/db seed:test-data（= mock）

# 清数据或重建 schema
bun run db:clear             # 截断业务表 + 清 Redis，保留表结构
bun run db:wipe-schema       # 删并重建 public / drizzle schema + 清 Redis（破坏性）

# 全量重建：wipe-schema → migrate → seed
bun run db:reset             # 默认 = db:reset:demo
bun run db:reset:base | demo | mock
bun run db:reset:dev | test-data   # 别名见下

bun run setup:deploy         # migrate + seed:base，不启 Docker
bun run setup:dev            # infra:up + db:reset:demo
bun run setup:test           # infra:up + db:reset:mock（setup:test-data 同义）
```

要点：

- **只想清空数据**：用 `db:clear`。不要在「迁移记录与真实结构不一致」时指望单独再跑 `db:migrate` 自动修好。
- **要干净库 + 迁移**：用 `db:reset:*`（或手动 `db:wipe-schema && db:migrate && db:seed:…`）。
- **别名**：`db:reset:dev` = `db:reset:demo`；`db:reset:test-data` = `db:reset:mock`。

### 质量校验

```bash
bun run lint
bun run typecheck
bun run test:unit
bun run test:server
bun run test:integration
bun run test
bun run test:e2e
bun run build
bun run check
```

- `test` = 快速测试入口（当前同 `test:unit`），不再默认跑会反复清库 / seed 的 server 集成测试。
- `test:server` / `test:integration`：服务端集成测试，会按用例重置数据库与 Redis，耗时较长；改 API、DB、认证、上传、通知等服务端行为时单独运行。
- `test:e2e`：先 `infra:up` 与 `db:reset:mock`，再 Playwright；结束后库为 `mock`，需 demo 可 `bun run db:reset:demo`。
- `check` = lint + test + typecheck + build。

## 默认访问地址

以下端口与 [`.env.example`](./.env.example) 中的默认值一致：

- Web：`http://localhost:17380`
- Admin：`http://localhost:17381`
- Server：`http://localhost:17382`
- MinIO API：`http://localhost:9000`
- MinIO Console：`http://localhost:9001`

若启动 `dev:server` 时出现 `Failed to start server. Is port ... in use?`，说明 **SERVER_PORT**（默认与上表 Server 端口一致）已被占用：请先关闭其它正在运行的 `bun dev:server` 终端，或在 Windows 上查出并结束占用进程，例如：

```powershell
Get-NetTCPConnection -LocalPort 17382 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

也可使用 `netstat -ano | findstr :17382` 查看最后一列 PID，再 `taskkill /PID <pid> /F`。

## CORS 与局域网访问

服务端（`apps/server`）使用 Hono 的 `cors` 中间件，并允许携带 Cookie（`credentials: true`）。

- 未设置 `CORS_ORIGIN` / `CORS_ORIGINS` 时：开发环境默认允许 `localhost`、`127.0.0.1`、私网 IPv4（如 `192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`169.254.x.x`）访问 `WEB_DEV_PORT` / `ADMIN_DEV_PORT`。
- 生产环境或非上述来源访问时：在根目录 `.env` 中显式配置 `CORS_ORIGIN`（多个 Origin 用英文逗号分隔；`CORS_ORIGINS` 仅作兼容别名）。
- 生产环境禁止 `CORS_ORIGIN=all`；修改 CORS 配置后需重启 `dev:server`。

## OpenAPI 文档

服务端文档入口：

- JSON：`/openapi.json`
- Swagger UI：`/docs`

控制规则：

- `OPENAPI_ENABLED=true`：显式开启
- `OPENAPI_ENABLED=false`：显式关闭
- 未配置时：非生产默认开启，生产默认关闭

## 用户头像默认策略

- 用户未设置头像时，服务端返回 `avatarUrl = null`（或空值）。
- 前端统一使用头像组件的 icon / fallback 展示，不生成或回退到随机 seed 头像。
- `getAvatarImage` 仅用于示例内容或预览场景，不作为真实用户头像默认值。

## 日志与监控

开发默认控制台；生产默认写入项目根 `logs/` 目录，分 `app` / `request` / `error` / `security` 四个子目录（`LOG_DIR` 可覆盖）。环境变量：`LOG_MODE`、`LOG_DIR`、`LOG_LEVEL`、`LOG_HTTP_ENABLED`、`API_METRICS_ENABLED`、`LOG_MAX_READ_LINES`。Admin：`/admin/logs`；API：`GET /admin/logs/overview|files|entries`（管理员）。

当 `API_METRICS_ENABLED=true` 时，服务端会额外输出 `api.performance.baseline` 日志（当前覆盖 `GET /home/feed`、`GET /models`、`GET /rankings`），包含 `ms`、`responseBytes`、`fileLookupCount`，用于性能基线采样。

## 云厂商接入提示

短信服务：

- `SMS_PROVIDER=aliyun` 对接阿里云短信，填写 `ALIYUN_SMS_ACCESS_KEY_ID`、`ALIYUN_SMS_ACCESS_KEY_SECRET`、`ALIYUN_SMS_SIGN_NAME`、`ALIYUN_SMS_TEMPLATE_CODE`。
- `SMS_PROVIDER=tencent` 对接腾讯云短信，填写 `TENCENT_SMS_SECRET_ID`、`TENCENT_SMS_SECRET_KEY`、`TENCENT_SMS_SDK_APP_ID`、`TENCENT_SMS_SIGN_NAME`、`TENCENT_SMS_TEMPLATE_ID`。
- 服务端默认把验证码作为单一模板变量发送：阿里云走 `{"code":"123456"}`，腾讯云走 `["123456"]`。
- 本地可用 `SMS_PROVIDER=mock` 与 `SMS_EXPOSE_MOCK_CODE=true` 联调；生产环境禁止 mock provider，且必须配置 `AUTH_CODE_HASH_SECRET`（建议 32 字节以上随机值）用于 Redis 验证码哈希。
- 验证码策略可通过 `AUTH_CAPTCHA_TTL_SECONDS`、`AUTH_SMS_CODE_TTL_SECONDS`、`AUTH_SMS_CODE_LENGTH` 调整；当前 TTL 允许 60–600 秒，短信验证码位数允许 6–8 位。

对象存储：

- `STORAGE_PROVIDER=minio`：仅用于本地开发 / 测试。
- `STORAGE_PROVIDER=kodo`：用于开发 / 生产，对接七牛云 Kodo。
- `minio` 继续走本地 S3 兼容链路；`kodo` 已切换为七牛官方 `qiniu` SDK：服务端生成 upload token 与下载 URL，前端按表单上传直传对象存储。
- `kodo` 下的 `STORAGE_ENDPOINT` 应配置为上传域名，例如 `https://up-z0.qiniup.com`；如需固定区域，可额外配置 `KODO_REGION_ID`。
- `kodo` 强烈建议显式配置 `STORAGE_PUBLIC_BASE_URL` 为绑定的下载域名或 CDN 域名，避免依赖上传域名推导读地址。
- `kodo` 默认对读取 URL 使用七牛私有下载签名，避免下载域名未公开时浏览器 401；确认下载域名已开放匿名读时，可设置 `STORAGE_PRESIGN_READ_URLS=false` 改用直链。
- 云厂商环境请显式设置 `STORAGE_FORCE_PATH_STYLE=false`；`true` 只适合 MinIO 等本地 S3 兼容存储。
- 如果生产访问走 CDN 或自定义域名，请显式配置 `STORAGE_PUBLIC_BASE_URL`，不要依赖服务端从 endpoint 推导公网域名。
- 本地开发仍推荐 `STORAGE_PROVIDER=minio`；云厂商配置示例见 [`.env.example`](./.env.example)。
- `db:seed:mock` / `db:reset:mock` 会按当前 `.env` 的 `DATABASE_URL`、`REDIS_URL`、`STORAGE_PROVIDER` 与 `STORAGE_*` 导入 mock 数据；若指向远程环境，将直接写入该远程环境。
- `packages/db/src/runtime-seed.ts` 的对象存储示例资源仍按 MinIO/本地开发链路设计；mock/test-data seed 已支持按当前 `STORAGE_PROVIDER` 上传测试资源。

审核：

- 文本审核使用七牛文本审核 API。
- 图片走七牛图片审核接口；视频走七牛视频审核接口与回调。
- 视频审核回调依赖 `PUBLIC_SERVER_BASE_URL` 为公网可访问地址；本地联调通常需要 tunnel。
- 当前项目默认将审核结果落库，并通过现有系统消息链路通知用户状态变化。
- 后台开关语义已从“自动通过 / 人工审核”转向“AI审核 / 人工审核”：关闭 AI 审核时，内容进入后台人工审核队列，不再自动通过。

日志源：

- 当前生产主源建议继续使用 `local-files`。
- 现有日志契约已经为未来接入 `managed-log-service` 预留扩展位，后续可以在不改 Admin 页面模型的前提下增加阿里云 `SLS` 或腾讯云 `CLS` 适配。
- 在正式接入托管日志服务之前，后台不会把未实现的日志源暴露成可选项。

## 测试账号与数据说明

基础 / demo 数据导入后可使用：

```text
管理员账号：admin
管理员密码：Admin#123
```

mock 数据导入后可使用：

```text
管理员账号：testadmin
管理员密码：TestAdmin#123
普通登录手机号：13800138000
短信验证码：888888
```

更多 mock 数据说明见 [docs/test-data-usage.md](./docs/test-data-usage.md)。

---

## 项目文档索引

### 日常协作（人类优先）

- [apps/README.md](./apps/README.md)：三条应用各自干什么、从哪下手改
- [packages/README.md](./packages/README.md)：共享包分工、和 `apps` 的依赖关系
- [docker/README.md](./docker/README.md)：Compose、连接串、排障
- [docs/test-data-usage.md](./docs/test-data-usage.md)：mock 数据说明
- [docs/openapi-frontend-integration-guide.md](./docs/openapi-frontend-integration-guide.md)：前后端 OpenAPI 对接

### 代理与审查（工具执行）

- [AGENTS.md](./AGENTS.md)：根约束，L0–L5
- [EXAMPLES.md](./EXAMPLES.md)：编码准则正反例示意
- [apps/AGENTS.md](./apps/AGENTS.md)、[packages/AGENTS.md](./packages/AGENTS.md)、[docker/AGENTS.md](./docker/AGENTS.md)：各层范围
- [`.codex/AGENTS.md`](./.codex/AGENTS.md)：Codex
