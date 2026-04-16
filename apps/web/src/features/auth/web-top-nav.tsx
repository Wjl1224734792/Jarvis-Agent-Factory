import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logoUrl from "../../../../../packages/shared/assets/logo/logo.jpg";
import { SitePanel, SitePanelBody } from "../../components/site-shell";
import { UserAvatar } from "../../components/ui/user-avatar";
import { Button, buttonVariants } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  buildSearchLocation,
  shouldShowCompactSearchBar
} from "../../lib/search-navigation";
import { getAvatarImage } from "../../lib/aviation-media";
import { cn } from "../../lib/utils";
import { WEB_ROUTE_PATHS } from "../../lib/web-routes";
import { useAuthStore } from "./auth-store";
import { shouldFetchNotifications } from "./notification-state";
import { useNotifications } from "./use-notifications";
import { UserMenu } from "./user-menu";
import { WebBottomNav } from "./web-bottom-nav";
import { webMainNavItems, webSidebarMemberNavItems } from "./web-nav-config";
import { WebPublishFab } from "./web-publish-fab";

export function shouldRenderTopNavSearch(showSearch: boolean) {
  return showSearch;
}

export function getTopNavSearchSlots({
  compactSearch,
  showSearch
}: {
  compactSearch: boolean;
  showSearch: boolean;
}) {
  return {
    desktopSearch: showSearch,
    mobileCompactSearch: showSearch && compactSearch,
    mobileSearchButton: showSearch && !compactSearch
  };
}

export function getTopNavUserProfileLabel() {
  return "\u81ea\u5df1";
}

export function getTopNavUserProfileRoute() {
  return APP_ROUTES.webProfile;
}

export function shouldShowImmersiveTopNavSearch(pathname: string) {
  if (pathname.startsWith(WEB_ROUTE_PATHS.publishArticle)) {
    return false;
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishMoment)) {
    return false;
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishAircraft)) {
    return false;
  }

  if (pathname.startsWith(APP_ROUTES.publishBrand)) {
    return false;
  }

  if (pathname.startsWith(APP_ROUTES.rankingEditor)) {
    return false;
  }

  return !pathname.startsWith("/publish/status/");
}

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
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-primary/12 bg-white shadow-[var(--shadow-soft)] xl:h-10 xl:w-10 xl:rounded-[1rem] xl:border-primary/15 xl:shadow-[var(--shadow-float)]">
      <img alt={`${APP_NAME} logo`} className="h-full w-full object-cover" src={logoUrl} />
    </div>
  );
}

