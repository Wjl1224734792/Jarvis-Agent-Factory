# 代码审查修复任务分解

> **生成日期**: 2026-04-03
> **需求来源**: 代码审查发现的问题清单
> **需求文档路径**: N/A（基于代码审查结果）

---

## 任务概览

| 优先级 | 数量 | 类型 |
|--------|------|------|
| 高 (High) | 7 | 安全 / 并发 |
| 中 (Medium) | 8 | 验证 / 性能 / 前端 |
| 低 (Low) | 3 | 代码质量 |
| **合计** | **18** | — |

---

## 任务分解列表

### 高优先级（安全 & 并发）

---

#### TASK-001 [SEC-001] 密码哈希算法升级 — SHA256 → bcrypt

- **类型**: security
- **优先级**: high
- **涉及文件**:
  - `packages/db/src/helpers.ts` — `hashPassword()` 当前使用 `createHash("sha256")`
  - `apps/server/src/modules/auth/auth.repo.ts` — `findAdminByCredentials()` 调用 `hashPassword()`
  - `apps/server/src/modules/auth/auth.service.ts` — `createAppSession()` / `createSession()` 中 `hashPassword(refreshToken)`
  - `packages/db/src/seed.ts` / `packages/db/src/seed.test-data.ts` — 种子数据中的密码哈希
- **DDD 分类**: 否（纯技术替换，无复杂业务规则）
- **TDD 分类**: **是** — 认证凭据属高风险接口，需先写测试验证 bcrypt 兼容性和哈希验证逻辑
- **完成标准**:
  1. `hashPassword()` 改用 `bcrypt.hash()`（建议 cost factor = 12）
  2. 新增 `verifyPassword(plain, hash)` 函数替代直接比较
  3. `findAdminByCredentials()` 改用 `verifyPassword()`
  4. 种子数据重新生成或使用 bcrypt 哈希
  5. 现有管理员密码可平滑迁移（或提供迁移脚本）
  6. 相关测试通过
- **风险说明**:
  - ⚠️ 如果已有管理员密码以 SHA256 存储，直接切换将导致无法登录。需要迁移策略或一次性重置。
  - ⚠️ `hashPassword(refreshToken)` 用于 session token 哈希，bcrypt 对高频调用可能影响性能，建议 token 哈希仍用 crypto 但加 salt，或区分 `hashPassword`（用于密码）和 `hashToken`（用于 token）。

---

#### TASK-002 [SEC-002] 移除硬编码凭据 — Redis/DB 默认密码

- **类型**: security
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/modules/auth/redis-client.ts` — 第 4 行硬编码 `redis://:qwertyuiop@localhost:6379/0`
  - `packages/db/src/env.ts` — 检查是否有硬编码数据库凭据
  - `docker/` — 检查 docker-compose 中的环境变量
  - `.env.example` — 确保示例文件包含必要变量说明
- **DDD 分类**: 否
- **TDD 分类**: 否（配置变更）
- **完成标准**:
  1. `redis-client.ts` 移除硬编码密码，改为从 `process.env.REDIS_URL` 读取，缺失时抛出明确错误
  2. 确认 DB 连接无硬编码凭据
  3. 更新 `.env.example` 提供 Redis/DB URL 示例
  4. 更新 `docker-compose.yml` 正确注入环境变量
- **风险说明**:
  - ⚠️ 本地开发环境需同步更新 `.env` 文件，否则启动失败。
  - ⚠️ 如果 CI/CD 依赖默认凭据，需要同步更新。

---

#### TASK-003 [SEC-003] 短信验证码安全增强 — crypto.randomInt + 频率限制

