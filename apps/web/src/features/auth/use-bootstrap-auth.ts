import { useEffect, useRef } from "react";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";

export function useBootstrapAuth() {
  const hasBootstrapped = useRef(false);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const setError = useAuthStore((state) => state.setError);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    setLoading();

    void apiClient
      .getCurrentUser()
      .then((user) => {
        if (user) {
          setAuthenticated(user);
          return;
        }

        setAnonymous();
      })
      .catch((error: unknown) => {
        setAnonymous();
        setError(error instanceof Error ? error.message : "身份恢复失败");
      });
  }, [setAnonymous, setAuthenticated, setError, setLoading]);
}
