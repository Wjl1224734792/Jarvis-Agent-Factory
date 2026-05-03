import { describe, expect, it } from "vitest";
import {
  adminOfficialArticleUpdateInputSchema,
  adminPostStatusUpdateInputSchema,
  createPostCommentInputSchema,
  createPostInputSchema,
  feedTabSchema,
  homeFeedResponseSchema,
  circleFeedResponseSchema,
  postSourceSchema,
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

  it("requires nextCursor for recommended feed responses", () => {
    const pagination = {
      limit: 20,
      hasMore: true
    };

    expect(
      homeFeedResponseSchema.safeParse({
        tab: "recommended",
        activeCategorySlug: null,
        categories: [],
        items: [],
        pagination
      }).success
    ).toBe(false);

    expect(
      homeFeedResponseSchema.safeParse({
        tab: "recommended",
        activeCategorySlug: null,
        categories: [],
        items: [],
        pagination,
        nextCursor: "cursor_20"
      }).success
    ).toBe(true);

    expect(
      circleFeedResponseSchema.safeParse({
        tab: "recommended",
        items: [],
        pagination,
        nextCursor: null
      }).success
    ).toBe(true);
  });

  it("requires nextCursor for latest/following feed responses", () => {
    const pagination = {
      limit: 20,
      hasMore: false
    };

    expect(
      homeFeedResponseSchema.safeParse({
        tab: "latest",
        activeCategorySlug: null,
        categories: [],
        items: [],
        pagination,
        nextCursor: null
      }).success
    ).toBe(true);

    expect(
      circleFeedResponseSchema.safeParse({
        tab: "following",
        items: [],
        pagination,
        nextCursor: null
      }).success
    ).toBe(true);
  });

  it("parses the create post payload with uploaded images", () => {
    const payload = createPostInputSchema.parse({
      type: "article",
      title: "Crosswind notes",
      content: "This airframe held trim better than expected in gusty conditions.",
      sourceLabel: "Flight Test Weekly",
      sourceUrl: "https://example.com/reports/crosswind",
      imageIds: ["file_1", "file_2"],
      videoIds: ["file_3"]
    });

    expect(payload.title).toBe("Crosswind notes");
    expect(payload.content).toContain("gusty");
    expect(payload.sourceLabel).toBe("Flight Test Weekly");
    expect(payload.sourceUrl).toBe("https://example.com/reports/crosswind");
    expect(payload.imageIds).toEqual(["file_1", "file_2"]);
    expect(payload.videoIds).toEqual(["file_3"]);
  });

  it("normalizes post source declaration fields", () => {
    const withoutSource = createPostInputSchema.parse({
      type: "moment",
      title: "Ramp note",
      content: "",
      sourceLabel: "   ",
      sourceUrl: "https://example.com/ignored",
      imageIds: [],
      videoIds: []
    });
    const withSource = createPostInputSchema.parse({
      type: "article",
      title: "Factory bulletin",
      content: "Factory bulletin body.",
      sourceLabel: "  Manufacturer update  ",
      sourceUrl: "  https://example.com/bulletin  ",
      imageIds: [],
      videoIds: []
    });

    expect(withoutSource.sourceLabel).toBeNull();
    expect(withoutSource.sourceUrl).toBeNull();
    expect(withSource.sourceLabel).toBe("Manufacturer update");
    expect(withSource.sourceUrl).toBe("https://example.com/bulletin");
    expect(
      createPostInputSchema.safeParse({
        type: "article",
        title: "Broken source",
        content: "Body.",
        sourceLabel: "External",
        sourceUrl: "not-a-url",
        imageIds: [],
        videoIds: []
      }).success
    ).toBe(false);
    expect(
      createPostInputSchema.safeParse({
        type: "article",
        title: "Script source",
        content: "Body.",
        sourceLabel: "External",
        sourceUrl: "javascript:alert(1)",
        imageIds: [],
        videoIds: []
      }).success
    ).toBe(false);
    expect(
      postSourceSchema.safeParse({
        label: "External",
        url: "data:text/html,<script>alert(1)</script>"
      }).success
    ).toBe(false);
  });

  it("allows article payloads with more than the legacy media caps", () => {
    const payload = createPostInputSchema.parse({
      type: "article",
      title: "Long-form dispatch",
      content: "Detailed long-form article content.",
      imageIds: Array.from({ length: 7 }, (_, index) => `img_${index + 1}`),
      videoIds: Array.from({ length: 3 }, (_, index) => `vid_${index + 1}`)
    });

    expect(payload.imageIds).toHaveLength(7);
    expect(payload.videoIds).toHaveLength(3);
  });

  it("allows admin official article updates with more than the legacy media caps", () => {
    const payload = adminOfficialArticleUpdateInputSchema.parse({
      title: "Official bulletin",
      content: "Official article update content.",
      contentHtml: "<p>Official article update content.</p>",
      contentCategoryId: "cat_1",
      sourceLabel: "Official newsroom",
      sourceUrl: "https://example.com/newsroom",
      imageIds: Array.from({ length: 8 }, (_, index) => `img_${index + 1}`),
      videoIds: Array.from({ length: 4 }, (_, index) => `vid_${index + 1}`)
    });

    expect(payload.sourceLabel).toBe("Official newsroom");
    expect(payload.sourceUrl).toBe("https://example.com/newsroom");
    expect(payload.imageIds).toHaveLength(8);
    expect(payload.videoIds).toHaveLength(4);
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

    const momentWithNullContent = createPostInputSchema.parse({
      type: "moment",
      title: "空值正文动态",
      content: null,
      imageIds: [],
      videoIds: []
    });
    expect(momentWithNullContent.content).toBe("");

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

    expect(() =>
      createPostInputSchema.parse({
        type: "article",
        title: "空值正文文章",
        content: null,
        imageIds: [],
        videoIds: []
      })
    ).toThrow();
  });

  it("supports moment cover selection rules", () => {
    const imageMoment = createPostInputSchema.parse({
      type: "moment",
      title: "图文封面",
      content: "",
      imageIds: ["file_1", "file_2"],
      videoIds: [],
      coverImageId: "file_2"
    });
    expect(imageMoment.coverImageId).toBe("file_2");

    expect(() =>
      createPostInputSchema.parse({
        type: "moment",
        title: "非法封面",
        content: "",
        imageIds: ["file_1", "file_2"],
        videoIds: [],
        coverImageId: "file_9"
      })
    ).toThrow();

    const videoMoment = createPostInputSchema.parse({
      type: "moment",
      title: "视频封面",
      content: "",
      imageIds: [],
      videoIds: ["video_1"],
      coverImageId: "cover_1"
    });
    expect(videoMoment.coverImageId).toBe("cover_1");
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

    expect(() =>
      reportPostInputSchema.parse({
        reason: "Looks like spam promotion.",
        imageIds: ["file_report_1", "file_report_2", "file_report_3", "file_report_4"]
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

  it("parses kodo form upload descriptors", () => {
    const initResponse = initUploadResponseSchema.parse({
      fileId: "file_kodo_1",
      objectKey: "post-image/user_1/2026/04/21/file_1.png",
      upload: {
        mode: "qiniu-form",
        uploadUrl: "https://up-z0.qiniup.com",
        fileFieldName: "file",
        fields: {
          token: "upload-token",
          key: "uploads/post-image/user_1/2026/04/21/file_1.png"
        },
        expiresIn: 900
      }
    });

    expect(initResponse.upload.mode).toBe("qiniu-form");
    expect(initResponse.upload.fields.token).toBe("upload-token");
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
