import type { ModelReview } from "@feijia/schemas";

export type ReviewFormState = {
  content: string;
  dirty: boolean;
};

export function createReviewFormState(review: ModelReview | null): ReviewFormState {
  return {
    content: review?.content ?? "",
    dirty: false
  };
}

export function updateReviewContent(state: ReviewFormState, content: string): ReviewFormState {
  return {
    ...state,
    content,
    dirty: true
  };
}

export function syncReviewFormState(
  state: ReviewFormState,
  review: ModelReview | null
): ReviewFormState {
  if (state.dirty) {
    return state;
  }

  return createReviewFormState(review);
}

export function buildSubmitReviewInput(state: ReviewFormState) {
  const trimmed = state.content.trim();

  return {
    content: trimmed.length > 0 ? trimmed : null
  };
}

export function isReviewFormValid(state: ReviewFormState): boolean {
  return state.content.trim().length > 0;
}
