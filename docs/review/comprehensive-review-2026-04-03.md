# 飞甲（Feijia）项目全面审查报告

> **审查日期**: 2026-04-03  
> **审查范围**: 后端服务、前端 Web/Admin、数据库、Schema、测试  
> **审查结论**: ⚠️ **有条件通过** — 整体质量良好，存在 3 个必须修复项和 8 个建议修改项

---

## 一、整体评价

飞甲项目采用清晰的分层架构（apps → packages），模块化设计合理，认证流程完善，类型安全覆盖全面。经过前两轮修复（18 个安全修复 + 4 个优化），代码质量已显著提升。本次审查发现的主要问题集中在**数据库约束完整性、测试覆盖盲区、前端状态管理**三个方面。

---

## 二、[必须修复] 问题

### 1. 数据库 text 字段缺少 CHECK 约束

**文件**: `packages/db/src/schema.ts`（多处）

**问题**: 大量使用 `text("role")`、`text("status")`、`text("type")` 等枚举字段，但数据库层面没有 CHECK 约束，仅靠应用层验证。如果绕过应用层直接操作数据库，可能插入非法值。

**影响范围**:
- `usersTable.role` — 应为 `"user" | "admin"`
- `postsTable.type` — 应为 `"article" | "moment"`
- `postsTable.status` — 应为 `"pending" | "published" | "rejected" | "hidden"`
- `sessionsTable.scope` — 应为 `"web" | "app" | "admin"`
- 所有 `status`、`type`、`visibility` 等枚举字段

**修复建议**:
```typescript
// 使用 pgCore 的 check 约束
import { check } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  // ...
  role: text("role").notNull(),
}, (table) => ({
  // ...
  roleCheck: check("users_role_check", sql`${table.role} IN ('user', 'admin')`),
}));
```

**优先级**: 🔴 必须修复 — 数据完整性风险

---

### 2. 管理员登录缺少暴力破解防护

**文件**: `apps/server/src/modules/auth/auth.service.ts:513-547` (loginAdmin)

**问题**: 管理员登录接口没有频率限制，攻击者可以对管理员账号进行暴力破解。

**当前逻辑**:
```typescript
async loginAdmin(input: { account: string; password: string }, ...) {
  const admin = await authRepo.findAdminByCredentials(input.account, input.password);
  if (!admin) {
    throw new AuthError("INVALID_CREDENTIALS", "管理员账号或密码错误");
  }
  // ...
}
```

**修复建议**:
1. 在 Redis 中添加登录失败计数器（同一账号 5 分钟内最多 5 次失败）
2. 超过限制后锁定账号 15 分钟
3. 返回统一的错误消息（不区分"账号不存在"和"密码错误"）

**优先级**: 🔴 必须修复 — 安全风险

---

### 3. 前端 API 客户端循环包装存在类型安全风险

**文件**: `apps/web/src/lib/api-client.ts:372-386`

**问题**: 使用 `for...of` 循环动态包装 apiClient 的所有方法，通过 `as Record<string, unknown>` 和 `as (...args: any[])` 绕过类型检查。如果未来添加非 Promise 方法，会导致运行时错误。

```typescript
for (const key of Object.keys(apiClient) as Array<keyof typeof apiClient>) {
  const current = apiClient[key];
  if (typeof current !== "function") {
    continue;
  }
  const original = current as (...args: any[]) => Promise<unknown>;
  (apiClient as Record<string, unknown>)[key as string] = async (...args: unknown[]) => {
    // ...
  };
}
```

**修复建议**: 改为显式包装每个方法，或使用 Proxy 进行类型安全的拦截：
```typescript
function wrapWithErrorTranslation<T extends Record<string, Function>>(client: T): T {
  return new Proxy(client, {
    get(target, prop) {
      const original = target[prop as keyof T];
      if (typeof original === 'function' && original.constructor.name === 'AsyncFunction') {
        return async (...args: unknown[]) => {
          try { return await original(...args); }
          catch (error) { throw mapWebApiError(error); }
        };
      }
      return original;
    }
  });
}
```

**优先级**: 🔴 必须修复 — 类型安全与可维护性

---

