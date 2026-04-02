import {
  createId,
  createSecretToken,
  db,
  hashPassword,
  sessionsTable,
  usersTable
} from "@feijia/db";
import type { AuthRole, UserSummary } from "@feijia/schemas";
import { and, desc, eq } from "drizzle-orm";
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

const CAPTCHA_TTL_S = 300;
const SMS_TTL_S = 300;
const REGISTRATION_TTL_S = 600;
const ACCESS_TTL_MS = 2 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

function toUserRecord(user: typeof usersTable.$inferSelect): UserRecord {
  return {
    id: user.id,
    role: user.role as AuthRole,
    displayName: user.displayName,
    phone: user.phone,
    wechatOpenId: user.wechatOpenId,
    wechatUnionId: user.wechatUnionId,
    account: user.account,
    password: user.passwordHash
  };
}

async function toUserSummary(
  user: Pick<typeof usersTable.$inferSelect, "id" | "displayName" | "avatarFileId" | "role">
): Promise<UserSummary> {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: await resolveUploadedFileUrl(user.avatarFileId ?? null),
    role: user.role as AuthRole
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
  async createCaptchaChallenge() {
    await ensureRedisConnected();
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    const challengeId = createId("captcha");
    const record = { challengeId, code };
    await redis.set(`captcha:${challengeId}`, JSON.stringify(record), {
      EX: CAPTCHA_TTL_S
    });
    return { ...record, expiresAt: now() + CAPTCHA_TTL_S * 1000 };
  },
  async validateCaptcha(challengeId: string, code: string) {
    await ensureRedisConnected();
    const raw = await redis.getDel(`captcha:${challengeId}`);
    if (!raw) {
      return false;
    }

    const record = JSON.parse(raw) as { code: string };
    return record.code.toUpperCase() === code.toUpperCase();
  },
  async createSmsCode(phone: string) {
    await ensureRedisConnected();
    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    const requestId = createId("sms");
    const record = { requestId, phone, code };
    await redis.set(`sms:${phone}`, JSON.stringify(record), {
      EX: SMS_TTL_S
    });
    return { ...record, expiresAt: now() + SMS_TTL_S * 1000 };
  },
  async validateSmsCode(phone: string, code: string) {
    await ensureRedisConnected();
    const raw = await redis.getDel(`sms:${phone}`);
    if (!raw) {
      return false;
    }

    const record = JSON.parse(raw) as { code: string; requestId: string };
    return record.code === code;
  },
  async validateSmsCodeByRequest(phone: string, requestId: string, code: string) {
    await ensureRedisConnected();
    const raw = await redis.getDel(`sms:${phone}`);
    if (!raw) {
      return false;
    }

    const record = JSON.parse(raw) as { code: string; requestId: string };
    return record.requestId === requestId && record.code === code;
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
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const candidate = `${base}${Math.floor(100 + Math.random() * 900)}`;
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
    avatarFileId?: string | null;
  }): Promise<UserRecord> {
    const id = createId("user");

    await db.insert(usersTable).values({
      id,
      role: "user",
      displayName: input.displayName,
      phone: input.phone,
      avatarFileId: input.avatarFileId ?? null,
      account: null,
      passwordHash: null
    });

    return {
      id,
      role: "user",
      displayName: input.displayName,
      phone: input.phone,
      wechatOpenId: null,
      wechatUnionId: null,
      account: null,
      password: null
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

    if (user.password !== hashPassword(password)) {
      return null;
    }

    return user;
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
      role: user[0].role as AuthRole,
      scope: current.scope as SessionScope,
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
  ): Promise<"valid" | "access_expired" | "not_found"> {
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

    return "valid";
  },
  async renewSession(sessionId: string) {
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

    const updateData: Record<string, Date> = {
      accessExpiresAt: new Date(nowMs + ACCESS_TTL_MS),
      lastSeenAt: new Date()
    };

    // 滑动续期 refresh token
    if (remaining < halfTtl) {
      const newExpiry = new Date(nowMs + SESSION_TTL_MS);
      updateData.expiresAt = newExpiry;
      updateData.refreshExpiresAt = newExpiry;
    }

    await db
      .update(sessionsTable)
      .set(updateData)
      .where(eq(sessionsTable.id, sessionId));
  },
  async findSessionByRefreshToken(refreshToken: string) {
    const refreshTokenHash = hashPassword(refreshToken);
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.refreshTokenHash, refreshTokenHash))
      .limit(1);

    const current = rows[0];
    if (!current) {
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

    return this.getSession(current.id, { touch: false });
  },
  async revokeSession(sessionId: string) {
    await db
      .update(sessionsTable)
      .set({
        revokedAt: new Date()
      })
      .where(eq(sessionsTable.id, sessionId));
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

    const localizedUser = await localizeAdminUser(user[0]);
    return toUserSummary(localizedUser);
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
      scope: row.scope as SessionScope,
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
        role: row.userRole as AuthRole,
        phone: row.userPhone
      }
    }));
  }
};
