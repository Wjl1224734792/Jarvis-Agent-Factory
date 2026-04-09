import { describe, expect, it } from "vitest";
import type { UserContentItem } from "@feijia/schemas";
import {
  filterProfileItems,
  getProfileItemCategory,
  getProfileItemLifecycle
} from "../src/features/auth/profile-content-filters";

const sampleItems: UserContentItem[] = [
  {
    type: "post",
    id: "post_article_pending",
    postType: "article",
    status: "pending",
    rejectionReason: null,
    title: "Pending article",
    contentPreview: "pending article preview",
    viewCount: 0,
    canManage: true,
    createdAt: "2026-04-08T08:00:00.000Z",
    updatedAt: "2026-04-08T08:00:00.000Z"
  },
  {
    type: "post",
    id: "post_moment_published",
    postType: "moment",
    status: "published",
    rejectionReason: null,
    title: "Published moment",
    contentPreview: "published moment preview",
    viewCount: 12,
    canManage: true,
    createdAt: "2026-04-08T08:10:00.000Z",
    updatedAt: "2026-04-08T08:10:00.000Z"
  },
  {
    type: "ranking",
    id: "ranking_rejected",
    status: "rejected",
    rejectionReason: "Need more evidence",
    title: "Rejected ranking",
    canManage: true,
    createdAt: "2026-04-08T08:20:00.000Z",
    updatedAt: "2026-04-08T08:20:00.000Z"
  },
  {
    type: "rating-target",
    id: "rating_target_published",
    rankingId: "ranking_rejected",
    rankingTitle: "Rejected ranking",
    status: "published",
    rejectionReason: null,
    title: "Published target",
    summary: "rating target",
    canManage: true,
    createdAt: "2026-04-08T08:30:00.000Z",
    updatedAt: "2026-04-08T08:30:00.000Z"
  },
  {
    type: "brand-application",
    id: "brand_pending",
    status: "pending",
    rejectionReason: null,
    name: "Pending brand",
    description: "brand pending",
    canManage: true,
    createdAt: "2026-04-08T08:40:00.000Z",
    updatedAt: "2026-04-08T08:40:00.000Z"
  },
  {
    type: "aircraft",
    id: "aircraft_draft",
    modelName: "Draft aircraft",
    summary: "draft aircraft",
    status: "draft",
    rejectionReason: null,
    viewCount: 0,
    canManage: true,
    createdAt: "2026-04-08T08:50:00.000Z",
    updatedAt: "2026-04-08T08:50:00.000Z"
  },
  {
    type: "review",
    id: "review_visible",
    content: "review content",
    model: {
      id: "model_1",
      slug: "mini-4-pro",
      name: "Mini 4 Pro"
    },
    createdAt: "2026-04-08T09:00:00.000Z",
    updatedAt: "2026-04-08T09:00:00.000Z"
  },
  {
    type: "favorite-post",
    id: "favorite_article",
    postType: "article",
    title: "Favorite article",
    contentPreview: "favorite article preview",
    createdAt: "2026-04-08T09:10:00.000Z",
    updatedAt: "2026-04-08T09:10:00.000Z"
  },
  {
    type: "favorite-model",
    id: "favorite_model",
    model: {
      id: "model_2",
      slug: "autel-evo-lite-plus",
      name: "Autel EVO Lite+",
      powerType: "electric"
    },
    createdAt: "2026-04-08T09:20:00.000Z",
    updatedAt: "2026-04-08T09:20:00.000Z"
  }
];

describe("profile content filters", () => {
  it("maps existing content types into the five secondary categories", () => {
    expect(getProfileItemCategory(sampleItems[0])).toBe("article");
    expect(getProfileItemCategory(sampleItems[1])).toBe("moment");
    expect(getProfileItemCategory(sampleItems[2])).toBe("ranking");
    expect(getProfileItemCategory(sampleItems[3])).toBe("ranking");
    expect(getProfileItemCategory(sampleItems[4])).toBe("brand");
    expect(getProfileItemCategory(sampleItems[5])).toBe("aircraft");
    expect(getProfileItemCategory(sampleItems[6])).toBe("aircraft");
    expect(getProfileItemCategory(sampleItems[8])).toBe("aircraft");
  });

  it("normalizes draft and moderation states for the content center", () => {
    expect(getProfileItemLifecycle(sampleItems[0])).toBe("reviewing");
    expect(getProfileItemLifecycle(sampleItems[2])).toBe("rejected");
    expect(getProfileItemLifecycle(sampleItems[4])).toBe("reviewing");
    expect(getProfileItemLifecycle(sampleItems[5])).toBe("draft");
    expect(getProfileItemLifecycle(sampleItems[6])).toBe("published");
  });

  it("filters content and favorites by secondary category and lifecycle", () => {
    expect(
      filterProfileItems(sampleItems, {
        primaryTab: "content",
        category: "ranking",
        lifecycle: "published"
      }).map((item) => item.id)
    ).toEqual(["rating_target_published"]);

    expect(
      filterProfileItems(sampleItems, {
        primaryTab: "content",
        category: "aircraft",
        lifecycle: "draft"
      }).map((item) => item.id)
    ).toEqual(["aircraft_draft"]);

    expect(
      filterProfileItems(sampleItems, {
        primaryTab: "favorites",
        category: "article"
      }).map((item) => item.id)
    ).toEqual(["favorite_article"]);

    expect(
      filterProfileItems(sampleItems, {
        primaryTab: "favorites",
        category: "ranking"
      })
    ).toEqual([]);
  });
});
