import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { APP_ROUTES } from "@feijia/shared";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "./auth-store";
import { resolveProtectedRouteRedirect } from "./protected-route-helpers";

type ProtectedRouteProps = PropsWithChildren<{
  mode?: "login" | "fallback";
  fallbackPath?: string;
}>;

function ProfileRouteSkeleton() {
  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>个人中心</SitePageEyebrow>
        <SitePageTitle>我的飞行主页</SitePageTitle>
        <SitePageDescription>正在恢复个人资料与常用入口...</SitePageDescription>
      </SitePageHead>

      <SitePanel className="overflow-hidden">
        <Skeleton className="h-40 w-full" />
        <SitePanelBody className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_16rem]">
          <Skeleton className="-mt-10 h-24 w-24 rounded-[calc(var(--radius-panel)-0.08rem)]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
            ))}
          </div>
        </SitePanelBody>
      </SitePanel>

      <SiteGrid variant="sidebar">
        <div className="space-y-4">
          <div className="flex gap-3 border-b border-border/80 pb-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-9 w-20 rounded-full" key={index} />
            ))}
          </div>
          <Card>
            <CardContent className="space-y-4 pt-[var(--panel-padding)]">
              <Skeleton className="h-44 rounded-[calc(var(--radius-panel)-0.18rem)]" />
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        </div>

        <SiteRail>
          <Card variant="muted">
            <CardContent className="space-y-3 pt-[var(--panel-padding)]">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-16 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
              ))}
            </CardContent>
          </Card>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}

function SettingsRouteSkeleton() {
  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>设置</SitePageEyebrow>
        <SitePageTitle>账号与偏好设置</SitePageTitle>
        <SitePageDescription>正在恢复你的账号设置和通知偏好...</SitePageDescription>
      </SitePageHead>

      <SiteGrid variant="detail">
        <SiteRail>
          <Card variant="muted">
            <CardContent className="space-y-3 pt-[var(--panel-padding)]">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-14 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
              ))}
            </CardContent>
          </Card>
        </SiteRail>

        <div className="space-y-4">
          <Card variant="muted">
            <CardContent className="grid gap-3 pt-[var(--panel-padding)] md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.18rem)]" key={index} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 pt-[var(--panel-padding)]">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 rounded-[calc(var(--radius-panel)-0.18rem)]" />
              <Skeleton className="h-12 rounded-[calc(var(--radius-panel)-0.18rem)]" />
            </CardContent>
          </Card>
        </div>
      </SiteGrid>
    </SitePage>
  );
}

function NotificationsRouteSkeleton() {
  return (
    <SitePage>
      <SitePageHead>
        <SitePageEyebrow>消息中心</SitePageEyebrow>
        <SitePageTitle>站内消息与互动提醒</SitePageTitle>
        <SitePageDescription>正在恢复你的消息流和互动提醒...</SitePageDescription>
      </SitePageHead>

      <SiteGrid variant="sidebar">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} variant="muted">
                <CardContent className="space-y-3 pt-[var(--panel-padding)]">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-14" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <SitePanel key={index}>
                <SitePanelBody className="space-y-4">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-11 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3.5 w-40" />
                    </div>
                    <Skeleton className="size-10 rounded-[0.9rem]" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.2rem)]" />
                    <Skeleton className="h-20 rounded-[calc(var(--radius-panel)-0.2rem)]" />
                  </div>
                </SitePanelBody>
              </SitePanel>
            ))}
          </div>
        </div>

        <SiteRail>
          <Card variant="muted">
            <CardContent className="space-y-3 pt-[var(--panel-padding)]">
              <Skeleton className="h-10 rounded-[var(--radius-control)]" />
              <Skeleton className="h-10 rounded-[var(--radius-control)]" />
            </CardContent>
          </Card>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}

export function ProtectedRoute({
  children,
  mode = "login",
  fallbackPath = APP_ROUTES.feedHome
}: ProtectedRouteProps) {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    if (location.pathname.startsWith(APP_ROUTES.webProfile)) {
      return <ProfileRouteSkeleton />;
    }

    if (location.pathname.startsWith(APP_ROUTES.webSettings)) {
      return <SettingsRouteSkeleton />;
    }

    if (location.pathname.startsWith(APP_ROUTES.notifications)) {
      return <NotificationsRouteSkeleton />;
    }

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        正在恢复登录状态...
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        replace
        to={resolveProtectedRouteRedirect({
          location,
          mode,
          fallbackPath
        })}
      />
    );
  }

  return children;
}
