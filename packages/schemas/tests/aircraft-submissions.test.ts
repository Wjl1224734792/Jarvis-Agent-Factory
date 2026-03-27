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
      summary: null,
      description: null,
      coverImageUrl: null,
      galleryImageUrls: [],
      videoUrl: null,
      maxFlightTimeMinutes: null,
      maxRangeKilometers: null,
      maxSpeedKph: null,
      takeoffWeightGrams: null
    });

    expect(payload.categoryId).toBe("cat_1");
    expect(payload.proposedBrandName).toBe("New Brand");

    expect(() =>
      createAircraftSubmissionInputSchema.parse({
        brandId: null,
        proposedBrandName: null,
        modelName: "X1",
        powerType: "electric",
        summary: null,
        description: null,
        coverImageUrl: null,
        galleryImageUrls: [],
        videoUrl: null,
        maxFlightTimeMinutes: null,
        maxRangeKilometers: null,
        maxSpeedKph: null,
        takeoffWeightGrams: null
      })
    ).toThrow();
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
        summary: null,
        description: null,
        coverImageUrl: null,
        galleryImageUrls: [],
        videoUrl: null,
        approvedModelId: null,
        approvedModelSlug: null,
        author: {
          id: "user_1",
          displayName: "User",
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
  });
});
