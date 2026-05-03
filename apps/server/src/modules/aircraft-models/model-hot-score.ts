interface ModelHotSeed {
  favoriteCount: number;
  commentCount: number;
  reviewCount: number;
  createdAt?: Date | string | null;
  recentViewCount?: number;
  recentSearchCount?: number;
  rankingReferenceCount?: number;
}

// 新因子权重通过环境变量读取，模块顶层定义
function getViewWeight(): number {
  return Number(process.env.MODEL_HOT_VIEW_WEIGHT) || 0.5;
}
function getSearchWeight(): number {
  return Number(process.env.MODEL_HOT_SEARCH_WEIGHT) || 2.0;
}
function getRankingRefWeight(): number {
  return Number(process.env.MODEL_HOT_RANKING_REF_WEIGHT) || 8.0;
}

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
    freshnessSignal +
    (item.recentViewCount ?? 0) * getViewWeight() +
    (item.recentSearchCount ?? 0) * getSearchWeight() +
    (item.rankingReferenceCount ?? 0) * getRankingRefWeight()
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
