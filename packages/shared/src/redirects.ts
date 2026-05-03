type LocationLike = {
  pathname: string;
  search?: string;
  hash?: string;
};

type ResolveSafeRedirectPathInput = {
  candidate: string | null | undefined;
  fallbackPath: string;
  blockedPaths?: string[];
};

function normalizeBlockedPath(path: string) {
  return path.split(/[?#]/u, 1)[0] ?? path;
}

export function buildRedirectTarget(location: LocationLike) {
  return `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
}

export function buildLoginRedirectUrl(loginPath: string, location: LocationLike) {
  return `${loginPath}?redirect=${encodeURIComponent(buildRedirectTarget(location))}`;
}

export function resolveSafeRedirectPath(input: ResolveSafeRedirectPathInput) {
  const candidate = input.candidate?.trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return input.fallbackPath;
  }

  const normalizedCandidatePath = normalizeBlockedPath(candidate);
  const blockedPaths = new Set((input.blockedPaths ?? []).map(normalizeBlockedPath));

  if (blockedPaths.has(normalizedCandidatePath)) {
    return input.fallbackPath;
  }

  return candidate;
}
