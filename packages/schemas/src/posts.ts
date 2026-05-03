import { z } from "zod";
import { userSummarySchema } from "./auth";
import { contentCategorySchema } from "./content-categories";
import {
  fileBizTypeSchema,
  imageFileSchema,
  videoFileSchema
} from "./files";

export const feedTabSchema = z.enum(["recommended", "latest", "following"]);
export const postTypeSchema = z.enum(["article", "moment"]);
export const postStatusSchema = z.enum(["pending", "published", "rejected", "hidden"]);
export const postCommentStatusSchema = z.enum(["pending", "visible", "hidden"]);
export const postInteractionTypeSchema = z.enum(["like", "favorite", "share"]);
export const commentSortSchema = z.enum(["hot", "latest"]);
export const uploadBizTypeSchema = fileBizTypeSchema;

export const declarationTypeSchema = z.enum([
  'original',
  'ai_generated',
  'ai_assisted',
  'reprinted',
  'deep_synthesis'
]);

export const DECLARATION_TYPE_LABELS: Record<string, string> = {
  original: '原创',
  ai_generated: 'AI生成',
  ai_assisted: 'AI辅助创作',
  reprinted: '转载',
  deep_synthesis: '深度合成'
} as const;

export const postImageSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().nonnegative()
});

export const postVideoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().nonnegative()
});

export const postCoverSchema = postImageSchema;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const sourceUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(isHttpUrl, "Source URL must use http or https.");

export const postSourceSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: sourceUrlSchema.nullable().default(null)
});

export const postDeclarationSchema = z.object({
  value: declarationTypeSchema,
  label: z.string()
});

const postSourceInputFields = {
  sourceLabel: z.string().min(1).max(80).nullable().default(null),
  sourceUrl: sourceUrlSchema.max(500).nullable().default(null)
};

const declarationInputField = {
  declaration: declarationTypeSchema
};

function normalizeSourceInputValue(value: unknown) {
  if (value == null || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePostSourceInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const input = value as Record<string, unknown>;
  const sourceLabel = normalizeSourceInputValue(input.sourceLabel);
  const sourceUrl = normalizeSourceInputValue(input.sourceUrl);

  return {
    ...input,
    sourceLabel,
    sourceUrl: sourceLabel ? sourceUrl : null
  };
}

export const postViewerStateSchema = z.object({
  isAuthor: z.boolean(),
  isFollowingAuthor: z.boolean(),
  hasLiked: z.boolean(),
  hasFavorited: z.boolean(),
  hasShared: z.boolean()
});

export const postEngagementSchema = z.object({
  likeCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  shareCount: z.number().int().nonnegative(),
  viewer: postViewerStateSchema
});

export const createPostInputSchema = z.preprocess(
  normalizePostSourceInput,
  z.object({
    type: postTypeSchema,
    title: z.string().trim().min(1).max(100),
    content: z.preprocess((value) => (value == null ? "" : value), z.string().trim().max(8000)),
    contentHtml: z.string().trim().max(32000).nullable().optional(),
    contentCategoryId: z.string().min(1).nullable().optional(),
    coverImageId: z.string().min(1).nullable().optional().default(null),
    ...postSourceInputFields,
    ...declarationInputField,
    imageIds: z.array(z.string().min(1)).default([]),
    videoIds: z.array(z.string().min(1)).default([])
  })
  .superRefine((input, context) => {
    if (input.type === "article" && input.content.trim().length < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Article content is required.",
        path: ["content"]
      });
    }

    if (input.type !== "moment") {
      return;
    }

    if (input.imageIds.length > 0 && input.videoIds.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Moment posts cannot mix images and videos.",
        path: ["videoIds"]
      });
    }

    if (input.videoIds.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Moment posts support only one video.",
        path: ["videoIds"]
      });
    }

    if (input.imageIds.length > 0 && input.coverImageId && !input.imageIds.includes(input.coverImageId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Moment cover must be selected from uploaded images.",
        path: ["coverImageId"]
      });
    }
  })
  .superRefine((input, context) => {
    if (input.declaration === 'reprinted' && !input.sourceLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '转载内容必须填写来源名称',
        path: ['sourceLabel']
      });
    }

    if (input.declaration === 'original' && input.sourceLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '原创内容不应填写来源',
        path: ['sourceLabel']
      });
    }
  })
);

export const createPostCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentCommentId: z.string().min(1).optional()
});

export const updatePostCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const updatePostInputSchema = createPostInputSchema;

export const reportContentInputSchema = z.object({
  reason: z.string().trim().min(4).max(200),
  imageIds: z.array(z.string().min(1)).min(1).max(3)
});

export const reportPostInputSchema = reportContentInputSchema;

export const uploadPostImageResponseSchema = z.object({
  item: imageFileSchema
}).transform(({ item }) => ({
  item: {
    id: item.id,
    url: item.url,
    fileName: item.fileName,
    mimeType: item.mimeType,
    byteSize: item.byteSize
  }
}));

export const uploadPostVideoResponseSchema = z.object({
  item: videoFileSchema
}).transform(({ item }) => ({
  item: {
    id: item.id,
    url: item.url,
    fileName: item.fileName,
    mimeType: item.mimeType,
    byteSize: item.byteSize
  }
}));

const postContentCategorySummarySchema = contentCategorySchema.pick({
  id: true,
  slug: true,
  name: true
});

