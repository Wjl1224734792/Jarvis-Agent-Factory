import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import { Bell } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { useAuthStore } from "./auth-store";
import { UserMenu } from "./user-menu";

export function WebLayout() {
  useBootstrapAuth();

  const authStatus = useAuthStore((state) => state.status);
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications(),
    enabled: authStatus === "authenticated"
  });
  const unreadCount =
    authStatus === "authenticated" ? (notificationsQuery.data?.unreadCount ?? 0) : 0;

  const navItems: Array<{ to: string; label: string }> = [
    { to: APP_ROUTES.feedHome, label: "首页" },
    { to: APP_ROUTES.models, label: "机型库" }
  ];

  if (authStatus === "authenticated") {
    navItems.push({ to: APP_ROUTES.notifications, label: "通知" });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)]">
      <header className="border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Feijia</p>
              <h1 className="text-lg font-semibold text-slate-950">{APP_NAME}</h1>
            </div>
            <nav className="flex items-center gap-2">
              {navItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-white hover:text-slate-950"
                    }`
                  }
                  key={item.to}
                  to={item.to}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.to === APP_ROUTES.notifications ? <Bell className="h-4 w-4" /> : null}
                    {item.label}
                    {item.to === APP_ROUTES.notifications && unreadCount > 0 ? (
                      <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </span>
                </NavLink>
              ))}
            </nav>
          </div>
          <div>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
