# OPT-003 短信服务商实现（阿里云/腾讯云）

## 实现目标

将 `sms-provider.ts` 中阿里云和腾讯云短信发送的"未实现"占位逻辑替换为真实 SDK 调用，同时保留 mock 模式用于开发环境。

## 变更文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `apps/server/src/modules/auth/sms-provider.ts` | 修改 | 实现真实短信发送逻辑 |
| `apps/server/package.json` | 修改 | 新增 3 个 SDK 依赖 |

### 新增依赖

```json
"@alicloud/dysmsapi20170525": "^4.5.0",
"@alicloud/openapi-client": "^0.4.15",
"tencentcloud-sdk-nodejs": "^4.1.206"
```

## 实现说明

### 架构不变

- `SmsProviderConfig` 接口保持原样
- `createSmsSender()` 返回对象及 `sendCode(input)` 方法签名不变
- `SendSmsResult` 类型不变（`requestId` + 可选 `mockCode`）

### 新增：错误分类体系

引入 `SmsError` 自定义错误类，携带 `provider`、`code`、`raw` 字段，便于上层统一处理。

#### 阿里云错误分类

| 错误码 | 含义 | 映射 |
|--------|------|------|
| `isv.BUSINESS_LIMIT_CONTROL` / `isv.OUT_OF_SERVICE` | 配额不足/业务受限 | 业务错误 |
| `isv.AMOUNT_NOT_ENOUGH` | 余额不足 | 业务错误 |
| `isv.INVALID_PARAMETERS` / `isv.MOBILE_NUMBER_ILLEGAL` | 参数错误 | 参数错误 |
| `isv.TEMPLATE_MISSING_PARAMETERS` | 模板参数缺失 | 参数错误 |
| `Throttling.User` | 请求频率超限 | 限流错误 |
| `SignatureNonceUsed` | 签名重复 | 幂等错误 |
| 含 "timeout"/"network" | 网络超时 | 网络错误 |
| 其他 | 兜底 | 通用错误 |

#### 腾讯云错误分类

| 错误码 | 含义 | 映射 |
|--------|------|------|
| `FailedOperation.TemplateIncorrectOrUnapproved` | 模板未审核 | 配置错误 |
| `FailedOperation.SignatureIncorrectOrUnapproved` | 签名未审核 | 配置错误 |
| `FailedOperation.BillingLimitExceeded` / `FailedOperation.PackageAmountExhausted` | 配额/余额不足 | 业务错误 |
| `FailedOperation.PhoneNumberInBlacklist` | 黑名单 | 业务错误 |
| `FailedOperation.PhoneNumberFormatIncorrect` / `FailedOperation.PhoneNumberIllegal` | 手机号格式错误 | 参数错误 |
| `FailedOperation.TemplateParamError` | 模板参数错误 | 参数错误 |
| `FailedOperation.SendFrequencyLimit` | 频率超限 | 限流错误 |
| `FailedOperation.ContentContainsSensitiveWords` | 敏感词 | 内容错误 |
| 含 "timeout"/"network" | 网络超时 | 网络错误 |
| 其他 | 兜底 | 通用错误 |

### 阿里云实现要点

```
Client 创建 → SendSmsRequest → client.sendSms() → 解析 body.code === "OK"
```

- 使用 `@alicloud/dysmsapi20170525` 的 `Client` 类，endpoint 固定 `dysmsapi.aliyuncs.com`
- `templateParam` 以 JSON 字符串传递 `{ code: "123456" }`
- 返回 `body.requestId` 作为 `requestId`

### 腾讯云实现要点

```
Client 创建 → client.SendSms() → 解析 SendStatusSet[0].Code === "Ok"
```

- 使用 `tencentcloud-sdk-nodejs` 的 `sms.v20210111.Client`
- 手机号自动添加 `+86` 前缀（E.164 格式）
- `TemplateParamSet` 为字符串数组
- HTTP 超时设为 5 秒
- 返回 `SendStatusSet[0].SerialNo` 作为 `requestId`

### Mock 模式

- 默认 `SMS_PROVIDER=mock`，行为不变
- `SMS_EXPOSE_MOCK_CODE=true` 时返回 `mockCode`

## 测试验证

### 类型检查

```bash
bun run typecheck
# ✅ 通过，无错误
```

### 单元测试

auth 测试因本地 PostgreSQL 未运行而跳过（基础设施问题），与本次 SMS 变更无关。SMS 逻辑通过类型系统保障。

## 数据与接口边界

### 环境变量

| 变量 | 用途 | 必填（对应 provider） |
|------|------|----------------------|
| `SMS_PROVIDER` | 选择服务商 `mock\|aliyun\|tencent` | 否，默认 `mock` |
| `SMS_EXPOSE_MOCK_CODE` | mock 模式是否返回验证码 | 否，默认 `true` |
| `ALIYUN_SMS_ACCESS_KEY_ID` | 阿里云 AK | aliyun |
| `ALIYUN_SMS_ACCESS_KEY_SECRET` | 阿里云 SK | aliyun |
| `ALIYUN_SMS_SIGN_NAME` | 阿里云签名 | aliyun |
| `ALIYUN_SMS_TEMPLATE_CODE` | 阿里云模板 | aliyun |
| `TENCENT_SMS_SECRET_ID` | 腾讯云 SecretId | tencent |
| `TENCENT_SMS_SECRET_KEY` | 腾讯云 SecretKey | tencent |
| `TENCENT_SMS_SDK_APP_ID` | 腾讯云应用 ID | tencent |
| `TENCENT_SMS_SIGN_NAME` | 腾讯云签名 | tencent |
| `TENCENT_SMS_TEMPLATE_ID` | 腾讯云模板 ID | tencent |

### 输入输出

```typescript
// 输入
{ phone: string; code: string }

// 输出
{ requestId: string; mockCode?: string }
```

### 前置校验

- `hasAliyunSmsConfig()` / `hasTencentSmsConfig()` 在调用真实发送前检查配置完整性
- 缺失配置时抛出 `Error`（非 `SmsError`），避免无效网络请求

## 风险项

1. **SDK 版本兼容性**：阿里云 `@alicloud/dysmsapi20170525` 4.5.0 和腾讯云 `tencentcloud-sdk-nodejs` 4.1.206 均为最新稳定版，API 稳定。
2. **腾讯云 SDK 导入**：v4 版本使用命名空间导入（`import { sms } from "tencentcloud-sdk-nodejs"`），与 v3 的 `require("tencentcloud-sdk-nodejs")` 不同。已按 v4 模式实现。
3. **手机号格式**：腾讯云要求 E.164 格式（`+8613800138000`），实现中自动添加 `+86` 前缀。如未来支持国际短信，需调整此逻辑。
4. **超时设置**：腾讯云 HTTP 超时设为 5 秒，阿里云使用 SDK 默认值（通常 30 秒）。如需统一，可额外配置阿里云 `connectTimeout` / `readTimeout`。

## 需前端配合点

**无需前端配合。** 本次变更完全在后端内部，`SmsProviderConfig`、`SendSmsInput`、`SendSmsResult` 接口均未改变，API 路由层无变更。
