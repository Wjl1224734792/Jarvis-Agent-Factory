import type {
  ModerationMode,
  SiteSettings,
  UpdateSiteSettingsInput
} from "@feijia/schemas";

export type SiteModerationModeKey = keyof SiteSettings["moderationModes"];

type SiteSettingsLike = Partial<SiteSettings> | null | undefined;

export const DEFAULT_MODERATION_MODES = {
  article: "ai",
  moment: "ai",
  comment: "manual",
  review: "manual",
  brand: "ai",
  model: "ai",
  ranking: "manual",
  ratingTarget: "ai",
  circlePost: "ai",
  circleComment: "ai"
} satisfies SiteSettings["moderationModes"];

function resolveLegacyModerationEnabled(
  settings: SiteSettingsLike,
  key: SiteModerationModeKey
) {
  switch (key) {
    case "article":
      return settings?.articleModerationEnabled ?? settings?.postModerationEnabled ?? true;
    case "moment":
      return settings?.momentModerationEnabled ?? settings?.postModerationEnabled ?? true;
    case "comment":
      return settings?.commentModerationEnabled ?? false;
    case "review":
      return settings?.reviewModerationEnabled ?? false;
    case "brand":
      return settings?.brandModerationEnabled ?? true;
    case "model":
      return settings?.modelModerationEnabled ?? settings?.submissionModerationEnabled ?? true;
    case "ranking":
      return settings?.rankingModerationEnabled ?? false;
    case "ratingTarget":
      return settings?.ratingTargetModerationEnabled ?? settings?.rankingModerationEnabled ?? true;
    case "circlePost":
    case "circleComment":
      // circle keys 无 legacy boolean 对应，默认启用 AI 审核
      return true;
  }
}

function resolveBooleanModerationMode(
  enabled: boolean | undefined
): ModerationMode | undefined {
  if (enabled === undefined) {
    return undefined;
  }

  return enabled ? "ai" : "manual";
}

function resolvePatchedModerationMode(
  current: ModerationMode,
  explicitMode: ModerationMode | undefined,
  legacyEnabled: boolean | undefined
): ModerationMode {
  return explicitMode ?? resolveBooleanModerationMode(legacyEnabled) ?? current;
}

/**
 * 解析单个审核域的最终审核模式。
 * @param settings 当前站点设置或兼容旧字段的部分设置。
 * @param key 需要解析的审核域键名。
 * @returns 当前审核域对应的审核模式。
 * @throws 本函数不主动抛出异常。
 */
export function resolveSiteModerationMode(
  settings: SiteSettingsLike,
  key: SiteModerationModeKey
): ModerationMode {
  const explicitMode = settings?.moderationModes?.[key];
  if (explicitMode) {
    return explicitMode;
  }

  return resolveLegacyModerationEnabled(settings, key) ? "ai" : "manual";
}

/**
 * 解析全部审核域的最终审核模式集合。
 * @param settings 当前站点设置或兼容旧字段的部分设置。
 * @returns 完整的审核模式映射。
 * @throws 本函数不主动抛出异常。
 */
export function resolveSiteModerationModes(settings: SiteSettingsLike) {
  return {
    article: resolveSiteModerationMode(settings, "article"),
    moment: resolveSiteModerationMode(settings, "moment"),
    comment: resolveSiteModerationMode(settings, "comment"),
    review: resolveSiteModerationMode(settings, "review"),
    brand: resolveSiteModerationMode(settings, "brand"),
    model: resolveSiteModerationMode(settings, "model"),
    ranking: resolveSiteModerationMode(settings, "ranking"),
    ratingTarget: resolveSiteModerationMode(settings, "ratingTarget"),
    circlePost: resolveSiteModerationMode(settings, "circlePost"),
    circleComment: resolveSiteModerationMode(settings, "circleComment")
  } satisfies SiteSettings["moderationModes"];
}

