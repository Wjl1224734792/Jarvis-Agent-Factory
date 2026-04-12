import { useEffect, useRef } from "react";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";

export function useBootstrapAuth() {
  // 严格模式下 effect 可能重复触发，这里保证身份恢复请求在首轮挂载时只发一次。
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
      // 仅初始态切到 loading，避免覆盖已经恢复完成的用户状态。
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
        // 启动恢复失败时按匿名态收敛，同时保留错误信息供页面提示或排查。
        setAnonymous();
        setError(error instanceof Error ? error.message : "Identity bootstrap failed");
        setBootstrapped();
      });
  }, [setAnonymous, setAuthenticated, setBootstrapped, setError, setLoading, status]);
}
