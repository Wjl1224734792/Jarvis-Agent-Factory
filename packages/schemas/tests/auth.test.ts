import { describe, expect, it } from "vitest";
import {
  adminLoginRequestSchema,
  adminRecentSessionsResponseSchema,
  appAuthSessionResponseSchema,
  appLoginRequestSchema,
  appLoginResponseSchema,
  authErrorCodeSchema,
  captchaChallengeResponseSchema,
  currentUserResponseSchema,
  registrationDisplayNameSuggestResponseSchema,
  smsCodeRequestSchema,
  webLoginRequestSchema
} from "../src/auth";

describe("auth contract", () => {
  it("parses the web login request payload", () => {
    const payload = webLoginRequestSchema.parse({
      phone: "13800138000",
      captchaChallengeId: "challenge-1",
      captchaCode: "AB12",
      smsCode: "123456"
    });

    expect(payload.phone).toBe("13800138000");
    expect(payload.smsCode).toBe("123456");
  });

  it("parses the admin login request payload", () => {
    const payload = adminLoginRequestSchema.parse({
      account: "admin",
      password: "Admin#123"
    });

    expect(payload.account).toBe("admin");
  });

  it("parses the current user response", () => {
    const payload = currentUserResponseSchema.parse({
      user: {
        id: "user-1",
        displayName: "测试用户",
        role: "user"
      }
    });

    expect(payload.user.role).toBe("user");
  });

  it("parses captcha and sms challenge payloads", () => {
    const captcha = captchaChallengeResponseSchema.parse({
      challengeId: "captcha-1",
      imageOrText: "AB12",
      expiresInSeconds: 300
    });

    const sms = smsCodeRequestSchema.parse({
      phone: "13800138000",
      captchaChallengeId: "captcha-1",
      captchaCode: "AB12"
    });

    expect(captcha.challengeId).toBe("captcha-1");
    expect(sms.captchaCode).toBe("AB12");
  });

  it("restricts auth error codes to the shared enum", () => {
    expect(authErrorCodeSchema.parse("UNAUTHORIZED")).toBe("UNAUTHORIZED");
    expect(authErrorCodeSchema.safeParse("WHATEVER").success).toBe(false);
  });

  it("parses app auth payloads", () => {
    const loginPayload = appLoginRequestSchema.parse({
      phone: "13800138000",
      captchaChallengeId: "challenge-1",
      captchaCode: "AB12",
      smsCode: "123456",
      deviceLabel: "iPhone 16 Pro"
    });

    const authPayload = appAuthSessionResponseSchema.parse({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        displayName: "飞友3800",
        avatarUrl: null,
        role: "user"
      }
    });

    const loginResponse = appLoginResponseSchema.parse({
      kind: "authenticated",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        displayName: "飞友3800",
        avatarUrl: null,
        role: "user"
      }
    });

    expect(loginPayload.deviceLabel).toBe("iPhone 16 Pro");
    expect(authPayload.refreshToken).toBe("refresh-token");
    expect(loginResponse.kind).toBe("authenticated");
  });

  it("parses registration display name suggestions and recent sessions", () => {
    const suggestion = registrationDisplayNameSuggestResponseSchema.parse({
      displayName: "飞友3800123"
    });

    const sessions = adminRecentSessionsResponseSchema.parse({
      items: [
        {
          id: "sess_1",
          scope: "app",
          clientIp: "203.0.113.10",
          userAgent: "FeijiaApp/1.0",
          deviceLabel: "iPhone 16 Pro",
          status: "active",
          createdAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          revokedAt: null,
          expiresAt: new Date(Date.now() + 1000).toISOString(),
          user: {
            id: "user_1",
            displayName: "飞友3800",
            role: "user",
            phone: "13800138000"
          }
        }
      ]
    });

    expect(suggestion.displayName).toContain("飞友");
    expect(sessions.items[0]?.scope).toBe("app");
  });
});
