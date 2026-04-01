import { z } from "zod";
import { userSummarySchema } from "./auth";
import { aircraftCategorySchema, brandSchema, powerTypeSchema } from "./models";
import { reviewRatingSchema } from "./reviews";

export const rankingTypeSchema = z.enum(["official", "community"]);
export const ratingTargetAddPolicySchema = z.enum(["public", "owner"]);
export const rankingStatusSchema = z.enum(["pending", "published", "rejected", "hidden"]);
export const rankingCommentStatusSchema = z.enum(["pending", "visible", "hidden"]);

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

export const ratingTargetViewerStateSchema = z.object({
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  hasReported: z.boolean().default(false)
});

export const ratingTargetSchema = z.object({
  id: z.string().min(1),
  rankingId: z.string().min(1),
  authorId: z.string().min(1).nullable().optional(),
  status: rankingStatusSchema.default("published"),
  rejectionReason: z.string().nullable().default(null),
  rank: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().nullable(),
  imageFileId: z.string().nullable().optional(),
  imageUrl: z.string().nullable(),
  brandName: z.string().nullable(),
  linkedModel: linkedRankingModelSchema.nullable(),
  averageScore: z.number().min(0).max(10),
  totalRatings: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative().default(0),
  reportCount: z.number().int().nonnegative().default(0),
  myRating: reviewRatingSchema.nullable(),
  viewer: ratingTargetViewerStateSchema.default({
    canEdit: false,
    canDelete: false,
    hasReported: false
  })
});

export const rankingCommentSchema = z.object({
  id: z.string().min(1),
  rankingId: z.string().min(1),
  content: z.string().min(1),
  status: rankingCommentStatusSchema.default("visible"),
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

const ratingTargetCommentBaseSchema = z.object({
  id: z.string().min(1),
  ratingTargetId: z.string().min(1),
  parentCommentId: z.string().min(1).nullable().default(null),
  replyToCommentId: z.string().min(1).nullable().default(null),
  content: z.string().min(1),
  status: rankingCommentStatusSchema.default("visible"),
  rating: reviewRatingSchema.nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  likeCount: z.number().int().nonnegative().default(0),
  reportCount: z.number().int().nonnegative().default(0),
  author: userSummarySchema,
  replyToUser: userSummarySchema.nullable().default(null),
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

export const ratingTargetCommentSchema: z.ZodType<
  z.infer<typeof ratingTargetCommentBaseSchema> & {
    replyCount: number;
    replies: Array<z.infer<typeof ratingTargetCommentBaseSchema>>;
  }
> = z.lazy(() =>
  ratingTargetCommentBaseSchema.extend({
    replyCount: z.number().int().nonnegative().default(0),
    replies: z.array(ratingTargetCommentBaseSchema).default([])
  })
);

const ratingBreakdownCountSchema = z.number().int().nonnegative();

export const ratingTargetRatingBreakdownSchema = z.tuple([
  z.object({ score: z.literal(5), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(4), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(3), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(2), count: ratingBreakdownCountSchema }),
  z.object({ score: z.literal(1), count: ratingBreakdownCountSchema })
]);

export const rankingListItemSchema = z.object({
  id: z.string().min(1),
  type: rankingTypeSchema,
  status: rankingStatusSchema,
  rejectionReason: z.string().nullable().default(null),
  title: z.string().min(1),
  description: z.string().min(1),
  coverImageFileId: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable(),
  itemAddPolicy: ratingTargetAddPolicySchema,
  averageScore: z.number().min(0).max(10),
  commentCount: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative().default(0),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  author: userSummarySchema,
  viewer: rankingViewerStateSchema,
  items: z.array(ratingTargetSchema).max(3)
});

export const rankingDetailSchema = rankingListItemSchema.extend({
  comments: z.array(rankingCommentSchema),
  items: z.array(ratingTargetSchema)
});

export const ratingTargetDetailSchema = ratingTargetSchema.extend({
  ranking: z.object({
    id: z.string().min(1),
    title: z.string().min(1)
  }),
  comments: z.array(ratingTargetCommentSchema),
  myReview: ratingTargetCommentSchema.nullable(),
  ratingBreakdown: ratingTargetRatingBreakdownSchema
});

export const rankingsResponseSchema = z.object({
  official: z.array(rankingListItemSchema),
  community: z.array(rankingListItemSchema)
});

export const adminRankingsResponseSchema = z.object({
  items: z.array(rankingListItemSchema)
});

const rankingDraftItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(500).nullable(),
  imageFileId: z.string().trim().min(1).nullable(),
  brandName: z.string().trim().max(80).nullable(),
  linkedModelSlug: z.string().trim().min(1).nullable()
});

export const createRankingInputSchema = z.object({
  type: rankingTypeSchema,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(2000),
  coverImageFileId: z.string().trim().min(1).nullable(),
  itemAddPolicy: ratingTargetAddPolicySchema,
  items: z.array(rankingDraftItemSchema).min(1).max(20)
});

export const updateRankingInputSchema = createRankingInputSchema;

export const createRatingTargetInputSchema = rankingDraftItemSchema;
export const addRatingTargetInputSchema = createRatingTargetInputSchema;

export const rankingResponseSchema = z.object({
  item: rankingDetailSchema
});
export const ratingTargetResponseSchema = rankingResponseSchema;

export const updateRankingStatusInputSchema = z.object({
  status: rankingStatusSchema.exclude(["pending"]),
  rejectionReason: z.string().trim().min(2).max(200).nullable().optional().default(null)
}).superRefine((input, context) => {
  if (input.status === "rejected" && !input.rejectionReason?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Rejection reason is required.",
      path: ["rejectionReason"]
    });
  }
});

