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

export type NotificationType = z.infer<typeof notificationTypeSchema>;
