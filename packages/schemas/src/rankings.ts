import { z } from "zod";
import { modelListItemSchema } from "./models";
import { reviewRatingSchema } from "./reviews";

export const reputationToneSchema = z.enum([
  "neutral",
  "featured",
  "positive",
  "caution",
  "negative"
]);

export const reputationTagSchema = z.object({
  label: z.string().min(1),
  tone: reputationToneSchema
});

export const rankingItemSchema = z.object({
  rank: z.number().int().positive(),
  model: modelListItemSchema,
  averageScore: z.number().min(0).max(10),
  bayesianScore: z.number().min(0).max(10),
  totalReviews: z.number().int().nonnegative(),
  myRating: reviewRatingSchema.nullable(),
  reputation: reputationTagSchema,
  highlight: z.string().nullable()
});

export const communityRankingItemSchema = rankingItemSchema.extend({
  note: z.string().nullable()
});

export const officialRankingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  algorithmNote: z.string().min(1),
  generatedAt: z.string().datetime(),
  spotlight: rankingItemSchema.nullable(),
  items: z.array(rankingItemSchema)
});

export const communityRankingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  curator: z.object({
    name: z.string().min(1),
    role: z.string().min(1)
  }),
  items: z.array(communityRankingItemSchema)
});

export const rankingsResponseSchema = z.object({
  official: officialRankingSchema,
  community: z.array(communityRankingSchema)
});

export type RankingItem = z.infer<typeof rankingItemSchema>;
export type CommunityRankingItem = z.infer<typeof communityRankingItemSchema>;
export type OfficialRanking = z.infer<typeof officialRankingSchema>;
export type CommunityRanking = z.infer<typeof communityRankingSchema>;
