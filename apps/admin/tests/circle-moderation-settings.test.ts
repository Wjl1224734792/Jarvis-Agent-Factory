import { describe, expect, it } from "vitest";
import type { SiteSettings } from "@feijia/schemas";
import {
  buildSiteSettingsUpdate,
  resolveSiteModerationMode,
  resolveSiteModerationModes,
  DEFAULT_MODERATION_MODES
} from "../src/lib/site-settings";

function makeSettings(
  overrides: Partial<SiteSettings> = {}
): SiteSettings {
  return {
    postModerationEnabled: true,
    commentModerationEnabled: false,
    reviewModerationEnabled: false,
    submissionModerationEnabled: true,
    rankingModerationEnabled: true,
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
      ratingTarget: "ai",
      circlePost: "ai",
      circleComment: "ai"
    },
    ...overrides
  };
}

describe("circle moderation settings", () => {
  describe("resolveSiteModerationMode for circle keys", () => {
    it("resolves circlePost mode from settings", () => {
      const settings = makeSettings();
      expect(resolveSiteModerationMode(settings, "circlePost")).toBe("ai");
    });

    it("resolves circleComment mode from settings", () => {
      const settings = makeSettings();
      expect(resolveSiteModerationMode(settings, "circleComment")).toBe("ai");
    });

    it("resolves circlePost manual mode", () => {
      const settings = makeSettings({
        moderationModes: {
          ...DEFAULT_MODERATION_MODES,
          circlePost: "manual"
        }
      });
      expect(resolveSiteModerationMode(settings, "circlePost")).toBe("manual");
    });

    it("resolves circleComment automatic mode", () => {
      const settings = makeSettings({
        moderationModes: {
          ...DEFAULT_MODERATION_MODES,
          circleComment: "automatic"
        }
      });
      expect(resolveSiteModerationMode(settings, "circleComment")).toBe("automatic");
    });

    it("falls back to default when settings is null", () => {
      // circle keys 无 legacy boolean 对应，默认启用 AI 审核
      expect(resolveSiteModerationMode(null, "circlePost")).toBe(
        DEFAULT_MODERATION_MODES.circlePost
      );
      expect(resolveSiteModerationMode(null, "circleComment")).toBe(
        DEFAULT_MODERATION_MODES.circleComment
      );
    });
  });

  describe("resolveSiteModerationModes includes circle keys", () => {
    it("returns all circle modes in the result", () => {
      const settings = makeSettings();
      const modes = resolveSiteModerationModes(settings);
      expect(modes.circlePost).toBe("ai");
      expect(modes.circleComment).toBe("ai");
    });
  });

  describe("buildSiteSettingsUpdate with circle modes", () => {
    it("patches circlePost mode via moderationModes", () => {
      const current = makeSettings();
      const update = buildSiteSettingsUpdate(current, {
        moderationModes: { circlePost: "manual" }
      });
      expect(update.moderationModes?.circlePost).toBe("manual");
      expect(update.moderationModes?.circleComment).toBe("ai");
    });

    it("patches circleComment mode via moderationModes", () => {
      const current = makeSettings();
      const update = buildSiteSettingsUpdate(current, {
        moderationModes: { circleComment: "automatic" }
      });
      expect(update.moderationModes?.circleComment).toBe("automatic");
      expect(update.moderationModes?.circlePost).toBe("ai");
    });

    it("patches both circle modes simultaneously", () => {
      const current = makeSettings();
      const update = buildSiteSettingsUpdate(current, {
        moderationModes: { circlePost: "manual", circleComment: "manual" }
      });
      expect(update.moderationModes?.circlePost).toBe("manual");
      expect(update.moderationModes?.circleComment).toBe("manual");
    });

    it("preserves existing non-circle modes when patching circle modes", () => {
      const current = makeSettings();
      const update = buildSiteSettingsUpdate(current, {
        moderationModes: { circlePost: "manual" }
      });
      expect(update.moderationModes?.article).toBe("ai");
      expect(update.moderationModes?.comment).toBe("manual");
      expect(update.moderationModes?.ranking).toBe("manual");
    });
  });
});
