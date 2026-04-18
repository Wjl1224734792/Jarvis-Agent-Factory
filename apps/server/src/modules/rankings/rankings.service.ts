import type { RankingDetail, RatingTarget, RankingListItem } from "@feijia/schemas";
import { powerTypeSchema } from "@feijia/schemas";
import { rankingsRepo } from "./rankings.repo";
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";
import { uploadsRepo } from "../uploads/upload.repo";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { socialService } from "../social/social.service";
import { buildCommentThreads } from "../../lib/comment-serializer";
import { rankRatingTargetsByDynamicScore } from "./ranking-score";
import {
  isValidAuthRole,
  isValidRankingType,
  isValidRankingStatus,
  isValidRatingTargetAddPolicy,
  isValidRankingCommentStatus
} from "../../lib/type-guards";

const RATING_BREAKDOWN_SCORES = [5, 4, 3, 2, 1] as const;

type CurrentUser = {
  id: string;
  role: "user" | "admin";
};

type RatingTargetStatus = "pending" | "published" | "rejected" | "hidden";

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

function canManageRatingTarget(input: {
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

function canInspectRatingTarget(input: {
  currentUser?: CurrentUser;
  rankingType: "official" | "community";
  rankingAuthorId: string;
  itemAuthorId: string;
  itemStatus: RatingTargetStatus;
}) {
  if (input.itemStatus === "published") {
    return true;
  }

  return canManageRatingTarget(input);
}

function buildSet<T extends string>(rows: Array<{ [key: string]: T }>, key: string) {
  return new Set(rows.map((row) => row[key]));
}

type RatingTargetAggregate = {
  totalRatings: number;
  averageRaw: number;
};

type RatingTargetSourceItem = Awaited<ReturnType<typeof rankingsRepo.listRatingTargets>>[number];

function buildDynamicRankingAggregateMap(
  items: RatingTargetSourceItem[],
  aggregateMap: Map<string, RatingTargetAggregate>
) {
  return new Map(
    items.map((item) => [
      item.id,
      {
        averageRaw: aggregateMap.get(item.id)?.averageRaw ?? 0,
        totalRatings: aggregateMap.get(item.id)?.totalRatings ?? 0,
        commentCount: item.commentCount ?? 0,
        likeCount: item.likeCount ?? 0
      }
    ])
  );
}

function groupRatingTargetsByRankingId(items: RatingTargetSourceItem[]) {
  const grouped = new Map<string, RatingTargetSourceItem[]>();

  for (const item of items) {
    const bucket = grouped.get(item.rankingId) ?? [];
    bucket.push(item);
    grouped.set(item.rankingId, bucket);
  }

  return grouped;
}

function applyDynamicRanks<T extends { id: string; rank: number }>(
  serializedItems: T[],
  sourceItems: RatingTargetSourceItem[],
  aggregateMap: Map<string, RatingTargetAggregate>
) {
  const rankById = new Map(
    rankRatingTargetsByDynamicScore(
      sourceItems.map((item) => ({
        id: item.id,
        rank: item.rank
      })),
      buildDynamicRankingAggregateMap(sourceItems, aggregateMap)
    ).map((item) => [item.id, item.rank])
  );

  return [...serializedItems]
    .map((item) => ({
      ...item,
      rank: rankById.get(item.id) ?? item.rank
    }))
    .sort((left, right) => left.rank - right.rank);
}

async function validateOwnedReportImages(ownerId: string, imageIds: string[]) {
  return uploadsRepo.listOwnedUploadedFiles({
    ownerId,
    fileIds: imageIds,
    mediaKind: "image",
    bizType: "report-image"
  });
}

async function serializeRatingTarget(
  item: Awaited<ReturnType<typeof rankingsRepo.listRatingTargets>>[number],
  aggregateMap: Map<string, { totalRatings: number; averageRaw: number }>,
  userRatingMap: Map<string, number | null>,
  input: {
    currentUser?: CurrentUser;
    rankingType: "official" | "community";
    rankingAuthorId: string;
    reportedItemIds?: Set<string>;
  }
): Promise<RatingTarget> {
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
  const linkedModel =
    hasLinkedModel &&
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
      ? {
          id: item.linkedModelId,
          slug: item.linkedModelSlug,
          name: item.linkedModelName,
          summary: item.linkedModelSummary,
          powerType: powerTypeSchema.parse(item.linkedModelPowerType),
          category: {
            id: item.linkedModelCategoryId,
            slug: item.linkedModelCategorySlug,
            name: item.linkedModelCategoryName
          },
          brand: {
            id: item.linkedModelBrandId,
            slug: item.linkedModelBrandSlug,
            name: item.linkedModelBrandName
          }
        }
      : null;

  return {
    id: item.id,
    rankingId: item.rankingId,
    authorId: item.authorId,
    status: isValidRankingStatus(item.status) ? item.status : ("published" satisfies RatingTargetStatus),
    rejectionReason: item.rejectionReason ?? null,
    rank: item.rank,
    title: item.title,
    summary: item.summary,
    imageFileId: item.imageFileId ?? null,
    imageUrl: await resolveRankingImage(item.imageFileId),
    brandName: item.brandName,
    linkedModel,
    averageScore: toTenPointScore(aggregate.averageRaw),
    totalRatings: aggregate.totalRatings,
    commentCount: item.commentCount,
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    myRating: userRatingMap.get(item.id) ?? null,
    viewer: {
      canEdit: canManageRatingTarget({
        currentUser: input.currentUser,
        rankingType: input.rankingType,
        rankingAuthorId: input.rankingAuthorId,
        itemAuthorId: item.authorId
      }),
      canDelete: canManageRatingTarget({
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
    status: (item.status ?? "visible") as "pending" | "visible" | "hidden",
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
      role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
    },
    viewer: {
      canEdit: Boolean(currentUser && (currentUser.role === "admin" || currentUser.id === item.author.id)),
      canDelete: Boolean(currentUser && (currentUser.role === "admin" || currentUser.id === item.author.id)),
      hasLiked: false,
      hasReported: false
    }
  };
}

type RatingTargetComment = Awaited<ReturnType<typeof rankingsRepo.listRatingTargetComments>>[number];

async function serializeRatingTargetCommentBase(
  comment: RatingTargetComment,
  replyToUsers: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; role: "user" | "admin" }
  >,
  currentUser?: CurrentUser,
  likedCommentIds?: Set<string>,
  reportedCommentIds?: Set<string>
) {
  return {
    id: comment.id,
    ratingTargetId: comment.ratingTargetId,
    parentCommentId: comment.parentCommentId,
    replyToCommentId: comment.replyToCommentId,
    content: comment.content,
    status: (comment.status ?? "visible") as "pending" | "visible" | "hidden",
    rating: comment.rating ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    likeCount: comment.likeCount ?? 0,
    reportCount: comment.reportCount ?? 0,
    author: {
      id: comment.author.id,
      displayName: comment.author.displayName,
      avatarUrl: await resolveUploadedFileUrl(comment.author.avatarFileId ?? null),
      role: isValidAuthRole(comment.author.role) ? comment.author.role : ("user" as "user" | "admin")
    },
    replyToUser: comment.replyToUserId
      ? replyToUsers.get(comment.replyToUserId) ?? null
      : null,
    viewer: {
      canEdit: Boolean(
        currentUser &&
          (currentUser.role === "admin" || currentUser.id === comment.author.id)
      ),
      canDelete: Boolean(
        currentUser &&
          (currentUser.role === "admin" || currentUser.id === comment.author.id)
      ),
      hasLiked: likedCommentIds?.has(comment.id) ?? false,
      hasReported: reportedCommentIds?.has(comment.id) ?? false
    }
  };
}

async function buildRatingTargetCommentThreads(input: {
  comments: Awaited<ReturnType<typeof rankingsRepo.listRatingTargetComments>>;
  currentUser?: CurrentUser;
  replyToUsers: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; role: "user" | "admin" }
  >;
  likedCommentIds: Set<string>;
  reportedCommentIds: Set<string>;
}) {
  const compare = (
    left: { likeCount: number; updatedAt: string },
    right: { likeCount: number; updatedAt: string }
  ) => right.likeCount - left.likeCount || right.updatedAt.localeCompare(left.updatedAt);

  const serialized = await Promise.all(
    input.comments.map((c) =>
      serializeRatingTargetCommentBase(
        c,
        input.replyToUsers,
        input.currentUser,
        input.likedCommentIds,
        input.reportedCommentIds
      )
    )
  );

  return buildCommentThreads(serialized, { compare });
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
    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    if (rankingType === "official") {
      return true;
    }

    return ranking.status === "published";
  });

  const groupedRatingTargets = groupRatingTargetsByRankingId(
    await rankingsRepo.listRatingTargetsByRankingIds(rankings.map((ranking) => ranking.id))
  );
  const ratingTargetsByRanking = new Map<string, RatingTargetSourceItem[]>(
    rankings.map((ranking) => [
      ranking.id,
      (groupedRatingTargets.get(ranking.id) ?? []).filter((item) =>
        canInspectRatingTarget({
          currentUser,
          rankingType: isValidRankingType(ranking.type) ? ranking.type : "community",
          rankingAuthorId: ranking.author.id,
          itemAuthorId: item.authorId,
          itemStatus: isValidRankingStatus(item.status) ? item.status : ("published" satisfies RatingTargetStatus)
        })
      )
    ])
  );

  const allRatingTargetIds = Array.from(ratingTargetsByRanking.values())
    .flat()
    .map((item) => item.id);
  const [itemAggregates, userItemRatings, reportedItemRows] = await Promise.all([
    rankingsRepo.listRatingTargetRatingAggregates(allRatingTargetIds),
    currentUser
      ? rankingsRepo.listUserRatingTargetRatings(currentUser.id, allRatingTargetIds)
      : Promise.resolve([]),
    currentUser
      ? rankingsRepo.listViewerRatingTargetReports(allRatingTargetIds, currentUser.id)
      : Promise.resolve([])
  ]);
  const itemAggregateMap = new Map(
    itemAggregates.map((item) => [
      item.ratingTargetId,
      {
        totalRatings: Number(item.totalRatings ?? 0),
        averageRaw: Number(item.averageRaw ?? 0)
      }
    ])
  );
  const userItemRatingMap = new Map(userItemRatings.map((item) => [item.ratingTargetId, item.rating]));
  const reportedItemIds = buildSet(
    reportedItemRows as Array<{ ratingTargetId: string }>,
    "ratingTargetId"
  );

  const all = await Promise.all(
    rankings.map(async (ranking) => {
      const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
      const itemAddPolicy =
        rankingType === "official"
          ? "owner"
          : (isValidRatingTargetAddPolicy(ranking.itemAddPolicy) ? ranking.itemAddPolicy : "owner");
      const sourceItems = ratingTargetsByRanking.get(ranking.id) ?? [];
      const items = await Promise.all(
        sourceItems.map((item) =>
          serializeRatingTarget(item, itemAggregateMap, userItemRatingMap, {
            currentUser,
            rankingType,
            rankingAuthorId: ranking.author.id,
            reportedItemIds
          })
        )
      );

      const rankedItems = applyDynamicRanks(items, sourceItems, itemAggregateMap);

      return {
        id: ranking.id,
        type: rankingType,
        status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden"),
        rejectionReason: ranking.rejectionReason ?? null,
        title: ranking.title,
        coverImageFileId: ranking.coverImageFileId ?? null,
        coverImageUrl: await resolveRankingImage(ranking.coverImageFileId),
        itemAddPolicy,
        averageScore: average(rankedItems.map((item) => item.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        reportCount: ranking.reportCount ?? 0,
        itemCount: rankedItems.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          avatarUrl: await resolveUploadedFileUrl(ranking.author.avatarFileId ?? null),
          role: isValidAuthRole(ranking.author.role) ? ranking.author.role : ("user" as "user" | "admin")
        },
        viewer: toRankingViewer({
          currentUser,
          authorId: ranking.author.id,
          itemAddPolicy,
          type: rankingType,
          status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden")
        }),
        items: rankedItems.slice(0, 3)
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
      description: "",
      coverImageFileId: input.coverImageFileId ?? null,
      itemAddPolicy: input.type === "official" ? "owner" : input.itemAddPolicy
    });

    if (!ranking) {
      return { kind: "internal_error" as const };
    }

    const itemStatus: RatingTargetStatus =
      rankingStatus === "pending" || (input.type === "community" && settings.ratingTargetModerationEnabled)
        ? "pending"
        : "published";
    await rankingsRepo.createRatingTargets(
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

    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    if (input.type !== rankingType) {
      return { kind: "forbidden" as const };
    }
    if (!canManageRanking({ currentUser, rankingType, rankingAuthorId: ranking.author.id })) {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));
    const settings = await siteSettingsService.getResolvedSettings();
    const nextItemStatus: RatingTargetStatus =
      ranking.status === "pending" || (rankingType === "community" && settings.ratingTargetModerationEnabled)
        ? "pending"
        : "published";
    const nextRankingStatus =
      rankingType === "community" && ranking.status !== "hidden"
        ? settings.rankingModerationEnabled
          ? "pending"
          : "published"
        : isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden");

    await rankingsRepo.updateRanking(rankingId, {
      status: nextRankingStatus,
      rejectionReason: null,
      title: input.title,
      description: "",
      coverImageFileId: input.coverImageFileId ?? null,
      itemAddPolicy: rankingType === "official" ? "owner" : input.itemAddPolicy
    });
    await rankingsRepo.deleteRatingTargets(rankingId);
    await rankingsRepo.createRatingTargets(
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

  async addRatingTarget(
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

    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    const itemAddPolicy =
      rankingType === "official"
        ? "owner"
        : (isValidRatingTargetAddPolicy(ranking.itemAddPolicy) ? ranking.itemAddPolicy : "owner");
    const viewer = toRankingViewer({
      currentUser,
      authorId: ranking.author.id,
      itemAddPolicy,
      type: rankingType,
      status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden")
    });
    if (!viewer.canAddItems) {
      return { kind: "forbidden" as const };
    }

    const models = await rankingsRepo.listPublishedModels();
    const modelBySlug = new Map(models.map((item) => [item.slug, item]));
    const status: RatingTargetStatus =
      rankingType === "community" && (await siteSettingsService.shouldModerateRatingTarget())
        ? "pending"
        : "published";
    await rankingsRepo.addRatingTarget({
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

  async updateRatingTarget(
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
    const item = await rankingsRepo.getRatingTargetById(id);
    if (!item) {
      return { kind: "not_found" as const };
    }

    const ranking = await rankingsRepo.getRankingById(item.rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    if (
      !canManageRatingTarget({
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
    const shouldModerateItem =
      rankingType === "community" && (await siteSettingsService.shouldModerateRatingTarget());
    const nextStatus: RatingTargetStatus =
      item.status === "hidden" ? "hidden" : shouldModerateItem ? "pending" : "published";
    await rankingsRepo.updateRatingTarget(id, {
      title: input.title,
      summary: input.summary,
      imageFileId: input.imageFileId ?? null,
      brandName: input.brandName,
      linkedModelId: input.linkedModelSlug ? modelBySlug.get(input.linkedModelSlug)?.id ?? null : null,
      status: nextStatus,
      rejectionReason: null
    });

    const payload = await this.getRatingTargetDetail(id, currentUser.id);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, payload };
  },

  async deleteRatingTarget(id: string, currentUser: CurrentUser) {
    const item = await rankingsRepo.getRatingTargetById(id);
    if (!item) {
      return { kind: "not_found" as const };
    }
    const ranking = await rankingsRepo.getRankingById(item.rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    if (
      !canManageRatingTarget({
        currentUser,
        rankingType,
        rankingAuthorId: ranking.author.id,
        itemAuthorId: item.authorId
      })
    ) {
      return { kind: "forbidden" as const };
    }

    await rankingsRepo.deleteRatingTarget(id);
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

    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    const canInspectUnpublished =
      currentUser?.role === "admin" || currentUser?.id === ranking.author.id;
    if (rankingType === "community" && ranking.status !== "published" && !canInspectUnpublished) {
      return null;
    }

    const items = (await rankingsRepo.listRatingTargets(id)).filter((entry) =>
      canInspectRatingTarget({
        currentUser,
        rankingType,
        rankingAuthorId: ranking.author.id,
        itemAuthorId: entry.authorId,
        itemStatus: isValidRankingStatus(entry.status) ? entry.status : ("published" satisfies RatingTargetStatus)
      })
    );
    const [allComments, aggregates, userRatings, reportedRows] = await Promise.all([
      rankingsRepo.listRankingComments(id),
      rankingsRepo.listRatingTargetRatingAggregates(items.map((entry) => entry.id)),
      currentUser
        ? rankingsRepo.listUserRatingTargetRatings(currentUser.id, items.map((entry) => entry.id))
        : Promise.resolve([]),
      currentUser
        ? rankingsRepo.listViewerRatingTargetReports(items.map((entry) => entry.id), currentUser.id)
        : Promise.resolve([])
    ]);
    const comments = allComments.filter(
      (comment) => comment.status === "visible" || currentUser?.role === "admin" || currentUser?.id === comment.author.id
    );
    const aggregateMap = new Map(
      aggregates.map((entry) => [
        entry.ratingTargetId,
        {
          totalRatings: Number(entry.totalRatings ?? 0),
          averageRaw: Number(entry.averageRaw ?? 0)
        }
      ])
    );
    const userRatingMap = new Map(userRatings.map((entry) => [entry.ratingTargetId, entry.rating]));
    const reportedItemIds = buildSet(
      reportedRows as Array<{ ratingTargetId: string }>,
      "ratingTargetId"
    );
    const serializedItems = await Promise.all(
      items.map((entry) =>
        serializeRatingTarget(entry, aggregateMap, userRatingMap, {
          currentUser,
          rankingType,
          rankingAuthorId: ranking.author.id,
          reportedItemIds
        })
      )
    );
    const rankedItems = applyDynamicRanks(serializedItems, items, aggregateMap);
    const itemAddPolicy =
      rankingType === "official"
        ? "owner"
        : (isValidRatingTargetAddPolicy(ranking.itemAddPolicy) ? ranking.itemAddPolicy : "owner");

    return {
      item: {
        id: ranking.id,
        type: rankingType,
        status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden"),
        rejectionReason: ranking.rejectionReason ?? null,
        title: ranking.title,
        coverImageFileId: ranking.coverImageFileId ?? null,
        coverImageUrl: await resolveRankingImage(ranking.coverImageFileId),
        itemAddPolicy,
        viewer: toRankingViewer({
          currentUser,
          authorId: ranking.author.id,
          itemAddPolicy,
          type: rankingType,
          status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden")
        }),
        averageScore: average(rankedItems.map((entry) => entry.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        reportCount: ranking.reportCount ?? 0,
        itemCount: rankedItems.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          avatarUrl: await resolveUploadedFileUrl(ranking.author.avatarFileId ?? null),
          role: isValidAuthRole(ranking.author.role) ? ranking.author.role : ("user" as "user" | "admin")
        },
        comments: await Promise.all(comments.map((comment) => serializeRankingComment(comment, currentUser))),
        items: rankedItems
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
    const rankingItemsByRanking = groupRatingTargetsByRankingId(
      await rankingsRepo.listRatingTargetsByRankingIds(rankings.map((ranking) => ranking.id))
    );

    const allRatingTargetIds = Array.from(rankingItemsByRanking.values())
      .flat()
      .map((entry) => entry.id);
    const itemAggregates = await rankingsRepo.listRatingTargetRatingAggregates(allRatingTargetIds);
    const itemAggregateMap = new Map(
      itemAggregates.map((entry) => [
        entry.ratingTargetId,
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
              const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
              if (filters?.scope && rankingType !== filters.scope) {
                return false;
              }
              if (filters?.status && ranking.status !== filters.status) {
                return false;
              }
              return true;
            })
            .map(async (ranking) => {
              const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
              const itemAddPolicy =
                rankingType === "official"
                  ? "owner"
                  : (isValidRatingTargetAddPolicy(ranking.itemAddPolicy) ? ranking.itemAddPolicy : "owner");
              const sourceItems = rankingItemsByRanking.get(ranking.id) ?? [];
              const items = await Promise.all(
                sourceItems.map((entry) =>
                  serializeRatingTarget(entry, itemAggregateMap, new Map(), {
                    currentUser,
                    rankingType,
                    rankingAuthorId: ranking.author.id,
                    reportedItemIds: new Set()
                  })
                )
              );

              const rankedItems = applyDynamicRanks(items, sourceItems, itemAggregateMap);

              return {
                id: ranking.id,
                type: rankingType,
                status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden"),
                rejectionReason: ranking.rejectionReason ?? null,
                title: ranking.title,
                coverImageFileId: ranking.coverImageFileId ?? null,
                coverImageUrl: await resolveRankingImage(ranking.coverImageFileId),
                itemAddPolicy,
                averageScore: average(rankedItems.map((entry) => entry.averageScore).filter((value) => value > 0)),
                commentCount: ranking.commentCount,
                reportCount: ranking.reportCount ?? 0,
                itemCount: rankedItems.length,
                createdAt: ranking.createdAt.toISOString(),
                author: {
                  id: ranking.author.id,
                  displayName: ranking.author.displayName,
                  avatarUrl: await resolveUploadedFileUrl(ranking.author.avatarFileId ?? null),
                  role: isValidAuthRole(ranking.author.role) ? ranking.author.role : ("user" as "user" | "admin")
                },
                viewer: toRankingViewer({
                  currentUser,
                  authorId: ranking.author.id,
                  itemAddPolicy,
                  type: rankingType,
                  status: isValidRankingStatus(ranking.status) ? ranking.status : ("published" as "pending" | "published" | "rejected" | "hidden")
                }),
                items: rankedItems.slice(0, 3)
              };
            })
        )
      }
    };
  },

  async updateRankingStatus(
    rankingId: string,
    currentUser: CurrentUser,
    status: "published" | "rejected" | "hidden",
    rejectionReason?: string | null
  ) {
    if (currentUser.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    if (rankingType !== "community") {
      return { kind: "forbidden" as const };
    }

    const previousStatus = ranking.status;
    await rankingsRepo.updateRankingStatus(rankingId, status, rejectionReason ?? null);
    const payload = await this.getRankingDetail(rankingId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    if (previousStatus !== status) {
      const statusLabel =
        status === "published" ? "已发布" : status === "rejected" ? "未通过审核" : "已下架";
      await socialService.recordSystemNotification({
        userId: ranking.author.id,
        type: "ranking_status_changed",
        title: status === "published" ? "榜单审核通过" : "榜单状态更新",
        summary: `榜单《${ranking.title}》当前状态：${statusLabel}`,
        target: {
          type: "ranking",
          id: ranking.id,
          title: ranking.title,
          status,
          href: `/rankings/${ranking.id}`
        },
        metadata: {
          fromStatus: previousStatus,
          toStatus: status,
          rejectionReason: status === "rejected" ? rejectionReason ?? null : null
        }
      });
    }

    return { kind: "ok" as const, payload };
  },

  async createRankingComment(rankingId: string, currentUserId: string, content: string) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return null;
    }

    const status = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled
      ? "pending"
      : "visible";

    const item = await rankingsRepo.createRankingComment({
      rankingId,
      authorId: currentUserId,
      content,
      status
    });

    return item ? { item: await serializeRankingComment(item, { id: currentUserId, role: "user" }) } : null;
  },

  async reportRanking(
    rankingId: string,
    currentUser: CurrentUser,
    input: { reason: string; imageIds: string[] }
  ) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking || ranking.status !== "published") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await rankingsRepo.createRankingReport({
      rankingId,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },

  async reportRatingTarget(
    id: string,
    currentUser: CurrentUser,
    input: { reason: string; imageIds: string[] }
  ) {
    const item = await rankingsRepo.getRatingTargetById(id);
    if (!item || item.status !== "published") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await rankingsRepo.createRatingTargetReport({
      ratingTargetId: id,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },

  async getRatingTargetDetail(id: string, currentUserOrId?: CurrentUser | string) {
    const item = await rankingsRepo.getRatingTargetById(id);
    if (!item) {
      return null;
    }

    const ranking = await rankingsRepo.getRankingById(item.rankingId);
    if (!ranking) {
      return null;
    }

    const currentUser =
      typeof currentUserOrId === "string"
        ? { id: currentUserOrId, role: "user" as const }
        : currentUserOrId;
    const currentUserId = currentUser?.id;
    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    if (
      !canInspectRatingTarget({
        currentUser,
        rankingType,
        rankingAuthorId: ranking.author.id,
        itemAuthorId: item.authorId,
        itemStatus: isValidRankingStatus(item.status) ? item.status : ("published" satisfies RatingTargetStatus)
      })
    ) {
      return null;
    }

    const rankingItems = (await rankingsRepo.listRatingTargets(item.rankingId)).filter((entry) =>
      canInspectRatingTarget({
        currentUser,
        rankingType,
        rankingAuthorId: ranking.author.id,
        itemAuthorId: entry.authorId,
        itemStatus: isValidRankingStatus(entry.status) ? entry.status : ("published" satisfies RatingTargetStatus)
      })
    );
    const rankingItemIds = rankingItems.map((entry) => entry.id);

    const [userRatings, allComments, reportedItemRows, aggregates, ratingBreakdownRows] = await Promise.all([
      currentUserId
        ? rankingsRepo.listUserRatingTargetRatings(currentUserId, rankingItemIds)
        : Promise.resolve([]),
      rankingsRepo.listRatingTargetComments(id),
      currentUserId
        ? rankingsRepo.listViewerRatingTargetReports([id], currentUserId)
        : Promise.resolve([]),
      rankingsRepo.listRatingTargetRatingAggregates(rankingItemIds),
      rankingsRepo.listRatingTargetRatingBreakdown(id)
    ]);
    const comments = allComments.filter(
      (comment) =>
        comment.status === "visible" ||
        currentUser?.role === "admin" ||
        currentUserId === comment.author.id
    );
    const commentIds = comments.map((comment) => comment.id);
    const replyToUserIds = Array.from(
      new Set(
        comments
          .map((comment) => comment.replyToUserId)
          .filter((value): value is string => Boolean(value))
      )
    );
    const [replyUsers, likedRows, reportedCommentRows] = await Promise.all([
      rankingsRepo.listUsersByIds(replyToUserIds),
      currentUserId
        ? rankingsRepo.listViewerRatingTargetCommentLikes(commentIds, currentUserId)
        : Promise.resolve([]),
      currentUserId
        ? rankingsRepo.listViewerRatingTargetCommentReports(commentIds, currentUserId)
        : Promise.resolve([])
    ]);

    const aggregateMap = new Map(
      aggregates.map((entry) => [
        entry.ratingTargetId,
        {
          totalRatings: Number(entry.totalRatings ?? 0),
          averageRaw: Number(entry.averageRaw ?? 0)
        }
      ])
    );
    const userRatingMap = new Map(
      userRatings.map((entry) => [entry.ratingTargetId, entry.rating])
    );
    const reportedItemIds = buildSet(
      reportedItemRows as Array<{ ratingTargetId: string }>,
      "ratingTargetId"
    );
    const serializedItem = await serializeRatingTarget(item, aggregateMap, userRatingMap, {
      currentUser,
      rankingType,
      rankingAuthorId: ranking.author.id,
      reportedItemIds
    });
    const dynamicRanks = rankRatingTargetsByDynamicScore(
      rankingItems.map((entry) => ({
        id: entry.id,
        rank: entry.rank,
        createdAt: entry.createdAt.toISOString()
      })),
      buildDynamicRankingAggregateMap(rankingItems, aggregateMap)
    );
    const rankById = new Map(dynamicRanks.map((entry) => [entry.id, entry.rank]));
    const commentThreads = await buildRatingTargetCommentThreads({
      comments,
      currentUser,
      replyToUsers: new Map(
        replyUsers.map((user) => [
          user.id,
          {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: null,
            role: isValidAuthRole(user.role) ? user.role : ("user" as "user" | "admin")
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
        rank: rankById.get(id) ?? serializedItem.rank,
        ranking: {
          id: ranking.id,
          title: ranking.title
        },
        comments: commentThreads,
        ratingBreakdown,
        myReview: currentUserId
          ? commentThreads
              .filter((entry) => entry.author.id === currentUserId)
              .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
          : null
      }
    };
  },

  async submitRatingTargetReview(
    id: string,
    currentUserId: string,
    input: {
      rating: number;
      content: string;
    }
  ) {
    const existing = await rankingsRepo.getRatingTargetById(id);
    if (!existing) {
      return null;
    }

    await rankingsRepo.upsertRatingTargetReview({
      ratingTargetId: id,
      authorId: currentUserId,
      rating: input.rating,
      content: input.content,
      status: (await siteSettingsService.getResolvedSettings()).commentModerationEnabled
        ? "pending"
        : "visible"
    });

    return this.getRatingTargetDetail(id, currentUserId);
  },

  async submitRatingTargetRating(id: string, currentUserId: string, rating: number) {
    const existing = await rankingsRepo.getRatingTargetById(id);
    if (!existing) {
      return null;
    }

    await rankingsRepo.upsertRatingTargetReview({
      ratingTargetId: id,
      authorId: currentUserId,
      rating,
      content: "Rating only",
      status: (await siteSettingsService.getResolvedSettings()).commentModerationEnabled
        ? "pending"
        : "visible"
    });

    const payload = await this.getRatingTargetDetail(id, currentUserId);
    if (!payload) {
      return null;
    }

    return {
      item: {
        id: payload.item.id,
        rankingId: payload.item.rankingId,
        authorId: payload.item.authorId,
        status: payload.item.status,
        rejectionReason: payload.item.rejectionReason,
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

  async updateRatingTargetStatus(
    id: string,
    currentUser: CurrentUser,
    status: "published" | "rejected" | "hidden",
    rejectionReason?: string | null
  ) {
    if (currentUser.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const item = await rankingsRepo.getRatingTargetById(id);
    if (!item) {
      return { kind: "not_found" as const };
    }

    const previousStatus = item.status;
    await rankingsRepo.updateRatingTargetStatus(id, {
      status,
      rejectionReason: status === "rejected" ? rejectionReason ?? null : null
    });
    const payload = await this.getRatingTargetDetail(id, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    if (previousStatus !== status) {
      const statusLabel =
        status === "published" ? "已发布" : status === "rejected" ? "未通过审核" : "已下架";
      await socialService.recordSystemNotification({
        userId: item.authorId,
        type: "rating_target_status_changed",
        title: status === "published" ? "榜单条目审核通过" : "榜单条目状态更新",
        summary: `条目《${item.title}》当前状态：${statusLabel}`,
        target: {
          type: "rating_target",
          id: item.id,
          title: item.title,
          status,
          href: `/rankings/items/${item.id}`
        },
        metadata: {
          rankingId: item.rankingId,
          fromStatus: previousStatus,
          toStatus: status,
          rejectionReason: status === "rejected" ? rejectionReason ?? null : null
        }
      });
    }

    return { kind: "ok" as const, payload };
  },

  async createRatingTargetComment(
    id: string,
    currentUserId: string,
    input: { content: string; parentCommentId?: string; rating?: number }
  ) {
    const item = await rankingsRepo.getRatingTargetById(id);
    if (!item) {
      return null;
    }

    let parentComment: Awaited<ReturnType<typeof rankingsRepo.getRatingTargetCommentById>> | null = null;
    let parentCommentId: string | null = null;
    let replyToCommentId: string | null = null;
    let replyToUserId: string | null = null;

    if (input.parentCommentId) {
      parentComment = await rankingsRepo.getRatingTargetCommentById(input.parentCommentId);
      if (!parentComment || parentComment.ratingTargetId !== id || parentComment.status !== "visible") {
        return null;
      }

      parentCommentId = parentComment.parentCommentId ?? parentComment.id;
      replyToCommentId = parentComment.id;
      replyToUserId = parentComment.author.id;
    }

    const status = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled
      ? "pending"
      : "visible";
    const rating = input.parentCommentId ? null : (input.rating ?? null);
    if (rating !== null) {
      await rankingsRepo.upsertRatingTargetRating({
        ratingTargetId: id,
        userId: currentUserId,
        rating
      });
    }

    const created = await rankingsRepo.createRatingTargetComment({
      ratingTargetId: id,
      authorId: currentUserId,
      parentCommentId,
      replyToCommentId,
      replyToUserId,
      content: input.content,
      rating,
      status
    });

    if (!created) {
      return null;
    }
    if (status === "visible") {
      const targetUserId = parentComment ? parentComment.author.id : item.authorId;
      if (targetUserId !== currentUserId) {
        await socialService.recordNotification({
          userId: targetUserId,
          actorId: currentUserId,
          type: parentComment ? "comment_replied" : "post_commented",
          target: {
            type: "rating_target",
            id: item.id,
            title: item.title,
            href: `/rating-targets/${item.id}`
          },
          title: parentComment ? "榜单条目评论收到回复" : "榜单条目收到新评论",
          summary: parentComment
            ? `有人回复了你在《${item.title}》下的评论`
            : `有人评论了你的榜单条目《${item.title}》`,
          metadata: { ratingTargetCommentId: created.id }
        });
      }
    }

    const payload = await this.getRatingTargetDetail(id, currentUserId);
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

  async updateRatingTargetComment(
    itemId: string,
    commentId: string,
    currentUser: CurrentUser,
    input: { content: string }
  ) {
    const comment = await rankingsRepo.getRatingTargetCommentById(commentId);
    if (!comment || comment.ratingTargetId !== itemId) {
      return { kind: "not_found" as const };
    }

    if (!(currentUser.role === "admin" || currentUser.id === comment.author.id)) {
      return { kind: "forbidden" as const };
    }

    await rankingsRepo.updateRatingTargetComment(commentId, input.content);
    const shouldModerate = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled;
    if (shouldModerate && comment.status === "visible") {
      await rankingsRepo.updateRatingTargetCommentStatus(commentId, "pending");
    }

    const payload = await this.getRatingTargetDetail(itemId, currentUser);
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

  async deleteRatingTargetComment(itemId: string, commentId: string, currentUser: CurrentUser) {
    const comment = await rankingsRepo.getRatingTargetCommentById(commentId);
    if (!comment || comment.ratingTargetId !== itemId) {
      return { kind: "not_found" as const };
    }

    if (!(currentUser.role === "admin" || currentUser.id === comment.author.id)) {
      return { kind: "forbidden" as const };
    }

    await rankingsRepo.deleteRatingTargetCommentThread(itemId, commentId);
    return { kind: "ok" as const };
  },

  async toggleRatingTargetCommentLike(itemId: string, commentId: string, currentUser: CurrentUser) {
    const comment = await rankingsRepo.getRatingTargetCommentById(commentId);
    if (!comment || comment.ratingTargetId !== itemId || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const result = await rankingsRepo.toggleRatingTargetCommentLike(commentId, currentUser.id);
    if (result.active && comment.author.id !== currentUser.id) {
      const target = await rankingsRepo.getRatingTargetById(itemId);
      if (target) {
        await socialService.recordNotification({
          userId: comment.author.id,
          actorId: currentUser.id,
          type: "post_liked",
          target: {
            type: "rating_target",
            id: target.id,
            title: target.title,
            href: `/rating-targets/${target.id}`
          },
          title: "榜单条目评论收到点赞",
          summary: `有人点赞了你在《${target.title}》下的评论`,
          metadata: { ratingTargetCommentId: commentId }
        });
      }
    }
    return { kind: "ok" as const };
  },

  async reportRatingTargetComment(
    itemId: string,
    commentId: string,
    currentUser: CurrentUser,
    input: { reason: string; imageIds: string[] }
  ) {
    const comment = await rankingsRepo.getRatingTargetCommentById(commentId);
    if (!comment || comment.ratingTargetId !== itemId || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await rankingsRepo.createRatingTargetCommentReport({
      commentId,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },
  async listAdminRankingComments(status?: "pending" | "visible" | "hidden") {
    const items = await rankingsRepo.listAdminRankingComments(status);
    return {
      items: await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          rankingId: item.rankingId,
          rankingTitle: item.rankingTitle,
          content: item.content,
          status: isValidRankingCommentStatus(item.status) ? item.status : ("visible" as "pending" | "visible" | "hidden"),
          likeCount: item.likeCount ?? 0,
          reportCount: item.reportCount ?? 0,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          author: {
            id: item.author.id,
            displayName: item.author.displayName,
            avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
            role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
          },
          viewer: {
            canEdit: false,
            canDelete: false,
            hasLiked: false,
            hasReported: false
          }
        }))
      )
    };
  },
  async updateRankingCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const item = await rankingsRepo.updateRankingCommentStatus(id, status);
    if (!item) {
      return null;
    }

    return {
      id: item.id,
      rankingId: item.rankingId,
      rankingTitle: item.rankingTitle,
      content: item.content,
      status: isValidRankingCommentStatus(item.status) ? item.status : ("visible" as "pending" | "visible" | "hidden"),
      likeCount: item.likeCount ?? 0,
      reportCount: item.reportCount ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
        role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
      },
      viewer: {
        canEdit: false,
        canDelete: false,
        hasLiked: false,
        hasReported: false
      }
    };
  },
  async listAdminRatingTargetComments(status?: "pending" | "visible" | "hidden") {
    const items = await rankingsRepo.listAdminRatingTargetComments(status);
    return {
      items: await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          ratingTargetId: item.ratingTargetId,
          ratingTargetTitle: item.ratingTargetTitle,
          rankingTitle: item.rankingTitle,
          parentCommentId: item.parentCommentId,
          replyToCommentId: item.replyToCommentId,
          content: item.content,
          status: isValidRankingCommentStatus(item.status) ? item.status : ("visible" as "pending" | "visible" | "hidden"),
          rating: 5,
          likeCount: item.likeCount ?? 0,
          reportCount: item.reportCount ?? 0,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          author: {
            id: item.author.id,
            displayName: item.author.displayName,
            avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
            role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
          },
          replyToUser: item.replyToUser?.id
            ? {
                id: item.replyToUser.id,
                displayName: item.replyToUser.displayName,
                avatarUrl: await resolveUploadedFileUrl(item.replyToUser.avatarFileId ?? null),
                role: isValidAuthRole(item.replyToUser.role) ? item.replyToUser.role : ("user" as "user" | "admin")
              }
            : null,
          viewer: {
            canEdit: false,
            canDelete: false,
            hasLiked: false,
            hasReported: false
          }
        }))
      )
    };
  },
  async updateRatingTargetCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const item = await rankingsRepo.updateRatingTargetCommentStatus(id, status);
    if (!item) {
      return null;
    }

    return {
      id: item.id,
      ratingTargetId: item.ratingTargetId,
      ratingTargetTitle: item.ratingTargetTitle,
      rankingTitle: item.rankingTitle,
      parentCommentId: item.parentCommentId,
      replyToCommentId: item.replyToCommentId,
      content: item.content,
      status: isValidRankingCommentStatus(item.status) ? item.status : ("visible" as "pending" | "visible" | "hidden"),
      rating: 5,
      likeCount: item.likeCount ?? 0,
      reportCount: item.reportCount ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
        role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
      },
      replyToUser: item.replyToUser?.id
        ? {
            id: item.replyToUser.id,
            displayName: item.replyToUser.displayName,
            avatarUrl: await resolveUploadedFileUrl(item.replyToUser.avatarFileId ?? null),
            role: isValidAuthRole(item.replyToUser.role) ? item.replyToUser.role : ("user" as "user" | "admin")
          }
        : null,
      viewer: {
        canEdit: false,
        canDelete: false,
        hasLiked: false,
        hasReported: false
      }
    };
  }
};
