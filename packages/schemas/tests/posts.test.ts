import { describe, expect, it } from "vitest";
import {
  adminPostStatusUpdateInputSchema,
  createPostCommentInputSchema,
  createPostInputSchema,
  feedTabSchema,
  postCommentStatusSchema,
  postStatusSchema,
  reportPostInputSchema
} from "../src/posts";

describe("posts contract", () => {
  it("accepts the supported home feed tabs", () => {
    expect(feedTabSchema.parse("recommended")).toBe("recommended");
    expect(feedTabSchema.parse("latest")).toBe("latest");
    expect(feedTabSchema.safeParse("following").success).toBe(false);
  });

  it("parses the create post payload", () => {
    const payload = createPostInputSchema.parse({
      title: "御风笔记",
      content: "今天第一次飞这台机型，抗风表现比预期稳很多。"
    });

    expect(payload.title).toBe("御风笔记");
    expect(payload.content).toContain("抗风");
  });

  it("parses comment and reply payloads", () => {
    const topLevel = createPostCommentInputSchema.parse({
      content: "这条经验很有帮助。"
    });
    const reply = createPostCommentInputSchema.parse({
      content: "我也有同感。",
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
      reason: "广告引流内容"
    });

    expect(update.status).toBe("published");
    expect(report.reason).toContain("广告");
  });
});
