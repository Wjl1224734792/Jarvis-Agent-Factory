import {
  adminBanUserInputSchema,
  adminUserListQuerySchema,
  adminUserResponseSchema,
  adminUsersResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { AdminUserManagementError, usersService } from "./users.service";

export const usersRoute = new Hono<{ Variables: AuthVariables }>();

function toAdminUserErrorResponse(error: AdminUserManagementError) {
  if (error.code === "NOT_FOUND") {
    return {
      status: 404 as const,
      body: {
        code: "NOT_FOUND",
        message: error.message
      }
    };
  }

  return {
    status: 400 as const,
    body: {
      code: "BAD_REQUEST",
      message: error.message
    }
  };
}

usersRoute.use("*", attachCurrentUser);

usersRoute.get(API_ROUTES.admin.users, requireAdmin, async (context) => {
  const query = adminUserListQuerySchema.parse(context.req.query());
  const payload = await usersService.listAdminUsers(query);
  return context.json(adminUsersResponseSchema.parse(payload));
});

usersRoute.get(API_ROUTES.admin.userDetail(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "NOT_FOUND", message: "用户不存在" }, 404);
  }

  try {
    const payload = await usersService.getAdminUser(id);
    return context.json(adminUserResponseSchema.parse(payload));
  } catch (error) {
    if (error instanceof AdminUserManagementError) {
      const response = toAdminUserErrorResponse(error);
      return context.json(response.body, response.status);
    }
    throw error;
  }
});

usersRoute.post(API_ROUTES.admin.userBan(":id"), requireAdmin, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "未登录或会话失效" }, 401);
  }

  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "NOT_FOUND", message: "用户不存在" }, 404);
  }
  const input = adminBanUserInputSchema.parse(await context.req.json());

  try {
    const payload = await usersService.banUser(id, currentUser.id, input);
    return context.json(adminUserResponseSchema.parse(payload));
  } catch (error) {
    if (error instanceof AdminUserManagementError) {
      const response = toAdminUserErrorResponse(error);
      return context.json(response.body, response.status);
    }
    throw error;
  }
});

usersRoute.post(API_ROUTES.admin.userUnban(":id"), requireAdmin, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "NOT_FOUND", message: "用户不存在" }, 404);
  }

  try {
    const payload = await usersService.unbanUser(id);
    return context.json(adminUserResponseSchema.parse(payload));
  } catch (error) {
    if (error instanceof AdminUserManagementError) {
      const response = toAdminUserErrorResponse(error);
      return context.json(response.body, response.status);
    }
    throw error;
  }
});
