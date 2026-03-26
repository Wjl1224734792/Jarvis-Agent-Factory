import { describe, expect, it } from "vitest";
import {
  isStorageProviderExplicitlyConfigured,
  resolveStorageProviderConfig,
  type StorageProvider
} from "../src/modules/posts/storage-provider";
import { createSmsSender, resolveSmsProviderConfig, type SmsProvider } from "../src/modules/auth/sms-provider";

function createEnv(input: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...input
  };
}

describe("provider config", () => {
  it("parses s3-compatible storage providers from env", () => {
    const providers: StorageProvider[] = ["minio", "cos", "oss", "kodo"];

    for (const provider of providers) {
      const config = resolveStorageProviderConfig(
        createEnv({
          STORAGE_PROVIDER: provider,
          STORAGE_BUCKET: "feijia-media",
          STORAGE_ENDPOINT: "http://localhost:9000",
          STORAGE_REGION: "us-east-1",
          STORAGE_ACCESS_KEY_ID: "id",
          STORAGE_SECRET_ACCESS_KEY: "secret",
          STORAGE_FORCE_PATH_STYLE: "true"
        })
      );

      expect(config.provider).toBe(provider);
      expect(config.bucket).toBe("feijia-media");
    }
  });

  it("throws on invalid storage provider", () => {
    expect(() =>
      resolveStorageProviderConfig(
        createEnv({
          STORAGE_PROVIDER: "invalid-provider"
        })
      )
    ).toThrowError(/STORAGE_PROVIDER/i);
  });

  it("builds bucket-aware public urls for virtual-host style storage", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        STORAGE_PROVIDER: "cos",
        STORAGE_BUCKET: "feijia-media",
        STORAGE_ENDPOINT: "https://cos.example.com",
        STORAGE_REGION: "ap-shanghai",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret",
        STORAGE_FORCE_PATH_STYLE: "false"
      })
    );

    expect(config.publicBaseUrl).toBe("https://feijia-media.cos.example.com");
  });

  it("detects explicit storage configuration", () => {
    expect(
      isStorageProviderExplicitlyConfigured(
        createEnv({
          STORAGE_PROVIDER: "minio"
        })
      )
    ).toBe(true);
  });

  it("parses sms providers and keeps mock code for mock sender", async () => {
    const providers: SmsProvider[] = ["mock", "aliyun", "tencent"];
    for (const provider of providers) {
      const config = resolveSmsProviderConfig(
        createEnv({
          SMS_PROVIDER: provider,
          SMS_EXPOSE_MOCK_CODE: "true"
        })
      );

      expect(config.provider).toBe(provider);
    }

    const mockSender = createSmsSender(
      resolveSmsProviderConfig(
        createEnv({
          SMS_PROVIDER: "mock",
          SMS_EXPOSE_MOCK_CODE: "true"
        })
      )
    );
    const sendResult = await mockSender.sendCode({
      phone: "13800138000",
      code: "123456"
    });
    expect(sendResult.mockCode).toBe("123456");
  });

  it("fails fast for non-mock sms providers until real dispatch is implemented", async () => {
    const aliyunSender = createSmsSender(
      resolveSmsProviderConfig(
        createEnv({
          SMS_PROVIDER: "aliyun",
          ALIYUN_SMS_ACCESS_KEY_ID: "id",
          ALIYUN_SMS_ACCESS_KEY_SECRET: "secret",
          ALIYUN_SMS_SIGN_NAME: "sign",
          ALIYUN_SMS_TEMPLATE_CODE: "SMS_123"
        })
      )
    );

    await expect(
      aliyunSender.sendCode({
        phone: "13800138000",
        code: "123456"
      })
    ).rejects.toThrow(/not implemented/i);
  });

  it("throws on invalid sms provider", () => {
    expect(() =>
      resolveSmsProviderConfig(
        createEnv({
          SMS_PROVIDER: "invalid-provider"
        })
      )
    ).toThrowError(/SMS_PROVIDER/i);
  });
});
