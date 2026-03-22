import { APP_ROUTES } from "@feijia/shared";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdminLoginPage } from "./features/auth/admin-login-page";
import { AdminOverviewPage } from "./features/auth/admin-overview-page";
import { AdminProtectedRoute } from "./features/auth/admin-protected-route";
import { AdminShell } from "./features/auth/admin-shell";

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
      }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
