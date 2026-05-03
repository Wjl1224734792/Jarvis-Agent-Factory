type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

export function getAuthCacheScope(status: AuthStatus, userId?: string | null) {
  return status === "authenticated" && userId ? `user:${userId}` : "guest";
}

export function shouldResetAuthCache(previousScope: string | null, nextScope: string) {
  return previousScope !== null && previousScope !== nextScope;
}
