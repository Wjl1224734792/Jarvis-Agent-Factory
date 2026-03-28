import { z } from "zod";

export const siteSettingsSchema = z.object({
  postModerationEnabled: z.boolean(),
  commentModerationEnabled: z.boolean(),
  reviewModerationEnabled: z.boolean(),
  submissionModerationEnabled: z.boolean()
});

export const siteSettingsResponseSchema = z.object({
  item: siteSettingsSchema
});

export const updateSiteSettingsInputSchema = z.object({
  postModerationEnabled: z.boolean(),
  commentModerationEnabled: z.boolean(),
  reviewModerationEnabled: z.boolean(),
  submissionModerationEnabled: z.boolean()
});
