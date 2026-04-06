import { createSecretToken, hashToken } from "@feijia/db";
import type { UserSummary } from "@feijia/schemas";
import { authRepo, ADMIN_LOGIN_MAX_FAILURES } from "./auth.repo";
import { createSmsSender, resolveSmsProviderConfig } from "./sms-provider";
import type { UserRecord } from "../users/users.schema";

type RequestSessionMetadata = {
  clientIp?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

type AppSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
};

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function mapRegistrationPersistenceError(error: unknown): AuthError | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (
    error.message.includes("users_phone_unique") ||
    error.message.includes("users.phone")
  ) {
    return new AuthError(
      "PHONE_ALREADY_REGISTERED",
      "该手机号已完成注册，请直接登录。"
    );
  }

  if (
    error.message.includes("users_display_name_unique") ||
    error.message.includes("users.display_name")
  ) {
    return new AuthError(
      "DISPLAY_NAME_TAKEN",
      "该用户名已被占用，请更换后重试。"
    );
  }

  return null;
}

function buildDeviceLabel(input: {
  explicitDeviceLabel?: string | null;
  userAgent?: string | null;
}) {
  const explicit = input.explicitDeviceLabel?.trim();
  if (explicit) {
    return explicit;
  }

  const userAgent = input.userAgent ?? "";
  if (/iphone/i.test(userAgent)) {
    return "iPhone";
  }
  if (/ipad/i.test(userAgent)) {
    return "iPad";
  }
  if (/android/i.test(userAgent)) {
    return "Android";
  }
  if (/windows/i.test(userAgent)) {
    return "Windows";
  }
  if (/macintosh|mac os x/i.test(userAgent)) {
    return "Mac";
  }
  if (/linux/i.test(userAgent)) {
    return "Linux";
  }

  return userAgent.trim() ? userAgent.slice(0, 80) : null;
}

async function createAppSession(
  user: UserRecord,
  metadata?: RequestSessionMetadata
): Promise<AppSessionResponse> {
  const refreshToken = createSecretToken(32);
  const session = await authRepo.createSession(user, "app", {
    clientIp: metadata?.clientIp ?? null,
    userAgent: metadata?.userAgent ?? null,
    deviceLabel: buildDeviceLabel({
      explicitDeviceLabel: metadata?.deviceLabel,
      userAgent: metadata?.userAgent ?? null
    }),
    refreshTokenHash: hashToken(refreshToken),
    refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS)
  });
  const summary = await authRepo.getUserSummaryBySession(session.id);
  if (!summary) {
    throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
  }

  return {
    accessToken: session.id,
    refreshToken,
    user: summary satisfies UserSummary
  };
}

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CAPTCHA"
      | "INVALID_SMS_CODE"
      | "INVALID_CREDENTIALS"
      | "INVALID_REFRESH_TOKEN"
      | "SMS_PROVIDER_UNAVAILABLE"
      | "SMS_RATE_LIMITED"
      | "SESSION_EXPIRED"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "DISPLAY_NAME_TAKEN"
      | "PHONE_ALREADY_REGISTERED"
      | "REGISTRATION_REQUIRED"
      | "INVALID_REGISTRATION_TOKEN"
      | "TOKEN_EXPIRED"
      | "ADMIN_ACCOUNT_LOCKED",
    message: string
  ) {
    super(message);
  }
}

