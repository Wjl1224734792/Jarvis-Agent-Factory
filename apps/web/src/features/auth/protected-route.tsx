import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@feijia/shared";
import { useAuthStore } from "./auth-store";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        正在恢复登录状态...
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        replace
        to={`${APP_ROUTES.webLogin}?redirect=${encodeURIComponent(location.pathname)}`}
      />
    );
  }

  return children;
}
