import { z } from "zod";
import { userSummarySchema } from "./auth";

export const reviewStatusSchema = z.enum(["pending", "visible", "hidden"]);
export const reviewRatingSchema = z.number().int().min(1).max(5);

export const modelReviewSchema = z.object({
  id: z.string().min(1),
  content: z.string().nullable(),
  status: reviewStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  likeCount: z.number().int().nonnegative().default(0),
  reportCount: z.number().int().nonnegative().default(0),
  author: userSummarySchema,
  viewer: z
    .object({
      canEdit: z.boolean(),
      canDelete: z.boolean(),
      hasLiked: z.boolean(),
      hasReported: z.boolean()
    })
    .default({
      canEdit: false,
      canDelete: false,
      hasLiked: false,
      hasReported: false
    })
});

export const modelReviewSummarySchema = z.object({
  totalReviews: z.number().int().nonnegative(),
  myReview: modelReviewSchema.nullable()
});

export const submitModelReviewInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const submitModelReviewResponseSchema = z.object({
  item: modelReviewSchema,
  summary: modelReviewSummarySchema
});

export const modelReviewsResponseSchema = z.object({
  items: z.array(modelReviewSchema),
  summary: modelReviewSummarySchema
});

export const adminReviewListItemSchema = modelReviewSchema.extend({
  model: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1)
  })
});

export const adminReviewsResponseSchema = z.object({
  items: z.array(adminReviewListItemSchema)
});

export const updateReviewStatusInputSchema = z.object({
  status: reviewStatusSchema
});

export const adminReviewResponseSchema = z.object({
  item: adminReviewListItemSchema
});

export const reviewCommentSchema = z.object({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  parentCommentId: z.string().min(1).nullable(),
  replyToCommentId: z.string().min(1).nullable(),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  likeCount: z.number().int().nonnegative().default(0),
  reportCount: z.number().int().nonnegative().default(0),
  author: userSummarySchema,
  replyToUser: userSummarySchema.nullable(),
  viewer: z
    .object({
      canEdit: z.boolean(),
      canDelete: z.boolean(),
      hasLiked: z.boolean(),
      hasReported: z.boolean()
    })
    .default({
      canEdit: false,
      canDelete: false,
      hasLiked: false,
      hasReported: false
    })
});

export const reviewCommentThreadSchema = reviewCommentSchema.extend({
  replyCount: z.number().int().nonnegative(),
  replies: z.array(reviewCommentSchema)
});

export const createReviewCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentCommentId: z.string().min(1).optional()
});

export const updateReviewCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const createReviewCommentResponseSchema = z.object({
  item: reviewCommentSchema
});

export const reviewCommentsResponseSchema = z.object({
  items: z.array(reviewCommentThreadSchema)
});

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type ModelReview = z.infer<typeof modelReviewSchema>;
