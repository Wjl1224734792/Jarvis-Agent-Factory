import { APP_NAME, APP_ROUTES } from "@feijia/shared";
import {
  CompassIcon,
  HouseIcon,
  LibraryBigIcon,
  MenuIcon,
  SearchIcon,
  TrophyIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { WEB_ROUTE_PATHS } from "@/lib/web-routes";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { UserMenu } from "./user-menu";

const navItems = [
  { to: APP_ROUTES.feedHome, label: "首页", icon: HouseIcon },
  { to: APP_ROUTES.flightCircle, label: "飞友圈", icon: CompassIcon },
  { to: APP_ROUTES.models, label: "飞行器库", icon: LibraryBigIcon },
  { to: APP_ROUTES.rankings, label: "榜单", icon: TrophyIcon }
] as const;

const publishEntries = [
  { to: WEB_ROUTE_PATHS.publishArticle, label: "发布文章" },
  { to: WEB_ROUTE_PATHS.publishMoment, label: "发布动态" },
  { to: WEB_ROUTE_PATHS.publishAircraft, label: "发布飞行器" },
  { to: APP_ROUTES.rankingEditor, label: "创建榜单" }
] as const;

function getHeaderCopy(pathname: string) {
  if (pathname.startsWith(WEB_ROUTE_PATHS.publishArticle)) {
    return "搜索文章标题、栏目或关键词...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishMoment)) {
    return "搜索动态、飞行记录或作者...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishAircraft)) {
    return "搜索机型、品牌或参数字段...";
  }

  if (pathname.startsWith(APP_ROUTES.rankings)) {
    return "搜索榜单、条目或点评...";
  }

  if (pathname.startsWith(APP_ROUTES.models)) {
    return "搜索机型、品牌或评分...";
  }

  return "搜索无人机、航拍地、飞友或机型...";
}

function ShellBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[calc(var(--radius-control)-0.05rem)] bg-primary text-base font-semibold text-primary-foreground shadow-[var(--shadow-float)]">
        飞
      </div>
      <div className="min-w-0">
        <div className="text-[1.45rem] font-semibold tracking-[-0.04em] text-primary">{APP_NAME}</div>
        <div className="text-[0.64rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isPublishMenuOpen, setIsPublishMenuOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerPlaceholder = getHeaderCopy(location.pathname);

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
    <div className="min-h-screen" style={{ ["--shell-sidebar-width" as string]: "242px" }}>
      <header className="sticky top-0 z-40 border-b border-border/75 bg-background/92 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3 xl:px-6">
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
                  <SheetDescription>首页、飞友圈、飞行器库和榜单入口</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-5 pt-4">
                  <NavButtons
                    items={navItems}
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
                  className="h-10 rounded-[calc(var(--radius-control)-0.05rem)] border-border/80 bg-card/90 pl-11 shadow-[var(--shadow-soft)]"
                  placeholder={headerPlaceholder}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="relative"
              onMouseEnter={openPublishMenu}
              onMouseLeave={scheduleClosePublishMenu}
            >
              <Button
                className="min-w-[6.8rem] justify-center rounded-full px-5 text-sm font-semibold max-sm:min-w-[4.6rem]"
                onClick={() => {
                  setIsPublishMenuOpen((value) => !value);
                }}
                size="lg"
                type="button"
                variant="hero"
              >
                发布
              </Button>

              {isPublishMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-[12.5rem] rounded-[1.1rem] border border-border/70 bg-background/96 p-1.5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)] backdrop-blur"
                  onMouseEnter={openPublishMenu}
                  onMouseLeave={scheduleClosePublishMenu}
                >
                  <div className="space-y-0.5">
                    {publishEntries.map((entry) => (
                      <Link
                        className="flex h-10 items-center rounded-[0.85rem] px-3.5 text-left text-sm font-medium text-foreground/84 transition hover:bg-secondary/55 hover:text-foreground"
                        key={entry.to}
                        onClick={() => {
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
        <div className="flex w-full px-4 pb-6 pt-[90px]">
          <SitePanel className="flex w-full flex-col" variant="muted">
            <SitePanelBody className="flex h-full flex-col gap-4">
              <NavButtons items={navItems} />
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
