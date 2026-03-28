import { APP_ROUTES } from "@feijia/shared";
import { Button, Flex } from "antd";
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

function AdminRouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Admin route is unavailable.";

  return (
    <main className="admin-route-error">
      <Flex align="center" gap={16} justify="center" vertical>
        <div className="admin-route-error__title">后台页面暂时无法打开</div>
        <div className="admin-route-error__message">{message}</div>
        <Button href={APP_ROUTES.adminHome} type="primary">
          返回后台首页
        </Button>
      </Flex>
    </main>
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
  return <RouterProvider router={router} />;
}
