# 移动端登录接入文档

> 文档版本：v1.0 | 更新日期：2026-04-03

## 一、概述

本系统采用 **手机号 + 短信验证码** 的无密码登录方式，支持新用户首次登录自动引导完善资料。移动端（App）与 Web 端共享同一套后端接口，但 **Token 传输方式不同**：Web 端使用 HttpOnly Cookie，移动端使用 Bearer Token。

## 二、认证架构

### 2.1 Token 机制

| Token 类型 | 生命周期 | 用途 | 传输方式 |
|-----------|----------|------|----------|
| Access Token | 2 小时 | 接口鉴权 | `Authorization: Bearer <token>` |
| Refresh Token | 30 天 | 刷新 Access Token | 请求体 JSON |

### 2.2 Session 模型

```
Session ID (即 Access Token) 格式: sess_ + 24字节随机token
示例: sess_abc123def456ghi789jkl012mno345pqr678stu901
```

### 2.3 鉴权中间件

服务端通过 `readSessionToken()` 读取 Token：

- 优先读取 `Authorization: Bearer <token>` 请求头（移动端）
- 其次读取 `feijia_access` Cookie（Web 端）

## 三、接口列表

所有接口基础路径为 `/api`（根据实际部署环境调整）。

### 3.1 获取图形验证码 / Get Captcha Challenge

**请求方式:** POST  
**请求路径:** `/auth/captcha/challenge`  
**鉴权:** 无需鉴权

**请求参数:** 无

**响应参数:**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| challengeId | string | 验证码挑战 ID，后续请求需携带 |
| imageOrText | string | 验证码图片或文本（Base64 或 URL） |
| expiresInSeconds | integer | 过期时间（秒），默认 300 秒（5 分钟） |

**响应示例:**

```json
{
  "challengeId": "cpt_abc123",
  "imageOrText": "data:image/png;base64,iVBORw0KGgo...",
  "expiresInSeconds": 300
}
```

---

### 3.2 请求短信验证码 / Request SMS Code

**请求方式:** POST  
**请求路径:** `/auth/sms/request`  
**鉴权:** 无需鉴权

**请求参数:**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| phone | string | 是 | 中国大陆手机号，正则 `/^1\d{10}$/` |
| captchaChallengeId | string | 是 | 图形验证码挑战 ID |
| captchaCode | string | 是 | 图形验证码，4-8 位 |

**请求示例:**

```json
{
  "phone": "13800138000",
  "captchaChallengeId": "cpt_abc123",
  "captchaCode": "A3F7"
}
```

**响应参数:**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| requestId | string | 请求 ID |
| expiresInSeconds | integer | 验证码过期时间（秒），默认 300 秒 |
| mockCode | string (可选) | 开发环境返回的模拟验证码，生产环境不返回 |

**响应示例:**

```json
{
  "requestId": "sms_req_456",
  "expiresInSeconds": 300,
  "mockCode": "123456"
}
```

**错误码:**

| 错误码 | HTTP 状态码 | 说明 | 处理建议 |
|--------|------------|------|----------|
| INVALID_CAPTCHA | 400 | 图形验证码错误 | 提示用户重新输入或刷新验证码 |
| SMS_PROVIDER_UNAVAILABLE | 503 | 短信服务不可用 | 提示用户稍后重试 |

---

### 3.3 App 登录 / App Login

**请求方式:** POST  
**请求路径:** `/auth/app/login`  
**鉴权:** 无需鉴权

**请求参数:**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| phone | string | 是 | 中国大陆手机号 |
| smsCode | string | 是 | 6–8 位短信验证码（默认 6 位） |
| deviceLabel | string (可选) | 否 | 设备标识，最大 120 字符 |

**请求示例:**

```json
{
  "phone": "13800138000",
  "smsCode": "123456",
  "deviceLabel": "iPhone 15 Pro - iOS 17.2"
}
```

