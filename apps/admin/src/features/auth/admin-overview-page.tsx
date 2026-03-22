import { useAdminAuthStore } from "./auth-store";

export function AdminOverviewPage() {
  const user = useAdminAuthStore((state) => state.user);
  const error = useAdminAuthStore((state) => state.error);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_20px_70px_-45px_rgba(14,165,233,0.8)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Overview</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">管理员受保护首页</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Display Name</p>
            <p className="mt-3 text-lg font-medium text-white">{user?.displayName ?? "-"}</p>
          </div>
          <div className="rounded-3xl bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Role</p>
            <p className="mt-3 text-lg font-medium text-white">{user?.role ?? "-"}</p>
          </div>
        </div>
      </article>

      <article className="rounded-[32px] border border-white/10 bg-slate-950/70 p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Guard Status</p>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          当前页面只允许管理员访问。未登录或权限不足的会话应被重定向回后台登录页。
        </p>
        {error ? (
          <p className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
        ) : null}
      </article>
    </section>
  );
}
