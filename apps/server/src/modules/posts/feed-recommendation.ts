export type FeedRecommendationItem = {
  id: string;
  title: string;
  contentPreview: string;
  viewCount: number;
  reportCount: number;
  commentCount: number;
  engagement: {
    likeCount: number;
    favoriteCount: number;
    shareCount: number;
    viewer: {
      isFollowingAuthor: boolean;
      hasLiked: boolean;
      hasFavorited: boolean;
      hasShared: boolean;
    };
  };
  author: {
    id?: string;
    role: "user" | "admin";
  };
  images: Array<unknown>;
  videos: Array<unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  contentCategory: {
    slug: string;
    name: string;
    id: string;
  } | null;
};

export type ScoredFeedRecommendationItem<T extends FeedRecommendationItem> = {
  item: T;
  baseScore: number;
  publishedTime: number;
};

const MS_PER_HOUR = 1000 * 60 * 60;

// ---------------------------------------------------------------------------
// Configurable parameters from environment variables
// ---------------------------------------------------------------------------

function getArticleHalfLifeHours(): number {
  const raw = process.env.RECOMMENDATION_ARTICLE_HALFLIFE_HOURS?.trim();
  if (raw === undefined || raw === "") {
    return 36;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 36;
}

function getMomentHalfLifeHours(): number {
  const raw = process.env.RECOMMENDATION_MOMENT_HALFLIFE_HOURS?.trim();
  if (raw === undefined || raw === "") {
    return 18;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 18;
}

function getInteractionWeight(): number {
  const raw = process.env.RECOMMENDATION_INTERACTION_WEIGHT?.trim();
  if (raw === undefined || raw === "") {
    return 0.58;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0.58;
}

function getPublishedTime(item: FeedRecommendationItem) {
  return new Date(item.publishedAt ?? item.createdAt).getTime();
}

function getAgeHours(item: FeedRecommendationItem, now: Date) {
  return Math.max(0, (now.getTime() - getPublishedTime(item)) / MS_PER_HOUR);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreLengthBalance(text: string, input: { min: number; max: number; bestAt: number; weight: number }) {
  const length = text.trim().length;
  if (length === 0) {
    return -input.weight;
  }

  if (length < input.min) {
    const ratio = length / input.min;
    return input.weight * ratio - input.weight;
  }

  if (length > input.max) {
    return -input.weight;
  }

  const distance = Math.abs(length - input.bestAt);
  const normalizedDistance = distance / Math.max(1, input.max - input.min);
  return input.weight * (1 - normalizedDistance);
}

function buildInteractionScore(
  item: FeedRecommendationItem,
  type: "article" | "moment"
) {
  const likeScore = Math.log1p(item.engagement.likeCount) * (type === "article" ? 16 : 12);
  const favoriteScore = Math.log1p(item.engagement.favoriteCount) * (type === "article" ? 14 : 10);
  const shareScore = Math.log1p(item.engagement.shareCount) * (type === "article" ? 12 : 18);
  const commentScore = Math.log1p(item.commentCount) * (type === "article" ? 15 : 9);
  const viewScore = Math.log1p(item.viewCount) * (type === "article" ? 7 : 8);
  return likeScore + favoriteScore + shareScore + commentScore + viewScore;
}

function buildFreshnessMultiplier(
  item: FeedRecommendationItem,
  input: { now: Date; type: "article" | "moment" }
) {
  const ageHours = getAgeHours(item, input.now);
  const halfLife = input.type === "article" ? getArticleHalfLifeHours() : getMomentHalfLifeHours();
  return Math.pow(0.5, ageHours / halfLife);
}

function buildAffinityPenalty(item: FeedRecommendationItem) {
  return (
    (item.engagement.viewer.hasLiked ? 6 : 0) +
    (item.engagement.viewer.hasFavorited ? 7 : 0) +
    (item.engagement.viewer.hasShared ? 5 : 0)
  );
}

function buildStaticFeedRecommendationScore(
  item: FeedRecommendationItem,
  input: {
    now: Date;
    type: "article" | "moment";
  }
) {
  const interactionScore = buildInteractionScore(item, input.type);
  const freshnessMultiplier = buildFreshnessMultiplier(item, input);
  const freshnessBoost = freshnessMultiplier * (input.type === "article" ? 32 : 28);
  const relationshipBoost = item.engagement.viewer.isFollowingAuthor ? (input.type === "article" ? 14 : 11) : 0;
  const officialBoost = input.type === "article" && item.author.role === "admin" ? 5 : 0;
  const mediaBoost =
    input.type === "moment"
      ? item.videos.length > 0
        ? 10
        : item.images.length > 0
          ? Math.min(7, item.images.length * 2.2)
          : 0
      : item.images.length > 0
        ? Math.min(5, item.images.length * 1.4)
        : item.videos.length > 0
          ? 3
          : 0;
  const titleQuality = scoreLengthBalance(item.title, {
    min: 6,
    max: 60,
    bestAt: 24,
    weight: input.type === "article" ? 7 : 4
  });
  const previewQuality = scoreLengthBalance(item.contentPreview, {
    min: input.type === "article" ? 36 : 18,
    max: input.type === "article" ? 260 : 120,
    bestAt: input.type === "article" ? 120 : 48,
    weight: input.type === "article" ? 9 : 5
  });
  const staleLowValuePenalty =
    getAgeHours(item, input.now) > (input.type === "article" ? 120 : 72) && interactionScore < 20 ? -12 : 0;
  const engagementVolume =
    item.engagement.likeCount +
    item.engagement.favoriteCount +
    item.engagement.shareCount +
    item.commentCount;
  const reportPenalty =
    item.reportCount >= 3 && item.reportCount * 2 >= Math.max(1, engagementVolume)
      ? Math.min(24, item.reportCount * 4)
      : item.reportCount > 0
        ? Math.min(10, item.reportCount * 1.8)
        : 0;
  const interactionWeight = getInteractionWeight();
  const freshnessWeight = 1 - interactionWeight;
  const freshnessAdjustedInteraction = interactionScore * clamp(
    interactionWeight + freshnessMultiplier * freshnessWeight,
    interactionWeight,
    1
  );

  return (
    freshnessAdjustedInteraction +
    freshnessBoost +
    relationshipBoost +
    officialBoost +
    mediaBoost +
    titleQuality +
    previewQuality -
    reportPenalty +
    staleLowValuePenalty
  );
}

export function buildDiversityPenalty<T extends FeedRecommendationItem>(
  candidate: T,
  selected: Array<ScoredFeedRecommendationItem<T>>,
  type: "article" | "moment"
) {
  if (selected.length === 0) {
    return 0;
  }

  const authorId = candidate.author.id?.trim();
  const categorySlug = candidate.contentCategory?.slug;
  const recentItems = selected.slice(-2);
  let penalty = 0;

  if (authorId) {
    const sameAuthorCount = selected.filter(entry => entry.item.author.id === authorId).length;
    if (sameAuthorCount > 0) {
      penalty += sameAuthorCount * (type === "article" ? 8 : 6);
    }
    if (recentItems.some(entry => entry.item.author.id === authorId)) {
      penalty += type === "article" ? 12 : 10;
    }
  }

  if (categorySlug) {
    const sameCategoryCount = selected.filter(
      entry => entry.item.contentCategory?.slug === categorySlug
    ).length;
    if (sameCategoryCount > 0) {
      penalty += sameCategoryCount * (type === "article" ? 4 : 5);
    }
    if (selected[selected.length - 1]?.item.contentCategory?.slug === categorySlug) {
      penalty += type === "article" ? 6 : 7;
    }
  }

  if (
    authorId &&
    categorySlug &&
    selected[selected.length - 1]?.item.author.id === authorId &&
    selected[selected.length - 1]?.item.contentCategory?.slug === categorySlug
  ) {
    penalty += type === "article" ? 8 : 10;
  }

  return penalty;
}

export function rankFeedItemsByRecommendation<T extends FeedRecommendationItem>(
  items: T[],
  input: {
    now?: Date;
    type: "article" | "moment";
    precomputedBaseScores?: ReadonlyMap<string, number>;
  }
) {
  const now = input.now ?? new Date();
  const remaining: Array<ScoredFeedRecommendationItem<T>> = items.map(item => ({
    item,
    baseScore:
      (input.precomputedBaseScores?.get(item.id) ??
        buildStaticFeedRecommendationScore(item, { now, type: input.type })) -
      buildAffinityPenalty(item),
    publishedTime: getPublishedTime(item)
  }));
  const ranked: Array<ScoredFeedRecommendationItem<T>> = [];

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestAdjustedScore =
      remaining[0].baseScore - buildDiversityPenalty(remaining[0].item, ranked, input.type);

    for (let index = 1; index < remaining.length; index += 1) {
      const entry = remaining[index];
      const adjustedScore = entry.baseScore - buildDiversityPenalty(entry.item, ranked, input.type);

      if (
        adjustedScore > bestAdjustedScore ||
        (adjustedScore === bestAdjustedScore &&
          (entry.baseScore > remaining[bestIndex].baseScore ||
            (entry.baseScore === remaining[bestIndex].baseScore &&
              entry.publishedTime > remaining[bestIndex].publishedTime)))
      ) {
        bestAdjustedScore = adjustedScore;
        bestIndex = index;
      }
    }

    ranked.push(remaining.splice(bestIndex, 1)[0]);
  }

  return ranked.map(entry => entry.item);
}
