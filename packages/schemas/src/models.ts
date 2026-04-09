import { z } from "zod";
import { userSummarySchema } from "./auth";

const priceValueSchema = z.number().int().nonnegative().nullable();

function validatePriceRange(
  input: { priceMin: number | null; priceMax: number | null },
  context: z.RefinementCtx
) {
  const hasMin = input.priceMin !== null;
  const hasMax = input.priceMax !== null;

  if (hasMin !== hasMax) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Price range requires both priceMin and priceMax.",
      path: [hasMin ? "priceMax" : "priceMin"]
    });
    return;
  }

  if (input.priceMin !== null && input.priceMax !== null && input.priceMin > input.priceMax) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "priceMin cannot be greater than priceMax.",
      path: ["priceMin"]
    });
  }
}

export const aircraftCategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  isEnabled: z.boolean()
});

export const brandSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().trim().min(1).nullable().default(null),
  categoryId: z.string().min(1).nullable(),
  sortOrder: z.number().int().nonnegative(),
  isEnabled: z.boolean()
});

export const powerTypeSchema = z.enum(["electric", "fuel", "hybrid", "other"]);
export const modelLifecycleStatusSchema = z.enum([
  "concept",
  "development",
  "testing",
  "unreleased",
  "released",
  "not_in_market",
  "marketed"
]);
export const modelInteractionTypeSchema = z.enum(["interested", "favorite", "share"]);

export const modelInteractionSummarySchema = z.object({
  interestCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  shareCount: z.number().int().nonnegative()
});

export const modelInteractionViewerStateSchema = z.object({
  isInterested: z.boolean(),
  isFavorited: z.boolean(),
  hasShared: z.boolean(),
  hasReported: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false)
});

export const modelListItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().nullable(),
  priceMin: priceValueSchema,
  priceMax: priceValueSchema,
  powerType: powerTypeSchema,
  lifecycleStatus: modelLifecycleStatusSchema,
  favoriteCount: z.number().int().nonnegative().default(0),
  commentCount: z.number().int().nonnegative().default(0),
  viewCount: z.number().int().nonnegative().default(0),
  ownerId: z.string().min(1).nullable().optional(),
  sourceSubmissionId: z.string().min(1).nullable().optional(),
  reportCount: z.number().int().nonnegative().default(0),
  reviewSummary: z.object({
    totalReviews: z.number().int().nonnegative()
  }),
  category: aircraftCategorySchema.pick({
    id: true,
    slug: true,
    name: true
  }),
  brand: brandSchema.pick({
    id: true,
    slug: true,
    name: true,
    logoUrl: true
  }),
  coverImageUrl: z.string().min(1).nullable().default(null),
  coverVideoUrl: z.string().min(1).nullable().default(null)
}).superRefine(validatePriceRange);

export const modelParameterSchema = z.object({
  maxFlightTimeMinutes: z.number().nonnegative().nullable(),
  maxRangeKilometers: z.number().nonnegative().nullable(),
  maxSpeedKph: z.number().nonnegative().nullable(),
  takeoffWeightGrams: z.number().nonnegative().nullable()
});

export const modelDetailSchema = modelListItemSchema.safeExtend({
  description: z.string().nullable(),
  isPublished: z.boolean(),
  ownerId: z.string().min(1).nullable().optional(),
  sourceSubmissionId: z.string().min(1).nullable().optional(),
  reportCount: z.number().int().nonnegative().default(0),
  galleryImageUrls: z.array(z.string().min(1)).default([]),
  parameters: modelParameterSchema,
  interactionSummary: modelInteractionSummarySchema,
  viewer: modelInteractionViewerStateSchema
});

export const modelListQuerySchema = z
  .object({
    categorySlugs: z.array(z.string().min(1)).optional(),
    brandSlugs: z.array(z.string().min(1)).optional(),
    powerTypes: z.array(powerTypeSchema).optional(),
    keyword: z.string().trim().min(1).optional(),
    categorySlug: z.string().min(1).optional(),
    brandSlug: z.string().min(1).optional(),
    sort: z.enum(["hot", "latest"]).optional(),
    limit: z.coerce.number().int().positive().max(20).optional()
  })
  .transform((input) => ({
    categorySlugs: input.categorySlugs ?? (input.categorySlug ? [input.categorySlug] : undefined),
    brandSlugs: input.brandSlugs ?? (input.brandSlug ? [input.brandSlug] : undefined),
    powerTypes: input.powerTypes,
    keyword: input.keyword?.trim() || undefined,
    sort: input.sort,
    limit: input.limit
  }));

