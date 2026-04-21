import { API_ROUTES } from "@feijia/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

const storageProviderMock = {
  headObject: vi.fn(),
  initUpload: vi.fn(),
  getDownloadUrl: vi.fn()
};

const storageConfigMock = {
  provider: "kodo",
  endpoint: "https://s3-cn-east-1.qiniucs.com",
  bucket: "feijia-media",
  region: "cn-east-1",
  accessKeyId: "kodo-id",
  secretAccessKey: "kodo-secret",
  keyPrefix: "",
  forcePathStyle: false,
  publicBaseUrl: "https://cdn.example-kodo.com",
  publicBaseUrlIsExplicit: true,
  autoCreateBucket: false,
  kodoRegionId: "z2"
} as const;

const uploadsRepoMock = {
  getOwnedFileById: vi.fn(),
  markFileUploaded: vi.fn()
};

const qiniuAuditMock = {
  reviewImage: vi.fn(),
  submitVideoReview: vi.fn()
};

const siteSettingsServiceMock = {
  isAiReviewEnabledForFileBizType: vi.fn()
};

const uploadedUrlMock = vi.fn(async () => "https://cdn.example-kodo.com/resolved/file.png");

const buildStorageObjectUrlMock = vi.fn((config: { publicBaseUrl: string }, objectKey: string) =>
  `${config.publicBaseUrl}/${objectKey}`
);

vi.mock("../src/lib/storage-provider", () => ({
  createStorageProvider: vi.fn(() => storageProviderMock),
  resolveStorageProviderConfig: vi.fn(() => storageConfigMock),
  buildStorageObjectUrl: buildStorageObjectUrlMock,
  shouldUseSignedReadUrl: vi.fn()
}));

vi.mock("../src/modules/uploads/upload.repo", () => ({
  uploadsRepo: uploadsRepoMock
}));

vi.mock("../src/modules/audits/qiniu-audit.service", () => ({
  qiniuAuditService: qiniuAuditMock
}));

vi.mock("../src/modules/site-settings/site-settings.service", () => ({
  siteSettingsService: siteSettingsServiceMock
}));

vi.mock("../src/modules/uploads/uploads.helpers", () => ({
  resolveUploadedFileUrl: uploadedUrlMock
}));

function mockFileRecord(overrides: {
  id: string;
  bizType: "post-image" | "post-video" | "report-image" | "avatar-image";
  mediaKind: "image" | "video";
  mimeType: string;
  objectKey: string;
  byteSize: number;
}) {
  return {
    id: overrides.id,
    ownerId: "owner_1",
    bizType: overrides.bizType,
    mediaKind: overrides.mediaKind,
    provider: "kodo",
    bucket: "feijia-media",
    region: "cn-east-1",
    objectKey: overrides.objectKey,
    fileName: "upload.bin",
    mimeType: overrides.mimeType,
    byteSize: overrides.byteSize,
    etag: null,
    status: "pending",
    visibility: "public",
    createdAt: new Date("2026-04-21T00:00:00.000Z"),
    uploadedAt: null,
    deletedAt: null
  };
}

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.PUBLIC_SERVER_BASE_URL;
});

