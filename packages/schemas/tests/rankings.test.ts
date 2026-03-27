import { describe, expect, it } from "vitest";
import {
  rankingItemDetailResponseSchema,
  submitRankingItemReviewResponseSchema
} from "../src/rankings";

function buildDetailPayload() {
  return {
    item: {
      id: "ranking_item_1",
      rankingId: "ranking_1",
      rank: 1,
      title: "DJI Mini 4 Pro",
      summary: "A compact model.",
      imageUrl: null,
      brandName: "DJI",
      linkedModel: null,
      averageScore: 8.4,
      totalRatings: 3,
      commentCount: 1,
      myRating: 4,
      ranking: {
        id: "ranking_1",
        title: "Value Ranking"
      },
      comments: [
        {
          id: "comment_1",
          rankingItemId: "ranking_item_1",
          content: "Solid daily flight performance.",
          rating: 4,
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "Pilot One",
            role: "user"
          }
        }
      ],
      myReview: null,
      ratingBreakdown: [
        { score: 5, count: 1 },
        { score: 4, count: 1 },
        { score: 3, count: 1 },
        { score: 2, count: 0 },
        { score: 1, count: 0 }
      ]
    }
  };
}

describe("rankings contract", () => {
  it("parses ranking item detail response with ordered fixed ratingBreakdown", () => {
    const payload = rankingItemDetailResponseSchema.parse(buildDetailPayload());

    expect(payload.item.ratingBreakdown).toHaveLength(5);
    expect(payload.item.ratingBreakdown.map((entry) => entry.score)).toEqual([5, 4, 3, 2, 1]);
  });

  it("parses submit ranking item review response with ratingBreakdown", () => {
    const payload = submitRankingItemReviewResponseSchema.parse(buildDetailPayload());

    expect(payload.item.ratingBreakdown[0]?.score).toBe(5);
  });

  it("rejects ratingBreakdown when score order is not 5-to-1", () => {
    const invalidPayload = buildDetailPayload();
    invalidPayload.item.ratingBreakdown = [
      { score: 4, count: 1 },
      { score: 5, count: 1 },
      { score: 3, count: 1 },
      { score: 2, count: 0 },
      { score: 1, count: 0 }
    ];

    expect(() => rankingItemDetailResponseSchema.parse(invalidPayload)).toThrow();
  });
});
