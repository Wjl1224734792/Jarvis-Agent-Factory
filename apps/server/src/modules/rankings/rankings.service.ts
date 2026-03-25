import type {
  RankingDetail,
  RankingItem,
  RankingListItem
} from "@feijia/schemas";
import { powerTypeSchema } from "@feijia/schemas";
import { rankingsRepo } from "./rankings.repo";

const BAYESIAN_BASELINE_REVIEW_COUNT = 5;

function toTenPointScore(rawAverage: number): number {
  if (rawAverage <= 0) {
    return 0;
  }

  return Number((rawAverage * 2).toFixed(1));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function serializeRankingItem(
  item: Awaited<ReturnType<typeof rankingsRepo.listRankingItems>>[number],
  aggregateMap: Map<string, { totalRatings: number; averageRaw: number }>,
  userRatingMap: Map<string, number | null>
): RankingItem {
  const aggregate = aggregateMap.get(item.id) ?? {
    totalRatings: 0,
    averageRaw: 0
  };

  return {
    id: item.id,
    rankingId: item.rankingId,
    rank: item.rank,
    title: item.title,
    summary: item.summary,
    imageUrl: item.imageUrl,
    brandName: item.brandName,
    linkedModel: item.linkedModel?.id
      ? {
          id: item.linkedModel.id,
          slug: item.linkedModel.slug,
          name: item.linkedModel.name,
          summary: item.linkedModel.summary,
          powerType: powerTypeSchema.parse(item.linkedModel.powerType),
          category: item.linkedModel.category,
          brand: item.linkedModel.brand
        }
      : null,
    averageScore: toTenPointScore(aggregate.averageRaw),
    totalRatings: aggregate.totalRatings,
    commentCount: item.commentCount,
    myRating: userRatingMap.get(item.id) ?? null
  };
}

function serializeRankingComment(
  item: Awaited<ReturnType<typeof rankingsRepo.listRankingComments>>[number]
) {
  return {
    id: item.id,
    rankingId: item.rankingId,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    }
  };
}

function serializeRankingItemComment(
  item: Awaited<ReturnType<typeof rankingsRepo.listRankingItemComments>>[number]
) {
  return {
    id: item.id,
    rankingItemId: item.rankingItemId,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    }
  };
}

