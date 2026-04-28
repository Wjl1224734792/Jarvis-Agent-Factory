import {
  createId,
  createSecretToken,
  db,
  hashVerificationCode,
  hashPassword,
  hashToken,
  verifyVerificationCodeHash,
  verifyPassword,
  sessionsTable,
  usersTable,
  devicesTable
} from "@feijia/db";
import type { AuthRole, UserStatus, UserSummary } from "@feijia/schemas";
import { isValidAuthRole, isValidSessionScope } from "../../lib/type-guards";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import svgCaptcha from "@zhennann/svg-captcha";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { randomInt } from "node:crypto";

const require = createRequire(import.meta.url);
const svgCaptchaPackageRoot = dirname(
  require.resolve("@zhennann/svg-captcha/package.json")
);
svgCaptcha.loadFont(join(svgCaptchaPackageRoot, "fonts", "Comismsh.ttf"));
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";
import type { UserRecord } from "../users/users.schema";
import { ensureRedisConnected, redis } from "./redis-client";

export type SessionScope = "web" | "admin" | "app";

export type SessionRecord = {
  id: string;
  userId: string;
  role: AuthRole;
  scope: SessionScope;
  clientIp: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  lastSeenAt: number;
  revokedAt: number | null;
  refreshTokenHash: string | null;
  refreshExpiresAt: number | null;
  expiresAt: number;
  accessExpiresAt: number;
};

const DEFAULT_CAPTCHA_TTL_S = 300;
const DEFAULT_SMS_TTL_S = 300;
const DEFAULT_SMS_CODE_LENGTH = 6;
const MIN_CODE_TTL_S = 60;
const MAX_CODE_TTL_S = 600;
const MIN_SMS_CODE_LENGTH = 6;
const MAX_SMS_CODE_LENGTH = 8;
const REGISTRATION_TTL_S = 600;
const ACCESS_TTL_MS = 2 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 管理员登录失败计数 TTL（秒）：5 分钟 */
const ADMIN_LOGIN_FAIL_TTL_S = 300;
/** 管理员登录最大失败次数：5 分钟内最多 5 次 */
export const ADMIN_LOGIN_MAX_FAILURES = 5;
/** Web 密码登录失败计数 TTL（秒）：5 分钟 */
const WEB_PASSWORD_LOGIN_FAIL_TTL_S = 300;
/** Web 密码登录最大失败次数：同一手机号 + IP 5 分钟内最多 5 次 */
export const WEB_PASSWORD_LOGIN_MAX_FAILURES = 5;

/** 短信发送频率限制：同一手机号 60 秒内最多发送 1 次 */
const SMS_RATE_LIMIT_WINDOW_S = 60;
const SMS_PHONE_RATE_LIMIT_MAX = 1;
const SMS_CLIENT_IP_RATE_LIMIT_MAX = 10;
const SMS_PHONE_IP_RATE_LIMIT_MAX = 2;
const CAPTCHA_RATE_LIMIT_WINDOW_S = 60;
const CAPTCHA_CLIENT_IP_RATE_LIMIT_MAX = 30;
const CODE_VERIFY_MAX_ATTEMPTS = 5;
const DEV_AUTH_CODE_HASH_SECRET = "feijia-dev-auth-code-hash-secret";

/** 生成可用用户名时随机尝试的最大次数 */
const DISPLAY_NAME_RANDOMIZE_MAX_ATTEMPTS = 40;
/** 生成随机用户名时的后缀范围最小值 */
const DISPLAY_NAME_RANDOM_SUFFIX_MIN = 100;
/** 生成随机用户名时的后缀范围跨度 */
const DISPLAY_NAME_RANDOM_SUFFIX_RANGE = 900;

function now() {
  return Date.now();
}

function parseBoundedIntEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  options: { min: number; max: number }
) {
  const raw = env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
    throw new Error(
      `${name} must be an integer between ${options.min} and ${options.max}.`
    );
  }

  return parsed;
}

