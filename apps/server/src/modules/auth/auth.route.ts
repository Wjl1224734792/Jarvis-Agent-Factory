import {
  actionSuccessResponseSchema,
  adminLoginRequestSchema,
  adminPasswordChangeRequestSchema,
  adminRecentSessionsResponseSchema,
  appAuthSessionResponseSchema,
  appLoginRequestSchema,
  appLoginResponseSchema,
  appRefreshRequestSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  captchaChallengeResponseSchema,
  completeAppRegistrationRequestSchema,
  completeWebRegistrationRequestSchema,
  currentUserResponseSchema,
  deviceRegisterInputSchema,
  deviceRegisterResponseSchema,
  deviceUnregisterInputSchema,
  registrationDisplayNameSuggestRequestSchema,
  registrationDisplayNameSuggestResponseSchema,
  ROLE_PERMISSIONS,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  userPasswordChangeRequestSchema,
  webLoginRequestSchema,
  webLoginResponseSchema
} from "@feijia/schemas";
import { db, rolesTable } from "@feijia/db";
import { eq } from "drizzle-orm";
import { API_ROUTES } from "@feijia/shared";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  attachCurrentUser,
  readSessionToken,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "./auth.middleware";
import { AuthError, authService } from "./auth.service";
import { normalizeClientIp } from "../../lib/ip-location";

const authRoute = new Hono<{ Variables: AuthVariables }>();

const ACCESS_COOKIE_NAME = "feijia_access";
const REFRESH_COOKIE_NAME = "feijia_refresh";

function shouldUseSecureCookies() {
  return process.env.NODE_ENV === "production";
}

/** Access token cookie 有效期（秒），与 ACCESS_TTL_MS 保持一致 */
const ACCESS_COOKIE_MAX_AGE = 2 * 60 * 60;
/** Refresh token cookie 有效期（秒），与 SESSION_TTL_MS 保持一致 */
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function setAuthCookies(
  context: Context,
  sessionId: string,
  refreshToken?: string
) {
  setCookie(context, ACCESS_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
    secure: shouldUseSecureCookies()
  });

  if (refreshToken) {
    setCookie(context, REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE,
      secure: shouldUseSecureCookies()
    });
  }
}

function clearAuthCookies(context: Context) {
  deleteCookie(context, ACCESS_COOKIE_NAME, { path: "/" });
  deleteCookie(context, REFRESH_COOKIE_NAME, { path: "/" });
}

function getClientIp(context: Context) {
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

  // 无反向代理时回退到 TCP 连接的远程地址（适配本地开发与直连场景）
  const rawRequest = context.req.raw as { socket?: { remoteAddress?: string } };
  return normalizeClientIp(rawRequest.socket?.remoteAddress ?? null);
}

function getRequestMetadata(
  context: Context,
  explicitDeviceLabel?: string | null
) {
  return {
    clientIp: getClientIp(context),
    userAgent: context.req.header("user-agent") ?? null,
    deviceLabel: explicitDeviceLabel ?? null
  };
}

function currentAuthErrorResponse(context: Context<{ Variables: AuthVariables }>) {
  const errorCode = context.get("authErrorCode");
  if (errorCode === "TOKEN_EXPIRED") {
    return context.json(
      authErrorResponseSchema.parse({
        code: "TOKEN_EXPIRED",
        message: "Access token expired."
      }),
      401
    );
  }

  if (errorCode === "USER_BANNED") {
    return context.json(
      authErrorResponseSchema.parse({
        code: "USER_BANNED",
        message: "账号已被封禁，请联系管理员"
      }),
      403
    );
  }

  return null;
}

// 先处理登录、注册、验证码等匿名可访问接口，随后再挂载当前用户解析中间件。
authRoute.post(API_ROUTES.auth.captchaChallenge, async (context) => {
  try {
    const payload = captchaChallengeResponseSchema.parse(
      await authService.requestCaptchaChallenge({ clientIp: getClientIp(context) })
    );
    return context.json(payload);
  } catch (error) {
    if (error instanceof AuthError) {
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        error.code === "RATE_LIMITED" ? 429 : 400
      );
    }

    throw error;
  }
});

