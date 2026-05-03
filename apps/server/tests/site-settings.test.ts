import { afterEach, describe, expect, it, vi } from "vitest";

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
  moderationModes: string | null;
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
    moderationModes: "{}",
    ...overrides
  };
}

const expectedDefaultModerationModes = {
  article: "ai",
  moment: "ai",
  comment: "ai",
  review: "manual",
  brand: "ai",
  model: "ai",
  ranking: "manual",
  ratingTarget: "ai"
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("site settings service", () => {
  it("returns tri-state moderation mode defaults when no settings row exists", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(null);

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const settings = await siteSettingsService.getResolvedSettings();

    expect(settings.moderationModes).toEqual(expectedDefaultModerationModes);
    expect(settings.postModerationEnabled).toBe(true);
    expect(settings.commentModerationEnabled).toBe(true);
    expect(settings.reviewModerationEnabled).toBe(false);
    expect(settings.submissionModerationEnabled).toBe(true);
    expect(settings.rankingModerationEnabled).toBe(false);
    expect(settings.articleModerationEnabled).toBe(true);
    expect(settings.momentModerationEnabled).toBe(true);
    expect(settings.brandModerationEnabled).toBe(true);
    expect(settings.modelModerationEnabled).toBe(true);
    expect(settings.ratingTargetModerationEnabled).toBe(true);
  });

  it("merges partial moderation mode payload with defaults", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(
      buildSettingsRecord({
        moderationModes: JSON.stringify({
          comment: "automatic",
          ranking: "ai"
        })
      })
    );

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const settings = await siteSettingsService.getResolvedSettings();

    expect(settings.moderationModes).toEqual({
      article: "ai",
      moment: "ai",
      comment: "automatic",
      review: "manual",
      brand: "ai",
      model: "ai",
      ranking: "ai",
      ratingTarget: "ai"
    });
  });

  it("falls back to default moderation modes when payload is malformed", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(
      buildSettingsRecord({
        moderationModes: "{not-json"
      })
    );

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const settings = await siteSettingsService.getResolvedSettings();

    expect(settings.moderationModes).toEqual(expectedDefaultModerationModes);
  });

  it("keeps legacy boolean fields compatible with tri-state modes", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(
      buildSettingsRecord({
        postModerationEnabled: false,
        commentModerationEnabled: true,
        reviewModerationEnabled: false,
        submissionModerationEnabled: false,
        rankingModerationEnabled: false,
        brandModerationEnabled: true,
        modelModerationEnabled: false,
        ratingTargetModerationEnabled: false,
        moderationModes: null
      })
    );

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const settings = await siteSettingsService.getResolvedSettings();

    expect(settings.moderationModes.article).toBe("manual");
    expect(settings.moderationModes.moment).toBe("manual");
    expect(settings.moderationModes.comment).toBe("ai");
    expect(settings.moderationModes.review).toBe("manual");
    expect(settings.moderationModes.model).toBe("manual");
    expect(settings.moderationModes.ranking).toBe("manual");
    expect(settings.moderationModes.ratingTarget).toBe("manual");
    expect(settings.postModerationEnabled).toBe(false);
    expect(settings.commentModerationEnabled).toBe(true);
  });

  it.each([
    { label: "manual", mode: "manual", ai: false, shouldModerate: true },
    { label: "ai", mode: "ai", ai: true, shouldModerate: true },
    { label: "automatic", mode: "automatic", ai: false, shouldModerate: false }
  ])(
    "maps article moderation mode %s to AI/manual behavior",
    async ({ mode, ai, shouldModerate: expectedShouldModerate }) => {
      siteSettingsRepoMock.get.mockResolvedValue(
        buildSettingsRecord({
          moderationModes: JSON.stringify({ article: mode }),
          // keep booleans explicit to avoid accidental inference from defaults
          postModerationEnabled: mode !== "manual",
          momentModerationEnabled: mode !== "manual",
          commentModerationEnabled: true,
          reviewModerationEnabled: false,
          submissionModerationEnabled: true,
          rankingModerationEnabled: false,
          articleModerationEnabled: false,
          brandModerationEnabled: true,
          modelModerationEnabled: true,
          ratingTargetModerationEnabled: true
        })
      );

      const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
      const isAiEnabled = await siteSettingsService.isAiReviewEnabledForPost("article");
      const shouldModerate = await siteSettingsService.shouldModeratePost("article");

      expect(isAiEnabled).toBe(ai);
      expect(shouldModerate).toBe(expectedShouldModerate);
    }
  );

  it("supports tri-state partial updates and persists merged moderationModes", async () => {
    siteSettingsRepoMock.get.mockResolvedValue(buildSettingsRecord());
    siteSettingsRepoMock.upsert.mockImplementation(async (input: Parameters<typeof buildSettingsRecord>[0] = {}) => {
      return buildSettingsRecord({
        ...input,
        moderationModes: input.moderationModes
      });
    });

    const { siteSettingsService } = await import("../src/modules/site-settings/site-settings.service");
    const updated = await siteSettingsService.update({
      moderationModes: {
        article: "manual",
        comment: "automatic",
        model: "manual"
      }
    });

    expect(updated).toBeTruthy();
    expect(updated?.moderationModes.article).toBe("manual");
    expect(updated?.moderationModes.comment).toBe("automatic");
    expect(updated?.moderationModes.model).toBe("manual");
    expect(updated?.postModerationEnabled).toBe(true);
    expect(updated?.commentModerationEnabled).toBe(true);
    expect(updated?.modelModerationEnabled).toBe(false);

    const upsertInput = siteSettingsRepoMock.upsert.mock.calls[0]?.[0];
    expect(upsertInput).toBeTruthy();
    if (!upsertInput) {
      return;
    }

    const parsedModes = JSON.parse(upsertInput.moderationModes) as Record<string, unknown>;
    expect(parsedModes).toEqual({
      article: "manual",
      moment: "ai",
      comment: "automatic",
      review: "manual",
      brand: "ai",
      model: "manual",
      ranking: "manual",
      ratingTarget: "ai"
    });
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
    expect(updated.moderationModes.article).toBe("manual");
    expect(updated.moderationModes.moment).toBe("manual");
  });
});
