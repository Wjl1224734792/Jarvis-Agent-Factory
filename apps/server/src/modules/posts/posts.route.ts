import {
  actionSuccessResponseSchema,
  adminReportRecordsResponseSchema,
  adminPostCommentResponseSchema,
  adminPostCommentsResponseSchema,
  adminPostCommentStatusUpdateInputSchema,
  adminPostResponseSchema,
  adminPostsResponseSchema,
  adminOfficialArticleUpdateInputSchema,
  adminPostStatusUpdateInputSchema,
  circleFeedResponseSchema,
  commentSortSchema,
  createPostCommentInputSchema,
  createPostCommentResponseSchema,
  createPostInputSchema,
  createPostResponseSchema,
  homeFeedResponseSchema,
  postDetailResponseSchema,
  postInteractionTypeSchema,
  reportContentInputSchema,
  reportPostInputSchema,
  updatePostCommentInputSchema,
  updatePostInputSchema,
  uploadPostImageResponseSchema,
  uploadPostVideoResponseSchema
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
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

postsRoute.use("*", attachCurrentUser);

postsRoute.get(API_ROUTES.feed, async (context) => {
  const tabQuery = context.req.query("tab");
  const categorySlug = context.req.query("categorySlug") || undefined;
  const tab = tabQuery === "recommended" || tabQuery === "following" ? tabQuery : "latest";
  const payload = await postsService.listFeed(tab, context.get("currentUser"), {
    type: "article",
    contentCategorySlug: categorySlug
  });

  return context.json(payload);
});

postsRoute.get(API_ROUTES.circleFeed, async (context) => {
  const tabQuery = context.req.query("tab");
  const tab = tabQuery === "recommended" || tabQuery === "following" ? tabQuery : "latest";
  const payload = await postsService.listFeed(tab, context.get("currentUser"), {
    type: "moment"
  });

  return context.json(payload);
});

postsRoute.post(API_ROUTES.posts.create, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const parsedInput = createPostInputSchema.safeParse(await context.req.json());
  if (!parsedInput.success) {
    return context.json({ code: "BAD_REQUEST", message: "Invalid post payload." }, 400);
  }
  const input = parsedInput.data;
  const payload = await postsService.createPost({
    authorId: currentUser.id,
    authorRole: currentUser.role,
    type: input.type,
    title: input.title,
    content: input.content,
    contentHtml: input.contentHtml ?? null,
    contentCategoryId: input.contentCategoryId ?? null,
    imageIds: input.imageIds,
    videoIds: input.videoIds
  });

  if (payload.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid uploaded images." }, 400);
  }

  if (payload.kind === "invalid_category") {
    return context.json({ code: "BAD_REQUEST", message: "Article category is required." }, 400);
  }

  if (payload.kind === "invalid_videos") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid uploaded videos." }, 400);
  }

  if (payload.kind === "invalid_moment_media") {
    return context.json(
      {
        code: "BAD_REQUEST",
        message: "Moment posts support multiple images or a single video only."
      },
      400
    );
  }

  if (payload.kind === "not_found") {
    return context.json({ code: "INTERNAL_ERROR", message: "Failed to create post." }, 500);
  }

  return context.json(createPostResponseSchema.parse({ item: payload.item }));
});

postsRoute.get(API_ROUTES.posts.detail(":id"), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const sort = commentSortSchema.safeParse(context.req.query("commentSort") ?? "hot");
  const payload = await postsService.getPostDetail(id, context.get("currentUser"), {
    commentSort: sort.success ? sort.data : "hot"
  });
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }

  return context.json(postDetailResponseSchema.parse(payload));
});

