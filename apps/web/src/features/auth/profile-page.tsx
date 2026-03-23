import { APP_ROUTES } from "@feijia/shared";
import {
  Bell,
  Compass,
  History,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  Sparkles,
  Star,
  Waypoints
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "./auth-store";

const quickActions = [
  {
    title: "继续浏览信息流",
    description: "回到首页，查看推荐、最新和关注内容。",
    to: APP_ROUTES.feedHome,
    icon: LayoutDashboard
  },
  {
    title: "进入飞行器库",
    description: "继续按分类、品牌和动力类型筛选机型。",
    to: APP_ROUTES.models,
    icon: Compass
  },
  {
    title: "查看消息通知",
    description: "管理关注、互动和评论回复的站内提醒。",
    to: APP_ROUTES.notifications,
    icon: Bell
  }
] as const;

const capabilityItems = [
  {
    label: "已接入能力",
    value: "发帖 / 图片上传 / 点赞 / 收藏 / 分享",
    icon: Sparkles
  },
  {
    label: "口碑能力",
    value: "机型评分与唯一点评规则",
    icon: Star
  },
  {
    label: "互动能力",
    value: "关注作者、评论与楼中回复",
    icon: MessageSquareText
  }
] as const;

const roadmapItems = [
  {
    title: "我的点评与内容资产",
    description: "后续可继续聚合为“我的帖子 / 我的点评 / 我的收藏”的统一内容库。",
    icon: History
  },
  {
    title: "偏好与账户设置",
    description: "当前已具备身份恢复能力，后续可继续扩展隐私设置和会话管理。",
    icon: Settings2
  },
  {
    title: "消息与飞行关系",
    description: "通知流已成型，后续可继续延伸到更完整的社交与消息中心。",
    icon: Waypoints
  }
] as const;

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);

  const displayName = user?.displayName ?? "访客";
  const sessionLabel = status === "authenticated" && user ? "已登录会话" : "访客模式";
  const roleLabel = user?.role === "admin" ? "管理员账户" : "飞友成员";

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#164e63_42%,#1e88e5_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.75)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-100/90">
              <Sparkles className="h-4 w-4" />
              Profile Hub
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {displayName} 的飞行档案与站内入口
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100/85">
              这一页不再只是身份占位，而是把当前已经可用的浏览、互动、通知和内容能力收拢成一个真正的个人中心入口。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Session</p>
                <p className="mt-3 text-lg font-medium">{sessionLabel}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Role</p>
                <p className="mt-3 text-lg font-medium">{roleLabel}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Focus</p>
                <p className="mt-3 text-lg font-medium">机型口碑 + 社区互动</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-slate-950/25 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Current Scope</p>
            <div className="mt-4 space-y-3">
              {capabilityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="rounded-[22px] border border-white/10 bg-white/8 p-4"
                    key={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sky-100">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-sky-100/70">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-white">{item.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quick Actions</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">站内主链路入口</h3>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              PC 优先 / 移动可用
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            {quickActions.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="group rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 transition hover:border-sky-200 hover:shadow-[0_28px_65px_-42px_rgba(30,136,229,0.45)]"
                  key={item.to}
                  to={item.to}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 transition group-hover:bg-sky-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-slate-950">{item.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Roadmap</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">后续可扩展方向</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              不影响当前闭环
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {roadmapItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-5"
                  key={item.title}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)]">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-slate-950">{item.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error ? (
            <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
