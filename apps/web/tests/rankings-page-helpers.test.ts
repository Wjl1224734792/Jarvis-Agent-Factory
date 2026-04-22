import { describe, expect, it } from "vitest";
import type { RankingListItem } from "@feijia/schemas";
import { buildRankingHotScore, mergeRankingsByTab } from "../src/routes/rankings-page-helpers";

function createRanking(overrides: Partial<RankingListItem>): RankingListItem {
  return {
    id: "ranking_1",
    type: "community",
    status: "published",
    rejectionReason: null,
    title: "Ranking",
    coverImageFileId: null,
    coverImageUrl: null,
    itemAddPolicy: "owner",
    averageScore: 6,
    commentCount: 0,
    reportCount: 0,
    itemCount: 3,
    createdAt: "2026-04-08T08:00:00.000Z",
    author: {
      id: "user_1",
      displayName: "Pilot",
      avatarUrl: null,
      ipLocationLabel: null,
      role: "user"
    },
    viewer: {
      canEdit: false,
      canAddItems: false
    },
    items: [
      {
        id: "item_1",
        rankingId: "ranking_1",
        authorId: "user_1",
        author: null,
        status: "published",
        rejectionReason: null,
        rank: 1,
        title: "Item",
        summary: null,
        imageFileId: null,
        imageUrl: null,
        brandName: "DJI",
        linkedModel: null,
        averageScore: 6,
        totalRatings: 4,
        commentCount: 1,
        likeCount: 1,
        reportCount: 0,
        myRating: null,
        viewer: {
          canEdit: false,
          canDelete: false,
          hasReported: false
        }
      }
    ],
    ...overrides
  };
}

describe("rankings page helpers", () => {
  it("gives hot score priority to higher-quality and better-engaged rankings", () => {
    const baseline = createRanking({
      averageScore: 6.2,
      commentCount: 2
    });
    const stronger = createRanking({
      id: "ranking_2",
      averageScore: 8.8,
      commentCount: 6,
      createdAt: "2026-04-08T09:00:00.000Z"
    });

    expect(buildRankingHotScore(stronger)).toBeGreaterThan(buildRankingHotScore(baseline));
  });

  it("merges official and community rankings into hot and latest streams", () => {
    const official = createRanking({
      id: "official_1",
      type: "official",
      createdAt: "2026-04-08T07:00:00.000Z"
    });
    const community = createRanking({
      id: "community_1",
      createdAt: "2026-04-08T10:00:00.000Z",
      averageScore: 9.2,
      commentCount: 8
    });

    const merged = mergeRankingsByTab({
      official: [official],
      community: [community]
    });

    expect(merged.latest.map((item) => item.id)).toEqual(["community_1", "official_1"]);
    expect(merged.hot[0]?.id).toBe("community_1");
  });
});
