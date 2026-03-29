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
  setLoading: () => void;
  setAuthenticated: (user: UserSummary) => void;
  setAnonymous: () => void;
  setError: (message: string | null) => void;
};

const persistedState = readPersistedAuthState();

export const useAuthStore = create<AuthStore>((set) => ({
  status: persistedState?.user ? "authenticated" : "idle",
  user: persistedState?.user ?? null,
  error: null,
  setLoading: () => {
    set((state) => ({
      status: state.user ? state.status : "loading",
      error: null
    }));
  },
  setAuthenticated: (user) => {
    writePersistedAuthState(user);
    set({
      status: "authenticated",
      user,
      error: null
    });
  },
  setAnonymous: () => {
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
  }
}));
