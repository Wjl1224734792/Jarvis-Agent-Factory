import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Toaster } from "sonner";
import { Suspense, lazy, useEffect, useMemo, type ReactNode } from "react";
import { ErrorBoundary } from "./components/error-boundary";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import {
  PublishAircraftPageSkeleton,
  PublishArticlePageSkeleton,
  PublishBrandPageSkeleton,
  PublishMomentPageSkeleton,
  RankingEditorPageSkeleton
} from "./components/publish-skeletons";
import { ImmersiveLayout } from "./features/auth/immersive-layout";
import { ProtectedRoute } from "./features/auth/protected-route";
import { WebLayout } from "./features/auth/web-layout";
import { queryClient } from "./lib/query-client";
import { WEB_ROUTE_PATHS, buildSafeRedirectPath, isExternalHttpUrl } from "./lib/web-routes";

const HomePage = lazy(() =>
  import("./routes/home-page").then((module) => ({
    default: module.HomePage
  }))
);
const LoginPage = lazy(() =>
  import("./features/auth/login-page").then((module) => ({
    default: module.LoginPage
  }))
);
const ProfilePage = lazy(() =>
  import("./features/auth/profile-page").then((module) => ({
    default: module.ProfilePage
  }))
);
const ModelDetailPage = lazy(() =>
  import("./routes/model-detail-page").then((module) => ({
    default: module.ModelDetailPage
  }))
);
const ModelsPage = lazy(() =>
  import("./routes/models-page").then((module) => ({
    default: module.ModelsPage
  }))
);
const ModelComparePage = lazy(() =>
  import("./routes/model-compare-page").then((module) => ({
    default: module.ModelComparePage
  }))
);
const CircleDetailPage = lazy(() =>
  import("./routes/circle-detail-page").then((module) => ({
    default: module.CircleDetailPage
  }))
);
const NotificationsPage = lazy(() =>
  import("./routes/notifications-page").then((module) => ({
    default: module.NotificationsPage
  }))
);
const PostDetailPage = lazy(() =>
  import("./routes/post-detail-page").then((module) => ({
    default: module.PostDetailPage
  }))
);
const PublishStatusPage = lazy(() =>
  import("./routes/publish-status-page").then((module) => ({
    default: module.PublishStatusPage
  }))
);
const RankingDetailPage = lazy(() =>
  import("./routes/ranking-detail-page").then((module) => ({
    default: module.RankingDetailPage
  }))
);
const RatingTargetDetailPage = lazy(() =>
  import("./routes/rating-target-detail-page").then((module) => ({
    default: module.RatingTargetDetailPage
  }))
);
const RankingsPage = lazy(() =>
  import("./routes/rankings-page").then((module) => ({
    default: module.RankingsPage
  }))
);
const SettingsPage = lazy(() =>
  import("./routes/settings-page").then((module) => ({
    default: module.SettingsPage
  }))
);
const SearchPage = lazy(() =>
  import("./routes/search-page").then((module) => ({
    default: module.SearchPage
  }))
);
const UserProfilePage = lazy(() =>
  import("./routes/user-profile-page").then((module) => ({
    default: module.UserProfilePage
  }))
);
const PublishArticlePage = lazy(() =>
  import("./routes/publish-article-page").then((module) => ({
    default: module.PublishArticlePage
  }))
);
const PublishMomentPage = lazy(() =>
  import("./routes/publish-moment-page").then((module) => ({
    default: module.PublishMomentPage
  }))
);
const PublishAircraftPage = lazy(() =>
  import("./routes/publish-aircraft-page").then((module) => ({
    default: module.PublishAircraftPage
  }))
);
const PublishBrandPage = lazy(() =>
  import("./routes/publish-brand-page").then((module) => ({
    default: module.PublishBrandPage
  }))
);
const CirclePage = lazy(() =>
  import("./routes/circle-page").then((module) => ({
    default: module.CirclePage
  }))
);
const RankingEditorPage = lazy(() =>
  import("./routes/ranking-editor-page").then((module) => ({
    default: module.RankingEditorPage
  }))
);
const SafeRedirectPage = lazy(() =>
  import("./routes/safe-redirect-page").then((module) => ({
    default: module.SafeRedirectPage
  }))
);

const HomePageRouteSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.HomePageRouteSkeleton
  }))
);
const CirclePageRouteSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.CirclePageRouteSkeleton
  }))
);
const RankingsPageRouteSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.RankingsPageRouteSkeleton
  }))
);
const ModelsPageRouteSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.ModelsPageRouteSkeleton
  }))
);
const UserProfilePageRouteSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.UserProfilePageRouteSkeleton
  }))
);
const PostDetailPageSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.PostDetailPageSkeleton
  }))
);
const ModelDetailPageSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.ModelDetailPageSkeleton
  }))
);
const RatingTargetDetailPageSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.RatingTargetDetailPageSkeleton
  }))
);
const RankingDetailPageSkeleton = lazy(() =>
  import("./components/route-skeletons").then((module) => ({
    default: module.RankingDetailPageSkeleton
  }))
);

// React Router 的子路由 path 不能带根路径前缀，这里把共享常量里的绝对路径转成相对写法。
function toRootChildPath(path: string) {
  return path.slice(1);
}

function withPublishArticleFallback(children: ReactNode) {
  return <Suspense fallback={<PublishArticlePageSkeleton />}>{children}</Suspense>;
}

function withPublishMomentFallback(children: ReactNode) {
  return <Suspense fallback={<PublishMomentPageSkeleton />}>{children}</Suspense>;
}

