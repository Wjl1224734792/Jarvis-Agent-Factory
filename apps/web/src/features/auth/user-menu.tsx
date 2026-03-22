import { APP_ROUTES } from "@feijia/shared";
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
      <span className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-500">
        身份恢复中
      </span>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <Link
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        to={APP_ROUTES.webLogin}
      >
        登录 / 注册
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
        to={APP_ROUTES.webProfile}
      >
        {user.displayName}
      </Link>
      <button
        className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
        onClick={() => {
          void apiClient
            .logout()
            .then(() => {
              setAnonymous();
              navigate(APP_ROUTES.home);
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
  );
}
