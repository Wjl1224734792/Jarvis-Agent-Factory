import { z } from "zod";
import { userSummarySchema } from "./auth";
import { chinaMainlandMobilePhoneSchema } from "./phone";
import { powerTypeSchema } from "./models";

export const profileVisibilitySchema = z.enum(["community", "followers", "private"]);

export const notificationTypeSchema = z.enum([
  "followed",
  "post_liked",
  "post_favorited",
  "post_shared",
  "post_commented",
  "comment_replied"
]);

export const notificationPostSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1)
});

export const notificationCommentSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  contentPreview: z.string().min(1)
});

export const notificationItemSchema = z.object({
  id: z.string().min(1),
  type: notificationTypeSchema,
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
  actor: userSummarySchema,
  post: notificationPostSchema.nullable(),
  comment: notificationCommentSchema.nullable()
});

export const notificationsResponseSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
  items: z.array(notificationItemSchema)
});

export const userProfileViewerSchema = z.object({
  isSelf: z.boolean(),
  isFollowing: z.boolean(),
  canFollow: z.boolean(),
  canViewProfile: z.boolean(),
  canViewContent: z.boolean()
});

export const userProfileSchema = z.object({
  user: userSummarySchema,
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  postCount: z.number().int().nonnegative(),
  rankingCount: z.number().int().nonnegative(),
  aircraftCount: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative(),
  viewer: userProfileViewerSchema
});

export const userProfileResponseSchema = z.object({
  item: userProfileSchema
});

export const currentUserProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(300).nullable(),
  avatarFileId: z.string().min(1).nullable(),
  avatarUrl: z.string().trim().min(1).nullable(),
  coverImageFileId: z.string().min(1).nullable(),
  coverImageUrl: z.string().trim().min(1).nullable(),
  phone: z.string().trim().min(1).max(30).nullable(),
  phoneMasked: z.string().trim().min(1).max(30).nullable(),
  profileVisibility: profileVisibilitySchema,
  notifyComments: z.boolean(),
  notifyMentions: z.boolean(),
  sessionAlerts: z.boolean(),
  emailDigest: z.boolean()
});

export const currentUserProfileResponseSchema = z.object({
  item: currentUserProfileSchema
});

export const phoneChangeRequestInputSchema = z.object({
  phone: chinaMainlandMobilePhoneSchema,
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8)
});

export const phoneChangeRequestResponseSchema = z.object({
  requestId: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  mockCode: z.string().length(6).optional()
});

export const phoneChangeConfirmInputSchema = z.object({
  phone: chinaMainlandMobilePhoneSchema,
  requestId: z.string().min(1),
  smsCode: z.string().length(6)
});

export const updateCurrentUserProfileInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(50).optional(),
    bio: z.string().trim().max(300).nullable().optional(),
    avatarFileId: z.string().trim().min(1).nullable().optional(),
    coverImageFileId: z.string().trim().min(1).nullable().optional(),
    avatarUrl: z.string().trim().min(1).nullable().optional(),
    phone: z.string().trim().min(1).max(30).nullable().optional(),
    profileVisibility: profileVisibilitySchema.optional(),
    notifyComments: z.boolean().optional(),
    notifyMentions: z.boolean().optional(),
    sessionAlerts: z.boolean().optional(),
    emailDigest: z.boolean().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one profile field is required."
  });

