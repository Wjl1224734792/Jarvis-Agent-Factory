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
