import type { UserSummary } from "@feijia/schemas";
import { create } from "zustand";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

type AuthStore = {
  status: AuthStatus;
  user: UserSummary | null;
  error: string | null;
  setLoading: () => void;
  setAuthenticated: (user: UserSummary) => void;
  setAnonymous: () => void;
  setError: (message: string | null) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
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