describe("uploads service", () => {
  it("triggers image AI audit for kodo when configured for post images", async () => {
    const file = mockFileRecord({
      id: "file_image_1",
      bizType: "post-image",
      mediaKind: "image",
      mimeType: "image/png",
      objectKey: "post-image/owner_1/2026/04/21/image.png",
      byteSize: 256
    });

    uploadsRepoMock.getOwnedFileById.mockResolvedValue(file);
    uploadsRepoMock.markFileUploaded.mockResolvedValue({
      ...file,
      status: "uploaded",
      uploadedAt: new Date("2026-04-21T00:00:00.000Z")
    });
    storageProviderMock.headObject.mockResolvedValue({
      exists: true,
      size: file.byteSize,
      contentType: file.mimeType
    });
    siteSettingsServiceMock.isAiReviewEnabledForFileBizType.mockResolvedValue(true);

    const { uploadsService } = await import("../src/modules/uploads/upload.service");
    const result = await uploadsService.completeUpload({ ownerId: "owner_1", fileId: file.id });

    expect(result.kind).toBe("ok");
    expect(qiniuAuditMock.reviewImage).toHaveBeenCalledWith({
      domain: "file",
      entityId: file.id,
      imageUrl: `https://cdn.example-kodo.com/${file.objectKey}`
    });
    expect(qiniuAuditMock.submitVideoReview).not.toHaveBeenCalled();
  });

  it("does not trigger AI audit for report images by default", async () => {
    const file = mockFileRecord({
      id: "file_report_image",
      bizType: "report-image",
      mediaKind: "image",
      mimeType: "image/png",
      objectKey: "report-image/owner_1/2026/04/21/report.png",
      byteSize: 128
    });

    uploadsRepoMock.getOwnedFileById.mockResolvedValue(file);
    uploadsRepoMock.markFileUploaded.mockResolvedValue({
      ...file,
      status: "uploaded",
      uploadedAt: new Date("2026-04-21T00:00:00.000Z")
    });
    storageProviderMock.headObject.mockResolvedValue({
      exists: true,
      size: file.byteSize,
      contentType: file.mimeType
    });
    siteSettingsServiceMock.isAiReviewEnabledForFileBizType.mockResolvedValue(false);

    const { uploadsService } = await import("../src/modules/uploads/upload.service");
    const result = await uploadsService.completeUpload({ ownerId: "owner_1", fileId: file.id });

    expect(result.kind).toBe("ok");
    expect(qiniuAuditMock.reviewImage).not.toHaveBeenCalled();
    expect(qiniuAuditMock.submitVideoReview).not.toHaveBeenCalled();
  });

  it("triggers video review submission for kodo videos when base callback url is configured", async () => {
    process.env.PUBLIC_SERVER_BASE_URL = "http://server.local";

    const file = mockFileRecord({
      id: "file_video_1",
      bizType: "post-video",
      mediaKind: "video",
      mimeType: "video/mp4",
      objectKey: "post-video/owner_1/2026/04/21/video.mp4",
      byteSize: 2048
    });

    uploadsRepoMock.getOwnedFileById.mockResolvedValue(file);
    uploadsRepoMock.markFileUploaded.mockResolvedValue({
      ...file,
      status: "uploaded",
      uploadedAt: new Date("2026-04-21T00:00:00.000Z")
    });
    storageProviderMock.headObject.mockResolvedValue({
      exists: true,
      size: file.byteSize,
      contentType: file.mimeType
    });
    siteSettingsServiceMock.isAiReviewEnabledForFileBizType.mockResolvedValue(true);

    const { uploadsService } = await import("../src/modules/uploads/upload.service");
    const result = await uploadsService.completeUpload({ ownerId: "owner_1", fileId: file.id });

    expect(result.kind).toBe("ok");
    expect(qiniuAuditMock.submitVideoReview).toHaveBeenCalledWith({
      domain: "file",
      entityId: file.id,
      videoUrl: `https://cdn.example-kodo.com/${file.objectKey}`,
      callbackUrl: `http://server.local${API_ROUTES.audits.qiniuCallback}`
    });
    expect(qiniuAuditMock.reviewImage).not.toHaveBeenCalled();
  });

  it("does not submit video review when callback base url is not configured", async () => {
    const file = mockFileRecord({
      id: "file_video_2",
      bizType: "post-video",
      mediaKind: "video",
      mimeType: "video/mp4",
      objectKey: "post-video/owner_1/2026/04/21/video.mp4",
      byteSize: 2048
    });

    uploadsRepoMock.getOwnedFileById.mockResolvedValue(file);
    uploadsRepoMock.markFileUploaded.mockResolvedValue({
      ...file,
      status: "uploaded",
      uploadedAt: new Date("2026-04-21T00:00:00.000Z")
    });
    storageProviderMock.headObject.mockResolvedValue({
      exists: true,
      size: file.byteSize,
      contentType: file.mimeType
    });
    siteSettingsServiceMock.isAiReviewEnabledForFileBizType.mockResolvedValue(true);

    const { uploadsService } = await import("../src/modules/uploads/upload.service");
    const result = await uploadsService.completeUpload({ ownerId: "owner_1", fileId: file.id });

    expect(result.kind).toBe("ok");
    expect(qiniuAuditMock.submitVideoReview).not.toHaveBeenCalled();
  });
});
