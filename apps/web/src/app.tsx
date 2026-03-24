import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { LoginPage } from "./features/auth/login-page";
import { ProfilePage } from "./features/auth/profile-page";
import { ProtectedRoute } from "./features/auth/protected-route";
import { WebLayout } from "./features/auth/web-layout";
import { queryClient } from "./lib/query-client";
import { HomePage } from "./routes/home-page";
import { ModelDetailPage } from "./routes/model-detail-page";
import { ModelsPage } from "./routes/models-page";
import { NotificationsPage } from "./routes/notifications-page";
import { PostDetailPage } from "./routes/post-detail-page";
import { RankingsPage } from "./routes/rankings-page";

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
        path: APP_ROUTES.models.slice(1),
        element: <ModelsPage />
      },
      {
        path: APP_ROUTES.rankings.slice(1),
        element: <RankingsPage />
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
        path: APP_ROUTES.modelDetail.slice(1),
        element: <ModelDetailPage />
      },
      {
        path: APP_ROUTES.postDetail.slice(1),
        element: <PostDetailPage />
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
