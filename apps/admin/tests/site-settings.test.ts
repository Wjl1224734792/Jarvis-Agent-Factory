import { describe, expect, it } from "vitest";
import type { SiteSettings } from "@feijia/schemas";
import {
  buildSiteSettingsUpdate,
  resolveSiteModerationMode,
  resolveSiteModerationModes
} from "../src/lib/site-settings";

function createSiteSettings(
  overrides: Partial<SiteSettings> = {}
): SiteSettings {
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
    moderationModes: {
      article: "ai",
      moment: "ai",
      comment: "manual",
      review: "manual",
      brand: "ai",
      model: "ai",
      ranking: "manual",
      ratingTarget: "ai"
    },
    ...overrides
  };
}

describe("site settings moderation helpers", () => {
  it("falls back to legacy booleans when moderationModes is missing", () => {
    const settings = createSiteSettings({
      postModerationEnabled: false,
      commentModerationEnabled: true,
      reviewModerationEnabled: false,
      submissionModerationEnabled: false,
      rankingModerationEnabled: false,
      articleModerationEnabled: false,
      momentModerationEnabled: false,
      brandModerationEnabled: true,
      modelModerationEnabled: false,
      ratingTargetModerationEnabled: false,
      moderationModes: undefined as unknown as SiteSettings["moderationModes"]
    });

    expect(resolveSiteModerationMode(settings, "article")).toBe("manual");
    expect(resolveSiteModerationMode(settings, "moment")).toBe("manual");
    expect(resolveSiteModerationMode(settings, "comment")).toBe("ai");
    expect(resolveSiteModerationMode(settings, "brand")).toBe("ai");
    expect(resolveSiteModerationMode(settings, "model")).toBe("manual");
    expect(resolveSiteModerationMode(settings, "ratingTarget")).toBe("manual");
  });

  it("returns a fully resolved moderationModes object", () => {
    const settings = createSiteSettings({
      moderationModes: {
        article: "automatic",
        moment: "manual",
        comment: "ai",
        review: "manual",
        brand: "automatic",
        model: "ai",
        ranking: "manual",
        ratingTarget: "automatic"
      }
    });

    expect(resolveSiteModerationModes(settings)).toEqual({
      article: "automatic",
      moment: "manual",
      comment: "ai",
      review: "manual",
      brand: "automatic",
      model: "ai",
      ranking: "manual",
      ratingTarget: "automatic"
    });
  });

  it("builds tri-state updates while keeping legacy booleans synchronized", () => {
    const update = buildSiteSettingsUpdate(createSiteSettings(), {
      moderationModes: {
        article: "automatic",
        comment: "ai",
        model: "manual"
      }
    });

    expect(update.moderationModes).toEqual({
      article: "automatic",
      moment: "ai",
      comment: "ai",
      review: "manual",
      brand: "ai",
      model: "manual",
      ranking: "manual",
      ratingTarget: "ai"
    });
    expect(update.articleModerationEnabled).toBe(true);
    expect(update.commentModerationEnabled).toBe(true);
    expect(update.modelModerationEnabled).toBe(false);
    expect(update.postModerationEnabled).toBe(true);
    expect(update.submissionModerationEnabled).toBe(false);
  });

  it("maps legacy boolean patches back into manual and ai modes", () => {
    const update = buildSiteSettingsUpdate(createSiteSettings(), {
      postModerationEnabled: false,
      brandModerationEnabled: false
    });

    expect(update.moderationModes?.article).toBe("manual");
    expect(update.moderationModes?.moment).toBe("manual");
    expect(update.moderationModes?.brand).toBe("manual");
    expect(update.postModerationEnabled).toBe(false);
    expect(update.articleModerationEnabled).toBe(false);
    expect(update.momentModerationEnabled).toBe(false);
    expect(update.brandModerationEnabled).toBe(false);
  });
});
