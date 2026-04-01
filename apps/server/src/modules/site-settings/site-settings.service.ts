import { siteSettingsRepo } from "./site-settings.repo";

const defaultSiteSettings = {
  postModerationEnabled: true,
  commentModerationEnabled: false,
  reviewModerationEnabled: false,
  submissionModerationEnabled: true,
  rankingModerationEnabled: false,
  articleModerationEnabled: true,
  momentModerationEnabled: true,
  brandModerationEnabled: true,
  modelModerationEnabled: true,
  ratingTargetModerationEnabled: true
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
      rankingModerationEnabled: current.rankingModerationEnabled,
      articleModerationEnabled: current.articleModerationEnabled,
      momentModerationEnabled: current.momentModerationEnabled,
      brandModerationEnabled: current.brandModerationEnabled,
      modelModerationEnabled: current.modelModerationEnabled,
      ratingTargetModerationEnabled: current.ratingTargetModerationEnabled
    };
  },
  async update(input: {
    postModerationEnabled?: boolean;
    commentModerationEnabled?: boolean;
    reviewModerationEnabled?: boolean;
    submissionModerationEnabled?: boolean;
    rankingModerationEnabled?: boolean;
    articleModerationEnabled?: boolean;
    momentModerationEnabled?: boolean;
    brandModerationEnabled?: boolean;
    modelModerationEnabled?: boolean;
    ratingTargetModerationEnabled?: boolean;
  }) {
    const current = await this.getResolvedSettings();
    const articleModerationEnabled =
      input.articleModerationEnabled ?? input.postModerationEnabled ?? current.articleModerationEnabled;
    const momentModerationEnabled =
      input.momentModerationEnabled ?? input.postModerationEnabled ?? current.momentModerationEnabled;
    const modelModerationEnabled =
      input.modelModerationEnabled ?? input.submissionModerationEnabled ?? current.modelModerationEnabled;
    const updated = await siteSettingsRepo.upsert({
      postModerationEnabled:
        input.postModerationEnabled ?? (articleModerationEnabled || momentModerationEnabled),
      commentModerationEnabled:
        input.commentModerationEnabled ?? current.commentModerationEnabled,
      reviewModerationEnabled: input.reviewModerationEnabled ?? current.reviewModerationEnabled,
      submissionModerationEnabled:
        input.submissionModerationEnabled ?? modelModerationEnabled,
      rankingModerationEnabled: input.rankingModerationEnabled ?? current.rankingModerationEnabled,
      articleModerationEnabled,
      momentModerationEnabled,
      brandModerationEnabled: input.brandModerationEnabled ?? current.brandModerationEnabled,
      modelModerationEnabled,
      ratingTargetModerationEnabled:
        input.ratingTargetModerationEnabled ?? current.ratingTargetModerationEnabled
    });
    if (!updated) {
      return null;
    }

    return {
      postModerationEnabled: updated.postModerationEnabled,
      commentModerationEnabled: updated.commentModerationEnabled,
      reviewModerationEnabled: updated.reviewModerationEnabled,
      submissionModerationEnabled: updated.submissionModerationEnabled,
      rankingModerationEnabled: updated.rankingModerationEnabled,
      articleModerationEnabled: updated.articleModerationEnabled,
      momentModerationEnabled: updated.momentModerationEnabled,
      brandModerationEnabled: updated.brandModerationEnabled,
      modelModerationEnabled: updated.modelModerationEnabled,
      ratingTargetModerationEnabled: updated.ratingTargetModerationEnabled
    };
  },
  async shouldModeratePost(type: "article" | "moment") {
    const settings = await this.getResolvedSettings();
    return type === "article" ? settings.articleModerationEnabled : settings.momentModerationEnabled;
  },
  async shouldModerateBrandApplication() {
    return (await this.getResolvedSettings()).brandModerationEnabled;
  },
  async shouldModerateModelSubmission() {
    return (await this.getResolvedSettings()).modelModerationEnabled;
  },
  async shouldModerateRatingTarget() {
    return (await this.getResolvedSettings()).ratingTargetModerationEnabled;
  }
};
