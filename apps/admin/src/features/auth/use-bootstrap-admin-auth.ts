import { useEffect, useRef } from "react";
import { apiClient } from "../../lib/api-client";
import { useAdminAuthStore } from "./auth-store";

type CurrentAdmin = Awaited<ReturnType<typeof apiClient.getCurrentAdmin>>;

export function useBootstrapAdminAuth() {
  const hasBootstrapped = useRef(false);
  const setLoading = useAdminAuthStore((state) => state.setLoading);
  const setAuthenticated = useAdminAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAdminAuthStore((state) => state.setAnonymous);
  const setError = useAdminAuthStore((state) => state.setError);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    setLoading();

    void apiClient
      .getCurrentAdmin()
      .then((user: CurrentAdmin) => {
        if (user) {
          setAuthenticated(user);
          return;
        }

        setAnonymous();
      })
      .catch((error: unknown) => {
        setAnonymous();
        setError(error instanceof Error ? error.message : "管理员身份恢复失败");
      });
  }, [setAnonymous, setAuthenticated, setError, setLoading]);
}
