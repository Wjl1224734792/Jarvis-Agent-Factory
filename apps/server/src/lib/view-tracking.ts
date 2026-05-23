import { ensureRedisConnected, redis } from "../modules/auth/redis-client";

export const VIEW_SESSION_HEADER = "x-feijia-view-session";
export const VIEW_SESSION_TTL_SECONDS = 60 * 30;

function normalizeSessionId(sessionId?: string | null) {
  const normalized = sessionId?.trim();
  return normalized ? normalized.slice(0, 160) : null;
}

function normalizeViewerFingerprint(fingerprint?: string | null) {
  const normalized = fingerprint?.trim().toLowerCase();
  return normalized ? normalized.slice(0, 240) : null;
}

function buildViewerScopeKey(input: {
  contentType: "post" | "model";
  contentId: string;
  sessionId?: string | null;
  viewerId?: string | null;
  viewerFingerprint?: string | null;
}) {
  const sessionId = normalizeSessionId(input.sessionId);
  if (sessionId) {
    return `view:${input.contentType}:${input.contentId}:session:${sessionId}`;
  }

  if (input.viewerId) {
    return `view:${input.contentType}:${input.contentId}:user:${input.viewerId}`;
  }

  const viewerFingerprint = normalizeViewerFingerprint(input.viewerFingerprint);
  if (viewerFingerprint) {
    return `view:${input.contentType}:${input.contentId}:fingerprint:${viewerFingerprint}`;
  }

  return null;
}

export async function shouldCountUniqueView(input: {
  contentType: "post" | "model";
  contentId: string;
  sessionId?: string | null;
  viewerId?: string | null;
  viewerFingerprint?: string | null;
}) {
  const key = buildViewerScopeKey(input);
  if (!key) {
    return false;
  }

  try {
    await ensureRedisConnected();
    const result = await redis.set(key, "1", {
      NX: true,
      EX: VIEW_SESSION_TTL_SECONDS
    });
    return result === "OK";
  } catch {
    // Redis 不可用时降级为非去重模式，直接允许计数
    return true;
  }
}
