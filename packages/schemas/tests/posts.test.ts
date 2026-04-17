import { describe, expect, it } from "vitest";
import {
  adminPostStatusUpdateInputSchema,
  createPostCommentInputSchema,
  createPostInputSchema,
  feedTabSchema,
  postCommentStatusSchema,
  postStatusSchema,
  reportPostInputSchema,
  uploadPostImageResponseSchema,
  uploadPostVideoResponseSchema
} from "../src/posts";
import {
  completeUploadInputSchema,
  fileItemSchema,
  initUploadInputSchema,
  initUploadResponseSchema,
  uploadInitErrorResponseSchema
} from "../src/files";

describe("posts contract", () => {
  it("accepts the supported home feed tabs", () => {
    expect(feedTabSchema.parse("recommended")).toBe("recommended");
    expect(feedTabSchema.parse("latest")).toBe("latest");
    expect(feedTabSchema.parse("following")).toBe("following");
  });

  it("parses the create post payload with uploaded images", () => {
    const payload = createPostInputSchema.parse({
      type: "article",
      title: "Crosswind notes",
      content: "This airframe held trim better than expected in gusty conditions.",
      imageIds: ["file_1", "file_2"],
      videoIds: ["file_3"]
    });

    expect(payload.title).toBe("Crosswind notes");
    expect(payload.content).toContain("gusty");
    expect(payload.imageIds).toEqual(["file_1", "file_2"]);
    expect(payload.videoIds).toEqual(["file_3"]);
  });

  it("allows moment posts with empty content and rejects empty content for articles", () => {
    const momentWithoutContent = createPostInputSchema.parse({
      type: "moment",
      title: "无正文也可发布",
      imageIds: [],
      videoIds: []
    });
    expect(momentWithoutContent.content).toBe("");

    const momentOnlyTitle = createPostInputSchema.parse({
      type: "moment",
      title: "仅标题",
      content: "",
      imageIds: [],
      videoIds: []
    });
    expect(momentOnlyTitle.content).toBe("");

    const momentWithMedia = createPostInputSchema.parse({
      type: "moment",
      title: "图说",
      content: "   ",
      imageIds: ["file_1"],
      videoIds: []
    });
    expect(momentWithMedia.content).toBe("");

    expect(() =>
      createPostInputSchema.parse({
        type: "article",
        title: "空正文文章",
        content: "",
        imageIds: [],
        videoIds: []
      })
    ).toThrow();

    expect(() =>
      createPostInputSchema.parse({
        type: "article",
        title: "空白正文文章",
        content: "   ",
        imageIds: [],
        videoIds: []
      })
    ).toThrow();

    expect(() =>
      createPostInputSchema.parse({
        type: "article",
        title: "缺失正文文章",
        imageIds: [],
        videoIds: []
      })
    ).toThrow();
  });

  it("rejects moment payloads that mix images and videos or contain multiple videos", () => {
    expect(() =>
      createPostInputSchema.parse({
        type: "moment",
        title: "Harbor night",
        content: "Night shooting log.",
        imageIds: ["file_1"],
        videoIds: ["file_2"]
      })
    ).toThrow();

    expect(() =>
      createPostInputSchema.parse({
        type: "moment",
        title: "Harbor night",
        content: "Night shooting log.",
        imageIds: [],
        videoIds: ["file_1", "file_2"]
      })
    ).toThrow();
  });

  it("parses comment payloads for nested replies", () => {
    const topLevel = createPostCommentInputSchema.parse({
      content: "Helpful field notes."
    });
    const reply = createPostCommentInputSchema.parse({
      content: "Replying deeper in the thread.",
      parentCommentId: "comment_1"
    });

    expect(topLevel.parentCommentId).toBeUndefined();
    expect(reply.parentCommentId).toBe("comment_1");
  });

  it("restricts post and comment status enums", () => {
    expect(postStatusSchema.parse("pending")).toBe("pending");
    expect(postCommentStatusSchema.parse("visible")).toBe("visible");
    expect(postStatusSchema.safeParse("draft").success).toBe(false);
  });

  it("parses admin status updates and report payloads", () => {
    const update = adminPostStatusUpdateInputSchema.parse({
      status: "published"
    });
    const report = reportPostInputSchema.parse({
      reason: "Looks like spam promotion.",
      imageIds: ["file_report_1"]
    });

    expect(update.status).toBe("published");
    expect(report.reason).toContain("spam");
    expect(report.imageIds).toEqual(["file_report_1"]);
    expect(() =>
      reportPostInputSchema.parse({
        reason: "Looks like spam promotion.",
        imageIds: []
      })
    ).toThrow();
  });

  it("parses uploaded image metadata", () => {
    const payload = uploadPostImageResponseSchema.parse({
      item: {
        id: "file_1",
        bizType: "post-image",
        mediaKind: "image",
        status: "uploaded",
        visibility: "public",
        url: "https://cdn.example.com/post-image/u_1/2026/03/29/file_1.png",
        fileName: "cover.png",
        mimeType: "image/png",
        byteSize: 128,
        uploadedAt: "2026-03-29T00:00:00.000Z"
      }
    });

    expect(payload.item.fileName).toBe("cover.png");
    expect(payload.item.mimeType).toBe("image/png");
  });

  it("parses uploaded video metadata", () => {
    const payload = uploadPostVideoResponseSchema.parse({
      item: {
        id: "file_2",
        bizType: "post-video",
        mediaKind: "video",
        status: "uploaded",
        visibility: "public",
        url: "https://example.com/videos/flight.mp4",
        fileName: "flight.mp4",
        mimeType: "video/mp4",
        byteSize: 1024,
        uploadedAt: "2026-03-29T00:00:00.000Z"
      }
    });

    expect(payload.item.fileName).toBe("flight.mp4");
    expect(payload.item.mimeType).toBe("video/mp4");
  });

  it("parses upload init and complete payloads", () => {
    const initInput = initUploadInputSchema.parse({
      bizType: "post-image",
      filename: "cover.png",
      contentType: "image/png",
      size: 128
    });
    const reportImageInput = initUploadInputSchema.parse({
      bizType: "report-image",
      filename: "evidence.png",
      contentType: "image/png",
      size: 256
    });
    const initResponse = initUploadResponseSchema.parse({
      fileId: "file_1",
      objectKey: "post-image/user_1/2026/03/29/file_1.png",
      upload: {
        mode: "presigned-put",
        url: "https://storage.example.com/upload",
        headers: {
          "Content-Type": "image/png"
        },
        expiresIn: 900
      }
    });
    const completeInput = completeUploadInputSchema.parse({
      fileId: "file_1"
    });

    expect(initInput.bizType).toBe("post-image");
    expect(reportImageInput.bizType).toBe("report-image");
    expect(initResponse.upload.mode).toBe("presigned-put");
    expect(completeInput.fileId).toBe("file_1");
  });

  it("parses unified file metadata", () => {
    const payload = fileItemSchema.parse({
      id: "file_1",
      bizType: "post-image",
      mediaKind: "image",
      status: "uploaded",
      visibility: "public",
      fileName: "cover.png",
      mimeType: "image/png",
      byteSize: 128,
      url: "https://cdn.example.com/post-image/u_1/2026/03/29/file_1.png",
      uploadedAt: "2026-03-29T00:00:00.000Z"
    });

    expect(payload.id).toBe("file_1");
    expect(payload.status).toBe("uploaded");
    expect(payload.mediaKind).toBe("image");
  });

  it("parses structured upload init errors", () => {
    const payload = uploadInitErrorResponseSchema.parse({
      code: "BAD_REQUEST",
      message: "Current max allowed is 2 MB.",
      details: {
        reason: "file_too_large",
        bizType: "avatar-image",
        mediaKind: "image",
        limit: {
          bytes: 2097152,
          mb: "2",
          bizType: "avatar-image",
          mediaKind: "image"
        }
      }
    });

    expect(payload.details.reason).toBe("file_too_large");
    expect(payload.details.limit?.mb).toBe("2");
  });
});
