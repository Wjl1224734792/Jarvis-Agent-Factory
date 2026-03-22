import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

export function AdminShell() {
  const navigate = useNavigate();
  const user = useAdminAuthStore((state) => state.user);
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#020617_0%,#0f172a_45%,#111827_100%)] text-white">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/70">Admin</p>
              <h1 className="text-lg font-semibold">{APP_NAME}</h1>
            </div>
            <nav className="flex items-center gap-2">
              {[
                { to: APP_ROUTES.adminHome, label: "概览" },
                { to: APP_ROUTES.adminCategories, label: "分类" },
                { to: APP_ROUTES.adminBrands, label: "品牌" },
                { to: APP_ROUTES.adminModels, label: "机型" }
              ].map((item) => (
                <Link
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200"
                  key={item.to}
                  to={item.to}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200"
              to={APP_ROUTES.adminHome}
            >
              {user?.displayName ?? "管理员"}
            </Link>
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              onClick={() => {
                void apiClient
                  .logoutAdmin()
                  .then(() => {
                    setAnonymous();
                    navigate(APP_ROUTES.adminLogin, { replace: true });
                  })
                  .catch((error: unknown) => {
                    setError(error instanceof Error ? error.message : "退出失败");
                  });
              }}
              type="button"
            >
              退出
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
