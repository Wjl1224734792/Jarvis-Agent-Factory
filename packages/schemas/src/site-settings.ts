import { z } from "zod";

export const moderationModeSchema = z.enum(["manual", "ai", "automatic"]);

export const moderationModesSchema = z.object({
  article: moderationModeSchema,
  moment: moderationModeSchema,
  comment: moderationModeSchema,
  review: moderationModeSchema,
  brand: moderationModeSchema,
  model: moderationModeSchema,
  ranking: moderationModeSchema,
  ratingTarget: moderationModeSchema
});

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
  ratingTargetModerationEnabled: z.boolean().default(true),
  moderationModes: moderationModesSchema
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
  ratingTargetModerationEnabled: z.boolean().optional(),
  moderationModes: moderationModesSchema.partial().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one site setting field is required."
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsInputSchema>;
export type ModerationMode = z.infer<typeof moderationModeSchema>;
