import { API_ROUTES } from "@feijia/shared";
import {
  reportCirclePostInputSchema,
  reportCirclePostCommentInputSchema,
  updateCirclePostInputSchema,
  updateCircleCommentInputSchema,
  adminCirclePostsQuerySchema,
  adminCircleCommentsQuerySchema,
  adminCirclePostStatusInputSchema,
  adminCircleCommentStatusInputSchema,
} from "@feijia/schemas";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAuth,
  requireRole,
  type AuthVariables,
} from "../auth/auth.middleware";
import { circlesService } from "./circles.service";

export const circlesRoute = new Hono<{ Variables: AuthVariables }>();
circlesRoute.use("*", attachCurrentUser);

// ── 圈子列表 & 创建 ──

circlesRoute.get(API_ROUTES.circles.list, async (context) => {
  const userId = context.req.query("userId") || undefined;
  if (userId) {
    const items = await circlesService.listUserCircles(userId);
    return context.json({ items });
  }
  const items = await circlesService.listCircles({
    keyword: context.req.query("keyword") || undefined,
    sort: (context.req.query("sort") as "hot" | "latest") || undefined,
    limit: Number(context.req.query("limit")) || undefined,
    offset: Number(context.req.query("offset")) || undefined,
  });
  return context.json({ items });
});

circlesRoute.post(API_ROUTES.circles.create, requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const result = await circlesService.createCircle({
    slug: body.slug,
    name: body.name,
    description: body.description ?? null,
    coverImageFileId: body.coverImageFileId ?? null,
    ownerId: user.id,
    joinMode: body.joinMode ?? "free",
    userRole: user.role,
  });
  if ("code" in result && result.code === "SPAM_BLOCKED") {
    return context.json(result, 403);
  }
  return context.json({ item: result }, 201);
});

// ── Feed（必须放在 :slug 之前，否则 "feed" 被当作 slug 解析） ──

circlesRoute.get(API_ROUTES.circles.feed, async (context) => {
  const tab = context.req.query("tab");
  if (tab && !["recommended", "latest", "following"].includes(tab)) {
    return context.json({ code: "INVALID_TAB", message: `Unknown tab: ${tab}` }, 400);
  }
  const items = await circlesService.listFeed({
    tab: (tab as "recommended" | "latest" | "following") || undefined,
    currentUserId: context.get("currentUser")?.id,
    limit: Number(context.req.query("limit")) || undefined,
    offset: Number(context.req.query("offset")) || undefined,
  });
  return context.json({ items });
});

// ── 不选圈子的发帖（已废弃，返回 410 Gone） ──

circlesRoute.post(API_ROUTES.circles.createPost, requireAuth, async (context) => {
  return context.json({
    code: "GONE",
    message: "独立发帖已废弃，所有帖子必须归属圈子。请在圈子内发帖。",
  }, 410);
});

// ── 用户圈子分类（静态路由必须在 :id 之前） ──

circlesRoute.get(API_ROUTES.circles.userCategories, requireAuth, async (context) => {
  const items = await circlesService.listUserCategories(context.get("currentUser")!.id);
  return context.json({ items });
});

circlesRoute.post(API_ROUTES.circles.userCategories, requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const id = await circlesService.createUserCategory(user.id, body.name);
  return context.json({ id }, 201);
});

// ── 圈子详情 ──

circlesRoute.get(API_ROUTES.circles.detail(":slug"), async (context) => {
  const slug = context.req.param("slug")!;
  if (!slug) return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  const item = await circlesService.getCircleDetail(slug, context.get("currentUser")?.id);
  if (!item) return context.json({ code: "NOT_FOUND", message: "Circle not found." }, 404);
  return context.json({ item });
});

// ── 加入/离开圈子 ──

circlesRoute.post(API_ROUTES.circles.join(":id"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const result = await circlesService.joinCircle(context.req.param("id")!, user.id);
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Circle not found." }, 404);
  if (result.kind === "already_member") return context.json({ code: "CONFLICT", message: "Already a member." }, 409);
  return context.json({ success: true });
});

