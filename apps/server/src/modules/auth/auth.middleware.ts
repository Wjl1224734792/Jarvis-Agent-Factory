import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { authService } from "./auth.service";

export type AuthVariables = {
  currentUser: {
    id: string;
    displayName: string;
    role: "user" | "admin";
  } | null;
};

const SESSION_COOKIE_NAME = "feijia_session";

function unauthorized(context: Context) {
  return context.json(
    {
      code: "UNAUTHORIZED",
      message: "未登录或会话失效"
    },
    401
  );
}

function forbidden(context: Context) {
  return context.json(
    {
      code: "FORBIDDEN",
      message: "管理员权限不足"
    },
    403
  );
}

export async function attachCurrentUser(context: Context, next: Next) {
  const sessionId = getCookie(context, SESSION_COOKIE_NAME);
  const user = await authService.getCurrentUser(sessionId);
  context.set("currentUser", user);
  await next();
}

export async function requireAuth(context: Context, next: Next) {
  const user = context.get("currentUser");
  if (!user) {
    return unauthorized(context);
  }
  await next();
}

export async function requireAdmin(context: Context, next: Next) {
  const user = context.get("currentUser");
  if (!user) {
    return unauthorized(context);
  }
  if (user.role !== "admin") {
    return forbidden(context);
  }
  await next();
}

export { SESSION_COOKIE_NAME };
