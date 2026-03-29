import type { RankingDetail, RankingItem, RankingListItem } from "@feijia/schemas";
import { powerTypeSchema } from "@feijia/schemas";
import { rankingsRepo } from "./rankings.repo";
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";
import { siteSettingsService } from "../site-settings/site-settings.service";

const RATING_BREAKDOWN_SCORES = [5, 4, 3, 2, 1] as const;

type CurrentUser = {
  id: string;
  role: "user" | "admin";
};

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

function buildRatingBreakdown(scoreCountMap: Map<number, number>) {
  return RATING_BREAKDOWN_SCORES.map((score) => ({
    score,
    count: scoreCountMap.get(score) ?? 0
  }));
}

function buildRatingBreakdownFromRows(rows: Array<{ score: number; count: number }>) {
  const scoreCountMap = new Map<number, number>(
    rows.map((row) => [row.score, Number(row.count ?? 0)])
  );
  return buildRatingBreakdown(scoreCountMap);
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
  const hasLinkedModel = Boolean(
    item.linkedModelId &&
      item.linkedModelSlug &&
      item.linkedModelName &&
      item.linkedModelPowerType &&
      item.linkedModelCategoryId &&
      item.linkedModelCategorySlug &&
      item.linkedModelCategoryName &&
      item.linkedModelBrandId &&
      item.linkedModelBrandSlug &&
      item.linkedModelBrandName
  );

  return {
    id: item.id,
    rankingId: item.rankingId,
    rank: item.rank,
    title: item.title,
    summary: item.summary,
    imageFileId: item.imageFileId ?? null,
    imageUrl: item.imageUrl,
    brandName: item.brandName,
    linkedModel: hasLinkedModel
      ? {
          id: item.linkedModelId!,
          slug: item.linkedModelSlug!,
          name: item.linkedModelName!,
          summary: item.linkedModelSummary,
          powerType: powerTypeSchema.parse(item.linkedModelPowerType!),
          category: {
            id: item.linkedModelCategoryId!,
            slug: item.linkedModelCategorySlug!,
            name: item.linkedModelCategoryName!
          },
          brand: {
            id: item.linkedModelBrandId!,
            slug: item.linkedModelBrandSlug!,
            name: item.linkedModelBrandName!
          }
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
      avatarUrl: item.author.avatarUrl ?? null,
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
      avatarUrl: item.author.avatarUrl ?? null,
      role: item.author.role as "user" | "admin"
    }
  };
}

function toRankingViewer(input: {
  currentUser?: CurrentUser;
  authorId: string;
  itemAddPolicy: "public" | "owner";
  type: "official" | "community";
  status: "pending" | "published" | "rejected" | "hidden";
}) {
  const isAdmin = input.currentUser?.role === "admin";
  const canEdit =
    input.type === "official"
      ? isAdmin
      : Boolean(input.currentUser && input.currentUser.id === input.authorId);
  const canOpenPublicAdd = input.type === "community" && input.status === "published";

  return {
    canEdit,
    canAddItems:
      Boolean(input.currentUser) &&
      (canEdit || (input.itemAddPolicy === "public" && canOpenPublicAdd))
  };
}

