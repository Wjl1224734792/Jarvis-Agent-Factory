import { APP_ROUTES } from "@feijia/shared";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdminLoginPage } from "./features/auth/admin-login-page";
import { AdminOverviewPage } from "./features/auth/admin-overview-page";
import { AdminProtectedRoute } from "./features/auth/admin-protected-route";
import { AdminShell } from "./features/auth/admin-shell";
import { BrandsPage } from "./features/models/brands-page";
import { CategoriesPage } from "./features/models/categories-page";
import { ModelsPage } from "./features/models/models-page";
import { ReviewsPage } from "./features/reviews/reviews-page";

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
      }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
