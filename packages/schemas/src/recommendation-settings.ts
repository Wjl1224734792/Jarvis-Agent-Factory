import { z } from "zod";

// ── 内容类型推荐开关 ──

export const contentTypeEnableSchema = z.object({
  article: z.boolean().default(true),
  circlePost: z.boolean().default(true),
  model: z.boolean().default(true),
  ranking: z.boolean().default(true),
});

// ── 内容类型权重 ──

export const contentTypeWeightsSchema = z.object({
  article: z.number().min(0).max(5).default(1.0),
  circlePost: z.number().min(0).max(5).default(1.1),
  model: z.number().min(0).max(5).default(0.9),
  ranking: z.number().min(0).max(5).default(0.8),
});

// ── 推荐算法参数 ──

export const recommendationParamsSchema = z.object({
  articleHalfLifeHours: z.number().int().min(1).max(168).default(36),
  momentHalfLifeHours: z.number().int().min(1).max(168).default(18),
  interactionWeight: z.number().min(0).max(1).default(0.58),
  preferenceBoostWeight: z.number().int().min(0).max(50).default(5),
  modelViewWeight: z.number().min(0).max(10).default(0.5),
  modelSearchWeight: z.number().min(0).max(10).default(2.0),
  modelRankingRefWeight: z.number().min(0).max(20).default(8.0),
  discoveryHours: z.number().int().min(0).max(48).default(6),
  discoveryBoost: z.number().min(0).max(3).default(1.2),
});

// ── 完整推荐配置 ──

export const recommendationSettingsSchema = z.object({
  enabledContentTypes: contentTypeEnableSchema,
  contentTypeWeights: contentTypeWeightsSchema,
  params: recommendationParamsSchema,
});

// ── 响应/输入 ──

export const recommendationSettingsResponseSchema = z.object({
  item: recommendationSettingsSchema,
});

export const updateRecommendationSettingsInputSchema = z.object({
  enabledContentTypes: contentTypeEnableSchema.partial().optional(),
  contentTypeWeights: contentTypeWeightsSchema.partial().optional(),
  params: recommendationParamsSchema.partial().optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required.",
});

export type RecommendationSettings = z.infer<typeof recommendationSettingsSchema>;
export type UpdateRecommendationSettingsInput = z.infer<typeof updateRecommendationSettingsInputSchema>;
export type ContentTypeEnable = z.infer<typeof contentTypeEnableSchema>;
export type ContentTypeWeights = z.infer<typeof contentTypeWeightsSchema>;
export type RecommendationParams = z.infer<typeof recommendationParamsSchema>;
