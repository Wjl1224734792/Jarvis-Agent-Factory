import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { authService } from "./auth.service";
import { authRepo } from "./auth.repo";

export type AuthVariables = {
  currentUser: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    role: "user" | "admin";
  } | null;
  authErrorCode?: string;
};

export type AuthContext = Context<{ Variables: AuthVariables }>;

export function readSessionToken(context: Context) {
  const authorization = context.req.header("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token) {
      return token;
    }
  }

  return getCookie(context, "feijia_access");
}

function unauthorized(context: AuthContext) {
  return context.json(
    {
      code: "UNAUTHORIZED",
      message: "未登录或会话失效"
    },
    401
  );
}

function forbidden(context: AuthContext) {
  return context.json(
    {
      code: "FORBIDDEN",
      message: "管理员权限不足"
    },
    403
  );
}

function banned(context: AuthContext) {
  return context.json(
    {
      code: "USER_BANNED",
      message: "账号已被封禁，请联系管理员"
    },
    403
  );
}

export async function attachCurrentUser(context: AuthContext, next: Next) {
  const sessionId = readSessionToken(context);

  if (sessionId) {
    const status = await authRepo.getSessionForMiddleware(sessionId);
    if (status === "access_expired") {
      context.set("currentUser", null);
      context.set("authErrorCode", "TOKEN_EXPIRED");
      await next();
      return;
    }
    if (status === "user_banned") {
      context.set("currentUser", null);
      context.set("authErrorCode", "USER_BANNED");
      await next();
      return;
    }
  }

  const user = await authService.getCurrentUser(sessionId);
  context.set("currentUser", user);
  await next();
}

export async function requireAuth(context: AuthContext, next: Next) {
  const user = context.var.currentUser;
  if (!user) {
    const errorCode = context.var.authErrorCode;
    if (errorCode === "USER_BANNED") {
      return banned(context);
    }
    if (errorCode === "TOKEN_EXPIRED") {
      return context.json(
        {
          code: "TOKEN_EXPIRED",
          message: "Access token expired."
        },
        401
      );
    }
    return unauthorized(context);
  }
  await next();
}

export async function requireAdmin(context: AuthContext, next: Next) {
  const user = context.var.currentUser;
  if (!user) {
    const errorCode = context.var.authErrorCode;
    if (errorCode === "USER_BANNED") {
      return banned(context);
    }
    if (errorCode === "TOKEN_EXPIRED") {
      return context.json(
        {
          code: "TOKEN_EXPIRED",
          message: "Access token expired."
        },
        401
      );
    }
    return unauthorized(context);
  }
  if (user.role !== "admin") {
    return forbidden(context);
  }
  await next();
}
