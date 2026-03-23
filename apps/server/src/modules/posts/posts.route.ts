import {
  actionSuccessResponseSchema,
  adminPostCommentResponseSchema,
  adminPostCommentsResponseSchema,
  adminPostCommentStatusUpdateInputSchema,
  adminPostResponseSchema,
  adminPostsResponseSchema,
  adminPostStatusUpdateInputSchema,
  createPostCommentInputSchema,
  createPostCommentResponseSchema,
  createPostInputSchema,
  createPostResponseSchema,
  homeFeedResponseSchema,
  postDetailResponseSchema,
  reportPostInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { postsService } from "./posts.service";

export const postsRoute = new Hono<{ Variables: AuthVariables }>();

postsRoute.use("*", attachCurrentUser);

postsRoute.get(API_ROUTES.feed, async (context) => {
  const tab = context.req.query("tab") === "recommended" ? "recommended" : "latest";
  const payload = await postsService.listFeed(tab);
  return context.json(homeFeedResponseSchema.parse(payload));
});

postsRoute.post(API_ROUTES.posts.create, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createPostInputSchema.parse(await context.req.json());
  const payload = await postsService.createPost({
    authorId: currentUser.id,
    title: input.title,
    content: input.content
  });

  if (!payload) {
    return context.json({ code: "INTERNAL_ERROR", message: "Failed to create post." }, 500);
  }

  return context.json(createPostResponseSchema.parse(payload));
});

postsRoute.get(API_ROUTES.posts.detail(":id"), async (context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await postsService.getPostDetail(id, context.get("currentUser"));

  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }

  return context.json(postDetailResponseSchema.parse(payload));
});

postsRoute.post(API_ROUTES.posts.comments(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createPostCommentInputSchema.parse(await context.req.json());
  const result = await postsService.createComment(id, currentUser, input);

  if (result.kind === "invalid_parent") {
    return context.json({ code: "BAD_REQUEST", message: "Only one reply level is supported." }, 400);
  }

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Post or comment not found." }, 404);
  }

  return context.json(createPostCommentResponseSchema.parse({ item: result.item }));
});

postsRoute.delete(API_ROUTES.posts.commentDetail(":postId", ":commentId"), requireAuth, async (context) => {
  const postId = context.req.param("postId");
  const commentId = context.req.param("commentId");
  const currentUser = context.get("currentUser");

  if (!postId || !commentId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const result = await postsService.deleteComment(postId, commentId, currentUser);

  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Cannot delete other user's content." }, 403);
  }

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

postsRoute.delete(API_ROUTES.posts.detail(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const result = await postsService.deletePost(id, currentUser);

  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Cannot delete other user's content." }, 403);
  }

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

postsRoute.post(API_ROUTES.posts.report(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = reportPostInputSchema.parse(await context.req.json());
  const result = await postsService.reportPost(id, currentUser.id, input.reason);

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

postsRoute.get(API_ROUTES.posts.adminList, requireAdmin, async (context) => {
  const statusQuery = context.req.query("status");
  const status =
    statusQuery === "pending" ||
    statusQuery === "published" ||
    statusQuery === "rejected" ||
    statusQuery === "hidden"
      ? statusQuery
      : undefined;

  const payload = await postsService.listAdminPosts(status);
  return context.json(adminPostsResponseSchema.parse(payload));
});

postsRoute.put(API_ROUTES.posts.adminDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = adminPostStatusUpdateInputSchema.parse(await context.req.json());
  const item = await postsService.updatePostStatus(id, input.status);

  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }

  return context.json(adminPostResponseSchema.parse({ item }));
});

postsRoute.get(API_ROUTES.posts.adminComments, requireAdmin, async (context) => {
  const statusQuery = context.req.query("status");
  const status =
    statusQuery === "visible" || statusQuery === "hidden" ? statusQuery : undefined;
  const payload = await postsService.listAdminComments(status);
  return context.json(adminPostCommentsResponseSchema.parse(payload));
});

postsRoute.put(API_ROUTES.posts.adminCommentDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = adminPostCommentStatusUpdateInputSchema.parse(await context.req.json());
  const item = await postsService.updateCommentStatus(id, input.status);

  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json(adminPostCommentResponseSchema.parse({ item }));
});