export function resolveAuthCodeConfig(env: NodeJS.ProcessEnv = process.env) {
  const hashSecret = env.AUTH_CODE_HASH_SECRET?.trim();
  if (!hashSecret && env.NODE_ENV === "production") {
    throw new Error("AUTH_CODE_HASH_SECRET is required in production.");
  }

  if (hashSecret && hashSecret.length < 16) {
    throw new Error("AUTH_CODE_HASH_SECRET must be at least 16 characters.");
  }

  return {
    captchaTtlSeconds: parseBoundedIntEnv(env, "AUTH_CAPTCHA_TTL_SECONDS", DEFAULT_CAPTCHA_TTL_S, {
      min: MIN_CODE_TTL_S,
      max: MAX_CODE_TTL_S
    }),
    smsTtlSeconds: parseBoundedIntEnv(env, "AUTH_SMS_CODE_TTL_SECONDS", DEFAULT_SMS_TTL_S, {
      min: MIN_CODE_TTL_S,
      max: MAX_CODE_TTL_S
    }),
    smsCodeLength: parseBoundedIntEnv(env, "AUTH_SMS_CODE_LENGTH", DEFAULT_SMS_CODE_LENGTH, {
      min: MIN_SMS_CODE_LENGTH,
      max: MAX_SMS_CODE_LENGTH
    }),
    hashSecret: hashSecret || DEV_AUTH_CODE_HASH_SECRET
  };
}

async function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
  errorCode: string;
}) {
  const attempts = await redis.incr(input.key);
  if (attempts === 1) {
    await redis.expire(input.key, input.windowSeconds);
  }
  if (attempts > input.limit) {
    throw new Error(input.errorCode);
  }
}

async function updateCodeRecordWithTtl(key: string, value: unknown) {
  const ttl = await redis.ttl(key);
  if (ttl <= 0) {
    await redis.del(key);
    return;
  }

  await redis.set(key, JSON.stringify(value), { EX: ttl });
}

function generateNumericCode(length: number) {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return randomInt(min, max).toString();
}

function toUserStatus(value: string): UserStatus {
  return value === "banned" ? "banned" : "active";
}

function buildAdminLoginFailureKey(account: string, clientIp?: string | null) {
  return `admin_login_fail:${account}:${clientIp?.trim() || "unknown"}`;
}

function buildWebPasswordLoginFailureKey(phone: string, clientIp?: string | null) {
  return `web_password_login_fail:${phone.trim()}:${clientIp?.trim() || "unknown"}`;
}

function toUserRecord(user: typeof usersTable.$inferSelect): UserRecord {
  return {
    id: user.id,
    // Database text column constrained to valid AuthRole values at insert time
    role: isValidAuthRole(user.role) ? user.role : ("user" satisfies AuthRole),
    status: toUserStatus(user.status),
    displayName: user.displayName,
    phone: user.phone,
    wechatOpenId: user.wechatOpenId,
    wechatUnionId: user.wechatUnionId,
    account: user.account,
    password: user.passwordHash,
    bannedAt: user.bannedAt,
    bannedUntil: user.bannedUntil,
    banReason: user.banReason,
    bannedBy: user.bannedBy
  };
}

async function toUserSummary(
  user: Pick<typeof usersTable.$inferSelect, "id" | "displayName" | "avatarFileId" | "role">
): Promise<UserSummary> {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: await resolveUploadedFileUrl(user.avatarFileId ?? null),
    ipLocationLabel: null,
    // Database text column constrained to valid AuthRole values at insert time
    role: isValidAuthRole(user.role) ? user.role : ("user" satisfies AuthRole)
  };
}

async function localizeAdminUser(user: typeof usersTable.$inferSelect) {
  if (user.role === "admin" && user.displayName === "System Admin") {
    await db
      .update(usersTable)
      .set({
        displayName: "系统管理员"
      })
      .where(eq(usersTable.id, user.id));

    return {
      ...user,
      displayName: "系统管理员"
    };
  }

  return user;
}

function resolveSessionStatus(session: {
  revokedAt: Date | null;
  expiresAt: Date;
}): "active" | "revoked" | "expired" {
  if (session.revokedAt) {
    return "revoked";
  }

  if (session.expiresAt.getTime() < now()) {
    return "expired";
  }

  return "active";
}

