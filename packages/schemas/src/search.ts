import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().positive().max(50).default(24)
});

export const siteSearchQuerySchema = searchQuerySchema;
export const adminSearchQuerySchema = searchQuerySchema;

export const siteSearchResultTypeSchema = z.enum([
  "post_article",
  "post_moment",
  "model",
  "ranking",
  "rating_target",
  "user"
]);

const siteSearchResultBaseSchema = z.object({
  id: z.string().min(1),
  type: siteSearchResultTypeSchema,
  title: z.string().min(1),
  subtitle: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  href: z.string().min(1),
  matchedField: z.string().min(1),
  score: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().nullable().default(null)
});

export const siteSearchResultSchema = z.discriminatedUnion("type", [
  siteSearchResultBaseSchema.extend({ type: z.literal("post_article") }),
  siteSearchResultBaseSchema.extend({ type: z.literal("post_moment") }),
  siteSearchResultBaseSchema.extend({ type: z.literal("model") }),
  siteSearchResultBaseSchema.extend({ type: z.literal("ranking") }),
  siteSearchResultBaseSchema.extend({ type: z.literal("rating_target") }),
  siteSearchResultBaseSchema.extend({ type: z.literal("user") })
]);

export const siteSearchResponseSchema = z.object({
  query: z.string(),
  total: z.number().int().nonnegative(),
  items: z.array(siteSearchResultSchema)
});

export const adminSearchSectionSchema = z.enum(["moderation", "operations", "management"]);

export const adminSearchResultTypeSchema = z.enum([
  "post_article",
  "post_moment",
  "post_comment",
  "model_comment",
  "review",
  "review_comment",
  "ranking_comment",
  "rating_target_comment",
  "brand_application",
  "aircraft_submission",
  "ranking",
  "rating_target",
  "report",
  "official_article",
  "model",
  "brand",
  "category",
  "content_category"
]);

const adminSearchResultBaseSchema = z.object({
  id: z.string().min(1),
  type: adminSearchResultTypeSchema,
  section: adminSearchSectionSchema,
  title: z.string().min(1),
  subtitle: z.string().nullable().default(null),
  status: z.string().nullable().default(null),
  statusLabel: z.string().nullable().default(null),
  targetPath: z.string().min(1),
  matchedField: z.string().min(1),
  score: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().nullable().default(null)
});

export const adminSearchResultSchema = z.discriminatedUnion("type", [
  adminSearchResultBaseSchema.extend({ type: z.literal("post_article") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("post_moment") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("post_comment") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("model_comment") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("review") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("review_comment") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("ranking_comment") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("rating_target_comment") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("brand_application") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("aircraft_submission") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("ranking") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("rating_target") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("report") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("official_article") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("model") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("brand") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("category") }),
  adminSearchResultBaseSchema.extend({ type: z.literal("content_category") })
]);

export const adminSearchResponseSchema = z.object({
  query: z.string(),
  total: z.number().int().nonnegative(),
  items: z.array(adminSearchResultSchema)
});

export type SiteSearchResult = z.infer<typeof siteSearchResultSchema>;
export type SiteSearchResponse = z.infer<typeof siteSearchResponseSchema>;
export type AdminSearchResult = z.infer<typeof adminSearchResultSchema>;
export type AdminSearchResponse = z.infer<typeof adminSearchResponseSchema>;
