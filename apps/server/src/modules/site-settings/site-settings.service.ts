import { siteSettingsRepo } from "./site-settings.repo";

const defaultSiteSettings = {
  postModerationEnabled: true,
  commentModerationEnabled: false,
  reviewModerationEnabled: false,
  submissionModerationEnabled: true,
  rankingModerationEnabled: false
} as const;

export const siteSettingsService = {
  async getResolvedSettings() {
    const current = await siteSettingsRepo.get();
    if (!current) {
      return defaultSiteSettings;
    }

    return {
      postModerationEnabled: current.postModerationEnabled,
      commentModerationEnabled: current.commentModerationEnabled,
      reviewModerationEnabled: current.reviewModerationEnabled,
      submissionModerationEnabled: current.submissionModerationEnabled,
      rankingModerationEnabled: current.rankingModerationEnabled
    };
  },
  async update(input: {
    postModerationEnabled: boolean;
    commentModerationEnabled: boolean;
    reviewModerationEnabled: boolean;
    submissionModerationEnabled: boolean;
    rankingModerationEnabled?: boolean;
  }) {
    const current = await this.getResolvedSettings();
    const updated = await siteSettingsRepo.upsert({
      postModerationEnabled: input.postModerationEnabled,
      commentModerationEnabled: input.commentModerationEnabled,
      reviewModerationEnabled: input.reviewModerationEnabled,
      submissionModerationEnabled: input.submissionModerationEnabled,
      rankingModerationEnabled: input.rankingModerationEnabled ?? current.rankingModerationEnabled
    });
    if (!updated) {
      return null;
    }

    return {
      postModerationEnabled: updated.postModerationEnabled,
      commentModerationEnabled: updated.commentModerationEnabled,
      reviewModerationEnabled: updated.reviewModerationEnabled,
      submissionModerationEnabled: updated.submissionModerationEnabled,
      rankingModerationEnabled: updated.rankingModerationEnabled
    };
  }
};