export const authRepo = {
  resetEphemeralState() {
    // 验证码/短信/待注册已迁移到 Redis，测试时通过 redis.flushDb() 清理
  },
  async createCaptchaChallenge(options?: { clientIp?: string | null }) {
    await ensureRedisConnected();
    const config = resolveAuthCodeConfig();
    if (options?.clientIp) {
      await consumeRateLimit({
        key: `captcha_rate:ip:${options.clientIp}`,
        limit: CAPTCHA_CLIENT_IP_RATE_LIMIT_MAX,
        windowSeconds: CAPTCHA_RATE_LIMIT_WINDOW_S,
        errorCode: "CAPTCHA_RATE_LIMITED"
      });
    }

    const { data: svg, text } = svgCaptcha.create({
      size: 4,
      ignoreChars: "0oO1iIl",
      noise: 2,
      color: true,
      width: 150,
      height: 44
    });
    const code = text;
    const challengeId = createId("captcha");
    const record = {
      challengeId,
      codeHash: hashVerificationCode({
        code: code.toUpperCase(),
        purpose: "captcha",
        subject: challengeId,
        secret: config.hashSecret
      }),
      attempts: 0
    };
    await redis.set(`captcha:${challengeId}`, JSON.stringify(record), {
      EX: config.captchaTtlSeconds
    });
    if (process.env.NODE_ENV === "test") {
      await redis.set(`captcha_test:${challengeId}`, code.toUpperCase(), {
        EX: config.captchaTtlSeconds
      });
    }
    return {
      challengeId,
      code,
      svg,
      expiresAt: now() + config.captchaTtlSeconds * 1000
    };
  },
  async validateCaptcha(challengeId: string, code: string) {
    await ensureRedisConnected();
    const config = resolveAuthCodeConfig();
    const key = `captcha:${challengeId}`;
    const raw = await redis.get(key);
    if (!raw) {
      return false;
    }

    const record = JSON.parse(raw) as { codeHash?: string; attempts?: number };
    if (!record.codeHash) {
      await redis.del(key);
      await redis.del(`captcha_test:${challengeId}`);
      return false;
    }

    const passed = verifyVerificationCodeHash(record.codeHash, {
      code: code.toUpperCase(),
      purpose: "captcha",
      subject: challengeId,
      secret: config.hashSecret
    });
    if (passed) {
      await redis.del(key);
      await redis.del(`captcha_test:${challengeId}`);
      return true;
    }

    const attempts = (record.attempts ?? 0) + 1;
    if (attempts >= CODE_VERIFY_MAX_ATTEMPTS) {
      await redis.del(key);
      await redis.del(`captcha_test:${challengeId}`);
    } else {
      await updateCodeRecordWithTtl(key, { ...record, attempts });
    }

    return false;
  },
  async createSmsCode(phone: string, options?: { clientIp?: string | null }) {
    await ensureRedisConnected();
    const config = resolveAuthCodeConfig();

    // 频率限制：同一手机号 60 秒内最多发送 1 次
    const rateLimitClientIp = options?.clientIp?.trim() || "unknown";

    await consumeRateLimit({
      key: `sms_rate:phone:${phone}`,
      limit: SMS_PHONE_RATE_LIMIT_MAX,
      windowSeconds: SMS_RATE_LIMIT_WINDOW_S,
      errorCode: "SMS_RATE_LIMITED"
    });
    await consumeRateLimit({
      key: `sms_rate:ip:${rateLimitClientIp}`,
      limit: SMS_CLIENT_IP_RATE_LIMIT_MAX,
      windowSeconds: SMS_RATE_LIMIT_WINDOW_S,
      errorCode: "SMS_RATE_LIMITED"
    });
    await consumeRateLimit({
      key: `sms_rate:phone_ip:${phone}:${rateLimitClientIp}`,
      limit: SMS_PHONE_IP_RATE_LIMIT_MAX,
      windowSeconds: SMS_RATE_LIMIT_WINDOW_S,
      errorCode: "SMS_RATE_LIMITED"
    });

    // 使用密码学安全的随机数生成指定长度验证码。
    const code = generateNumericCode(config.smsCodeLength);
    const requestId = createId("sms");
    const record = {
      requestId,
      phone,
      codeHash: hashVerificationCode({
        code,
        purpose: "sms",
        subject: phone,
        secret: config.hashSecret
      }),
      attempts: 0
    };
    await redis.set(`sms:${phone}`, JSON.stringify(record), {
      EX: config.smsTtlSeconds
    });
    if (process.env.NODE_ENV === "test") {
      await redis.set(`sms_test:${phone}`, code, {
        EX: config.smsTtlSeconds
      });
    }
    return { requestId, phone, code, expiresAt: now() + config.smsTtlSeconds * 1000 };
  },
  async validateSmsCode(phone: string, code: string) {
    await ensureRedisConnected();
    const config = resolveAuthCodeConfig();
    const key = `sms:${phone}`;
    const raw = await redis.get(key);
    if (!raw) {
      return false;
    }

    const record = JSON.parse(raw) as { codeHash?: string; requestId: string; attempts?: number };
    if (!record.codeHash) {
      await redis.del(key);
      await redis.del(`sms_test:${phone}`);
      return false;
    }

    const passed = verifyVerificationCodeHash(record.codeHash, {
      code,
      purpose: "sms",
      subject: phone,
      secret: config.hashSecret
    });
    if (passed) {
      await redis.del(key);
      await redis.del(`sms_test:${phone}`);
      return true;
    }

    const attempts = (record.attempts ?? 0) + 1;
    if (attempts >= CODE_VERIFY_MAX_ATTEMPTS) {
      await redis.del(key);
      await redis.del(`sms_test:${phone}`);
    } else {
      await updateCodeRecordWithTtl(key, { ...record, attempts });
    }

    return false;
  },
  async validateSmsCodeByRequest(phone: string, requestId: string, code: string) {
    await ensureRedisConnected();
    const config = resolveAuthCodeConfig();
    const key = `sms:${phone}`;
    const raw = await redis.get(key);
    if (!raw) {
      return false;
    }

    const record = JSON.parse(raw) as { codeHash?: string; requestId: string; attempts?: number };
    if (!record.codeHash) {
      await redis.del(key);
      await redis.del(`sms_test:${phone}`);
      return false;
    }

    const passed =
      record.requestId === requestId &&
      verifyVerificationCodeHash(record.codeHash, {
        code,
        purpose: "sms",
        subject: phone,
        secret: config.hashSecret
      });
    if (passed) {
      await redis.del(key);
      await redis.del(`sms_test:${phone}`);
      return true;
    }

    const attempts = (record.attempts ?? 0) + 1;
    if (attempts >= CODE_VERIFY_MAX_ATTEMPTS) {
      await redis.del(key);
      await redis.del(`sms_test:${phone}`);
    } else {
      await updateCodeRecordWithTtl(key, { ...record, attempts });
    }

    return false;
  },
  async findUserByPhone(phone: string) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    return rows[0] ? toUserRecord(rows[0]) : null;
  },
  async findUserById(id: string) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return rows[0] ? toUserRecord(rows[0]) : null;
  },
  async findUserByDisplayName(displayName: string) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.displayName, displayName))
      .limit(1);

    return rows[0] ? toUserRecord(rows[0]) : null;
  },
  async buildAvailableDisplayName(
    phone: string,
    options?: {
      randomize?: boolean;
      exclude?: string[];
    }
  ) {
    const base = `飞友${phone.slice(-4)}`;
    const excluded = new Set(options?.exclude ?? []);

    if (options?.randomize) {
      for (let attempt = 0; attempt < DISPLAY_NAME_RANDOMIZE_MAX_ATTEMPTS; attempt += 1) {
        const candidate = `${base}${Math.floor(DISPLAY_NAME_RANDOM_SUFFIX_MIN + Math.random() * DISPLAY_NAME_RANDOM_SUFFIX_RANGE)}`;
        if (excluded.has(candidate)) {
          continue;
        }
        if (!(await this.findUserByDisplayName(candidate))) {
          return candidate;
        }
      }
    }

    let candidate = base;
    let suffix = 2;
    while (excluded.has(candidate) || (await this.findUserByDisplayName(candidate))) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }

    return candidate;
  },
  async createPendingRegistration(
    phone: string,
    metadata?: {
      clientIp?: string | null;
      userAgent?: string | null;
      deviceLabel?: string | null;
    }
  ) {
    await ensureRedisConnected();
    const registrationToken = createId("reg");
    const suggestedDisplayName = await this.buildAvailableDisplayName(phone);
    const record = {
      registrationToken,
      phone,
      suggestedDisplayName,
      clientIp: metadata?.clientIp ?? null,
      userAgent: metadata?.userAgent ?? null,
      deviceLabel: metadata?.deviceLabel ?? null
    };
    await redis.set(`reg:${registrationToken}`, JSON.stringify(record), {
      EX: REGISTRATION_TTL_S
    });
    return { ...record, expiresAt: now() + REGISTRATION_TTL_S * 1000 };
  },
  async restorePendingRegistration(record: {
    registrationToken: string;
    phone: string;
    suggestedDisplayName: string;
    clientIp: string | null;
    userAgent: string | null;
    deviceLabel: string | null;
  }) {
    await ensureRedisConnected();
    await redis.set(`reg:${record.registrationToken}`, JSON.stringify(record), {
      EX: REGISTRATION_TTL_S
    });
  },
  async suggestPendingRegistrationDisplayName(registrationToken: string) {
    await ensureRedisConnected();
    const raw = await redis.get(`reg:${registrationToken}`);
    if (!raw) {
      return null;
    }

    const record = JSON.parse(raw) as {
      phone: string;
      suggestedDisplayName: string;
    };
    const displayName = await this.buildAvailableDisplayName(record.phone, {
      randomize: true,
      exclude: [record.suggestedDisplayName]
    });
    record.suggestedDisplayName = displayName;
    await redis.set(`reg:${registrationToken}`, JSON.stringify(record), {
      EX: REGISTRATION_TTL_S
    });
    return displayName;
  },
  async findPendingRegistration(registrationToken: string) {
    await ensureRedisConnected();
    const raw = await redis.get(`reg:${registrationToken}`);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as {
      registrationToken: string;
      phone: string;
      suggestedDisplayName: string;
      clientIp: string | null;
      userAgent: string | null;
      deviceLabel: string | null;
    };
  },
  async deletePendingRegistration(registrationToken: string) {
    await ensureRedisConnected();
    await redis.del(`reg:${registrationToken}`);
  },
  async consumePendingRegistration(registrationToken: string) {
    await ensureRedisConnected();
    const raw = await redis.getDel(`reg:${registrationToken}`);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as {
      registrationToken: string;
      phone: string;
      suggestedDisplayName: string;
      clientIp: string | null;
      userAgent: string | null;
      deviceLabel: string | null;
    };
  },
  async createUserByPhoneProfile(input: {
    phone: string;
    displayName: string;
    password?: string | null;
    avatarFileId?: string | null;
  }): Promise<UserRecord> {
    const id = createId("user");
    const passwordHash = input.password ? await hashPassword(input.password) : null;

    await db.insert(usersTable).values({
      id,
      role: "user",
      displayName: input.displayName,
      phone: input.phone,
      avatarFileId: input.avatarFileId ?? null,
      account: null,
      passwordHash
    });

    return {
      id,
      role: "user",
      status: "active",
      displayName: input.displayName,
      phone: input.phone,
      wechatOpenId: null,
      wechatUnionId: null,
      account: null,
      password: passwordHash,
      bannedAt: null,
      bannedUntil: null,
      banReason: null,
      bannedBy: null
    };
  },
  async findAdminByCredentials(account: string, password: string): Promise<UserRecord | null> {
    const admin = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.account, account), eq(usersTable.role, "admin")))
      .limit(1);

    if (admin.length === 0) {
      return null;
    }

    const localizedAdmin = await localizeAdminUser(admin[0]);
    const user = toUserRecord(localizedAdmin);

    // 使用 bcrypt verifyPassword 验证密码
    if (!user.password) {
      return null;
    }
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    return user;
  },
  async findUserByPhoneAndPassword(phone: string, password: string): Promise<UserRecord | null> {
    const user = await this.findUserByPhone(phone);
    if (!user?.password) {
      return null;
    }

    return (await verifyPassword(password, user.password)) ? user : null;
  },
  async verifyUserPassword(userId: string, password: string) {
    const user = await this.findUserById(userId);
    if (!user?.password) {
      return false;
    }

    return verifyPassword(password, user.password);
  },
  async updateUserPassword(userId: string, password: string) {
    const passwordHash = await hashPassword(password);
    await db
      .update(usersTable)
      .set({
        passwordHash
      })
      .where(eq(usersTable.id, userId));
  },
  async findAdminById(userId: string): Promise<UserRecord | null> {
    const admin = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.role, "admin")))
      .limit(1);

    if (admin.length === 0) {
      return null;
    }

    const localizedAdmin = await localizeAdminUser(admin[0]);
    return toUserRecord(localizedAdmin);
  },
  async verifyAdminPassword(userId: string, password: string) {
    const admin = await this.findAdminById(userId);
    if (!admin?.password) {
      return false;
    }

    return verifyPassword(password, admin.password);
  },
  async updateAdminPassword(userId: string, password: string) {
    const passwordHash = await hashPassword(password);
    await db
      .update(usersTable)
      .set({
        passwordHash
      })
      .where(and(eq(usersTable.id, userId), eq(usersTable.role, "admin")));
  },
  async recordAdminLoginFailure(account: string, clientIp?: string | null) {
    await ensureRedisConnected();
    const key = buildAdminLoginFailureKey(account, clientIp);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ADMIN_LOGIN_FAIL_TTL_S);
    }
    return count;
  },
  async getAdminLoginFailures(account: string, clientIp?: string | null): Promise<number> {
    await ensureRedisConnected();
    const key = buildAdminLoginFailureKey(account, clientIp);
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  },
  async clearAdminLoginFailures(account: string, clientIp?: string | null) {
    await ensureRedisConnected();
    await redis.del(buildAdminLoginFailureKey(account, clientIp));
  },
  async recordWebPasswordLoginFailure(phone: string, clientIp?: string | null) {
    await ensureRedisConnected();
    const key = buildWebPasswordLoginFailureKey(phone, clientIp);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WEB_PASSWORD_LOGIN_FAIL_TTL_S);
    }
    return count;
  },
  async getWebPasswordLoginFailures(phone: string, clientIp?: string | null): Promise<number> {
    await ensureRedisConnected();
    const key = buildWebPasswordLoginFailureKey(phone, clientIp);
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  },
  async clearWebPasswordLoginFailures(phone: string, clientIp?: string | null) {
    await ensureRedisConnected();
    await redis.del(buildWebPasswordLoginFailureKey(phone, clientIp));
  },
  async createSession(
    user: UserRecord,
    scope: SessionScope,
    input?: {
      clientIp?: string | null;
      userAgent?: string | null;
      deviceLabel?: string | null;
      refreshTokenHash?: string | null;
      refreshExpiresAt?: Date | null;
    }
  ): Promise<SessionRecord> {
    const sessionId = `sess_${createSecretToken(24)}`;
    const nowMs = now();
    const session: SessionRecord = {
      id: sessionId,
      userId: user.id,
      role: user.role,
      scope,
      clientIp: input?.clientIp ?? null,
      userAgent: input?.userAgent ?? null,
      deviceLabel: input?.deviceLabel ?? null,
      lastSeenAt: nowMs,
      revokedAt: null,
      refreshTokenHash: input?.refreshTokenHash ?? null,
      refreshExpiresAt: input?.refreshExpiresAt?.getTime() ?? null,
      expiresAt: nowMs + SESSION_TTL_MS,
      accessExpiresAt: nowMs + ACCESS_TTL_MS
    };

    await db.insert(sessionsTable).values({
      id: session.id,
      userId: session.userId,
      scope: session.scope,
      clientIp: session.clientIp,
      userAgent: session.userAgent,
      deviceLabel: session.deviceLabel,
      lastSeenAt: new Date(session.lastSeenAt),
      revokedAt: null,
      refreshTokenHash: session.refreshTokenHash,
      refreshExpiresAt: input?.refreshExpiresAt ?? null,
      expiresAt: new Date(session.expiresAt),
      accessExpiresAt: new Date(session.accessExpiresAt)
    });

    return session;
  },
  async getSession(
    sessionId: string,
    options?: { touch?: boolean }
  ): Promise<SessionRecord | null> {
    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return null;
    }

    const current = session[0];
    // 检查 access token 是否过期
    if (
      current.revokedAt ||
      !current.accessExpiresAt ||
      current.accessExpiresAt.getTime() < now()
    ) {
      return null;
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, current.userId))
      .limit(1);

    if (user.length === 0) {
      await this.revokeSession(sessionId);
      return null;
    }

    // touch 时滑动续期 access token
    if (options?.touch !== false) {
      await db
        .update(sessionsTable)
        .set({
          lastSeenAt: new Date(),
          accessExpiresAt: new Date(now() + ACCESS_TTL_MS)
        })
        .where(eq(sessionsTable.id, sessionId));
    }

    const resolvedLastSeenAt =
      options?.touch === false ? current.lastSeenAt : new Date();
    const revokedAt = current.revokedAt
      ? new Date(current.revokedAt as unknown as Date).getTime()
      : null;
    const refreshExpiresAt = current.refreshExpiresAt
      ? new Date(current.refreshExpiresAt as unknown as Date).getTime()
      : null;

    return {
      id: current.id,
      userId: current.userId,
      // Database text column constrained to valid AuthRole values at insert time
      role: isValidAuthRole(user[0].role) ? user[0].role : ("user" satisfies AuthRole),
      // Database text column constrained to valid SessionScope values at insert time
      scope: isValidSessionScope(current.scope) ? current.scope : ("web" satisfies SessionScope),
      clientIp: current.clientIp,
      userAgent: current.userAgent,
      deviceLabel: current.deviceLabel,
      lastSeenAt: resolvedLastSeenAt.getTime(),
      revokedAt,
      refreshTokenHash: current.refreshTokenHash,
      refreshExpiresAt,
      expiresAt: current.expiresAt.getTime(),
      accessExpiresAt: current.accessExpiresAt?.getTime() ?? now()
    };
  },
  async getSessionForMiddleware(
    sessionId: string
  ): Promise<"valid" | "access_expired" | "not_found" | "user_banned"> {
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (rows.length === 0) {
      return "not_found";
    }

    const current = rows[0];
    if (current.revokedAt) {
      return "not_found";
    }
    // refresh token 也过期
    if (current.expiresAt.getTime() < now()) {
      return "not_found";
    }
    // 只有 access token 过期
    if (!current.accessExpiresAt || current.accessExpiresAt.getTime() < now()) {
      return "access_expired";
    }

    const users = await db
      .select({
        id: usersTable.id,
        status: usersTable.status
      })
      .from(usersTable)
      .where(eq(usersTable.id, current.userId))
      .limit(1);

    if (users.length === 0) {
      await this.revokeSession(sessionId);
      return "not_found";
    }

    if (toUserStatus(users[0].status) === "banned") {
      await this.revokeSession(sessionId);
      return "user_banned";
    }

    return "valid";
  },
  async renewSession(
    sessionId: string,
    input?: {
      refreshTokenHash?: string | null;
      refreshExpiresAt?: Date | null;
      replacedRefreshTokenHash?: string | null;
    }
  ) {
    const current = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (current.length === 0) {
      return;
    }

    const row = current[0];
    const nowMs = now();
    const refreshExpiry = row.refreshExpiresAt?.getTime() ?? row.expiresAt.getTime();
    const remaining = refreshExpiry - nowMs;
    const halfTtl = SESSION_TTL_MS / 2;

    const updateData: {
      accessExpiresAt: Date;
      lastSeenAt: Date;
      refreshTokenHash?: string | null;
      refreshExpiresAt?: Date;
      expiresAt?: Date;
    } = {
      accessExpiresAt: new Date(nowMs + ACCESS_TTL_MS),
      lastSeenAt: new Date()
    };

    if (input && "refreshTokenHash" in input) {
      updateData.refreshTokenHash = input.refreshTokenHash ?? null;
    }

    // 滑动续期 refresh token
    const newExpiry =
      input?.refreshExpiresAt ?? (remaining < halfTtl ? new Date(nowMs + SESSION_TTL_MS) : null);
    if (newExpiry) {
      updateData.expiresAt = newExpiry;
      updateData.refreshExpiresAt = newExpiry;
    }

    await db
      .update(sessionsTable)
      .set(updateData)
      .where(eq(sessionsTable.id, sessionId));

    if (input?.replacedRefreshTokenHash) {
      await ensureRedisConnected();
      const replayTtlSeconds = Math.max(
        1,
        Math.ceil(((newExpiry ?? row.refreshExpiresAt ?? row.expiresAt).getTime() - nowMs) / 1000)
      );
      await redis.set(`used_refresh:${input.replacedRefreshTokenHash}`, sessionId, {
        EX: replayTtlSeconds
      });
    }
  },
  async findSessionByRefreshToken(
    refreshToken: string,
    options?: { scopes?: SessionScope[] }
  ) {
    const refreshTokenHash = hashToken(refreshToken);
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.refreshTokenHash, refreshTokenHash))
      .limit(1);

    const current = rows[0];
    if (!current) {
      await ensureRedisConnected();
      const replayedSessionId = await redis.get(`used_refresh:${refreshTokenHash}`);
      if (replayedSessionId) {
        await this.revokeSession(replayedSessionId);
      }
      return null;
    }

    if (current.revokedAt) {
      return null;
    }

    if (current.refreshExpiresAt && current.refreshExpiresAt.getTime() < now()) {
      return null;
    }

    if (current.expiresAt.getTime() < now()) {
      return null;
    }

    const scope = isValidSessionScope(current.scope)
      ? current.scope
      : ("web" satisfies SessionScope);
    if (options?.scopes && !options.scopes.includes(scope)) {
      return null;
    }

    const users = await db
      .select({
        id: usersTable.id,
        role: usersTable.role,
        status: usersTable.status
      })
      .from(usersTable)
      .where(eq(usersTable.id, current.userId))
      .limit(1);

    if (users.length === 0) {
      await this.revokeSession(current.id);
      return null;
    }

    if (toUserStatus(users[0].status) === "banned") {
      await this.revokeSession(current.id);
      return null;
    }

    return {
      id: current.id,
      userId: current.userId,
      role: isValidAuthRole(users[0].role) ? users[0].role : ("user" satisfies AuthRole),
      scope,
      clientIp: current.clientIp,
      userAgent: current.userAgent,
      deviceLabel: current.deviceLabel,
      lastSeenAt: current.lastSeenAt.getTime(),
      revokedAt: null,
      refreshTokenHash: current.refreshTokenHash,
      refreshExpiresAt: current.refreshExpiresAt?.getTime() ?? null,
      expiresAt: current.expiresAt.getTime(),
      accessExpiresAt: current.accessExpiresAt?.getTime() ?? now()
    } satisfies SessionRecord;
  },
  async revokeSession(sessionId: string) {
    await db
      .update(sessionsTable)
      .set({
        revokedAt: new Date()
      })
      .where(eq(sessionsTable.id, sessionId));
  },
  async revokeUserSessions(userId: string) {
    await db
      .update(sessionsTable)
      .set({
        revokedAt: new Date()
      })
      .where(and(eq(sessionsTable.userId, userId), isNull(sessionsTable.revokedAt)));
  },
  async deleteSession(sessionId: string) {
    await this.revokeSession(sessionId);
  },
  async getUserSummaryBySession(
    sessionId: string,
    options?: { touch?: boolean }
  ): Promise<UserSummary | null> {
    const session = await this.getSession(sessionId, options);
    if (!session) {
      return null;
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (user.length === 0) {
      await this.revokeSession(sessionId);
      return null;
    }

    if (toUserStatus(user[0].status) === "banned") {
      await this.revokeSession(sessionId);
      return null;
    }

    const localizedUser = await localizeAdminUser(user[0]);
    return toUserSummary(localizedUser);
  },
  async listLatestClientIpsByUserIds(userIds: string[]) {
    const uniqueUserIds = Array.from(
      new Set(userIds.map((userId) => userId.trim()).filter(Boolean))
    );
    if (uniqueUserIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        userId: sessionsTable.userId,
        clientIp: sessionsTable.clientIp
      })
      .from(sessionsTable)
      .where(
        and(
          inArray(sessionsTable.userId, uniqueUserIds),
          isNull(sessionsTable.revokedAt),
          gt(sessionsTable.expiresAt, new Date())
        )
      )
      .orderBy(asc(sessionsTable.userId), desc(sessionsTable.createdAt));

    const latestClientIpByUserId = new Map<string, string | null>();
    for (const row of rows) {
      if (!latestClientIpByUserId.has(row.userId)) {
        latestClientIpByUserId.set(row.userId, row.clientIp ?? null);
      }
    }

    return uniqueUserIds.map((userId) => ({
      userId,
      clientIp: latestClientIpByUserId.get(userId) ?? null
    }));
  },
  async listRecentSessions(limit = 20) {
    const rows = await db
      .select({
        id: sessionsTable.id,
        scope: sessionsTable.scope,
        clientIp: sessionsTable.clientIp,
        userAgent: sessionsTable.userAgent,
        deviceLabel: sessionsTable.deviceLabel,
        createdAt: sessionsTable.createdAt,
        lastSeenAt: sessionsTable.lastSeenAt,
        revokedAt: sessionsTable.revokedAt,
        expiresAt: sessionsTable.expiresAt,
        userId: usersTable.id,
        userDisplayName: usersTable.displayName,
        userRole: usersTable.role,
        userPhone: usersTable.phone
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .orderBy(desc(sessionsTable.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      // Database text column constrained to valid SessionScope values at insert time
      scope: isValidSessionScope(row.scope) ? row.scope : ("web" satisfies SessionScope),
      clientIp: row.clientIp,
      userAgent: row.userAgent,
      deviceLabel: row.deviceLabel,
      status: resolveSessionStatus({
        revokedAt: row.revokedAt,
        expiresAt: row.expiresAt
      }),
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt.toISOString(),
      user: {
        id: row.userId,
        displayName: row.userDisplayName,
        // Database text column constrained to valid AuthRole values at insert time
        role: isValidAuthRole(row.userRole) ? row.userRole : ("user" satisfies AuthRole),
        phone: row.userPhone
      }
    }));
  },
  async registerDevice(input: {
    userId: string;
    deviceType: string;
    deviceLabel: string | null;
    pushToken: string;
  }) {
    const id = createId("device");
    const now = new Date();
    const [device] = await db
      .insert(devicesTable)
      .values({
        id,
        userId: input.userId,
        deviceType: input.deviceType,
        deviceLabel: input.deviceLabel,
        pushToken: input.pushToken,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [devicesTable.userId, devicesTable.pushToken],
        set: {
          deviceType: input.deviceType,
          deviceLabel: input.deviceLabel,
          updatedAt: now
        }
      })
      .returning();

    return {
      deviceId: device.id,
      registeredAt: device.createdAt.toISOString()
    };
  },
  async unregisterDevice(userId: string, pushToken?: string) {
    if (pushToken) {
      await db
        .delete(devicesTable)
        .where(
          and(
            eq(devicesTable.userId, userId),
            eq(devicesTable.pushToken, pushToken)
          )
        );
    } else {
      await db
        .delete(devicesTable)
        .where(eq(devicesTable.userId, userId));
    }
  }
};
