import type { PropsWithChildren } from "react";
import { APP_ROUTES } from "@feijia/shared";
import { Navigate, useLocation } from "react-router-dom";
import { useBootstrapAdminAuth } from "./use-bootstrap-admin-auth";
import { useAdminAuthStore } from "./auth-store";

export function AdminProtectedRoute({ children }: PropsWithChildren) {
  useBootstrapAdminAuth();

  const location = useLocation();
  const status = useAdminAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-sm text-slate-300">
        正在恢复管理员身份...
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        replace
        to={`${APP_ROUTES.adminLogin}?redirect=${encodeURIComponent(location.pathname)}`}
      />
    );
  }

  return children;
}
