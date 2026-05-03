import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildModelHotScore,
  sortModelsByHotScore,
} from "../src/modules/aircraft-models/model-hot-score";

// Save original env values for restoration
const ORIGINAL_VIEW_WEIGHT = process.env.MODEL_HOT_VIEW_WEIGHT;
const ORIGINAL_SEARCH_WEIGHT = process.env.MODEL_HOT_SEARCH_WEIGHT;
const ORIGINAL_RANKING_REF_WEIGHT = process.env.MODEL_HOT_RANKING_REF_WEIGHT;

beforeEach(() => {
  // Reset env vars to defaults for each test
  delete process.env.MODEL_HOT_VIEW_WEIGHT;
  delete process.env.MODEL_HOT_SEARCH_WEIGHT;
  delete process.env.MODEL_HOT_RANKING_REF_WEIGHT;
});

// Cleanup after all tests
afterEach(() => {
  if (ORIGINAL_VIEW_WEIGHT !== undefined) {
    process.env.MODEL_HOT_VIEW_WEIGHT = ORIGINAL_VIEW_WEIGHT;
  } else {
    delete process.env.MODEL_HOT_VIEW_WEIGHT;
  }
  if (ORIGINAL_SEARCH_WEIGHT !== undefined) {
    process.env.MODEL_HOT_SEARCH_WEIGHT = ORIGINAL_SEARCH_WEIGHT;
  } else {
    delete process.env.MODEL_HOT_SEARCH_WEIGHT;
  }
  if (ORIGINAL_RANKING_REF_WEIGHT !== undefined) {
    process.env.MODEL_HOT_RANKING_REF_WEIGHT = ORIGINAL_RANKING_REF_WEIGHT;
  } else {
    delete process.env.MODEL_HOT_RANKING_REF_WEIGHT;
  }
});

describe("buildModelHotScore", () => {
  it("includes original factors: favoriteCount, commentCount, reviewCount, freshness", () => {
    const score = buildModelHotScore({
      favoriteCount: 10,
      commentCount: 5,
      reviewCount: 2,
      createdAt: new Date(),
    });

    // favoriteCount*4 + commentCount*3 + reviewCount*2 + freshness(72)
    expect(score).toBe(10 * 4 + 5 * 3 + 2 * 2 + 72);
  });

  it("adds recentViewCount contribution with default weight 0.5", () => {
    const base = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    const withViews = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
      recentViewCount: 100,
    });

    // 100 * 0.5 = 50
    expect(withViews).toBe(base + 50);
  });

  it("adds recentSearchCount contribution with default weight 2.0", () => {
    const base = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    const withSearches = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
      recentSearchCount: 10,
    });

    // 10 * 2.0 = 20
    expect(withSearches).toBe(base + 20);
  });

  it("adds rankingReferenceCount contribution with default weight 8.0", () => {
    const base = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    const withRankingRefs = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
      rankingReferenceCount: 5,
    });

    // 5 * 8.0 = 40
    expect(withRankingRefs).toBe(base + 40);
  });

  it("combines all new factors correctly in the total score", () => {
    const score = buildModelHotScore({
      favoriteCount: 10,
      commentCount: 5,
      reviewCount: 2,
      createdAt: new Date(),
      recentViewCount: 100,
      recentSearchCount: 10,
      rankingReferenceCount: 5,
    });

    // expected: 10*4 + 5*3 + 2*2 + 72 + 100*0.5 + 10*2.0 + 5*8.0
    // = 40 + 15 + 4 + 72 + 50 + 20 + 40
    // = 241
    expect(score).toBe(241);
  });

  it("defaults new fields to 0 when not provided (backward compatibility)", () => {
    const scoreWithNewFields = buildModelHotScore({
      favoriteCount: 10,
      commentCount: 5,
      reviewCount: 2,
      createdAt: new Date(),
      recentViewCount: 0,
      recentSearchCount: 0,
      rankingReferenceCount: 0,
    });

    const scoreWithoutNewFields = buildModelHotScore({
      favoriteCount: 10,
      commentCount: 5,
      reviewCount: 2,
      createdAt: new Date(),
    });

    expect(scoreWithoutNewFields).toBe(scoreWithNewFields);
  });

  it("uses MODEL_HOT_VIEW_WEIGHT env var for view weight override", () => {
    process.env.MODEL_HOT_VIEW_WEIGHT = "1.0";

    const base = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    const withViews = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
      recentViewCount: 100,
    });

    // 100 * 1.0 = 100
    expect(withViews).toBe(base + 100);
  });

  it("uses MODEL_HOT_SEARCH_WEIGHT env var for search weight override", () => {
    process.env.MODEL_HOT_SEARCH_WEIGHT = "5.0";

    const base = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    const withSearches = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
      recentSearchCount: 10,
    });

    // 10 * 5.0 = 50
    expect(withSearches).toBe(base + 50);
  });

  it("uses MODEL_HOT_RANKING_REF_WEIGHT env var for ranking ref weight override", () => {
    process.env.MODEL_HOT_RANKING_REF_WEIGHT = "10.0";

    const base = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    const withRefs = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
      rankingReferenceCount: 5,
    });

    // 5 * 10.0 = 50
    expect(withRefs).toBe(base + 50);
  });

  it("falls back to default weight when env var is not a valid number", () => {
    process.env.MODEL_HOT_VIEW_WEIGHT = "not-a-number";

    const base = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    const withViews = buildModelHotScore({
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt: new Date(),
      recentViewCount: 100,
    });

    // Falls back to default 0.5
    expect(withViews).toBe(base + 50);
  });
});

describe("sortModelsByHotScore", () => {
  it("sorts models with higher new dimension values to the front", () => {
    const now = new Date("2025-06-01T00:00:00Z");
    const createdAt = new Date("2025-05-30T00:00:00Z");

    const lowViewModel = {
      slug: "low-view",
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt,
      recentViewCount: 1,
      recentSearchCount: 0,
      rankingReferenceCount: 0,
    };

    const highViewModel = {
      slug: "high-view",
      favoriteCount: 0,
      commentCount: 0,
      reviewCount: 0,
      createdAt,
      recentViewCount: 100,
      recentSearchCount: 0,
      rankingReferenceCount: 0,
    };

    const sorted = sortModelsByHotScore([lowViewModel, highViewModel], now);
    expect(sorted).toHaveLength(2);
    expect(sorted[0]?.slug).toBe("high-view");
    expect(sorted[1]?.slug).toBe("low-view");
  });

  it("works with models that have no new dimension fields (backward compatible)", () => {
    const now = new Date("2025-06-01T00:00:00Z");
    const createdAt = new Date("2025-05-30T00:00:00Z");

    const modelOld = {
      slug: "old-format",
      favoriteCount: 5,
      commentCount: 3,
      reviewCount: 1,
      createdAt,
    };

    const modelNew = {
      slug: "new-format",
      favoriteCount: 5,
      commentCount: 3,
      reviewCount: 1,
      createdAt,
      recentViewCount: 0,
      recentSearchCount: 0,
      rankingReferenceCount: 0,
    };

    const sorted = sortModelsByHotScore([modelOld, modelNew], now);
    // Both should have same score, tie-break by createdAt (both same)
    expect(sorted).toHaveLength(2);
  });
});
