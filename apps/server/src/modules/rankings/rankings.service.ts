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

type RankingItemStatus = "pending" | "published" | "rejected" | "hidden";

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

async function resolveRankingImage(fileId: string | null | undefined) {
  return resolveUploadedFileUrl(fileId ?? null);
}

function canManageRanking(input: {
  currentUser?: CurrentUser;
  rankingType: "official" | "community";
  rankingAuthorId: string;
}) {
  if (!input.currentUser) {
    return false;
  }

  if (input.currentUser.role === "admin") {
    return true;
  }

  return input.rankingType === "community" && input.currentUser.id === input.rankingAuthorId;
}

function canManageRankingItem(input: {
  currentUser?: CurrentUser;
  rankingType: "official" | "community";
  rankingAuthorId: string;
  itemAuthorId: string;
}) {
  if (!input.currentUser) {
    return false;
  }

  if (input.currentUser.role === "admin") {
    return true;
  }

  if (input.rankingType === "community" && input.currentUser.id === input.rankingAuthorId) {
    return true;
  }

  return input.currentUser.id === input.itemAuthorId;
}

function canInspectRankingItem(input: {
  currentUser?: CurrentUser;
  rankingType: "official" | "community";
  rankingAuthorId: string;
  itemAuthorId: string;
  itemStatus: RankingItemStatus;
}) {
  if (input.itemStatus === "published") {
    return true;
  }

  return canManageRankingItem(input);
}

function buildSet<T extends string>(rows: Array<{ [key: string]: T }>, key: string) {
  return new Set(rows.map((row) => row[key] as T));
}

async function serializeRankingItem(
  item: Awaited<ReturnType<typeof rankingsRepo.listRankingItems>>[number],
  aggregateMap: Map<string, { totalRatings: number; averageRaw: number }>,
  userRatingMap: Map<string, number | null>,
  input: {
    currentUser?: CurrentUser;
    rankingType: "official" | "community";
    rankingAuthorId: string;
    reportedItemIds?: Set<string>;
  }
): Promise<RankingItem> {
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
    authorId: item.authorId,
    status: item.status as RankingItemStatus,
    rank: item.rank,
    title: item.title,
    summary: item.summary,
    imageFileId: item.imageFileId ?? null,
    imageUrl: await resolveRankingImage(item.imageFileId),
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
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    myRating: userRatingMap.get(item.id) ?? null,
    viewer: {
      canEdit: canManageRankingItem({
        currentUser: input.currentUser,
        rankingType: input.rankingType,
        rankingAuthorId: input.rankingAuthorId,
        itemAuthorId: item.authorId
      }),
      canDelete: canManageRankingItem({
        currentUser: input.currentUser,
        rankingType: input.rankingType,
        rankingAuthorId: input.rankingAuthorId,
        itemAuthorId: item.authorId
      }),
      hasReported: input.reportedItemIds?.has(item.id) ?? false
    }
  };
}

async function serializeRankingComment(
  item: Awaited<ReturnType<typeof rankingsRepo.listRankingComments>>[number],
  currentUser?: CurrentUser
) {
  return {
    id: item.id,
    rankingId: item.rankingId,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
      role: item.author.role as "user" | "admin"
    },
    viewer: {
      canEdit: Boolean(currentUser && (currentUser.role === "admin" || currentUser.id === item.author.id)),
      canDelete: Boolean(currentUser && (currentUser.role === "admin" || currentUser.id === item.author.id)),
      hasLiked: false,
      hasReported: false
    }
  };
}

