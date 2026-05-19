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

export interface ModelEditorValues {
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
  cruiseSpeedKph: number | null;
  takeoffWeightGrams: number | null;
  wingspanMm: number | null;
  lengthMm: number | null;
  heightMm: number | null;
  maxAltitudeM: number | null;
  climbRateMs: number | null;
  windResistance: string;
  motorType: string;
  batteryType: string;
  batteryCapacityMah: number | null;
  batteryVoltage: string;
  batteryEnergyWh: number | null;
  chargeTimeMinutes: number | null;
  propellerSize: string;
  obstacleAvoidance: string;
  gnssType: string;
  ipRating: string;
  operatingTemperature: string;
  cameraSensorSize: string;
  cameraPixels: string;
  videoResolution: string;
  lensAperture: string;
  isoRange: string;
  transmissionSystem: string;
  transmissionRangeM: number | null;
  certificationType: string;
  noiseLevelDb: number | null;
  materialType: string;
  isPublished: boolean;
}

export interface UploadedModelMedia {
  coverImageFileId: string | null;
  galleryImageFileIds: string[];
  videoFileId: string | null;
}

export interface AdminEditableModelDetail {
  name: string;
  slug: string;
  category: {
    id: string;
  };
  brand: {
    id: string;
  };
  powerType: ModelPowerType;
  lifecycleStatus: ModelLifecycleStatus;
  summary: string | null;
  description: string | null;
  priceMin: number | null;
  priceMax: number | null;
  parameters: {
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    cruiseSpeedKph: number | null;
    takeoffWeightGrams: number | null;
    wingspanMm: number | null;
    lengthMm: number | null;
    heightMm: number | null;
    maxAltitudeM: number | null;
    climbRateMs: number | null;
    windResistance: string | null;
    motorType: string | null;
    batteryType: string | null;
    batteryCapacityMah: number | null;
    batteryVoltage: string | null;
    batteryEnergyWh: number | null;
    chargeTimeMinutes: number | null;
    propellerSize: string | null;
    obstacleAvoidance: string | null;
    gnssType: string | null;
    ipRating: string | null;
    operatingTemperature: string | null;
    cameraSensorSize: string | null;
    cameraPixels: string | null;
    videoResolution: string | null;
    lensAperture: string | null;
    isoRange: string | null;
    transmissionSystem: string | null;
    transmissionRangeM: number | null;
    certificationType: string | null;
    noiseLevelDb: number | null;
    materialType: string | null;
  };
  coverImageFileId?: string | null;
  galleryImageFileIds?: string[];
  videoFileId?: string | null;
  isPublished: boolean;
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 校验机型价格区间输入是否合法。
 * @param input 机型最低价和最高价输入。
 * @returns 校验失败时返回错误文案，否则返回 `null`。
 * @throws 本函数不主动抛出异常。
 */
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

/**
 * 构造机型新建或更新接口所需的提交载荷。
 * @param values 编辑表单值。
 * @param media 已选择的封面、图库和视频文件引用。
 * @returns 归一化后的机型提交数据。
 * @throws 本函数不主动抛出异常。
 */
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
    cruiseSpeedKph: values.cruiseSpeedKph,
    takeoffWeightGrams: values.takeoffWeightGrams,
    wingspanMm: values.wingspanMm,
    lengthMm: values.lengthMm,
    heightMm: values.heightMm,
    maxAltitudeM: values.maxAltitudeM,
    climbRateMs: values.climbRateMs,
    windResistance: normalizeNullableText(values.windResistance),
    motorType: normalizeNullableText(values.motorType),
    batteryType: normalizeNullableText(values.batteryType),
    batteryCapacityMah: values.batteryCapacityMah,
    batteryVoltage: normalizeNullableText(values.batteryVoltage),
    batteryEnergyWh: values.batteryEnergyWh,
    chargeTimeMinutes: values.chargeTimeMinutes,
    propellerSize: normalizeNullableText(values.propellerSize),
    obstacleAvoidance: normalizeNullableText(values.obstacleAvoidance),
    gnssType: normalizeNullableText(values.gnssType),
    ipRating: normalizeNullableText(values.ipRating),
    operatingTemperature: normalizeNullableText(values.operatingTemperature),
    cameraSensorSize: normalizeNullableText(values.cameraSensorSize),
    cameraPixels: normalizeNullableText(values.cameraPixels),
    videoResolution: normalizeNullableText(values.videoResolution),
    lensAperture: normalizeNullableText(values.lensAperture),
    isoRange: normalizeNullableText(values.isoRange),
    transmissionSystem: normalizeNullableText(values.transmissionSystem),
    transmissionRangeM: values.transmissionRangeM,
    certificationType: normalizeNullableText(values.certificationType),
    noiseLevelDb: values.noiseLevelDb,
    materialType: normalizeNullableText(values.materialType),
    coverImageFileId: media.coverImageFileId,
    galleryImageFileIds: media.galleryImageFileIds
      .filter((id) => id !== media.coverImageFileId)
      .slice(0, MODEL_GALLERY_IMAGE_LIMIT),
    videoFileId: media.videoFileId,
    isPublished: values.isPublished
  };
}

