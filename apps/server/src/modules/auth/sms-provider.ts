import { randomUUID } from "node:crypto";
import Dysmsapi20170525, * as $Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import { sms } from "tencentcloud-sdk-nodejs";
import type { ClientConfig } from "tencentcloud-sdk-nodejs/tencentcloud/common/interface";
import { parseBooleanEnv } from "../../lib/env-flags";

export type SmsProvider = "mock" | "aliyun" | "tencent";

type RemoteSmsProvider = Exclude<SmsProvider, "mock">;

interface EnvLike {
  [key: string]: string | undefined;
}

export interface SmsProviderConfig {
  provider: SmsProvider;
  exposeMockCode: boolean;
  aliyun: {
    accessKeyId?: string;
    accessKeySecret?: string;
    signName?: string;
    templateCode?: string;
  };
  tencent: {
    secretId?: string;
    secretKey?: string;
    sdkAppId?: string;
    signName?: string;
    templateId?: string;
  };
}

export interface SendSmsInput {
  phone: string;
  code: string;
}

export interface SendSmsResult {
  requestId: string;
  mockCode?: string;
}

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------

export class SmsError extends Error {
  constructor(
    message: string,
    public readonly provider: SmsProvider,
    public readonly code?: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "SmsError";
  }
}

const SMS_RATE_LIMIT_ERROR_CODES = new Set([
  "SMS_RATE_LIMITED",
  "FailedOperation.SendFrequencyLimit",
  "Throttling.User",
  "isv.BUSINESS_LIMIT_CONTROL"
]);
const SMS_PROVIDER_SET = new Set<SmsProvider>(["mock", "aliyun", "tencent"]);

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function hasAliyunSmsConfig(config: SmsProviderConfig) {
  return [
    config.aliyun.accessKeyId,
    config.aliyun.accessKeySecret,
    config.aliyun.signName,
    config.aliyun.templateCode
  ].every(Boolean);
}

function hasTencentSmsConfig(config: SmsProviderConfig) {
  return [
    config.tencent.secretId,
    config.tencent.secretKey,
    config.tencent.sdkAppId,
    config.tencent.signName,
    config.tencent.templateId
  ].every(Boolean);
}

function isSmsProvider(value: string): value is SmsProvider {
  return SMS_PROVIDER_SET.has(value as SmsProvider);
}

function isRemoteSmsProvider(provider: SmsProvider): provider is RemoteSmsProvider {
  return provider !== "mock";
}