async function buildRankingItemCommentThreads(input: {
  comments: Awaited<ReturnType<typeof rankingsRepo.listRankingItemComments>>;
  currentUser?: CurrentUser;
  ratingByAuthor: Map<string, number>;
  replyToUsers: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; role: "user" | "admin" }
  >;
  likedCommentIds: Set<string>;
  reportedCommentIds: Set<string>;
}) {
  const repliesByRootId = new Map<string, Array<any>>();
  const roots: Array<any> = [];
  const compare = (
    left: { likeCount: number; updatedAt: string },
    right: { likeCount: number; updatedAt: string }
  ) => right.likeCount - left.likeCount || right.updatedAt.localeCompare(left.updatedAt);

  for (const comment of input.comments) {
    const serialized = {
      id: comment.id,
      rankingItemId: comment.rankingItemId,
      parentCommentId: comment.parentCommentId,
      replyToCommentId: comment.replyToCommentId,
      content: comment.content,
      rating: input.ratingByAuthor.get(comment.author.id) ?? 5,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      likeCount: comment.likeCount ?? 0,
      reportCount: comment.reportCount ?? 0,
      author: {
        id: comment.author.id,
        displayName: comment.author.displayName,
        avatarUrl: await resolveUploadedFileUrl(comment.author.avatarFileId ?? null),
        role: comment.author.role as "user" | "admin"
      },
      replyToUser: comment.replyToUserId
        ? input.replyToUsers.get(comment.replyToUserId) ?? null
        : null,
      viewer: {
        canEdit: Boolean(
          input.currentUser &&
            (input.currentUser.role === "admin" || input.currentUser.id === comment.author.id)
        ),
        canDelete: Boolean(
          input.currentUser &&
            (input.currentUser.role === "admin" || input.currentUser.id === comment.author.id)
        ),
        hasLiked: input.likedCommentIds.has(comment.id),
        hasReported: input.reportedCommentIds.has(comment.id)
      }
    };

    if (!comment.parentCommentId) {
      roots.push({
        ...serialized,
        replyCount: 0,
        replies: []
      });
      continue;
    }

    const bucket = repliesByRootId.get(comment.parentCommentId) ?? [];
    bucket.push(serialized);
    repliesByRootId.set(comment.parentCommentId, bucket);
  }

  return roots
    .map((root) => ({
      ...root,
      replies: (repliesByRootId.get(root.id) ?? []).sort(compare),
      replyCount: (repliesByRootId.get(root.id) ?? []).length
    }))
    .sort(compare);
}

