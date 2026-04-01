import { describe, expect, it } from "vitest";
import {
  brandApplicationResponseSchema,
  createBrandApplicationInputSchema,
  siteSettingsResponseSchema,
  updateSiteSettingsInputSchema
} from "../src";

describe("site settings and brand application contracts", () => {
  it("parses independent moderation switches while keeping legacy fields compatible", () => {
    const payload = siteSettingsResponseSchema.parse({
      item: {
        postModerationEnabled: true,
        commentModerationEnabled: false,
        reviewModerationEnabled: false,
        submissionModerationEnabled: true,
        rankingModerationEnabled: true,
        articleModerationEnabled: true,
        momentModerationEnabled: false,
        brandModerationEnabled: true,
        modelModerationEnabled: true,
        ratingTargetModerationEnabled: false
      }
    });

    const update = updateSiteSettingsInputSchema.parse({
      articleModerationEnabled: false,
      momentModerationEnabled: true,
      brandModerationEnabled: false
    });

    expect(payload.item.articleModerationEnabled).toBe(true);
    expect(payload.item.ratingTargetModerationEnabled).toBe(false);
    expect(update.brandModerationEnabled).toBe(false);
  });

  it("parses brand application create and response payloads", () => {
    const input = createBrandApplicationInputSchema.parse({
      slug: "sky-labs",
      name: "Sky Labs",
      logoUrl: null,
      description: "Focus on multiple aircraft categories."
    });

    const payload = brandApplicationResponseSchema.parse({
      item: {
        id: "brand_apply_1",
        status: "pending",
        slug: input.slug,
        name: input.name,
        logoUrl: input.logoUrl,
        description: input.description,
        approvedBrandId: null,
        applicant: {
          id: "user_1",
          displayName: "Pilot",
          avatarUrl: null,
          role: "user"
        },
        createdAt: "2026-03-29T00:00:00.000Z",
        updatedAt: "2026-03-29T00:00:00.000Z"
      }
    });

    expect(payload.item.name).toBe("Sky Labs");
    expect(payload.item.status).toBe("pending");
  });
});
