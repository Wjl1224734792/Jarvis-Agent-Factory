import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { WEB_AUTH_INVALID_EVENT } from "@/lib/auth-events";
import { AuthRequiredDialog } from "./auth-required-dialog";
import { getAuthCacheScope, shouldResetAuthCache } from "./auth-cache-helpers";
import { useAuthStore } from "./auth-store";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { WebTopNav, shouldShowImmersiveTopNavSearch } from "./web-top-nav";

export function ImmersiveLayout() {
  useBootstrapAuth();

  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const location = useLocation();
  const authCacheScopeRef = useRef<string | null>(null);
  const authCacheScope = getAuthCacheScope(authStatus, authUserId);
  const showTopNavSearch = shouldShowImmersiveTopNavSearch(location.pathname);

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f6f8_0%,#f7f8fa_24%,#ffffff_100%)] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <WebTopNav showSearch={showTopNavSearch} showSidebar={false} />
      <ScrollRestoration />
      <Outlet />
      <AuthRequiredDialog />
    </div>
  );
}