- **类型**: security
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.repo.ts` — 第 126 行 `Math.floor(100000 + Math.random() * 900000)` 使用 `Math.random()`
  - `apps/server/src/modules/auth/auth.service.ts` — `requestSmsCode()` 无频率限制
  - `apps/server/src/modules/auth/sms-provider.ts` — `createRequestId()` 使用 `Math.random()`
- **DDD 分类**: 否
- **TDD 分类**: **是** — 频率限制逻辑和随机数生成需测试覆盖
- **完成标准**:
  1. 验证码生成改用 `crypto.randomInt(100000, 1000000).toString()`
  2. `requestSmsCode()` 增加 Redis 频率限制（同一手机号 60 秒内最多 1 次）
  3. `createRequestId()` 改用 `randomUUID()` 或 `crypto.randomBytes()`
  4. 频率限制触发时返回明确错误码（如 `SMS_RATE_LIMITED`）
- **风险说明**:
  - ⚠️ 频率限制的 Redis key 设计与现有 key 命名规范保持一致。
  - ⚠️ 测试环境需 mock 频率限制或使用独立 Redis DB。

---

#### TASK-004 [SEC-004] 图形验证码安全增强 — crypto.randomBytes

- **类型**: security
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.repo.ts` — 第 106 行 `Math.random().toString(36).slice(2, 6)` 使用 `Math.random()`
- **DDD 分类**: 否
- **TDD 分类**: **是** — 验证码生成逻辑需测试
- **完成标准**:
  1. 验证码生成改用 `crypto.randomBytes(3).toString("base64").slice(0, 4).toUpperCase()` 或等效安全随机方案
  2. 验证码字符集明确为数字+大写字母（排除易混淆字符 0/O、1/I）
  3. 现有测试兼容新格式
- **风险说明**:
  - 低风险，纯内部逻辑替换。

---

#### TASK-005 [SEC-005] 替换自定义 .env 解析器为 dotenv

- **类型**: security
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/lib/load-env.ts` — 自定义 `.env` 解析实现（48 行）
  - `apps/server/src/index.ts` — 调用 `ensureServerEnvLoaded()`
  - `package.json` — 需添加 `dotenv` 依赖
- **DDD 分类**: 否
- **TDD 分类**: 否（基础设施替换）
- **完成标准**:
  1. 安装 `dotenv` 包
  2. `load-env.ts` 改用 `dotenv.config()` 或 `dotenv.config({ path: ... })`
  3. 保持多目录 `.env` 查找逻辑（当前支持 cwd / 父目录 / 祖父目录）
  4. 移除自定义解析代码
  5. 确认现有环境变量加载行为不变
- **风险说明**:
  - ⚠️ 自定义解析器不支持引号内等号、注释内联等边界情况，dotenv 行为可能略有不同。需验证现有 `.env` 文件兼容性。
  - ⚠️ 当前解析器不会覆盖已存在的环境变量（`process.env[key] !== undefined`），dotenv 默认行为相同（`override: false` 或不设 override）。

---

#### TASK-006 [CON-001] 注册流程竞态条件修复 — 事务保护

- **类型**: concurrency
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.service.ts` — `completeWebRegistration()` / `completeAppRegistration()`
  - `apps/server/src/modules/auth/auth.repo.ts` — `createUserByPhoneProfile()`、`findPendingRegistration()`、`deletePendingRegistration()`
- **DDD 分类**: **是** — 注册流程涉及多步操作（校验 → 创建用户 → 创建 session → 删除 pending），聚合边界清晰，需事务保证一致性
- **TDD 分类**: **是** — 竞态条件属高风险，需并发测试验证
- **完成标准**:
  1. `completeWebRegistration()` / `completeAppRegistration()` 使用数据库事务包裹 `createUserByPhoneProfile()` + `createSession()` + `deletePendingRegistration()`
  2. 使用 `consumePendingRegistration()`（带 `getDel`）替代 `findPendingRegistration()` + `deletePendingRegistration()` 分离调用，消除 Redis 层面的竞态
  3. 并发注册同一手机号时，仅一个请求成功，其余返回明确错误
  4. 新增并发测试用例
- **风险说明**:
  - ⚠️ 当前 `auth.repo.ts` 已提供 `consumePendingRegistration()`（使用 `GETDEL`），但 `auth.service.ts` 未使用。修复需改为消费式读取。
  - ⚠️ 数据库层面 `users.phone` 有 unique 约束，但竞态仍可能在 unique 检查与 insert 之间发生。事务 + 约束双重保护。

---

#### TASK-007 [CON-002] Redis 连接初始化线程安全修复

- **类型**: concurrency
- **优先级**: high
- **涉及文件**:
  - `apps/server/src/modules/auth/redis-client.ts` — `ensureRedisConnected()` 中 `connected` 标志非原子操作