circlesRoute.post(API_ROUTES.circles.leave(":id"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const result = await circlesService.leaveCircle(context.req.param("id")!, user.id);
  if (result.kind === "not_member") return context.json({ code: "NOT_FOUND", message: "Not a member." }, 404);
  if (result.kind === "owner_cannot_leave") return context.json({ code: "FORBIDDEN", message: "Owner cannot leave." }, 403);
  return context.json({ success: true });
});

// ── 成员 ──

circlesRoute.get(API_ROUTES.circles.members(":id"), async (context) => {
  const items = await circlesService.listCircleMembers(context.req.param("id")!);
  return context.json({ items });
});

// ── 帖子 ──

circlesRoute.get(API_ROUTES.circles.posts.list(":circleId"), async (context) => {
  const items = await circlesService.listCirclePosts(context.req.param("circleId")!, {
    tab: (context.req.query("tab") as "recommended" | "latest") || undefined,
    limit: Number(context.req.query("limit")) || undefined,
    offset: Number(context.req.query("offset")) || undefined,
  });
  return context.json({ items });
});

circlesRoute.post(API_ROUTES.circles.posts.create(":circleId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const id = await circlesService.createCirclePost({
    circleId: context.req.param("circleId")!,
    authorId: user.id,
    title: body.title,
    content: body.content ?? null,
    images: body.images ?? [],
    videos: body.videos ?? [],
  });
  return context.json({ id }, 201);
});

circlesRoute.get(API_ROUTES.circles.posts.detail(":circleId", ":postId"), async (context) => {
  const post = await circlesService.getPostDetail(context.req.param("postId")!);
  if (!post) return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  return context.json({ item: post });
});

circlesRoute.post(API_ROUTES.circles.posts.interact(":circleId", ":postId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const active = await circlesService.togglePostInteraction(
    context.req.param("postId")!,
    user.id,
    body.type
  );
  return context.json({ active });
});

// ── 评论 ──

circlesRoute.get(API_ROUTES.circles.posts.comments(":circleId", ":postId"), async (context) => {
  const items = await circlesService.listPostComments(context.req.param("postId")!);
  return context.json({ items });
});

circlesRoute.post(API_ROUTES.circles.posts.comments(":circleId", ":postId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const id = await circlesService.createComment({
    postId: context.req.param("postId")!,
    authorId: user.id,
    content: body.content,
    parentCommentId: body.parentCommentId ?? null,
    replyToUserId: body.replyToUserId ?? null,
  });
  return context.json({ id }, 201);
});

circlesRoute.delete(API_ROUTES.circles.userCategoryDetail(":id"), requireAuth, async (context) => {
  await circlesService.deleteUserCategory(context.req.param("id")!, context.get("currentUser")!.id);
  return context.json({ success: true });
});

// ── 圈子更新/删除 ──

circlesRoute.put(API_ROUTES.circles.update(":id"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const id = context.req.param("id")!;
  const body = await context.req.json();
  const result = await circlesService.updateCircle(id, user.id, user.role, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    joinMode: body.joinMode,
    isEnabled: body.isEnabled,
  });
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Circle not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ item: result.circle });
});

circlesRoute.delete(API_ROUTES.circles.update(":id"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const result = await circlesService.deleteCircle(context.req.param("id")!, user.id, user.role);
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Circle not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ success: true });
});

circlesRoute.post(API_ROUTES.circles.categoryAssignments(":categoryId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const result = await circlesService.assignCircleToCategory(
    context.req.param("categoryId")!,
    body.circleId,
    user.id
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Category not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ success: true });
});

circlesRoute.delete(API_ROUTES.circles.categoryAssignments(":categoryId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const result = await circlesService.removeCircleFromCategory(
    context.req.param("categoryId")!,
    body.circleId,
    user.id
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Category not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ success: true });
});

// ── 帖子举报 ──

