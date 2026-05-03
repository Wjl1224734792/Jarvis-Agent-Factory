import { afterEach, describe, expect, it } from "vitest";
import { rankFeedItemsByRecommendation } from "../src/modules/posts/feed-recommendation";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Minimal item shape accepted by rankFeedItemsByRecommendation.
 * We use structural typing so we only supply the fields we need.
 */
function makeMoment(params: {
  id: string;
  ageHours: number;
  likeCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  commentCount?: number;
  viewCount?: number;
  now: Date;
}) {
  const publishedAt = new Date(params.now.getTime() - params.ageHours * 3_600_000);
  return {
    id: params.id,
    title: "T",
    contentPreview: "Stable synthetic content for recommendation formula testing.",
    viewCount: params.viewCount ?? 0,
    reportCount: 0,
    commentCount: params.commentCount ?? 0,
    engagement: {
      likeCount: params.likeCount ?? 0,
      favoriteCount: params.favoriteCount ?? 0,
      shareCount: params.shareCount ?? 0,
      viewer: {
        isFollowingAuthor: false,
        hasLiked: false,
        hasFavorited: false,
        hasShared: false,
      },
    },
    author: { id: "author_1", role: "user" as const },
    images: [],
    videos: [],
    createdAt: publishedAt.toISOString(),
    updatedAt: publishedAt.toISOString(),
    publishedAt: publishedAt.toISOString(),
    contentCategory: null,
  };
}

