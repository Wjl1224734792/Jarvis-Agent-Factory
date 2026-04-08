import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import logoUrl from "../../../../../packages/shared/assets/logo/logo.jpg";
import {
  BellIcon,
  CircleUserRoundIcon,
  HouseIcon,
  MenuIcon,
  MessagesSquareIcon,
  PlaneIcon,
  SearchIcon,
  Settings2Icon,
  TrophyIcon,
  XIcon
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { SitePanel, SitePanelBody, SiteShell } from "@/components/site-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { WEB_ROUTE_PATHS } from "@/lib/web-routes";
import { useAuthStore } from "./auth-store";
import { AuthRequiredDialog } from "./auth-required-dialog";
import { useLoginPrompt } from "./use-login-prompt";
import { shouldFetchNotifications } from "./notification-state";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { useNotifications } from "./use-notifications";
import { UserMenu } from "./user-menu";

const navItems = [
  { to: APP_ROUTES.feedHome, label: "首页", icon: HouseIcon },
  { to: APP_ROUTES.flightCircle, label: "飞友圈", icon: MessagesSquareIcon },
  { to: APP_ROUTES.models, label: "飞行器", icon: PlaneIcon },
  { to: APP_ROUTES.rankings, label: "榜单", icon: TrophyIcon }
] as const;

const memberNavItems = [
  { to: APP_ROUTES.notifications, label: "消息", icon: BellIcon },
  { to: APP_ROUTES.webProfile, label: "个人中心", icon: CircleUserRoundIcon },
  { to: APP_ROUTES.webSettings, label: "设置", icon: Settings2Icon }
] as const;

const publishEntries = [
  { to: WEB_ROUTE_PATHS.publishArticle, label: "发布文章" },
  { to: WEB_ROUTE_PATHS.publishMoment, label: "发布动态" },
  { to: WEB_ROUTE_PATHS.publishAircraft, label: "发布飞行器" },
  { to: APP_ROUTES.publishBrand, label: "申请品牌" },
  { to: APP_ROUTES.rankingEditor, label: "创建榜单" }
] as const;

function getHeaderCopy(pathname: string) {
  if (pathname.startsWith(APP_ROUTES.webProfile)) {
    return "搜索个人动态、收藏内容或常用入口...";
  }

  if (pathname.startsWith(APP_ROUTES.webSettings)) {
    return "搜索隐私设置、通知偏好或安全选项...";
  }

  if (pathname.startsWith(APP_ROUTES.notifications)) {
    return "搜索消息类型、互动提醒或评论通知...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishArticle)) {
    return "搜索文章标题、栏目或写作备注...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishMoment)) {
    return "搜索动态内容、飞行记录或近况更新...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishAircraft)) {
    return "搜索机型名称、品牌或参数细节...";
  }

  if (pathname.startsWith(APP_ROUTES.rankings)) {
    return "搜索榜单、条目或评分摘要...";
  }

  if (pathname.startsWith(APP_ROUTES.models)) {
    return "搜索机型、品牌或评测信号...";
  }

  return "搜索航线、飞友、飞行器或站内内容...";
}

function ShellBrand() {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-primary/12 bg-white shadow-[var(--shadow-soft)] xl:h-10 xl:w-10 xl:rounded-[1rem] xl:border-primary/15 xl:shadow-[var(--shadow-float)]">
        <img alt={`${APP_NAME} logo`} className="h-full w-full object-cover" src={logoUrl} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[0.82rem] font-semibold leading-tight tracking-tight text-primary xl:text-[0.9rem] xl:tracking-[0.08em]">
          飞友与飞行器社区
        </div>
      </div>
    </div>
  );
}

