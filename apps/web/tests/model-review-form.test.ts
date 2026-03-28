import { describe, expect, it } from "vitest";
import {
  buildSubmitReviewInput,
  createReviewFormState,
  isReviewFormValid,
  syncReviewFormState,
  updateReviewContent
} from "../src/routes/model-review-form";

const sampleReview = {
  id: "review_1",
  content: "Stable handling for short field work.",
  status: "visible" as const,
  createdAt: "2026-03-22T10:00:00.000Z",
  updatedAt: "2026-03-22T12:00:00.000Z",
  author: {
    id: "user_1",
    displayName: "Test User",
    avatarUrl: null,
    role: "user" as const
  }
};

describe("model review form helpers", () => {
  it("creates initial state from existing review", () => {
    expect(createReviewFormState(sampleReview)).toEqual({
      content: "Stable handling for short field work.",
      dirty: false
    });
  });

  it("does not override dirty local draft when server review changes", () => {
    const edited = updateReviewContent(createReviewFormState(sampleReview), "Edited local draft");

    expect(
      syncReviewFormState(edited, {
        ...sampleReview,
        content: "Server copy"
      })
    ).toEqual(edited);
  });

  it("trims blank content to null on submit", () => {
    expect(
      buildSubmitReviewInput({
        content: "   ",
        dirty: true
      })
    ).toEqual({
      content: null
    });
  });

  it("validates non-empty comment content", () => {
    expect(isReviewFormValid({ content: "", dirty: false })).toBe(false);
    expect(isReviewFormValid({ content: "Useful note", dirty: false })).toBe(true);
  });
});