function makeArticle(params: {
  id: string;
  ageHours: number;
  likeCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  commentCount?: number;
  viewCount?: number;
  now: Date;
}) {
  const publishedAt = new Date(params.now.getTime() - params.ageHours * 3_600_000);
  return {
    id: params.id,
    title: "Standard article title for recommendation testing",
    contentPreview: "Stable synthetic content for article recommendation scoring verification in the test suite.",
    viewCount: params.viewCount ?? 0,
    reportCount: 0,
    commentCount: params.commentCount ?? 0,
    engagement: {
      likeCount: params.likeCount ?? 0,
      favoriteCount: params.favoriteCount ?? 0,
      shareCount: params.shareCount ?? 0,
      viewer: {
        isFollowingAuthor: false,
        hasLiked: false,
        hasFavorited: false,
        hasShared: false,
      },
    },
    author: { id: "author_1", role: "user" as const },
    images: [],
    videos: [],
    createdAt: publishedAt.toISOString(),
    updatedAt: publishedAt.toISOString(),
    publishedAt: publishedAt.toISOString(),
    contentCategory: null,
  };
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

const ORIG_ARTICLE_HALFLIFE: string | undefined =
  process.env.RECOMMENDATION_ARTICLE_HALFLIFE_HOURS;
const ORIG_MOMENT_HALFLIFE: string | undefined =
  process.env.RECOMMENDATION_MOMENT_HALFLIFE_HOURS;
const ORIG_INTERACTION_WEIGHT: string | undefined =
  process.env.RECOMMENDATION_INTERACTION_WEIGHT;

function clearRecommendationEnv() {
  delete process.env.RECOMMENDATION_ARTICLE_HALFLIFE_HOURS;
  delete process.env.RECOMMENDATION_MOMENT_HALFLIFE_HOURS;
  delete process.env.RECOMMENDATION_INTERACTION_WEIGHT;
}

function restoreRecommendationEnv() {
  const setOrDelete = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };
  setOrDelete("RECOMMENDATION_ARTICLE_HALFLIFE_HOURS", ORIG_ARTICLE_HALFLIFE);
  setOrDelete("RECOMMENDATION_MOMENT_HALFLIFE_HOURS", ORIG_MOMENT_HALFLIFE);
  setOrDelete("RECOMMENDATION_INTERACTION_WEIGHT", ORIG_INTERACTION_WEIGHT);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("recommendation formula env var configurability", () => {
  const NOW = new Date("2026-05-04T12:00:00.000Z");

  afterEach(() => {
    restoreRecommendationEnv();
  });

  it("uses default half-life values when no env vars are set (backward compatible)", () => {
    clearRecommendationEnv();

    // Item A: old (50h) with moderate interaction, Item B: new (5h) with zero interaction
    // With default half-life (18h for moment), the new item should rank higher
    // because freshness dominates.
    const items = [
      makeMoment({ id: "old_item", ageHours: 50, likeCount: 2, now: NOW }),
      makeMoment({ id: "new_item", ageHours: 5, likeCount: 0, now: NOW }),
    ];

    const ranked = rankFeedItemsByRecommendation(items, { now: NOW, type: "moment" });
    expect(ranked[0]?.id).toBe("new_item");
    expect(ranked[1]?.id).toBe("old_item");
  });

  it("uses default interaction weight when no env vars are set (backward compatible)", () => {
    clearRecommendationEnv();

    // Item A: old (50h) with moderate interaction, Item B: new (2h) with zero interaction
    // With default weight (0.58), the old item's interaction still gives it advantage.
    // If weight were very low, the new item would rank higher.
    const items = [
      makeMoment({ id: "old_interactive", ageHours: 50, likeCount: 20, now: NOW }),
      makeMoment({ id: "new_bare", ageHours: 2, likeCount: 0, now: NOW }),
    ];

    const ranked = rankFeedItemsByRecommendation(items, { now: NOW, type: "moment" });
    // With default weight 0.58, old_interactive should still rank higher
    // (interaction from 20 likes * ln(1+20) * weight survives freshness decay)
    expect(ranked[0]?.id).toBe("old_interactive");
    expect(ranked[1]?.id).toBe("new_bare");
  });

  it("respects RECOMMENDATION_MOMENT_HALFLIFE_HOURS env var", () => {
    clearRecommendationEnv();
    process.env.RECOMMENDATION_MOMENT_HALFLIFE_HOURS = "1";

    // Same scenario as first test: old (50h) vs new (5h)
    // With half-life=1h, both items decay to near-zero freshness.
    // The old item still has some interaction score, so it should rank higher.
    const items = [
      makeMoment({ id: "old_item", ageHours: 50, likeCount: 2, now: NOW }),
      makeMoment({ id: "new_item", ageHours: 5, likeCount: 0, now: NOW }),
    ];

    const ranked = rankFeedItemsByRecommendation(items, { now: NOW, type: "moment" });
    // Order should flip compared to default half-life
    expect(ranked[0]?.id).toBe("old_item");
    expect(ranked[1]?.id).toBe("new_item");
  });

  it("respects RECOMMENDATION_ARTICLE_HALFLIFE_HOURS env var", () => {
    clearRecommendationEnv();
    process.env.RECOMMENDATION_ARTICLE_HALFLIFE_HOURS = "1";

    // Same logic for article type
    const items = [
      makeArticle({ id: "old_article", ageHours: 100, likeCount: 3, now: NOW }),
      makeArticle({ id: "new_article", ageHours: 4, likeCount: 0, now: NOW }),
    ];

    const ranked = rankFeedItemsByRecommendation(items, { now: NOW, type: "article" });
    // With default article half-life (36h): new_article would win
    // With half-life=1h: both decay fast, old_article has interaction edge
    expect(ranked[0]?.id).toBe("old_article");
    expect(ranked[1]?.id).toBe("new_article");
  });

  it("respects RECOMMENDATION_INTERACTION_WEIGHT env var at low value (0.3)", () => {
    clearRecommendationEnv();
    process.env.RECOMMENDATION_INTERACTION_WEIGHT = "0.3";

    // Item A: old (50h) with high interaction, Item B: new (2h) with zero interaction
    // With weight=0.3, interaction matters less, freshness matters more.
    // So new_bare should rank higher than old_interactive.
    const items = [
      makeMoment({ id: "old_interactive", ageHours: 50, likeCount: 20, now: NOW }),
      makeMoment({ id: "new_bare", ageHours: 2, likeCount: 0, now: NOW }),
    ];

    const ranked = rankFeedItemsByRecommendation(items, { now: NOW, type: "moment" });
    expect(ranked[0]?.id).toBe("new_bare");
    expect(ranked[1]?.id).toBe("old_interactive");
  });

  it("respects RECOMMENDATION_INTERACTION_WEIGHT env var at high value (0.8)", () => {
    clearRecommendationEnv();
    process.env.RECOMMENDATION_INTERACTION_WEIGHT = "0.8";

    // Item A: moderately old (20h) with high interaction, Item B: new (1h) with low interaction
    // With high weight (0.8), interaction matters more.
    // Even though Item B is newer, Item A's high interaction should dominate.
    const items = [
      makeMoment({ id: "high_interaction", ageHours: 20, likeCount: 30, now: NOW }),
      makeMoment({ id: "fresh_low_interaction", ageHours: 1, likeCount: 1, now: NOW }),
    ];

    const ranked = rankFeedItemsByRecommendation(items, { now: NOW, type: "moment" });
    expect(ranked[0]?.id).toBe("high_interaction");
    expect(ranked[1]?.id).toBe("fresh_low_interaction");
  });

  it("handles boundary half-life of 1 hour without error", () => {
    clearRecommendationEnv();
    process.env.RECOMMENDATION_MOMENT_HALFLIFE_HOURS = "1";
    process.env.RECOMMENDATION_ARTICLE_HALFLIFE_HOURS = "1";

    const moment = makeMoment({ id: "m", ageHours: 100, likeCount: 0, now: NOW });
    const article = makeArticle({ id: "a", ageHours: 100, likeCount: 0, now: NOW });

    // Should not throw
    const momentRanked = rankFeedItemsByRecommendation([moment], { now: NOW, type: "moment" });
    expect(momentRanked).toHaveLength(1);
    expect(momentRanked[0]?.id).toBe("m");

    const articleRanked = rankFeedItemsByRecommendation([article], { now: NOW, type: "article" });
    expect(articleRanked).toHaveLength(1);
    expect(articleRanked[0]?.id).toBe("a");
  });

  it("handles boundary interaction weight of 0.3 and 0.8 without error", () => {
    clearRecommendationEnv();

    // Test weight = 0.3
    process.env.RECOMMENDATION_INTERACTION_WEIGHT = "0.3";
    const items1 = [makeMoment({ id: "a", ageHours: 10, likeCount: 5, now: NOW })];
    expect(() =>
      rankFeedItemsByRecommendation(items1, { now: NOW, type: "moment" })
    ).not.toThrow();

    // Test weight = 0.8
    process.env.RECOMMENDATION_INTERACTION_WEIGHT = "0.8";
    const items2 = [makeMoment({ id: "b", ageHours: 10, likeCount: 5, now: NOW })];
    expect(() =>
      rankFeedItemsByRecommendation(items2, { now: NOW, type: "moment" })
    ).not.toThrow();
  });
});
