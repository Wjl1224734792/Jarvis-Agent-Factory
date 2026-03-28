import type { UserSummary } from "@feijia/schemas";
import { authRepo } from "./auth.repo";
import { createSmsSender, resolveSmsProviderConfig } from "./sms-provider";

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CAPTCHA"
      | "INVALID_SMS_CODE"
      | "INVALID_CREDENTIALS"
      | "SMS_PROVIDER_UNAVAILABLE"
      | "SESSION_EXPIRED"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "DISPLAY_NAME_TAKEN"
      | "PHONE_ALREADY_REGISTERED"
      | "REGISTRATION_REQUIRED"
      | "INVALID_REGISTRATION_TOKEN",
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
  async requestSmsCode(input: {
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
    const smsSender = createSmsSender(resolveSmsProviderConfig());
    let sendResult;
    try {
      sendResult = await smsSender.sendCode({
        phone: input.phone,
        code: sms.code
      });
    } catch (error) {
      throw new AuthError(
        "SMS_PROVIDER_UNAVAILABLE",
        error instanceof Error ? error.message : "短信服务当前不可用"
      );
    }

    return {
      requestId: sms.requestId,
      expiresInSeconds: 300,
      mockCode: sendResult.mockCode
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

    const user = await authRepo.findUserByPhone(input.phone);
    if (!user) {
      const pendingRegistration = await authRepo.createPendingRegistration(input.phone);
      return {
        kind: "registration_required" as const,
        registrationToken: pendingRegistration.registrationToken,
        phone: pendingRegistration.phone,
        suggestedDisplayName: pendingRegistration.suggestedDisplayName
      };
    }

    const session = await authRepo.createSession(user, "web");
    const summary = await authRepo.getUserSummaryBySession(session.id);
    if (!summary) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    return {
      kind: "authenticated" as const,
      sessionId: session.id,
      user: summary satisfies UserSummary
    };
  },
  async completeWebRegistration(input: {
    registrationToken: string;
    displayName: string;
    avatarUrl?: string | null;
  }) {
    const pending = authRepo.consumePendingRegistration(input.registrationToken);
    if (!pending) {
      throw new AuthError("INVALID_REGISTRATION_TOKEN", "注册步骤已失效，请重新获取验证码。");
    }

    const duplicatePhone = await authRepo.findUserByPhone(pending.phone);
    if (duplicatePhone) {
      throw new AuthError("PHONE_ALREADY_REGISTERED", "该手机号已完成注册，请直接登录。");
    }

    const normalizedDisplayName = input.displayName.trim();
    const duplicateName = await authRepo.findUserByDisplayName(normalizedDisplayName);
    if (duplicateName) {
      throw new AuthError("DISPLAY_NAME_TAKEN", "该用户名已被占用，请更换后重试。");
    }

    const user = await authRepo.createUserByPhoneProfile({
      phone: pending.phone,
      displayName: normalizedDisplayName,
      avatarUrl: input.avatarUrl ?? null
    });
    const session = await authRepo.createSession(user, "web");
    const summary = await authRepo.getUserSummaryBySession(session.id);
    if (!summary) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    return {
      sessionId: session.id,
      user: summary satisfies UserSummary
    };
  },
  verifySmsCodeForRequest(input: {
    phone: string;
    requestId: string;
    smsCode: string;
  }) {
    const smsPassed = authRepo.validateSmsCodeByRequest(
      input.phone,
      input.requestId,
      input.smsCode
    );

    if (!smsPassed) {
      throw new AuthError("INVALID_SMS_CODE", "短信验证码无效或已过期");
    }
  },
  async loginAdmin(input: { account: string; password: string }) {
    const admin = await authRepo.findAdminByCredentials(input.account, input.password);

    if (!admin) {
      throw new AuthError("INVALID_CREDENTIALS", "管理员账号或密码错误");
    }

    const session = await authRepo.createSession(admin, "admin");
    const summary = await authRepo.getUserSummaryBySession(session.id);
    if (!summary) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    return {
      sessionId: session.id,
      user: summary satisfies UserSummary
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
