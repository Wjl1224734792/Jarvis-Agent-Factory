interface ModelHotSeed {
  favoriteCount: number;
  commentCount: number;
  reviewCount: number;
  createdAt?: Date | string | null;
  recentViewCount?: number;
  recentSearchCount?: number;
  rankingReferenceCount?: number;
}

// 权重通过环境变量读取，模块顶层定义
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

/**
 * 连续指数衰减：7天半衰期，避免72小时硬截断
 * 新机型24h内享有最高加成（×1.5），然后平滑递减
 */
function freshnessBoost(createdAt: Date | string | null | undefined, now: Date): number {
  if (!createdAt) return 0;
  const hoursSinceCreation = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation < 0) return 0;
  // 指数衰减：半衰期 168 小时（7天），24h 内额外 +30% 发现加成
  const decay = Math.pow(0.5, hoursSinceCreation / 168);
  const discoveryBonus = hoursSinceCreation <= 24 ? 1.3 : 1.0;
  return decay * discoveryBonus * 20; // 缩放到与互动权重可比的范围
}

/**
 * 对数压缩：防止极端值（如万级收藏）主导排序
 * ln(x + 1) 保证 x=0 → 0，大值被平滑压缩
 */
function logCompress(value: number, scale: number): number {
  return Math.log(value + 1) * scale;
}

export function buildModelHotScore(
  item: ModelHotSeed,
  now = new Date()
) {
  // 互动信号使用对数压缩，避免少数热门机型垄断
  const favoriteSignal = logCompress(item.favoriteCount, 3);
  const commentSignal = logCompress(item.commentCount, 2);
  const reviewSignal = logCompress(item.reviewCount, 1.5);

  return (
    favoriteSignal +
    commentSignal +
    reviewSignal +
    freshnessBoost(item.createdAt, now) +
    logCompress(item.recentViewCount ?? 0, getViewWeight() * 2) +
    logCompress(item.recentSearchCount ?? 0, getSearchWeight() * 2) +
    logCompress(item.rankingReferenceCount ?? 0, getRankingRefWeight())
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
