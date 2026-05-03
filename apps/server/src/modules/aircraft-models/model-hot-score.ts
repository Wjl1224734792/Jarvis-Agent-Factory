type ModelHotSeed = {
  favoriteCount: number;
  commentCount: number;
  reviewCount: number;
  createdAt?: Date | string | null;
};

function toTimestamp(value?: Date | string | null) {
  if (!value) {
    return 0;
  }

  return new Date(value).getTime();
}

export function buildModelHotScore(
  item: ModelHotSeed,
  now = new Date()
) {
  const freshnessSignal = Math.max(
    0,
    72 - (now.getTime() - toTimestamp(item.createdAt)) / (1000 * 60 * 60)
  );

  return (
    item.favoriteCount * 4 +
    item.commentCount * 3 +
    item.reviewCount * 2 +
    freshnessSignal
  );
}

export function sortModelsByHotScore<T extends ModelHotSeed & { slug: string }>(
  items: T[],
  now = new Date()
) {
  return [...items].sort((left, right) => {
    const scoreDelta = buildModelHotScore(right, now) - buildModelHotScore(left, now);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  });
}
