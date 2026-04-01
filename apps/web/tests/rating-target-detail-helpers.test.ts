import { describe, expect, it } from "vitest";
import {
  buildRatingTargetSubmission,
  canSubmitRatingTargetComment
} from "../src/routes/rating-target-detail-helpers";

describe("rating target detail helpers", () => {
  it("returns null when no rating is selected", () => {
    expect(buildRatingTargetSubmission(0, "some text")).toBeNull();
  });

  it("routes to rating-only submission when content is empty", () => {
    expect(buildRatingTargetSubmission(4, "   ")).toEqual({
      kind: "rating",
      payload: {
        rating: 4
      }
    });
  });

  it("routes to review submission when content is present", () => {
    expect(buildRatingTargetSubmission(5, " Strong field result. ")).toEqual({
      kind: "review",
      payload: {
        rating: 5,
        content: "Strong field result."
      }
    });
  });

  it("allows replies without rating but still blocks empty content", () => {
    expect(
      canSubmitRatingTargetComment({
        rating: 0,
        content: "  reply content  ",
        isReplying: true
      })
    ).toBe(true);
    expect(
      canSubmitRatingTargetComment({
        rating: 0,
        content: "   ",
        isReplying: true
      })
    ).toBe(false);
  });

  it("requires rating for top-level comments", () => {
    expect(
      canSubmitRatingTargetComment({
        rating: 0,
        content: "top level comment",
        isReplying: false
      })
    ).toBe(false);
    expect(
      canSubmitRatingTargetComment({
        rating: 4,
        content: "top level comment",
        isReplying: false
      })
    ).toBe(true);
  });
});
