export function buildRankingItemSubmission(rating: number, content: string) {
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
