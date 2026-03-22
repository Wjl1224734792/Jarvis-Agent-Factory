import { APP_ROUTES, APP_NAME } from "@feijia/shared";
import { ArrowRight, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";

const highlights = [
  {
    title: "手机号验证码登录",
    description: "主站先跑通手机号 + 图形验证码 + mock 短信验证码链路。",
    icon: Smartphone
  },
  {
    title: "HttpOnly Cookie 会话",
    description: "登录后由服务端写入 Cookie，前端刷新后通过 /auth/me 恢复身份。",
    icon: ShieldCheck
  }
] as const;

export function HomePage() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  return (
    <main className="space-y-6">
      <section className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
          MVP 第 2 迭代账号与身份体系
        </p>
        <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
          {APP_NAME} 正在把用户进入系统的第一条身份链路接稳。
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          当前前端已预留主站用户入口、登录页、个人中心和后台登录守卫。后端接口就绪后，这里会直接消费真实
          auth session。
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {status === "authenticated" && user ? (
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              to={APP_ROUTES.webProfile}
            >
              进入个人中心
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-500"
              to={APP_ROUTES.webLogin}
            >
              立即登录
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {highlights.map((highlight) => {
          const Icon = highlight.icon;

          return (
            <article
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)]"
              key={highlight.title}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">{highlight.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{highlight.description}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
