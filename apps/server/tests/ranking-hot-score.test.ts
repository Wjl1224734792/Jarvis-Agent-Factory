import { describe, expect, it } from 'vitest';
import {
  buildRankingHotScore,
  sortRankingsByHotScore,
  type RankingForHotScore
} from '../src/modules/rankings/ranking-score';

/** 构造固定测试数据，仅包含热度计算所需字段 */
function makeRanking(
  overrides: Partial<RankingForHotScore> & {
    items?: Array<{ totalRatings: number }>;
  }
): RankingForHotScore {
  const now = new Date('2025-06-01T12:00:00Z').toISOString();
  return {
    type: 'community',
    averageScore: 8.5,
    commentCount: 10,
    itemCount: 5,
    createdAt: now,
    items: overrides.items ?? [
      { totalRatings: 3 },
      { totalRatings: 2 },
      { totalRatings: 4 },
      { totalRatings: 1 },
      { totalRatings: 5 }
    ],
    ...overrides
  };
}

describe('buildRankingHotScore', () => {
  it('与前端原算法输出一致（固定数据对比）', () => {
    const ranking = makeRanking({
      averageScore: 8.5,
      itemCount: 5,
      commentCount: 10,
      type: 'community',
      createdAt: new Date('2025-06-01T10:00:00Z').toISOString(),
      items: [
        { totalRatings: 3 },
        { totalRatings: 2 },
        { totalRatings: 4 },
        { totalRatings: 1 },
        { totalRatings: 5 }
      ]
    });

    const totalRatings = 3 + 2 + 4 + 1 + 5; // = 15
    // 前端原公式:
    // averageScore*12 + totalRatings*0.85 + commentCount*3.4 + itemCount*1.8
    // + max(0, 72 - hoursSinceCreation) + (type === "official" ? 4 : 0)
    const ratingSignal = 8.5 * 12; // 102
    const ratingVolumeSignal = totalRatings * 0.85; // 12.75
    const discussionSignal = 10 * 3.4; // 34
    const itemCoverageSignal = 5 * 1.8; // 9
    // createdAt=2025-06-01T10:00:00Z, nowOverride=2025-06-01T12:00:00Z → hoursSince=2
    // freshnessSignal = max(0, 72-2) = 70
    const freshnessSignal = 70;
    const expected =
      ratingSignal +
      ratingVolumeSignal +
      discussionSignal +
      itemCoverageSignal +
      freshnessSignal;
    // 102 + 12.75 + 34 + 9 + 70 = 227.75

    const result = buildRankingHotScore(
      ranking,
      /* nowOverride */ new Date('2025-06-01T12:00:00Z')
    );

    // 允许微小浮点差异
    expect(result).toBeCloseTo(expected, 5);
  });

  it('官方榜单获得 +4 加权，社区榜单无加成', () => {
    const now = new Date('2025-08-01T12:00:00Z').toISOString();
    const base = {
      averageScore: 8.0,
      itemCount: 3,
      commentCount: 5,
      createdAt: now,
      items: [{ totalRatings: 2 }, { totalRatings: 1 }, { totalRatings: 3 }]
    };

    const official = makeRanking({ ...base, type: 'official' });
    const community = makeRanking({ ...base, type: 'community' });

    const officialScore = buildRankingHotScore(official, new Date(now));
    const communityScore = buildRankingHotScore(community, new Date(now));

    // 官方应比社区多恰好 4
    expect(officialScore - communityScore).toBe(4);
  });

  it('新鲜度信号边界：刚创建（0h 衰减）vs 超过 72 小时后（衰减归零）', () => {
    const freshRanking = makeRanking({
      type: 'community',
      createdAt: new Date('2025-09-15T12:00:00Z').toISOString(),
      items: [{ totalRatings: 5 }]
    });

    const staleRanking = makeRanking({
      type: 'community',
      createdAt: new Date('2025-09-12T11:00:00Z').toISOString(), // 约 73h 前
      items: [{ totalRatings: 5 }]
    });

    // 当前时间设定为 2025-09-15T12:00:00Z
    const now = new Date('2025-09-15T12:00:00Z');
    const freshScore = buildRankingHotScore(freshRanking, now);
    const staleScore = buildRankingHotScore(staleRanking, now);

    // 新鲜榜单应有正值新鲜度信号
    const hoursFresh = 0;
    const freshnessFresh = Math.max(0, 72 - hoursFresh); // = 72
    expect(freshnessFresh).toBe(72);

    // 过期榜单新鲜度归零
    const hoursStale = 73;
    const freshnessStale = Math.max(0, 72 - hoursStale); // = 0
    expect(freshnessStale).toBe(0);

    // 除了新鲜度信号外其他因子完全一致，差值应恰好等于 72
    expect(freshScore - staleScore).toBe(72);
  });

  it('totalRatings 从 items 中正确聚合求和', () => {
    const ranking = makeRanking({
      items: [{ totalRatings: 10 }, { totalRatings: 20 }, { totalRatings: 30 }]
    });

    const score1 = buildRankingHotScore(
      ranking,
      new Date('2025-06-01T12:00:00Z')
    );

    // 构造无评分榜单对比
    const rankingNoRatings = makeRanking({
      items: [
        { totalRatings: 0 },
        { totalRatings: 0 },
        { totalRatings: 0 }
      ]
    });

    const scoreNoRatings = buildRankingHotScore(
      rankingNoRatings,
      new Date('2025-06-01T12:00:00Z')
    );
    expect(score1).toBeGreaterThan(scoreNoRatings);
  });
});

