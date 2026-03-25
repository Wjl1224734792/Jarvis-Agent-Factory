import { z } from "zod";
import { userSummarySchema } from "./auth";
import { brandSchema, powerTypeSchema, aircraftCategorySchema } from "./models";
import { reviewRatingSchema } from "./reviews";

export const rankingTypeSchema = z.enum(["official", "community"]);

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

export const rankingListItemSchema = z.object({
  id: z.string().min(1),
  type: rankingTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  coverImageUrl: z.string().nullable(),
  averageScore: z.number().min(0).max(10),
  commentCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  author: userSummarySchema,
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

export const rankingItemCommentSchema = z.object({
  id: z.string().min(1),
  rankingItemId: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: userSummarySchema
});

export const rankingItemDetailSchema = rankingItemSchema.extend({
  ranking: z.object({
    id: z.string().min(1),
    title: z.string().min(1)
  }),
  comments: z.array(rankingItemCommentSchema)
});

export const rankingsResponseSchema = z.object({
  official: officialRankingSchema,
  community: z.array(rankingListItemSchema)
});

export const createRankingInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(2000),
  coverImageUrl: z.string().trim().min(1).nullable(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        summary: z.string().trim().max(500).nullable(),
        imageUrl: z.string().trim().min(1).nullable(),
        brandName: z.string().trim().max(80).nullable(),
        linkedModelSlug: z.string().trim().min(1).nullable()
      })
    )
    .min(1)
    .max(20)
});

export const rankingResponseSchema = z.object({
  item: rankingDetailSchema
});

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

export type RankingType = z.infer<typeof rankingTypeSchema>;
export type RankingItem = z.infer<typeof rankingItemSchema>;
export type RankingListItem = z.infer<typeof rankingListItemSchema>;
export type RankingDetail = z.infer<typeof rankingDetailSchema>;
