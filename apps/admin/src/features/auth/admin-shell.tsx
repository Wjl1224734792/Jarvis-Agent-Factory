import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareMore,
  Plane,
  ScrollText,
  ShieldCheck,
  Star,
  Tags
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

const navItems = [
  {
    to: APP_ROUTES.adminHome,
    label: "概览",
    hint: "治理总览与风险态势",
    icon: LayoutDashboard
  },
  {
    to: APP_ROUTES.adminCategories,
    label: "分类",
    hint: "飞行器分类与开关",
    icon: Tags
  },
  {
    to: APP_ROUTES.adminBrands,
    label: "品牌",
    hint: "品牌索引与归属",
    icon: Boxes
  },
  {
    to: APP_ROUTES.adminModels,
    label: "机型",
    hint: "参数与可见状态",
    icon: Plane
  },
  {
    to: APP_ROUTES.adminReviews,
    label: "点评",
    hint: "口碑治理与展示",
    icon: Star
  },
  {
    to: APP_ROUTES.adminRankings,
    label: "榜单",
    hint: "官方榜单与排行条目",
    icon: ScrollText
  },
  {
    to: APP_ROUTES.adminPosts,
    label: "帖子",
    hint: "内容审核与发布",
    icon: FileText
  },
  {
    to: APP_ROUTES.adminPostComments,
    label: "评论",
    hint: "评论树与隐藏处理",
    icon: MessageSquareMore
  }
] as const;

export function AdminShell() {
  const navigate = useNavigate();
  const user = useAdminAuthStore((state) => state.user);
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_24%),linear-gradient(160deg,#020617_0%,#0f172a_45%,#111827_100%)] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#0f172a_0%,#0f766e_45%,#22d3ee_100%)] text-base font-semibold text-white shadow-[0_22px_55px_-30px_rgba(34,211,238,0.6)]">
              管
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Feijia Admin</p>
              <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{APP_NAME}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)] md:block">
              当前会话：{user?.displayName ?? "管理员"}
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-300/30 hover:bg-white/10 hover:text-white"
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
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8 xl:px-8">
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-[104px] lg:h-[calc(100vh-8rem)] lg:self-start">
            <div className="flex h-full flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.88)_100%)] p-5 shadow-[0_35px_90px_-50px_rgba(0,0,0,0.8)]">
              <div className="rounded-[28px] border border-cyan-300/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.96)_0%,rgba(8,47,73,0.9)_55%,rgba(8,145,178,0.85)_100%)] p-5 shadow-[0_24px_70px_-40px_rgba(34,211,238,0.45)]">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Governance Console</p>
                <h2 className="mt-3 text-xl font-semibold text-white">内容、口碑、机型与榜单治理台</h2>
                <p className="mt-3 text-sm leading-7 text-cyan-50/85">
                  以最小操作链路处理审核、分类、品牌、机型、榜单和评论。
                </p>
              </div>

              <nav className="mt-5 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      className={({ isActive }) =>
                        `group flex items-center justify-between rounded-[24px] border px-4 py-4 transition ${
                          isActive
                            ? "border-cyan-300/20 bg-cyan-400/10 text-white shadow-[0_20px_55px_-40px_rgba(34,211,238,0.4)]"
                            : "border-transparent bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/8 hover:text-white"
                        }`
                      }
                      key={item.to}
                      to={item.to}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-cyan-100 transition group-hover:bg-white/12">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="block truncate text-xs uppercase tracking-[0.14em] text-slate-500">
                            {item.hint}
                          </span>
                        </span>
                      </span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-3 pt-5">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Session</p>
                  <p className="mt-2 text-sm font-medium text-white">{user?.displayName ?? "管理员"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200/70">
                    <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                    Admin Protected Route
                  </p>
                </div>
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/4 p-4 text-sm leading-7 text-slate-400">
                  当前后台聚焦最小治理闭环：内容审核、评论处理、点评展示、机型与官方榜单维护。
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="rounded-[34px] border border-white/10 bg-white/4 p-3 shadow-[0_35px_90px_-48px_rgba(0,0,0,0.65)] backdrop-blur">
              <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(15,23,42,0.82)_0%,rgba(2,6,23,0.78)_100%)] p-4 sm:p-5 xl:p-6">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
