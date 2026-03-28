import { describe, expect, it } from "vitest";
import {
  adminReviewsResponseSchema,
  createReviewCommentInputSchema,
  reviewCommentsResponseSchema,
  modelReviewsResponseSchema,
  submitModelReviewInputSchema,
  updateReviewStatusInputSchema
} from "../src/reviews";

describe("reviews contract", () => {
  it("parses review submit payload", () => {
    const payload = submitModelReviewInputSchema.parse({
      rating: 5,
      content: "续航稳定，操控顺手。"
    });

    expect(payload.rating).toBe(5);
  });

  it("parses detail review response", () => {
    const payload = modelReviewsResponseSchema.parse({
      items: [
        {
          id: "review_1",
          rating: 4,
          content: "整体不错。",
          status: "visible",
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "飞友001",
            role: "user"
          }
        }
      ],
      summary: {
        averageScore: 8,
        totalReviews: 1,
        myReview: null
      }
    });

    expect(payload.summary.averageScore).toBe(8);
  });

  it("parses admin review list and status update", () => {
    const payload = adminReviewsResponseSchema.parse({
      items: [
        {
          id: "review_1",
          rating: 4,
          content: "整体不错。",
          status: "hidden",
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "飞友001",
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
