import { APP_ROUTES } from "@feijia/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/components/site-shell", () => ({
  SitePanel: () => null,
  SitePanelBody: () => null
}));

vi.mock("../src/components/ui/button", () => ({
  Button: () => null,
  buttonVariants: () => ""
}));

vi.mock("../src/components/ui/input", () => ({
  Input: () => null
}));

vi.mock("../src/components/ui/sheet", () => ({
  Sheet: () => null,
  SheetClose: () => null,
  SheetContent: () => null,
  SheetDescription: () => null,
  SheetHeader: () => null,
  SheetTitle: () => null,
  SheetTrigger: () => null
}));

vi.mock("../src/lib/search-navigation", () => ({
  buildSearchLocation: () => ({ pathname: APP_ROUTES.search, search: "" }),
  shouldShowCompactSearchBar: () => false
}));

vi.mock("../src/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ")
}));

vi.mock("../src/lib/web-routes", () => ({
  WEB_ROUTE_PATHS: {
    publishArticle: "/publish/article",
    publishMoment: "/publish/moment",
    publishAircraft: "/publish/aircraft"
  }
}));

vi.mock("../src/features/auth/auth-store", () => ({
  useAuthStore: () => "anonymous"
}));

vi.mock("../src/features/auth/notification-state", () => ({
  shouldFetchNotifications: () => false
}));

vi.mock("../src/features/auth/use-login-prompt", () => ({
  useLoginPrompt: () => () => undefined
}));

vi.mock("../src/features/auth/use-notifications", () => ({
  useNotifications: () => ({ data: { unreadCount: 0 } })
}));

vi.mock("../src/features/auth/user-menu", () => ({
  UserMenu: () => null
}));

vi.mock("../../packages/shared/assets/logo/logo.jpg", () => ({
  default: "logo.jpg"
}));

import {
  getTopNavSearchSlots,
  getTopNavUserProfileLabel,
  getTopNavUserProfileRoute,
  shouldRenderTopNavSearch,
  shouldShowImmersiveTopNavSearch
} from "../src/features/auth/web-top-nav";

describe("web top nav display rules", () => {
  it("renders desktop search and switches mobile search mode when search is enabled", () => {
    expect(shouldRenderTopNavSearch(true)).toBe(true);
    expect(getTopNavSearchSlots({ showSearch: true, compactSearch: false })).toEqual({
      desktopSearch: true,
      mobileCompactSearch: false,
      mobileSearchButton: true
    });
    expect(getTopNavSearchSlots({ showSearch: true, compactSearch: true })).toEqual({
      desktopSearch: true,
      mobileCompactSearch: true,
      mobileSearchButton: false
    });
  });

  it("disables all search entry points when search is hidden", () => {
    expect(shouldRenderTopNavSearch(false)).toBe(false);
    expect(getTopNavSearchSlots({ showSearch: false, compactSearch: false })).toEqual({
      desktopSearch: false,
      mobileCompactSearch: false,
      mobileSearchButton: false
    });
    expect(getTopNavSearchSlots({ showSearch: false, compactSearch: true })).toEqual({
      desktopSearch: false,
      mobileCompactSearch: false,
      mobileSearchButton: false
    });
  });

  it("keeps the personal entry pinned to the current user's own profile route", () => {
    expect(getTopNavUserProfileLabel()).toBe("\u81ea\u5df1");
    expect(getTopNavUserProfileRoute()).toBe(APP_ROUTES.webProfile);
  });

  it("shows search on immersive detail routes and hides it on publish routes", () => {
    expect(shouldShowImmersiveTopNavSearch("/models/dji-mini-4-pro")).toBe(true);
    expect(shouldShowImmersiveTopNavSearch("/posts/post-1")).toBe(true);
    expect(shouldShowImmersiveTopNavSearch("/rankings/ranking-1")).toBe(true);
    expect(shouldShowImmersiveTopNavSearch("/rating-targets/item-1")).toBe(true);
    expect(shouldShowImmersiveTopNavSearch("/publish/article")).toBe(false);
    expect(shouldShowImmersiveTopNavSearch("/publish/moment")).toBe(false);
    expect(shouldShowImmersiveTopNavSearch("/publish/aircraft")).toBe(false);
    expect(shouldShowImmersiveTopNavSearch("/publish/brand")).toBe(false);
    expect(shouldShowImmersiveTopNavSearch("/rankings/create")).toBe(false);
    expect(shouldShowImmersiveTopNavSearch("/publish/status/article/post-1")).toBe(false);
  });
});