function NavButtons({
  items,
  collapsed
}: {
  items: readonly { to: string; label: string; icon: LucideIcon }[];
  collapsed: boolean;
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            className={({ isActive }) =>
              cn(
                buttonVariants({
                  size: "default",
                  variant: "nav",
                  className: collapsed ? "w-full justify-center px-0" : "w-full justify-start px-3"
                }),
                isActive && "bg-primary/10 text-primary shadow-[var(--shadow-soft)]"
              )
            }
            key={item.to}
            to={item.to}
          >
            <span className="relative inline-flex">
              <Icon className="size-4.5" />
            </span>
            {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function WebTopNav({
  showSearch = true,
  showSidebar = true,
  sidebarCollapsed = false,
  onSidebarCollapsedChange
}: {
  showSearch?: boolean;
  showSidebar?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const authUser = useAuthStore((state) => state.user);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const [searchValue, setSearchValue] = useState("");
  const headerPlaceholder = getHeaderCopy(location.pathname);
  const notificationsQuery = useNotifications(
    authUserId,
    shouldFetchNotifications(authStatus, isAuthBootstrapped)
  );
  const unreadNotifications = notificationsQuery.data?.unreadCount ?? 0;
  const compactSearch = shouldShowCompactSearchBar(location.pathname);
  const searchSlots = getTopNavSearchSlots({ compactSearch, showSearch });

  useEffect(() => {
    if (!shouldRenderTopNavSearch(showSearch)) {
      setSearchValue("");
      return;
    }

    const currentQuery =
      location.pathname === APP_ROUTES.search
        ? new URLSearchParams(location.search).get("q") ?? ""
        : "";
    setSearchValue(currentQuery);
  }, [location.pathname, location.search, showSearch]);

  function submitSearch(rawValue: string) {
    if (!shouldRenderTopNavSearch(showSearch)) {
      return;
    }

    void navigate(buildSearchLocation(rawValue));
  }

  function setCollapsed(next: boolean) {
    onSidebarCollapsedChange?.(next);
  }

  const showMobileMessages =
    authStatus === "authenticated" && (searchSlots.mobileCompactSearch || searchSlots.mobileSearchButton);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/92 backdrop-blur-xl">
        <div className="flex h-14 w-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 xl:gap-4 xl:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 xl:min-w-0 xl:flex-none xl:gap-3">
            {searchSlots.mobileCompactSearch ? (
              <>
                <form
                  className="relative min-w-0 flex-1 xl:hidden"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch(searchValue);
                  }}
                >
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
                  <Input
                    aria-label="全文搜索"
                    className="h-9 rounded-[var(--radius-control)] border-border/50 bg-card/75 pl-9 text-[0.8rem] shadow-none placeholder:text-muted-foreground/65"
                    onChange={(event) => {
                      setSearchValue(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitSearch(searchValue);
                      }
                    }}
                    placeholder="搜索站内内容..."
                    value={searchValue}
                  />
                </form>
                <Link
                  className="hidden min-w-0 rounded-lg outline-offset-2 focus-visible:ring-2 focus-visible:ring-primary/25 xl:block"
                  to={APP_ROUTES.feedHome}
                >
                  <ShellBrand />
                </Link>
              </>
            ) : (
              <Link
                className="min-w-0 rounded-lg outline-offset-2 focus-visible:ring-2 focus-visible:ring-primary/25"
                to={APP_ROUTES.feedHome}
              >
                <ShellBrand />
              </Link>
            )}
          </div>

          {searchSlots.desktopSearch ? (
            <div className="hidden min-w-0 flex-1 justify-center px-2 xl:flex">
              <div className="w-full max-w-[39rem]">
                <form
                  className="relative"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch(searchValue);
                  }}
                >
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
                  <Input
                    aria-label="全文搜索"
                    className="h-9 rounded-[var(--radius-control)] border-border/50 bg-card/60 pl-9 text-[0.8rem] shadow-none placeholder:text-muted-foreground/65"
                    onChange={(event) => {
                      setSearchValue(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitSearch(searchValue);
                      }
                    }}
                    placeholder={headerPlaceholder}
                    value={searchValue}
                  />
                </form>
              </div>
            </div>
          ) : null}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {searchSlots.mobileSearchButton ? (
              <Button
                className="text-muted-foreground hover:bg-accent/60 hover:text-foreground xl:hidden"
                onClick={() => {
                  submitSearch(searchValue);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <SearchIcon className="size-4.5" />
                <span className="sr-only">打开全文搜索</span>
              </Button>
            ) : null}

            {showMobileMessages ? (
              <Link
                aria-label={
                  unreadNotifications > 0 ? `消息，${unreadNotifications} 条未读` : "消息"
                }
                className={cn(
                  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent/55 hover:text-foreground xl:hidden",
                  unreadNotifications > 0 && "text-red-500 hover:text-red-600"
                )}
                to={APP_ROUTES.notifications}
              >
                <BellIcon className={cn("size-[1.35rem]", unreadNotifications > 0 && "text-red-500")} />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold leading-none text-white ring-2 ring-background">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <UserMenu />
          </div>
        </div>
      </header>

      {showSidebar ? (
        <aside className="hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-30 xl:flex xl:w-[var(--shell-sidebar-width)]">
          <div className="flex w-full px-3 pb-5 pt-[calc(3.5rem+0.75rem)] sm:px-4">
            <SitePanel className="flex w-full min-h-0 flex-1 flex-col" variant="muted">
              <SitePanelBody className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <NavButtons collapsed={sidebarCollapsed} items={webMainNavItems} />
                  {authStatus === "authenticated" ? (
                    <>
                      <div className="site-rule my-3" />
                      <div className="space-y-2">
                        {!sidebarCollapsed ? (
                          <div className="px-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            我的
                          </div>
                        ) : (
                          <span className="sr-only">我的</span>
                        )}
                        <NavButtons collapsed={sidebarCollapsed} items={webSidebarMemberNavItems} />
                      </div>
                    </>
                  ) : null}
                </div>

                {authStatus === "authenticated" && authUser ? (
                  <div className="mt-auto flex flex-col gap-2 border-t border-border/40 pt-3">
                    <Link
                      className={cn(
                        "flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-[0.82rem] font-medium text-foreground transition hover:bg-accent/50",
                        sidebarCollapsed && "justify-center px-0"
                      )}
                      title={authUser.displayName}
                      to={APP_ROUTES.webProfile}
                    >
                      <UserAvatar
                        className="size-9 shrink-0"
                        displayName={authUser.displayName}
                        size="default"
                        src={authUser.avatarUrl?.trim() ? authUser.avatarUrl : getAvatarImage(authUser.id)}
                      />
                      {sidebarCollapsed ? (
                        <span className="sr-only">个人主页</span>
                      ) : (
                        <span className="min-w-0 flex-1 truncate">{authUser.displayName}</span>
                      )}
                    </Link>

                    <Button
                      className={cn(
                        "w-full gap-2 border-border/60",
                        sidebarCollapsed && "justify-center px-0"
                      )}
                      onClick={() => {
                        setCollapsed(!sidebarCollapsed);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {sidebarCollapsed ? (
                        <PanelLeftOpenIcon className="size-4" />
                      ) : (
                        <PanelLeftCloseIcon className="size-4" />
                      )}
                      {sidebarCollapsed ? (
                        <span className="sr-only">展开侧栏</span>
                      ) : (
                        <span>收起侧栏</span>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-auto border-t border-border/40 pt-3">
                    <Button
                      className={cn("w-full gap-2 border-border/60", sidebarCollapsed && "justify-center px-0")}
                      onClick={() => {
                        setCollapsed(!sidebarCollapsed);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {sidebarCollapsed ? (
                        <PanelLeftOpenIcon className="size-4" />
                      ) : (
                        <PanelLeftCloseIcon className="size-4" />
                      )}
                      {sidebarCollapsed ? (
                        <span className="sr-only">展开侧栏</span>
                      ) : (
                        <span>收起侧栏</span>
                      )}
                    </Button>
                  </div>
                )}
              </SitePanelBody>
            </SitePanel>
          </div>
        </aside>
      ) : null}

      <WebBottomNav />
      <WebPublishFab />
    </>
  );
}