circlesRoute.post(API_ROUTES.circles.posts.report(":circleId", ":postId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = reportCirclePostInputSchema.parse(await context.req.json());
  const reason = body.reason;
  const imageFileIds = body.imageFileIds;
  const result = await circlesService.reportPost(
    context.req.param("postId")!,
    user.id,
    reason,
    imageFileIds
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  return context.json({ id: result.id }, 201);
});

// ── 评论举报 ──

circlesRoute.post(API_ROUTES.circles.posts.commentReport(":circleId", ":postId", ":commentId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = reportCirclePostCommentInputSchema.parse(await context.req.json());
  const reason = body.reason;
  const imageFileIds = body.imageFileIds;
  const result = await circlesService.reportComment(
    context.req.param("commentId")!,
    user.id,
    reason,
    imageFileIds
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  return context.json({ id: result.id }, 201);
});

// ── 评论点赞 ──

circlesRoute.post(API_ROUTES.circles.posts.commentLike(":circleId", ":postId", ":commentId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const result = await circlesService.toggleCommentLike(
    context.req.param("commentId")!,
    user.id
  );
  return context.json(result);
});

// ── 帖子编辑/删除 ──

circlesRoute.put(API_ROUTES.circles.posts.update(":circleId", ":postId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = updateCirclePostInputSchema.parse(await context.req.json());
  const result = await circlesService.updatePost(
    context.req.param("postId")!,
    user.id,
    {
      title: body.title,
      content: body.content,
      images: body.images,
      videos: body.videos,
    }
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ item: result.post });
});

circlesRoute.delete(API_ROUTES.circles.posts.delete(":circleId", ":postId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const result = await circlesService.deletePost(
    context.req.param("postId")!,
    user.id,
    user.role
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ success: true });
});

// ── 评论编辑/删除 ──

circlesRoute.put(API_ROUTES.circles.posts.commentUpdate(":circleId", ":postId", ":commentId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = updateCircleCommentInputSchema.parse(await context.req.json());
  const result = await circlesService.updateComment(
    context.req.param("commentId")!,
    user.id,
    body.content
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ item: result.comment });
});

circlesRoute.delete(API_ROUTES.circles.posts.commentDelete(":circleId", ":postId", ":commentId"), requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const result = await circlesService.deleteComment(
    context.req.param("commentId")!,
    user.id,
    user.role
  );
  if (result.kind === "not_found") return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  if (result.kind === "forbidden") return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  return context.json({ success: true });
});

// ── Admin 路由 ──

export const adminCirclesRoute = new Hono<{ Variables: AuthVariables }>();
adminCirclesRoute.use("*", attachCurrentUser, requireRole("super_admin", "moderator"));

adminCirclesRoute.get(API_ROUTES.adminCircles.posts, async (context) => {
  const query = adminCirclePostsQuerySchema.parse(context.req.query());
  const posts = await circlesService.listAllPosts({
    status: query.status,
    circleId: query.circleId,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return context.json({ items: posts });
});

adminCirclesRoute.put(API_ROUTES.adminCircles.postStatus(":postId"), async (context) => {
  const body = adminCirclePostStatusInputSchema.parse(await context.req.json());
  const ok = await circlesService.updatePostStatus(context.req.param("postId")!, body.status);
  if (!ok) return context.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
  return context.json({ success: true });
});

adminCirclesRoute.get(API_ROUTES.adminCircles.postReports(":postId"), async (context) => {
  const reports = await circlesService.listPostReports(context.req.param("postId")!);
  return context.json({ items: reports });
});

adminCirclesRoute.get(API_ROUTES.adminCircles.comments, async (context) => {
  const query = adminCircleCommentsQuerySchema.parse(context.req.query());
  const comments = await circlesService.listAllComments({
    status: query.status,
    circleId: query.circleId,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return context.json({ items: comments });
});

adminCirclesRoute.put(API_ROUTES.adminCircles.commentStatus(":commentId"), async (context) => {
  const body = adminCircleCommentStatusInputSchema.parse(await context.req.json());
  const ok = await circlesService.updateCommentStatus(context.req.param("commentId")!, body.status);
  if (!ok) return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  return context.json({ success: true });
});

adminCirclesRoute.get(API_ROUTES.adminCircles.commentReports(":commentId"), async (context) => {
  const reports = await circlesService.listCommentReports(context.req.param("commentId")!);
  return context.json({ items: reports });
});
