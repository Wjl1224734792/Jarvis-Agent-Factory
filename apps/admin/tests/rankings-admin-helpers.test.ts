import { describe, expect, it } from "vitest";
import {
  buildRankingPayload,
  createEmptyRankingDraftItem,
  formatCommunityRankingStatus,
  partitionRankingRecords,
  toRankingDraftItems
} from "../src/features/rankings/rankings-admin-helpers";

describe("rankings admin helpers", () => {
  it("creates empty draft items and normalizes detail items", () => {
    const empty = createEmptyRankingDraftItem();
    expect(empty.title).toBe("");
    expect(empty.linkedModelSlug).toBeNull();

    const draftItems = toRankingDraftItems([
      {
        id: "item_1",
        rankingId: "ranking_1",
        authorId: "author_1",
        author: null,
        status: "published",
        rejectionReason: null,
        rank: 1,
        title: "DJI Mini 4 Pro",
        summary: "Official reviewed item.",
        imageFileId: "img_1",
        imageUrl: "https://cdn.example.com/rankings/mini-4.jpg",
        brandName: null,
        averageScore: 8.6,
        totalRatings: 12,
        commentCount: 3,
        likeCount: 5,
        reportCount: 0,
        myRating: null,
        linkedModel: {
          id: "model_1",
          slug: "mini-4-pro",
          name: "DJI Mini 4 Pro",
          summary: "Compact model",
          powerType: "electric",
          category: { id: "cat_1", slug: "drone", name: "Drone" },
          brand: { id: "brand_1", slug: "dji", name: "DJI" }
        },
        viewer: {
          canEdit: true,
          canDelete: true,
          hasReported: false
        }
      }
    ]);

    expect(draftItems[0]?.brandName).toBe("DJI");
    expect(draftItems[0]?.linkedModelName).toBe("DJI Mini 4 Pro");
  });

  it("builds trimmed official ranking payloads and partitions lists", () => {
    expect(
      buildRankingPayload(
        {
          title: " Official Ranking ",
          coverImageFileId: " ranking_cover_1 ",
          itemAddPolicy: "public"
        },
        [
          {
            id: "item_1",
            title: " DJI Mini 4 Pro ",
            summary: " Portable ",
            imageFileId: " ranking_item_1 ",
            imageUrl: " https://cdn.example.com/item.jpg ",
            brandName: " DJI ",
            linkedModelSlug: "mini-4-pro",
            linkedModelName: "DJI Mini 4 Pro"
          }
        ]
      )
    ).toEqual({
      type: "official",
      title: "Official Ranking",
      coverImageFileId: "ranking_cover_1",
      itemAddPolicy: "public",
      items: [
        {
          title: "DJI Mini 4 Pro",
          summary: "Portable",
          imageFileId: "ranking_item_1",
          brandName: "DJI",
          linkedModelSlug: "mini-4-pro"
        }
      ]
    });

    const partitioned = partitionRankingRecords([
      {
        id: "official_1",
        type: "official",
        status: "published",
        rejectionReason: null,
        title: "Official",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "owner",
        commentCount: 0,
        reportCount: 0,
        itemCount: 1,
        averageScore: 8.2,
        createdAt: "2026-03-29T00:00:00.000Z",
        items: [],
        author: { id: "admin_1", displayName: "Admin", avatarUrl: null, ipLocationLabel: null, role: "admin" },
        viewer: {
          canEdit: true,
          canAddItems: true
        }
      },
      {
        id: "community_1",
        type: "community",
        status: "pending",
        rejectionReason: null,
        title: "Community",
        coverImageFileId: null,
        coverImageUrl: null,
        itemAddPolicy: "public",
        commentCount: 0,
        reportCount: 0,
        itemCount: 1,
        averageScore: 6.5,
        createdAt: "2026-03-29T00:00:00.000Z",
        items: [],
        author: { id: "user_1", displayName: "Pilot A", avatarUrl: null, ipLocationLabel: null, role: "user" },
        viewer: {
          canEdit: false,
          canAddItems: false
        }
      }
    ]);

    expect(partitioned.official).toHaveLength(1);
    expect(partitioned.community).toHaveLength(1);
    expect(formatCommunityRankingStatus("pending")).toBe("待审核");
    expect(formatCommunityRankingStatus("hidden")).toBe("已隐藏");
  });
});
