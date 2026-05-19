import { describe, expect, it } from "vitest";
import {
  buildModelEditorInitialState,
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
          cruiseSpeedKph: null,
          takeoffWeightGrams: 249,
          wingspanMm: null,
          lengthMm: null,
          heightMm: null,
          maxAltitudeM: null,
          climbRateMs: null,
          windResistance: "",
          motorType: "",
          batteryType: "",
          batteryCapacityMah: null,
          batteryVoltage: "",
          batteryEnergyWh: null,
          chargeTimeMinutes: null,
          propellerSize: "",
          obstacleAvoidance: "",
          gnssType: "",
          ipRating: "",
          operatingTemperature: "",
          cameraSensorSize: "",
          cameraPixels: "",
          videoResolution: "",
          lensAperture: "",
          isoRange: "",
          transmissionSystem: "",
          transmissionRangeM: null,
          certificationType: "",
          noiseLevelDb: null,
          materialType: "",
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
      cruiseSpeedKph: null,
      takeoffWeightGrams: 249,
      wingspanMm: null,
      lengthMm: null,
      heightMm: null,
      maxAltitudeM: null,
      climbRateMs: null,
      windResistance: null,
      motorType: null,
      batteryType: null,
      batteryCapacityMah: null,
      batteryVoltage: null,
      batteryEnergyWh: null,
      chargeTimeMinutes: null,
      propellerSize: null,
      obstacleAvoidance: null,
      gnssType: null,
      ipRating: null,
      operatingTemperature: null,
      cameraSensorSize: null,
      cameraPixels: null,
      videoResolution: null,
      lensAperture: null,
      isoRange: null,
      transmissionSystem: null,
      transmissionRangeM: null,
      certificationType: null,
      noiseLevelDb: null,
      materialType: null,
      coverImageFileId: "cover_1",
      galleryImageFileIds: ["gallery_1", "gallery_2"],
      videoFileId: "video_1",
      isPublished: true
    });
  });

  it("maps admin model detail into editable form values and media state", () => {
    const state = buildModelEditorInitialState({
      slug: "mini-4-pro",
      name: "Mini 4 Pro",
      summary: "Portable flagship",
      description: "Detailed description",
      priceMin: 4999,
      priceMax: 6999,
      powerType: "electric",
      lifecycleStatus: "released",
      category: {
        id: "cat_1"
      },
      brand: {
        id: "brand_1"
      },
      parameters: {
        maxFlightTimeMinutes: 45,
        maxRangeKilometers: 18,
        maxSpeedKph: 58,
        cruiseSpeedKph: null,
        takeoffWeightGrams: 249,
        wingspanMm: null,
        lengthMm: null,
        heightMm: null,
        maxAltitudeM: null,
        climbRateMs: null,
        windResistance: null,
        motorType: null,
        batteryType: null,
        batteryCapacityMah: null,
        batteryVoltage: null,
        batteryEnergyWh: null,
        chargeTimeMinutes: null,
        propellerSize: null,
        obstacleAvoidance: null,
        gnssType: null,
        ipRating: null,
        operatingTemperature: null,
        cameraSensorSize: null,
        cameraPixels: null,
        videoResolution: null,
        lensAperture: null,
        isoRange: null,
        transmissionSystem: null,
        transmissionRangeM: null,
        certificationType: null,
        noiseLevelDb: null,
        materialType: null,
      },
      isPublished: true,
      coverImageFileId: "cover_1",
      galleryImageFileIds: ["gallery_1", "gallery_2"],
      videoFileId: "video_1"
    });

    expect(state.values).toEqual({
      name: "Mini 4 Pro",
      slug: "mini-4-pro",
      categoryId: "cat_1",
      brandId: "brand_1",
      powerType: "electric",
      lifecycleStatus: "released",
      summary: "Portable flagship",
      description: "Detailed description",
      priceMin: 4999,
      priceMax: 6999,
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 18,
      maxSpeedKph: 58,
      cruiseSpeedKph: null,
      takeoffWeightGrams: 249,
      wingspanMm: null,
      lengthMm: null,
      heightMm: null,
      maxAltitudeM: null,
      climbRateMs: null,
      windResistance: "",
      motorType: "",
      batteryType: "",
      batteryCapacityMah: null,
      batteryVoltage: "",
      batteryEnergyWh: null,
      chargeTimeMinutes: null,
      propellerSize: "",
      obstacleAvoidance: "",
      gnssType: "",
      ipRating: "",
      operatingTemperature: "",
      cameraSensorSize: "",
      cameraPixels: "",
      videoResolution: "",
      lensAperture: "",
      isoRange: "",
      transmissionSystem: "",
      transmissionRangeM: null,
      certificationType: "",
      noiseLevelDb: null,
      materialType: "",
      isPublished: true
    });
    expect(state.media).toEqual({
      coverImageFileId: "cover_1",
      galleryImageFileIds: ["gallery_1", "gallery_2"],
      videoFileId: "video_1"
    });
  });
});
