import {
  createId,
  db,
  hashPassword,
  sessionsTable,
  usersTable
} from "@feijia/db";
import type { AuthRole, UserSummary } from "@feijia/schemas";
import { and, eq } from "drizzle-orm";
import type { UserRecord } from "../users/users.schema";

type SessionScope = "web" | "admin";

type SessionRecord = {
  id: string;
  userId: string;
  role: AuthRole;
  scope: SessionScope;
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

const captchaById = new Map<string, CaptchaChallenge>();
const smsByPhone = new Map<string, SmsCodeRecord>();

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const SMS_TTL_MS = 5 * 60 * 1000;
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

function toUserSummary(
  user: Pick<typeof usersTable.$inferSelect, "id" | "displayName" | "avatarUrl" | "role">
): UserSummary {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role as AuthRole
  };
}

export const authRepo = {
  resetEphemeralState() {
    captchaById.clear();
    smsByPhone.clear();
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
  async findOrCreateUserByPhone(phone: string): Promise<UserRecord> {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    if (existing.length > 0) {
      return toUserRecord(existing[0]);
    }

    const id = createId("user");
    const displayName = `飞友${phone.slice(-4)}`;

    await db.insert(usersTable).values({
      id,
      role: "user",
      displayName,
      phone,
      account: null,
      passwordHash: null
    });

    return {
      id,
      role: "user",
      displayName,
      phone,
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

    const user = toUserRecord(admin[0]);

    if (user.password !== hashPassword(password)) {
      return null;
    }

    return user;
  },
  async createSession(user: UserRecord, scope: SessionScope): Promise<SessionRecord> {
    const session: SessionRecord = {
      id: createId("sess"),
      userId: user.id,
      role: user.role,
      scope,
      expiresAt: now() + SESSION_TTL_MS
    };

    await db.insert(sessionsTable).values({
      id: session.id,
      userId: session.userId,
      scope: session.scope,
      expiresAt: new Date(session.expiresAt)
    });

    return session;
  },
  async getSession(sessionId: string): Promise<SessionRecord | null> {
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

    if (expiresAt < now()) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
      return null;
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, current.userId))
      .limit(1);

    if (user.length === 0) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
      return null;
    }

    return {
      id: current.id,
      userId: current.userId,
      role: user[0].role as AuthRole,
      scope: current.scope as SessionScope,
      expiresAt
    };
  },
  async deleteSession(sessionId: string) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  },
  async getUserSummaryBySession(sessionId: string): Promise<UserSummary | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (user.length === 0) {
      await this.deleteSession(sessionId);
      return null;
    }

    return toUserSummary(user[0]);
  }
};
