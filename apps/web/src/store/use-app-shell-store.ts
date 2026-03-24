import { create } from "zustand";

type AppShellState = {
  isReady: boolean;
  isSidebarCollapsed: boolean;
  lastSyncedAt: string | null;
  setShellReady: (ready: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setLastSyncedAt: (timestamp: string | null) => void;
};

export const useAppShellStore = create<AppShellState>((set) => ({
  isReady: false,
  isSidebarCollapsed: false,
  lastSyncedAt: null,
  setShellReady: (ready) => {
    set({
      isReady: ready
    });
  },
  setSidebarCollapsed: (collapsed) => {
    set({
      isSidebarCollapsed: collapsed
    });
  },
  toggleSidebarCollapsed: () => {
    set((state) => ({
      isSidebarCollapsed: !state.isSidebarCollapsed
    }));
  },
  setLastSyncedAt: (timestamp) => {
    set({
      lastSyncedAt: timestamp
    });
  }
}));
