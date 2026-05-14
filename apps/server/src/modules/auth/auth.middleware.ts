import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AdminRole } from "@feijia/schemas";
import { authService } from "./auth.service";
import { authRepo, type SessionScope } from "./auth.repo";

export type AuthVariables = {
  currentUser: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    role: "user" | "admin";
  } | null;
  currentSessionScope: SessionScope | null;
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
      context.set("currentSessionScope", null);
      context.set("authErrorCode", "TOKEN_EXPIRED");
      await next();
      return;
    }
    if (status === "user_banned") {
      context.set("currentUser", null);
      context.set("currentSessionScope", null);
      context.set("authErrorCode", "USER_BANNED");
      await next();
      return;
    }
  }

  const user = await authService.getCurrentUser(sessionId);
  context.set("currentUser", user);
  if (user && sessionId) {
    const session = await authRepo.getSession(sessionId, { touch: false });
    context.set("currentSessionScope", session?.scope ?? null);
  } else {
    context.set("currentSessionScope", null);
  }
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
  if (user.role !== "admin" || context.var.currentSessionScope !== "admin") {
    return forbidden(context);
  }
  await next();
}

/**
 * 角色级权限守卫 — 仅允许指定角色访问。
 * super_admin 和 admin 拥有全部权限，自动放行（向后兼容）。
 *
 * @param allowedRoles - 允许访问的角色列表
 * @returns Hono 中间件
 * @example requireRole('super_admin', 'editor')
 */
export function requireRole(...allowedRoles: AdminRole[]) {
  const allowed = new Set<AdminRole>(["super_admin", "admin", ...allowedRoles]);
  return async (context: AuthContext, next: Next) => {
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
    // super_admin 和 admin 拥有全部权限（已预置到 allowed 集合中）
    if (!allowed.has(user.role as AdminRole)) {
      return context.json(
        { code: "FORBIDDEN", message: "角色无权限访问此资源" },
        403
      );
    }
    return next();
  };
}
