import { describe, expect, it } from "vitest";
import {
  adminLoginRequestSchema,
  adminPasswordChangeRequestSchema,
  adminRecentSessionsResponseSchema,
  appAuthSessionResponseSchema,
  appLoginRequestSchema,
  appLoginResponseSchema,
  authErrorCodeSchema,
  captchaChallengeResponseSchema,
  completeAppRegistrationRequestSchema,
  completeWebRegistrationRequestSchema,
  currentUserResponseSchema,
  deviceRegisterInputSchema,
  registrationDisplayNameSuggestResponseSchema,
  smsCodeRequestSchema,
  strongPasswordSchema,
  userSummarySchema,
  userPasswordChangeRequestSchema,
  webLoginRequestSchema
} from "../src/auth";

describe("auth contract", () => {
  it("parses sms and password web login payloads", () => {
    const smsPayload = webLoginRequestSchema.parse({
      method: "sms",
      phone: "13800138000",
      smsCode: "123456"
    });
    const legacySmsPayload = webLoginRequestSchema.parse({
      phone: "13800138000",
      smsCode: "123456"
    });
    const passwordPayload = webLoginRequestSchema.parse({
      method: "password",
      phone: "13800138000",
      password: "Flight#123",
      captchaChallengeId: "challenge-1",
      captchaCode: "AB12"
    });

    expect(smsPayload.method).toBe("sms");
    expect(smsPayload.smsCode).toBe("123456");
    expect(legacySmsPayload.method).toBe("sms");
    expect(passwordPayload.method).toBe("password");
    expect(passwordPayload.captchaChallengeId).toBe("challenge-1");
  });

  it("parses the admin login request payload with captcha", () => {
    const payload = adminLoginRequestSchema.parse({
      account: "admin",
      password: "Admin#123",
      captchaChallengeId: "captcha_1",
      captchaCode: "ABCD"
    });

    expect(payload.account).toBe("admin");
  });

  it("enforces the shared password policy", () => {
    expect(strongPasswordSchema.parse("Flight#123")).toBe("Flight#123");
    expect(strongPasswordSchema.safeParse("flight#123").success).toBe(false);
    expect(strongPasswordSchema.safeParse("FLIGHT#123").success).toBe(false);
    expect(strongPasswordSchema.safeParse("Flight123").success).toBe(false);
    expect(strongPasswordSchema.safeParse("Fli#12").success).toBe(false);
  });

  it("parses the admin password change payload", () => {
    const payload = adminPasswordChangeRequestSchema.parse({
      currentPassword: "Admin#123",
      newPassword: "Admin#456"
    });

    expect(payload.currentPassword).toBe("Admin#123");
    expect(payload.newPassword).toBe("Admin#456");
    expect(
      adminPasswordChangeRequestSchema.safeParse({
        currentPassword: "Admin#123",
        newPassword: "Admin#123"
      }).success
    ).toBe(false);
  });

  it("parses the user password change payload", () => {
    const setupPayload = userPasswordChangeRequestSchema.parse({
      newPassword: "Flight#123",
      smsRequestId: "sms_1",
      smsCode: "123456"
    });
    const changePayload = userPasswordChangeRequestSchema.parse({
      currentPassword: "Flight#123",
      newPassword: "Flight#456",
      smsRequestId: "sms_2",
      smsCode: "234567"
    });

    expect(setupPayload.currentPassword).toBeUndefined();
    expect(setupPayload.newPassword).toBe("Flight#123");
    expect(setupPayload.smsRequestId).toBe("sms_1");
    expect(changePayload.currentPassword).toBe("Flight#123");
    expect(changePayload.newPassword).toBe("Flight#456");
    expect(
      userPasswordChangeRequestSchema.safeParse({
        newPassword: "Flight#123"
      }).success
    ).toBe(false);
  });

  it("parses the current user response", () => {
    const payload = currentUserResponseSchema.parse({
      user: {
        id: "user-1",
        displayName: "Test User",
        avatarUrl: null,
        role: "user"
      }
    });

    expect(payload.user.role).toBe("user");
  });

  it("uses avatarFileId for registration completion payloads", () => {
    const webPayload = completeWebRegistrationRequestSchema.parse({
      registrationToken: "token_1",
      displayName: "Pilot 3800",
      avatarFileId: "file_avatar_1"
    });
    const appPayload = completeAppRegistrationRequestSchema.parse({
      registrationToken: "token_1",
      displayName: "Pilot 3800",
      avatarFileId: "file_avatar_1",
      deviceLabel: "iPhone 16 Pro"
    });

    expect(webPayload.avatarFileId).toBe("file_avatar_1");
    expect(appPayload.avatarFileId).toBe("file_avatar_1");
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
      smsCode: "123456",
      deviceLabel: "iPhone 16 Pro",
      deviceType: "web"
    });

    const authPayload = appAuthSessionResponseSchema.parse({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: userSummarySchema.parse({
        id: "user-1",
        displayName: "Pilot 3800",
        avatarUrl: null,
        role: "user"
      })
    });

    const loginResponse = appLoginResponseSchema.parse({
      kind: "authenticated",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        displayName: "Pilot 3800",
        avatarUrl: null,
        role: "user"
      }
    });

    expect(loginPayload.deviceLabel).toBe("iPhone 16 Pro");
    expect(loginPayload.deviceType).toBe("web");
    expect(authPayload.refreshToken).toBe("refresh-token");
    expect(loginResponse.kind).toBe("authenticated");
  });

  it("accepts the expanded deviceType enum for app auth and device registration", () => {
    const appRegistrationPayload = completeAppRegistrationRequestSchema.parse({
      registrationToken: "token_1",
      displayName: "Pilot 3800",
      deviceType: "miniapp-wechat",
      pushToken: "push-token-1"
    });

    const deviceRegistrationPayload = deviceRegisterInputSchema.parse({
      deviceType: "web",
      deviceLabel: "Chrome on macOS",
      pushToken: "push-token-2"
    });

    expect(appRegistrationPayload.deviceType).toBe("miniapp-wechat");
    expect(deviceRegistrationPayload.deviceType).toBe("web");
  });

  it("parses registration display name suggestions and recent sessions", () => {
    const suggestion = registrationDisplayNameSuggestResponseSchema.parse({
      displayName: "Pilot3800123"
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
            displayName: "Pilot 3800",
            role: "user",
            phone: "13800138000"
          }
        }
      ]
    });

    expect(suggestion.displayName).toContain("Pilot");
    expect(sessions.items[0]?.scope).toBe("app");
  });
});
