import { afterEach, describe, expect, it, vi } from "vitest";

const uploadsRepoMock = {
  listFilesByIds: vi.fn()
};

vi.mock("../src/modules/uploads/upload.repo", () => ({
  uploadsRepo: uploadsRepoMock
}));

vi.mock("../src/lib/request-metrics", () => ({
  getCachedFileUrl: vi.fn(() => ({ hit: false, value: null })),
  setCachedFileUrl: vi.fn()
}));

vi.mock("../src/lib/storage-provider", () => ({
  buildStorageObjectUrl: vi.fn((config: { publicBaseUrl: string }, objectKey: string) => {
    return `${config.publicBaseUrl}/${objectKey}`;
  }),
  createStorageProvider: vi.fn(),
  resolveStorageProviderConfig: vi.fn(() => ({
    provider: "kodo",
    endpoint: "https://up-z2.qiniup.com",
    bucket: "feijia-media",
    region: "cn-east-1",
    accessKeyId: "ak",
    secretAccessKey: "sk",
    keyPrefix: "",
    forcePathStyle: false,
    publicBaseUrl: "https://cdn.example.com",
    publicBaseUrlIsExplicit: true,
    autoCreateBucket: false
  })),
  shouldUseSignedReadUrl: vi.fn(() => false)
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("uploads helpers", () => {
  it("hides kodo media without a passed audit from public urls", async () => {
    uploadsRepoMock.listFilesByIds.mockResolvedValue([
      {
        id: "file_kodo_pending",
        provider: "kodo",
        mediaKind: "image",
        status: "uploaded",
        currentAuditStatus: "running",
        objectKey: "post-image/file.png"
      }
    ]);

    const { resolvePublicUploadedFileUrlMap } = await import("../src/modules/uploads/uploads.helpers");
    const result = await resolvePublicUploadedFileUrlMap(["file_kodo_pending"]);

    expect(result.get("file_kodo_pending")).toBeNull();
  });

  it.each(["passed", "manual_passed"] as const)(
    "returns public urls for kodo media after a %s audit",
    async (currentAuditStatus) => {
    uploadsRepoMock.listFilesByIds.mockResolvedValue([
      {
        id: "file_kodo_passed",
        provider: "kodo",
        mediaKind: "image",
        status: "uploaded",
        currentAuditStatus,
        objectKey: "post-image/file.png"
      }
    ]);

      const { resolvePublicUploadedFileUrlMap } = await import("../src/modules/uploads/uploads.helpers");
      const result = await resolvePublicUploadedFileUrlMap(["file_kodo_passed"]);

      expect(result.get("file_kodo_passed")).toBe("https://cdn.example.com/post-image/file.png");
    }
  );

  it("keeps minio media publicly accessible without audit records", async () => {
    uploadsRepoMock.listFilesByIds.mockResolvedValue([
      {
        id: "file_minio_uploaded",
        provider: "minio",
        mediaKind: "image",
        status: "uploaded",
        currentAuditStatus: null,
        objectKey: "post-image/file.png"
      }
    ]);

    const { resolvePublicUploadedFileUrlMap } = await import("../src/modules/uploads/uploads.helpers");
    const result = await resolvePublicUploadedFileUrlMap(["file_minio_uploaded"]);

    expect(result.get("file_minio_uploaded")).toBe("https://cdn.example.com/post-image/file.png");
  });
});