function createRequestId(prefix: string) {
  return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Aliyun SMS
// ---------------------------------------------------------------------------

function createAliyunClient(config: SmsProviderConfig) {
  const credConfig = new $OpenApi.Config({
    accessKeyId: config.aliyun.accessKeyId,
    accessKeySecret: config.aliyun.accessKeySecret,
    endpoint: "dysmsapi.aliyuncs.com",
  });
  return new Dysmsapi20170525(credConfig);
}

function classifyAliyunError(code: string | undefined, message: string): SmsError {
  switch (code) {
    case "isv.BUSINESS_LIMIT_CONTROL":
    case "isv.OUT_OF_SERVICE":
      return new SmsError(`短信配额不足或业务受限: ${message}`, "aliyun", code);
    case "isv.INVALID_PARAMETERS":
    case "isv.MOBILE_NUMBER_ILLEGAL":
      return new SmsError(`参数错误: ${message}`, "aliyun", code);
    case "isv.AMOUNT_NOT_ENOUGH":
      return new SmsError(`短信余额不足: ${message}`, "aliyun", code);
    case "isv.TEMPLATE_MISSING_PARAMETERS":
      return new SmsError(`模板参数缺失: ${message}`, "aliyun", code);
    case "Throttling.User":
      return new SmsError(`请求过于频繁: ${message}`, "aliyun", code);
    case "SignatureNonceUsed":
      return new SmsError(`签名重复: ${message}`, "aliyun", code);
    default:
      // Network / timeout detection
      if (message?.toLowerCase().includes("timeout") || message?.toLowerCase().includes("network")) {
        return new SmsError(`网络超时: ${message}`, "aliyun", code);
      }
      return new SmsError(`阿里云短信发送失败 (${code ?? "unknown"}): ${message}`, "aliyun", code);
  }
}

async function sendViaAliyun(config: SmsProviderConfig, input: SendSmsInput): Promise<SendSmsResult> {
  const client = createAliyunClient(config);

  const request = new $Dysmsapi20170525.SendSmsRequest({
    phoneNumbers: input.phone,
    signName: config.aliyun.signName,
    templateCode: config.aliyun.templateCode,
    templateParam: JSON.stringify({ code: input.code }),
  });

  try {
    const response = await client.sendSms(request);
    const body = response.body;

    if (!body) {
      throw new SmsError("阿里云短信返回空响应", "aliyun", "EMPTY_RESPONSE");
    }

    if (body.code !== "OK") {
      throw classifyAliyunError(body.code, body.message ?? "未知错误");
    }

    return {
      requestId: body.requestId ?? createRequestId("aliyun"),
    };
  } catch (err) {
    if (err instanceof SmsError) throw err;

    const e = err as Record<string, unknown>;
    const data = e.data as Record<string, unknown> | undefined;
    const code = (e.code as string | undefined) ?? (data?.Code as string | undefined);
    const message =
      (e.message as string) ??
      (typeof data?.Message === "string" ? data.Message : "未知错误");

    throw classifyAliyunError(code, message);
  }
}

// ---------------------------------------------------------------------------
// Tencent SMS
// ---------------------------------------------------------------------------

function createTencentClient(config: SmsProviderConfig) {
  const SmsClient = sms.v20210111.Client;
  const clientConfig: ClientConfig = {
    credential: {
      secretId: config.tencent.secretId,
      secretKey: config.tencent.secretKey,
    },
    profile: {
      httpProfile: {
        reqTimeout: 5,
      },
    },
  };
  return new SmsClient(clientConfig);
}

function classifyTencentError(code: string | undefined, message: string): SmsError {
  switch (code) {
    case "FailedOperation.TemplateIncorrectOrUnapproved":
    case "FailedOperation.SignatureIncorrectOrUnapproved":
      return new SmsError(`签名或模板未审核: ${message}`, "tencent", code);
    case "FailedOperation.BillingLimitExceeded":
    case "FailedOperation.PackageAmountExhausted":
      return new SmsError(`短信配额/余额不足: ${message}`, "tencent", code);
    case "FailedOperation.PhoneNumberInBlacklist":
      return new SmsError(`手机号在黑名单中: ${message}`, "tencent", code);
    case "FailedOperation.PhoneNumberFormatIncorrect":
    case "FailedOperation.PhoneNumberIllegal":
      return new SmsError(`手机号格式错误: ${message}`, "tencent", code);
    case "FailedOperation.TemplateParamError":
      return new SmsError(`模板参数错误: ${message}`, "tencent", code);
    case "FailedOperation.SendFrequencyLimit":
      return new SmsError(`发送频率超限: ${message}`, "tencent", code);
    case "FailedOperation.ContentContainsSensitiveWords":
      return new SmsError(`内容包含敏感词: ${message}`, "tencent", code);
    default:
      if (message?.toLowerCase().includes("timeout") || message?.toLowerCase().includes("network")) {
        return new SmsError(`网络超时: ${message}`, "tencent", code);
      }
      return new SmsError(`腾讯云短信发送失败 (${code ?? "unknown"}): ${message}`, "tencent", code);
  }
}

async function sendViaTencent(config: SmsProviderConfig, input: SendSmsInput): Promise<SendSmsResult> {
  const client = createTencentClient(config);

  const { sdkAppId, signName, templateId } = config.tencent;
  if (!sdkAppId || !signName || !templateId) {
    throw new Error("Tencent SMS provider is missing required configuration.");
  }

  try {
    const response = await client.SendSms({
      PhoneNumberSet: [`+86${input.phone}`],
      SmsSdkAppId: sdkAppId,
      SignName: signName,
      TemplateId: templateId,
      TemplateParamSet: [input.code],
    });

    const sendStatusSet = response.SendStatusSet;
    if (!sendStatusSet || sendStatusSet.length === 0) {
      throw new SmsError("腾讯云短信返回空状态", "tencent", "EMPTY_RESPONSE");
    }

    const status = sendStatusSet[0];

    if (status.Code !== "Ok") {
      throw classifyTencentError(status.Code, status.Message ?? "未知错误");
    }

    return {
      requestId: status.SerialNo ?? createRequestId("tencent"),
    };
  } catch (err) {
    if (err instanceof SmsError) throw err;

    const e = err as Record<string, unknown>;
    const code = (e.code as string | undefined) ?? (e.Code as string | undefined);
    const message =
      (e.message as string) ??
      (e.Message as string) ??
      "未知错误";

    throw classifyTencentError(code, message);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 解析短信 provider 配置，并校验生产环境约束。
 *
 * @param env 需要解析的环境变量集合，默认读取 `process.env`。
 * @returns 标准化后的短信 provider 配置。
 * @throws {Error} 当生产环境缺少 `SMS_PROVIDER`、配置非法或误用 `mock` 时抛出异常。
 */
export function resolveSmsProviderConfig(env: EnvLike = process.env): SmsProviderConfig {
  const isProduction = env.NODE_ENV === "production";
  const providerRaw = env.SMS_PROVIDER?.toLowerCase().trim() || "";
  if (!providerRaw && isProduction) {
    throw new Error("SMS_PROVIDER must be configured in production.");
  }

  const provider = providerRaw || "mock";
  if (!isSmsProvider(provider)) {
    throw new Error("Invalid SMS_PROVIDER. Expected mock|aliyun|tencent.");
  }
  if (isProduction && provider === "mock") {
    throw new Error("SMS_PROVIDER=mock is forbidden in production.");
  }

  return {
    provider,
    exposeMockCode: !isProduction && parseBooleanEnv(env.SMS_EXPOSE_MOCK_CODE, true),
    aliyun: {
      accessKeyId: env.ALIYUN_SMS_ACCESS_KEY_ID?.trim(),
      accessKeySecret: env.ALIYUN_SMS_ACCESS_KEY_SECRET?.trim(),
      signName: env.ALIYUN_SMS_SIGN_NAME?.trim(),
      templateCode: env.ALIYUN_SMS_TEMPLATE_CODE?.trim(),
    },
    tencent: {
      secretId: env.TENCENT_SMS_SECRET_ID?.trim(),
      secretKey: env.TENCENT_SMS_SECRET_KEY?.trim(),
      sdkAppId: env.TENCENT_SMS_SDK_APP_ID?.trim(),
      signName: env.TENCENT_SMS_SIGN_NAME?.trim(),
      templateId: env.TENCENT_SMS_TEMPLATE_ID?.trim(),
    },
  };
}

/**
 * 基于当前配置创建短信发送器。
 *
 * @param config 已解析好的短信 provider 配置。
 * @returns 统一的短信发送入口。
 * @throws {Error} 当 provider 配置缺失、测试环境误发真实短信或生产环境误用 mock 时抛出异常。
 */
export function createSmsSender(config: SmsProviderConfig) {
  const remoteSmsConfigValidators = {
    aliyun: () => hasAliyunSmsConfig(config),
    tencent: () => hasTencentSmsConfig(config)
  } satisfies Record<RemoteSmsProvider, () => boolean>;
  const remoteSmsMissingConfigMessages = {
    aliyun: "Aliyun SMS provider is missing required configuration.",
    tencent: "Tencent SMS provider is missing required configuration."
  } satisfies Record<RemoteSmsProvider, string>;

  return {
    async sendCode(input: SendSmsInput): Promise<SendSmsResult> {
      if (!isRemoteSmsProvider(config.provider)) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("Mock SMS provider is forbidden in production.");
        }

        return {
          requestId: createRequestId("sms_mock"),
          mockCode: config.exposeMockCode ? input.code : undefined,
        };
      }

      if (process.env.NODE_ENV === "test") {
        throw new Error(`${config.provider} sms dispatch is not implemented in test environment.`);
      }

      if (!remoteSmsConfigValidators[config.provider]()) {
        throw new Error(remoteSmsMissingConfigMessages[config.provider]);
      }

      if (config.provider === "aliyun") {
        return sendViaAliyun(config, input);
      }

      return sendViaTencent(config, input);
    },
  };
}

/**
 * 判断异常是否属于短信发送频控场景。
 *
 * @param error 待识别的异常对象。
 * @returns 命中已知频控错误码或统一频控消息时返回 `true`。
 * @throws {never} 该函数只做类型判断与错误码匹配，不会主动抛出异常。
 */
export function isSmsRateLimitedError(error: unknown) {
  if (error instanceof SmsError) {
    return error.code !== undefined && SMS_RATE_LIMIT_ERROR_CODES.has(error.code);
  }

  return error instanceof Error && error.message === "SMS_RATE_LIMITED";
}
