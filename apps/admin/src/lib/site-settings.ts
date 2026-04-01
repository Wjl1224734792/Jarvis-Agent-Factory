import type { SiteSettings } from "./api-client";

export function buildSiteSettingsUpdate(
  current: SiteSettings,
  patch: Partial<SiteSettings>
): SiteSettings {
  const next = {
    articleModerationEnabled: current.articleModerationEnabled ?? current.postModerationEnabled,
    momentModerationEnabled: current.momentModerationEnabled ?? current.postModerationEnabled,
    commentModerationEnabled: current.commentModerationEnabled ?? true,
    reviewModerationEnabled: current.reviewModerationEnabled ?? true,
    brandModerationEnabled: current.brandModerationEnabled ?? true,
    modelModerationEnabled:
      current.modelModerationEnabled ?? current.submissionModerationEnabled ?? true,
    rankingModerationEnabled: current.rankingModerationEnabled ?? true,
    ratingTargetModerationEnabled:
      current.ratingTargetModerationEnabled ?? current.rankingModerationEnabled ?? true,
    postModerationEnabled: current.postModerationEnabled,
    submissionModerationEnabled: current.submissionModerationEnabled ?? true,
    updatedAt: current.updatedAt,
    ...patch
  };

  return {
    ...next,
    postModerationEnabled:
      Boolean(next.articleModerationEnabled) || Boolean(next.momentModerationEnabled),
    submissionModerationEnabled: Boolean(next.modelModerationEnabled)
  };
}
