import type { UserSummary } from "@feijia/schemas";
import { authRepo } from "./auth.repo";

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CAPTCHA"
      | "INVALID_SMS_CODE"
      | "INVALID_CREDENTIALS"
      | "SESSION_EXPIRED"
      | "UNAUTHORIZED"
      | "FORBIDDEN",
    message: string
  ) {
    super(message);
  }
}

export const authService = {
  requestCaptchaChallenge() {
    const captcha = authRepo.createCaptchaChallenge();
    return {
      challengeId: captcha.challengeId,
      imageOrText: captcha.code,
      expiresInSeconds: 300
    };
  },
  requestSmsCode(input: {
    phone: string;
    captchaChallengeId: string;
    captchaCode: string;
  }) {
    const captchaPassed = authRepo.validateCaptcha(
      input.captchaChallengeId,
      input.captchaCode
    );

    if (!captchaPassed) {
      throw new AuthError("INVALID_CAPTCHA", "图形验证码无效或已过期");
    }

    const sms = authRepo.createSmsCode(input.phone);

    return {
      requestId: sms.requestId,
      expiresInSeconds: 300,
      mockCode: sms.code
    };
  },
  async loginWeb(input: {
    phone: string;
    captchaChallengeId: string;
    captchaCode: string;
    smsCode: string;
  }) {
    const smsPassed = authRepo.validateSmsCode(input.phone, input.smsCode);

    if (!smsPassed) {
      throw new AuthError("INVALID_SMS_CODE", "短信验证码无效或已过期");
    }

    const user = await authRepo.findOrCreateUserByPhone(input.phone);
    const session = await authRepo.createSession(user, "web");

    return {
      sessionId: session.id,
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role
      } satisfies UserSummary
    };
  },
  async loginAdmin(input: { account: string; password: string }) {
    const admin = await authRepo.findAdminByCredentials(input.account, input.password);

    if (!admin) {
      throw new AuthError("INVALID_CREDENTIALS", "管理员账号或密码错误");
    }

    const session = await authRepo.createSession(admin, "admin");

    return {
      sessionId: session.id,
      user: {
        id: admin.id,
        displayName: admin.displayName,
        role: admin.role
      } satisfies UserSummary
    };
  },
  async getCurrentUser(sessionId: string | undefined) {
    if (!sessionId) {
      return null;
    }

    return authRepo.getUserSummaryBySession(sessionId);
  },
  async logout(sessionId: string | undefined) {
    if (sessionId) {
      await authRepo.deleteSession(sessionId);
    }

    return {
      user: null
    };
  }
};
