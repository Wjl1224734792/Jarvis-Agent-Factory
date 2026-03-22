import { describe, expect, it } from "vitest";
import {
  adminReviewsResponseSchema,
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
});