**响应（登录成功）:**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| kind | string | 固定值 `"authenticated"` |
| accessToken | string | Access Token，后续请求携带 |
| refreshToken | string | Refresh Token，用于刷新会话 |
| user | object | 用户信息 |
| user.id | string | 用户 ID |
| user.displayName | string | 用户昵称 |
| user.avatarUrl | string \| null | 头像 URL |
| user.role | string | 用户角色：`"user"` 或 `"admin"` |

**响应示例（登录成功）:**

```json
{
  "kind": "authenticated",
  "accessToken": "sess_abc123def456...",
  "refreshToken": "rt_xyz789uvw012...",
  "user": {
    "id": "user_001",
    "displayName": "张三",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "user"
  }
}
```

**响应（需要注册）:** 手机号首次登录，需完善资料

| 参数名 | 类型 | 说明 |
|--------|------|------|
| kind | string | 固定值 `"registration_required"` |
| registrationToken | string | 注册临时令牌，10 分钟有效 |
| phone | string | 手机号 |
| suggestedDisplayName | string | 系统建议的昵称 |

**响应示例（需要注册）:**

```json
{
  "kind": "registration_required",
  "registrationToken": "reg_temp_abc123",
  "phone": "13800138000",
  "suggestedDisplayName": "手机用户8000"
}
```

**错误码:**

| 错误码 | HTTP 状态码 | 说明 | 处理建议 |
|--------|------------|------|----------|
| INVALID_SMS_CODE | 400 | 短信验证码错误 | 提示用户重新输入 |
| PHONE_ALREADY_REGISTERED | 409 | 手机号已注册但登录异常 | 联系客服 |

---

### 3.4 完善资料（新用户注册）/ Complete Registration

**请求方式:** POST  
**请求路径:** `/auth/app/register/complete`  
**鉴权:** 无需鉴权

**请求参数:**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| registrationToken | string | 是 | 注册临时令牌 |
| displayName | string | 是 | 用户昵称，1-50 字符 |
| avatarFileId | string (可选) | 否 | 头像文件 ID（需先上传头像） |
| deviceLabel | string (可选) | 否 | 设备标识，最大 120 字符 |

**请求示例:**

```json
{
  "registrationToken": "reg_temp_abc123",
  "displayName": "张三",
  "avatarFileId": "file_789",
  "deviceLabel": "iPhone 15 Pro - iOS 17.2"
}
```

**响应参数:**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| accessToken | string | Access Token |
| refreshToken | string | Refresh Token |
| user | object | 用户信息（同上） |

**响应示例:**

```json
{
  "accessToken": "sess_new123...",
  "refreshToken": "rt_new456...",
  "user": {
    "id": "user_002",
    "displayName": "张三",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "user"
  }
}
```

**错误码:**

| 错误码 | HTTP 状态码 | 说明 | 处理建议 |
|--------|------------|------|----------|
| INVALID_REGISTRATION_TOKEN | 400 | 注册令牌无效或已过期 | 引导用户重新登录 |
| DISPLAY_NAME_TAKEN | 409 | 昵称已被占用 | 提示用户更换昵称 |
| PHONE_ALREADY_REGISTERED | 409 | 手机号已注册 | 引导用户直接登录 |

---

### 3.5 建议昵称 / Suggest Display Name

**请求方式:** POST  
**请求路径:** `/auth/registration/display-name/suggest`  
**鉴权:** 无需鉴权

**请求参数:**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| registrationToken | string | 是 | 注册临时令牌 |

**响应参数:**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| displayName | string | 系统建议的昵称 |

---

### 3.6 刷新 Token / Refresh Token

**请求方式:** POST  
**请求路径:** `/auth/app/refresh`  
**鉴权:** 无需鉴权

**请求参数:**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| refreshToken | string | 是 | 刷新令牌 |

**请求示例:**

```json
{
  "refreshToken": "rt_xyz789uvw012..."
}
```

