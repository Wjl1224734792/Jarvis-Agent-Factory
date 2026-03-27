import { describe, expect, it } from "vitest";
import {
  adminPostStatusUpdateInputSchema,
  createPostCommentInputSchema,
  createPostInputSchema,
  feedTabSchema,
  postCommentStatusSchema,
  postStatusSchema,
  reportPostInputSchema,
  uploadPostImageResponseSchema
} from "../src/posts";

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
      imageIds: ["image_1", "image_2"]
    });

    expect(payload.title).toBe("Crosswind notes");
    expect(payload.content).toContain("gusty");
    expect(payload.imageIds).toEqual(["image_1", "image_2"]);
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
      reason: "Looks like spam promotion."
    });

    expect(update.status).toBe("published");
    expect(report.reason).toContain("spam");
  });

  it("parses uploaded image metadata", () => {
    const payload = uploadPostImageResponseSchema.parse({
      item: {
        id: "image_1",
        url: "data:image/png;base64,Zm9v",
        fileName: "cover.png",
        mimeType: "image/png",
        byteSize: 128
      }
    });

    expect(payload.item.fileName).toBe("cover.png");
    expect(payload.item.mimeType).toBe("image/png");
  });
});
