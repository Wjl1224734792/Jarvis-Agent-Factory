export type ModelPowerType = "electric" | "fuel" | "hybrid" | "other";
export type ModelLifecycleStatus =
  | "concept"
  | "development"
  | "testing"
  | "unreleased"
  | "released"
  | "not_in_market"
  | "marketed";

export const modelPowerOptions: Array<{ label: string; value: ModelPowerType }> = [
  { label: "电动", value: "electric" },
  { label: "燃油", value: "fuel" },
  { label: "混动", value: "hybrid" },
  { label: "其他", value: "other" }
];

export const modelLifecycleStatusOptions: Array<{ label: string; value: ModelLifecycleStatus }> = [
  { label: "概念", value: "concept" },
  { label: "研发", value: "development" },
  { label: "测试", value: "testing" },
  { label: "未发布", value: "unreleased" },
  { label: "已发布", value: "released" },
  { label: "未上市", value: "not_in_market" },
  { label: "已上市", value: "marketed" }
];

export const MODEL_GALLERY_IMAGE_LIMIT = 6;

export type ModelEditorValues = {
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  powerType: ModelPowerType;
  lifecycleStatus: ModelLifecycleStatus;
  summary: string;
  description: string;
  priceMin: number | null;
  priceMax: number | null;
  maxFlightTimeMinutes: number | null;
  maxRangeKilometers: number | null;
  maxSpeedKph: number | null;
  takeoffWeightGrams: number | null;
  isPublished: boolean;
};

export type UploadedModelMedia = {
  coverImageFileId: string | null;
  galleryImageFileIds: string[];
  videoFileId: string | null;
};

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateModelPriceRange(input: {
  priceMin: number | null;
  priceMax: number | null;
}): string | null {
  const hasMin = input.priceMin !== null;
  const hasMax = input.priceMax !== null;

  if (hasMin !== hasMax) {
    return "价格区间需要同时填写最低价和最高价。";
  }

  if (input.priceMin !== null && input.priceMax !== null && input.priceMin > input.priceMax) {
    return "最低价不能高于最高价。";
  }

  return null;
}

export function buildModelUpsertPayload(values: ModelEditorValues, media: UploadedModelMedia) {
  return {
    slug: values.slug.trim(),
    name: values.name.trim(),
    categoryId: values.categoryId,
    brandId: values.brandId,
    powerType: values.powerType,
    lifecycleStatus: values.lifecycleStatus,
    summary: normalizeNullableText(values.summary),
    description: normalizeNullableText(values.description),
    priceMin: values.priceMin,
    priceMax: values.priceMax,
    maxFlightTimeMinutes: values.maxFlightTimeMinutes,
    maxRangeKilometers: values.maxRangeKilometers,
    maxSpeedKph: values.maxSpeedKph,
    takeoffWeightGrams: values.takeoffWeightGrams,
    coverImageFileId: media.coverImageFileId,
    galleryImageFileIds: media.galleryImageFileIds
      .filter((id) => id !== media.coverImageFileId)
      .slice(0, MODEL_GALLERY_IMAGE_LIMIT),
    videoFileId: media.videoFileId,
    isPublished: values.isPublished
  };
}
