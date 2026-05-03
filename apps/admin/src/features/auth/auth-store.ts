import type { UserSummary } from "@feijia/schemas";
import { create } from "zustand";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

type AdminAuthStore = {
  status: AuthStatus;
  user: UserSummary | null;
  error: string | null;
  setLoading: () => void;
  setAuthenticated: (user: UserSummary) => void;
  setAnonymous: () => void;
  setError: (message: string | null) => void;
};

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  // 后台没有本地持久化用户摘要，进入后台后一律从 idle 开始做服务端会话校验。
  status: "idle",
  user: null,
  error: null,
  setLoading: () => {
    set({
      status: "loading",
      error: null
    });
  },
  setAuthenticated: (user) => {
    set({
      status: "authenticated",
      user,
      error: null
    });
  },
  setAnonymous: () => {
    // 未登录、会话失效和主动退出都统一收敛到 anonymous，便于路由守卫判断。
    set({
      status: "anonymous",
      user: null
    });
  },
  setError: (message) => {
    set({
      error: message
    });
  }
}));
