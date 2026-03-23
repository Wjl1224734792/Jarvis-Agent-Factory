import { describe, expect, it } from "vitest";
import {
  buildSubmitReviewInput,
  createReviewFormState,
  isReviewFormValid,
  syncReviewFormState,
  updateReviewContent,
  updateReviewRating
} from "../src/routes/model-review-form";

const sampleReview = {
  id: "review_1",
  rating: 4,
  content: "续航稳定，适合周末飞行。",
  status: "visible" as const,
  createdAt: "2026-03-22T10:00:00.000Z",
  updatedAt: "2026-03-22T12:00:00.000Z",
  author: {
    id: "user_1",
    displayName: "测试用户",
    role: "user" as const
  }
};

describe("model review form helpers", () => {
  it("creates initial state from existing review", () => {
    expect(createReviewFormState(sampleReview)).toEqual({
      rating: 4,
      content: "续航稳定，适合周末飞行。",
      dirty: false
    });
  });

  it("does not override dirty local draft when server review changes", () => {
    const edited = updateReviewContent(
      updateReviewRating(createReviewFormState(sampleReview), 5),
      "我改了本地草稿"
    );

    expect(
      syncReviewFormState(edited, {
        ...sampleReview,
        rating: 2,
        content: "服务端新内容"
      })
    ).toEqual(edited);
  });

  it("trims blank content to null on submit", () => {
    expect(
      buildSubmitReviewInput({
        rating: 5,
        content: "   ",
        dirty: true
      })
    ).toEqual({
      rating: 5,
      content: null
    });
  });

  it("validates rating range", () => {
    expect(isReviewFormValid({ rating: 0, content: "", dirty: false })).toBe(false);
    expect(isReviewFormValid({ rating: 3, content: "", dirty: false })).toBe(true);
  });
});
