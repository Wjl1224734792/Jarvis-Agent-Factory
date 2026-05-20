import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAuth,
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
  const item = await circlesService.createCircle({
    slug: body.slug,
    name: body.name,
    description: body.description ?? null,
    coverImageFileId: body.coverImageFileId ?? null,
    ownerId: user.id,
    joinMode: body.joinMode ?? "free",
  });
  return context.json({ item }, 201);
});

// ── Feed（必须放在 :slug 之前，否则 "feed" 被当作 slug 解析） ──

circlesRoute.get(API_ROUTES.circles.feed, async (context) => {
  const items = await circlesService.listFeed({
    tab: (context.req.query("tab") as "recommended" | "latest" | "following") || undefined,
    currentUserId: context.get("currentUser")?.id,
    limit: Number(context.req.query("limit")) || undefined,
    offset: Number(context.req.query("offset")) || undefined,
  });
  return context.json({ items });
});

// ── 不选圈子的发帖（静态路由必须在 :param 之前） ──

circlesRoute.post(API_ROUTES.circles.createPost, requireAuth, async (context) => {
  const user = context.get("currentUser")!;
  const body = await context.req.json();
  const id = await circlesService.createCirclePost({
    authorId: user.id,
    title: body.title,
    content: body.content ?? null,
    images: body.images ?? [],
    videos: body.videos ?? [],
  });
  return context.json({ id }, 201);
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
  const id = context.req.param("id")!;
  const body = await context.req.json();
  const item = await circlesService.updateCircle(id, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    joinMode: body.joinMode,
    isEnabled: body.isEnabled,
  });
  if (!item) return context.json({ code: "NOT_FOUND", message: "Circle not found." }, 404);
  return context.json({ item });
});

circlesRoute.delete(API_ROUTES.circles.update(":id"), requireAuth, async (context) => {
  await circlesService.deleteCircle(context.req.param("id")!);
  return context.json({ success: true });
});

circlesRoute.post(API_ROUTES.circles.categoryAssignments(":categoryId"), requireAuth, async (context) => {
  const body = await context.req.json();
  await circlesService.assignCircleToCategory(context.req.param("categoryId")!, body.circleId);
  return context.json({ success: true });
});

circlesRoute.delete(API_ROUTES.circles.categoryAssignments(":categoryId"), requireAuth, async (context) => {
  const body = await context.req.json();
  await circlesService.removeCircleFromCategory(context.req.param("categoryId")!, body.circleId);
  return context.json({ success: true });
});