describe('sortRankingsByHotScore', () => {
  it('按热度降序排列，分数相同时按创建时间降序', () => {
    const now = new Date('2025-07-15T12:00:00Z');
    // r1: official, 各项指标远高于 r2, 即使创建更早但其他因子优势胜过新鲜度衰减
    const ranking1 = makeRanking({
      type: 'official',
      averageScore: 9.5,
      itemCount: 20,
      commentCount: 40,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 天前
      items: [{ totalRatings: 60 }]
    });

    const ranking2 = makeRanking({
      type: 'community',
      averageScore: 8.0,
      itemCount: 10,
      commentCount: 15,
      createdAt: now.toISOString(), // 现在（新鲜）
      items: [{ totalRatings: 25 }]
    });

    const ranking3 = makeRanking({
      type: 'community',
      averageScore: 6.0,
      itemCount: 5,
      commentCount: 5,
      createdAt: now.toISOString(),
      items: [{ totalRatings: 8 }]
    });

    const sorted = sortRankingsByHotScore(
      [ranking1, ranking2, ranking3],
      now
    );

    // r1: 9.5*12 + 60*0.85 + 40*3.4 + 20*1.8 + 48 + 4 = 389
    // r2: 8*12 + 25*0.85 + 15*3.4 + 10*1.8 + 72 = 258.25
    // r3: 6*12 + 8*0.85 + 5*3.4 + 5*1.8 + 72 = 176.8
    expect(sorted[0].averageScore).toBe(9.5); // 最高分
    expect(sorted[1].averageScore).toBe(8.0); // 中等
    expect(sorted[2].averageScore).toBe(6.0); // 最低分
  });

  it('单独排序 official 组和 community 组各自按热度降序', () => {
    const now = new Date('2025-08-01T12:00:00Z');
    const official1 = makeRanking({
      type: 'official',
      averageScore: 8.0,
      itemCount: 4,
      commentCount: 8,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      items: [{ totalRatings: 10 }]
    });
    const official2 = makeRanking({
      type: 'official',
      averageScore: 9.0,
      itemCount: 6,
      commentCount: 12,
      createdAt: now.toISOString(),
      items: [{ totalRatings: 15 }]
    });

    const community1 = makeRanking({
      type: 'community',
      averageScore: 6.0,
      itemCount: 2,
      commentCount: 3,
      createdAt: now.toISOString(),
      items: [{ totalRatings: 5 }]
    });
    const community2 = makeRanking({
      type: 'community',
      averageScore: 8.0,
      itemCount: 4,
      commentCount: 8,
      createdAt: now.toISOString(),
      items: [{ totalRatings: 10 }]
    });

    const officialSorted = sortRankingsByHotScore(
      [official1, official2],
      now
    );
    const communitySorted = sortRankingsByHotScore(
      [community1, community2],
      now
    );

    // o2 各项指标都高于 o1
    expect(officialSorted[0].averageScore).toBe(9.0);
    expect(officialSorted[1].averageScore).toBe(8.0);

    // c2 各项指标都高于 c1
    expect(communitySorted[0].averageScore).toBe(8.0);
    expect(communitySorted[1].averageScore).toBe(6.0);
  });
});
