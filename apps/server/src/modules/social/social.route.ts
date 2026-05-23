import {
  actionSuccessResponseSchema,
  adminMessageListQuerySchema,
  adminMessageListResponseSchema,
  adminModerationTodosResponseSchema,
  currentUserProfileResponseSchema,
  notificationsResponseSchema,
  phoneChangeConfirmInputSchema,
  phoneChangeRequestInputSchema,
  phoneChangeRequestResponseSchema,
  updateCurrentUserProfileInputSchema,
  userCommentListQuerySchema,
  userCommentListResponseSchema,
  userContentResponseSchema,
  userProfileResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  type AuthContext,
  requireAuth,
  requireRole,
  type AuthVariables
} from "../auth/auth.middleware";
import { normalizeClientIp } from "../../lib/ip-location";
import { socialService } from "./social.service";

export const socialRoute = new Hono<{ Variables: AuthVariables }>();

function getCurrentUserOrUnauthorized(context: AuthContext) {
  const currentUser = context.var.currentUser;
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  return currentUser;
}

function getRequiredParam(context: AuthContext, key: string, missingMessage: string) {
  const value = context.req.param(key);
  if (!value) {
    return context.json({ code: "BAD_REQUEST", message: missingMessage }, 400);
  }

  return value;
}

function getClientIp(context: AuthContext) {
  const forwarded = context.req.header("x-forwarded-for");
  if (forwarded) {
    return normalizeClientIp(
      forwarded
        .split(",")
        .map((value) => value.trim())
        .find(Boolean) ?? null
    );
  }

  const proxyHeaderIp = context.req.header("x-real-ip") ?? context.req.header("cf-connecting-ip");
  if (proxyHeaderIp) {
    return normalizeClientIp(proxyHeaderIp);
  }

  // 无反向代理时回退到 TCP 连接的远程地址
  const rawRequest = context.req.raw as { socket?: { remoteAddress?: string } };
  return normalizeClientIp(rawRequest.socket?.remoteAddress ?? null);
}

// 社交域路由：统一处理关注关系、通知、个人资料和公开主页内容。
socialRoute.use("*", attachCurrentUser);

socialRoute.post(API_ROUTES.social.follow(":userId"), requireAuth, async (context) => {
  const userId = getRequiredParam(context, "userId", "Missing user id.");
  if (userId instanceof Response) {
    return userId;
  }
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const result = await socialService.toggleFollow(currentUser.id, userId);

  if (result.kind === "invalid_self") {
    return context.json({ code: "BAD_REQUEST", message: "Cannot follow yourself." }, 400);
  }

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

socialRoute.get(API_ROUTES.social.notifications, requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const payload = await socialService.listNotifications(currentUser.id);
  return context.json(notificationsResponseSchema.parse(payload));
});

socialRoute.post(API_ROUTES.social.notificationsReadAll, requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  await socialService.markAllNotificationsRead(currentUser.id);

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

socialRoute.post(API_ROUTES.social.notificationRead(":id"), requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }
  const notificationId = getRequiredParam(context, "id", "Missing notification id.");
  if (notificationId instanceof Response) {
    return notificationId;
  }

  const result = await socialService.markNotificationRead(currentUser.id, notificationId);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Notification not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

socialRoute.get(API_ROUTES.admin.messages, requireRole('super_admin', 'moderator'), async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const query = adminMessageListQuerySchema.parse(context.req.query());
  const payload = await socialService.listAdminMessages(currentUser.id, query);
  return context.json(adminMessageListResponseSchema.parse(payload));
});

socialRoute.post(API_ROUTES.admin.messagesReadAll, requireRole('super_admin', 'moderator'), async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  await socialService.markAllAdminMessagesRead(currentUser.id);

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

socialRoute.post(API_ROUTES.admin.messageRead(":id"), requireRole('super_admin', 'moderator'), async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const notificationId = getRequiredParam(context, "id", "Missing notification id.");
  if (notificationId instanceof Response) {
    return notificationId;
  }

  const result = await socialService.markAdminMessageRead(currentUser.id, notificationId);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Notification not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

socialRoute.get(API_ROUTES.admin.messageTodos, requireRole('super_admin', 'moderator'), async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const payload = await socialService.listAdminModerationTodos();
  return context.json(adminModerationTodosResponseSchema.parse(payload));
});

socialRoute.get(API_ROUTES.users.meProfile, requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const payload = await socialService.getCurrentUserProfile(currentUser.id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }

  return context.json(currentUserProfileResponseSchema.parse(payload));
});

socialRoute.put(API_ROUTES.users.meProfile, requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const input = updateCurrentUserProfileInputSchema.parse(await context.req.json());
  const payload = await socialService.updateCurrentUserProfile(currentUser.id, input);
  if (payload && "kind" in payload && payload.kind === "display_name_conflict") {
    return context.json({ code: "CONFLICT", message: "用户名已被占用" }, 409);
  }
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }

  return context.json(currentUserProfileResponseSchema.parse(payload));
});

