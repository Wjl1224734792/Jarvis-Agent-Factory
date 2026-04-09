import { ensureRedisConnected, redis } from "../modules/auth/redis-client";

export const VIEW_SESSION_HEADER = "x-feijia-view-session";
export const VIEW_SESSION_TTL_SECONDS = 60 * 30;

function normalizeSessionId(sessionId?: string | null) {
  const normalized = sessionId?.trim();
  return normalized ? normalized.slice(0, 160) : null;
}

function buildViewerScopeKey(input: {
  contentType: "post" | "model";
  contentId: string;
  sessionId?: string | null;
  viewerId?: string | null;
}) {
  const sessionId = normalizeSessionId(input.sessionId);
  if (sessionId) {
    return `view:${input.contentType}:${input.contentId}:session:${sessionId}`;
  }

  if (input.viewerId) {
    return `view:${input.contentType}:${input.contentId}:user:${input.viewerId}`;
  }

  return null;
}

export async function shouldCountUniqueView(input: {
  contentType: "post" | "model";
  contentId: string;
  sessionId?: string | null;
  viewerId?: string | null;
}) {
  const key = buildViewerScopeKey(input);
  if (!key) {
    return false;
  }

  await ensureRedisConnected();
  const result = await redis.set(key, "1", {
    NX: true,
    EX: VIEW_SESSION_TTL_SECONDS
  });

  return result === "OK";
}