async function buildRankingListItems(currentUser?: CurrentUser) {
  const rankings = (await rankingsRepo.listRankings()).filter((ranking) => {
    const rankingType = (ranking.type as "official" | "community") ?? "community";
    if (rankingType === "official") {
      return true;
    }

    return ranking.status === "published";
  });

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
    currentUser
      ? rankingsRepo.listUserRankingItemRatings(currentUser.id, allRankingItemIds)
      : Promise.resolve([])
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

  const all = rankings.map((ranking) => {
    const items = (rankingItemsByRanking.get(ranking.id) ?? []).map((item) =>
      serializeRankingItem(item, itemAggregateMap, userItemRatingMap)
    );
    const rankingType = (ranking.type as "official" | "community") ?? "community";
    const itemAddPolicy =
      rankingType === "official"
        ? "owner"
        : ((ranking.itemAddPolicy as "public" | "owner") ?? "owner");

    return {
      id: ranking.id,
      type: rankingType,
      status: ranking.status as "pending" | "published" | "rejected" | "hidden",
      title: ranking.title,
      description: ranking.description,
      coverImageFileId: ranking.coverImageFileId ?? null,
      coverImageUrl: ranking.coverImageUrl,
      itemAddPolicy,
      averageScore: average(items.map((item) => item.averageScore).filter((value) => value > 0)),
      commentCount: ranking.commentCount,
      itemCount: items.length,
      createdAt: ranking.createdAt.toISOString(),
      author: {
        id: ranking.author.id,
        displayName: ranking.author.displayName,
        avatarUrl: ranking.author.avatarUrl ?? null,
        role: ranking.author.role as "user" | "admin"
      },
      viewer: toRankingViewer({
        currentUser,
        authorId: ranking.author.id,
        itemAddPolicy,
        type: rankingType,
        status: ranking.status as "pending" | "published" | "rejected" | "hidden"
      }),
      items: items.slice(0, 3)
    } satisfies RankingListItem;
  });

  return {
    official: all.filter((item) => item.type === "official"),
    community: all.filter((item) => item.type === "community")
  };
}

