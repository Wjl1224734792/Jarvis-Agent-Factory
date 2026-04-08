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
        rank: 1,
        title: "DJI Mini 4 Pro",
        summary: "Official reviewed item.",
        imageUrl: "https://cdn.example.com/rankings/mini-4.jpg",
        brandName: null,
        averageScore: 8.6,
        linkedModel: {
          slug: "mini-4-pro",
          name: "DJI Mini 4 Pro",
          brand: { name: "DJI" }
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
          coverImageUrl: " https://cdn.example.com/cover.jpg ",
          itemAddPolicy: "public"
        },
        [
          {
            id: "item_1",
            title: " DJI Mini 4 Pro ",
            summary: " Portable ",
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
      coverImageUrl: "https://cdn.example.com/cover.jpg",
      itemAddPolicy: "public",
      items: [
        {
          title: "DJI Mini 4 Pro",
          summary: "Portable",
          imageUrl: "https://cdn.example.com/item.jpg",
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
        title: "Official",
        coverImageUrl: null,
        itemAddPolicy: "owner",
        commentCount: 0,
        itemCount: 1,
        averageScore: 8.2,
        createdAt: "2026-03-29T00:00:00.000Z",
        items: [],
        author: { id: "admin_1", displayName: "系统管理员", role: "admin" }
      },
      {
        id: "community_1",
        type: "community",
        status: "pending",
        title: "Community",
        coverImageUrl: null,
        itemAddPolicy: "public",
        commentCount: 0,
        itemCount: 1,
        averageScore: 6.5,
        createdAt: "2026-03-29T00:00:00.000Z",
        items: [],
        author: { id: "user_1", displayName: "飞友A", role: "user" }
      }
    ]);

    expect(partitioned.official).toHaveLength(1);
    expect(partitioned.community).toHaveLength(1);
    expect(formatCommunityRankingStatus("pending")).toBe("待审核");
    expect(formatCommunityRankingStatus("hidden")).toBe("已隐藏");
  });
});
