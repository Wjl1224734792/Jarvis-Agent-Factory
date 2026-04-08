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

const PRIOR_MEAN = 4.2;
const PRIOR_WEIGHT = 3;

function buildDynamicScore(
  manualRank: number,
  aggregate: RankingAggregate
) {
  const weightedAverage =
    aggregate.totalRatings > 0
      ? ((aggregate.averageRaw * aggregate.totalRatings) + PRIOR_MEAN * PRIOR_WEIGHT) /
        (aggregate.totalRatings + PRIOR_WEIGHT)
      : PRIOR_MEAN;
  const engagementBoost = aggregate.commentCount * 0.08 + aggregate.likeCount * 0.04;
  const ratingConfidenceBoost = Math.min(aggregate.totalRatings, 20) * 0.03;
  const manualRankBias = manualRank * 0.01;

  return weightedAverage * 2 + engagementBoost + ratingConfidenceBoost - manualRankBias;
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
      const scoreDelta = buildDynamicScore(right.rank, rightAggregate) - buildDynamicScore(left.rank, leftAggregate);
      if (scoreDelta !== 0) {
        return scoreDelta;
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
