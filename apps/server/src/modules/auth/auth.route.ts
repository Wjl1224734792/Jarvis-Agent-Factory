import {
  adminLoginRequestSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  captchaChallengeResponseSchema,
  currentUserResponseSchema,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  webLoginRequestSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  SESSION_COOKIE_NAME,
  type AuthVariables
} from "./auth.middleware";
import { AuthError, authService } from "./auth.service";

const authRoute = new Hono<{ Variables: AuthVariables }>();

function setSessionCookie(context: Context, sessionId: string) {
  setCookie(context, SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

authRoute.post(API_ROUTES.auth.captchaChallenge, (context) => {
  const payload = captchaChallengeResponseSchema.parse(
    authService.requestCaptchaChallenge()
  );
  return context.json(payload);
});

authRoute.post(API_ROUTES.auth.smsRequest, async (context) => {
  const input = smsCodeRequestSchema.parse(await context.req.json());
  try {
    const payload = smsCodeResponseSchema.parse(authService.requestSmsCode(input));
    return context.json(payload);
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

authRoute.post(API_ROUTES.auth.webLogin, async (context) => {
  const input = webLoginRequestSchema.parse(await context.req.json());
  try {
    const result = authService.loginWeb(input);
    setSessionCookie(context, result.sessionId);
    return context.json(authSuccessResponseSchema.parse({ user: result.user }));
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

authRoute.post(API_ROUTES.auth.adminLogin, async (context) => {
  const input = adminLoginRequestSchema.parse(await context.req.json());
  try {
    const result = authService.loginAdmin(input);
    setSessionCookie(context, result.sessionId);
    return context.json(authSuccessResponseSchema.parse({ user: result.user }));
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

authRoute.use("*", attachCurrentUser);

authRoute.get(API_ROUTES.auth.currentUser, (context) => {
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

authRoute.post(API_ROUTES.auth.logout, (context) => {
  const sessionId = getCookie(context, SESSION_COOKIE_NAME);
  const payload = currentUserResponseSchema.parse(authService.logout(sessionId));
  deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });
  return context.json(payload);
});

authRoute.post(API_ROUTES.auth.adminLogout, (context) => {
  const sessionId = getCookie(context, SESSION_COOKIE_NAME);
  const payload = currentUserResponseSchema.parse(authService.logout(sessionId));
  deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });
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
