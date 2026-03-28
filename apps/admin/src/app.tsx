import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { createBrowserRouter, Navigate, RouterProvider, useRouteError } from "react-router-dom";
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

function AdminRouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Admin route is unavailable.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-6">
        <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Admin</div>
        <div className="mt-3 text-2xl font-semibold">页面暂时无法打开</div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to={APP_ROUTES.adminHome} />
  },
  {
    path: APP_ROUTES.adminLogin,
    element: <AdminLoginPage />,
    errorElement: <AdminRouteError />
  },
  {
    path: APP_ROUTES.adminHome,
    element: (
      <AdminProtectedRoute>
        <AdminShell />
      </AdminProtectedRoute>
    ),
    errorElement: <AdminRouteError />,
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
  },
  {
    path: "*",
    element: <Navigate replace to={APP_ROUTES.adminHome} />
  }
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
