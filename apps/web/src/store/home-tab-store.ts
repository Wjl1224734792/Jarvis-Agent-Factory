import { create } from "zustand";

const STORAGE_KEY = "feijia.web.home-tab";

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

function readPersistedTab(): HomeTabState {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return { kind: "fixed", id: "recommended" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { kind: "fixed", id: "recommended" };
    }

    const parsed = JSON.parse(raw) as HomeTabState;
    // 校验基本结构
    if (parsed && typeof parsed.kind === "string") {
      return parsed;
    }

    return { kind: "fixed", id: "recommended" };
  } catch {
    return { kind: "fixed", id: "recommended" };
  }
}

function writePersistedTab(tab: HomeTabState) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
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
