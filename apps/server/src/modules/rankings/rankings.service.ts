import type { RankingDetail, RankingItem, RankingListItem } from "@feijia/schemas";
import { powerTypeSchema } from "@feijia/schemas";
import { reviewsRepo } from "../reviews/reviews.repo";
import { rankingsRepo } from "./rankings.repo";

const BAYESIAN_BASELINE_REVIEW_COUNT = 5;
const OFFICIAL_RANKING_DEFINITIONS = [
  {
    id: "official-endurance",
    title: "续航之王",
    description: "聚合续航、稳定性与真实口碑形成的官方只读榜单。",
    startIndex: 0
  },
  {
    id: "official-value",
    title: "性价比之选",
    description: "围绕综合投入产出比整理的官方只读榜单。",
    startIndex: 1
  },
  {
    id: "official-utility",
    title: "实用优先",
    description: "偏向日常飞行与高频使用场景的官方只读榜单。",
    startIndex: 2
  }
] as const;

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

function serializeRankingItemReview(
  item: Awaited<ReturnType<typeof rankingsRepo.listRankingItemReviews>>[number]
) {
  if (item.rating === null) {
    return null;
  }

  return {
    id: item.id,
    rankingItemId: item.rankingItemId,
    content: item.content,
    rating: item.rating,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    }
  };
}

function toRankingViewer(input: {
  currentUserId?: string;
  authorId: string;
  itemAddPolicy: "public" | "owner";
  isOfficial?: boolean;
}) {
  if (input.isOfficial) {
    return {
      canEdit: false,
      canAddItems: false
    };
  }

  const canEdit = Boolean(input.currentUserId && input.currentUserId === input.authorId);
  return {
    canEdit,
    canAddItems: Boolean(input.currentUserId) && (canEdit || input.itemAddPolicy === "public")
  };
}

