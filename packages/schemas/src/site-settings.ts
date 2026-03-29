import { z } from "zod";

export const siteSettingsSchema = z.object({
  postModerationEnabled: z.boolean(),
  commentModerationEnabled: z.boolean(),
  reviewModerationEnabled: z.boolean(),
  submissionModerationEnabled: z.boolean(),
  rankingModerationEnabled: z.boolean(),
  articleModerationEnabled: z.boolean().default(true),
  momentModerationEnabled: z.boolean().default(true),
  brandModerationEnabled: z.boolean().default(true),
  modelModerationEnabled: z.boolean().default(true),
  rankingItemModerationEnabled: z.boolean().default(true)
});

export const siteSettingsResponseSchema = z.object({
  item: siteSettingsSchema
});

export const updateSiteSettingsInputSchema = z.object({
  postModerationEnabled: z.boolean().optional(),
  commentModerationEnabled: z.boolean().optional(),
  reviewModerationEnabled: z.boolean().optional(),
  submissionModerationEnabled: z.boolean().optional(),
  rankingModerationEnabled: z.boolean().optional(),
  articleModerationEnabled: z.boolean().optional(),
  momentModerationEnabled: z.boolean().optional(),
  brandModerationEnabled: z.boolean().optional(),
  modelModerationEnabled: z.boolean().optional(),
  rankingItemModerationEnabled: z.boolean().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one site setting field is required."
});
