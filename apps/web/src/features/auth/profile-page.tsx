import { useAuthStore } from "./auth-store";

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <article className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-600">Profile</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          个人中心最小入口
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Display Name</p>
            <p className="mt-3 text-lg font-medium text-slate-900">
              {user?.displayName ?? "未登录"}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Role</p>
            <p className="mt-3 text-lg font-medium text-slate-900">{user?.role ?? "-"}</p>
          </div>
        </div>
      </article>

      <article className="rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)]">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-200/70">Next</p>
        <h3 className="mt-3 text-2xl font-semibold">后续身份动作入口</h3>
        <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-300">
          <li>我的点评 / 收藏 / 浏览历史</li>
          <li>发布入口权限校验</li>
          <li>消息中心与受保护请求</li>
        </ul>
      </article>
    </section>
  );
}