export const authService = {
  async requestCaptchaChallenge() {
    const captcha = await authRepo.createCaptchaChallenge();
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
    const captchaPassed = await authRepo.validateCaptcha(
      input.captchaChallengeId,
      input.captchaCode
    );

    if (!captchaPassed) {
      throw new AuthError("INVALID_CAPTCHA", "图形验证码无效或已过期");
    }

    try {
      const sms = await authRepo.createSmsCode(input.phone);
      const smsSender = createSmsSender(resolveSmsProviderConfig());
      const sendResult = await smsSender.sendCode({
        phone: input.phone,
        code: sms.code
      });

      return {
        requestId: sms.requestId,
        expiresInSeconds: 300,
        mockCode: sendResult.mockCode
      };
    } catch (error) {
      if (error instanceof Error && error.message === "SMS_RATE_LIMITED") {
        throw new AuthError(
          "SMS_RATE_LIMITED",
          "发送过于频繁，请 60 秒后再试"
        );
      }
      throw new AuthError(
        "SMS_PROVIDER_UNAVAILABLE",
        error instanceof Error ? error.message : "短信服务当前不可用"
      );
    }
  },
  async loginWeb(
    input: {
      phone: string;
      captchaChallengeId: string;
      captchaCode: string;
      smsCode: string;
    },
    metadata?: RequestSessionMetadata
  ) {
    const smsPassed = await authRepo.validateSmsCode(input.phone, input.smsCode);

    if (!smsPassed) {
      throw new AuthError("INVALID_SMS_CODE", "短信验证码无效或已过期");
    }

    const user = await authRepo.findUserByPhone(input.phone);
    if (!user) {
      const pendingRegistration = await authRepo.createPendingRegistration(
        input.phone,
        {
          clientIp: metadata?.clientIp ?? null,
          userAgent: metadata?.userAgent ?? null,
          deviceLabel: buildDeviceLabel({
            explicitDeviceLabel: metadata?.deviceLabel,
            userAgent: metadata?.userAgent ?? null
          })
        }
      );
      return {
        kind: "registration_required" as const,
        registrationToken: pendingRegistration.registrationToken,
        phone: pendingRegistration.phone,
        suggestedDisplayName: pendingRegistration.suggestedDisplayName
      };
    }

    const refreshToken = createSecretToken(32);
    const session = await authRepo.createSession(user, "web", {
      clientIp: metadata?.clientIp ?? null,
      userAgent: metadata?.userAgent ?? null,
      deviceLabel: buildDeviceLabel({
        explicitDeviceLabel: metadata?.deviceLabel,
        userAgent: metadata?.userAgent ?? null
      }),
      refreshTokenHash: hashToken(refreshToken),
      refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS)
    });
    const summary = await authRepo.getUserSummaryBySession(session.id);
    if (!summary) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    return {
      kind: "authenticated" as const,
      sessionId: session.id,
      refreshToken,
      user: summary satisfies UserSummary
    };
  },
  async loginApp(
    input: {
      phone: string;
      captchaChallengeId: string;
      captchaCode: string;
      smsCode: string;
      deviceLabel?: string | null;
    },
    metadata?: RequestSessionMetadata
  ) {
    const smsPassed = await authRepo.validateSmsCode(input.phone, input.smsCode);
    if (!smsPassed) {
      throw new AuthError("INVALID_SMS_CODE", "短信验证码无效或已过期");
    }

    const user = await authRepo.findUserByPhone(input.phone);
    if (!user) {
      const pendingRegistration = await authRepo.createPendingRegistration(
        input.phone,
        {
          clientIp: metadata?.clientIp ?? null,
          userAgent: metadata?.userAgent ?? null,
          deviceLabel: buildDeviceLabel({
            explicitDeviceLabel:
              input.deviceLabel ?? metadata?.deviceLabel ?? null,
            userAgent: metadata?.userAgent ?? null
          })
        }
      );
      return {
        kind: "registration_required" as const,
        registrationToken: pendingRegistration.registrationToken,
        phone: pendingRegistration.phone,
        suggestedDisplayName: pendingRegistration.suggestedDisplayName
      };
    }

    const session = await createAppSession(user, {
      ...metadata,
      deviceLabel: input.deviceLabel ?? metadata?.deviceLabel ?? null
    });

    return {
      kind: "authenticated" as const,
      ...session
    };
  },
  async completeWebRegistration(
    input: {
      registrationToken: string;
      displayName: string;
      avatarFileId?: string | null;
    },
    metadata?: RequestSessionMetadata
  ) {
    // 使用 consumePendingRegistration（原子 GETDEL）消除 Redis 层面的竞态条件
    // 多个并发请求中只有一个能成功消费 pending registration
    const pending = await authRepo.consumePendingRegistration(
      input.registrationToken
    );
    if (!pending) {
      throw new AuthError(
        "INVALID_REGISTRATION_TOKEN",
        "注册步骤已失效，请重新获取验证码。"
      );
    }

    const duplicatePhone = await authRepo.findUserByPhone(pending.phone);
    if (duplicatePhone) {
      throw new AuthError(
        "PHONE_ALREADY_REGISTERED",
        "该手机号已完成注册，请直接登录。"
      );
    }

    const normalizedDisplayName = input.displayName.trim();
    const duplicateName = await authRepo.findUserByDisplayName(
      normalizedDisplayName
    );
    if (duplicateName) {
      await authRepo.restorePendingRegistration(pending);
      throw new AuthError(
        "DISPLAY_NAME_TAKEN",
        "该用户名已被占用，请更换后重试。"
      );
    }

    try {
      const user = await authRepo.createUserByPhoneProfile({
        phone: pending.phone,
        displayName: normalizedDisplayName,
        avatarFileId: input.avatarFileId ?? null
      });

      const refreshToken = createSecretToken(32);
      const session = await authRepo.createSession(user, "web", {
        clientIp: metadata?.clientIp ?? pending.clientIp ?? null,
        userAgent: metadata?.userAgent ?? pending.userAgent ?? null,
        deviceLabel: buildDeviceLabel({
          explicitDeviceLabel: metadata?.deviceLabel ?? pending.deviceLabel,
          userAgent: metadata?.userAgent ?? pending.userAgent ?? null
        }),
        refreshTokenHash: hashToken(refreshToken),
        refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS)
      });
      const summary = await authRepo.getUserSummaryBySession(session.id);
      if (!summary) {
        throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
      }

      return {
        sessionId: session.id,
        refreshToken,
        user: summary satisfies UserSummary
      };
    } catch (error) {
      const mappedError = mapRegistrationPersistenceError(error);
      if (mappedError) {
        if (mappedError.code === "DISPLAY_NAME_TAKEN") {
          await authRepo.restorePendingRegistration(pending);
        }
        throw mappedError;
      }
      throw error;
    }
  },
  async completeAppRegistration(
    input: {
      registrationToken: string;
      displayName: string;
      avatarFileId?: string | null;
      deviceLabel?: string | null;
    },
    metadata?: RequestSessionMetadata
  ) {
    // 使用 consumePendingRegistration（原子 GETDEL）消除 Redis 层面的竞态条件
    const pending = await authRepo.consumePendingRegistration(
      input.registrationToken
    );
    if (!pending) {
      throw new AuthError(
        "INVALID_REGISTRATION_TOKEN",
        "注册步骤已失效，请重新获取验证码。"
      );
    }

    const duplicatePhone = await authRepo.findUserByPhone(pending.phone);
    if (duplicatePhone) {
      throw new AuthError(
        "PHONE_ALREADY_REGISTERED",
        "该手机号已完成注册，请直接登录。"
      );
    }

    const normalizedDisplayName = input.displayName.trim();
    const duplicateName = await authRepo.findUserByDisplayName(
      normalizedDisplayName
    );
    if (duplicateName) {
      await authRepo.restorePendingRegistration(pending);
      throw new AuthError(
        "DISPLAY_NAME_TAKEN",
        "该用户名已被占用，请更换后重试。"
      );
    }

    try {
      const user = await authRepo.createUserByPhoneProfile({
        phone: pending.phone,
        displayName: normalizedDisplayName,
        avatarFileId: input.avatarFileId ?? null
      });

      const session = await createAppSession(user, {
        clientIp: metadata?.clientIp ?? pending.clientIp ?? null,
        userAgent: metadata?.userAgent ?? pending.userAgent ?? null,
        deviceLabel:
          input.deviceLabel ??
          metadata?.deviceLabel ??
          pending.deviceLabel ??
          null
      });

      return session;
    } catch (error) {
      const mappedError = mapRegistrationPersistenceError(error);
      if (mappedError) {
        if (mappedError.code === "DISPLAY_NAME_TAKEN") {
          await authRepo.restorePendingRegistration(pending);
        }
        throw mappedError;
      }
      throw error;
    }
  },
  async suggestRegistrationDisplayName(registrationToken: string) {
    const displayName =
      await authRepo.suggestPendingRegistrationDisplayName(registrationToken);
    if (!displayName) {
      throw new AuthError(
        "INVALID_REGISTRATION_TOKEN",
        "注册步骤已失效，请重新获取验证码。"
      );
    }

    return { displayName };
  },
  async refreshWebSession(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new AuthError("SESSION_EXPIRED", "Refresh token missing.");
    }

    const session = await authRepo.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new AuthError(
        "SESSION_EXPIRED",
        "Session expired. Please login again."
      );
    }

    const user = await authRepo.findUserById(session.userId);
    if (!user) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    // 续期 access + 滑动续期 refresh
    await authRepo.renewSession(session.id);

    const summary = await authRepo.getUserSummaryBySession(session.id);
    if (!summary) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    return {
      sessionId: session.id,
      user: summary satisfies UserSummary
    };
  },
  async refreshAppSession(refreshToken: string) {
    const session = await authRepo.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new AuthError(
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid or expired."
      );
    }

    const user = await authRepo.findUserById(session.userId);
    if (!user) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    // 续期 access + 滑动续期 refresh
    await authRepo.renewSession(session.id);

    const summary = await authRepo.getUserSummaryBySession(session.id);
    if (!summary) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    return {
      accessToken: session.id,
      refreshToken,
      user: summary satisfies UserSummary
    };
  },
  async verifySmsCodeForRequest(input: {
    phone: string;
    requestId: string;
    smsCode: string;
  }) {
    const smsPassed = await authRepo.validateSmsCodeByRequest(
      input.phone,
      input.requestId,
      input.smsCode
    );

    if (!smsPassed) {
      throw new AuthError("INVALID_SMS_CODE", "短信验证码无效或已过期");
    }
  },
  async loginAdmin(
    input: { account: string; password: string },
    metadata?: RequestSessionMetadata
  ) {
    // 检查是否被锁定
    const failures = await authRepo.getAdminLoginFailures(input.account);
    if (failures >= ADMIN_LOGIN_MAX_FAILURES) {
      throw new AuthError("ADMIN_ACCOUNT_LOCKED", "账号已被锁定，请 5 分钟后再试");
    }

    const admin = await authRepo.findAdminByCredentials(
      input.account,
      input.password
    );

    if (!admin) {
      await authRepo.recordAdminLoginFailure(input.account);
      throw new AuthError("INVALID_CREDENTIALS", "管理员账号或密码错误");
    }

    // 登录成功，清除失败计数
    await authRepo.clearAdminLoginFailures(input.account);

    const refreshToken = createSecretToken(32);
    const session = await authRepo.createSession(admin, "admin", {
      clientIp: metadata?.clientIp ?? null,
      userAgent: metadata?.userAgent ?? null,
      deviceLabel: buildDeviceLabel({
        explicitDeviceLabel: metadata?.deviceLabel,
        userAgent: metadata?.userAgent ?? null
      }),
      refreshTokenHash: hashToken(refreshToken),
      refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS)
    });
    const summary = await authRepo.getUserSummaryBySession(session.id);
    if (!summary) {
      throw new AuthError("SESSION_EXPIRED", "Login session is unavailable.");
    }

    return {
      sessionId: session.id,
      refreshToken,
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
      await authRepo.revokeSession(sessionId);
    }

    return {
      user: null
    };
  },
  async listRecentSessions() {
    return {
      items: await authRepo.listRecentSessions()
    };
  }
};
