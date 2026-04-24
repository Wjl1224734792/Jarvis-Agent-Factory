import { describe, expect, it } from "vitest";
import {
  getHomeFeedQueryKey,
  HOME_FEED_QUERY_GC_TIME_MS,
  HOME_FEED_QUERY_STALE_TIME_MS,
  resolveHomeFeedPlaceholderData
} from "../src/lib/home-feed-query";

describe("home-feed-query helpers", () => {
  it("builds stable query keys with tab and normalized category slug", () => {
    expect(getHomeFeedQueryKey("recommended", undefined)).toEqual(["home-shell-feed", "recommended", null]);
    expect(getHomeFeedQueryKey("latest", "  ")).toEqual(["home-shell-feed", "latest", null]);
    expect(getHomeFeedQueryKey("recommended", "  aircraft ")).toEqual([
      "home-shell-feed",
      "recommended",
      "aircraft"
    ]);
  });

  it("exposes explicit staleTime/gcTime for home infinite query cache behavior", () => {
    expect(HOME_FEED_QUERY_STALE_TIME_MS).toBeGreaterThan(0);
    expect(HOME_FEED_QUERY_GC_TIME_MS).toBeGreaterThan(HOME_FEED_QUERY_STALE_TIME_MS);
  });

  it("keeps placeholder data only when previous query key matches current tab/category key", () => {
    const previousData = {
      pages: [
        {
          items: [{ id: "post_1" }],
          nextCursor: "cursor_2",
          hasMore: true
        }
      ],
      pageParams: [undefined]
    };
    const currentKey = getHomeFeedQueryKey("recommended", "aircraft");

    expect(
      resolveHomeFeedPlaceholderData(previousData, { queryKey: currentKey }, currentKey)
    ).toEqual(previousData);

    expect(
      resolveHomeFeedPlaceholderData(
        previousData,
        { queryKey: getHomeFeedQueryKey("latest", "aircraft") },
        currentKey
      )
    ).toBeUndefined();

    expect(
      resolveHomeFeedPlaceholderData(
        previousData,
        { queryKey: getHomeFeedQueryKey("recommended", "news") },
        currentKey
      )
    ).toBeUndefined();

    expect(
      resolveHomeFeedPlaceholderData(previousData, { queryKey: ["home-shell-models"] }, currentKey)
    ).toBeUndefined();
  });
});