- **DDD 分类**: 否
- **TDD 分类**: **是** — 并发初始化场景需测试
- **完成标准**:
  1. `ensureRedisConnected()` 改为 Promise 锁模式，防止并发调用时多次 `redis.connect()`
  2. 或使用 `redis.connect()` 的幂等特性（如果 redis 客户端已支持）
  3. 新增并发初始化测试验证
- **风险说明**:
  - ⚠️ Bun 运行时下多个异步调用同时进入 `if (!connected)` 分支会导致多次 connect。
  - 低风险修复，但影响所有 Redis 操作入口。

---

### 中优先级（验证 & 性能 & 前端）

---

#### TASK-008 [VAL-001] 评论内容长度验证

- **类型**: validation
- **优先级**: medium
- **涉及文件**:
  - `apps/server/src/modules/reviews/reviews.service.ts` — `createReviewComment()` / `updateReviewComment()` 未在服务端验证内容长度
  - `packages/schemas/src/reviews.ts` — schema 已定义 `max(1000)`，但需确认 service 层是否直接使用 schema 验证
- **DDD 分类**: 否
- **TDD 分类**: 否（schema 已覆盖，验证 route 层是否已解析）
- **完成标准**:
  1. 确认 route 层对 `createReviewCommentInputSchema` / `updateReviewCommentInputSchema` 进行解析
  2. 如果 service 层直接调用（绕过 route），增加前置验证
  3. 补充边界值测试（1000 字符、1001 字符、空字符串）
- **风险说明**:
  - 需先检查 `reviews.route.ts` 是否已对请求体做 schema 验证。如果已验证，此任务降级为补充测试。

---

#### TASK-009 [VAL-002] 手机号格式验证

- **类型**: validation
- **优先级**: medium
- **涉及文件**:
  - `packages/schemas/src/auth.ts` — 手机号相关 schema
  - `apps/server/src/modules/auth/auth.service.ts` — `requestSmsCode()` / `loginWeb()` / `loginApp()`
  - `apps/server/src/modules/auth/auth.route.ts` — 请求解析
- **DDD 分类**: 否
- **TDD 分类**: 否（schema 层验证）
- **完成标准**:
  1. 确认 `smsCodeRequestSchema` / `webLoginRequestSchema` / `appLoginRequestSchema` 包含手机号格式验证（中国大陆手机号正则 `/^1[3-9]\d{9}$/`）
  2. 如果缺失，在 schema 层补充 `.regex()` 或 `.refine()` 验证
  3. 补充无效手机号格式的测试用例
- **风险说明**:
  - 如果 schema 已有验证，此任务降级为补充测试。

---

#### TASK-010 [VAL-003] 文件上传大小二次验证

- **类型**: validation
- **优先级**: medium
- **涉及文件**:
  - `apps/server/src/modules/uploads/upload.service.ts` — `initUpload()` 已检查 `byteSize > policy.maxSize`
  - `apps/server/src/modules/uploads/upload.service.ts` — `completeUpload()` 已检查 `head.size !== file.byteSize`
- **DDD 分类**: 否
- **TDD 分类**: 否（已有验证，需确认完整性）
- **完成标准**:
  1. 确认 `completeUpload()` 中的 size 检查覆盖存储端实际文件大小与声明大小不一致的场景
  2. 增加 `byteSize <= 0` 的边界检查
  3. 确认所有 bizType 的 `policy.maxSize` 配置合理
  4. 补充文件过大/过小的测试用例
- **风险说明**:
  - 当前 `initUpload` 和 `completeUpload` 已有大小检查，此任务主要是查漏补缺和测试覆盖。

---

#### TASK-011 [PERF-001] N+1 查询优化 — upload.repo

- **类型**: performance
- **优先级**: medium
- **涉及文件**:
  - `apps/server/src/modules/uploads/upload.repo.ts` — `listOwnedAttachableFiles()`（第 109 行）和 `listOwnedUploadedFiles()`（第 136 行）使用 `Promise.all` + `getOwnedFileById()` 逐条查询
- **DDD 分类**: 否
- **TDD 分类**: 否（性能优化）
- **完成标准**:
  1. `listOwnedAttachableFiles()` 和 `listOwnedUploadedFiles()` 改用单次 `SELECT ... WHERE id IN (...)` 查询
  2. 在应用层进行 mediaKind / status / bizType 过滤
  3. 保持返回类型和过滤逻辑不变
  4. 验证查询结果一致性