## 三、[建议修改] 问题

### 4. 评论表自引用外键可能导致级联删除链过长

**文件**: `packages/db/src/schema.ts:376-385` (reviewCommentsTable)

**问题**: `parentCommentId` 和 `replyToCommentId` 都引用 `table.id` 并设置 `onDelete("cascade")`。如果评论树很深，删除根评论可能触发长链级联删除，影响性能。

**建议**: 考虑使用软删除（`deletedAt` 字段）替代级联删除，或在应用层处理删除逻辑。

---

### 5. 文件记录表缺少唯一约束

**文件**: `packages/db/src/schema.ts:1032-1055` (filesTable)

**问题**: `filesTable` 没有唯一约束，同一个 `objectKey` 可能被多次插入，导致存储资源浪费或数据不一致。

**建议**: 添加 `(ownerId, objectKey)` 或 `(bucket, objectKey)` 的唯一约束。

---

### 6. 通知表缺少索引

**文件**: `packages/db/src/schema.ts:617-632` (notificationsTable)

**问题**: 通知表查询通常按 `userId` 和 `isRead` 过滤，但当前没有索引。随着通知数量增长，查询性能会下降。

**建议**: 添加复合索引：
```typescript
userReadIndex: uniqueIndex("notifications_user_read_index").on(table.userId, table.isRead, table.createdAt),
```

---

### 7. 前端 Auth Store 状态转换不完整

**文件**: `apps/web/src/features/auth/auth-store.ts:30-35`

**问题**: `setLoading` 方法中的状态转换逻辑有漏洞：
```typescript
setLoading: () => {
  set((state) => ({
    status: state.user ? state.status : "loading",
    error: null
  }));
},
```
如果用户已认证（`state.user` 存在），调用 `setLoading` 不会改变状态。但如果此时 token 过期，状态会停留在 `authenticated` 而不是转为 `loading` 去刷新。

**建议**: 添加独立的 `setLoading` 逻辑，不依赖 `state.user` 是否存在。

---

### 8. 错误处理中日志可能泄露敏感信息

**文件**: `apps/server/src/app.ts:137-169`

**问题**: 全局错误处理器记录 `error.stack`，如果错误消息中包含用户输入（如 SQL 错误、文件路径等），可能被记录到日志中。

**建议**: 在记录日志前对敏感信息进行脱敏处理，或至少记录错误类型而非完整堆栈。

---

### 9. 缺少请求体大小限制

**文件**: `apps/server/src/app.ts`

**问题**: Hono 应用没有配置请求体大小限制，攻击者可以发送超大请求体导致内存耗尽。

**建议**: 添加请求体大小限制中间件：
```typescript
app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    return c.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' }, 413);
  }
  await next();
});
```

---

### 10. 前端 API 客户端中 `deleteJson` 不支持请求体

**文件**: `apps/web/src/lib/api-client.ts:178-185`

**问题**: `deleteJson` 方法不接受请求体参数，但某些 DELETE 请求可能需要传递数据（如批量删除）。

**建议**: 统一 `deleteJson` 签名与其他方法一致：
```typescript
async function deleteJson<T>(path: string, body?: unknown): Promise<T> {
  // ...
}
```

---

### 11. Schema 验证缺少自定义错误消息

**文件**: `packages/schemas/src/*.ts`

**问题**: 大部分 Zod schema 使用默认的验证错误消息，对用户不够友好。例如手机号验证失败时返回原始正则错误，而不是"请输入有效的手机号"。

**建议**: 为关键字段添加自定义错误消息：
```typescript
phone: z.string().regex(chinaPhoneRegex, "请输入有效的 11 位手机号"),
displayName: z.string().min(1, "用户名不能为空").max(50, "用户名不能超过 50 个字符"),
```

---

## 四、[仅供参考] 问题

### 12. 数据库种子脚本使用同步 bcrypt 哈希

**文件**: `packages/db/src/seed.test-data.ts`

**问题**: 种子脚本中生成大量测试用户时，每个用户都需要 bcrypt 哈希（cost=12，约 250ms/次）。如果测试用户数量增加到 100+，种子脚本运行时间会显著增加。