/**
 * 将机型详情转换为编辑器初始状态。
 * @param model 后台可编辑的机型详情。
 * @returns 编辑表单值与媒体状态的组合结果。
 * @throws 本函数不主动抛出异常。
 */
export function buildModelEditorInitialState(model: AdminEditableModelDetail): {
  values: ModelEditorValues;
  media: UploadedModelMedia;
} {
  return {
    values: {
      name: model.name,
      slug: model.slug,
      categoryId: model.category.id,
      brandId: model.brand.id,
      powerType: model.powerType,
      lifecycleStatus: model.lifecycleStatus,
      summary: model.summary ?? "",
      description: model.description ?? "",
      priceMin: model.priceMin,
      priceMax: model.priceMax,
      maxFlightTimeMinutes: model.parameters.maxFlightTimeMinutes,
      maxRangeKilometers: model.parameters.maxRangeKilometers,
      maxSpeedKph: model.parameters.maxSpeedKph,
      cruiseSpeedKph: model.parameters.cruiseSpeedKph,
      takeoffWeightGrams: model.parameters.takeoffWeightGrams,
      wingspanMm: model.parameters.wingspanMm,
      lengthMm: model.parameters.lengthMm,
      heightMm: model.parameters.heightMm,
      maxAltitudeM: model.parameters.maxAltitudeM,
      climbRateMs: model.parameters.climbRateMs,
      windResistance: model.parameters.windResistance ?? "",
      motorType: model.parameters.motorType ?? "",
      batteryType: model.parameters.batteryType ?? "",
      batteryCapacityMah: model.parameters.batteryCapacityMah,
      batteryVoltage: model.parameters.batteryVoltage ?? "",
      batteryEnergyWh: model.parameters.batteryEnergyWh,
      chargeTimeMinutes: model.parameters.chargeTimeMinutes,
      propellerSize: model.parameters.propellerSize ?? "",
      obstacleAvoidance: model.parameters.obstacleAvoidance ?? "",
      gnssType: model.parameters.gnssType ?? "",
      ipRating: model.parameters.ipRating ?? "",
      operatingTemperature: model.parameters.operatingTemperature ?? "",
      cameraSensorSize: model.parameters.cameraSensorSize ?? "",
      cameraPixels: model.parameters.cameraPixels ?? "",
      videoResolution: model.parameters.videoResolution ?? "",
      lensAperture: model.parameters.lensAperture ?? "",
      isoRange: model.parameters.isoRange ?? "",
      transmissionSystem: model.parameters.transmissionSystem ?? "",
      transmissionRangeM: model.parameters.transmissionRangeM,
      certificationType: model.parameters.certificationType ?? "",
      noiseLevelDb: model.parameters.noiseLevelDb,
      materialType: model.parameters.materialType ?? "",
      isPublished: model.isPublished
    },
    media: {
      coverImageFileId: model.coverImageFileId ?? null,
      galleryImageFileIds: model.galleryImageFileIds ?? [],
      videoFileId: model.videoFileId ?? null
    }
  };
}
