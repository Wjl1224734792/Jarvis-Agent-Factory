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
      categorySlug: "drone",
      brandSlug: "dji",
      powerTypes: ["electric", "hybrid"]
    });

    expect(payload.powerTypes).toHaveLength(2);
  });

  it("parses list response payload", () => {
    const payload = modelListResponseSchema.parse({
      items: [
        {
          id: "model_1",
          slug: "mini-4-pro",
          name: "DJI Mini 4 Pro",
          summary: "轻量级航拍无人机",
          powerType: "electric",
          reviewSummary: {
            totalReviews: 12
          },
          category: {
            id: "cat_1",
            slug: "drone",
            name: "无人机"
          },
          brand: {
            id: "brand_1",
            slug: "dji",
            name: "DJI"
          }
        }
      ],
      total: 1,
      filters: {
        categories: [
          {
            id: "cat_1",
            slug: "drone",
            name: "无人机",
            sortOrder: 1,
            isEnabled: true
          }
        ],
        brands: [
          {
            id: "brand_1",
            slug: "dji",
            name: "DJI",
            categoryId: "cat_1",
            sortOrder: 1,
            isEnabled: true
          }
        ],
        powerTypes: ["electric", "fuel", "hybrid"]
      }
    });

    expect(payload.items[0]?.slug).toBe("mini-4-pro");
  });

  it("parses detail response and admin model input", () => {
    const detail = modelDetailResponseSchema.parse({
      item: {
        id: "model_1",
        slug: "mini-4-pro",
        name: "DJI Mini 4 Pro",
        summary: "轻量级航拍无人机",
        description: "适合轻量化航拍场景。",
        powerType: "electric",
        isPublished: true,
        reviewSummary: {
          totalReviews: 12
        },
        category: {
          id: "cat_1",
          slug: "drone",
          name: "无人机"
        },
        brand: {
          id: "brand_1",
          slug: "dji",
          name: "DJI"
        },
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
      summary: "轻量级航拍无人机",
      description: "适合轻量化航拍场景。",
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 18,
      maxSpeedKph: 58,
      takeoffWeightGrams: 249,
      isPublished: true
    });

    expect(detail.item.parameters.maxFlightTimeMinutes).toBe(45);
    expect(detail.item.interactionSummary.interestCount).toBe(5);
    expect(adminInput.brandId).toBe("brand_1");
  });
});
