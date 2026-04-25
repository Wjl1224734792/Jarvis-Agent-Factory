import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAws = vi.hoisted(() => ({
  sendMock: vi.fn(async () => ({})),
  getSignedUrlMock: vi.fn(async () => "https://signed.example.com/upload")
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = mockAws.sendMock;
  },
  PutObjectCommand: class {
    constructor(public readonly input: unknown) {}
  },
  HeadObjectCommand: class {
    constructor(public readonly input: unknown) {}
  },
  GetObjectCommand: class {
    constructor(public readonly input: unknown) {}
  },
  HeadBucketCommand: class {
    constructor(public readonly input: unknown) {}
  },
  CreateBucketCommand: class {
    constructor(public readonly input: unknown) {}
  }
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockAws.getSignedUrlMock
}));
import {
  createStorageProvider,
  isStorageProviderExplicitlyConfigured,
  resolveStorageProviderConfig,
  shouldUseSignedReadUrl,
  type StorageProvider
} from "../src/modules/posts/storage-provider";
import {
  createSmsSender,
  isSmsRateLimitedError,
  resolveSmsProviderConfig,
  SmsError,
  type SmsProvider
} from "../src/modules/auth/sms-provider";

function createEnv(input: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...input
  };
}

describe("provider config", () => {
  beforeEach(() => {
    mockAws.sendMock.mockReset().mockResolvedValue({});
    mockAws.getSignedUrlMock.mockReset().mockResolvedValue("https://signed.example.com/upload");
  });

  it("parses s3-compatible storage providers from env", () => {
    const providers: StorageProvider[] = ["minio", "cos", "oss", "kodo"];

    for (const provider of providers) {
      const config = resolveStorageProviderConfig(
        createEnv({
          NODE_ENV: "development",
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

  it("accepts qiniu as an alias for kodo", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "development",
        STORAGE_PROVIDER: "qiniu",
        STORAGE_BUCKET: "feijia-media",
        STORAGE_ENDPOINT: "https://s3-cn-east-1.qiniucs.com",
        STORAGE_REGION: "cn-east-1",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret"
      })
    );

    expect(config.provider).toBe("kodo");
    expect(config.publicBaseUrl).toContain("feijia-media");
  });

  it("falls back to signed reads for kodo when public base url is not explicitly configured", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "development",
        STORAGE_PROVIDER: "kodo",
        STORAGE_BUCKET: "feijia-media",
        STORAGE_ENDPOINT: "https://s3-cn-east-1.qiniucs.com",
        STORAGE_REGION: "cn-east-1",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret"
      })
    );

    expect(shouldUseSignedReadUrl(config, createEnv({ NODE_ENV: "production" }))).toBe(true);
  });

  it("uses signed reads for kodo even when an explicit public base url is configured", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "development",
        STORAGE_PROVIDER: "qiniu",
        STORAGE_BUCKET: "feijia-media",
        STORAGE_ENDPOINT: "https://s3-cn-east-1.qiniucs.com",
        STORAGE_REGION: "cn-east-1",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret",
        STORAGE_PUBLIC_BASE_URL: "https://cdn.example-kodo.com"
      })
    );

    expect(shouldUseSignedReadUrl(config, createEnv({ NODE_ENV: "production" }))).toBe(true);
  });

  it("can opt out of signed kodo reads when the download domain is public", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "development",
        STORAGE_PROVIDER: "kodo",
        STORAGE_BUCKET: "feijia-media",
        STORAGE_ENDPOINT: "https://s3-cn-east-1.qiniucs.com",
        STORAGE_REGION: "cn-east-1",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret",
        STORAGE_PUBLIC_BASE_URL: "https://cdn.example-kodo.com"
      })
    );

    expect(
      shouldUseSignedReadUrl(
        config,
        createEnv({
          NODE_ENV: "production",
          STORAGE_PRESIGN_READ_URLS: "false"
        })
      )
    ).toBe(false);
  });

  it("throws on invalid storage provider", () => {
    expect(() =>
      resolveStorageProviderConfig(
        createEnv({
          NODE_ENV: "development",
          STORAGE_PROVIDER: "invalid-provider"
        })
      )
    ).toThrowError(/STORAGE_PROVIDER/i);
  });

  it("uses TEST_STORAGE_* env vars in test environment when available", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "test",
        STORAGE_PROVIDER: "qiniu",
        STORAGE_ENDPOINT: "https://prod-storage.example.com",
        STORAGE_BUCKET: "prod-media",
        STORAGE_ACCESS_KEY_ID: "prod-id",
        STORAGE_SECRET_ACCESS_KEY: "prod-secret",
        STORAGE_REGION: "us-east-2",
        TEST_STORAGE_ENDPOINT: "http://test-minio:9000",
        TEST_STORAGE_BUCKET: "test-media",
        TEST_STORAGE_ACCESS_KEY_ID: "test-id",
        TEST_STORAGE_SECRET_ACCESS_KEY: "test-secret",
        TEST_STORAGE_REGION: "ap-east-1"
      })
    );

    expect(config.provider).toBe("minio");
    expect(config.endpoint).toBe("http://test-minio:9000");
    expect(config.bucket).toBe("test-media");
    expect(config.accessKeyId).toBe("test-id");
    expect(config.secretAccessKey).toBe("test-secret");
    expect(config.region).toBe("ap-east-1");
  });

  it("falls back to TEST_* storage defaults in test mode", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "test",
        STORAGE_ENDPOINT: "https://prod-storage.example.com",
        STORAGE_BUCKET: "prod-media",
        STORAGE_ACCESS_KEY_ID: "prod-id",
        STORAGE_SECRET_ACCESS_KEY: "prod-secret"
      })
    );

    expect(config.provider).toBe("minio");
    expect(config.endpoint).toBe("http://localhost:9000");
    expect(config.bucket).toBe("feijia-media");
    expect(config.accessKeyId).toBe("minioadmin");
    expect(config.secretAccessKey).toBe("minioadmin123");
    expect(config.region).toBe("us-east-1");
  });

  it("builds bucket-aware public urls for virtual-host style storage", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "development",
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

  it("supports explicit public base urls for oss/cos/kodo style cdn domains", () => {
    const providers: Array<{ provider: StorageProvider | "qiniu"; endpoint: string; publicBaseUrl: string }> = [
      {
        provider: "oss",
        endpoint: "https://oss-cn-hangzhou.aliyuncs.com",
        publicBaseUrl: "https://cdn.example-oss.com"
      },
      {
        provider: "cos",
        endpoint: "https://cos.ap-shanghai.myqcloud.com",
        publicBaseUrl: "https://cdn.example-cos.com"
      },
      {
        provider: "qiniu",
        endpoint: "https://s3-cn-east-1.qiniucs.com",
        publicBaseUrl: "https://cdn.example-kodo.com"
      }
    ];

    for (const item of providers) {
      const config = resolveStorageProviderConfig(
        createEnv({
          NODE_ENV: "development",
          STORAGE_PROVIDER: item.provider,
          STORAGE_BUCKET: "feijia-media",
          STORAGE_ENDPOINT: item.endpoint,
          STORAGE_REGION: "auto",
          STORAGE_ACCESS_KEY_ID: "id",
          STORAGE_SECRET_ACCESS_KEY: "secret",
          STORAGE_PUBLIC_BASE_URL: item.publicBaseUrl
        })
      );

      expect(config.publicBaseUrl).toBe(item.publicBaseUrl);
    }
  });

  it("creates a minio storage provider with presigned upload support", async () => {
    const provider = createStorageProvider(
      resolveStorageProviderConfig(
        createEnv({
          NODE_ENV: "development",
          STORAGE_PROVIDER: "minio",
          STORAGE_BUCKET: "feijia-media",
          STORAGE_ENDPOINT: "http://localhost:9000",
          STORAGE_REGION: "us-east-1",
          STORAGE_ACCESS_KEY_ID: "id",
          STORAGE_SECRET_ACCESS_KEY: "secret",
          STORAGE_FORCE_PATH_STYLE: "true"
        })
      )
    );

    const descriptor = await provider.initUpload({
      objectKey: "post-image/user_1/2026/03/29/file_1.png",
      contentType: "image/png",
      size: 128,
      visibility: "public"
    });

    expect(descriptor.mode).toBe("presigned-put");
    expect(descriptor.expiresIn).toBeGreaterThan(0);
    expect(mockAws.getSignedUrlMock).toHaveBeenCalled();
  });

  it("creates a kodo storage provider with qiniu form upload support", async () => {
    const provider = createStorageProvider(
      resolveStorageProviderConfig(
        createEnv({
          NODE_ENV: "development",
          STORAGE_PROVIDER: "kodo",
          STORAGE_BUCKET: "feijia-media",
          STORAGE_ENDPOINT: "https://up-z0.qiniup.com",
          STORAGE_REGION: "cn-east-1",
          STORAGE_ACCESS_KEY_ID: "id",
          STORAGE_SECRET_ACCESS_KEY: "secret",
          STORAGE_PUBLIC_BASE_URL: "https://cdn.example-kodo.com"
        })
      )
    );

    const descriptor = await provider.initUpload({
      objectKey: "post-image/user_1/2026/04/21/file_1.png",
      contentType: "image/png",
      size: 256,
      visibility: "public"
    });

    expect(descriptor.mode).toBe("qiniu-form");
    if (descriptor.mode !== "qiniu-form") {
      return;
    }

    expect(descriptor.uploadUrl).toBe("https://up-z0.qiniup.com");
    expect(descriptor.fields.key).toBe("post-image/user_1/2026/04/21/file_1.png");
    expect(descriptor.fields.token).toBeTruthy();
  });

  it("presigns localhost read urls outside production and can keep direct urls in production", () => {
    const config = resolveStorageProviderConfig(
      createEnv({
        NODE_ENV: "development",
        STORAGE_PROVIDER: "minio",
        STORAGE_BUCKET: "feijia-media",
        STORAGE_ENDPOINT: "http://localhost:9000",
        STORAGE_REGION: "us-east-1",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret",
        STORAGE_FORCE_PATH_STYLE: "true"
      })
    );

    expect(shouldUseSignedReadUrl(config, createEnv({ NODE_ENV: "development" }))).toBe(true);
    expect(shouldUseSignedReadUrl(config, createEnv({ NODE_ENV: "production" }))).toBe(false);
    expect(
      shouldUseSignedReadUrl(
        config,
        createEnv({
          NODE_ENV: "production",
          STORAGE_PRESIGN_READ_URLS: "true"
        })
      )
    ).toBe(true);
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

  it("fails fast for non-mock sms providers in test environment", async () => {
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

  it("recognizes sms provider throttling errors", () => {
    expect(
      isSmsRateLimitedError(new SmsError("rate limited", "aliyun", "Throttling.User"))
    ).toBe(true);
    expect(
      isSmsRateLimitedError(
        new SmsError("rate limited", "tencent", "FailedOperation.SendFrequencyLimit")
      )
    ).toBe(true);
    expect(isSmsRateLimitedError(new Error("SMS_RATE_LIMITED"))).toBe(true);
    expect(
      isSmsRateLimitedError(new SmsError("template error", "aliyun", "isv.INVALID_PARAMETERS"))
    ).toBe(false);
  });
});
