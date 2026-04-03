import type { UserSummary } from "@feijia/schemas";

export const WEB_AUTH_STORAGE_KEY = "feijia.web.auth";

/** 持久化存储版本号，用于未来 schema 变更时的迁移 */
const PERSIST_VERSION = 1;

type PersistedAuthState = {
  /** 存储版本号 */
  v: number;
  user: UserSummary | null;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * 验证 UserSummary 数据完整性。
 * 防止 XSS 攻击下被篡改的无效数据导致运行时错误。
 */
function isValidUserSummary(user: unknown): user is UserSummary {
  if (!user || typeof user !== "object") return false;
  const u = user as Record<string, unknown>;
  return (
    typeof u.id === "string" && u.id.length > 0 &&
    typeof u.displayName === "string" && u.displayName.length > 0 &&
    (u.avatarUrl === null || typeof u.avatarUrl === "string") &&
    (u.role === "user" || u.role === "admin")
  );
}

export function readPersistedAuthState(): PersistedAuthState | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(WEB_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAuthState;
    // 验证版本号
    if (parsed.v !== PERSIST_VERSION) {
      window.localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
      return null;
    }
    // 验证用户数据完整性
    if (!isValidUserSummary(parsed.user)) {
      window.localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
    return null;
  }
}

export function writePersistedAuthState(user: UserSummary) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      WEB_AUTH_STORAGE_KEY,
      JSON.stringify({
        v: PERSIST_VERSION,
        user
      } satisfies PersistedAuthState)
    );
  } catch {
    // localStorage 可能已满或被禁用，静默失败不影响应用运行
  }
}

export function clearPersistedAuthState() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
}