**响应参数:** 同登录成功响应（含新 accessToken + refreshToken + user）

**错误码:**

| 错误码 | HTTP 状态码 | 说明 | 处理建议 |
|--------|------------|------|----------|
| INVALID_REFRESH_TOKEN | 400 | Refresh Token 无效 | 引导用户重新登录 |
| SESSION_EXPIRED | 400 | 会话已过期 | 引导用户重新登录 |

---

### 3.7 获取当前用户 / Get Current User

**请求方式:** GET  
**请求路径:** `/auth/app/me`  
**鉴权:** 需要 `Authorization: Bearer <accessToken>`

**响应参数:**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| user | object \| null | 用户信息，未登录时为 null |

**响应示例:**

```json
{
  "user": {
    "id": "user_001",
    "displayName": "张三",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "user"
  }
}
```

---

### 3.8 登出 / Logout

**请求方式:** POST  
**请求路径:** `/auth/app/logout`  
**鉴权:** 需要 `Authorization: Bearer <accessToken>`

**响应参数:** 同获取当前用户响应

---

## 四、通用错误响应格式

所有接口出错时返回统一格式：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | string | 错误码（见下方枚举） |
| message | string | 错误描述 |

**错误码枚举:**

| 错误码 | 说明 |
|--------|------|
| INVALID_CAPTCHA | 图形验证码错误 |
| INVALID_SMS_CODE | 短信验证码错误 |
| INVALID_CREDENTIALS | 凭证无效 |
| INVALID_REFRESH_TOKEN | Refresh Token 无效 |
| SMS_PROVIDER_UNAVAILABLE | 短信服务不可用 |
| SESSION_EXPIRED | 会话已过期 |
| UNAUTHORIZED | 未授权 |
| FORBIDDEN | 禁止访问 |
| DISPLAY_NAME_TAKEN | 昵称已被占用 |
| PHONE_ALREADY_REGISTERED | 手机号已注册 |
| REGISTRATION_REQUIRED | 需要注册 |
| INVALID_REGISTRATION_TOKEN | 注册令牌无效 |
| TOKEN_EXPIRED | Token 已过期 |

---

## 五、完整登录流程图

```
┌─────────────────────────────────────────────────────────┐
│                    移动端登录流程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 页面加载                                             │
│     └─ POST /auth/captcha/challenge                      │
│        → 获取 challengeId + 验证码图片                     │
│                                                         │
│  2. 用户输入手机号 + 图形验证码                            │
│     └─ POST /auth/sms/request                            │
│        → 发送短信验证码（Redis 哈希存储，默认 5 分钟有效）     │
│                                                         │
│  3. 用户输入短信验证码，点击登录                            │
│     └─ POST /auth/app/login                              │
│        │                                                 │
│        ├─ 手机号已注册                                     │
│        │   → 返回 { kind: "authenticated",               │
│        │            accessToken, refreshToken, user }    │
│        │   → 客户端存储 Token，登录完成                     │
│        │                                                 │
│        └─ 手机号未注册                                     │
│            → 返回 { kind: "registration_required",       │
│            │         registrationToken, phone,           │
│            │         suggestedDisplayName }              │
│            │                                             │
│            └─ 跳转到完善资料页面                            │
│               ├─ (可选) POST /auth/registration/          │
│               │    suggest-display-name                   │
│               │    → 获取建议昵称                          │
│               │                                           │
│               └─ POST /auth/app/register/complete         │
│                  → 填写昵称 + 上传头像（可选）               │
│                  → 返回 { accessToken, refreshToken,      │
│                          user }                           │
│                  → 客户端存储 Token，注册+登录完成            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 六、移动端 Token 管理方案

### 6.1 存储方式

移动端 **不使用 Cookie**，需要在客户端安全存储 Token：

| Token 类型 | 推荐存储 | 说明 |
|-----------|----------|------|
| accessToken | iOS: Keychain / Android: EncryptedSharedPreferences | 安全存储，应用卸载自动清除 |
| refreshToken | iOS: Keychain / Android: EncryptedSharedPreferences | 安全存储，长期有效 |
| user 信息 | 内存 / UserDefaults / DataStore | 仅用于 UI 状态恢复 |

### 6.2 请求拦截器

所有需要鉴权的接口需在请求头添加：

```
Authorization: Bearer <accessToken>
```

### 6.3 自动刷新机制

```
发送请求
  │
  ├─ 返回 200 → 正常处理响应
  │
  └─ 返回 401 且 code === "TOKEN_EXPIRED"
     │
     ├─ 调用 POST /auth/app/refresh (携带 refreshToken)
     │    │
     │    ├─ 刷新成功 → 存储新 Token → 重试原请求
     │    │
     │    └─ 刷新失败 → 清除本地 Token → 跳转登录页
     │
     └─ 重试原请求
