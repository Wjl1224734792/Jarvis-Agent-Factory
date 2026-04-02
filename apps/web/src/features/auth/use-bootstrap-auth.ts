import { useEffect, useRef } from "react";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";

export function useBootstrapAuth() {
  const hasBootstrapped = useRef(false);
  const status = useAuthStore((state) => state.status);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const setError = useAuthStore((state) => state.setError);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    if (status === "idle") {
      setLoading();
    }

    void apiClient
      .getCurrentUser()
      .then((user) => {
        if (user) {
          setAuthenticated(user);
          setBootstrapped();
          return;
        }

        setAnonymous();
        setBootstrapped();
      })
      .catch((error: unknown) => {
        setAnonymous();
        setError(error instanceof Error ? error.message : "Identity bootstrap failed");
        setBootstrapped();
      });
  }, [setAnonymous, setAuthenticated, setBootstrapped, setError, setLoading, status]);
}
