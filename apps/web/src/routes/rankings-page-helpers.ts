import type { RankingListItem } from "@feijia/schemas";

function toTimestamp(value: string) {
  return new Date(value).getTime();
}

function countRankingRatings(ranking: RankingListItem) {
  return ranking.items.reduce((sum, item) => sum + item.totalRatings, 0);
}

export function buildRankingHotScore(ranking: RankingListItem) {
  const ratingSignal = ranking.averageScore * 12;
  const ratingVolumeSignal = countRankingRatings(ranking) * 0.85;
  const discussionSignal = ranking.commentCount * 3.4;
  const itemCoverageSignal = ranking.itemCount * 1.8;
  const freshnessSignal = Math.max(
    0,
    72 - (Date.now() - toTimestamp(ranking.createdAt)) / (1000 * 60 * 60)
  );
  const officialBoost = ranking.type === "official" ? 4 : 0;

  return ratingSignal + ratingVolumeSignal + discussionSignal + itemCoverageSignal + freshnessSignal + officialBoost;
}

export function mergeRankingsByTab(data: {
  official: RankingListItem[];
  community: RankingListItem[];
}) {
  const merged = [...data.official, ...data.community];

  return {
    latest: [...merged].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt)),
    hot: [...merged].sort((left, right) => {
      const scoreDelta = buildRankingHotScore(right) - buildRankingHotScore(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
    })
  };
}