export const updateRatingTargetStatusInputSchema = z.object({
  status: rankingStatusSchema.exclude(["pending"]),
  rejectionReason: z.string().trim().min(2).max(200).nullable().optional().default(null)
}).superRefine((input, context) => {
  if (input.status === "rejected" && !input.rejectionReason?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Rejection reason is required.",
      path: ["rejectionReason"]
    });
  }
});

export const ratingTargetDetailResponseSchema = z.object({
  item: ratingTargetDetailSchema
});

export const adminRankingCommentListItemSchema = rankingCommentSchema.extend({
  rankingTitle: z.string().min(1)
});

export const adminRankingCommentsResponseSchema = z.object({
  items: z.array(adminRankingCommentListItemSchema)
});

export const updateRankingCommentStatusInputSchema = z.object({
  status: rankingCommentStatusSchema
});

export const adminRankingCommentResponseSchema = z.object({
  item: adminRankingCommentListItemSchema
});

export const adminRatingTargetCommentListItemSchema = ratingTargetCommentBaseSchema.extend({
  ratingTargetTitle: z.string().min(1),
  rankingTitle: z.string().min(1)
});

export const adminRatingTargetCommentsResponseSchema = z.object({
  items: z.array(adminRatingTargetCommentListItemSchema)
});

export const updateRatingTargetCommentStatusInputSchema = z.object({
  status: rankingCommentStatusSchema
});

export const adminRatingTargetCommentResponseSchema = z.object({
  item: adminRatingTargetCommentListItemSchema
});

export const createRankingCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const createRankingCommentResponseSchema = z.object({
  item: rankingCommentSchema
});

export const submitRatingTargetRatingInputSchema = z.object({
  rating: reviewRatingSchema
});

export const submitRatingTargetRatingResponseSchema = z.object({
  item: ratingTargetSchema
});

export const createRatingTargetCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentCommentId: z.string().min(1).optional(),
  rating: reviewRatingSchema.optional()
}).superRefine((input, context) => {
  if (input.parentCommentId) {
    if (input.rating !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Replies cannot include a rating.",
        path: ["rating"]
      });
    }
    return;
  }

  if (input.rating === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Top-level comments require a rating.",
      path: ["rating"]
    });
  }
});

export const updateRatingTargetCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const createRatingTargetCommentResponseSchema = z.object({
  item: ratingTargetCommentSchema
});

export const submitRatingTargetReviewInputSchema = z.object({
  rating: reviewRatingSchema,
  content: z.string().trim().min(1).max(1000)
});

export const submitRatingTargetReviewResponseSchema = z.object({
  item: ratingTargetDetailSchema
});

export type RankingType = z.infer<typeof rankingTypeSchema>;
export type RatingTargetAddPolicy = z.infer<typeof ratingTargetAddPolicySchema>;
export type RankingStatus = z.infer<typeof rankingStatusSchema>;
export type RatingTarget = z.infer<typeof ratingTargetSchema>;
export type RankingListItem = z.infer<typeof rankingListItemSchema>;
export type RankingDetail = z.infer<typeof rankingDetailSchema>;
