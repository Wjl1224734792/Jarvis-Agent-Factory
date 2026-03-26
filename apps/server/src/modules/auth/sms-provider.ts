export type SmsProvider = "mock" | "aliyun" | "tencent";

type EnvLike = Record<string, string | undefined>;

export type SmsProviderConfig = {
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
};

export type SendSmsInput = {
  phone: string;
  code: string;
};

export type SendSmsResult = {
  requestId: string;
  mockCode?: string;
};

function hasAliyunSmsConfig(config: SmsProviderConfig) {
  return Boolean(
    config.aliyun.accessKeyId &&
      config.aliyun.accessKeySecret &&
      config.aliyun.signName &&
      config.aliyun.templateCode
  );
}

function hasTencentSmsConfig(config: SmsProviderConfig) {
  return Boolean(
    config.tencent.secretId &&
      config.tencent.secretKey &&
      config.tencent.sdkAppId &&
      config.tencent.signName &&
      config.tencent.templateId
  );
}

function parseBoolean(input: string | undefined, fallback: boolean) {
  if (input === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(input.toLowerCase());
}

function createRequestId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

export function resolveSmsProviderConfig(env: EnvLike = process.env): SmsProviderConfig {
  const providerRaw = (env.SMS_PROVIDER ?? "mock").toLowerCase().trim();
  if (!["mock", "aliyun", "tencent"].includes(providerRaw)) {
    throw new Error("Invalid SMS_PROVIDER. Expected mock|aliyun|tencent.");
  }

  return {
    provider: providerRaw as SmsProvider,
    exposeMockCode: parseBoolean(env.SMS_EXPOSE_MOCK_CODE, true),
    aliyun: {
      accessKeyId: env.ALIYUN_SMS_ACCESS_KEY_ID?.trim(),
      accessKeySecret: env.ALIYUN_SMS_ACCESS_KEY_SECRET?.trim(),
      signName: env.ALIYUN_SMS_SIGN_NAME?.trim(),
      templateCode: env.ALIYUN_SMS_TEMPLATE_CODE?.trim()
    },
    tencent: {
      secretId: env.TENCENT_SMS_SECRET_ID?.trim(),
      secretKey: env.TENCENT_SMS_SECRET_KEY?.trim(),
      sdkAppId: env.TENCENT_SMS_SDK_APP_ID?.trim(),
      signName: env.TENCENT_SMS_SIGN_NAME?.trim(),
      templateId: env.TENCENT_SMS_TEMPLATE_ID?.trim()
    }
  };
}

export function createSmsSender(config: SmsProviderConfig) {
  return {
    async sendCode(input: SendSmsInput): Promise<SendSmsResult> {
      if (config.provider === "mock") {
        return {
          requestId: createRequestId("sms_mock"),
          mockCode: config.exposeMockCode ? input.code : undefined
        };
      }

      if (config.provider === "aliyun") {
        if (!hasAliyunSmsConfig(config)) {
          throw new Error("Aliyun SMS provider is missing required configuration.");
        }

        throw new Error("Aliyun SMS provider is configured but cloud dispatch is not implemented yet.");
      }

      if (!hasTencentSmsConfig(config)) {
        throw new Error("Tencent SMS provider is missing required configuration.");
      }

      throw new Error("Tencent SMS provider is configured but cloud dispatch is not implemented yet.");
    }
  };
}
