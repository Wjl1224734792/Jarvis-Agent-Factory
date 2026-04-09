const VIEW_SESSION_STORAGE_KEY = "feijia:view-session";

function createFallbackSessionId() {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getViewSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.sessionStorage.getItem(VIEW_SESSION_STORAGE_KEY)?.trim();
  if (existing) {
    return existing;
  }

  const nextValue =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : createFallbackSessionId();
  window.sessionStorage.setItem(VIEW_SESSION_STORAGE_KEY, nextValue);
  return nextValue;
}

function getViewedContentStorageKey(scope: "post" | "model", id: string) {
  return `feijia:viewed:${scope}:${id}`;
}

export function shouldRecordSessionView(scope: "post" | "model", id: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const sessionId = getViewSessionId();
  if (!sessionId) {
    return false;
  }

  const storageKey = getViewedContentStorageKey(scope, id);
  if (window.sessionStorage.getItem(storageKey) === sessionId) {
    return false;
  }

  window.sessionStorage.setItem(storageKey, sessionId);
  return true;
}
