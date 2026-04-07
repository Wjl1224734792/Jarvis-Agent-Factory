import { describe, expect, it } from "vitest";
import {
  aircraftSubmissionResponseSchema,
  createAircraftSubmissionInputSchema
} from "../src/aircraft-submissions";

describe("aircraft submissions contract", () => {
  it("requires categoryId and allows optional brandId/proposedBrandName", () => {
    const payload = createAircraftSubmissionInputSchema.parse({
      categoryId: "cat_1",
      brandId: null,
      proposedBrandName: "New Brand",
      modelName: "X1",
      powerType: "electric",
      lifecycleStatus: "unreleased",
      summary: null,
      description: null,
      coverImageFileId: null,
      galleryImageFileIds: [],
      videoFileId: null,
      priceMin: 2999,
      priceMax: 4999,
      maxFlightTimeMinutes: null,
      maxRangeKilometers: null,
      maxSpeedKph: null,
      takeoffWeightGrams: null
    });

    expect(payload.categoryId).toBe("cat_1");
    expect(payload.proposedBrandName).toBe("New Brand");
    expect(payload.priceMin).toBe(2999);
    expect(payload.priceMax).toBe(4999);

    expect(() =>
      createAircraftSubmissionInputSchema.parse({
        brandId: null,
        proposedBrandName: null,
        modelName: "X1",
        powerType: "electric",
        lifecycleStatus: "unreleased",
        summary: null,
        description: null,
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        priceMin: null,
        priceMax: null,
        maxFlightTimeMinutes: null,
        maxRangeKilometers: null,
        maxSpeedKph: null,
        takeoffWeightGrams: null
      })
    ).toThrow();
  });

  it("rejects invalid price ranges", () => {
    expect(() =>
      createAircraftSubmissionInputSchema.parse({
        categoryId: "cat_1",
        brandId: "brand_1",
        proposedBrandName: null,
        modelName: "X1",
        powerType: "electric",
        lifecycleStatus: "unreleased",
        summary: null,
        description: null,
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        priceMin: 4999,
        priceMax: 2999,
        maxFlightTimeMinutes: null,
        maxRangeKilometers: null,
        maxSpeedKph: null,
        takeoffWeightGrams: null
      })
    ).toThrow(/price/i);
  });

  it("exposes structured category and brand info in submission response", () => {
    const payload = aircraftSubmissionResponseSchema.parse({
      item: {
        id: "submit_1",
        status: "submitted",
        category: {
          id: "cat_1",
          slug: "drone",
          name: "Drone"
        },
        brand: {
          id: "brand_1",
          slug: "dji",
          name: "DJI"
        },
        proposedBrandName: "New Brand",
        modelName: "X1",
        powerType: "electric",
        lifecycleStatus: "unreleased",
        summary: null,
        description: null,
        coverImageFileId: null,
        galleryImageFileIds: [],
        videoFileId: null,
        coverImageUrl: null,
        galleryImageUrls: [],
        videoAsset: null,
        approvedModelId: null,
        approvedModelSlug: null,
        priceMin: 2999,
        priceMax: 4999,
        author: {
          id: "user_1",
          displayName: "User",
          avatarUrl: null,
          role: "user"
        },
        parameters: {
          maxFlightTimeMinutes: null,
          maxRangeKilometers: null,
          maxSpeedKph: null,
          takeoffWeightGrams: null
        },
        createdAt: "2026-03-27T00:00:00.000Z",
        updatedAt: "2026-03-27T00:00:00.000Z"
      }
    });

    expect(payload.item.category.slug).toBe("drone");
    expect(payload.item.brand?.name).toBe("DJI");
    expect(payload.item.proposedBrandName).toBe("New Brand");
    expect(payload.item.priceMin).toBe(2999);
    expect(payload.item.priceMax).toBe(4999);
  });
});
