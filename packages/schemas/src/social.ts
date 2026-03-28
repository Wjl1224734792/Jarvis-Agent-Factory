import { z } from "zod";
import { userSummarySchema } from "./auth";

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
  isFollowing: z.boolean()
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
  rating: z.number().int().min(1).max(5),
  content: z.string().nullable(),
  model: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1)
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
  userContentReviewItemSchema,
  userContentRankingItemSchema,
  userContentAircraftItemSchema
]);

export const userContentResponseSchema = z.object({
  items: z.array(userContentItemSchema)
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
