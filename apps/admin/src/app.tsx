import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdminLoginPage } from "./features/auth/admin-login-page";
import { AdminOverviewPage } from "./features/auth/admin-overview-page";
import { AdminProtectedRoute } from "./features/auth/admin-protected-route";
import { AdminShell } from "./features/auth/admin-shell";
import { BrandsPage } from "./features/models/brands-page";
import { CategoriesPage } from "./features/models/categories-page";
import { ModelsPage } from "./features/models/models-page";
import { PostCommentsPage } from "./features/posts/post-comments-page";
import { PostsPage } from "./features/posts/posts-page";
import { RankingEditorPage } from "./features/rankings/ranking-editor-page";
import { RankingsPage } from "./features/rankings/rankings-page";
import { ReviewsPage } from "./features/reviews/reviews-page";
import { queryClient } from "./lib/query-client";

const router = createBrowserRouter([
  {
    path: APP_ROUTES.adminLogin,
    element: <AdminLoginPage />
  },
  {
    path: APP_ROUTES.adminHome,
    element: (
      <AdminProtectedRoute>
        <AdminShell />
      </AdminProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminOverviewPage />
      },
      {
        path: APP_ROUTES.adminCategories.slice("/admin/".length),
        element: <CategoriesPage />
      },
      {
        path: APP_ROUTES.adminBrands.slice("/admin/".length),
        element: <BrandsPage />
      },
      {
        path: APP_ROUTES.adminModels.slice("/admin/".length),
        element: <ModelsPage />
      },
      {
        path: APP_ROUTES.adminReviews.slice("/admin/".length),
        element: <ReviewsPage />
      },
      {
        path: APP_ROUTES.adminPosts.slice("/admin/".length),
        element: <PostsPage />
      },
      {
        path: APP_ROUTES.adminPostComments.slice("/admin/".length),
        element: <PostCommentsPage />
      },
      {
        path: APP_ROUTES.adminRankings.slice("/admin/".length),
        element: <RankingsPage />
      },
      {
        path: `${APP_ROUTES.adminRankings.slice("/admin/".length)}/new`,
        element: <RankingEditorPage />
      },
      {
        path: `${APP_ROUTES.adminRankings.slice("/admin/".length)}/:id`,
        element: <RankingEditorPage />
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
