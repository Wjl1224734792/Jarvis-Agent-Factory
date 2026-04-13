import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "@feijia/shared";
import {
  buildSearchLocation,
  normalizeSearchQuery,
  shouldShowCompactSearchBar
} from "../src/lib/search-navigation";

describe("search navigation", () => {
  it("trims search keywords before building a search route", () => {
    expect(normalizeSearchQuery("  DJI Mini 4 Pro  ")).toBe("DJI Mini 4 Pro");
  });

  it("builds a search location with the encoded keyword", () => {
    expect(buildSearchLocation("  DJI Mini 4 Pro  ")).toEqual({
      pathname: APP_ROUTES.search,
      search: "?q=DJI%20Mini%204%20Pro"
    });
  });

  it("builds an empty search route when the keyword is blank", () => {
    expect(buildSearchLocation("   ")).toEqual({
      pathname: APP_ROUTES.search,
      search: ""
    });
  });

  it("shows the compact search bar only on the search route", () => {
    expect(shouldShowCompactSearchBar(APP_ROUTES.search)).toBe(true);
    expect(shouldShowCompactSearchBar(APP_ROUTES.feedHome)).toBe(false);
  });
});
