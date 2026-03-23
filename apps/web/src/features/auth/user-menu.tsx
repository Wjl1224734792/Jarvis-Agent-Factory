import { APP_ROUTES } from "@feijia/shared";
import { LogOut, Radar, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";

export function UserMenu() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const setError = useAuthStore((state) => state.setError);

  if (status === "idle" || status === "loading") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-sm text-slate-500 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
        <Radar className="h-4 w-4 animate-pulse text-sky-600" />
        身份恢复中
      </span>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-sky-700 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] md:inline-flex">
          Guest Mode
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_55%,#1e88e5_100%)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_22px_50px_-28px_rgba(30,136,229,0.7)] transition hover:translate-y-[-1px] hover:shadow-[0_26px_55px_-28px_rgba(30,136,229,0.8)]"
          to={APP_ROUTES.webLogin}
        >
          <Sparkles className="h-4 w-4" />
          登录 / 注册
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        className="group inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur transition hover:border-sky-200 hover:bg-white"
        to={APP_ROUTES.webProfile}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dbeafe_0%,#bfdbfe_45%,#e0f2fe_100%)] text-sm font-semibold text-sky-700">
          {user.displayName.slice(0, 1)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-medium text-slate-950 transition group-hover:text-sky-700">
            {user.displayName}
          </span>
          <span className="block text-xs uppercase tracking-[0.18em] text-slate-400">
            {user.role === "admin" ? "Admin Session" : "Flight Member"}
          </span>
        </span>
      </Link>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm text-slate-600 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
        onClick={() => {
          void apiClient
            .logout()
            .then(() => {
              setAnonymous();
              navigate(APP_ROUTES.feedHome);
            })
            .catch((error: unknown) => {
              setError(error instanceof Error ? error.message : "退出失败");
            });
        }}
        type="button"
      >
        <LogOut className="h-4 w-4" />
        退出
      </button>
    </div>
  );
}
