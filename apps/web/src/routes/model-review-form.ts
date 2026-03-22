import type { ModelReview } from "@feijia/schemas";

export type ReviewFormState = {
  rating: number;
  content: string;
  dirty: boolean;
};

export function createReviewFormState(review: ModelReview | null): ReviewFormState {
  return {
    rating: review?.rating ?? 0,
    content: review?.content ?? "",
    dirty: false
  };
}

export function updateReviewRating(
  state: ReviewFormState,
  rating: number
): ReviewFormState {
  return {
    ...state,
    rating,
    dirty: true
  };
}

export function updateReviewContent(
  state: ReviewFormState,
  content: string
): ReviewFormState {
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
    rating: state.rating,
    content: trimmed.length > 0 ? trimmed : null
  };
}

export function isReviewFormValid(state: ReviewFormState): boolean {
  return state.rating >= 1 && state.rating <= 5;
}
