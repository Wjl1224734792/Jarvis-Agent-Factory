import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LibraryBigIcon,
  MenuIcon,
  Rows3Icon,
  Settings2Icon,
  TrophyIcon,
  UserRoundIcon
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";
import { useAppShellStore } from "../../store/use-app-shell-store";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { useAuthStore } from "./auth-store";
import { UserMenu } from "./user-menu";

const navItems = [
  {
    to: APP_ROUTES.feedHome,
    label: "首页",
    description: "社区内容流",
    icon: Rows3Icon,
    requiresAuth: false
  },
  {
    to: APP_ROUTES.models,
    label: "飞行器库",
    description: "参数与机型",
    icon: LibraryBigIcon,
    requiresAuth: false
  },
  {
    to: APP_ROUTES.rankings,
    label: "榜单",
    description: "官方与用户榜",
    icon: TrophyIcon,
    requiresAuth: false
  },
  {
    to: APP_ROUTES.notifications,
    label: "通知",
    description: "互动提醒",
    icon: BellIcon,
    requiresAuth: true
  },
  {
    to: APP_ROUTES.webProfile,
    label: "个人中心",
    description: "收藏与评论",
    icon: UserRoundIcon,
    requiresAuth: true
  }
] as const;

const footerItems = [
  {
    label: "设置",
    description: "账号安全与偏好",
    icon: Settings2Icon
  },
  {
    label: "下载 App",
    description: "移动端体验预留",
    icon: DownloadIcon
  }
] as const;

function Navigation({
  authenticated,
  unreadCount,
  collapsed,
  onNavigate
}: {
  authenticated: boolean;
  unreadCount: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-2">
      {navItems
        .filter((item) => (item.requiresAuth ? authenticated : true))
        .map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "relative flex items-center rounded-2xl border border-transparent transition-all",
                  collapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3",
                  isActive
                    ? "border-primary/20 bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:border-border/80 hover:bg-card hover:text-foreground"
                )
              }
              key={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              to={item.to}
            >
              <div
                className={cn(
                  "flex items-center",
                  collapsed ? "justify-center" : "flex-1 items-start gap-3"
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background/20 text-current backdrop-blur-sm">
                  <Icon className="size-4.5" />
                </span>

                {collapsed ? <span className="sr-only">{item.label}</span> : null}

                {!collapsed ? (
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-current/75">
                      {item.description}
                    </span>
                  </span>
                ) : null}
              </div>

              {!collapsed && item.to === APP_ROUTES.notifications && unreadCount > 0 ? (
                <Badge className="shrink-0 bg-background/90 text-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              ) : null}

              {collapsed && item.to === APP_ROUTES.notifications && unreadCount > 0 ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500" />
              ) : null}
            </NavLink>
          );
        })}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="mt-auto flex flex-col gap-2">
      {footerItems.map((item) => {
        const Icon = item.icon;

        return (
          <div
            className={cn(
              "rounded-2xl border border-border/80 bg-background/75 text-foreground shadow-sm",
              collapsed ? "flex justify-center p-3" : "flex items-center gap-3 px-4 py-3"
            )}
            key={item.label}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Icon className="size-4.5" />
            </span>
            {collapsed ? <span className="sr-only">{item.label}</span> : null}
            {!collapsed ? (
              <div className="min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function WebLayout() {
  useBootstrapAuth();

  const authStatus = useAuthStore((state) => state.status);
  const authenticated = authStatus === "authenticated";
  const isSidebarCollapsed = useAppShellStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useAppShellStore((state) => state.toggleSidebarCollapsed);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications(),
    enabled: authenticated
  });

  const unreadCount = authenticated ? (notificationsQuery.data?.unreadCount ?? 0) : 0;
  const sidebarWidth = isSidebarCollapsed ? 108 : 296;

  return (
    <div
      className="min-h-screen"
      style={{ ["--shell-sidebar-width" as string]: `${sidebarWidth}px` }}
    >
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl transition-[padding-left] duration-300 xl:pl-[calc(var(--shell-sidebar-width)+1.5rem)] xl:pr-8">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-0">
          <div className="flex items-center gap-3">
            <Sheet onOpenChange={setIsMobileNavOpen} open={isMobileNavOpen}>
              <SheetTrigger asChild>
                <Button className="rounded-2xl xl:hidden" size="icon-lg" variant="outline">
                  <MenuIcon />
                  <span className="sr-only">打开导航</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                className="w-[88vw] max-w-sm border-r border-border/80 bg-background/96"
                side="left"
              >
                <SheetHeader className="px-0">
                  <SheetTitle>{APP_NAME}</SheetTitle>
                  <SheetDescription>飞行器参数、口碑与社区交流</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-5 pt-4">
                  <Navigation
                    authenticated={authenticated}
                    collapsed={false}
                    onNavigate={() => {
                      setIsMobileNavOpen(false);
                    }}
                    unreadCount={unreadCount}
                  />
                  <div className="rounded-2xl border border-border/80 bg-secondary/45 p-4 text-sm leading-7 text-muted-foreground">
                    先浏览机型和榜单，再决定是否继续发帖、评论和参与评分。
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <NavLink className="flex items-center gap-3" to={APP_ROUTES.feedHome}>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm shadow-primary/25">
                飞
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-foreground">{APP_NAME}</div>
                <div className="hidden text-sm text-muted-foreground sm:block">
                  低空口碑、参数与社区内容的统一入口
                </div>
              </div>
            </NavLink>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center xl:flex">
            <div className="w-full max-w-2xl rounded-2xl border border-border/80 bg-card/90 px-5 py-3 text-sm text-muted-foreground shadow-sm">
              搜索入口预留：机型、帖子、作者与品牌
            </div>
          </div>

          <UserMenu />
        </div>
      </header>

      <aside className="hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-30 xl:flex xl:w-[var(--shell-sidebar-width)] xl:transition-[width] xl:duration-300">
        <div className="flex w-full px-4 pb-6 pt-[92px]">
          <div className="flex w-full flex-col gap-4 rounded-[1.75rem] border border-sidebar-border/80 bg-sidebar/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div
              className={cn(
                "flex items-start gap-3",
                isSidebarCollapsed && "justify-center"
              )}
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm shadow-primary/25">
                飞
              </div>

              {!isSidebarCollapsed ? (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{APP_NAME}</div>
                  <div className="mt-1 text-xs leading-6 text-muted-foreground">
                    固定左栏承载全站一级导航，主内容区专注浏览。
                  </div>
                </div>
              ) : null}

              <Button
                className="shrink-0 rounded-2xl"
                onClick={toggleSidebarCollapsed}
                size="icon-sm"
                title={isSidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
                type="button"
                variant="outline"
              >
                {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                <span className="sr-only">{isSidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}</span>
              </Button>
            </div>

            {!isSidebarCollapsed ? (
              <div className="rounded-3xl border border-border/80 bg-background/80 px-4 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
                  App Shell
                </div>
                <div className="mt-3 text-sm leading-7 text-foreground">
                  顶部导航负责全局入口，左侧固定边栏负责模块切换，内容区最大宽度按 PRD 收敛。
                </div>
              </div>
            ) : null}

            <Navigation
              authenticated={authenticated}
              collapsed={isSidebarCollapsed}
              unreadCount={unreadCount}
            />

            <SidebarFooter collapsed={isSidebarCollapsed} />
          </div>
        </div>
      </aside>

      <div className="px-4 py-6 transition-[margin-left] duration-300 sm:px-6 xl:ml-[var(--shell-sidebar-width)] xl:px-8">
        <div className="mx-auto w-full max-w-[1200px] min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
