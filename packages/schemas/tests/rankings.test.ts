import { describe, expect, it } from "vitest";
import {
  adminRankingsResponseSchema,
  createRatingTargetCommentInputSchema,
  createRankingInputSchema,
  ratingTargetDetailResponseSchema,
  rankingsResponseSchema,
  submitRatingTargetReviewResponseSchema
} from "../src/rankings";
import { siteSettingsResponseSchema } from "../src/site-settings";

function buildDetailPayload() {
  return {
    item: {
      id: "rating_target_1",
      rankingId: "ranking_1",
      rank: 1,
      title: "DJI Mini 4 Pro",
      summary: "A compact model.",
      imageFileId: null,
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
          ratingTargetId: "rating_target_1",
          content: "Solid daily flight performance.",
          rating: 4,
          createdAt: "2026-03-23T12:00:00.000Z",
          updatedAt: "2026-03-23T12:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "Pilot One",
            avatarUrl: null,
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
  it("parses rankings response when official is a persisted ranking list", () => {
    const payload = rankingsResponseSchema.parse({
      official: [
        {
          id: "ranking_official_1",
          type: "official",
          status: "published",
          title: "Official Endurance",
          coverImageFileId: null,
          coverImageUrl: null,
          itemAddPolicy: "owner",
          averageScore: 8.8,
          commentCount: 0,
          itemCount: 1,
          createdAt: "2026-03-27T00:00:00.000Z",
          author: {
            id: "admin_1",
            displayName: "Admin",
            avatarUrl: null,
            role: "admin"
          },
          viewer: {
            canEdit: false,
            canAddItems: false
          },
          items: [
            {
              id: "rating_target_1",
              rankingId: "ranking_official_1",
              rank: 1,
              title: "DJI Mini 4 Pro",
              summary: null,
              imageFileId: null,
              imageUrl: null,
              brandName: "DJI",
              linkedModel: null,
              averageScore: 8.8,
              totalRatings: 10,
              commentCount: 0,
              myRating: null
            }
          ]
        }
      ],
      community: []
    });

    expect(payload.official).toHaveLength(1);
    expect(payload.official[0]?.type).toBe("official");
    expect(payload.official[0]?.status).toBe("published");
  });

  it("requires ranking type for create input", () => {
    const payload = createRankingInputSchema.parse({
      type: "community",
      title: "My ranking",
      coverImageFileId: null,
      itemAddPolicy: "public",
      items: [
        {
          title: "item 1",
          summary: null,
          imageFileId: null,
          brandName: null,
          linkedModelSlug: null
        }
      ]
    });

    expect(payload.type).toBe("community");
    expect(() =>
      createRankingInputSchema.parse({
        title: "missing type",
        coverImageFileId: null,
        itemAddPolicy: "public",
        items: [
          {
            title: "item 1",
            summary: null,
            imageFileId: null,
            brandName: null,
            linkedModelSlug: null
          }
        ]
      })
    ).toThrow();
  });

  it("parses rating target detail response with ordered fixed ratingBreakdown", () => {
    const payload = ratingTargetDetailResponseSchema.parse(buildDetailPayload());

    expect(payload.item.ratingBreakdown).toHaveLength(5);
    expect(payload.item.ratingBreakdown.map((entry) => entry.score)).toEqual([5, 4, 3, 2, 1]);
  });

  it("parses submit rating target review response with ratingBreakdown", () => {
    const payload = submitRatingTargetReviewResponseSchema.parse(buildDetailPayload());

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

    expect(() => ratingTargetDetailResponseSchema.parse(invalidPayload)).toThrow();
  });

  it("parses admin rankings response and ranking moderation site settings", () => {
    const adminPayload = adminRankingsResponseSchema.parse({
      items: [
        {
          id: "ranking_community_1",
          type: "community",
          status: "pending",
          title: "Harbor picks",
          coverImageFileId: null,
          coverImageUrl: null,
          itemAddPolicy: "public",
          averageScore: 0,
          commentCount: 0,
          itemCount: 0,
          createdAt: "2026-03-29T00:00:00.000Z",
          author: {
            id: "user_1",
            displayName: "Pilot",
            avatarUrl: null,
            role: "user"
          },
          viewer: {
            canEdit: false,
            canAddItems: false
          },
          items: []
        }
      ]
    });

    const siteSettings = siteSettingsResponseSchema.parse({
      item: {
        postModerationEnabled: true,
        commentModerationEnabled: false,
        reviewModerationEnabled: false,
        submissionModerationEnabled: true,
        rankingModerationEnabled: true
      }
    });

    expect(adminPayload.items[0]?.status).toBe("pending");
    expect(siteSettings.item.rankingModerationEnabled).toBe(true);
  });

  it("requires rating for top-level rating target comments and forbids rating on replies", () => {
    const topLevel = createRatingTargetCommentInputSchema.parse({
      content: "Top-level rating comment",
      rating: 5
    });

    expect(topLevel.rating).toBe(5);

    expect(() =>
      createRatingTargetCommentInputSchema.parse({
        content: "Missing rating"
      })
    ).toThrow();

    const reply = createRatingTargetCommentInputSchema.parse({
      content: "Reply only",
      parentCommentId: "comment_1"
    });
    expect(reply.parentCommentId).toBe("comment_1");

    expect(() =>
      createRatingTargetCommentInputSchema.parse({
        content: "Reply with rating should fail",
        parentCommentId: "comment_1",
        rating: 4
      })
    ).toThrow();
  });
});
