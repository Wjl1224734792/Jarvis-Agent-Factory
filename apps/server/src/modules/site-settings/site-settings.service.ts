import { siteSettingsRepo } from "./site-settings.repo";

const defaultSiteSettings = {
  postModerationEnabled: true,
  commentModerationEnabled: false,
  reviewModerationEnabled: false,
  submissionModerationEnabled: true
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
      submissionModerationEnabled: current.submissionModerationEnabled
    };
  },
  async update(input: {
    postModerationEnabled: boolean;
    commentModerationEnabled: boolean;
    reviewModerationEnabled: boolean;
    submissionModerationEnabled: boolean;
  }) {
    const updated = await siteSettingsRepo.upsert(input);
    if (!updated) {
      return null;
    }

    return {
      postModerationEnabled: updated.postModerationEnabled,
      commentModerationEnabled: updated.commentModerationEnabled,
      reviewModerationEnabled: updated.reviewModerationEnabled,
      submissionModerationEnabled: updated.submissionModerationEnabled
    };
  }
};