function withPublishAircraftFallback(children: ReactNode) {
  return <Suspense fallback={<PublishAircraftPageSkeleton />}>{children}</Suspense>;
}

function withPublishBrandFallback(children: ReactNode) {
  return <Suspense fallback={<PublishBrandPageSkeleton />}>{children}</Suspense>;
}

function withRankingEditorFallback(children: ReactNode) {
  return <Suspense fallback={<RankingEditorPageSkeleton />}>{children}</Suspense>;
}

// 通用页面兜底用于轻量页面，保持路由切换期间的基础可读性。
function withRouteFallback(children: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          页面加载中...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

// 骨架本身也走懒加载时，先用 null 避免“双层占位”造成闪烁。
function DeferredFallback(props: { children: ReactNode }) {
  return <Suspense fallback={null}>{props.children}</Suspense>;
}

function withSuspenseFallback(children: ReactNode, fallback: ReactNode) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export function App() {
  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const linkElement = target.closest("a[href]");
      if (!linkElement) {
        return;
      }
      if (linkElement.getAttribute("data-skip-safe-redirect") === "true") {
        return;
      }
      const href = linkElement.getAttribute("href");
      if (!href || typeof window === "undefined") {
        return;
      }
      if (!isExternalHttpUrl(href, window.location.origin)) {
        return;
      }
      event.preventDefault();
      const fromPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.assign(buildSafeRedirectPath(new URL(href, window.location.origin).toString(), fromPath));
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  const router = useMemo(
    () =>
      // 整个站点拆成 WebLayout 与 ImmersiveLayout 两套壳层：
      // 前者负责带导航的主站页面，后者承载详情页与发布页这类更沉浸的场景。
      createBrowserRouter([
        {
          path: APP_ROUTES.home,
          element: <WebLayout />,
          children: [
            {
              index: true,
              element: <Navigate replace to={APP_ROUTES.feedHome} />
            },
            {
              path: toRootChildPath(APP_ROUTES.feedHome),
              element: withSuspenseFallback(
                <HomePage />,
                <DeferredFallback>
                  <HomePageRouteSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.flightCircle),
              element: withSuspenseFallback(
                <CirclePage />,
                <DeferredFallback>
                  <CirclePageRouteSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.circleDetail),
              element: withSuspenseFallback(
                <CircleDetailPage />,
                <DeferredFallback>
                  <div className="flex items-center justify-center py-20">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.webLogin),
              element: withRouteFallback(<LoginPage />)
            },
            {
              path: toRootChildPath(APP_ROUTES.webProfile),
              element: withRouteFallback(
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.webSettings),
              element: withRouteFallback(
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.webUserProfile),
              element: withSuspenseFallback(
                <UserProfilePage />,
                <DeferredFallback>
                  <UserProfilePageRouteSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.notifications),
              element: withRouteFallback(
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.models),
              element: withSuspenseFallback(
                <ModelsPage />,
                <DeferredFallback>
                  <ModelsPageRouteSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.search),
              element: withRouteFallback(<SearchPage />)
            },
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.safeRedirect),
              element: withRouteFallback(<SafeRedirectPage />)
            },
            {
              path: toRootChildPath(APP_ROUTES.rankings),
              element: withSuspenseFallback(
                <RankingsPage />,
                <DeferredFallback>
                  <RankingsPageRouteSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.compose),
              element: <Navigate replace to={WEB_ROUTE_PATHS.publishArticle} />
            },
            {
              path: toRootChildPath(APP_ROUTES.modelDetail),
              element: withSuspenseFallback(
                <ModelDetailPage />,
                <DeferredFallback>
                  <ModelDetailPageSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.modelCompare),
              element: withSuspenseFallback(
                <ModelComparePage />,
                <DeferredFallback>
                  <div className="flex items-center justify-center py-20">
                    <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.rankingDetail),
              element: withSuspenseFallback(
                <RankingDetailPage />,
                <DeferredFallback>
                  <RankingDetailPageSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.ratingTargetDetail),
              element: withSuspenseFallback(
                <RatingTargetDetailPage />,
                <DeferredFallback>
                  <RatingTargetDetailPageSkeleton />
                </DeferredFallback>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.postDetail),
              element: withSuspenseFallback(
                <PostDetailPage />,
                <DeferredFallback>
                  <PostDetailPageSkeleton />
                </DeferredFallback>
              )
            },
            // 主站兜底统一回到首页 feed，避免落入空白页。
            {
              path: "*",
              element: <Navigate replace to={APP_ROUTES.feedHome} />
            }
          ]
        },
        {
          path: APP_ROUTES.home,
          element: <ImmersiveLayout />,
          children: [
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.publishArticle),
              // 发布链路必须登录，但这里使用 fallback 模式，避免把用户带回登录页后丢失上下文。
              element: withPublishArticleFallback(
                <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
                  <PublishArticlePage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.publishMoment),
              element: withPublishMomentFallback(
                <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
                  <PublishMomentPage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.publishAircraft),
              element: withPublishAircraftFallback(
                <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
                  <PublishAircraftPage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.publishBrand),
              element: withPublishBrandFallback(
                <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
                  <PublishBrandPage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(APP_ROUTES.rankingEditor),
              element: withRankingEditorFallback(
                <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
                  <RankingEditorPage />
                </ProtectedRoute>
              )
            },
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.publishStatus),
              element: withRouteFallback(<PublishStatusPage />)
            },
            {
              path: toRootChildPath(WEB_ROUTE_PATHS.safeRedirect),
              element: withRouteFallback(<SafeRedirectPage />)
            }
          ]
        }
      ]),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
