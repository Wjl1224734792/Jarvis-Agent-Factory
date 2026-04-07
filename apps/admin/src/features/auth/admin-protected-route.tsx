import type { PropsWithChildren } from "react";
import { APP_ROUTES, buildLoginRedirectUrl } from "@feijia/shared";
import { Button, Flex } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useBootstrapAdminAuth } from "./use-bootstrap-admin-auth";
import { useAdminAuthStore } from "./auth-store";

export function AdminProtectedRoute({ children }: PropsWithChildren) {
  useBootstrapAdminAuth();

  const location = useLocation();
  const status = useAdminAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return (
      <main className="admin-route-error">
        <Flex align="center" gap={12} justify="center" vertical>
          <Button loading type="primary">
            正在恢复管理员身份
          </Button>
          <div style={{ color: "#94a3b8" }}>请稍候，正在校验后台登录会话。</div>
        </Flex>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate replace to={buildLoginRedirectUrl(APP_ROUTES.adminLogin, location)} />;
  }

  return children;
}
