import { z } from "zod";
import { userSummarySchema } from "./auth";

export const feedTabSchema = z.enum(["recommended", "latest"]);
export const postStatusSchema = z.enum(["pending", "published", "rejected", "hidden"]);
export const postCommentStatusSchema = z.enum(["visible", "hidden"]);

export const createPostInputSchema = z.object({
  title: z.string().trim().min(2).max(60),
  content: z.string().trim().min(1).max(2000)
});

export const createPostCommentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentCommentId: z.string().min(1).optional()
});

export const reportPostInputSchema = z.object({
  reason: z.string().trim().min(4).max(200)
});

export const postFeedItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  contentPreview: z.string().min(1),
  status: postStatusSchema,
  commentCount: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  author: userSummarySchema
});

export const postCommentReplySchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  parentCommentId: z.string().min(1),
  content: z.string().min(1),
  status: postCommentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: userSummarySchema
});

export const postCommentSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  parentCommentId: z.string().min(1).nullable(),
  content: z.string().min(1),
  status: postCommentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: userSummarySchema,
  replies: z.array(postCommentReplySchema)
});

export const postDetailSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  content: z.string().min(1),
  status: postStatusSchema,
  commentCount: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  author: userSummarySchema,
  comments: z.array(postCommentSchema)
});

export const homeFeedResponseSchema = z.object({
  tab: feedTabSchema,
  items: z.array(postFeedItemSchema)
});

export const createPostResponseSchema = z.object({
  item: postDetailSchema
});

export const postDetailResponseSchema = z.object({
  item: postDetailSchema
});

export const createPostCommentResponseSchema = z.object({
  item: postCommentSchema.or(postCommentReplySchema)
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
  status: postStatusSchema
});

export const adminPostResponseSchema = z.object({
  item: adminPostListItemSchema
});

export const adminPostCommentListItemSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  postTitle: z.string().min(2),
  parentCommentId: z.string().min(1).nullable(),
  content: z.string().min(1),
  status: postCommentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: userSummarySchema
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
export type PostStatus = z.infer<typeof postStatusSchema>;
export type PostCommentStatus = z.infer<typeof postCommentStatusSchema>;