export const modelListResponseSchema = z.object({
  items: z.array(modelListItemSchema),
  total: z.number().int().nonnegative(),
  filters: z.object({
    categories: z.array(aircraftCategorySchema),
    brands: z.array(brandSchema),
    powerTypes: z.array(powerTypeSchema)
  })
});

export const modelDetailResponseSchema = z.object({
  item: modelDetailSchema
});

export const modelInteractionResponseSchema = z.object({
  item: z.object({
    type: modelInteractionTypeSchema,
    active: z.boolean(),
    summary: modelInteractionSummarySchema,
    viewer: modelInteractionViewerStateSchema
  })
});

export const modelCommentStatusSchema = z.enum(["pending", "visible", "hidden"]);

export const modelCommentSchema = z.object({
  id: z.string().min(1),
  modelId: z.string().min(1),
  parentCommentId: z.string().min(1).nullable(),
  replyToCommentId: z.string().min(1).nullable(),
  content: z.string().min(1),
  status: modelCommentStatusSchema.default("visible"),
  likeCount: z.number().int().nonnegative().default(0),
  reportCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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

export const modelCommentThreadSchema = modelCommentSchema.extend({
  replyCount: z.number().int().nonnegative(),
  replies: z.array(modelCommentSchema)
});

export const createModelCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentCommentId: z.string().min(1).optional()
});

export const updateModelCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const modelCommentsResponseSchema = z.object({
  items: z.array(modelCommentThreadSchema)
});

export const createModelCommentResponseSchema = z.object({
  item: modelCommentSchema
});

export const adminModelCommentListItemSchema = modelCommentSchema.extend({
  model: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1)
  })
});

export const adminModelCommentsResponseSchema = z.object({
  items: z.array(adminModelCommentListItemSchema)
});

export const updateModelCommentStatusInputSchema = z.object({
  status: modelCommentStatusSchema
});

export const adminModelCommentResponseSchema = z.object({
  item: adminModelCommentListItemSchema
});

export const adminCategoryInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative().default(0),
  isEnabled: z.boolean().default(true)
});

export const adminCategoryResponseSchema = z.object({
  item: aircraftCategorySchema
});

export const adminBrandInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().trim().min(1).nullable().optional().default(null),
  categoryId: z.string().min(1).nullable(),
  sortOrder: z.number().int().nonnegative().default(0),
  isEnabled: z.boolean().default(true)
});

export const adminBrandResponseSchema = z.object({
  item: brandSchema
});

export const adminModelInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  powerType: powerTypeSchema,
  lifecycleStatus: modelLifecycleStatusSchema,
  summary: z.string().nullable(),
  description: z.string().nullable(),
  priceMin: priceValueSchema,
  priceMax: priceValueSchema,
  maxFlightTimeMinutes: z.number().nonnegative().nullable(),
  maxRangeKilometers: z.number().nonnegative().nullable(),
  maxSpeedKph: z.number().nonnegative().nullable(),
  takeoffWeightGrams: z.number().nonnegative().nullable(),
  coverImageFileId: z.string().trim().min(1).nullable().optional().default(null),
  galleryImageFileIds: z.array(z.string().trim().min(1)).max(6).optional().default([]),
  videoFileId: z.string().trim().min(1).nullable().optional().default(null),
  isPublished: z.boolean().default(true)
}).superRefine(validatePriceRange);

export const adminModelResponseSchema = z.object({
  item: modelDetailSchema
});

export type AircraftCategory = z.infer<typeof aircraftCategorySchema>;
export type Brand = z.infer<typeof brandSchema>;
export type PowerType = z.infer<typeof powerTypeSchema>;
export type ModelInteractionType = z.infer<typeof modelInteractionTypeSchema>;
export type ModelListItem = z.infer<typeof modelListItemSchema>;
export type ModelDetail = z.infer<typeof modelDetailSchema>;
export type ModelComment = z.infer<typeof modelCommentSchema>;
