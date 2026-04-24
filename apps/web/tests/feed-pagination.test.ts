import { describe, expect, it } from "vitest";
import { resolveFeedNextCursor } from "../src/lib/feed-pagination";

describe("resolveFeedNextCursor", () => {
  it("reads next cursor from the new top-level cursor contract", () => {
    expect(
      resolveFeedNextCursor({
        nextCursor: "cursor_40",
        hasMore: true
      })
    ).toBe("cursor_40");
    expect(
      resolveFeedNextCursor({
        nextCursor: "cursor_40",
        hasMore: false
      })
    ).toBeUndefined();
  });

  it("falls back to legacy pagination.hasMore during the transition", () => {
    expect(
      resolveFeedNextCursor({
        nextCursor: "cursor_20",
        pagination: {
          hasMore: true
        }
      })
    ).toBe("cursor_20");
    expect(
      resolveFeedNextCursor({
        nextCursor: "cursor_20",
        pagination: {
          hasMore: false
        }
      })
    ).toBeUndefined();
  });
});