- **风险说明**:
  - ⚠️ `inArray()` 在空数组时可能报错，需保持 `fileIds.length === 0` 的提前返回。
  - ⚠️ 过滤逻辑从数据库层移到应用层，需确保行为一致。

---

#### TASK-012 [PERF-002] 评论序列化 N+1 优化

- **类型**: performance
- **优先级**: medium
- **涉及文件**:
  - `apps/server/src/modules/reviews/reviews.service.ts` — `serializeCommentThreads()` 中逐条评论调用 `resolveAuthorAvatar()`（第 116 行），每条触发一次文件 URL 解析
  - `apps/server/src/modules/reviews/reviews.service.ts` — `serializeComment()` 同样问题（第 73 行）
- **DDD 分类**: 否
- **TDD 分类**: 否（性能优化）
- **完成标准**:
  1. 批量收集所有 `avatarFileId`，一次性解析 URL（使用 `resolveUploadedFileUrls()`）
  2. 构建 `avatarFileId → avatarUrl` 映射表
  3. 序列化时从映射表读取，避免逐条查询
  4. 验证序列化输出不变
- **风险说明**:
  - `resolveUploadedFileUrls()` 已存在于 `uploads.helpers.ts`，确认其批量查询实现是否高效。

---

#### TASK-013 [FE-001] auth.service.ts 乱码修复

- **类型**: frontend
- **优先级**: medium
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.service.ts` — 第 32-33 行、第 42-43 行错误消息为乱码（`璇ユ墜鏈哄彿宸插畬鎴愭敞鍐岋紝璇风洿鎺ョ櫥褰曘€?`）
- **DDD 分类**: 否
- **TDD 分类**: 否
- **完成标准**:
  1. 修复 `mapRegistrationPersistenceError()` 中的乱码错误消息
  2. 确认文件编码为 UTF-8（无 BOM）
  3. 检查项目中其他文件是否存在类似编码问题
- **风险说明**:
  - 需确认原始正确文案。根据上下文推测应为：
    - `"该手机号已完成注册，请直接登录。"`
    - `"该用户名已被占用，请更换后重试。"`
  - 如果文件编码有问题，可能需要整个文件重新保存为 UTF-8。

---

#### TASK-014 [FE-002] API 客户端错误处理增强

- **类型**: frontend
- **优先级**: medium
- **涉及文件**:
  - `apps/web/src/lib/api-client.ts` — `parseResponse()` 错误处理、`fetchWithAutoRefresh()` 401 处理
  - `apps/admin/src/lib/api-client.ts` — 管理端 API 客户端（如有类似问题）
- **DDD 分类**: 否
- **TDD 分类**: 否
- **完成标准**:
  1. `parseResponse()` 增加对非 JSON 响应的容错处理
  2. `fetchWithAutoRefresh()` 增加重试次数限制，防止无限循环
  3. 网络错误（断网、超时）有明确的用户友好提示
  4. 补充错误处理测试用例
- **风险说明**:
  - ⚠️ 当前 `parseResponse()` 使用 `.catch(() => null)` 处理 JSON 解析失败，如果响应体不是 JSON 但 `response.ok` 为 true，会返回 `null` 作为有效数据。

---

#### TASK-015 [FE-003] Auth Store 持久化安全增强

- **类型**: frontend
- **优先级**: medium
- **涉及文件**:
  - `apps/web/src/features/auth/auth-store-persistence.ts` — localStorage 存储用户信息
  - `apps/web/src/features/auth/auth-store.ts` — 使用持久化状态
- **DDD 分类**: 否
- **TDD 分类**: 否
- **完成标准**:
  1. 评估 localStorage 中存储的信息是否包含敏感数据（当前仅存 `UserSummary`，不含 token，风险较低）
  2. 增加存储数据完整性校验（读取时验证必要字段）
  3. 增加存储版本迁移机制（未来 schema 变更时兼容）
  4. XSS 防护：确保存储内容不包含可执行脚本
- **风险说明**:
  - 当前仅存储 `UserSummary`（id, displayName, avatarUrl, role），不含 token 或密码，风险较低。
  - 主要风险在于 XSS 攻击下 localStorage 可被读取，建议后续评估是否需要更安全的存储方案。

---

### 低优先级（代码质量）

---

#### TASK-016 [QUAL-001] 魔法数字提取为常量

- **类型**: quality
- **优先级**: low
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.repo.ts` — `CAPTCHA_TTL_S = 300`、`SMS_TTL_S = 300`、`ACCESS_TTL_MS = 2 * 60 * 60 * 1000` 等已有常量，但 `buildAvailableDisplayName()` 中的 `40`（第 192 行）、`100 + Math.random() * 900`（第 193 行）为魔法数字
  - `apps/server/src/modules/auth/auth.service.ts` — `REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000`（第 19 行）
  - `apps/server/src/modules/auth/auth.route.ts` — cookie `maxAge` 值（第 47 行 `2 * 60 * 60`、第 55 行 `30 * 24 * 60 * 60`）
