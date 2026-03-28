import { z } from "zod";
import { userSummarySchema } from "./auth";
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
  avatarUrl: z.string().trim().min(1).nullable(),
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
  phone: z.string().regex(/^1\d{10}$/),
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8)
});

export const phoneChangeRequestResponseSchema = z.object({
  requestId: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  mockCode: z.string().length(6).optional()
});

export const phoneChangeConfirmInputSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  requestId: z.string().min(1),
  smsCode: z.string().length(6)
});

export const updateCurrentUserProfileInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(50).optional(),
    bio: z.string().trim().max(300).nullable().optional(),
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
  title: z.string().min(1),
  contentPreview: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentFavoritePostItemSchema = z.object({
  type: z.literal("favorite-post"),
  id: z.string().min(1),
  postType: z.enum(["article", "moment"]),
  title: z.string().min(1),
  contentPreview: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentReviewItemSchema = z.object({
  type: z.literal("review"),
  id: z.string().min(1),
  content: z.string().nullable(),
  model: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1)
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
    powerType: powerTypeSchema
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentRankingItemSchema = z.object({
  type: z.literal("ranking"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentAircraftItemSchema = z.object({
  type: z.literal("aircraft"),
  id: z.string().min(1),
  modelName: z.string().min(1),
  summary: z.string().nullable(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const userContentItemSchema = z.discriminatedUnion("type", [
  userContentPostItemSchema,
  userContentFavoritePostItemSchema,
  userContentFavoriteModelItemSchema,
  userContentReviewItemSchema,
  userContentRankingItemSchema,
  userContentAircraftItemSchema
]);

export const userContentResponseSchema = z.object({
  items: z.array(userContentItemSchema)
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;