export const rankingsService = {
  async listRankings(currentUserId?: string) {
    const [models, aggregates, currentUserRatings, rankings] = await Promise.all([
      rankingsRepo.listPublishedModels(),
      rankingsRepo.listVisibleReviewAggregates(),
      currentUserId ? rankingsRepo.listUserRatings(currentUserId) : Promise.resolve([]),
      rankingsRepo.listRankings()
    ]);

    const aggregateMap = new Map(
      aggregates.map((item) => [
        item.modelId,
        {
          totalReviews: Number(item.totalReviews ?? 0),
          averageRaw: Number(item.averageRaw ?? 0)
        }
      ])
    );
    const ratingMap = new Map(currentUserRatings.map((item) => [item.modelId, item.rating]));
    const visibleAggregates = Array.from(aggregateMap.values()).filter((item) => item.totalReviews > 0);
    const globalAverageRaw =
      visibleAggregates.length > 0
        ? visibleAggregates.reduce((sum, item) => sum + item.averageRaw, 0) / visibleAggregates.length
        : 0;

    const officialItems: RankingItem[] = models
      .map((model, index) => {
        const aggregate = aggregateMap.get(model.id) ?? { totalReviews: 0, averageRaw: 0 };
        const bayesianRaw =
          aggregate.totalReviews > 0
            ? (aggregate.averageRaw * aggregate.totalReviews + globalAverageRaw * BAYESIAN_BASELINE_REVIEW_COUNT) /
              (aggregate.totalReviews + BAYESIAN_BASELINE_REVIEW_COUNT)
            : 0;

        return {
          id: `official-${model.id}`,
          rankingId: "official",
          rank: index + 1,
          title: model.name,
          summary: model.summary,
          imageUrl: null,
          brandName: model.brand.name,
          linkedModel: {
            ...model,
            powerType: powerTypeSchema.parse(model.powerType)
          },
          averageScore: toTenPointScore(bayesianRaw),
          totalRatings: aggregate.totalReviews,
          commentCount: 0,
          myRating: ratingMap.get(model.id) ?? null
        } satisfies RankingItem;
      })
      .sort((a, b) => b.averageScore - a.averageScore || b.totalRatings - a.totalRatings);

    const rankingItemsByRanking = new Map<string, Awaited<ReturnType<typeof rankingsRepo.listRankingItems>>>();
    await Promise.all(
      rankings.map(async (ranking) => {
        const items = await rankingsRepo.listRankingItems(ranking.id);
        rankingItemsByRanking.set(ranking.id, items);
      })
    );

    const allRankingItemIds = Array.from(rankingItemsByRanking.values()).flat().map((item) => item.id);
    const [itemAggregates, userItemRatings] = await Promise.all([
      rankingsRepo.listRankingItemRatingAggregates(allRankingItemIds),
      currentUserId ? rankingsRepo.listUserRankingItemRatings(currentUserId, allRankingItemIds) : Promise.resolve([])
    ]);
    const itemAggregateMap = new Map(
      itemAggregates.map((item) => [
        item.rankingItemId,
        {
          totalRatings: Number(item.totalRatings ?? 0),
          averageRaw: Number(item.averageRaw ?? 0)
        }
      ])
    );
    const userItemRatingMap = new Map(userItemRatings.map((item) => [item.rankingItemId, item.rating]));

    const community: RankingListItem[] = rankings.map((ranking) => {
      const items = (rankingItemsByRanking.get(ranking.id) ?? []).map((item) =>
        serializeRankingItem(item, itemAggregateMap, userItemRatingMap)
      );
      const averageScore = average(items.map((item) => item.averageScore).filter((value) => value > 0));

      return {
        id: ranking.id,
        type: ranking.type as "official" | "community",
        title: ranking.title,
        description: ranking.description,
        coverImageUrl: ranking.coverImageUrl,
        averageScore,
        commentCount: ranking.commentCount,
        itemCount: items.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          role: ranking.author.role as "user" | "admin"
        },
        items: items.slice(0, 3)
      };
    });

    return {
      official: {
        title: "飞行器官方榜",
        description: "按综合评分与点评人数生成，优先展示已形成真实口碑的机型。",
        algorithmNote: "官方榜基于机型点评聚合与基础平滑计算。",
        generatedAt: new Date().toISOString(),
        spotlight: officialItems[0] ?? null,
        items: officialItems
      },
      community
    };
  },
  async createRanking(
    currentUserId: string,
    input: {
      title: string;
      description: string;
      coverImageUrl: string | null;
      items: Array<{
        title: string;
        summary: string | null;
        imageUrl: string | null;
        brandName: string | null;
        linkedModelSlug: string | null;
      }>;
    }
  ) {
    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));
    const ranking = await rankingsRepo.createRanking({
      authorId: currentUserId,
      title: input.title,
      description: input.description,
      coverImageUrl: input.coverImageUrl
    });

    if (!ranking) {
      return null;
    }

    await rankingsRepo.createRankingItems(
      ranking.id,
      input.items.map((item, index) => ({
        rank: index + 1,
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        brandName: item.brandName,
        linkedModelId: item.linkedModelSlug ? modelBySlug.get(item.linkedModelSlug)?.id ?? null : null
      }))
    );

    return this.getRankingDetail(ranking.id, currentUserId);
  },
  async getRankingDetail(id: string, currentUserId?: string): Promise<{ item: RankingDetail } | null> {
    const ranking = await rankingsRepo.getRankingById(id);
    if (!ranking) {
      return null;
    }

    const items = await rankingsRepo.listRankingItems(id);
    const [comments, aggregates, userRatings] = await Promise.all([
      rankingsRepo.listRankingComments(id),
      rankingsRepo.listRankingItemRatingAggregates(items.map((item) => item.id)),
      currentUserId ? rankingsRepo.listUserRankingItemRatings(currentUserId, items.map((item) => item.id)) : Promise.resolve([])
    ]);
    const aggregateMap = new Map(
      aggregates.map((item) => [item.rankingItemId, { totalRatings: Number(item.totalRatings ?? 0), averageRaw: Number(item.averageRaw ?? 0) }])
    );
    const userRatingMap = new Map(userRatings.map((item) => [item.rankingItemId, item.rating]));
    const serializedItems = items.map((item) => serializeRankingItem(item, aggregateMap, userRatingMap));

    return {
      item: {
        id: ranking.id,
        type: ranking.type as "official" | "community",
        title: ranking.title,
        description: ranking.description,
        coverImageUrl: ranking.coverImageUrl,
        averageScore: average(serializedItems.map((item) => item.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        itemCount: serializedItems.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          role: ranking.author.role as "user" | "admin"
        },
        comments: comments.map(serializeRankingComment),
        items: serializedItems
      }
    };
  },
  async createRankingComment(rankingId: string, currentUserId: string, content: string) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return null;
    }

    const item = await rankingsRepo.createRankingComment({
      rankingId,
      authorId: currentUserId,
      content
    });

    return item ? { item: serializeRankingComment(item) } : null;
  },
  async getRankingItemDetail(id: string, currentUserId?: string) {
    const item = await rankingsRepo.getRankingItemById(id);
    if (!item) {
      return null;
    }

    const ranking = await rankingsRepo.getRankingById(item.rankingId);
    if (!ranking) {
      return null;
    }

    const [aggregates, userRatings, comments] = await Promise.all([
      rankingsRepo.listRankingItemRatingAggregates([id]),
      currentUserId ? rankingsRepo.listUserRankingItemRatings(currentUserId, [id]) : Promise.resolve([]),
      rankingsRepo.listRankingItemComments(id)
    ]);
    const aggregateMap = new Map(
      aggregates.map((entry) => [entry.rankingItemId, { totalRatings: Number(entry.totalRatings ?? 0), averageRaw: Number(entry.averageRaw ?? 0) }])
    );
    const userRatingMap = new Map(userRatings.map((entry) => [entry.rankingItemId, entry.rating]));
    const serializedItem = serializeRankingItem(item, aggregateMap, userRatingMap);

    return {
      item: {
        ...serializedItem,
        ranking: {
          id: ranking.id,
          title: ranking.title
        },
        comments: comments.map(serializeRankingItemComment)
      }
    };
  },
  async submitRankingItemRating(id: string, currentUserId: string, rating: number) {
    const existing = await rankingsRepo.getRankingItemById(id);
    if (!existing) {
      return null;
    }

    await rankingsRepo.upsertRankingItemRating({
      rankingItemId: id,
      userId: currentUserId,
      rating
    });

    const payload = await this.getRankingItemDetail(id, currentUserId);
    if (!payload) {
      return null;
    }

    return {
      item: {
        id: payload.item.id,
        rankingId: payload.item.rankingId,
        rank: payload.item.rank,
        title: payload.item.title,
        summary: payload.item.summary,
        imageUrl: payload.item.imageUrl,
        brandName: payload.item.brandName,
        linkedModel: payload.item.linkedModel,
        averageScore: payload.item.averageScore,
        totalRatings: payload.item.totalRatings,
        commentCount: payload.item.commentCount,
        myRating: payload.item.myRating
      }
    };
  },
  async createRankingItemComment(id: string, currentUserId: string, content: string) {
    const existing = await rankingsRepo.getRankingItemById(id);
    if (!existing) {
      return null;
    }

    const item = await rankingsRepo.createRankingItemComment({
      rankingItemId: id,
      authorId: currentUserId,
      content
    });

    return item ? { item: serializeRankingItemComment(item) } : null;
  }
};
