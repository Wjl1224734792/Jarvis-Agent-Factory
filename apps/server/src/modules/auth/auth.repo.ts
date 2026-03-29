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
};

type CaptchaChallenge = {
  challengeId: string;
  code: string;
  expiresAt: number;
};

type SmsCodeRecord = {
  requestId: string;
  phone: string;
  code: string;
  expiresAt: number;
};

type PendingRegistrationRecord = {
  registrationToken: string;
  phone: string;
  suggestedDisplayName: string;
  clientIp: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  expiresAt: number;
};

const captchaById = new Map<string, CaptchaChallenge>();
const smsByPhone = new Map<string, SmsCodeRecord>();
const registrationByToken = new Map<string, PendingRegistrationRecord>();

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const SMS_TTL_MS = 5 * 60 * 1000;
const REGISTRATION_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

function toUserRecord(user: typeof usersTable.$inferSelect): UserRecord {
  return {
    id: user.id,
    role: user.role as AuthRole,
    displayName: user.displayName,
    phone: user.phone,
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

function getValidPendingRegistration(registrationToken: string) {
  const record = registrationByToken.get(registrationToken);
  if (!record) {
    return null;
  }

  if (record.expiresAt < now()) {
    registrationByToken.delete(registrationToken);
    return null;
  }

  return record;
}

export const authRepo = {
  resetEphemeralState() {
    captchaById.clear();
    smsByPhone.clear();
    registrationByToken.clear();
  },
  createCaptchaChallenge() {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    const challengeId = createId("captcha");
    const record: CaptchaChallenge = {
      challengeId,
      code,
      expiresAt: now() + CAPTCHA_TTL_MS
    };
    captchaById.set(challengeId, record);
    return record;
  },
  validateCaptcha(challengeId: string, code: string) {
    const challenge = captchaById.get(challengeId);
    if (!challenge) {
      return false;
    }

    if (challenge.expiresAt < now()) {
      captchaById.delete(challengeId);
      return false;
    }

    const matched = challenge.code.toUpperCase() === code.toUpperCase();
    if (matched) {
      captchaById.delete(challengeId);
    }

    return matched;
  },
  createSmsCode(phone: string) {
    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    const requestId = createId("sms");
    const record: SmsCodeRecord = {
      requestId,
      phone,
      code,
      expiresAt: now() + SMS_TTL_MS
    };
    smsByPhone.set(phone, record);
    return record;
  },
  validateSmsCode(phone: string, code: string) {
    const sms = smsByPhone.get(phone);
    if (!sms) {
      return false;
    }

    if (sms.expiresAt < now()) {
      smsByPhone.delete(phone);
      return false;
    }

    const matched = sms.code === code;
    if (matched) {
      smsByPhone.delete(phone);
    }

    return matched;
  },
  validateSmsCodeByRequest(phone: string, requestId: string, code: string) {
    const sms = smsByPhone.get(phone);
    if (!sms) {
      return false;
    }

    if (sms.requestId !== requestId) {
      return false;
    }

    if (sms.expiresAt < now()) {
      smsByPhone.delete(phone);
      return false;
    }

    const matched = sms.code === code;
    if (matched) {
      smsByPhone.delete(phone);
    }

    return matched;
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
    const registrationToken = createId("reg");
    const suggestedDisplayName = await this.buildAvailableDisplayName(phone);
    const record: PendingRegistrationRecord = {
      registrationToken,
      phone,
      suggestedDisplayName,
      clientIp: metadata?.clientIp ?? null,
      userAgent: metadata?.userAgent ?? null,
      deviceLabel: metadata?.deviceLabel ?? null,
      expiresAt: now() + REGISTRATION_TTL_MS
    };
    registrationByToken.set(registrationToken, record);
    return record;
  },
  async suggestPendingRegistrationDisplayName(registrationToken: string) {
    const record = getValidPendingRegistration(registrationToken);
    if (!record) {
      return null;
    }

    const displayName = await this.buildAvailableDisplayName(record.phone, {
      randomize: true,
      exclude: [record.suggestedDisplayName]
    });
    record.suggestedDisplayName = displayName;
    registrationByToken.set(registrationToken, record);
    return displayName;
  },
  consumePendingRegistration(registrationToken: string) {
    const record = getValidPendingRegistration(registrationToken);
    if (!record) {
      return null;
    }

    registrationByToken.delete(registrationToken);
    return record;
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
    const session: SessionRecord = {
      id: sessionId,
      userId: user.id,
      role: user.role,
      scope,
      clientIp: input?.clientIp ?? null,
      userAgent: input?.userAgent ?? null,
      deviceLabel: input?.deviceLabel ?? null,
      lastSeenAt: now(),
      revokedAt: null,
      refreshTokenHash: input?.refreshTokenHash ?? null,
      refreshExpiresAt: input?.refreshExpiresAt?.getTime() ?? null,
      expiresAt: now() + SESSION_TTL_MS
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
      expiresAt: new Date(session.expiresAt)
    });

    return session;
  },
  async getSession(sessionId: string, options?: { touch?: boolean }): Promise<SessionRecord | null> {
    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return null;
    }

    const current = session[0];
    const expiresAt = current.expiresAt.getTime();
    if (current.revokedAt || expiresAt < now()) {
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

    if (options?.touch !== false) {
      await db
        .update(sessionsTable)
        .set({
          lastSeenAt: new Date()
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
      expiresAt
    };
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
  async getUserSummaryBySession(sessionId: string, options?: { touch?: boolean }): Promise<UserSummary | null> {
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
