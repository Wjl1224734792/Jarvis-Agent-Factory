import { APP_ROUTES } from "@feijia/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { SiteShell } from "@/components/site-shell";
import { cn } from "@/lib/utils";
import { WEB_AUTH_INVALID_EVENT } from "@/lib/auth-events";
import { getAuthCacheScope, shouldResetAuthCache } from "./auth-cache-helpers";
import { useAuthStore } from "./auth-store";
import { AuthRequiredDialog } from "./auth-required-dialog";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { WebTopNav } from "./web-top-nav";

export function WebLayout() {
  useBootstrapAuth();

  const { pathname } = useLocation();
  const isFeedWideShell =
    pathname === APP_ROUTES.flightCircle ||
    pathname === APP_ROUTES.rankings ||
    pathname === APP_ROUTES.models;

  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const authCacheScopeRef = useRef<string | null>(null);
  const authCacheScope = getAuthCacheScope(authStatus, authUserId);

  useEffect(() => {
    if (!isAuthBootstrapped) {
      return;
    }

    if (shouldResetAuthCache(authCacheScopeRef.current, authCacheScope)) {
      queryClient.clear();
    }

    authCacheScopeRef.current = authCacheScope;
  }, [authCacheScope, isAuthBootstrapped, queryClient]);

  useEffect(() => {
    function handleAuthInvalid() {
      setAnonymous();
    }

    window.addEventListener(WEB_AUTH_INVALID_EVENT, handleAuthInvalid);
    return () => {
      window.removeEventListener(WEB_AUTH_INVALID_EVENT, handleAuthInvalid);
    };
  }, [setAnonymous]);

  return (
    <div className="min-h-screen" style={{ ["--shell-sidebar-width" as string]: "224px" }}>
      <WebTopNav />

      <div className="px-[var(--page-pad-x)] py-5 xl:ml-[var(--shell-sidebar-width)] xl:px-6">
        <SiteShell className={cn(isFeedWideShell && "site-shell--feed-wide")}>
          <div className="min-w-0">
            <Outlet />
            <ScrollRestoration />
          </div>
        </SiteShell>
      </div>
      <AuthRequiredDialog />
    </div>
  );
}
