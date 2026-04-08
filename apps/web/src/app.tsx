import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Suspense, lazy, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { PublishFormSkeleton } from "./components/page-skeletons";
import { ProtectedRoute } from "./features/auth/protected-route";
import { WebLayout } from "./features/auth/web-layout";
import { queryClient } from "./lib/query-client";
import { WEB_ROUTE_PATHS } from "./lib/web-routes";
import { HomePage } from "./routes/home-page";

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

function toRootChildPath(path: string) {
  return path.slice(1);
}

// 发布类页面体积较大且访问频率低于主 feed，因此统一复用同一套懒加载骨架屏。
function withPublishFallback(children: ReactNode) {
  return <Suspense fallback={<PublishFormSkeleton />}>{children}</Suspense>;
}

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

// Web 端路由把“公共浏览”和“需登录的个人区”放在同一个壳层里，靠 ProtectedRoute 做权限切分。
const router = createBrowserRouter([
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
        element: <HomePage />
      },
      {
        path: toRootChildPath(APP_ROUTES.flightCircle),
        element: withRouteFallback(<CirclePage />)
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
        element: withRouteFallback(<UserProfilePage />)
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
        element: withRouteFallback(<ModelsPage />)
      },
      {
        path: toRootChildPath(APP_ROUTES.modelDetail),
        element: withRouteFallback(<ModelDetailPage />)
      },
      {
        path: toRootChildPath(APP_ROUTES.rankings),
        element: withRouteFallback(<RankingsPage />)
      },
      {
        path: toRootChildPath(APP_ROUTES.rankingEditor),
        element: withPublishFallback(
          <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
            <RankingEditorPage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.rankingDetail),
        element: withRouteFallback(<RankingDetailPage />)
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.ratingTargetDetail),
        element: withRouteFallback(<RatingTargetDetailPage />)
      },
      {
        path: toRootChildPath(APP_ROUTES.postDetail),
        element: withRouteFallback(<PostDetailPage />)
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishArticle),
        element: withPublishFallback(
          <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
            <PublishArticlePage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishMoment),
        element: withPublishFallback(
          <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
            <PublishMomentPage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishAircraft),
        element: withPublishFallback(
          <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
            <PublishAircraftPage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(APP_ROUTES.publishBrand),
        element: withPublishFallback(
          <ProtectedRoute fallbackPath={APP_ROUTES.feedHome} mode="fallback">
            <PublishBrandPage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishStatus),
        element: withRouteFallback(<PublishStatusPage />)
      },
      {
        path: toRootChildPath(APP_ROUTES.compose),
        element: <Navigate replace to={WEB_ROUTE_PATHS.publishArticle} />
      },
      {
        path: "*",
        element: <Navigate replace to={APP_ROUTES.feedHome} />
      }
    ]
  }
]);

export function App() {
  return (
    // QueryClient 放在路由外层，保证跨页面切换时缓存和鉴权态能复用。
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
