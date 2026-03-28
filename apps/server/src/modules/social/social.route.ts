import {
  actionSuccessResponseSchema,
  currentUserProfileResponseSchema,
  notificationsResponseSchema,
  phoneChangeConfirmInputSchema,
  phoneChangeRequestInputSchema,
  phoneChangeRequestResponseSchema,
  updateCurrentUserProfileInputSchema,
  userContentResponseSchema,
  userProfileResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { socialService } from "./social.service";

export const socialRoute = new Hono<{ Variables: AuthVariables }>();

socialRoute.use("*", attachCurrentUser);

socialRoute.post(API_ROUTES.social.follow(":userId"), requireAuth, async (context) => {
  const userId = context.req.param("userId");
  const currentUser = context.get("currentUser");

  if (!userId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing user id." }, 400);
  }

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
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
  const currentUser = context.get("currentUser");

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const payload = await socialService.listNotifications(currentUser.id);
  return context.json(notificationsResponseSchema.parse(payload));
});

socialRoute.post(API_ROUTES.social.notificationsReadAll, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  await socialService.markAllNotificationsRead(currentUser.id);

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

socialRoute.get(API_ROUTES.users.meProfile, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const payload = await socialService.getCurrentUserProfile(currentUser.id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }

  return context.json(currentUserProfileResponseSchema.parse(payload));
});

socialRoute.put(API_ROUTES.users.meProfile, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
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
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = phoneChangeRequestInputSchema.parse(await context.req.json());
  const payload = await socialService.requestPhoneChange(currentUser.id, input);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }
  if ("kind" in payload && payload.kind === "conflict") {
    return context.json({ code: "CONFLICT", message: "手机号已被其他账号占用" }, 409);
  }

  return context.json(phoneChangeRequestResponseSchema.parse(payload.payload));
});

socialRoute.post(API_ROUTES.users.mePhoneChangeConfirm, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = phoneChangeConfirmInputSchema.parse(await context.req.json());
  const result = await socialService.confirmPhoneChange(currentUser.id, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }
  if (result.kind === "invalid_sms") {
    return context.json({ code: "BAD_REQUEST", message: "短信验证码无效或已过期" }, 400);
  }
  if (result.kind === "conflict") {
    return context.json({ code: "CONFLICT", message: "手机号已被其他账号占用" }, 409);
  }

  return context.json(currentUserProfileResponseSchema.parse(result.payload));
});

socialRoute.get(API_ROUTES.users.profile(":userId"), async (context) => {
  const userId = context.req.param("userId");
  if (!userId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing user id." }, 400);
  }

  const payload = await socialService.getUserProfile(userId, context.get("currentUser")?.id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }

  return context.json(userProfileResponseSchema.parse(payload));
});

socialRoute.get(API_ROUTES.users.content(":userId"), async (context) => {
  const userId = context.req.param("userId");
  if (!userId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing user id." }, 400);
  }

  const result = await socialService.listUserContent(userId, context.get("currentUser")?.id);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "User not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Profile content is not visible." }, 403);
  }

  return context.json(userContentResponseSchema.parse({ items: result.items }));
});
