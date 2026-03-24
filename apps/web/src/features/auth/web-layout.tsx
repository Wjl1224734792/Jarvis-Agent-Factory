import { useQuery } from "@tanstack/react-query";
import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  CompassIcon,
  HouseIcon,
  LibraryBigIcon,
  MailIcon,
  MenuIcon,
  PlusCircleIcon,
  SearchIcon,
  Settings2Icon,
  TrophyIcon,
  UserRoundIcon
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SitePanel, SitePanelBody, SiteShell } from "@/components/site-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { to: APP_ROUTES.feedHome, label: "首页", icon: HouseIcon },
  { to: APP_ROUTES.flightCircle, label: "飞友圈", icon: CompassIcon },
  { to: APP_ROUTES.models, label: "飞行器库", icon: LibraryBigIcon },
  { to: APP_ROUTES.rankings, label: "榜单", icon: TrophyIcon },
  { to: APP_ROUTES.webProfile, label: "个人中心", icon: UserRoundIcon }
] as const;

const utilityItems = [{ to: APP_ROUTES.webSettings, label: "设置", icon: Settings2Icon }] as const;

function getHeaderCopy(pathname: string) {
  if (pathname.startsWith(APP_ROUTES.rankingEditor)) {
    return {
      placeholder: "继续完善榜单标题、描述和候选机型...",
      actionLabel: "返回榜单"
    };
  }

  if (pathname.startsWith(APP_ROUTES.models)) {
    return {
      placeholder: "搜索飞行器、机型或评测...",
      actionLabel: "发布内容"
    };
  }

  if (pathname.startsWith(APP_ROUTES.rankings)) {
    return {
      placeholder: "搜索榜单、机型或测评标签...",
      actionLabel: "创建榜单"
    };
  }

  if (pathname.startsWith(APP_ROUTES.webProfile)) {
    return {
      placeholder: "搜索飞行器、资讯、飞友...",
      actionLabel: "发布内容"
    };
  }

  if (pathname.startsWith(APP_ROUTES.webSettings)) {
    return {
      placeholder: "搜索机型、资讯或飞友...",
      actionLabel: "发布内容"
    };
  }

  if (pathname.startsWith(APP_ROUTES.compose)) {
    return {
      placeholder: "继续完善你的标题、封面和标签...",
      actionLabel: "返回首页"
    };
  }

  return {
    placeholder: "搜索无人机、航拍地、飞友或机型...",
    actionLabel: "发布内容"
  };
}

function ShellBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-[calc(var(--radius-control)+0.15rem)] bg-primary text-lg font-semibold text-primary-foreground shadow-[var(--shadow-float)]">
        飞
      </div>
      <div className="min-w-0">
        <div className="text-[1.65rem] font-semibold tracking-[-0.04em] text-primary">{APP_NAME}</div>
        <div className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Precision aviation
        </div>
      </div>
    </div>
  );
}

function NavButtons({
  items,
  onNavigate
}: {
  items: readonly { to: string; label: string; icon: typeof HouseIcon }[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-2">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            className={({ isActive }) =>
              cn(
                buttonVariants({
                  size: "lg",
                  variant: "nav",
                  className: "w-full justify-start px-3.5"
                }),
                isActive && "bg-primary/10 text-primary shadow-[var(--shadow-soft)]"
              )
            }
            key={item.to}
            onClick={onNavigate}
            to={item.to}
          >
            <Icon className="size-4.5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function WebLayout() {
  useBootstrapAuth();

  const location = useLocation();
  const authStatus = useAuthStore((state) => state.status);
  const authenticated = authStatus === "authenticated";
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.listNotifications(),
    enabled: authenticated
  });

  const unreadCount = authenticated ? (notificationsQuery.data?.unreadCount ?? 0) : 0;
  const headerCopy = getHeaderCopy(location.pathname);
  const primaryActionTarget =
    location.pathname.startsWith(APP_ROUTES.rankingEditor)
      ? APP_ROUTES.rankings
      : location.pathname.startsWith(APP_ROUTES.rankings)
        ? APP_ROUTES.rankingEditor
        : location.pathname.startsWith(APP_ROUTES.compose)
          ? APP_ROUTES.feedHome
          : APP_ROUTES.compose;

  return (
    <div
      className="min-h-screen"
      style={{ ["--shell-sidebar-width" as string]: "242px" }}
    >
      <header className="sticky top-0 z-40 border-b border-border/75 bg-background/92 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-4 xl:px-6">
          <div className="flex items-center gap-3">
            <Sheet onOpenChange={setIsMobileNavOpen} open={isMobileNavOpen}>
              <SheetTrigger asChild>
                <Button className="xl:hidden" size="icon-lg" variant="outline">
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
                  <SheetDescription>社区、机型库和榜单入口</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-5 pt-4">
                  <NavButtons
                    items={navItems}
                    onNavigate={() => {
                      setIsMobileNavOpen(false);
                    }}
                  />
                  <div className="site-rule" />
                  <NavButtons
                    items={utilityItems}
                    onNavigate={() => {
                      setIsMobileNavOpen(false);
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Link to={APP_ROUTES.feedHome}>
              <ShellBrand />
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 xl:flex">
            <div className="mx-auto w-full max-w-[42rem]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-12 rounded-[calc(var(--radius-control)+0.15rem)] border-border/80 bg-card/90 pl-11 shadow-[var(--shadow-soft)]"
                  placeholder={headerCopy.placeholder}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild className="max-sm:px-0" size="lg" variant="hero">
              <Link to={primaryActionTarget}>
                <PlusCircleIcon data-icon="inline-start" />
                <span className="hidden sm:inline">{headerCopy.actionLabel}</span>
              </Link>
            </Button>

            <Button asChild className="relative" size="icon-lg" variant="ghost">
              <Link to={APP_ROUTES.notifications}>
                <BellIcon />
                {unreadCount > 0 ? (
                  <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-red-500" />
                ) : null}
                <span className="sr-only">通知</span>
              </Link>
            </Button>

            <span
              aria-disabled="true"
              className={buttonVariants({
                size: "icon-lg",
                variant: "ghost",
                className: "opacity-70"
              })}
              title="消息功能即将上线"
            >
              <MailIcon />
              <span className="sr-only">消息功能即将上线</span>
            </span>

            <UserMenu />
          </div>
        </div>
      </header>

      <aside className="hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-30 xl:flex xl:w-[var(--shell-sidebar-width)]">
        <div className="flex w-full px-4 pb-6 pt-[90px]">
          <SitePanel className="flex w-full flex-col" variant="muted">
            <SitePanelBody className="flex h-full flex-col gap-4">
              <NavButtons items={navItems} />
              <div className="mt-auto">
                <div className="site-rule mb-4" />
                <NavButtons items={utilityItems} />
              </div>
            </SitePanelBody>
          </SitePanel>
        </div>
      </aside>

      <div className="px-[var(--page-pad-x)] py-6 xl:ml-[var(--shell-sidebar-width)] xl:px-8">
        <SiteShell>
          <div className="min-w-0">
            <Outlet />
          </div>
        </SiteShell>
      </div>
    </div>
  );
}