authRoute.post(API_ROUTES.auth.smsRequest, async (context) => {
  const input = smsCodeRequestSchema.parse(await context.req.json());

  try {
    const payload = smsCodeResponseSchema.parse(
      await authService.requestSmsCode(input, { clientIp: getClientIp(context) })
    );
    return context.json(payload);
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "SMS_PROVIDER_UNAVAILABLE" ? 503
        : error.code === "SMS_RATE_LIMITED" ? 429 : 400;
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        status
      );
    }

    throw error;
  }
});

authRoute.post(API_ROUTES.auth.webLogin, async (context) => {
  // Captcha is consumed when requesting the SMS code, so the login request only
  // validates the SMS challenge result plus session metadata.
  const input = webLoginRequestSchema.parse(await context.req.json());

  try {
    const result = await authService.loginWeb(
      input,
      getRequestMetadata(context)
    );
    if (result.kind === "authenticated") {
      setAuthCookies(context, result.sessionId, result.refreshToken);
    }
    return context.json(webLoginResponseSchema.parse(result));
  } catch (error) {
    if (error instanceof AuthError) {
      const status =
        error.code === "ADMIN_ACCOUNT_LOCKED" || error.code === "RATE_LIMITED"
          ? 429
          : error.code === "USER_BANNED" ? 403 : 400;
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        status
      );
    }

    throw error;
  }
});

authRoute.post(API_ROUTES.auth.appLogin, async (context) => {
  const input = appLoginRequestSchema.parse(await context.req.json());

  try {
    const result = await authService.loginApp(
      input,
      getRequestMetadata(context, input.deviceLabel ?? null)
    );
    return context.json(appLoginResponseSchema.parse(result));
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "USER_BANNED" ? 403 : 400;
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        status
      );
    }

    throw error;
  }
});

authRoute.post(
  API_ROUTES.auth.registrationDisplayNameSuggest,
  async (context) => {
    const input = registrationDisplayNameSuggestRequestSchema.parse(
      await context.req.json()
    );

    try {
      const payload = await authService.suggestRegistrationDisplayName(
        input.registrationToken
      );
      return context.json(
        registrationDisplayNameSuggestResponseSchema.parse(payload)
      );
    } catch (error) {
      if (error instanceof AuthError) {
        return context.json(
          authErrorResponseSchema.parse({
            code: error.code,
            message: error.message
          }),
          400
        );
      }

      throw error;
    }
  }
);

authRoute.post(API_ROUTES.auth.webRegisterComplete, async (context) => {
  const input = completeWebRegistrationRequestSchema.parse(
    await context.req.json()
  );

  try {
    const result = await authService.completeWebRegistration(
      input,
      getRequestMetadata(context)
    );
    setAuthCookies(context, result.sessionId, result.refreshToken);
    return context.json(
      authSuccessResponseSchema.parse({ user: result.user })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        error.code === "DISPLAY_NAME_TAKEN" ||
          error.code === "PHONE_ALREADY_REGISTERED"
          ? 409
          : 400
      );
    }

    throw error;
  }
});

authRoute.post(API_ROUTES.auth.appRegisterComplete, async (context) => {
  const input = completeAppRegistrationRequestSchema.parse(
    await context.req.json()
  );

  try {
    const result = await authService.completeAppRegistration(
      input,
      getRequestMetadata(context, input.deviceLabel ?? null)
    );
    return context.json(appAuthSessionResponseSchema.parse(result));
  } catch (error) {
    if (error instanceof AuthError) {
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        error.code === "DISPLAY_NAME_TAKEN" ||
          error.code === "PHONE_ALREADY_REGISTERED"
          ? 409
          : 400
      );
    }

    throw error;
  }
});

authRoute.post(API_ROUTES.auth.appRefresh, async (context) => {
  const input = appRefreshRequestSchema.parse(await context.req.json());

  try {
    const result = await authService.refreshAppSession(input.refreshToken);
    return context.json(appAuthSessionResponseSchema.parse(result));
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "USER_BANNED" ? 403 : 400;
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        status
      );
    }

    throw error;
  }
});

