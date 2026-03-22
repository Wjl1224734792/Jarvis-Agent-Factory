import { describe, expect, it } from "vitest";
import {
  adminLoginRequestSchema,
  authErrorCodeSchema,
  captchaChallengeResponseSchema,
  currentUserResponseSchema,
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
});