function buildLegacyModerationBooleans(modes: SiteSettings["moderationModes"]) {
  return {
    articleModerationEnabled: modes.article !== "manual",
    momentModerationEnabled: modes.moment !== "manual",
    commentModerationEnabled: modes.comment !== "manual",
    reviewModerationEnabled: modes.review !== "manual",
    brandModerationEnabled: modes.brand !== "manual",
    modelModerationEnabled: modes.model !== "manual",
    rankingModerationEnabled: modes.ranking !== "manual",
    ratingTargetModerationEnabled: modes.ratingTarget !== "manual"
  };
}

function mergeModerationModes(
  current: SiteSettings["moderationModes"],
  patch: UpdateSiteSettingsInput
) {
  const fromLegacy = {
    article: patch.articleModerationEnabled ?? patch.postModerationEnabled,
    moment: patch.momentModerationEnabled ?? patch.postModerationEnabled,
    comment: patch.commentModerationEnabled,
    review: patch.reviewModerationEnabled,
    brand: patch.brandModerationEnabled,
    model: patch.modelModerationEnabled ?? patch.submissionModerationEnabled,
    ranking: patch.rankingModerationEnabled,
    ratingTarget: patch.ratingTargetModerationEnabled
  } satisfies Partial<Record<SiteModerationModeKey, boolean | undefined>>;

  return {
    article: resolvePatchedModerationMode(
      current.article,
      patch.moderationModes?.article,
      fromLegacy.article
    ),
    moment: resolvePatchedModerationMode(
      current.moment,
      patch.moderationModes?.moment,
      fromLegacy.moment
    ),
    comment: resolvePatchedModerationMode(
      current.comment,
      patch.moderationModes?.comment,
      fromLegacy.comment
    ),
    review: resolvePatchedModerationMode(
      current.review,
      patch.moderationModes?.review,
      fromLegacy.review
    ),
    brand: resolvePatchedModerationMode(
      current.brand,
      patch.moderationModes?.brand,
      fromLegacy.brand
    ),
    model: resolvePatchedModerationMode(
      current.model,
      patch.moderationModes?.model,
      fromLegacy.model
    ),
    ranking: resolvePatchedModerationMode(
      current.ranking,
      patch.moderationModes?.ranking,
      fromLegacy.ranking
    ),
    ratingTarget: resolvePatchedModerationMode(
      current.ratingTarget,
      patch.moderationModes?.ratingTarget,
      fromLegacy.ratingTarget
    ),
    circlePost: patch.moderationModes?.circlePost ?? current.circlePost,
    circleComment: patch.moderationModes?.circleComment ?? current.circleComment
  } satisfies SiteSettings["moderationModes"];
}

// Keep admin-side writes aligned with the server's tri-state merge semantics.
/**
 * 基于当前站点设置和局部补丁生成后台提交载荷。
 * @param current 当前完整站点设置。
 * @param patch 后台表单提交的局部修改。
 * @returns 同时包含新旧审核字段的更新输入。
 * @throws 本函数不主动抛出异常。
 */
export function buildSiteSettingsUpdate(
  current: SiteSettings,
  patch: UpdateSiteSettingsInput
): UpdateSiteSettingsInput {
  const moderationModes = mergeModerationModes(resolveSiteModerationModes(current), patch);
  const legacyFlags = buildLegacyModerationBooleans(moderationModes);

  return {
    postModerationEnabled:
      legacyFlags.articleModerationEnabled || legacyFlags.momentModerationEnabled,
    commentModerationEnabled: legacyFlags.commentModerationEnabled,
    reviewModerationEnabled: legacyFlags.reviewModerationEnabled,
    submissionModerationEnabled: legacyFlags.modelModerationEnabled,
    rankingModerationEnabled: legacyFlags.rankingModerationEnabled,
    articleModerationEnabled: legacyFlags.articleModerationEnabled,
    momentModerationEnabled: legacyFlags.momentModerationEnabled,
    brandModerationEnabled: legacyFlags.brandModerationEnabled,
    modelModerationEnabled: legacyFlags.modelModerationEnabled,
    ratingTargetModerationEnabled: legacyFlags.ratingTargetModerationEnabled,
    moderationModes
  };
}