- **DDD 分类**: 否
- **TDD 分类**: 否
- **完成标准**:
  1. 提取 `DISPLAY_NAME_RANDOMIZE_MAX_ATTEMPTS = 40`
  2. 提取 `DISPLAY_NAME_RANDOM_SUFFIX_MIN = 100`、`DISPLAY_NAME_RANDOM_SUFFIX_RANGE = 900`
  3. 统一 TTL 常量命名（`CAPTCHA_TTL_S` / `SMS_TTL_S` / `REGISTRATION_TTL_S` 已在 `auth.repo.ts`，但 `auth.service.ts` 的 `REFRESH_TTL_MS` 重复定义）
  4. cookie maxAge 与 session TTL 保持一致
- **风险说明**:
  - 低风险纯重构。

---

#### TASK-017 [QUAL-002] 评论序列化逻辑复用

- **类型**: quality
- **优先级**: low
- **涉及文件**:
  - `apps/server/src/modules/reviews/reviews.service.ts` — `serializeComment()`（第 43-84 行）和 `serializeCommentThreads()`（第 86-147 行）有大量重复的序列化代码
  - `apps/server/src/modules/reviews/reviews.service.ts` — `listAdminReviewComments()` 和 `updateReviewCommentStatus()` 也有类似的序列化逻辑
- **DDD 分类**: 否
- **TDD 分类**: 否
- **完成标准**:
  1. 提取基础评论序列化函数 `serializeCommentBase()`
  2. `serializeComment()` 和 `serializeCommentThreads()` 复用基础函数
  3. `listAdminReviewComments()` 和 `updateReviewCommentStatus()` 使用统一的序列化路径
  4. 确保序列化输出不变
- **风险说明**:
  - ⚠️ 序列化逻辑分散在多处，重构时需仔细对比字段差异，确保不遗漏任何字段。

---

#### TASK-018 [QUAL-003] 类型断言优化

- **类型**: quality
- **优先级**: low
- **涉及文件**:
  - `apps/server/src/modules/auth/auth.repo.ts` — 多处 `as AuthRole`、`as SessionScope` 类型断言
  - `apps/server/src/modules/reviews/reviews.service.ts` — 多处 `as "user" | "admin"` 类型断言
  - `apps/server/src/modules/auth/auth.service.ts` — `satisfies UserSummary` 使用
- **DDD 分类**: 否
- **TDD 分类**: 否
- **完成标准**:
  1. 评估类型断言是否可以改为更精确的类型定义或类型守卫
  2. 对于确实需要的断言（如数据库返回的字符串转枚举），添加注释说明原因
  3. 减少不必要的 `as` 断言，优先使用类型推断
- **风险说明**:
  - 低风险纯重构。部分断言是因为数据库 schema 类型与应用类型不完全匹配，移除前需确认类型安全。

---

## DDD 分类汇总

| 任务 ID | DDD 分类 | 原因 |
|---------|----------|------|
| TASK-006 | **是** | 注册流程涉及多步操作，聚合边界清晰（用户 + Session + PendingRegistration），需事务保证一致性 |

其余任务均为技术实现层面的修复或优化，不涉及复杂领域建模。

---

## TDD / 直接开发分类

### TDD 开发（先写测试）

| 任务 ID | 原因 |
|---------|------|
| TASK-001 | 密码哈希属高风险接口，需测试验证兼容性 |
| TASK-003 | 频率限制逻辑和随机数生成需测试覆盖 |
| TASK-004 | 验证码生成逻辑需测试 |
| TASK-006 | 竞态条件属高风险，需并发测试验证 |
| TASK-007 | 并发初始化场景需测试 |