authRoute.post(API_ROUTES.auth.webRefresh, async (context) => {
  try {
    const refreshToken = getCookie(context, REFRESH_COOKIE_NAME);
    const result = await authService.refreshWebSession(refreshToken);
    setAuthCookies(context, result.sessionId, result.refreshToken);
    return context.json(
      authSuccessResponseSchema.parse({ user: result.user })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      clearAuthCookies(context);
      const status = error.code === "USER_BANNED" ? 403 : 401;
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        status
      );
    }

    throw error;
  }
});

authRoute.post(API_ROUTES.auth.adminLogin, async (context) => {
  const input = adminLoginRequestSchema.parse(await context.req.json());

  try {
    const result = await authService.loginAdmin(
      input,
      getRequestMetadata(context)
    );
    setAuthCookies(context, result.sessionId, result.refreshToken);
    return context.json(
      authSuccessResponseSchema.parse({ user: result.user })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      const status =
        error.code === "ADMIN_ACCOUNT_LOCKED" ? 429 : error.code === "USER_BANNED" ? 403 : 400;
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        status
      );
    }

    throw error;
  }
});

// 从这里开始，路由都会拿到 currentUser；更严格的权限控制再交给 requireAuth / requireAdmin。
authRoute.use("*", attachCurrentUser);

authRoute.get(API_ROUTES.admin.roles, requireAdmin, async (context) => {
  try {
    const rows = await db.select().from(rolesTable);
    if (rows.length > 0) {
      return context.json({ roles: rows });
    }
  } catch (error) {
    // roles 表不存在时回退到常量；记录异常便于排查数据库连接/权限问题
    console.error("[auth] 查询 roles 表失败，回退到内置常量", error);
  }
  const ROLE_LABELS: Record<string, string> = {
    super_admin: "超级管理员",
    admin: "管理员",
    editor: "内容编辑",
    moderator: "审核员",
    operator: "运营专员",
  };
  const fallback = Object.entries(ROLE_PERMISSIONS).map(([name, permissions]) => ({
    name,
    label: ROLE_LABELS[name] ?? name,
    permissions,
    description: null,
    createdAt: null,
  }));
  return context.json({ roles: fallback });
});

authRoute.put(API_ROUTES.admin.roleDetail(":name"), requireAdmin, async (context) => {
  const roleName: string = context.req.param("name") ?? "";
  const body = (await context.req.json()) as { permissions?: string[] };

  if (!body.permissions || !Array.isArray(body.permissions)) {
    return context.json(
      authErrorResponseSchema.parse({
        code: "FORBIDDEN",
        message: "permissions 必须为字符串数组"
      }),
      400
    );
  }

  // 系统内置角色不允许修改权限
  if (roleName === "super_admin" || roleName === "admin") {
    return context.json(
      authErrorResponseSchema.parse({
        code: "FORBIDDEN",
        message: "系统内置角色的权限不可修改"
      }),
      403
    );
  }

  const existing = await db.select().from(rolesTable).where(eq(rolesTable.name, roleName)).limit(1);
  if (existing.length === 0) {
    return context.json(
      authErrorResponseSchema.parse({
        code: "FORBIDDEN",
        message: `角色 ${roleName} 不存在`
      }),
      404
    );
  }

  await db.update(rolesTable).set({ permissions: body.permissions }).where(eq(rolesTable.name, roleName));
  return context.json({ success: true });
});

authRoute.post(
  API_ROUTES.auth.webChangePassword,
  requireAuth,
  async (context) => {
    const input = userPasswordChangeRequestSchema.parse(await context.req.json());
    const currentUser = context.get("currentUser");

    if (!currentUser || context.get("currentSessionScope") !== "web") {
      return context.json(
        authErrorResponseSchema.parse({
          code: "FORBIDDEN",
          message: "仅 Web 登录用户可修改密码。"
        }),
        403
      );
    }

    try {
      const result = await authService.changeWebPassword(currentUser.id, input);
      if (result.sessionRevoked) {
        clearAuthCookies(context);
      }
      return context.json(actionSuccessResponseSchema.parse(result));
    } catch (error) {
      if (error instanceof AuthError) {
        return context.json(
          authErrorResponseSchema.parse({
            code: error.code,
            message: error.message
          }),
          error.code === "FORBIDDEN" ? 403 : 400
        );
      }

      throw error;
    }
  }
);