function toRankingViewer(input: {
  currentUser?: CurrentUser;
  authorId: string;
  itemAddPolicy: "public" | "owner";
  type: "official" | "community";
  status: "pending" | "published" | "rejected" | "hidden";
}) {
  const canEdit = canManageRanking({
    currentUser: input.currentUser,
    rankingType: input.type,
    rankingAuthorId: input.authorId
  });
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
      rankingItemsByRanking.set(
        ranking.id,
        items.filter((item) =>
          canInspectRankingItem({
            currentUser,
            rankingType: ranking.type as "official" | "community",
            rankingAuthorId: ranking.author.id,
            itemAuthorId: item.authorId,
            itemStatus: item.status as RankingItemStatus
          })
        )
      );
    })
  );

  const allRankingItemIds = Array.from(rankingItemsByRanking.values())
    .flat()
    .map((item) => item.id);
  const [itemAggregates, userItemRatings, reportedItemRows] = await Promise.all([
    rankingsRepo.listRankingItemRatingAggregates(allRankingItemIds),
    currentUser
      ? rankingsRepo.listUserRankingItemRatings(currentUser.id, allRankingItemIds)
      : Promise.resolve([]),
    currentUser
      ? rankingsRepo.listViewerRankingItemReports(allRankingItemIds, currentUser.id)
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
  const reportedItemIds = buildSet(
    reportedItemRows as Array<{ rankingItemId: string }>,
    "rankingItemId"
  );

  const all = await Promise.all(
    rankings.map(async (ranking) => {
      const rankingType = (ranking.type as "official" | "community") ?? "community";
      const itemAddPolicy =
        rankingType === "official"
          ? "owner"
          : ((ranking.itemAddPolicy as "public" | "owner") ?? "owner");
      const items = await Promise.all(
        (rankingItemsByRanking.get(ranking.id) ?? []).map((item) =>
          serializeRankingItem(item, itemAggregateMap, userItemRatingMap, {
            currentUser,
            rankingType,
            rankingAuthorId: ranking.author.id,
            reportedItemIds
          })
        )
      );

      return {
        id: ranking.id,
        type: rankingType,
        status: ranking.status as "pending" | "published" | "rejected" | "hidden",
        title: ranking.title,
        description: ranking.description,
        coverImageFileId: ranking.coverImageFileId ?? null,
        coverImageUrl: await resolveRankingImage(ranking.coverImageFileId),
        itemAddPolicy,
        averageScore: average(items.map((item) => item.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        itemCount: items.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          avatarUrl: await resolveUploadedFileUrl(ranking.author.avatarFileId ?? null),
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
    })
  );

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
      itemAddPolicy: "public" | "owner";
      items: Array<{
        title: string;
        summary: string | null;
        imageFileId?: string | null;
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
    const rankingStatus =
      input.type === "official"
        ? "published"
        : settings.rankingModerationEnabled
          ? "pending"
          : "published";
    const ranking = await rankingsRepo.createRanking({
      authorId: currentUser.id,
      type: input.type,
      status: rankingStatus,
      title: input.title,
      description: input.description,
      coverImageFileId: input.coverImageFileId ?? null,
      itemAddPolicy: input.type === "official" ? "owner" : input.itemAddPolicy
    });

    if (!ranking) {
      return { kind: "internal_error" as const };
    }

    const itemStatus: RankingItemStatus =
      rankingStatus === "pending" || (input.type === "community" && settings.rankingItemModerationEnabled)
        ? "pending"
        : "published";
    await rankingsRepo.createRankingItems(
      ranking.id,
      input.items.map((item, index) => ({
        authorId: currentUser.id,
        status: itemStatus,
        rank: index + 1,
        title: item.title,
        summary: item.summary,
        imageFileId: item.imageFileId ?? null,
        brandName: item.brandName,
        linkedModelId: item.linkedModelSlug ? modelBySlug.get(item.linkedModelSlug)?.id ?? null : null
      }))
    );

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
      itemAddPolicy: "public" | "owner";
      items: Array<{
        title: string;
        summary: string | null;
        imageFileId?: string | null;
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
    if (!canManageRanking({ currentUser, rankingType, rankingAuthorId: ranking.author.id })) {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));
    const settings = await siteSettingsService.getResolvedSettings();
    const nextItemStatus: RankingItemStatus =
      ranking.status === "pending" || (rankingType === "community" && settings.rankingItemModerationEnabled)
        ? "pending"
        : "published";

    await rankingsRepo.updateRanking(rankingId, {
      title: input.title,
      description: input.description,
      coverImageFileId: input.coverImageFileId ?? null,
      itemAddPolicy: rankingType === "official" ? "owner" : input.itemAddPolicy
    });
    await rankingsRepo.deleteRankingItems(rankingId);
    await rankingsRepo.createRankingItems(
      rankingId,
      input.items.map((item, index) => ({
        authorId: currentUser.id,
        status: nextItemStatus,
        rank: index + 1,
        title: item.title,
        summary: item.summary,
        imageFileId: item.imageFileId ?? null,
        brandName: item.brandName,
        linkedModelId: item.linkedModelSlug ? modelBySlug.get(item.linkedModelSlug)?.id ?? null : null
      }))
    );

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
    const status: RankingItemStatus =
      rankingType === "community" && (await siteSettingsService.shouldModerateRankingItem())
        ? "pending"
        : "published";
    await rankingsRepo.addRankingItem({
      rankingId,
      authorId: currentUser.id,
      status,
      title: input.title,
      summary: input.summary,
      imageFileId: input.imageFileId ?? null,
      brandName: input.brandName,
      linkedModelId: input.linkedModelSlug ? modelBySlug.get(input.linkedModelSlug)?.id ?? null : null
    });

    const payload = await this.getRankingDetail(rankingId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async updateRankingItem(
    id: string,
    currentUser: CurrentUser,
    input: {
      title: string;
      summary: string | null;
      imageFileId?: string | null;
      brandName: string | null;
      linkedModelSlug: string | null;
    }
  ) {
    const item = await rankingsRepo.getRankingItemById(id);
    if (!item) {
      return { kind: "not_found" as const };
    }

    const ranking = await rankingsRepo.getRankingById(item.rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = (ranking.type as "official" | "community") ?? "community";
    if (
      !canManageRankingItem({
        currentUser,
        rankingType,
        rankingAuthorId: ranking.author.id,
        itemAuthorId: item.authorId
      })
    ) {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((entry) => [entry.slug, entry]));
    const nextStatus: RankingItemStatus =
      rankingType === "community" && (await siteSettingsService.shouldModerateRankingItem())
        ? "pending"
        : (item.status as RankingItemStatus);
    await rankingsRepo.updateRankingItem(id, {
      title: input.title,
      summary: input.summary,
      imageFileId: input.imageFileId ?? null,
      brandName: input.brandName,
      linkedModelId: input.linkedModelSlug ? modelBySlug.get(input.linkedModelSlug)?.id ?? null : null,
      status: nextStatus
    });

    const payload = await this.getRankingItemDetail(id, currentUser.id);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async deleteRankingItem(id: string, currentUser: CurrentUser) {
    const item = await rankingsRepo.getRankingItemById(id);
    if (!item) {
      return { kind: "not_found" as const };
    }
    const ranking = await rankingsRepo.getRankingById(item.rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = (ranking.type as "official" | "community") ?? "community";
    if (
      !canManageRankingItem({
        currentUser,
        rankingType,
        rankingAuthorId: ranking.author.id,
        itemAuthorId: item.authorId
      })
    ) {
      return { kind: "forbidden" as const };
    }

    await rankingsRepo.deleteRankingItem(id);
    return { kind: "ok" as const };
  },

  async getRankingDetail(
    id: string,
    currentUser?: CurrentUser
  ): Promise<{ item: RankingDetail } | null> {
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

    const items = (await rankingsRepo.listRankingItems(id)).filter((entry) =>
      canInspectRankingItem({
        currentUser,
        rankingType,
        rankingAuthorId: ranking.author.id,
        itemAuthorId: entry.authorId,
        itemStatus: entry.status as RankingItemStatus
      })
    );
    const [comments, aggregates, userRatings, reportedRows] = await Promise.all([
      rankingsRepo.listRankingComments(id),
      rankingsRepo.listRankingItemRatingAggregates(items.map((entry) => entry.id)),
      currentUser
        ? rankingsRepo.listUserRankingItemRatings(currentUser.id, items.map((entry) => entry.id))
        : Promise.resolve([]),
      currentUser
        ? rankingsRepo.listViewerRankingItemReports(items.map((entry) => entry.id), currentUser.id)
        : Promise.resolve([])
    ]);
    const aggregateMap = new Map(
      aggregates.map((entry) => [
        entry.rankingItemId,
        {
          totalRatings: Number(entry.totalRatings ?? 0),
          averageRaw: Number(entry.averageRaw ?? 0)
        }
      ])
    );
    const userRatingMap = new Map(userRatings.map((entry) => [entry.rankingItemId, entry.rating]));
    const reportedItemIds = buildSet(
      reportedRows as Array<{ rankingItemId: string }>,
      "rankingItemId"
    );
    const serializedItems = await Promise.all(
      items.map((entry) =>
        serializeRankingItem(entry, aggregateMap, userRatingMap, {
          currentUser,
          rankingType,
          rankingAuthorId: ranking.author.id,
          reportedItemIds
        })
      )
    );
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
        coverImageUrl: await resolveRankingImage(ranking.coverImageFileId),
        itemAddPolicy,
        viewer: toRankingViewer({
          currentUser,
          authorId: ranking.author.id,
          itemAddPolicy,
          type: rankingType,
          status: ranking.status as "pending" | "published" | "rejected" | "hidden"
        }),
        averageScore: average(serializedItems.map((entry) => entry.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        itemCount: serializedItems.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          avatarUrl: await resolveUploadedFileUrl(ranking.author.avatarFileId ?? null),
          role: ranking.author.role as "user" | "admin"
        },
        comments: await Promise.all(comments.map((comment) => serializeRankingComment(comment, currentUser))),
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
        rankingItemsByRanking.set(ranking.id, await rankingsRepo.listRankingItems(ranking.id));
      })
    );

    const allRankingItemIds = Array.from(rankingItemsByRanking.values())
      .flat()
      .map((entry) => entry.id);
    const itemAggregates = await rankingsRepo.listRankingItemRatingAggregates(allRankingItemIds);
    const itemAggregateMap = new Map(
      itemAggregates.map((entry) => [
        entry.rankingItemId,
        {
          totalRatings: Number(entry.totalRatings ?? 0),
          averageRaw: Number(entry.averageRaw ?? 0)
        }
      ])
    );

    return {
      kind: "ok" as const,
      payload: {
        items: await Promise.all(
          rankings
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
            .map(async (ranking) => {
              const rankingType = (ranking.type as "official" | "community") ?? "community";
              const itemAddPolicy =
                rankingType === "official"
                  ? "owner"
                  : ((ranking.itemAddPolicy as "public" | "owner") ?? "owner");
              const items = await Promise.all(
                (rankingItemsByRanking.get(ranking.id) ?? []).map((entry) =>
                  serializeRankingItem(entry, itemAggregateMap, new Map(), {
                    currentUser,
                    rankingType,
                    rankingAuthorId: ranking.author.id,
                    reportedItemIds: new Set()
                  })
                )
              );

              return {
                id: ranking.id,
                type: rankingType,
                status: ranking.status as "pending" | "published" | "rejected" | "hidden",
                title: ranking.title,
                description: ranking.description,
                coverImageFileId: ranking.coverImageFileId ?? null,
                coverImageUrl: await resolveRankingImage(ranking.coverImageFileId),
                itemAddPolicy,
                averageScore: average(items.map((entry) => entry.averageScore).filter((value) => value > 0)),
                commentCount: ranking.commentCount,
                itemCount: items.length,
                createdAt: ranking.createdAt.toISOString(),
                author: {
                  id: ranking.author.id,
                  displayName: ranking.author.displayName,
                  avatarUrl: await resolveUploadedFileUrl(ranking.author.avatarFileId ?? null),
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
        )
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

    return item ? { item: await serializeRankingComment(item, { id: currentUserId, role: "user" }) } : null;
  },

  async reportRanking(rankingId: string, currentUser: CurrentUser, reason: string) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking || ranking.status !== "published") {
      return { kind: "not_found" as const };
    }

    await rankingsRepo.createRankingReport({
      rankingId,
      reporterId: currentUser.id,
      reason
    });
    return { kind: "ok" as const };
  },

  async reportRankingItem(id: string, currentUser: CurrentUser, reason: string) {
    const item = await rankingsRepo.getRankingItemById(id);
    if (!item || item.status !== "published") {
      return { kind: "not_found" as const };
    }

    await rankingsRepo.createRankingItemReport({
      rankingItemId: id,
      reporterId: currentUser.id,
      reason
    });
    return { kind: "ok" as const };
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

    const currentUser = currentUserId ? { id: currentUserId, role: "user" as const } : undefined;
    if (
      !canInspectRankingItem({
        currentUser,
        rankingType: ranking.type as "official" | "community",
        rankingAuthorId: ranking.author.id,
        itemAuthorId: item.authorId,
        itemStatus: item.status as RankingItemStatus
      })
    ) {
      return null;
    }

    const [aggregates, userRatings, comments, ratingBreakdownRows, reportedItemRows] =
      await Promise.all([
        rankingsRepo.listRankingItemRatingAggregates([id]),
        currentUserId
          ? rankingsRepo.listUserRankingItemRatings(currentUserId, [id])
          : Promise.resolve([]),
        rankingsRepo.listRankingItemComments(id),
        rankingsRepo.listRankingItemRatingBreakdown(id),
        currentUserId
          ? rankingsRepo.listViewerRankingItemReports([id], currentUserId)
          : Promise.resolve([])
      ]);
    const commentIds = comments.map((comment) => comment.id);
    const replyToUserIds = Array.from(
      new Set(
        comments
          .map((comment) => comment.replyToUserId)
          .filter((value): value is string => Boolean(value))
      )
    );
    const authorIds = Array.from(new Set(comments.map((comment) => comment.author.id)));
    const [replyUsers, authorRatings, likedRows, reportedCommentRows] = await Promise.all([
      rankingsRepo.listUsersByIds(replyToUserIds),
      Promise.all(
        authorIds.map(async (authorId) => [
          authorId,
          (await rankingsRepo.getUserRankingItemRating(id, authorId)) ?? 5
        ] as const)
      ),
      currentUserId
        ? rankingsRepo.listViewerRankingItemCommentLikes(commentIds, currentUserId)
        : Promise.resolve([]),
      currentUserId
        ? rankingsRepo.listViewerRankingItemCommentReports(commentIds, currentUserId)
        : Promise.resolve([])
    ]);

    const aggregateMap = new Map(
      aggregates.map((entry) => [
        entry.rankingItemId,
        { totalRatings: Number(entry.totalRatings ?? 0), averageRaw: Number(entry.averageRaw ?? 0) }
      ])
    );
    const userRatingMap = new Map(userRatings.map((entry) => [entry.rankingItemId, entry.rating]));
    const reportedItemIds = buildSet(
      reportedItemRows as Array<{ rankingItemId: string }>,
      "rankingItemId"
    );
    const serializedItem = await serializeRankingItem(item, aggregateMap, userRatingMap, {
      currentUser,
      rankingType: ranking.type as "official" | "community",
      rankingAuthorId: ranking.author.id,
      reportedItemIds
    });
    const commentThreads = await buildRankingItemCommentThreads({
      comments,
      currentUser,
      ratingByAuthor: new Map(authorRatings),
      replyToUsers: new Map(
        replyUsers.map((user) => [
          user.id,
          {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: null,
            role: user.role as "user" | "admin"
          }
        ])
      ),
      likedCommentIds: buildSet(likedRows as Array<{ commentId: string }>, "commentId"),
      reportedCommentIds: buildSet(
        reportedCommentRows as Array<{ commentId: string }>,
        "commentId"
      )
    });
    const ratingBreakdown = buildRatingBreakdownFromRows(ratingBreakdownRows);

    return {
      item: {
        ...serializedItem,
        ranking: {
          id: ranking.id,
          title: ranking.title
        },
        comments: commentThreads,
        ratingBreakdown,
        myReview: currentUserId
          ? commentThreads.find((entry) => entry.author.id === currentUserId) ?? null
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
        authorId: payload.item.authorId,
        status: payload.item.status,
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
        likeCount: payload.item.likeCount,
        reportCount: payload.item.reportCount,
        myRating: payload.item.myRating,
        viewer: payload.item.viewer
      }
    };
  },

  async createRankingItemComment(
    id: string,
    currentUserId: string,
    input: { content: string; parentCommentId?: string }
  ) {
    const item = await rankingsRepo.getRankingItemById(id);
    if (!item) {
      return null;
    }

    let parentComment: Awaited<ReturnType<typeof rankingsRepo.getRankingItemCommentById>> | null = null;
    let parentCommentId: string | null = null;
    let replyToCommentId: string | null = null;
    let replyToUserId: string | null = null;

    if (input.parentCommentId) {
      parentComment = await rankingsRepo.getRankingItemCommentById(input.parentCommentId);
      if (!parentComment || parentComment.rankingItemId !== id) {
        return null;
      }

      parentCommentId = parentComment.parentCommentId ?? parentComment.id;
      replyToCommentId = parentComment.id;
      replyToUserId = parentComment.author.id;
    }

    const currentRating = await rankingsRepo.getUserRankingItemRating(id, currentUserId);
    if (currentRating === null) {
      await rankingsRepo.upsertRankingItemRating({
        rankingItemId: id,
        userId: currentUserId,
        rating: 5
      });
    }

    const created = await rankingsRepo.createRankingItemComment({
      rankingItemId: id,
      authorId: currentUserId,
      parentCommentId,
      replyToCommentId,
      replyToUserId,
      content: input.content
    });

    if (!created) {
      return null;
    }

    const payload = await this.getRankingItemDetail(id, currentUserId);
    if (!payload) {
      return null;
    }

    const allComments = [
      ...payload.item.comments,
      ...payload.item.comments.flatMap((entry) => entry.replies)
    ];
    const currentComment = allComments.find((entry) => entry.id === created.id) ?? null;
    return currentComment ? { item: currentComment } : null;
  },

  async updateRankingItemComment(
    itemId: string,
    commentId: string,
    currentUser: CurrentUser,
    input: { content: string }
  ) {
    const comment = await rankingsRepo.getRankingItemCommentById(commentId);
    if (!comment || comment.rankingItemId !== itemId) {
      return { kind: "not_found" as const };
    }

    if (!(currentUser.role === "admin" || currentUser.id === comment.author.id)) {
      return { kind: "forbidden" as const };
    }

    await rankingsRepo.updateRankingItemComment(commentId, input.content);
    const payload = await this.getRankingItemDetail(itemId, currentUser.id);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    const allComments = [
      ...payload.item.comments,
      ...payload.item.comments.flatMap((entry) => entry.replies)
    ];
    const updated = allComments.find((entry) => entry.id === commentId) ?? null;
    return updated ? { kind: "ok" as const, item: updated } : { kind: "not_found" as const };
  },

  async deleteRankingItemComment(itemId: string, commentId: string, currentUser: CurrentUser) {
    const comment = await rankingsRepo.getRankingItemCommentById(commentId);
    if (!comment || comment.rankingItemId !== itemId) {
      return { kind: "not_found" as const };
    }

    if (!(currentUser.role === "admin" || currentUser.id === comment.author.id)) {
      return { kind: "forbidden" as const };
    }

    await rankingsRepo.deleteRankingItemCommentThread(itemId, commentId);
    return { kind: "ok" as const };
  },

  async toggleRankingItemCommentLike(itemId: string, commentId: string, currentUser: CurrentUser) {
    const comment = await rankingsRepo.getRankingItemCommentById(commentId);
    if (!comment || comment.rankingItemId !== itemId) {
      return { kind: "not_found" as const };
    }

    await rankingsRepo.toggleRankingItemCommentLike(commentId, currentUser.id);
    return { kind: "ok" as const };
  },

  async reportRankingItemComment(
    itemId: string,
    commentId: string,
    currentUser: CurrentUser,
    reason: string
  ) {
    const comment = await rankingsRepo.getRankingItemCommentById(commentId);
    if (!comment || comment.rankingItemId !== itemId) {
      return { kind: "not_found" as const };
    }

    await rankingsRepo.createRankingItemCommentReport({
      commentId,
      reporterId: currentUser.id,
      reason
    });
    return { kind: "ok" as const };
  }
};
