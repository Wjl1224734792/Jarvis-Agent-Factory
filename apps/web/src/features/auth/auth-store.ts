import type { UserSummary } from "@feijia/schemas";
import { create } from "zustand";
import {
  clearPersistedAuthState,
  readPersistedAuthState,
  writePersistedAuthState
} from "./auth-store-persistence";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

type AuthStore = {
  status: AuthStatus;
  user: UserSummary | null;
  error: string | null;
  isBootstrapped: boolean;
  setLoading: () => void;
  setAuthenticated: (user: UserSummary) => void;
  setAnonymous: () => void;
  setError: (message: string | null) => void;
  setBootstrapped: () => void;
};

// 首屏优先读取持久化用户信息，尽量减少刷新后的“已登录用户短暂掉线”闪动。
const persistedState = readPersistedAuthState();

export const useAuthStore = create<AuthStore>((set) => ({
  status: persistedState?.user ? "authenticated" : "idle",
  user: persistedState?.user ?? null,
  error: null,
  isBootstrapped: false,
  setLoading: () => {
    set((state) => ({
      // 已有用户信息时保留当前状态，避免静默刷新把页面误判成未登录加载态。
      status: state.user ? state.status : "loading",
      error: null
    }));
  },
  setAuthenticated: (user) => {
    // 登录成功后同步刷新内存态与持久化缓存，保证刷新页面后还能立即恢复展示。
    writePersistedAuthState(user);
    set({
      status: "authenticated",
      user,
      error: null
    });
  },
  setAnonymous: () => {
    // 明确退出或鉴权失败时同时清空持久化，防止旧用户信息残留。
    clearPersistedAuthState();
    set({
      status: "anonymous",
      user: null
    });
  },
  setError: (message) => {
    set({
      error: message
    });
  },
  setBootstrapped: () => {
    // bootstrap 标记只说明首轮鉴权已结束，不等价于用户一定已登录。
    set({
      isBootstrapped: true
    });
  }
}));
