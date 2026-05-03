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
  ratingTarget: "ai"
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
  }
}

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

export function resolveSiteModerationModes(settings: SiteSettingsLike) {
  return {
    article: resolveSiteModerationMode(settings, "article"),
    moment: resolveSiteModerationMode(settings, "moment"),
    comment: resolveSiteModerationMode(settings, "comment"),
    review: resolveSiteModerationMode(settings, "review"),
    brand: resolveSiteModerationMode(settings, "brand"),
    model: resolveSiteModerationMode(settings, "model"),
    ranking: resolveSiteModerationMode(settings, "ranking"),
    ratingTarget: resolveSiteModerationMode(settings, "ratingTarget")
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
    article:
      patch.moderationModes?.article ??
      (fromLegacy.article !== undefined ? (fromLegacy.article ? "ai" : "manual") : undefined) ??
      current.article,
    moment:
      patch.moderationModes?.moment ??
      (fromLegacy.moment !== undefined ? (fromLegacy.moment ? "ai" : "manual") : undefined) ??
      current.moment,
    comment:
      patch.moderationModes?.comment ??
      (fromLegacy.comment !== undefined ? (fromLegacy.comment ? "ai" : "manual") : undefined) ??
      current.comment,
    review:
      patch.moderationModes?.review ??
      (fromLegacy.review !== undefined ? (fromLegacy.review ? "ai" : "manual") : undefined) ??
      current.review,
    brand:
      patch.moderationModes?.brand ??
      (fromLegacy.brand !== undefined ? (fromLegacy.brand ? "ai" : "manual") : undefined) ??
      current.brand,
    model:
      patch.moderationModes?.model ??
      (fromLegacy.model !== undefined ? (fromLegacy.model ? "ai" : "manual") : undefined) ??
      current.model,
    ranking:
      patch.moderationModes?.ranking ??
      (fromLegacy.ranking !== undefined ? (fromLegacy.ranking ? "ai" : "manual") : undefined) ??
      current.ranking,
    ratingTarget:
      patch.moderationModes?.ratingTarget ??
      (fromLegacy.ratingTarget !== undefined
        ? (fromLegacy.ratingTarget ? "ai" : "manual")
        : undefined) ??
      current.ratingTarget
  } satisfies SiteSettings["moderationModes"];
}

// Keep admin-side writes aligned with the server's tri-state merge semantics.
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
