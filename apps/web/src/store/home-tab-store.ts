import { create } from "zustand";

const STORAGE_KEY = "feijia.web.home-tab";

const DEFAULT_TAB_STATE = {
  kind: "fixed" as const,
  id: "recommended" as const
};

type HomeTabState = {
  kind: "fixed";
  id: "recommended" | "latest" | "following";
} | {
  kind: "category";
  slug: string;
};

type HomeTabStore = {
  activeTab: HomeTabState;
  setActiveTab: (tab: HomeTabState) => void;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isValidHomeTabState(value: unknown): value is HomeTabState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const obj = value as Record<string, unknown>;
  if (obj.kind === "fixed") {
    return typeof obj.id === "string" && ["recommended", "latest", "following"].includes(obj.id);
  }

  if (obj.kind === "category") {
    return typeof obj.slug === "string";
  }

  return false;
}

function readPersistedTab(): HomeTabState {
  if (!canUseStorage()) {
    return DEFAULT_TAB_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_TAB_STATE;
    }

    const parsed: unknown = JSON.parse(raw);
    if (isValidHomeTabState(parsed)) {
      return parsed;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_TAB_STATE;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_TAB_STATE;
  }
}

function writePersistedTab(tab: HomeTabState) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tab));
}

export const useHomeTabStore = create<HomeTabStore>((set) => ({
  activeTab: readPersistedTab(),
  setActiveTab: (tab) => {
    writePersistedTab(tab);
    set({ activeTab: tab });
  }
}));
