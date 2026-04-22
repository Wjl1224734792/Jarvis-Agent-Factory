import type {
  ModerationMode,
  SiteSettings,
  UpdateSiteSettingsInput
} from "@feijia/schemas";
import { siteSettingsRepo } from "./site-settings.repo";

type ModerationModes = SiteSettings["moderationModes"];

const defaultModerationModes: ModerationModes = {
  article: "ai",
  moment: "ai",
  comment: "ai",
  review: "manual",
  brand: "ai",
  model: "ai",
  ranking: "manual",
  ratingTarget: "ai"
};

function parseModerationModes(raw: string | null | undefined) {
  if (!raw?.trim()) {
    return defaultModerationModes;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof ModerationModes, ModerationMode>>;
    return {
      article: parsed.article ?? defaultModerationModes.article,
      moment: parsed.moment ?? defaultModerationModes.moment,
      comment: parsed.comment ?? defaultModerationModes.comment,
      review: parsed.review ?? defaultModerationModes.review,
      brand: parsed.brand ?? defaultModerationModes.brand,
      model: parsed.model ?? defaultModerationModes.model,
      ranking: parsed.ranking ?? defaultModerationModes.ranking,
      ratingTarget: parsed.ratingTarget ?? defaultModerationModes.ratingTarget
    } satisfies ModerationModes;
  } catch {
    return defaultModerationModes;
  }
}

function buildLegacyModerationBooleans(modes: ModerationModes) {
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
  current: ModerationModes,
  patch: Partial<ModerationModes>,
  legacyPatch: UpdateSiteSettingsInput
) {
  const fromLegacy = {
    article: legacyPatch.postModerationEnabled ?? legacyPatch.articleModerationEnabled,
    moment: legacyPatch.postModerationEnabled ?? legacyPatch.momentModerationEnabled,
    comment: legacyPatch.commentModerationEnabled,
    review: legacyPatch.reviewModerationEnabled,
    brand: legacyPatch.brandModerationEnabled,
    model: legacyPatch.submissionModerationEnabled ?? legacyPatch.modelModerationEnabled,
    ranking: legacyPatch.rankingModerationEnabled,
    ratingTarget: legacyPatch.ratingTargetModerationEnabled
  } satisfies Partial<Record<keyof ModerationModes, boolean | undefined>>;

  return {
    article:
      patch.article ??
      (fromLegacy.article !== undefined ? (fromLegacy.article ? "ai" : "manual") : undefined) ??
      current.article,
    moment:
      patch.moment ??
      (fromLegacy.moment !== undefined ? (fromLegacy.moment ? "ai" : "manual") : undefined) ??
      current.moment,
    comment:
      patch.comment ??
      (fromLegacy.comment !== undefined ? (fromLegacy.comment ? "ai" : "manual") : undefined) ??
      current.comment,
    review:
      patch.review ??
      (fromLegacy.review !== undefined ? (fromLegacy.review ? "ai" : "manual") : undefined) ??
      current.review,
    brand:
      patch.brand ??
      (fromLegacy.brand !== undefined ? (fromLegacy.brand ? "ai" : "manual") : undefined) ??
      current.brand,
    model:
      patch.model ??
      (fromLegacy.model !== undefined ? (fromLegacy.model ? "ai" : "manual") : undefined) ??
      current.model,
    ranking:
      patch.ranking ??
      (fromLegacy.ranking !== undefined ? (fromLegacy.ranking ? "ai" : "manual") : undefined) ??
      current.ranking,
    ratingTarget:
      patch.ratingTarget ??
      (fromLegacy.ratingTarget !== undefined
        ? (fromLegacy.ratingTarget ? "ai" : "manual")
        : undefined) ??
      current.ratingTarget
  } satisfies ModerationModes;
}

function toResolvedSettings(input?: {
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
  moderationModes?: string | null;
} | null): SiteSettings {
  const moderationModes = input
    ? input.moderationModes === null || input.moderationModes === undefined
      ? mergeModerationModes(
          defaultModerationModes,
          {},
          {
            postModerationEnabled: input.postModerationEnabled,
            commentModerationEnabled: input.commentModerationEnabled,
            reviewModerationEnabled: input.reviewModerationEnabled,
            submissionModerationEnabled: input.submissionModerationEnabled,
            rankingModerationEnabled: input.rankingModerationEnabled,
            articleModerationEnabled: input.articleModerationEnabled,
            momentModerationEnabled: input.momentModerationEnabled,
            brandModerationEnabled: input.brandModerationEnabled,
            modelModerationEnabled: input.modelModerationEnabled,
            ratingTargetModerationEnabled: input.ratingTargetModerationEnabled
          }
        )
      : parseModerationModes(input.moderationModes)
    : defaultModerationModes;
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

export const siteSettingsService = {
  async getResolvedSettings() {
    return toResolvedSettings(await siteSettingsRepo.get());
  },
  async update(input: UpdateSiteSettingsInput) {
    const current = await this.getResolvedSettings();
    const moderationModes = mergeModerationModes(
      current.moderationModes,
      input.moderationModes ?? {},
      input
    );
    const legacyFlags = buildLegacyModerationBooleans(moderationModes);

    const updated = await siteSettingsRepo.upsert({
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
      moderationModes: JSON.stringify(moderationModes)
    });

    return updated ? toResolvedSettings(updated) : null;
  },
  async getPostModerationMode(type: "article" | "moment") {
    const modes = (await this.getResolvedSettings()).moderationModes;
    return type === "article" ? modes.article : modes.moment;
  },
  async getBrandModerationMode() {
    return (await this.getResolvedSettings()).moderationModes.brand;
  },
  async getModelSubmissionModerationMode() {
    return (await this.getResolvedSettings()).moderationModes.model;
  },
  async getRatingTargetModerationMode() {
    return (await this.getResolvedSettings()).moderationModes.ratingTarget;
  },
  async getCommentModerationMode() {
    return (await this.getResolvedSettings()).moderationModes.comment;
  },
  async getReviewModerationMode() {
    return (await this.getResolvedSettings()).moderationModes.review;
  },
  async getRankingModerationMode() {
    return (await this.getResolvedSettings()).moderationModes.ranking;
  },
  async isAiReviewEnabledForPost(type: "article" | "moment") {
    return (await this.getPostModerationMode(type)) === "ai";
  },
  async isAiReviewEnabledForBrandApplication() {
    return (await this.getBrandModerationMode()) === "ai";
  },
  async isAiReviewEnabledForModelSubmission() {
    return (await this.getModelSubmissionModerationMode()) === "ai";
  },
  async isAiReviewEnabledForRatingTarget() {
    return (await this.getRatingTargetModerationMode()) === "ai";
  },
  async isAiReviewEnabledForComment() {
    return (await this.getCommentModerationMode()) === "ai";
  },
  async isAiReviewEnabledForReview() {
    return (await this.getReviewModerationMode()) === "ai";
  },
  async isAiReviewEnabledForRanking() {
    return (await this.getRankingModerationMode()) === "ai";
  },
  async isAiReviewEnabledForFileBizType() {
    return false;
  },
  async shouldModeratePost(type: "article" | "moment") {
    return (await this.getPostModerationMode(type)) !== "automatic";
  },
  async shouldModerateBrandApplication() {
    return (await this.getBrandModerationMode()) !== "automatic";
  },
  async shouldModerateModelSubmission() {
    return (await this.getModelSubmissionModerationMode()) !== "automatic";
  },
  async shouldModerateRatingTarget() {
    return (await this.getRatingTargetModerationMode()) !== "automatic";
  }
};
