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
  async isAiReviewEnabledForPost(type: "article" | "moment") {
    const settings = await this.getResolvedSettings();
    return type === "article" ? settings.articleModerationEnabled : settings.momentModerationEnabled;
  },
  async isAiReviewEnabledForBrandApplication() {
    return (await this.getResolvedSettings()).brandModerationEnabled;
  },
  async isAiReviewEnabledForModelSubmission() {
    return (await this.getResolvedSettings()).modelModerationEnabled;
  },
  async isAiReviewEnabledForRatingTarget() {
    return (await this.getResolvedSettings()).ratingTargetModerationEnabled;
  },
  async isAiReviewEnabledForComment() {
    return (await this.getResolvedSettings()).commentModerationEnabled;
  },
  async isAiReviewEnabledForReview() {
    return (await this.getResolvedSettings()).reviewModerationEnabled;
  },
  async isAiReviewEnabledForRanking() {
    return (await this.getResolvedSettings()).rankingModerationEnabled;
  },
  async isAiReviewEnabledForFileBizType(
    bizType:
      | "avatar-image"
      | "post-image"
      | "post-video"
      | "aircraft-cover-image"
      | "aircraft-video"
      | "ranking-cover-image"
      | "ranking-item-image"
      | "report-image"
  ) {
    const settings = await this.getResolvedSettings();
    switch (bizType) {
      case "post-image":
      case "post-video":
        return settings.postModerationEnabled;
      case "aircraft-cover-image":
      case "aircraft-video":
        return settings.modelModerationEnabled;
      case "ranking-cover-image":
      case "ranking-item-image":
        return settings.rankingModerationEnabled || settings.ratingTargetModerationEnabled;
      case "avatar-image":
        return true;
      case "report-image":
        return false;
    }
  },
  async shouldModeratePost(type: "article" | "moment") {
    return this.isAiReviewEnabledForPost(type);
  },
  async shouldModerateBrandApplication() {
    return this.isAiReviewEnabledForBrandApplication();
  },
  async shouldModerateModelSubmission() {
    return this.isAiReviewEnabledForModelSubmission();
  },
  async shouldModerateRatingTarget() {
    return this.isAiReviewEnabledForRatingTarget();
  }
};