postsRoute.put(API_ROUTES.posts.detail(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = updatePostInputSchema.parse(await context.req.json());
  const result = await postsService.updatePost(id, currentUser, {
    type: input.type,
    title: input.title,
    content: input.content,
    contentHtml: input.contentHtml ?? null,
    contentCategoryId: input.contentCategoryId ?? null,
    imageIds: input.imageIds,
    videoIds: input.videoIds
  });
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(postDetailResponseSchema.parse({ item: result.item }));
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
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
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
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

postsRoute.post(API_ROUTES.posts.interaction(":id", ":type"), requireAuth, async (context) => {
  const id = context.req.param("id");
  const currentUser = context.get("currentUser");
  const type = context.req.param("type");

  if (!id || !type) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const parsedType = postInteractionTypeSchema.parse(type);
  const result = await postsService.toggleInteraction(id, currentUser, parsedType);
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
  const result = await postsService.reportPost(id, currentUser.id, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
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
  const item = await postsService.updatePostStatus(
    id,
    input.status,
    input.rejectionReason ?? null
  );
  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  }

  return context.json(adminPostResponseSchema.parse({ item }));
});

postsRoute.get(API_ROUTES.posts.adminOfficialDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await postsService.getAdminOfficialArticle(id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Official article not found." }, 404);
  }

  return context.json(postDetailResponseSchema.parse(payload));
});

postsRoute.put(API_ROUTES.posts.adminOfficialDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = adminOfficialArticleUpdateInputSchema.parse(await context.req.json());
  const result = await postsService.updateAdminOfficialArticle(id, {
    title: input.title,
    content: input.content,
    contentHtml: input.contentHtml ?? null,
    contentCategoryId: input.contentCategoryId,
    imageIds: input.imageIds,
    videoIds: input.videoIds
  });

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Official article not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid uploaded images." }, 400);
  }
  if (result.kind === "invalid_videos") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid uploaded videos." }, 400);
  }

  return context.json(postDetailResponseSchema.parse({ item: result.item }));
});

postsRoute.delete(API_ROUTES.posts.adminOfficialDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const result = await postsService.deleteAdminOfficialArticle(id);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Official article not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

postsRoute.put(API_ROUTES.posts.commentDetail(":postId", ":commentId"), requireAuth, async (context) => {
  const postId = context.req.param("postId");
  const commentId = context.req.param("commentId");
  const currentUser = context.get("currentUser");

  if (!postId || !commentId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = updatePostCommentInputSchema.parse(await context.req.json());
  const result = await postsService.updateComment(postId, commentId, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(createPostCommentResponseSchema.parse({ item: result.item }));
});

postsRoute.post(API_ROUTES.posts.commentLike(":postId", ":commentId"), requireAuth, async (context) => {
  const postId = context.req.param("postId");
  const commentId = context.req.param("commentId");
  const currentUser = context.get("currentUser");

  if (!postId || !commentId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const result = await postsService.toggleCommentLike(postId, commentId, currentUser);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

postsRoute.post(API_ROUTES.posts.commentReport(":postId", ":commentId"), requireAuth, async (context) => {
  const postId = context.req.param("postId");
  const commentId = context.req.param("commentId");
  const currentUser = context.get("currentUser");

  if (!postId || !commentId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = reportContentInputSchema.parse(await context.req.json());
  const result = await postsService.reportComment(postId, commentId, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

postsRoute.get(API_ROUTES.posts.adminComments, requireAdmin, async (context) => {
  const statusQuery = context.req.query("status");
  const status =
    statusQuery === "pending" || statusQuery === "visible" || statusQuery === "hidden"
      ? statusQuery
      : undefined;
  const payload = await postsService.listAdminComments(status);
  return context.json(adminPostCommentsResponseSchema.parse(payload));
});

postsRoute.get(API_ROUTES.posts.adminReports(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await postsService.listPostReports(id);
  return context.json(adminReportRecordsResponseSchema.parse(payload));
});

postsRoute.get(API_ROUTES.posts.adminCommentReports(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await postsService.listPostCommentReports(id);
  return context.json(adminReportRecordsResponseSchema.parse(payload));
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
