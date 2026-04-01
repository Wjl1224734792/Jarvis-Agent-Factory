export function buildRatingTargetSubmission(rating: number, content: string) {
  const trimmed = content.trim();

  if (rating <= 0) {
    return null;
  }

  if (trimmed.length > 0) {
    return {
      kind: "review" as const,
      payload: {
        rating,
        content: trimmed
      }
    };
  }

  return {
    kind: "rating" as const,
    payload: {
      rating
    }
  };
}

export function canSubmitRatingTargetComment(input: {
  rating: number;
  content: string;
  isReplying: boolean;
}) {
  const trimmed = input.content.trim();
  if (!trimmed) {
    return false;
  }

  return input.isReplying || input.rating > 0;
}
