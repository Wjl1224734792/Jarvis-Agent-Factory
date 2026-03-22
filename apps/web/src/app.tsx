import { QueryClientProvider } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/query-client";
import { LoginPage } from "./features/auth/login-page";
import { ProfilePage } from "./features/auth/profile-page";
import { ProtectedRoute } from "./features/auth/protected-route";
import { WebLayout } from "./features/auth/web-layout";
import { HomePage } from "./routes/home-page";

const router = createBrowserRouter([
  {
    path: APP_ROUTES.home,
    element: <WebLayout />,
    children: [
      {
        index: true,
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
