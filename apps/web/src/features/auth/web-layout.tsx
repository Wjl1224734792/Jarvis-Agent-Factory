import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  Bell,
  ChevronRight,
  Compass,
  LayoutDashboard,
  Menu,
  Plane,
  Search,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { useAuthStore } from "./auth-store";
import { UserMenu } from "./user-menu";

export function WebLayout() {
  useBootstrapAuth();

  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications(),
    enabled: authStatus === "authenticated"
  });
  const unreadCount =
    authStatus === "authenticated" ? (notificationsQuery.data?.unreadCount ?? 0) : 0;

  const navItems: Array<{ to: string; label: string; icon: typeof LayoutDashboard; hint: string }> = [
    {
      to: APP_ROUTES.feedHome,
      label: "首页",
      icon: LayoutDashboard,
      hint: "推荐、最新、关注信息流"
    },
    {
      to: APP_ROUTES.models,
      label: "飞行器库",
      icon: Plane,
      hint: "分类、品牌与动力筛选"
    }
  ];

  if (authStatus === "authenticated") {
    navItems.push({
      to: APP_ROUTES.notifications,
      label: "消息通知",
      icon: Bell,
      hint: "互动提醒与站内动态"
    });
    navItems.push({
      to: APP_ROUTES.webProfile,
      label: "个人中心",
      icon: Compass,
      hint: "身份态、内容与偏好入口"
    });
  }

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_20%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <button
              aria-controls="web-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label={isSidebarOpen ? "关闭侧边导航" : "打开侧边导航"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)] transition hover:border-slate-300 lg:hidden"
              onClick={() => {
                setIsSidebarOpen((current) => !current);
              }}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-sky-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Feijia Air Atlas
              </div>
              <div className="mt-2 flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#38bdf8_100%)] text-base font-semibold text-white shadow-[0_24px_60px_-30px_rgba(30,136,229,0.9)]">
                  飞
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                    {APP_NAME}
                  </h1>
                  <p className="hidden text-sm text-slate-500 sm:block">
                    低空飞行器数据库与真实飞友社区
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden min-w-[280px] max-w-[460px] flex-1 xl:block">
            <div className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.4)] backdrop-blur">
              <Search className="h-4 w-4 text-sky-700" />
              <div className="min-w-0">
                <div className="text-sm text-slate-900">全局搜索入口预留</div>
                <div className="truncate text-xs uppercase tracking-[0.18em] text-slate-400">
                  机型、帖子、飞友与品牌
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8 xl:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
          {isSidebarOpen ? (
            <button
              aria-label="关闭侧边导航遮罩"
              className="fixed inset-0 z-10 bg-slate-950/35 lg:hidden"
              onClick={() => {
                setIsSidebarOpen(false);
              }}
              type="button"
            />
          ) : null}

          <aside
            id="web-sidebar"
            className={`${
              isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0 lg:translate-x-0 lg:opacity-100"
            } fixed inset-x-4 top-[92px] z-20 rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(248,250,252,0.95)_100%)] p-5 shadow-[0_35px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl transition duration-300 lg:sticky lg:top-[108px] lg:block lg:h-[calc(100vh-8.5rem)] lg:translate-x-0 lg:self-start lg:overflow-hidden lg:opacity-100`}
          >
            <div className="flex h-full flex-col">
              <div className="rounded-[28px] bg-[linear-gradient(145deg,#0f172a_0%,#1e3a8a_60%,#0284c7_100%)] p-5 text-white shadow-[0_24px_70px_-34px_rgba(30,64,175,0.9)]">
                <p className="text-xs uppercase tracking-[0.24em] text-sky-100/75">PC First</p>
                <h2 className="mt-3 text-xl font-semibold">飞友工作台</h2>
                <p className="mt-3 text-sm leading-7 text-sky-100/85">
                  先浏览数据库，再进入真实讨论。壳层按桌面信息密度设计，移动端保持轻量折叠。
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
                            ? "border-sky-200 bg-sky-50 text-slate-950 shadow-[0_20px_50px_-34px_rgba(30,136,229,0.45)]"
                            : "border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white"
                        }`
                      }
                      key={item.to}
                      onClick={() => {
                        setIsSidebarOpen(false);
                      }}
                      to={item.to}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-sky-100 group-hover:text-sky-700">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="block truncate text-xs uppercase tracking-[0.14em] text-slate-400">
                            {item.hint}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {item.to === APP_ROUTES.notifications && unreadCount > 0 ? (
                          <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
                      </span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-3 pt-5">
                <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Session
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {user ? user.displayName : "游客浏览模式"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {authStatus === "authenticated" ? "已登录" : "访客"}
                    </span>
                  </div>
                </div>
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 p-4 text-sm leading-7 text-slate-500">
                  设计基线遵循 PRD：顶部导航、左侧功能栏、白底卡片和科技蓝强调色。
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="rounded-[36px] border border-white/80 bg-white/60 p-3 shadow-[0_35px_90px_-45px_rgba(15,23,42,0.3)] backdrop-blur xl:p-4">
              <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.88)_100%)] p-4 sm:p-5 xl:p-6">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