export const userContentPostItemSchema = z.object({
  type: z.literal("post"),
  id: z.string().min(1),
  postType: z.enum(["article", "moment"]),
  status: z.enum(["pending", "published", "rejected", "hidden"]).default("published"),
  rejectionReason: z.string().nullable().default(null),
  title: z.string().min(1),
  contentPreview: z.string().min(1),
  coverImageUrl: z.string().nullable().optional(),
  viewCount: z.number().int().nonnegative().nullable().default(null),
  commentCount: z.number().int().nonnegative().optional(),
  likeCount: z.number().int().nonnegative().optional(),
  favoriteCount: z.number().int().nonnegative().optional(),
  shareCount: z.number().int().nonnegative().optional(),
  canManage: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentFavoritePostItemSchema = z.object({
  type: z.literal("favorite-post"),
  id: z.string().min(1),
  postType: z.enum(["article", "moment"]),
  title: z.string().min(1),
  contentPreview: z.string().min(1),
  coverImageUrl: z.string().nullable().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  commentCount: z.number().int().nonnegative().optional(),
  likeCount: z.number().int().nonnegative().optional(),
  favoriteCount: z.number().int().nonnegative().optional(),
  shareCount: z.number().int().nonnegative().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentReviewItemSchema = z.object({
  type: z.literal("review"),
  id: z.string().min(1),
  content: z.string().nullable(),
  likeCount: z.number().int().nonnegative().optional(),
  model: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
    coverImageUrl: z.string().nullable().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentFavoriteModelItemSchema = z.object({
  type: z.literal("favorite-model"),
  id: z.string().min(1),
  model: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
    powerType: powerTypeSchema,
    coverImageUrl: z.string().nullable().optional(),
    viewCount: z.number().int().nonnegative().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentRatingTargetSchema = z.object({
  type: z.literal("ranking"),
  id: z.string().min(1),
  status: z.enum(["pending", "published", "rejected", "hidden"]).default("published"),
  rejectionReason: z.string().nullable().default(null),
  title: z.string().min(1),
  commentCount: z.number().int().nonnegative().optional(),
  coverImageUrl: z.string().nullable().optional(),
  canManage: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentRatingTargetEntrySchema = z.object({
  type: z.literal("rating-target"),
  id: z.string().min(1),
  rankingId: z.string().min(1),
  rankingTitle: z.string().min(1),
  status: z.enum(["pending", "published", "rejected", "hidden"]).default("published"),
  rejectionReason: z.string().nullable().default(null),
  title: z.string().min(1),
  summary: z.string().nullable(),
  likeCount: z.number().int().nonnegative().optional(),
  commentCount: z.number().int().nonnegative().optional(),
  /** 0–10 分制综合评分 */
  averageScore: z.number().min(0).max(10).optional().default(0),
  totalRatings: z.number().int().nonnegative().optional().default(0),
  coverImageUrl: z.string().nullable().optional(),
  canManage: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentBrandApplicationItemSchema = z.object({
  type: z.literal("brand-application"),
  id: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "hidden"]),
  rejectionReason: z.string().nullable().default(null),
  name: z.string().min(1),
  description: z.string().nullable(),
  canManage: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentAircraftItemSchema = z.object({
  type: z.literal("aircraft"),
  id: z.string().min(1),
  modelName: z.string().min(1),
  summary: z.string().nullable(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]),
  rejectionReason: z.string().nullable().default(null),
  viewCount: z.number().int().nonnegative().nullable().default(null),
  canManage: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentItemSchema = z.discriminatedUnion("type", [
  userContentPostItemSchema,
  userContentFavoritePostItemSchema,
  userContentFavoriteModelItemSchema,
  userContentReviewItemSchema,
  userContentRatingTargetSchema,
  userContentRatingTargetEntrySchema,
  userContentAircraftItemSchema,
  userContentBrandApplicationItemSchema
]);

export const userContentResponseSchema = z.object({
  items: z.array(userContentItemSchema)
});

const adminAnalyticsCountSchema = z.number().int().nonnegative();

export const adminAnalyticsSeriesPointSchema = z.object({
  periodStart: z.string().datetime(),
  value: adminAnalyticsCountSchema
});

export const adminAnalyticsModerationBucketSchema = z.object({
  queueEntered: adminAnalyticsCountSchema,
  pending: adminAnalyticsCountSchema,
  approved: adminAnalyticsCountSchema,
  rejected: adminAnalyticsCountSchema,
  hidden: adminAnalyticsCountSchema
});

export const adminAnalyticsFunnelBucketSchema = z.object({
  queueEntered: adminAnalyticsCountSchema,
  pending: adminAnalyticsCountSchema,
  approved: adminAnalyticsCountSchema,
  rejectedOrHidden: adminAnalyticsCountSchema
});

export const adminAnalyticsOverviewSchema = z.object({
  totals: z.object({
    users: adminAnalyticsCountSchema,
    moments: adminAnalyticsCountSchema,
    articles: adminAnalyticsCountSchema,
    aircraft: adminAnalyticsCountSchema,
    rankings: adminAnalyticsCountSchema,
    pendingTotal: adminAnalyticsCountSchema,
    pendingPosts: adminAnalyticsCountSchema,
    pendingComments: adminAnalyticsCountSchema,
    pendingReviews: adminAnalyticsCountSchema,
    pendingSubmissions: adminAnalyticsCountSchema,
    pendingRankings: adminAnalyticsCountSchema.default(0),
    pendingBrandApplications: adminAnalyticsCountSchema.default(0),
    pendingRatingTargets: adminAnalyticsCountSchema.default(0)
  }),
  registration: z.object({
    total: adminAnalyticsCountSchema,
    today: adminAnalyticsCountSchema,
    month: adminAnalyticsCountSchema,
    year: adminAnalyticsCountSchema,
    daily: z.array(adminAnalyticsSeriesPointSchema).length(30),
    monthly: z.array(adminAnalyticsSeriesPointSchema).length(12),
    yearly: z.array(adminAnalyticsSeriesPointSchema).length(5)
  }),
  activity: z.object({
    activeUsers: adminAnalyticsCountSchema,
    dau: adminAnalyticsCountSchema,
    mau: adminAnalyticsCountSchema,
    yau: adminAnalyticsCountSchema,
    daily: z.array(adminAnalyticsSeriesPointSchema).length(30),
    monthly: z.array(adminAnalyticsSeriesPointSchema).length(12),
    yearly: z.array(adminAnalyticsSeriesPointSchema).length(5)
  }),
  contentMix: z.object({
    moments: adminAnalyticsCountSchema,
    articles: adminAnalyticsCountSchema,
    aircraft: adminAnalyticsCountSchema,
    rankings: adminAnalyticsCountSchema
  }),
  content: z.object({
    articles: adminAnalyticsCountSchema,
    moments: adminAnalyticsCountSchema,
    aircraftPublishedModels: adminAnalyticsCountSchema,
    aircraftPendingSubmissions: adminAnalyticsCountSchema,
    rankings: adminAnalyticsCountSchema
  }),
  moderation: z.object({
    posts: adminAnalyticsModerationBucketSchema,
    comments: adminAnalyticsModerationBucketSchema,
    reviews: adminAnalyticsModerationBucketSchema,
    submissions: adminAnalyticsModerationBucketSchema,
    rankings: adminAnalyticsModerationBucketSchema.default({
      queueEntered: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      hidden: 0
    }),
    brandApplications: adminAnalyticsModerationBucketSchema.default({
      queueEntered: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      hidden: 0
    }),
    ratingTargets: adminAnalyticsModerationBucketSchema.default({
      queueEntered: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      hidden: 0
    })
  }),
  funnel: z.object({
    posts: adminAnalyticsFunnelBucketSchema,
    comments: adminAnalyticsFunnelBucketSchema,
    reviews: adminAnalyticsFunnelBucketSchema,
    submissions: adminAnalyticsFunnelBucketSchema,
    rankings: adminAnalyticsFunnelBucketSchema.default({
      queueEntered: 0,
      pending: 0,
      approved: 0,
      rejectedOrHidden: 0
    }),
    brandApplications: adminAnalyticsFunnelBucketSchema.default({
      queueEntered: 0,
      pending: 0,
      approved: 0,
      rejectedOrHidden: 0
    }),
    ratingTargets: adminAnalyticsFunnelBucketSchema.default({
      queueEntered: 0,
      pending: 0,
      approved: 0,
      rejectedOrHidden: 0
    })
  }),
  series: z.object({
    registrationDaily: z.array(adminAnalyticsSeriesPointSchema).length(30),
    registrationMonthly: z.array(adminAnalyticsSeriesPointSchema).length(12),
    registrationYearly: z.array(adminAnalyticsSeriesPointSchema).length(5),
    activityDaily: z.array(adminAnalyticsSeriesPointSchema).length(30),
    activityMonthly: z.array(adminAnalyticsSeriesPointSchema).length(12),
    activityYearly: z.array(adminAnalyticsSeriesPointSchema).length(5)
  })
});

export const adminAnalyticsOverviewResponseSchema = z.object({
  item: adminAnalyticsOverviewSchema
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;
export type UserContentItem = z.infer<typeof userContentItemSchema>;