async function listOfficialRankingItems(currentUserId?: string) {
  const [models, aggregates, currentUserRatings] = await Promise.all([
    rankingsRepo.listPublishedModels(),
    rankingsRepo.listVisibleReviewAggregates(),
    currentUserId ? rankingsRepo.listUserRatings(currentUserId) : Promise.resolve([])
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

  return models
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
}

function buildOfficialRankingDetail(
  id: string,
  currentUserId: string | undefined,
  officialItems: RankingItem[]
): { item: RankingDetail } | null {
  const definition =
    OFFICIAL_RANKING_DEFINITIONS.find((item) => item.id === id) ??
    (id === "official" ? OFFICIAL_RANKING_DEFINITIONS[0] : null);

  if (!definition) {
    return null;
  }

  const items = officialItems.slice(definition.startIndex, definition.startIndex + 6);

  return {
    item: {
      id: definition.id,
      type: "official",
      title: definition.title,
      description: definition.description,
      coverImageUrl: null,
      itemAddPolicy: "owner",
      viewer: toRankingViewer({
        currentUserId,
        authorId: "official-system",
        itemAddPolicy: "owner",
        isOfficial: true
      }),
      averageScore: average(items.map((item) => item.averageScore).filter((value) => value > 0)),
      commentCount: 0,
      itemCount: items.length,
      createdAt: new Date().toISOString(),
      author: {
        id: "official-system",
        displayName: "官方榜单",
        role: "admin"
      },
      comments: [],
      items
    }
  };
}

async function getOfficialRankingItemDetail(id: string, currentUserId?: string) {
  if (!id.startsWith("official-")) {
    return null;
  }

  const modelId = id.slice("official-".length);
  const [officialItems, models] = await Promise.all([
    listOfficialRankingItems(currentUserId),
    rankingsRepo.listPublishedModels()
  ]);
  const officialItem = officialItems.find((item) => item.id === id);
  const model = models.find((item) => item.id === modelId);

  if (!officialItem || !model) {
    return null;
  }

  const [reviews, myReview] = await Promise.all([
    reviewsRepo.listVisibleReviewsByModel(model.id),
    currentUserId ? reviewsRepo.getUserReview(model.id, currentUserId) : Promise.resolve(null)
  ]);

  const serializedReviews = reviews
    .filter((review) => review.content && review.content.trim().length > 0)
    .map((review) => ({
      id: review.id,
      rankingItemId: id,
      content: review.content!,
      rating: review.rating,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      author: {
        id: review.author.id,
        displayName: review.author.displayName,
        role: review.author.role as "user" | "admin"
      }
    }));

  return {
    item: {
      ...officialItem,
      ranking: {
        id: "official-endurance",
        title: "续航之王"
      },
      comments: serializedReviews,
      myReview:
        myReview && myReview.content
          ? {
              id: myReview.id,
              rankingItemId: id,
              content: myReview.content,
              rating: myReview.rating,
              createdAt: myReview.createdAt.toISOString(),
              updatedAt: myReview.updatedAt.toISOString(),
              author: {
                id: myReview.author.id,
                displayName: myReview.author.displayName,
                role: myReview.author.role as "user" | "admin"
              }
            }
          : null
    }
  };
}

export const rankingsService = {
  async listRankings(currentUserId?: string) {
    const [officialItems, rankings] = await Promise.all([
      listOfficialRankingItems(currentUserId),
      rankingsRepo.listRankings()
    ]);

    const rankingItemsByRanking = new Map<string, Awaited<ReturnType<typeof rankingsRepo.listRankingItems>>>();
    await Promise.all(
      rankings.map(async (ranking) => {
        const items = await rankingsRepo.listRankingItems(ranking.id);
        rankingItemsByRanking.set(ranking.id, items);
      })
    );

    const allRankingItemIds = Array.from(rankingItemsByRanking.values())
      .flat()
      .map((item) => item.id);
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
      const itemAddPolicy = (ranking.itemAddPolicy as "public" | "owner") ?? "owner";

      return {
        id: ranking.id,
        type: ranking.type as "official" | "community",
        title: ranking.title,
        description: ranking.description,
        coverImageUrl: ranking.coverImageUrl,
        itemAddPolicy,
        averageScore: average(items.map((item) => item.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        itemCount: items.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          role: ranking.author.role as "user" | "admin"
        },
        viewer: toRankingViewer({
          currentUserId,
          authorId: ranking.author.id,
          itemAddPolicy
        }),
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
      itemAddPolicy: "public" | "owner";
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
      coverImageUrl: input.coverImageUrl,
      itemAddPolicy: input.itemAddPolicy
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

  async updateRanking(
    rankingId: string,
    currentUserId: string,
    input: {
      title: string;
      description: string;
      coverImageUrl: string | null;
      itemAddPolicy: "public" | "owner";
      items: Array<{
        title: string;
        summary: string | null;
        imageUrl: string | null;
        brandName: string | null;
        linkedModelSlug: string | null;
      }>;
    }
  ) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    if (ranking.type === "official" || ranking.author.id !== currentUserId) {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));

    await rankingsRepo.updateRanking(rankingId, {
      title: input.title,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      itemAddPolicy: input.itemAddPolicy
    });
    await rankingsRepo.deleteRankingItems(rankingId);
    await rankingsRepo.createRankingItems(
      rankingId,
      input.items.map((item, index) => ({
        rank: index + 1,
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        brandName: item.brandName,
        linkedModelId: item.linkedModelSlug ? modelBySlug.get(item.linkedModelSlug)?.id ?? null : null
      }))
    );

    const payload = await this.getRankingDetail(rankingId, currentUserId);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async addRankingItem(
    rankingId: string,
    currentUserId: string,
    input: {
      title: string;
      summary: string | null;
      imageUrl: string | null;
      brandName: string | null;
      linkedModelSlug: string | null;
    }
  ) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    if (ranking.type === "official") {
      return { kind: "forbidden" as const };
    }

    const viewer = toRankingViewer({
      currentUserId,
      authorId: ranking.author.id,
      itemAddPolicy: (ranking.itemAddPolicy as "public" | "owner") ?? "owner"
    });
    if (!viewer.canAddItems) {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));
    await rankingsRepo.addRankingItem({
      rankingId,
      title: input.title,
      summary: input.summary,
      imageUrl: input.imageUrl,
      brandName: input.brandName,
      linkedModelId: input.linkedModelSlug ? modelBySlug.get(input.linkedModelSlug)?.id ?? null : null
    });

    const payload = await this.getRankingDetail(rankingId, currentUserId);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async getRankingDetail(id: string, currentUserId?: string): Promise<{ item: RankingDetail } | null> {
    if (id.startsWith("official")) {
      return buildOfficialRankingDetail(id, currentUserId, await listOfficialRankingItems(currentUserId));
    }

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
      aggregates.map((item) => [
        item.rankingItemId,
        {
          totalRatings: Number(item.totalRatings ?? 0),
          averageRaw: Number(item.averageRaw ?? 0)
        }
      ])
    );
    const userRatingMap = new Map(userRatings.map((item) => [item.rankingItemId, item.rating]));
    const serializedItems = items.map((item) => serializeRankingItem(item, aggregateMap, userRatingMap));
    const itemAddPolicy = (ranking.itemAddPolicy as "public" | "owner") ?? "owner";

    return {
      item: {
        id: ranking.id,
        type: ranking.type as "official" | "community",
        title: ranking.title,
        description: ranking.description,
        coverImageUrl: ranking.coverImageUrl,
        itemAddPolicy,
        viewer: toRankingViewer({
          currentUserId,
          authorId: ranking.author.id,
          itemAddPolicy
        }),
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
    if (rankingId.startsWith("official")) {
      return null;
    }

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
      return getOfficialRankingItemDetail(id, currentUserId);
    }

    const ranking = await rankingsRepo.getRankingById(item.rankingId);
    if (!ranking) {
      return null;
    }

    const [aggregates, userRatings, reviews] = await Promise.all([
      rankingsRepo.listRankingItemRatingAggregates([id]),
      currentUserId ? rankingsRepo.listUserRankingItemRatings(currentUserId, [id]) : Promise.resolve([]),
      rankingsRepo.listRankingItemReviews(id)
    ]);
    const aggregateMap = new Map(
      aggregates.map((item) => [
        item.rankingItemId,
        { totalRatings: Number(item.totalRatings ?? 0), averageRaw: Number(item.averageRaw ?? 0) }
      ])
    );
    const userRatingMap = new Map(userRatings.map((item) => [item.rankingItemId, item.rating]));
    const serializedItem = serializeRankingItem(item, aggregateMap, userRatingMap);
    const serializedReviews = reviews
      .map((entry) => serializeRankingItemReview(entry))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return {
      item: {
        ...serializedItem,
        ranking: {
          id: ranking.id,
          title: ranking.title
        },
        comments: serializedReviews,
        myReview: currentUserId
          ? serializedReviews.find((entry) => entry.author.id === currentUserId) ?? null
          : null
      }
    };
  },

  async submitRankingItemReview(
    id: string,
    currentUserId: string,
    input: {
      rating: number;
      content: string;
    }
  ) {
    const existing = await rankingsRepo.getRankingItemById(id);
    if (!existing) {
      if (!id.startsWith("official-")) {
        return null;
      }

      const modelId = id.slice("official-".length);
      await reviewsRepo.upsertReview({
        modelId,
        userId: currentUserId,
        rating: input.rating,
        content: input.content
      });
      return this.getRankingItemDetail(id, currentUserId);
    }

    await rankingsRepo.upsertRankingItemReview({
      rankingItemId: id,
      authorId: currentUserId,
      rating: input.rating,
      content: input.content
    });

    return this.getRankingItemDetail(id, currentUserId);
  },

  async submitRankingItemRating(id: string, currentUserId: string, rating: number) {
    const existing = await rankingsRepo.getRankingItemById(id);
    if (!existing) {
      if (!id.startsWith("official-")) {
        return null;
      }

      const modelId = id.slice("official-".length);
      const currentReview = await reviewsRepo.getUserReview(modelId, currentUserId);
      await reviewsRepo.upsertReview({
        modelId,
        userId: currentUserId,
        rating,
        content: currentReview?.content ?? null
      });
      const detail = await this.getRankingItemDetail(id, currentUserId);
      if (!detail) {
        return null;
      }

      return {
        item: {
          id: detail.item.id,
          rankingId: detail.item.rankingId,
          rank: detail.item.rank,
          title: detail.item.title,
          summary: detail.item.summary,
          imageUrl: detail.item.imageUrl,
          brandName: detail.item.brandName,
          linkedModel: detail.item.linkedModel,
          averageScore: detail.item.averageScore,
          totalRatings: detail.item.totalRatings,
          commentCount: detail.item.commentCount,
          myRating: detail.item.myRating
        }
      };
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
    const detail = await this.getRankingItemDetail(id, currentUserId);
    if (!detail) {
      return null;
    }

    const payload = await this.submitRankingItemReview(id, currentUserId, {
      rating: detail.item.myRating ?? 5,
      content
    });

    return payload?.item.myReview ? { item: payload.item.myReview } : null;
  }
};