function NavButtons({
  items,
  onNavigate,
  unreadNotifications
}: {
  items: readonly { to: string; label: string; icon: typeof HouseIcon }[];
  onNavigate?: () => void;
  unreadNotifications?: number;
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const hasUnread = item.to === APP_ROUTES.notifications && (unreadNotifications ?? 0) > 0;

        return (
          <NavLink
            className={({ isActive }) =>
              cn(
                buttonVariants({
                  size: "default",
                  variant: "nav",
                  className: "w-full justify-start px-3"
                }),
                isActive && "bg-primary/10 text-primary shadow-[var(--shadow-soft)]",
                hasUnread && "text-red-500 hover:text-red-600"
              )
            }
            key={item.to}
            onClick={onNavigate}
            to={item.to}
          >
            <span className="relative inline-flex">
              <Icon className={cn("size-4.5", hasUnread && "text-red-500")} />
              {hasUnread ? <span className="absolute -right-1 -top-1 size-2 rounded-full bg-red-500" /> : null}
            </span>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function MobileSheetNavSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-2 pt-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/85 first:pt-3">
      {children}
    </div>
  );
}

function MobileSheetNavRows({
  items,
  onNavigate,
  unreadNotifications
}: {
  items: readonly { to: string; label: string; icon: typeof HouseIcon }[];
  onNavigate?: () => void;
  unreadNotifications?: number;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-3 pb-1">
      {items.map((item) => {
        const Icon = item.icon;
        const hasUnread = item.to === APP_ROUTES.notifications && (unreadNotifications ?? 0) > 0;

        return (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[0.9rem] font-medium tracking-tight transition-colors",
                isActive
                  ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_oklch(0.57_0.164_251.2/0.22)]"
                  : "text-foreground/82 hover:bg-sidebar-accent/90 hover:text-foreground",
                hasUnread && !isActive && "text-foreground/90"
              )
            }
            key={item.to}
            onClick={onNavigate}
            to={item.to}
          >
            <span className="relative inline-flex shrink-0">
              <Icon className={cn("size-5", hasUnread && "text-red-500")} />
              {hasUnread ? (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">{item.label}</span>
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
  const isAuthBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const promptLogin = useLoginPrompt();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isPublishMenuOpen, setIsPublishMenuOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerPlaceholder = getHeaderCopy(location.pathname);
  const notificationsQuery = useNotifications(
    shouldFetchNotifications(authStatus, isAuthBootstrapped)
  );
  const unreadNotifications = notificationsQuery.data?.unreadCount ?? 0;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function openPublishMenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsPublishMenuOpen(true);
  }

  function scheduleClosePublishMenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setIsPublishMenuOpen(false);
      closeTimerRef.current = null;
    }, 160);
  }

  return (
    <div className="min-h-screen" style={{ ["--shell-sidebar-width" as string]: "224px" }}>
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/92 backdrop-blur-xl">
        <div className="flex h-14 w-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 xl:gap-4 xl:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 xl:min-w-0 xl:flex-none xl:gap-3">
            <Sheet onOpenChange={setIsMobileNavOpen} open={isMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  className="shrink-0 text-muted-foreground hover:bg-accent/60 hover:text-foreground xl:hidden"
                  size="icon-lg"
                  type="button"
                  variant="ghost"
                >
                  <MenuIcon className="size-[1.35rem]" />
                  <span className="sr-only">打开导航</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                className="flex h-full w-[min(92vw,20.5rem)] flex-col gap-0 border-r border-sidebar-border bg-sidebar p-0 shadow-[0_0_0_1px_oklch(0.89_0.012_242.8/0.5),12px_0_48px_-28px_rgba(15,23,42,0.2)]"
                showCloseButton={false}
                side="left"
              >
                <SheetHeader className="gap-0 border-b border-sidebar-border/90 bg-gradient-to-br from-primary/[0.07] via-sidebar to-sidebar p-0">
                  <div className="flex items-start gap-3 px-4 pb-4 pt-5">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-primary/18 bg-white shadow-[var(--shadow-soft)]">
                      <img alt={`${APP_NAME} logo`} className="h-full w-full object-cover" src={logoUrl} />
                    </div>
                    <div className="min-w-0 flex-1 pr-2 pt-0.5">
                      <SheetTitle className="text-left text-lg font-semibold tracking-tight text-sidebar-foreground">
                        {APP_NAME}
                      </SheetTitle>
                      <p className="mt-1 text-[0.72rem] leading-snug text-muted-foreground">
                        飞友圈 · 机型库 · 榜单 · 个人中心
                      </p>
                    </div>
                    <SheetClose asChild>
                      <Button
                        className="mt-0.5 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <XIcon className="size-4" />
                        <span className="sr-only">关闭导航</span>
                      </Button>
                    </SheetClose>
                  </div>
                  <SheetDescription className="sr-only">
                    首页、飞友圈、飞行器、榜单与个人入口
                  </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                  <MobileSheetNavSectionTitle>浏览</MobileSheetNavSectionTitle>
                  <MobileSheetNavRows
                    items={navItems}
                    onNavigate={() => {
                      setIsMobileNavOpen(false);
                    }}
                  />
                  {authStatus === "authenticated" ? (
                    <>
                      <div className="mx-4 my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                      <MobileSheetNavSectionTitle>我的</MobileSheetNavSectionTitle>
                      <MobileSheetNavRows
                        items={memberNavItems}
                        onNavigate={() => {
                          setIsMobileNavOpen(false);
                        }}
                        unreadNotifications={unreadNotifications}
                      />
                    </>
                  ) : null}
                </div>

                <div className="border-t border-sidebar-border/80 bg-surface-1/90 px-4 py-3">
                  <p className="text-center text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground">
                    飞友与飞行器社区
                  </p>
                </div>
              </SheetContent>
            </Sheet>

            <Link className="min-w-0 rounded-lg outline-offset-2 focus-visible:ring-2 focus-visible:ring-primary/25" to={APP_ROUTES.feedHome}>
              <ShellBrand />
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center px-2 xl:flex">
            <div className="w-full max-w-[39rem]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
                <Input
                  className="h-9 rounded-[var(--radius-control)] border-border/50 bg-card/60 pl-9 text-[0.8rem] shadow-none placeholder:text-muted-foreground/65"
                  placeholder={headerPlaceholder}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="relative" onMouseEnter={openPublishMenu} onMouseLeave={scheduleClosePublishMenu}>
              <Button
                className="h-9 min-w-[4.75rem] justify-center rounded-full px-3.5 text-[0.8rem] font-semibold sm:min-w-[5.25rem]"
                onClick={() => {
                  if (authStatus !== "authenticated") {
                    promptLogin({
                      title: "登录后才能发布",
                      description: "发布文章、动态、飞行器和榜单前请先登录。"
                    });
                    return;
                  }

                  setIsPublishMenuOpen((value) => !value);
                }}
                size="sm"
                type="button"
                variant="hero"
              >
                发布
              </Button>

              {isPublishMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-[10rem] rounded-[0.95rem] bg-background/96 p-1.5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)] backdrop-blur"
                  onMouseEnter={openPublishMenu}
                  onMouseLeave={scheduleClosePublishMenu}
                >
                  <div className="space-y-0.5">
                    {publishEntries.map((entry) => (
                      <Link
                        className="flex h-8 items-center justify-center rounded-[0.8rem] px-3 text-center text-[0.82rem] font-medium text-foreground/84 transition hover:bg-secondary/55 hover:text-foreground"
                        key={entry.to}
                        onClick={(event) => {
                          if (authStatus !== "authenticated") {
                            event.preventDefault();
                            promptLogin({
                              title: "登录后才能发布",
                              description: "发布文章、动态、飞行器和榜单前请先登录。"
                            });
                            return;
                          }

                          setIsPublishMenuOpen(false);
                        }}
                        to={entry.to}
                      >
                        <span className="truncate">{entry.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <UserMenu />
          </div>
        </div>
      </header>

      <aside className="hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-30 xl:flex xl:w-[var(--shell-sidebar-width)]">
        <div className="flex w-full px-4 pb-5 pt-[calc(3.5rem+0.75rem)]">
          <SitePanel className="flex w-full flex-col" variant="muted">
            <SitePanelBody className="flex h-full flex-col gap-3">
              <NavButtons items={navItems} />
              {authStatus === "authenticated" ? (
                <>
                  <div className="site-rule" />
                  <div className="space-y-2">
                    <div className="px-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      我的
                    </div>
                    <NavButtons items={memberNavItems} unreadNotifications={unreadNotifications} />
                  </div>
                </>
              ) : null}
            </SitePanelBody>
          </SitePanel>
        </div>
      </aside>

      <div className="px-[var(--page-pad-x)] py-5 xl:ml-[var(--shell-sidebar-width)] xl:px-6">
        <SiteShell>
          <div className="min-w-0">
            <Outlet />
            <ScrollRestoration />
          </div>
        </SiteShell>
      </div>
      <AuthRequiredDialog />
    </div>
  );
}