// 设备注册/注销（需登录）
authRoute.post(API_ROUTES.auth.deviceRegister, requireAuth, async (context) => {
  const input = deviceRegisterInputSchema.parse(await context.req.json());
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json(
      authErrorResponseSchema.parse({
        code: "UNAUTHORIZED",
        message: "未登录。"
      }),
      401
    );
  }
  const result = await authService.registerDevice(currentUser.id, {
    deviceType: input.deviceType,
    deviceLabel: input.deviceLabel ?? null,
    pushToken: input.pushToken
  });
  return context.json(deviceRegisterResponseSchema.parse(result));
});

authRoute.post(API_ROUTES.auth.deviceUnregister, requireAuth, async (context) => {
  const input = deviceUnregisterInputSchema.parse(await context.req.json());
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json(
      authErrorResponseSchema.parse({
        code: "UNAUTHORIZED",
        message: "未登录。"
      }),
      401
    );
  }
  await authService.unregisterDevice(currentUser.id, input.pushToken);
  return context.json({ success: true });
});

authRoute.get(API_ROUTES.auth.currentUser, (context) => {
  const authError = currentAuthErrorResponse(context);
  if (authError) {
    return authError;
  }

  return context.json(
    currentUserResponseSchema.parse({
      user: context.get("currentUser")
    })
  );
});

authRoute.get(API_ROUTES.auth.appCurrentUser, (context) => {
  const authError = currentAuthErrorResponse(context);
  if (authError) {
    return authError;
  }

  return context.json(
    currentUserResponseSchema.parse({
      user: context.get("currentSessionScope") === "app"
        ? context.get("currentUser")
        : null
    })
  );
});

authRoute.get(API_ROUTES.auth.adminCurrentUser, (context) => {
  const authError = currentAuthErrorResponse(context);
  if (authError) {
    return authError;
  }

  const user = context.get("currentUser");
  return context.json(
    currentUserResponseSchema.parse({
      user:
        user?.role === "admin" && context.get("currentSessionScope") === "admin"
          ? user
          : null
    })
  );
});

authRoute.get(
  API_ROUTES.auth.adminSessions,
  requireAdmin,
  async (context) => {
    const payload = await authService.listRecentSessions();
    return context.json(adminRecentSessionsResponseSchema.parse(payload));
  }
);

authRoute.post(
  API_ROUTES.auth.adminChangePassword,
  requireAdmin,
  async (context) => {
    const input = adminPasswordChangeRequestSchema.parse(await context.req.json());
    const currentUser = context.get("currentUser");

    if (!currentUser || currentUser.role !== "admin") {
      return context.json(
        authErrorResponseSchema.parse({
          code: "FORBIDDEN",
          message: "仅管理员可修改后台密码。"
        }),
        403
      );
    }

    try {
      const result = await authService.changeAdminPassword(currentUser.id, input);
      clearAuthCookies(context);
      return context.json(actionSuccessResponseSchema.parse(result));
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === "FORBIDDEN" ? 403 : 400;
        return context.json(
          authErrorResponseSchema.parse({
            code: error.code,
            message: error.message
          }),
          status
        );
      }

      throw error;
    }
  }
);

authRoute.post(API_ROUTES.auth.logout, async (context) => {
  const sessionId = readSessionToken(context);
  const payload = currentUserResponseSchema.parse(
    await authService.logout(sessionId)
  );
  clearAuthCookies(context);
  return context.json(payload);
});

authRoute.post(API_ROUTES.auth.appLogout, async (context) => {
  const sessionId = readSessionToken(context);
  const payload = currentUserResponseSchema.parse(
    await authService.logout(sessionId)
  );
  return context.json(payload);
});

authRoute.post(API_ROUTES.auth.adminLogout, async (context) => {
  const sessionId = readSessionToken(context);
  const payload = currentUserResponseSchema.parse(
    await authService.logout(sessionId)
  );
  clearAuthCookies(context);
  return context.json(payload);
});

authRoute.get(API_ROUTES.auth.protectedPing, requireAuth, (context) => {
  return context.json({
    message: "pong:user"
  });
});

authRoute.get(API_ROUTES.auth.adminProtectedPing, requireAdmin, (context) => {
  return context.json({
    message: "pong:admin"
  });
});

export { authRoute };
