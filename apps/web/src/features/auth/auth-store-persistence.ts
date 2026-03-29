import type { UserSummary } from "@feijia/schemas";

export const WEB_AUTH_STORAGE_KEY = "feijia.web.auth";

type PersistedAuthState = {
  user: UserSummary | null;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
    return parsed?.user ? parsed : null;
  } catch {
    window.localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
    return null;
  }
}

export function writePersistedAuthState(user: UserSummary) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    WEB_AUTH_STORAGE_KEY,
    JSON.stringify({
      user
    } satisfies PersistedAuthState)
  );
}

export function clearPersistedAuthState() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
}