export const postFeedItemSchema = z.object({
  id: z.string().min(1),
  type: postTypeSchema,
  title: z.string().min(1),
  contentPreview: z.string(),
  contentHtml: z.string().nullable().optional(),
  status: postStatusSchema,
  rejectionReason: z.string().nullable().default(null),
  commentCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative().default(0),
  reportCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  author: userSummarySchema,
  source: postSourceSchema.nullable().default(null),
  declaration: postDeclarationSchema.nullable().default(null),
  cover: postCoverSchema.nullable().default(null),
  images: z.array(postImageSchema),
  videos: z.array(postVideoSchema),
  contentCategory: postContentCategorySummarySchema.nullable(),
  engagement: postEngagementSchema
});

export const postCommentReplySchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  parentCommentId: z.string().min(1).nullable(),
  replyToCommentId: z.string().min(1).nullable(),
  content: z.string().min(1),
  status: postCommentStatusSchema,
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

export const postCommentThreadSchema = postCommentReplySchema.extend({
  replyCount: z.number().int().nonnegative(),
  replies: z.array(postCommentReplySchema)
});

export const postDetailSchema = z.object({
  id: z.string().min(1),
  type: postTypeSchema,
  title: z.string().min(1),
  content: z.string(),
  contentHtml: z.string().nullable(),
  status: postStatusSchema,
  rejectionReason: z.string().nullable().default(null),
  commentCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative().default(0),
  reportCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  author: userSummarySchema,
  source: postSourceSchema.nullable().default(null),
  declaration: postDeclarationSchema.nullable().default(null),
  cover: postCoverSchema.nullable().default(null),
  images: z.array(postImageSchema),
  videos: z.array(postVideoSchema),
  contentCategory: postContentCategorySummarySchema.nullable(),
  engagement: postEngagementSchema,
  comments: z.array(postCommentThreadSchema)
});

const feedPaginationSchema = z.object({
  limit: z.number().int().positive(),
  hasMore: z.boolean()
});

const feedCursorSchema = z.string().min(1).nullable();

export const homeFeedResponseSchema = z.object({
  tab: feedTabSchema,
  activeCategorySlug: z.string().nullable(),
  categories: z.array(contentCategorySchema),
  items: z.array(postFeedItemSchema),
  pagination: feedPaginationSchema,
  nextCursor: feedCursorSchema
});

export const circleFeedResponseSchema = z.object({
  tab: feedTabSchema,
  items: z.array(postFeedItemSchema),
  pagination: feedPaginationSchema,
  nextCursor: feedCursorSchema
});

export const createPostResponseSchema = z.object({
  item: postDetailSchema
});

export const postDetailResponseSchema = z.object({
  item: postDetailSchema
});

export const createPostCommentResponseSchema = z.object({
  item: postCommentReplySchema
});

export const actionSuccessResponseSchema = z.object({
  success: z.literal(true)
});

export const adminPostListItemSchema = postFeedItemSchema.extend({
  status: postStatusSchema
});

export const adminPostsResponseSchema = z.object({
  items: z.array(adminPostListItemSchema)
});

export const adminPostStatusUpdateInputSchema = z.object({
  status: postStatusSchema,
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

export const adminOfficialArticleUpdateInputSchema = z.preprocess(
  normalizePostSourceInput,
  z.object({
    title: z.string().trim().min(1).max(100),
    content: z.string().trim().min(1).max(8000),
    contentHtml: z.string().trim().max(32000).nullable().optional(),
    contentCategoryId: z.string().min(1),
    ...postSourceInputFields,
    ...declarationInputField,
    imageIds: z.array(z.string().min(1)).default([]),
    videoIds: z.array(z.string().min(1)).default([])
  })
  .superRefine((input, context) => {
    if (input.declaration === 'reprinted' && !input.sourceLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '转载内容必须填写来源名称',
        path: ['sourceLabel']
      });
    }

    if (input.declaration === 'original' && input.sourceLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '原创内容不应填写来源',
        path: ['sourceLabel']
      });
    }
  })
);

export const adminPostResponseSchema = z.object({
  item: adminPostListItemSchema
});

export const adminPostCommentListItemSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  postTitle: z.string().min(1),
  parentCommentId: z.string().min(1).nullable(),
  replyToCommentId: z.string().min(1).nullable(),
  content: z.string().min(1),
  status: postCommentStatusSchema,
  reportCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: userSummarySchema,
  replyToUser: userSummarySchema.nullable()
});

export const adminPostCommentsResponseSchema = z.object({
  items: z.array(adminPostCommentListItemSchema)
});

export const adminPostCommentStatusUpdateInputSchema = z.object({
  status: postCommentStatusSchema
});

export const adminPostCommentResponseSchema = z.object({
  item: adminPostCommentListItemSchema
});

export type FeedTab = z.infer<typeof feedTabSchema>;
export type PostType = z.infer<typeof postTypeSchema>;
export type PostStatus = z.infer<typeof postStatusSchema>;
export type DeclarationType = z.infer<typeof declarationTypeSchema>;
export type PostCommentStatus = z.infer<typeof postCommentStatusSchema>;
export type PostInteractionType = z.infer<typeof postInteractionTypeSchema>;
export type UploadBizType = z.infer<typeof uploadBizTypeSchema>;