**建议**: 测试环境可以使用较低的 bcrypt cost（如 4），或复用已生成的哈希。

---

### 13. CORS 配置回显 Origin 的安全隐患

**文件**: `apps/server/src/app.ts:53-54`

**问题**: 当 `CORS_ORIGIN=*` 时，使用 `(origin: string) => origin` 回显请求中的 Origin。虽然这是实现"允许所有源 + credentials"的标准做法，但可能被恶意网站利用。

**建议**: 在生产环境中避免使用 `*`，明确列出允许的源。

---

### 14. 前端错误消息翻译可能掩盖真实问题

**文件**: `apps/web/src/lib/api-client.ts:38-91`

**问题**: `sanitizeWebApiErrorMessage` 使用关键词匹配来翻译错误消息，可能误判。例如错误消息中包含 "already" 但实际不是冲突错误，会被翻译为"提交内容有误"。

**建议**: 优先使用服务端返回的错误码（`code` 字段）进行翻译，而不是匹配错误消息文本。

---

### 15. 缺少 API 版本控制

**问题**: 所有 API 路径没有版本号（如 `/api/v1/...`），未来如果需要进行破坏性变更，会影响现有客户端。

**建议**: 考虑在路由前缀中添加版本号，或在请求头中使用 `Accept: application/vnd.feijia.v1+json`。

---

## 五、值得肯定的地方

### ✅ 架构设计
- 清晰的分层架构（apps → packages），依赖方向明确
- 模块化设计合理，每个业务模块独立（service/repo/route）
- 路由常量统一管理（`@feijia/shared.API_ROUTES`）

### ✅ 安全性
- 密码存储使用 bcrypt（cost=12）
- 验证码使用密码学安全随机数（`crypto.randomInt`）
- 短信频率限制防止滥用
- XSS 防护使用 DOMPurify
- 认证流程完善（web/app/admin 三端分离）

### ✅ 类型安全
- 全面使用 TypeScript，类型检查通过
- Zod schema 覆盖所有输入验证
- 类型守卫替代 `as` 断言（60+ 处优化）

### ✅ 并发安全
- 注册流程使用原子操作（GETDEL）消除竞态
- Redis 连接使用 Promise 锁防止并发初始化

### ✅ 代码质量
- 评论序列化逻辑复用，减少 75% 重复代码
- 错误处理统一，错误码分类清晰
- 命名规范一致，注释清晰

### ✅ 测试覆盖
- 30 个测试文件，117 个测试用例
- 覆盖核心业务逻辑和边界条件
- 测试文件组织清晰

---

## 六、问题统计

| 优先级 | 数量 | 主要类别 |
|--------|------|----------|
| [必须修复] | 3 | 数据完整性、安全、类型安全 |
| [建议修改] | 8 | 性能、索引、状态管理、错误处理 |
| [仅供参考] | 4 | 可维护性、最佳实践 |

---

## 七、建议的修复优先级

### 第一批（安全 & 数据完整性）
1. ✅ 管理员登录暴力破解防护
2. ✅ 数据库 CHECK 约束

### 第二批（类型安全 & 错误处理）
3. ✅ API 客户端循环包装类型安全
4. ✅ 请求体大小限制
5. ✅ 错误日志脱敏

### 第三批（性能 & 可维护性）
6. ✅ 通知表索引
7. ✅ 文件表唯一约束
8. ✅ Schema 自定义错误消息

---

## 八、审查结论

**⚠️ 有条件通过**

飞甲项目整体代码质量良好，经过前两轮修复后，安全性、并发安全、类型安全等方面已有显著提升。本次审查发现的 3 个必须修复项主要涉及**数据完整性**和**管理员安全**，建议在合并前完成修复。

**建议在合并前完成**:
1. 管理员登录频率限制
2. 关键枚举字段的 CHECK 约束
3. API 客户端类型安全重构

**可以后续迭代完成**:
- 数据库索引优化
- 请求体大小限制
- Schema 错误消息优化
- API 版本控制

---

> **审查人**: AI 代码审查系统  
> **审查时间**: 2026-04-03  
> **下次审查建议**: 完成第一批修复后进行复审
