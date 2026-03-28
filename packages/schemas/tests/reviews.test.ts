import { describe, expect, it } from "vitest";
import {
  adminReviewsResponseSchema,
  createReviewCommentInputSchema,
  modelReviewsResponseSchema,
  reviewCommentsResponseSchema,
  submitModelReviewInputSchema,
  updateReviewStatusInputSchema
} from "../src/reviews";

describe("reviews contract", () => {
  it("parses review submit payload", () => {
    const payload = submitModelReviewInputSchema.parse({
      content: "Stable handling and predictable landing profile."
    });

    expect(payload.content).toContain("Stable");
  });

  it("parses detail review response", () => {
    const payload = modelReviewsResponseSchema.parse({
      items: [
        {
          id: "review_1",
          content: "Solid setup for short field tests.",
          status: "visible",
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "Pilot 001",
            avatarUrl: null,
            role: "user"
          }
        }
      ],
      summary: {
        totalReviews: 1,
        myReview: null
      }
    });

    expect(payload.summary.totalReviews).toBe(1);
  });

  it("parses admin review list and status update", () => {
    const payload = adminReviewsResponseSchema.parse({
      items: [
        {
          id: "review_1",
          content: "Needs a little more tuning.",
          status: "hidden",
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "Pilot 001",
            avatarUrl: null,
            role: "user"
          },
          model: {
            id: "model_1",
            slug: "mini-4-pro",
            name: "DJI Mini 4 Pro"
          }
        }
      ]
    });

    const status = updateReviewStatusInputSchema.parse({
      status: "visible"
    });

    expect(payload.items[0]?.model.slug).toBe("mini-4-pro");
    expect(status.status).toBe("visible");
  });

  it("parses review comment create/list payloads", () => {
    const input = createReviewCommentInputSchema.parse({
      content: "Thanks for the detail",
      parentCommentId: "comment_1"
    });

    const list = reviewCommentsResponseSchema.parse({
      items: [
        {
          id: "comment_1",
          reviewId: "review_1",
          parentCommentId: null,
          replyToCommentId: null,
          content: "Good review",
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "Pilot",
            avatarUrl: null,
            role: "user"
          },
          replyToUser: null,
          replyCount: 0,
          replies: []
        }
      ]
    });

    expect(input.parentCommentId).toBe("comment_1");
    expect(list.items[0]?.reviewId).toBe("review_1");
  });
});
