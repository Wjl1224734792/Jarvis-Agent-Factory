import { describe, expect, it } from "vitest";
import {
  adminModelInputSchema,
  modelDetailResponseSchema,
  modelListQuerySchema,
  modelListResponseSchema
} from "../src/models";

describe("models contract", () => {
  it("parses list query filters", () => {
    const payload = modelListQuerySchema.parse({
      categorySlugs: ["drone", "business-jet"],
      brandSlugs: ["dji", "cirrus"],
      powerTypes: ["electric", "hybrid"],
      keyword: "pro"
    });

    expect(payload.categorySlugs).toHaveLength(2);
    expect(payload.brandSlugs).toHaveLength(2);
    expect(payload.powerTypes).toHaveLength(2);
    expect(payload.keyword).toBe("pro");
  });

  it("parses list response payload with price range", () => {
    const payload = modelListResponseSchema.parse({
      items: [
        {
          id: "model_1",
          slug: "mini-4-pro",
          name: "DJI Mini 4 Pro",
          summary: "Compact and stable flight model.",
          priceMin: 4999,
          priceMax: 6999,
          powerType: "electric",
          lifecycleStatus: "released",
          reviewSummary: {
            totalReviews: 12
          },
          category: {
            id: "cat_1",
            slug: "drone",
            name: "Drone"
          },
          brand: {
            id: "brand_1",
            slug: "dji",
            name: "DJI",
            logoUrl: "https://cdn.example.com/brands/dji.png"
          },
          coverImageUrl: "https://cdn.example.com/covers/mini.jpg",
          coverVideoUrl: null
        }
      ],
      total: 1,
      pagination: {
        page: 1,
        limit: 20,
        hasMore: false
      },
      filters: {
        categories: [
          {
            id: "cat_1",
            slug: "drone",
            name: "Drone",
            sortOrder: 1,
            isEnabled: true
          }
        ],
        brands: [
          {
            id: "brand_1",
            slug: "dji",
            name: "DJI",
            logoUrl: "https://cdn.example.com/brands/dji.png",
            categoryId: "cat_1",
            sortOrder: 1,
            isEnabled: true
          }
        ],
        powerTypes: ["electric", "fuel", "hybrid"]
      }
    });

    expect(payload.items[0]?.slug).toBe("mini-4-pro");
    expect(payload.items[0]?.priceMin).toBe(4999);
    expect(payload.items[0]?.priceMax).toBe(6999);
  });

  it("parses detail response and admin model input with price range", () => {
    const detail = modelDetailResponseSchema.parse({
      item: {
        id: "model_1",
        slug: "mini-4-pro",
        name: "DJI Mini 4 Pro",
        summary: "Compact and stable flight model.",
        description: "Suitable for travel and everyday aerial shooting.",
        priceMin: 4999,
        priceMax: 6999,
        powerType: "electric",
        lifecycleStatus: "released",
        isPublished: true,
        ownerId: "user_owner_1",
        owner: {
          id: "user_owner_1",
          displayName: "Model Owner",
          avatarUrl: null,
          ipLocationLabel: "广东省",
          role: "user"
        },
        reviewSummary: {
          totalReviews: 12
        },
        category: {
          id: "cat_1",
          slug: "drone",
          name: "Drone"
        },
        brand: {
          id: "brand_1",
          slug: "dji",
          name: "DJI",
          logoUrl: "https://cdn.example.com/brands/dji.png"
        },
        favoriteCount: 0,
        commentCount: 0,
        coverImageUrl: null,
        coverVideoUrl: null,
        galleryImageUrls: [],
        interactionSummary: {
          interestCount: 5,
          favoriteCount: 3,
          shareCount: 2
        },
        viewer: {
          isInterested: true,
          isFavorited: false,
          hasShared: false
        },
        parameters: {
          maxFlightTimeMinutes: 45,
          maxRangeKilometers: 18,
          maxSpeedKph: 58,
          takeoffWeightGrams: 249
        }
      }
    });

    const adminInput = adminModelInputSchema.parse({
      slug: "mini-4-pro",
      name: "DJI Mini 4 Pro",
      categoryId: "cat_1",
      brandId: "brand_1",
      powerType: "electric",
      lifecycleStatus: "released",
      summary: "Compact and stable flight model.",
      description: "Suitable for travel and everyday aerial shooting.",
      priceMin: 4999,
      priceMax: 6999,
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 18,
      maxSpeedKph: 58,
      takeoffWeightGrams: 249,
      isPublished: true
    });

    expect(detail.item.parameters.maxFlightTimeMinutes).toBe(45);
    expect(detail.item.interactionSummary.interestCount).toBe(5);
    expect(detail.item.owner?.ipLocationLabel).toBe("广东省");
    expect(adminInput.brandId).toBe("brand_1");
    expect(detail.item.brand.logoUrl).toContain("dji.png");
    expect(detail.item.priceMin).toBe(4999);
    expect(detail.item.priceMax).toBe(6999);
  });

  it("rejects invalid model price ranges", () => {
    expect(() =>
      adminModelInputSchema.parse({
        slug: "mini-4-pro",
        name: "DJI Mini 4 Pro",
        categoryId: "cat_1",
        brandId: "brand_1",
        powerType: "electric",
        lifecycleStatus: "released",
        summary: null,
        description: null,
        priceMin: 6999,
        priceMax: 4999,
        maxFlightTimeMinutes: null,
        maxRangeKilometers: null,
        maxSpeedKph: null,
        takeoffWeightGrams: null,
        noiseLevelDb: null,
        materialType: null,
        isPublished: true
      })
    ).toThrow(/price/i);
  });
});
