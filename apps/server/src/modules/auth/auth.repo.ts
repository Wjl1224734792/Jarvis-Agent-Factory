import type { AuthRole, UserSummary } from "@feijia/schemas";
import { randomUUID } from "node:crypto";
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

const usersById = new Map<string, UserRecord>();
const usersByPhone = new Map<string, string>();
const usersByAccount = new Map<string, string>();

const sessionsById = new Map<string, SessionRecord>();
const captchaById = new Map<string, CaptchaChallenge>();
const smsByPhone = new Map<string, SmsCodeRecord>();

const DEV_ADMIN_ACCOUNT = "admin";
const DEV_ADMIN_PASSWORD = "Admin#123";
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const SMS_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toUserSummary(user: UserRecord): UserSummary {
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role
  };
}

function now() {
  return Date.now();
}

function ensureDevAdmin() {
  const existingId = usersByAccount.get(DEV_ADMIN_ACCOUNT);
  if (existingId) {
    return;
  }

  const id = `admin_${randomUUID()}`;
  usersById.set(id, {
    id,
    role: "admin",
    displayName: "系统管理员",
    phone: null,
    account: DEV_ADMIN_ACCOUNT,
    password: DEV_ADMIN_PASSWORD
  });
  usersByAccount.set(DEV_ADMIN_ACCOUNT, id);
}

export const authRepo = {
  createCaptchaChallenge() {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    const challengeId = `captcha_${randomUUID()}`;
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
    const requestId = `sms_${randomUUID()}`;
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
  findOrCreateUserByPhone(phone: string): UserRecord {
    const existingId = usersByPhone.get(phone);
    if (existingId) {
      return usersById.get(existingId)!;
    }

    const id = `user_${randomUUID()}`;
    const user: UserRecord = {
      id,
      role: "user",
      displayName: `飞友${phone.slice(-4)}`,
      phone,
      account: null,
      password: null
    };
    usersById.set(id, user);
    usersByPhone.set(phone, id);
    return user;
  },
  findAdminByCredentials(account: string, password: string): UserRecord | null {
    ensureDevAdmin();
    const adminId = usersByAccount.get(account);
    if (!adminId) {
      return null;
    }
    const admin = usersById.get(adminId);
    if (!admin || admin.role !== "admin") {
      return null;
    }
    if (admin.password !== password) {
      return null;
    }
    return admin;
  },
  createSession(user: UserRecord, scope: SessionScope) {
    const session: SessionRecord = {
      id: `sess_${randomUUID()}`,
      userId: user.id,
      role: user.role,
      scope,
      expiresAt: now() + SESSION_TTL_MS
    };
    sessionsById.set(session.id, session);
    return session;
  },
  getSession(sessionId: string): SessionRecord | null {
    const session = sessionsById.get(sessionId);
    if (!session) {
      return null;
    }
    if (session.expiresAt < now()) {
      sessionsById.delete(session.id);
      return null;
    }
    return session;
  },
  deleteSession(sessionId: string) {
    sessionsById.delete(sessionId);
  },
  getUserSummaryBySession(sessionId: string): UserSummary | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }
    const user = usersById.get(session.userId);
    if (!user) {
      sessionsById.delete(sessionId);
      return null;
    }
    return toUserSummary(user);
  }
};