export const rankingsService = {
  async listRankings(currentUser?: CurrentUser) {
    return buildRankingListItems(currentUser);
  },

  async createRanking(
    currentUser: CurrentUser,
    input: {
      type: "official" | "community";
      title: string;
      description: string;
      coverImageFileId?: string | null;
      coverImageUrl?: string | null;
      itemAddPolicy: "public" | "owner";
      items: Array<{
        title: string;
        summary: string | null;
        imageFileId?: string | null;
        imageUrl?: string | null;
        brandName: string | null;
        linkedModelSlug: string | null;
      }>;
    }
  ) {
    if (input.type === "official" && currentUser.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));
    const settings = await siteSettingsService.getResolvedSettings();
    const status =
      input.type === "official"
        ? "published"
        : settings.rankingModerationEnabled
          ? "pending"
          : "published";
    const ranking = await rankingsRepo.createRanking({
      authorId: currentUser.id,
      type: input.type,
      status,
      title: input.title,
      description: input.description,
      coverImageFileId: input.coverImageFileId ?? null,
      coverImageUrl:
        input.coverImageFileId !== undefined
          ? await resolveUploadedFileUrl(input.coverImageFileId ?? null)
          : input.coverImageUrl ?? null,
      itemAddPolicy: input.type === "official" ? "owner" : input.itemAddPolicy
    });

    if (!ranking) {
      return { kind: "internal_error" as const };
    }

    const resolvedItems = await Promise.all(
      input.items.map(async (item, index) => ({
        rank: index + 1,
        title: item.title,
        summary: item.summary,
        imageFileId: item.imageFileId ?? null,
        imageUrl:
          item.imageFileId !== undefined
            ? await resolveUploadedFileUrl(item.imageFileId ?? null)
            : item.imageUrl ?? null,
        brandName: item.brandName,
        linkedModelId: item.linkedModelSlug ? modelBySlug.get(item.linkedModelSlug)?.id ?? null : null
      }))
    );
    await rankingsRepo.createRankingItems(ranking.id, resolvedItems);

    const payload = await this.getRankingDetail(ranking.id, currentUser);
    if (!payload) {
      return { kind: "internal_error" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async updateRanking(
      rankingId: string,
    currentUser: CurrentUser,
    input: {
      type: "official" | "community";
      title: string;
      description: string;
      coverImageFileId?: string | null;
      coverImageUrl?: string | null;
      itemAddPolicy: "public" | "owner";
      items: Array<{
        title: string;
        summary: string | null;
        imageFileId?: string | null;
        imageUrl?: string | null;
        brandName: string | null;
        linkedModelSlug: string | null;
      }>;
    }
  ) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = (ranking.type as "official" | "community") ?? "community";
    if (input.type !== rankingType) {
      return { kind: "forbidden" as const };
    }

    if (rankingType === "official") {
      if (currentUser.role !== "admin") {
        return { kind: "forbidden" as const };
      }
    } else if (ranking.author.id !== currentUser.id) {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));

    await rankingsRepo.updateRanking(rankingId, {
      title: input.title,
      description: input.description,
      coverImageFileId: input.coverImageFileId ?? null,
      coverImageUrl:
        input.coverImageFileId !== undefined
          ? await resolveUploadedFileUrl(input.coverImageFileId ?? null)
          : input.coverImageUrl ?? null,
      itemAddPolicy: rankingType === "official" ? "owner" : input.itemAddPolicy
    });
    await rankingsRepo.deleteRankingItems(rankingId);
    const resolvedItems = await Promise.all(
      input.items.map(async (item, index) => ({
        rank: index + 1,
        title: item.title,
        summary: item.summary,
        imageFileId: item.imageFileId ?? null,
        imageUrl:
          item.imageFileId !== undefined
            ? await resolveUploadedFileUrl(item.imageFileId ?? null)
            : item.imageUrl ?? null,
        brandName: item.brandName,
        linkedModelId: item.linkedModelSlug ? modelBySlug.get(item.linkedModelSlug)?.id ?? null : null
      }))
    );
    await rankingsRepo.createRankingItems(rankingId, resolvedItems);

    const payload = await this.getRankingDetail(rankingId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async addRankingItem(
    rankingId: string,
    currentUser: CurrentUser,
    input: {
      title: string;
      summary: string | null;
      imageFileId?: string | null;
      imageUrl?: string | null;
      brandName: string | null;
      linkedModelSlug: string | null;
    }
  ) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = (ranking.type as "official" | "community") ?? "community";
    const itemAddPolicy =
      rankingType === "official"
        ? "owner"
        : ((ranking.itemAddPolicy as "public" | "owner") ?? "owner");

    const viewer = toRankingViewer({
      currentUser,
      authorId: ranking.author.id,
      itemAddPolicy,
      type: rankingType,
      status: ranking.status as "pending" | "published" | "rejected" | "hidden"
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
      imageFileId: input.imageFileId ?? null,
      imageUrl:
        input.imageFileId !== undefined
          ? await resolveUploadedFileUrl(input.imageFileId ?? null)
          : input.imageUrl ?? null,
      brandName: input.brandName,
      linkedModelId: input.linkedModelSlug ? modelBySlug.get(input.linkedModelSlug)?.id ?? null : null
    });

    const payload = await this.getRankingDetail(rankingId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async getRankingDetail(id: string, currentUser?: CurrentUser): Promise<{ item: RankingDetail } | null> {
    const ranking = await rankingsRepo.getRankingById(id);
    if (!ranking) {
      return null;
    }

    const rankingType = (ranking.type as "official" | "community") ?? "community";
    const canInspectUnpublished =
      currentUser?.role === "admin" || currentUser?.id === ranking.author.id;
    if (rankingType === "community" && ranking.status !== "published" && !canInspectUnpublished) {
      return null;
    }

    const items = await rankingsRepo.listRankingItems(id);
    const [comments, aggregates, userRatings] = await Promise.all([
      rankingsRepo.listRankingComments(id),
      rankingsRepo.listRankingItemRatingAggregates(items.map((item) => item.id)),
      currentUser
        ? rankingsRepo.listUserRankingItemRatings(currentUser.id, items.map((item) => item.id))
        : Promise.resolve([])
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
    const itemAddPolicy =
      rankingType === "official"
        ? "owner"
        : ((ranking.itemAddPolicy as "public" | "owner") ?? "owner");

    return {
      item: {
        id: ranking.id,
        type: rankingType,
        status: ranking.status as "pending" | "published" | "rejected" | "hidden",
        title: ranking.title,
        description: ranking.description,
        coverImageFileId: ranking.coverImageFileId ?? null,
        coverImageUrl: ranking.coverImageUrl,
        itemAddPolicy,
        viewer: toRankingViewer({
          currentUser,
          authorId: ranking.author.id,
          itemAddPolicy,
          type: rankingType,
          status: ranking.status as "pending" | "published" | "rejected" | "hidden"
        }),
        averageScore: average(serializedItems.map((item) => item.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        itemCount: serializedItems.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          avatarUrl: ranking.author.avatarUrl ?? null,
          role: ranking.author.role as "user" | "admin"
        },
        comments: comments.map(serializeRankingComment),
        items: serializedItems
      }
    };
  },

  async listAdminRankings(
    currentUser: CurrentUser,
    filters?: {
      scope?: "official" | "community";
      status?: "pending" | "published" | "rejected" | "hidden";
    }
  ) {
    if (currentUser.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const rankings = await rankingsRepo.listRankings();
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
    const itemAggregates = await rankingsRepo.listRankingItemRatingAggregates(allRankingItemIds);
    const itemAggregateMap = new Map(
      itemAggregates.map((item) => [
        item.rankingItemId,
        {
          totalRatings: Number(item.totalRatings ?? 0),
          averageRaw: Number(item.averageRaw ?? 0)
        }
      ])
    );

    return {
      kind: "ok" as const,
      payload: {
        items: rankings
          .filter((ranking) => {
            const rankingType = (ranking.type as "official" | "community") ?? "community";
            if (filters?.scope && rankingType !== filters.scope) {
              return false;
            }
            if (filters?.status && ranking.status !== filters.status) {
              return false;
            }
            return true;
          })
          .map((ranking) => {
            const rankingType = (ranking.type as "official" | "community") ?? "community";
            const itemAddPolicy =
              rankingType === "official"
              ? "owner"
              : ((ranking.itemAddPolicy as "public" | "owner") ?? "owner");
          const items = (rankingItemsByRanking.get(ranking.id) ?? []).map((item) =>
            serializeRankingItem(item, itemAggregateMap, new Map())
          );

          return {
            id: ranking.id,
            type: rankingType,
            status: ranking.status as "pending" | "published" | "rejected" | "hidden",
            title: ranking.title,
            description: ranking.description,
            coverImageFileId: ranking.coverImageFileId ?? null,
            coverImageUrl: ranking.coverImageUrl,
            itemAddPolicy,
            averageScore: average(items.map((item) => item.averageScore).filter((value) => value > 0)),
            commentCount: ranking.commentCount,
            itemCount: items.length,
            createdAt: ranking.createdAt.toISOString(),
            author: {
              id: ranking.author.id,
              displayName: ranking.author.displayName,
              avatarUrl: ranking.author.avatarUrl ?? null,
              role: ranking.author.role as "user" | "admin"
            },
            viewer: toRankingViewer({
              currentUser,
              authorId: ranking.author.id,
              itemAddPolicy,
              type: rankingType,
              status: ranking.status as "pending" | "published" | "rejected" | "hidden"
            }),
            items: items.slice(0, 3)
            };
          })
      }
    };
  },

  async updateRankingStatus(
    rankingId: string,
    currentUser: CurrentUser,
    status: "published" | "rejected" | "hidden"
  ) {
    if (currentUser.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = (ranking.type as "official" | "community") ?? "community";
    if (rankingType !== "community") {
      return { kind: "forbidden" as const };
    }

    await rankingsRepo.updateRankingStatus(rankingId, status);
    const payload = await this.getRankingDetail(rankingId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
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

    const [aggregates, userRatings, reviews, ratingBreakdownRows] = await Promise.all([
      rankingsRepo.listRankingItemRatingAggregates([id]),
      currentUserId ? rankingsRepo.listUserRankingItemRatings(currentUserId, [id]) : Promise.resolve([]),
      rankingsRepo.listRankingItemReviews(id),
      rankingsRepo.listRankingItemRatingBreakdown(id)
    ]);
    const aggregateMap = new Map(
      aggregates.map((entry) => [
        entry.rankingItemId,
        { totalRatings: Number(entry.totalRatings ?? 0), averageRaw: Number(entry.averageRaw ?? 0) }
      ])
    );
    const userRatingMap = new Map(userRatings.map((entry) => [entry.rankingItemId, entry.rating]));
    const serializedItem = serializeRankingItem(item, aggregateMap, userRatingMap);
    const serializedReviews = reviews
      .map((entry) => serializeRankingItemReview(entry))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    const ratingBreakdown = buildRatingBreakdownFromRows(ratingBreakdownRows);

    return {
      item: {
        ...serializedItem,
        ranking: {
          id: ranking.id,
          title: ranking.title
        },
        comments: serializedReviews,
        ratingBreakdown,
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
      return null;
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
        imageFileId: payload.item.imageFileId,
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
