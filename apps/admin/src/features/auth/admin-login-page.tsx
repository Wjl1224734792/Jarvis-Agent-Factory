import { APP_ROUTES } from "@feijia/shared";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

type AdminLoginResult = Awaited<ReturnType<typeof apiClient.loginAdmin>>;

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthenticated = useAdminAuthStore((state) => state.setAuthenticated);
  const [account, setAccount] = useState("admin");
  const [password, setPassword] = useState("Admin#123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || APP_ROUTES.adminHome;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#020617_0%,#0f172a_45%,#111827_100%)] px-6 py-10 text-white">
      <section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_20px_70px_-45px_rgba(14,165,233,0.8)] backdrop-blur">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            管理员身份校验
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">后台独立登录入口</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            后台不复用手机号验证码方案。当前使用账号密码登录，并通过独立管理员会话守卫受保护页面。
          </p>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-slate-950/70 p-8">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">管理员账号</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                onChange={(event) => {
                  setAccount(event.target.value);
                }}
                value={account}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">密码</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
            ) : null}

            <button
              className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-500"
              disabled={isSubmitting}
              onClick={() => {
                setIsSubmitting(true);
                setError(null);

                void apiClient
                  .loginAdmin({
                    account,
                    password
                  })
                  .then((response: AdminLoginResult) => {
                    setAuthenticated(response.user);
                    navigate(redirectTo, { replace: true });
                  })
                  .catch((reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : "管理员登录失败");
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
              type="button"
            >
              {isSubmitting ? "登录中…" : "登录后台"}
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
