import { APP_ROUTES, buildLoginRedirectUrl } from "@feijia/shared";

type ProtectedRouteStatus = "idle" | "loading" | "authenticated" | "anonymous";

export function shouldSuspendProtectedRoute(
  status: ProtectedRouteStatus,
  isBootstrapped: boolean
) {
  return !isBootstrapped || status === "idle" || status === "loading";
}

export function resolveProtectedRouteRedirect(input: {
  location: {
    pathname: string;
    search: string;
    hash: string;
  };
  mode?: "login" | "fallback";
  fallbackPath?: string;
}) {
  if (input.mode === "fallback") {
    return input.fallbackPath ?? APP_ROUTES.feedHome;
  }

  return buildLoginRedirectUrl(APP_ROUTES.webLogin, input.location);
}