```

### 6.4 建议实现伪代码

```typescript
// 请求拦截器
async function request(url: string, options: RequestInit) {
  const accessToken = await getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${accessToken}`,
    },
  });
  
  if (response.status === 401) {
    const body = await response.json();
    if (body.code === "TOKEN_EXPIRED") {
      const refreshed = await refreshSession();
      if (refreshed) {
        // 重试原请求
        return request(url, options);
      }
      // 刷新失败，跳转登录页
      navigateToLogin();
      throw new Error("Session expired");
    }
  }
  
  return response;
}

// 刷新会话
async function refreshSession() {
  const refreshToken = await getRefreshToken();
  const response = await fetch("/auth/app/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  
  if (response.ok) {
    const data = await response.json();
    await saveAccessToken(data.accessToken);
    await saveRefreshToken(data.refreshToken);
    return true;
  }
  
  // 刷新失败，清除本地存储
  await clearTokens();
  return false;
}
```

## 七、Token 生命周期速查

| 类型 | 有效期 | 备注 |
|------|--------|------|
| 图形验证码 | 5 分钟 | 存储在 Redis |
| 短信验证码 | 默认 5 分钟 | 哈希存储在 Redis |
| 注册临时令牌 | 10 分钟 | 存储在 Redis |
| Access Token | 2 小时 | Session ID，每次刷新续期 |
| Refresh Token | 30 天 | 滑动续期：剩余时间 < 一半时续期 30 天 |
| Session 总有效期 | 30 天 | 从创建起计算，不可续期 |

## 八、手机号格式校验

```regex
/^1\d{10}$/
```

- 以 1 开头
- 后跟 10 位数字
- 总计 11 位

## 九、开发环境提示

- 开发环境下，`/auth/sms/request` 接口会返回 `mockCode` 字段，可直接用于测试
- 管理员默认账号：`admin`，密码：`Admin#123`（仅用于后台管理登录）

## 十、前端相关文件参考

| 文件路径 | 作用 |
|----------|------|
| `packages/schemas/src/auth.ts` | 所有认证相关的 Zod Schema 定义 |
| `packages/shared/src/index.ts` | API 路由常量 (`API_ROUTES.auth.*`) |
| `packages/http-client/src/index.ts` | HTTP 客户端，包含所有认证 API 调用方法 |
| `apps/server/src/modules/auth/auth.route.ts` | 服务端认证路由 |
| `apps/server/src/modules/auth/auth.service.ts` | 认证业务逻辑 |
| `apps/server/src/modules/auth/auth.repo.ts` | 数据库/Redis 操作 |
| `apps/server/src/modules/auth/auth.middleware.ts` | 鉴权中间件 |
| `apps/web/src/features/auth/login-page.tsx` | Web 端登录页面（可参考交互逻辑） |
| `apps/web/src/lib/api-client.ts` | Web 端 API 客户端，含自动刷新逻辑 |
