import { describe, expect, it } from "vitest";

import {
  buildSeedStorageRecord,
  resolveSeedStorageConfig,
  resolveSeedStorageObjectKey
} from "../src/seed.storage.js";

describe("seed storage helpers", () => {
  it("keeps the configured kodo target instead of forcing local MinIO", () => {
    const config = resolveSeedStorageConfig({
      STORAGE_PROVIDER: "kodo",
      STORAGE_BUCKET: "remote-media",
      STORAGE_ENDPOINT: "https://up-z2.qiniup.com",
      STORAGE_REGION: "cn-south",
      STORAGE_ACCESS_KEY_ID: "kodo-id",
      STORAGE_SECRET_ACCESS_KEY: "kodo-secret",
      STORAGE_FORCE_PATH_STYLE: "true",
      STORAGE_KEY_PREFIX: "server-a/mock",
      KODO_REGION_ID: "z2"
    });

    expect(config.provider).toBe("kodo");
    expect(config.bucket).toBe("remote-media");
    expect(config.endpoint).toBe("https://up-z2.qiniup.com");
    expect(config.forcePathStyle).toBe(false);
    expect(config.keyPrefix).toBe("server-a/mock");
    expect(config.kodoRegionId).toBe("z2");
  });

  it("uses the current provider and resolved object key for file records", () => {
    const config = resolveSeedStorageConfig({
      STORAGE_PROVIDER: "qiniu",
      STORAGE_BUCKET: "remote-media",
      STORAGE_ENDPOINT: "https://up-z0.qiniup.com",
      STORAGE_ACCESS_KEY_ID: "id",
      STORAGE_SECRET_ACCESS_KEY: "secret",
      STORAGE_KEY_PREFIX: "/seed-prefix/"
    });

    expect(resolveSeedStorageObjectKey(config, "test/posts/image.png")).toBe(
      "seed-prefix/test/posts/image.png"
    );
    expect(buildSeedStorageRecord(config, "test/posts/image.png")).toEqual({
      provider: "kodo",
      bucket: "remote-media",
      region: "us-east-1",
      objectKey: "test/posts/image.png"
    });
  });

  it("only defaults path-style addressing for minio", () => {
    expect(
      resolveSeedStorageConfig({
        STORAGE_PROVIDER: "minio",
        STORAGE_BUCKET: "media",
        STORAGE_ENDPOINT: "http://localhost:9000",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret"
      }).forcePathStyle
    ).toBe(true);

    expect(
      resolveSeedStorageConfig({
        STORAGE_PROVIDER: "oss",
        STORAGE_BUCKET: "media",
        STORAGE_ENDPOINT: "https://oss-cn-hangzhou.aliyuncs.com",
        STORAGE_ACCESS_KEY_ID: "id",
        STORAGE_SECRET_ACCESS_KEY: "secret"
      }).forcePathStyle
    ).toBe(false);
  });
});
