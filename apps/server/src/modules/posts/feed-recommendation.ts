type FeedRecommendationItem = {
  id: string;
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

function getPublishedTime(item: FeedRecommendationItem) {
  return new Date(item.publishedAt ?? item.createdAt).getTime();
}

function getAgeHours(item: FeedRecommendationItem, now: Date) {
  return Math.max(0, (now.getTime() - getPublishedTime(item)) / (1000 * 60 * 60));
}

function buildFeedRecommendationScore(
  item: FeedRecommendationItem,
  input: {
    now: Date;
    type: "article" | "moment";
  }
) {
  const baseEngagement =
    item.engagement.likeCount * 3.2 +
    item.engagement.favoriteCount * 2.6 +
    item.engagement.shareCount * 3.8 +
    item.commentCount * 2.4;
  const freshnessBoost = Math.max(0, 36 - getAgeHours(item, input.now)) * 0.85;
  const relationshipBoost = item.engagement.viewer.isFollowingAuthor ? 18 : 0;
  const officialBoost = input.type === "article" && item.author.role === "admin" ? 7 : 0;
  const mediaBoost =
    input.type === "moment"
      ? item.videos.length > 0
        ? 6
        : item.images.length > 0
          ? 3
          : 0
      : item.images.length > 0
        ? 1.5
        : 0;
  const affinityBoost =
    (item.engagement.viewer.hasLiked ? 4 : 0) +
    (item.engagement.viewer.hasFavorited ? 5 : 0) +
    (item.engagement.viewer.hasShared ? 3 : 0);

  return baseEngagement + freshnessBoost + relationshipBoost + officialBoost + mediaBoost + affinityBoost;
}

export function rankFeedItemsByRecommendation<T extends FeedRecommendationItem>(
  items: T[],
  input: {
    now?: Date;
    type: "article" | "moment";
  }
) {
  const now = input.now ?? new Date();

  return [...items].sort((left, right) => {
    const scoreDelta = buildFeedRecommendationScore(right, { now, type: input.type }) -
      buildFeedRecommendationScore(left, { now, type: input.type });
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return getPublishedTime(right) - getPublishedTime(left);
  });
}
