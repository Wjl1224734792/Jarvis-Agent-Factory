import { describe, expect, it } from "vitest";
import { buildRankingItemSubmission } from "../src/routes/ranking-item-detail-helpers";

describe("ranking item detail helpers", () => {
  it("returns null when no rating is selected", () => {
    expect(buildRankingItemSubmission(0, "some text")).toBeNull();
  });

  it("routes to rating-only submission when content is empty", () => {
    expect(buildRankingItemSubmission(4, "   ")).toEqual({
      kind: "rating",
      payload: {
        rating: 4
      }
    });
  });

  it("routes to review submission when content is present", () => {
    expect(buildRankingItemSubmission(5, " Strong field result. ")).toEqual({
      kind: "review",
      payload: {
        rating: 5,
        content: "Strong field result."
      }
    });
  });
});
