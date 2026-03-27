import { z } from "zod";
import { userSummarySchema } from "./auth";
import { aircraftCategorySchema, brandSchema, powerTypeSchema } from "./models";
import { reviewRatingSchema } from "./reviews";

export const rankingTypeSchema = z.enum(["official", "community"]);
export const rankingItemAddPolicySchema = z.enum(["public", "owner"]);

const linkedRankingModelSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().nullable(),
  powerType: powerTypeSchema,
  category: aircraftCategorySchema.pick({
    id: true,
    slug: true,
    name: true
  }),
  brand: brandSchema.pick({
    id: true,
    slug: true,
    name: true
  })
});

export const rankingViewerStateSchema = z.object({
  canEdit: z.boolean(),
  canAddItems: z.boolean()
});

export const rankingItemSchema = z.object({
  id: z.string().min(1),
  rankingId: z.string().min(1),
  rank: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().nullable(),
  imageUrl: z.string().nullable(),
  brandName: z.string().nullable(),
  linkedModel: linkedRankingModelSchema.nullable(),
  averageScore: z.number().min(0).max(10),
  totalRatings: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  myRating: reviewRatingSchema.nullable()
});

export const rankingCommentSchema = z.object({
  id: z.string().min(1),
  rankingId: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: userSummarySchema
});

export const rankingItemCommentSchema = z.object({
  id: z.string().min(1),
  rankingItemId: z.string().min(1),
  content: z.string().min(1),
  rating: reviewRatingSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: userSummarySchema
});

const ratingBreakdownCountSchema = z.number().int().nonnegative();

export const rankingItemRatingBreakdownSchema = z.tuple([
  z.object({ score: z.literal(5), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(4), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(3), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(2), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(1), count: ratingBreakdownCountSchema })
]);

export const rankingListItemSchema = z.object({
  id: z.string().min(1),
  type: rankingTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  coverImageUrl: z.string().nullable(),
  itemAddPolicy: rankingItemAddPolicySchema,
  averageScore: z.number().min(0).max(10),
  commentCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  author: userSummarySchema,
  viewer: rankingViewerStateSchema,
  items: z.array(rankingItemSchema).max(3)
});

export const officialRankingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  algorithmNote: z.string().min(1),
  generatedAt: z.string().datetime(),
  spotlight: rankingItemSchema.nullable(),
  items: z.array(rankingItemSchema)
});

export const rankingDetailSchema = rankingListItemSchema.extend({
  comments: z.array(rankingCommentSchema),
  items: z.array(rankingItemSchema)
});

export const rankingItemDetailSchema = rankingItemSchema.extend({
  ranking: z.object({
    id: z.string().min(1),
    title: z.string().min(1)
  }),
  comments: z.array(rankingItemCommentSchema),
  myReview: rankingItemCommentSchema.nullable(),
  ratingBreakdown: rankingItemRatingBreakdownSchema
});

export const rankingsResponseSchema = z.object({
  official: officialRankingSchema,
  community: z.array(rankingListItemSchema)
});

const rankingDraftItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(500).nullable(),
  imageUrl: z.string().trim().min(1).nullable(),
  brandName: z.string().trim().max(80).nullable(),
  linkedModelSlug: z.string().trim().min(1).nullable()
});

export const createRankingInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(2000),
  coverImageUrl: z.string().trim().min(1).nullable(),
  itemAddPolicy: rankingItemAddPolicySchema,
  items: z.array(rankingDraftItemSchema).min(1).max(20)
});

export const updateRankingInputSchema = createRankingInputSchema;

export const createRankingItemInputSchema = rankingDraftItemSchema;
export const addRankingItemInputSchema = createRankingItemInputSchema;

export const rankingResponseSchema = z.object({
  item: rankingDetailSchema
});
export const rankingItemResponseSchema = rankingResponseSchema;

export const rankingItemDetailResponseSchema = z.object({
  item: rankingItemDetailSchema
});

export const createRankingCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const createRankingCommentResponseSchema = z.object({
  item: rankingCommentSchema
});

export const submitRankingItemRatingInputSchema = z.object({
  rating: reviewRatingSchema
});

export const submitRankingItemRatingResponseSchema = z.object({
  item: rankingItemSchema
});

export const createRankingItemCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const createRankingItemCommentResponseSchema = z.object({
  item: rankingItemCommentSchema
});

export const submitRankingItemReviewInputSchema = z.object({
  rating: reviewRatingSchema,
  content: z.string().trim().min(1).max(1000)
});

export const submitRankingItemReviewResponseSchema = z.object({
  item: rankingItemDetailSchema
});

export type RankingType = z.infer<typeof rankingTypeSchema>;
export type RankingItemAddPolicy = z.infer<typeof rankingItemAddPolicySchema>;
export type RankingItem = z.infer<typeof rankingItemSchema>;
export type RankingListItem = z.infer<typeof rankingListItemSchema>;
export type RankingDetail = z.infer<typeof rankingDetailSchema>;
