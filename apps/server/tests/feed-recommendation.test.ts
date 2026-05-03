import { describe, expect, it } from "vitest";
import {
  buildDiversityPenalty,
  rankFeedItemsByRecommendation,
} from "../src/modules/posts/feed-recommendation";
import type {
  FeedRecommendationItem,
  ScoredFeedRecommendationItem,
} from "../src/modules/posts/feed-recommendation";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeItem(
  overrides: Partial<FeedRecommendationItem> = {},
): FeedRecommendationItem {
  return {
    id: "item_1",
    title: "Test Article Title for Diversity Reordering",
    contentPreview:
      "This is a test content preview for diversity penalty calculations in the feed recommendation ranker.",
    viewCount: 100,
    reportCount: 0,
    commentCount: 10,
    engagement: {
      likeCount: 25,
      favoriteCount: 15,
      shareCount: 8,
      viewer: {
        isFollowingAuthor: false,
        hasLiked: false,
        hasFavorited: false,
        hasShared: false,
      },
    },
    author: { id: "author_1", role: "user" },
    images: [],
    videos: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    publishedAt: "2026-05-01T00:00:00.000Z",
    contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
    ...overrides,
  };
}

function makeScoredItem(
  item: FeedRecommendationItem,
  overrides: Partial<ScoredFeedRecommendationItem<FeedRecommendationItem>> = {},
): ScoredFeedRecommendationItem<FeedRecommendationItem> {
  return {
    item,
    baseScore: 100,
    publishedTime: new Date("2026-05-01T00:00:00.000Z").getTime(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildDiversityPenalty
// ---------------------------------------------------------------------------

describe("buildDiversityPenalty", () => {
  it("returns 0 when selected list is empty (article)", () => {
    const candidate = makeItem();
    const penalty = buildDiversityPenalty(candidate, [], "article");
    expect(penalty).toBe(0);
  });

  it("returns 0 when selected list is empty (moment)", () => {
    const candidate = makeItem();
    const penalty = buildDiversityPenalty(candidate, [], "moment");
    expect(penalty).toBe(0);
  });

  it("applies same-author penalty for article type", () => {
    const selected = [
      makeScoredItem(makeItem({ author: { id: "author_1", role: "user" } })),
    ];
    const penalty = buildDiversityPenalty(
      makeItem({ author: { id: "author_1", role: "user" } }),
      selected,
      "article",
    );
    // sameAuthorCount=1 => +8
    // recentItems has author_1 => +12
    // sameCategoryCount=1 (both tech) => +4
    // last item slug=tech => +6
    // stacking: last author=author_1 && last slug=tech => +8
    expect(penalty).toBe(38);
  });

  it("applies same-author penalty for moment type", () => {
    const selected = [
      makeScoredItem(makeItem({ author: { id: "author_1", role: "user" } })),
    ];
    const penalty = buildDiversityPenalty(
      makeItem({ author: { id: "author_1", role: "user" } }),
      selected,
      "moment",
    );
    // sameAuthorCount=1 => +6
    // recentItems has author_1 => +10
    // sameCategoryCount=1 => +5
    // last item slug=tech => +7
    // stacking: last author=author_1 && last slug=tech => +10
    expect(penalty).toBe(38);
  });

  it("handles same author with different category", () => {
    const candidate = makeItem({
      author: { id: "author_1", role: "user" },
      contentCategory: { slug: "design", name: "Design", id: "cat_2" },
    });
    const selected = [
      makeScoredItem(
        makeItem({
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
    ];
    const penalty = buildDiversityPenalty(candidate, selected, "article");
    // sameAuthorCount=1 => +8
    // recentItems has author_1 => +12
    // category slug is "design", selected has "tech" => different => 0
    // last item slug=tech !== "design" => 0
    // stacking: candidate.author=author_1 && candidate.slug=design,
    //   last.author=author_1 same YES, last.slug=tech !== design => NO
    expect(penalty).toBe(20);
  });

  it("handles same category with different author", () => {
    const candidate = makeItem({
      author: { id: "author_2", role: "user" },
      contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
    });
    const selected = [
      makeScoredItem(
        makeItem({
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
    ];
    const penalty = buildDiversityPenalty(candidate, selected, "article");
    // sameAuthorCount=0 (author_2 !== author_1) => 0
    // recentItems no author_2 => 0
    // sameCategoryCount=1 (both tech) => +4
    // last item slug=tech => +6
    // stacking: last.author=author_1 !== author_2 => NO
    expect(penalty).toBe(10);
  });

  it("stacks same-author and same-category penalty when both match", () => {
    const candidate = makeItem({
      author: { id: "author_1", role: "user" },
      contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
    });
    const selected = [
      makeScoredItem(
        makeItem({
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
    ];
    const penalty = buildDiversityPenalty(candidate, selected, "article");
    // sameAuthorCount=1 => +8
    // recentItems has author_1 => +12
    // sameCategoryCount=1 => +4
    // last item slug=tech => +6
    // stacking: last.author=author_1 && last.slug=tech => +8
    expect(penalty).toBe(38);
  });

  it("skips author penalty when author has no id", () => {
    const candidate = makeItem({
      author: { id: undefined, role: "user" },
      contentCategory: { slug: "design", name: "Design", id: "cat_2" },
    });
    const selected = [
      makeScoredItem(
        makeItem({
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
    ];
    const penalty = buildDiversityPenalty(candidate, selected, "article");
    // authorId is undefined => skip author penalty
    // category: slug is "design", selected has "tech", different => 0
    expect(penalty).toBe(0);
  });

  it("skips category penalty when contentCategory is null", () => {
    const candidate = makeItem({
      author: { id: "author_2", role: "user" },
      contentCategory: null,
    });
    const selected = [
      makeScoredItem(
        makeItem({
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
    ];
    const penalty = buildDiversityPenalty(candidate, selected, "article");
    // categorySlug is undefined => skip category penalty
    // author_2 not in selected => 0
    expect(penalty).toBe(0);
  });

  it("penalty increases with more same-author items in selected", () => {
    const candidate = makeItem({
      author: { id: "author_1", role: "user" },
      contentCategory: { slug: "design", name: "Design", id: "cat_2" },
    });
    const selected = [
      makeScoredItem(
        makeItem({
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
      makeScoredItem(
        makeItem({
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "news", name: "News", id: "cat_3" },
        }),
      ),
    ];
    const penalty = buildDiversityPenalty(candidate, selected, "article");
    // sameAuthorCount=2 => +16
    // recentItems=[item1, item2], both author_1 => +12
    // category: candidate slug="design", selected both different => 0
    // No stacking (last.slug !== design)
    expect(penalty).toBe(28);
  });

  it("applies author recent-item penalty only when same author appears in last 2", () => {
    const candidate = makeItem({
      author: { id: "author_5", role: "user" },
      contentCategory: { slug: "design", name: "Design", id: "cat_2" },
    });
    const selected = [
      makeScoredItem(
        makeItem({
          id: "old_author_5",
          author: { id: "author_5", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
      makeScoredItem(
        makeItem({
          id: "recent_1",
          author: { id: "author_1", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
      makeScoredItem(
        makeItem({
          id: "recent_2",
          author: { id: "author_2", role: "user" },
          contentCategory: { slug: "tech", name: "Technology", id: "cat_1" },
        }),
      ),
    ];
    const penalty = buildDiversityPenalty(candidate, selected, "article");
    // sameAuthorCount=1 (only old_author_5 has author_5) => +8
    // recentItems=[recent_1, recent_2] => no author_5 => 0
    // category: design !== tech (both selected have tech) => 0
    expect(penalty).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// rankFeedItemsByRecommendation - diversity behavior
// ---------------------------------------------------------------------------

describe("rankFeedItemsByRecommendation diversity", () => {
  const NOW = new Date("2026-05-04T12:00:00.000Z");

  it("reorders items with same author to improve diversity", () => {
    const items: FeedRecommendationItem[] = [
      makeItem({
        id: "1",
        author: { id: "author_1", role: "user" as const },
        publishedAt: "2026-05-04T11:00:00.000Z",
      }),
      makeItem({
        id: "2",
        author: { id: "author_1", role: "user" as const },
        publishedAt: "2026-05-04T10:00:00.000Z",
      }),
      makeItem({
        id: "3",
        author: { id: "author_2", role: "user" as const },
        publishedAt: "2026-05-04T09:00:00.000Z",
      }),
    ];
    const baseScores = new Map([
      ["1", 100],
      ["2", 80],
      ["3", 75],
    ]);
    const ranked = rankFeedItemsByRecommendation(items, {
      type: "article",
      precomputedBaseScores: baseScores,
      now: NOW,
    });
    // Item 1 (author_1, 100) wins first (highest base, no penalty)
    // Remaining: item 2 (author_1, 80, penalty=8+12+...), item 3 (author_2, 75, no penalty)
    // Item 3 wins second (higher adjusted score)
    // Item 2 is last
    expect(ranked).toHaveLength(3);
    expect(ranked[0]?.id).toBe("1");
    expect(ranked[1]?.id).toBe("3");
    expect(ranked[2]?.id).toBe("2");
  });

  it("produces a diverse ordering for 5 items with 3 authors", () => {
    const items: FeedRecommendationItem[] = [
      makeItem({
        id: "1",
        author: { id: "author_1", role: "user" as const },
        contentCategory: { slug: "tech", name: "Tech", id: "cat_1" },
        publishedAt: "2026-05-04T11:00:00.000Z",
      }),
      makeItem({
        id: "2",
        author: { id: "author_1", role: "user" as const },
        contentCategory: { slug: "tech", name: "Tech", id: "cat_1" },
        publishedAt: "2026-05-04T10:00:00.000Z",
      }),
      makeItem({
        id: "3",
        author: { id: "author_2", role: "user" as const },
        contentCategory: { slug: "design", name: "Design", id: "cat_2" },
        publishedAt: "2026-05-04T09:00:00.000Z",
      }),
      makeItem({
        id: "4",
        author: { id: "author_2", role: "user" as const },
        contentCategory: { slug: "design", name: "Design", id: "cat_2" },
        publishedAt: "2026-05-04T08:00:00.000Z",
      }),
      makeItem({
        id: "5",
        author: { id: "author_3", role: "user" as const },
        contentCategory: { slug: "business", name: "Business", id: "cat_3" },
        publishedAt: "2026-05-04T07:00:00.000Z",
      }),
    ];
    const baseScores = new Map([
      ["1", 100],
      ["2", 95],
      ["3", 90],
      ["4", 85],
      ["5", 80],
    ]);
    const ranked = rankFeedItemsByRecommendation(items, {
      type: "article",
      precomputedBaseScores: baseScores,
      now: NOW,
    });
    expect(ranked).toHaveLength(5);
    const rankedIds = ranked.map((item) => item.id);
    // Verify all original items are present
    expect(new Set(rankedIds)).toEqual(new Set(["1", "2", "3", "4", "5"]));
    // Item 1 (highest base score) should be first
    expect(ranked[0]?.id).toBe("1");
    // The second item should NOT be item 2 (same author as item 1)
    expect(ranked[1]?.id).not.toBe("2");
  });

  it("handles 10 items with mixed authors and categories", () => {
    const items: FeedRecommendationItem[] = [];
    const baseScores = new Map<string, number>();
    const authors = ["author_a", "author_b", "author_c"];
    const categories = [
      { slug: "tech", name: "Tech", id: "cat_1" },
      { slug: "design", name: "Design", id: "cat_2" },
      { slug: "business", name: "Business", id: "cat_3" },
    ];
    for (let index = 0; index < 10; index += 1) {
      const id = `item_${index}`;
      const authorIndex = index % authors.length;
      const categoryIndex = index % categories.length;
      items.push(
        makeItem({
          id,
          author: {
            id: authors[authorIndex] ?? "author_a",
            role: "user" as const,
          },
          contentCategory: categories[categoryIndex] ?? categories[0],
          publishedAt: new Date(
            NOW.getTime() - index * 3_600_000,
          ).toISOString(),
          title: `Item ${index}`,
        }),
      );
      baseScores.set(id, 100 - index);
    }
    const ranked = rankFeedItemsByRecommendation(items, {
      type: "article",
      precomputedBaseScores: baseScores,
      now: NOW,
    });
    expect(ranked).toHaveLength(10);
    const rankedIds = new Set(ranked.map((item) => item.id));
    const originalIds = new Set(items.map((item) => item.id));
    expect(rankedIds).toEqual(originalIds);
  });

  it("does not lose or duplicate items during ranking", () => {
    const items: FeedRecommendationItem[] = Array.from(
      { length: 10 },
      (_, index) =>
        makeItem({
          id: `dup_test_${index}`,
          author: { id: "single_author", role: "user" as const },
          contentCategory: { slug: "same_cat", name: "Same", id: "cat_x" },
          publishedAt: new Date(
            NOW.getTime() - index * 3_600_000,
          ).toISOString(),
        }),
    );
    const baseScores = new Map(
      items.map((item, index) => [item.id, 100 - index]),
    );
    const ranked = rankFeedItemsByRecommendation(items, {
      type: "article",
      precomputedBaseScores: baseScores,
      now: NOW,
    });
    expect(ranked).toHaveLength(10);
    // Verify all items are present and no duplicates
    const rankedIds = ranked.map((item) => item.id);
    expect(new Set(rankedIds).size).toBe(10);
    expect(rankedIds.sort()).toEqual(
      items.map((item) => item.id).sort(),
    );
  });

  it("uses precomputedBaseScores when provided", () => {
    const items: FeedRecommendationItem[] = [
      makeItem({
        id: "high_score",
        contentPreview: "x",
        title: "x",
        viewCount: 0,
        reportCount: 0,
        commentCount: 0,
        engagement: {
          likeCount: 0,
          favoriteCount: 0,
          shareCount: 0,
          viewer: {
            isFollowingAuthor: false,
            hasLiked: false,
            hasFavorited: false,
            hasShared: false,
          },
        },
      }),
      makeItem({
        id: "low_score",
        contentPreview: "x",
        title: "x",
        viewCount: 0,
        reportCount: 0,
        commentCount: 0,
        engagement: {
          likeCount: 0,
          favoriteCount: 0,
          shareCount: 0,
          viewer: {
            isFollowingAuthor: false,
            hasLiked: false,
            hasFavorited: false,
            hasShared: false,
          },
        },
      }),
    ];
    const baseScores = new Map([
      ["high_score", 200],
      ["low_score", 1],
    ]);
    const ranked = rankFeedItemsByRecommendation(items, {
      type: "article",
      precomputedBaseScores: baseScores,
      now: NOW,
    });
    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.id).toBe("high_score");
    expect(ranked[1]?.id).toBe("low_score");
  });

  it("preserves the original items array (immutability)", () => {
    const items: FeedRecommendationItem[] = [
      makeItem({ id: "1" }),
      makeItem({ id: "2" }),
    ];
    const originalIds = items.map((item) => item.id);
    rankFeedItemsByRecommendation(items, {
      type: "article",
      now: NOW,
    });
    // Original array should be unchanged
    expect(items.map((item) => item.id)).toEqual(originalIds);
  });
});
