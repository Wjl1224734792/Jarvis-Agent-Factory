import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  LibraryBigIcon,
  MenuIcon,
  Rows3Icon,
  Settings2Icon,
  UserRoundIcon
} from "lucide-react";
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
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { useAuthStore } from "./auth-store";
import { UserMenu } from "./user-menu";

const navItems = [
  {
    to: APP_ROUTES.feedHome,
    label: "首页",
    icon: Rows3Icon,
    requiresAuth: false
  },
  {
    to: APP_ROUTES.models,
    label: "飞行器库",
    icon: LibraryBigIcon,
    requiresAuth: false
  },
  {
    to: APP_ROUTES.notifications,
    label: "通知",
    icon: BellIcon,
    requiresAuth: true
  },
  {
    to: APP_ROUTES.webProfile,
    label: "我的",
    icon: UserRoundIcon,
    requiresAuth: true
  }
] as const;

function Navigation({
  authenticated,
  unreadCount,
  onNavigate
}: {
  authenticated: boolean;
  unreadCount: number;
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
                  "flex items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
              key={item.to}
              onClick={onNavigate}
              to={item.to}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {item.label}
              </span>
              {item.to === APP_ROUTES.notifications && unreadCount > 0 ? (
                <Badge className="ml-1">{unreadCount > 99 ? "99+" : unreadCount}</Badge>
              ) : null}
            </NavLink>
          );
        })}
    </nav>
  );
}

export function WebLayout() {
  useBootstrapAuth();

  const authStatus = useAuthStore((state) => state.status);
  const authenticated = authStatus === "authenticated";

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications(),
    enabled: authenticated
  });

  const unreadCount = authenticated ? (notificationsQuery.data?.unreadCount ?? 0) : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="rounded-lg lg:hidden" size="icon-lg" variant="outline">
                  <MenuIcon />
                  <span className="sr-only">打开导航</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                className="w-[86vw] max-w-sm border-r border-border/80 bg-background/96"
                side="left"
              >
                <SheetHeader className="px-0">
                  <SheetTitle>{APP_NAME}</SheetTitle>
                  <SheetDescription>飞行器参数、口碑与社区交流</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-5 pt-4">
                  <Navigation authenticated={authenticated} onNavigate={undefined} unreadCount={unreadCount} />
                  <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 text-sm leading-7 text-muted-foreground">
                    先浏览首页和机型库，再决定是否继续发帖、评论和关注作者。
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <NavLink className="flex items-center gap-3" to={APP_ROUTES.feedHome}>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                飞
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-foreground">{APP_NAME}</div>
                <div className="hidden text-sm text-muted-foreground sm:block">
                  飞行器数据库与真实飞友社区
                </div>
              </div>
            </NavLink>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <div className="w-full max-w-xl rounded-lg border border-border/80 bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm">
              搜索入口预留：机型、帖子、作者与品牌
            </div>
          </div>

          <UserMenu />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[240px_minmax(0,960px)] xl:px-8">
        <aside className="hidden xl:block">
          <div className="sticky top-[104px] flex flex-col gap-5 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="rounded-lg bg-secondary/45 p-4">
              <div className="text-sm font-medium text-foreground">{APP_NAME}</div>
              <div className="mt-2 text-sm leading-7 text-muted-foreground">
                飞行器资料、真实口碑和社区内容统一浏览。
              </div>
            </div>

            <Navigation authenticated={authenticated} unreadCount={unreadCount} />

            <div className="mt-auto rounded-lg border border-border/80 bg-secondary/30 p-4 text-sm leading-7 text-muted-foreground">
              底部将继续补设置和 App 下载入口。
              <div className="mt-3 flex items-center gap-2 text-foreground">
                <Settings2Icon className="size-4" />
                按 PRD 结构保留位置
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 xl:pr-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