### 直接开发

| 任务 ID | 原因 |
|---------|------|
| TASK-002 | 配置变更，无业务逻辑 |
| TASK-005 | 基础设施替换，行为等价 |
| TASK-008 ~ TASK-018 | 验证补充 / 性能优化 / 前端修复 / 代码质量，风险可控 |

---

## 风险任务汇总

| 任务 ID | 风险等级 | 风险描述 |
|---------|----------|----------|
| TASK-001 | 🔴 高 | 密码哈希算法变更可能导致现有管理员无法登录 |
| TASK-002 | 🟡 中 | 移除默认凭据可能影响本地开发和 CI 环境 |
| TASK-006 | 🔴 高 | 注册流程竞态修复涉及多表操作，需确保事务正确性 |
| TASK-013 | 🟡 中 | 乱码修复需确认原始文案，文件编码问题可能影响其他文件 |

---

## 文件所有权提醒

### 跨层影响文件

| 文件 | 影响范围 | 注意事项 |
|------|----------|----------|
| `packages/db/src/helpers.ts` | 全局（所有使用 `hashPassword` 的地方） | 变更需检查所有调用方 |
| `apps/server/src/modules/auth/auth.repo.ts` | 认证核心 | 被 `auth.service.ts` 和多个 route 依赖 |
| `apps/server/src/modules/auth/auth.service.ts` | 认证核心 | 被 `auth.route.ts` 依赖 |
| `apps/server/src/modules/auth/redis-client.ts` | 全局（所有 Redis 操作） | 变更影响所有验证码/Session 操作 |
| `apps/server/src/lib/load-env.ts` | 全局（服务器启动） | 变更影响所有环境变量加载 |

### 共享路径提醒

- `packages/db/` 的变更会影响所有消费 `@feijia/db` 的包（server / web / admin）
- `packages/schemas/` 的变更会影响前后端类型一致性
- `apps/web/src/lib/api-client.ts` 的错误处理变更会影响所有 web 端 API 调用

---

## 推荐交付顺序

### 第一批：安全基础（阻塞后续开发）

1. **TASK-002** — 移除硬编码凭据（无依赖，快速修复）
2. **TASK-005** — 替换 .env 解析器（无依赖，快速修复）
3. **TASK-004** — 图形验证码安全增强（独立，低风险）
4. **TASK-007** — Redis 连接线程安全（独立，低风险）

### 第二批：安全核心（需测试验证）

5. **TASK-001** — 密码哈希升级（需处理迁移策略）
6. **TASK-003** — 短信验证码安全增强（依赖 TASK-007 的 Redis 安全）

### 第三批：并发修复（高风险）

7. **TASK-006** — 注册流程竞态条件（依赖 TASK-001 的 hashPassword 变更）

### 第四批：验证 & 性能

8. **TASK-008** — 评论内容长度验证
9. **TASK-009** — 手机号格式验证
10. **TASK-010** — 文件上传大小二次验证
11. **TASK-011** — N+1 查询优化（upload.repo）
12. **TASK-012** — 评论序列化 N+1 优化

### 第五批：前端修复

13. **TASK-013** — auth.service.ts 乱码修复
14. **TASK-014** — API 客户端错误处理增强
15. **TASK-015** — Auth Store 持久化安全增强

### 第六批：代码质量

16. **TASK-016** — 魔法数字提取为常量
17. **TASK-017** — 评论序列化逻辑复用
18. **TASK-018** — 类型断言优化

---

## 依赖关系图

```
TASK-002 ──┐
TASK-005 ──┤
TASK-004 ──┤── 第一批
TASK-007 ──┘
              │
              ▼
TASK-001 ──┐
TASK-003 ──┤── 第二批（依赖第一批）
              │
              ▼
TASK-006 ────── 第三批（依赖第二批）
              │
              ▼
TASK-008 ~ TASK-012 ── 第四批（可并行）
              │
              ▼
TASK-013 ~ TASK-015 ── 第五批（可并行）
              │
              ▼
TASK-016 ~ TASK-018 ── 第六批（可并行）
```

---

> **备注**: 本任务分解基于代码审查结果，未涉及需求变更。所有任务均为修复性变更，应保持最小影响范围。
