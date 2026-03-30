import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { Suspense, lazy, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { PublishFormSkeleton } from "./components/page-skeletons";
import { LoginPage } from "./features/auth/login-page";
import { ProfilePage } from "./features/auth/profile-page";
import { ProtectedRoute } from "./features/auth/protected-route";
import { WebLayout } from "./features/auth/web-layout";
import { queryClient } from "./lib/query-client";
import { WEB_ROUTE_PATHS } from "./lib/web-routes";
import { CirclePage } from "./routes/circle-page";
import { HomePage } from "./routes/home-page";
import { ModelDetailPage } from "./routes/model-detail-page";
import { ModelsPage } from "./routes/models-page";
import { NotificationsPage } from "./routes/notifications-page";
import { PostDetailPage } from "./routes/post-detail-page";
import { PublishStatusPage } from "./routes/publish-status-page";
import { RankingDetailPage } from "./routes/ranking-detail-page";
import { RankingItemDetailPage } from "./routes/ranking-item-detail-page";
import { RankingsPage } from "./routes/rankings-page";
import { SettingsPage } from "./routes/settings-page";
import { UserProfilePage } from "./routes/user-profile-page";

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
        element: <CirclePage />
      },
      {
        path: toRootChildPath(APP_ROUTES.webLogin),
        element: <LoginPage />
      },
      {
        path: toRootChildPath(APP_ROUTES.webProfile),
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(APP_ROUTES.webSettings),
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(APP_ROUTES.webUserProfile),
        element: <UserProfilePage />
      },
      {
        path: toRootChildPath(APP_ROUTES.notifications),
        element: (
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        )
      },
      {
        path: toRootChildPath(APP_ROUTES.models),
        element: <ModelsPage />
      },
      {
        path: toRootChildPath(APP_ROUTES.modelDetail),
        element: <ModelDetailPage />
      },
      {
        path: toRootChildPath(APP_ROUTES.rankings),
        element: <RankingsPage />
      },
      {
        path: toRootChildPath(APP_ROUTES.rankingEditor),
        element: withPublishFallback(<RankingEditorPage />)
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.rankingDetail),
        element: <RankingDetailPage />
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.rankingItemDetail),
        element: <RankingItemDetailPage />
      },
      {
        path: toRootChildPath(APP_ROUTES.postDetail),
        element: <PostDetailPage />
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishArticle),
        element: withPublishFallback(<PublishArticlePage />)
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishMoment),
        element: withPublishFallback(<PublishMomentPage />)
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishAircraft),
        element: withPublishFallback(<PublishAircraftPage />)
      },
      {
        path: toRootChildPath(APP_ROUTES.publishBrand),
        element: withPublishFallback(<PublishBrandPage />)
      },
      {
        path: toRootChildPath(WEB_ROUTE_PATHS.publishStatus),
        element: <PublishStatusPage />
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
