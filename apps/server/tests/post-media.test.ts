import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePublicUploadedFileUrlMap: vi.fn(),
  resolveUploadedFileUrlMap: vi.fn()
}));

vi.mock("../src/modules/uploads/uploads.helpers", () => ({
  resolvePublicUploadedFileUrlMap: mocks.resolvePublicUploadedFileUrlMap,
  resolveUploadedFileUrlMap: mocks.resolveUploadedFileUrlMap
}));

vi.mock("../src/modules/uploads/upload.repo", () => ({
  uploadsRepo: {
    listFilesByIds: vi.fn(async () => [])
  }
}));

vi.mock("../src/modules/uploads/upload.service", () => ({
  uploadsService: {
    serializeFileItem: vi.fn((file: {
      id: string;
      mediaKind: "image" | "video";
      fileName: string;
      mimeType: string;
      byteSize: number;
    }) => ({
      id: file.id,
      bizType: file.mediaKind === "image" ? "post-image" : "post-video",
      mediaKind: file.mediaKind,
      status: "uploaded",
      visibility: "public",
      fileName: file.fileName,
      mimeType: file.mimeType,
      byteSize: file.byteSize,
      url: `https://storage.example.com/${file.id}`,
      uploadedAt: "2026-04-25T00:00:00.000Z"
    }))
  }
}));

function createImageRecord(id: string, postId = "post_1") {
  return {
    id,
    ownerId: "owner_1",
    postId,
    bizType: "post-image",
    mediaKind: "image" as const,
    provider: "kodo",
    bucket: "feijia-media",
    region: "z2",
    objectKey: `post-image/owner_1/${id}.png`,
    fileName: "image.png",
    mimeType: "image/png",
    byteSize: 128,
    etag: null,
    status: "uploaded",
    currentAuditRecordId: null,
    currentAuditStatus: "failed",
    currentAuditUpdatedAt: null,
    visibility: "public",
    createdAt: new Date("2026-04-25T00:00:00.000Z"),
    uploadedAt: new Date("2026-04-25T00:00:00.000Z"),
    deletedAt: null
  };
}

function createVideoRecord(id: string, postId = "post_1") {
  return {
    id,
    ownerId: "owner_1",
    postId,
    bizType: "post-video",
    mediaKind: "video" as const,
    provider: "kodo",
    bucket: "feijia-media",
    region: "z2",
    objectKey: `post-video/owner_1/${id}.mp4`,
    fileName: "video.mp4",
    mimeType: "video/mp4",
    byteSize: 256,
    etag: null,
    status: "uploaded",
    currentAuditRecordId: null,
    currentAuditStatus: "failed",
    currentAuditUpdatedAt: null,
    visibility: "public",
    createdAt: new Date("2026-04-25T00:00:00.000Z"),
    uploadedAt: new Date("2026-04-25T00:00:00.000Z"),
    deletedAt: null
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("post media serialization", () => {
  it("omits public images when the public resolver blocks access", async () => {
    mocks.resolvePublicUploadedFileUrlMap.mockResolvedValue(new Map([["file_blocked", null]]));

    const { buildImagesByPostId } = await import("../src/modules/posts/post-media");
    const imagesByPostId = await buildImagesByPostId([createImageRecord("file_blocked")]);

    expect(imagesByPostId.get("post_1")).toBeUndefined();
  });

  it("omits public videos when the public resolver blocks access", async () => {
    mocks.resolvePublicUploadedFileUrlMap.mockResolvedValue(new Map([["file_blocked_video", null]]));

    const { buildVideosByPostId } = await import("../src/modules/posts/post-media");
    const videosByPostId = await buildVideosByPostId([createVideoRecord("file_blocked_video")]);

    expect(videosByPostId.get("post_1")).toBeUndefined();
  });

  it("uses internal resolved urls for author and admin audiences", async () => {
    mocks.resolveUploadedFileUrlMap.mockResolvedValue(
      new Map([["file_internal", "https://signed.example.com/file_internal"]])
    );

    const { buildImagesByPostId } = await import("../src/modules/posts/post-media");
    const imagesByPostId = await buildImagesByPostId(
      [createImageRecord("file_internal")],
      "internal"
    );

    expect(imagesByPostId.get("post_1")?.[0]?.url).toBe(
      "https://signed.example.com/file_internal"
    );
  });
});
