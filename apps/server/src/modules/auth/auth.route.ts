import {
  adminLoginRequestSchema,
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
  registrationDisplayNameSuggestRequestSchema,
  registrationDisplayNameSuggestResponseSchema,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  webLoginRequestSchema,
  webLoginResponseSchema
} from "@feijia/schemas";
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

const authRoute = new Hono<{ Variables: AuthVariables }>();

const ACCESS_COOKIE_NAME = "feijia_access";
const REFRESH_COOKIE_NAME = "feijia_refresh";

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
    maxAge: ACCESS_COOKIE_MAX_AGE
  });

  if (refreshToken) {
    setCookie(context, REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE
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
    return (
      forwarded
        .split(",")
        .map((value) => value.trim())
        .find(Boolean) ?? null
    );
  }

  return (
    context.req.header("x-real-ip") ??
    context.req.header("cf-connecting-ip") ??
    null
  );
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

// 先处理登录、注册、验证码等匿名可访问接口，随后再挂载当前用户解析中间件。
authRoute.post(API_ROUTES.auth.captchaChallenge, async (context) => {
  const payload = captchaChallengeResponseSchema.parse(
    await authService.requestCaptchaChallenge()
  );
  return context.json(payload);
});

authRoute.post(API_ROUTES.auth.smsRequest, async (context) => {
  const input = smsCodeRequestSchema.parse(await context.req.json());

  try {
    const payload = smsCodeResponseSchema.parse(
      await authService.requestSmsCode(input)
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
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        error.code === "PHONE_ALREADY_REGISTERED" ? 409 : 400
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
});

authRoute.post(API_ROUTES.auth.webRefresh, async (context) => {
  try {
    const refreshToken = getCookie(context, REFRESH_COOKIE_NAME);
    const result = await authService.refreshWebSession(refreshToken);
    setAuthCookies(context, result.sessionId, refreshToken);
    return context.json(
      authSuccessResponseSchema.parse({ user: result.user })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      clearAuthCookies(context);
      return context.json(
        authErrorResponseSchema.parse({
          code: error.code,
          message: error.message
        }),
        401
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
});

// 从这里开始，路由都会拿到 currentUser；更严格的权限控制再交给 requireAuth / requireAdmin。
authRoute.use("*", attachCurrentUser);

authRoute.get(API_ROUTES.auth.currentUser, (context) => {
  return context.json(
    currentUserResponseSchema.parse({
      user: context.get("currentUser")
    })
  );
});

authRoute.get(API_ROUTES.auth.appCurrentUser, (context) => {
  return context.json(
    currentUserResponseSchema.parse({
      user: context.get("currentUser")
    })
  );
});

authRoute.get(API_ROUTES.auth.adminCurrentUser, (context) => {
  const user = context.get("currentUser");
  return context.json(
    currentUserResponseSchema.parse({
      user: user?.role === "admin" ? user : null
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
