import { create } from "zustand";

type AppShellState = {
  isReady: boolean;
  lastSyncedAt: string | null;
  setShellReady: (ready: boolean) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
};

export const useAppShellStore = create<AppShellState>((set) => ({
  isReady: false,
  lastSyncedAt: null,
  setShellReady: (ready) => {
    set({
      isReady: ready
    });
  },
  setLastSyncedAt: (timestamp) => {
    set({
      lastSyncedAt: timestamp
    });
  }
}));
