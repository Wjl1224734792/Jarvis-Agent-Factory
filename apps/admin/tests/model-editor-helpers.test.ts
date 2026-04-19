import { describe, expect, it } from "vitest";
import {
  buildModelUpsertPayload,
  validateModelPriceRange
} from "../src/features/models/model-editor-helpers";

describe("model editor helpers", () => {
  it("validates price range consistency", () => {
    expect(validateModelPriceRange({ priceMin: 1000, priceMax: null })).toBe(
      "价格区间需要同时填写最低价和最高价。"
    );
    expect(validateModelPriceRange({ priceMin: 7000, priceMax: 5000 })).toBe(
      "最低价不能高于最高价。"
    );
    expect(validateModelPriceRange({ priceMin: 3000, priceMax: 5000 })).toBeNull();
  });

  it("builds trimmed payload and maps lifecycle/media file ids", () => {
    expect(
      buildModelUpsertPayload(
        {
          slug: " mini-4-pro ",
          name: " Mini 4 Pro ",
          categoryId: "cat_1",
          brandId: "brand_1",
          powerType: "electric",
          lifecycleStatus: "released",
          summary: " 轻量便携 ",
          description: " 旗舰避障 ",
          priceMin: 4999,
          priceMax: 6999,
          maxFlightTimeMinutes: 45,
          maxRangeKilometers: 18,
          maxSpeedKph: 58,
          takeoffWeightGrams: 249,
          isPublished: true
        },
        {
          coverImageFileId: "cover_1",
          galleryImageFileIds: ["gallery_1", "cover_1", "gallery_2"],
          videoFileId: "video_1"
        }
      )
    ).toEqual({
      slug: "mini-4-pro",
      name: "Mini 4 Pro",
      categoryId: "cat_1",
      brandId: "brand_1",
      powerType: "electric",
      lifecycleStatus: "released",
      summary: "轻量便携",
      description: "旗舰避障",
      priceMin: 4999,
      priceMax: 6999,
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 18,
      maxSpeedKph: 58,
      takeoffWeightGrams: 249,
      coverImageFileId: "cover_1",
      galleryImageFileIds: ["gallery_1", "gallery_2"],
      videoFileId: "video_1",
      isPublished: true
    });
  });
});
