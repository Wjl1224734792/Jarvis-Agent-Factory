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
import { useAuthStore } from "./auth-store";
import { AuthRequiredDialog } from "./auth-required-dialog";
import { useLoginPrompt } from "./use-login-prompt";
import { useBootstrapAuth } from "./use-bootstrap-auth";
import { UserMenu } from "./user-menu";

const navItems = [
  { to: APP_ROUTES.feedHome, label: "Home", icon: HouseIcon },
  { to: APP_ROUTES.flightCircle, label: "Circle", icon: CompassIcon },
  { to: APP_ROUTES.models, label: "Models", icon: LibraryBigIcon },
  { to: APP_ROUTES.rankings, label: "Rankings", icon: TrophyIcon }
] as const;

const publishEntries = [
  { to: WEB_ROUTE_PATHS.publishArticle, label: "Article" },
  { to: WEB_ROUTE_PATHS.publishMoment, label: "Moment" },
  { to: WEB_ROUTE_PATHS.publishAircraft, label: "Aircraft" },
  { to: APP_ROUTES.rankingEditor, label: "Ranking" }
] as const;

function getHeaderCopy(pathname: string) {
  if (pathname.startsWith(APP_ROUTES.webProfile)) {
    return "Search profile highlights, saved notes, or draft sections...";
  }

  if (pathname.startsWith(APP_ROUTES.webSettings)) {
    return "Search privacy, alert routing, or security options...";
  }

  if (pathname.startsWith(APP_ROUTES.notifications)) {
    return "Search alert activity, mentions, or follow updates...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishArticle)) {
    return "Search article titles, sections, or writing notes...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishMoment)) {
    return "Search moments, sortie notes, or quick updates...";
  }

  if (pathname.startsWith(WEB_ROUTE_PATHS.publishAircraft)) {
    return "Search aircraft names, brands, or technical details...";
  }

  if (pathname.startsWith(APP_ROUTES.rankings)) {
    return "Search rankings, entries, or score summaries...";
  }

  if (pathname.startsWith(APP_ROUTES.models)) {
    return "Search models, brands, or review signals...";
  }

  return "Search routes, pilots, aircraft, or editorial notes...";
}

function ShellBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[calc(var(--radius-control)-0.05rem)] bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-float)]">
        FJ
      </div>
      <div className="min-w-0">
        <div className="text-[1.32rem] font-semibold tracking-[-0.04em] text-primary">{APP_NAME}</div>
        <div className="text-[0.58rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
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
                  className: "w-full justify-start px-3"
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
  const promptLogin = useLoginPrompt();
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
    <div className="min-h-screen" style={{ ["--shell-sidebar-width" as string]: "224px" }}>
      <header className="sticky top-0 z-40 border-b border-border/75 bg-background/92 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 xl:px-5">
          <div className="flex items-center gap-3">
            <Sheet onOpenChange={setIsMobileNavOpen} open={isMobileNavOpen}>
              <SheetTrigger asChild>
                <Button className="xl:hidden" size="icon-lg" variant="outline">
                  <MenuIcon />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                className="w-[88vw] max-w-sm border-r border-border/80 bg-background/96"
                side="left"
              >
                <SheetHeader className="px-0">
                  <SheetTitle>{APP_NAME}</SheetTitle>
                  <SheetDescription>
                    Main navigation for home, circle, models, rankings, and personal pages.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-5 pt-4">
                  <NavButtons
                    items={navItems}
                    onNavigate={() => {
                      setIsMobileNavOpen(false);
                    }}
                  />
                  {authStatus === "authenticated" ? (
                    <div className="rounded-[calc(var(--radius-control)+0.1rem)] border border-border/80 bg-surface-2/72 p-2">
                      <div className="px-3 pb-2 pt-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Personal
                      </div>
                      <div className="flex flex-col gap-1">
                        {[
                          { to: APP_ROUTES.notifications, label: "Alerts" },
                          { to: APP_ROUTES.webProfile, label: "Profile" },
                          { to: APP_ROUTES.webSettings, label: "Settings" }
                        ].map((entry) => (
                          <Link
                            className="flex h-10 items-center rounded-[calc(var(--radius-control)-0.08rem)] px-3 text-sm font-medium text-foreground/78 transition hover:bg-accent/72 hover:text-foreground"
                            key={entry.to}
                            onClick={() => {
                              setIsMobileNavOpen(false);
                            }}
                            to={entry.to}
                          >
                            {entry.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>

            <Link to={APP_ROUTES.feedHome}>
              <ShellBrand />
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 xl:flex">
            <div className="mx-auto w-full max-w-[39rem]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="rounded-[calc(var(--radius-control)-0.05rem)] border-border/80 bg-card/90 pl-10 shadow-[var(--shadow-soft)]"
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
                className="min-w-[6.2rem] justify-center rounded-full px-4.5 text-[0.82rem] font-semibold max-sm:min-w-[4.4rem]"
                onClick={() => {
                  if (authStatus !== "authenticated") {
                    promptLogin({
                      title: "Log in to publish",
                      description:
                        "Publishing articles, moments, aircraft, and rankings requires an authenticated session."
                    });
                    return;
                  }

                  setIsPublishMenuOpen((value) => !value);
                }}
                size="default"
                type="button"
                variant="hero"
              >
                Publish
              </Button>

              {isPublishMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-[10rem] rounded-[0.95rem] border border-border/70 bg-background/96 p-1.5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)] backdrop-blur"
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
                              title: "Log in to publish",
                              description:
                                "Publishing articles, moments, aircraft, and rankings requires an authenticated session."
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
        <div className="flex w-full px-4 pb-5 pt-[78px]">
          <SitePanel className="flex w-full flex-col" variant="muted">
            <SitePanelBody className="flex h-full flex-col gap-3">
              <NavButtons items={navItems} />
            </SitePanelBody>
          </SitePanel>
        </div>
      </aside>

      <div className="px-[var(--page-pad-x)] py-5 xl:ml-[var(--shell-sidebar-width)] xl:px-6">
        <SiteShell>
          <div className="min-w-0">
            <Outlet />
          </div>
        </SiteShell>
      </div>
      <AuthRequiredDialog />
    </div>
  );
}
