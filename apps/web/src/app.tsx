import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
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
import { PublishAircraftPage } from "./routes/publish-aircraft-page";
import { PublishArticlePage } from "./routes/publish-article-page";
import { PublishMomentPage } from "./routes/publish-moment-page";
import { PublishStatusPage } from "./routes/publish-status-page";
import { RankingDetailPage } from "./routes/ranking-detail-page";
import { RankingEditorPage } from "./routes/ranking-editor-page";
import { RankingItemDetailPage } from "./routes/ranking-item-detail-page";
import { RankingsPage } from "./routes/rankings-page";
import { SettingsPage } from "./routes/settings-page";

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
        path: APP_ROUTES.feedHome.slice(1),
        element: <HomePage />
      },
      {
        path: APP_ROUTES.flightCircle.slice(1),
        element: <CirclePage />
      },
      {
        path: APP_ROUTES.webLogin.slice(1),
        element: <LoginPage />
      },
      {
        path: APP_ROUTES.webProfile.slice(1),
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        )
      },
      {
        path: APP_ROUTES.webSettings.slice(1),
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        )
      },
      {
        path: APP_ROUTES.notifications.slice(1),
        element: (
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        )
      },
      {
        path: APP_ROUTES.models.slice(1),
        element: <ModelsPage />
      },
      {
        path: APP_ROUTES.modelDetail.slice(1),
        element: <ModelDetailPage />
      },
      {
        path: APP_ROUTES.rankings.slice(1),
        element: <RankingsPage />
      },
      {
        path: APP_ROUTES.rankingEditor.slice(1),
        element: <RankingEditorPage />
      },
      {
        path: WEB_ROUTE_PATHS.rankingDetail.slice(1),
        element: <RankingDetailPage />
      },
      {
        path: WEB_ROUTE_PATHS.rankingItemDetail.slice(1),
        element: <RankingItemDetailPage />
      },
      {
        path: APP_ROUTES.postDetail.slice(1),
        element: <PostDetailPage />
      },
      {
        path: WEB_ROUTE_PATHS.publishArticle.slice(1),
        element: <PublishArticlePage />
      },
      {
        path: WEB_ROUTE_PATHS.publishMoment.slice(1),
        element: <PublishMomentPage />
      },
      {
        path: WEB_ROUTE_PATHS.publishAircraft.slice(1),
        element: <PublishAircraftPage />
      },
      {
        path: WEB_ROUTE_PATHS.publishStatus.slice(1),
        element: <PublishStatusPage />
      },
      {
        path: APP_ROUTES.compose.slice(1),
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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
