import { useEffect, useRef } from "react";
import { apiClient, isWebAuthInvalidError } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";

type BootstrapAuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

export function resolveBootstrapFailureAction(
  status: BootstrapAuthStatus,
  error: unknown
) {
  if (status === "authenticated" && !isWebAuthInvalidError(error)) {
    return "keep-user" as const;
  }

  return "clear-auth" as const;
}

export function shouldKeepCurrentAuthOnBootstrapResult(
  bootstrapStatus: BootstrapAuthStatus,
  currentStatus: BootstrapAuthStatus
) {
  return bootstrapStatus !== "authenticated" && currentStatus === "authenticated";
}

export function useBootstrapAuth() {
  // React Strict Mode may invoke effects twice in development.
  // This ref ensures bootstrap runs only once per mount lifecycle.
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
        const latestStatus = useAuthStore.getState().status;
        const shouldKeepCurrentAuth = shouldKeepCurrentAuthOnBootstrapResult(
          status,
          latestStatus
        );

        if (user) {
          setAuthenticated(user);
          setBootstrapped();
          return;
        }

        if (shouldKeepCurrentAuth) {
          setBootstrapped();
          return;
        }

        setAnonymous();
        setBootstrapped();
      })
      .catch((error: unknown) => {
        const latestStatus = useAuthStore.getState().status;
        const shouldKeepCurrentAuth = shouldKeepCurrentAuthOnBootstrapResult(
          status,
          latestStatus
        );
        if (shouldKeepCurrentAuth) {
          setBootstrapped();
          return;
        }

        if (resolveBootstrapFailureAction(latestStatus, error) === "clear-auth") {
          setAnonymous();
        }
        setError(error instanceof Error ? error.message : "Identity bootstrap failed");
        setBootstrapped();
      });
  }, [setAnonymous, setAuthenticated, setBootstrapped, setError, setLoading, status]);
}
