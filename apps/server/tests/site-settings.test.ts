import { describe, expect, it, vi } from "vitest";

const siteSettingsRepoMock = {
  get: vi.fn(),
  upsert: vi.fn()
};

vi.mock("../src/modules/site-settings/site-settings.repo", () => ({
  siteSettingsRepo: siteSettingsRepoMock
}));

function buildSettingsRecord(overrides: Partial<{
  postModerationEnabled: boolean;
  commentModerationEnabled: boolean;
  reviewModerationEnabled: boolean;
  submissionModerationEnabled: boolean;
  rankingModerationEnabled: boolean;
  articleModerationEnabled: boolean;
  momentModerationEnabled: boolean;
  brandModerationEnabled: boolean;
  modelModerationEnabled: boolean;
  ratingTargetModerationEnabled: boolean;
}> = {}) {
  return {
    postModerationEnabled: true,
    commentModerationEnabled: false,
    reviewModerationEnabled: false,
    submissionModerationEnabled: true,
    rankingModerationEnabled: false,
    articleModerationEnabled: true,
    momentModerationEnabled: true,
    brandModerationEnabled: true,
    modelModerationEnabled: true,
    ratingTargetModerationEnabled: true,
    ...overrides
  };
}

describe("site settings service", () => {
  it("returns default moderation settings when no settings row exists", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(null);

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const settings = await siteSettingsService.getResolvedSettings();

    expect(settings.postModerationEnabled).toBe(true);
    expect(settings.commentModerationEnabled).toBe(false);
    expect(settings.reviewModerationEnabled).toBe(false);
    expect(settings.submissionModerationEnabled).toBe(true);
    expect(settings.rankingModerationEnabled).toBe(false);
    expect(settings.articleModerationEnabled).toBe(true);
    expect(settings.momentModerationEnabled).toBe(true);
    expect(settings.brandModerationEnabled).toBe(true);
    expect(settings.modelModerationEnabled).toBe(true);
    expect(settings.ratingTargetModerationEnabled).toBe(true);
  });

  it("maps file-type moderation defaults to current settings", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(
      buildSettingsRecord({
        postModerationEnabled: false,
        modelModerationEnabled: false,
        rankingModerationEnabled: false,
        ratingTargetModerationEnabled: false
      })
    );

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const avatarEnabled = await siteSettingsService.isAiReviewEnabledForFileBizType("avatar-image");
    const postImageEnabled = await siteSettingsService.isAiReviewEnabledForFileBizType("post-image");
    const reportImageEnabled = await siteSettingsService.isAiReviewEnabledForFileBizType("report-image");
    const modelImageEnabled = await siteSettingsService.isAiReviewEnabledForFileBizType("aircraft-cover-image");

    expect(avatarEnabled).toBe(true);
    expect(postImageEnabled).toBe(false);
    expect(modelImageEnabled).toBe(false);
    expect(reportImageEnabled).toBe(false);
  });

  it("keeps post/article/moment moderation synchronized during partial updates", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(buildSettingsRecord());
    siteSettingsRepoMock.upsert.mockImplementation(async (input: Parameters<typeof buildSettingsRecord>[0]) =>
      buildSettingsRecord(input)
    );

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const updated = await siteSettingsService.update({
      postModerationEnabled: false
    });

    expect(updated).toBeTruthy();
    if (!updated) {
      return;
    }

    expect(updated.postModerationEnabled).toBe(false);
    expect(updated.articleModerationEnabled).toBe(false);
    expect(updated.momentModerationEnabled).toBe(false);
    expect(updated.submissionModerationEnabled).toBe(true);
    expect(updated.modelModerationEnabled).toBe(true);
  });
});
