type RankingAggregate = {
  averageRaw: number;
  totalRatings: number;
  commentCount: number;
  likeCount: number;
};

type RankingTargetSeed = {
  id: string;
  rank: number;
  createdAt?: string | null;
};

export interface RankingForHotScore {
  type: string;
  averageScore: number;
  commentCount: number;
  itemCount: number;
  createdAt: string | Date;
  items: Array<{ totalRatings: number }>;
}

function toEpochMs(value: string | Date) {
  return new Date(value).getTime();
}

/**
 * 计算榜单热度分数，与前端原算法一致。
 *
 * 公式：
 *   score = averageScore*12 + sum(totalRatings)*0.85 + commentCount*3.4
 *         + itemCount*1.8 + max(0, 72 - hoursSinceCreation)
 *         + (type === "official" ? 4 : 0)
 *
 * @param ranking - 榜单数据
 * @param nowOverride - 可注入的"当前时间"，用于测试时间冻结
 * @returns 热度分数
 */
export function buildRankingHotScore(
  ranking: RankingForHotScore,
  nowOverride?: Date
): number {
  const now = nowOverride ?? new Date();
  const totalRatings = ranking.items.reduce(
    (sum, item) => sum + item.totalRatings,
    0
  );
  const hoursSinceCreation =
    (now.getTime() - toEpochMs(ranking.createdAt)) / (1000 * 60 * 60);

  const ratingSignal = ranking.averageScore * 12;
  const ratingVolumeSignal = totalRatings * 0.85;
  const discussionSignal = ranking.commentCount * 3.4;
  const itemCoverageSignal = ranking.itemCount * 1.8;
  const freshnessSignal = Math.max(0, 72 - hoursSinceCreation);
  const officialBoost = ranking.type === 'official' ? 4 : 0;

  return (
    ratingSignal +
    ratingVolumeSignal +
    discussionSignal +
    itemCoverageSignal +
    freshnessSignal +
    officialBoost
  );
}

/**
 * 按热度降序排列榜单列表，分数相同时按创建时间降序。
 *
 * @param rankings - 待排序榜单列表
 * @param nowOverride - 可注入的"当前时间"，用于测试时间冻结
 * @returns 新数组，保持原数组不变
 */
export function sortRankingsByHotScore<T extends RankingForHotScore>(
  rankings: T[],
  nowOverride?: Date
): T[] {
  return [...rankings].sort((left, right) => {
    const scoreDelta =
      buildRankingHotScore(right, nowOverride) -
      buildRankingHotScore(left, nowOverride);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return toEpochMs(right.createdAt) - toEpochMs(left.createdAt);
  });
}

export function rankRatingTargetsByDynamicScore<T extends RankingTargetSeed>(
  items: T[],
  aggregateMap: Map<string, RankingAggregate>
) {
  return [...items]
    .sort((left, right) => {
      const leftAggregate =
        aggregateMap.get(left.id) ?? { averageRaw: 0, totalRatings: 0, commentCount: 0, likeCount: 0 };
      const rightAggregate =
        aggregateMap.get(right.id) ?? { averageRaw: 0, totalRatings: 0, commentCount: 0, likeCount: 0 };

      if (rightAggregate.averageRaw !== leftAggregate.averageRaw) {
        return rightAggregate.averageRaw - leftAggregate.averageRaw;
      }

      if (rightAggregate.totalRatings !== leftAggregate.totalRatings) {
        return rightAggregate.totalRatings - leftAggregate.totalRatings;
      }

      if (rightAggregate.commentCount !== leftAggregate.commentCount) {
        return rightAggregate.commentCount - leftAggregate.commentCount;
      }

      if (rightAggregate.likeCount !== leftAggregate.likeCount) {
        return rightAggregate.likeCount - leftAggregate.likeCount;
      }

      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
}