socialRoute.post(API_ROUTES.users.mePhoneChangeRequest, requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const input = phoneChangeRequestInputSchema.parse(await context.req.json());
  const payload = await socialService.requestPhoneChange(currentUser.id, input, {
    clientIp: getClientIp(context)
  });
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }
  if ("kind" in payload && payload.kind === "conflict") {
    return context.json({ code: "CONFLICT", message: "手机号已被其他账号占用" }, 409);
  }
  if ("kind" in payload && payload.kind === "password_required") {
    return context.json({ code: "PASSWORD_REQUIRED", message: "请先设置登录密码" }, 403);
  }

  return context.json(phoneChangeRequestResponseSchema.parse(payload.payload));
});

socialRoute.post(API_ROUTES.users.mePhoneChangeConfirm, requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const input = phoneChangeConfirmInputSchema.parse(await context.req.json());
  const result = await socialService.confirmPhoneChange(currentUser.id, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }
  if (result.kind === "invalid_sms") {
    return context.json({ code: "BAD_REQUEST", message: "短信验证码无效或已过期" }, 400);
  }
  if (result.kind === "password_required") {
    return context.json({ code: "PASSWORD_REQUIRED", message: "请先设置登录密码" }, 403);
  }
  if (result.kind === "conflict") {
    return context.json({ code: "CONFLICT", message: "手机号已被其他账号占用" }, 409);
  }

  return context.json(currentUserProfileResponseSchema.parse(result.payload));
});

socialRoute.get(API_ROUTES.users.profile(":userId"), async (context) => {
  const userId = getRequiredParam(context, "userId", "Missing user id.");
  if (userId instanceof Response) {
    return userId;
  }

  const payload = await socialService.getUserProfile(userId, context.var.currentUser?.id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }

  return context.json(userProfileResponseSchema.parse(payload));
});

socialRoute.get(API_ROUTES.users.content(":userId"), async (context) => {
  const userId = getRequiredParam(context, "userId", "Missing user id.");
  if (userId instanceof Response) {
    return userId;
  }

  const result = await socialService.listUserContent(userId, context.var.currentUser?.id);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Profile content is not visible." }, 403);
  }

  return context.json(userContentResponseSchema.parse({ items: result.items }));
});

socialRoute.get(API_ROUTES.users.comments(":userId"), async (context) => {
  const userId = getRequiredParam(context, "userId", "Missing user id.");
  if (userId instanceof Response) {
    return userId;
  }

  const query = userCommentListQuerySchema.parse(context.req.query());
  const result = await socialService.listUserComments(userId, context.var.currentUser?.id, query);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Profile content is not visible." }, 403);
  }

  return context.json(userCommentListResponseSchema.parse({ items: result.items, meta: result.meta }));
});
