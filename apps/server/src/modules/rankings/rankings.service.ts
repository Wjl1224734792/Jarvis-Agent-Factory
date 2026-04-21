import type { RankingDetail, RatingTarget, RankingListItem } from "@feijia/schemas";
import { powerTypeSchema } from "@feijia/schemas";
import { rankingsRepo } from "./rankings.repo";
import { qiniuAuditService } from "../audits/qiniu-audit.service";
import { resolveUploadedFileUrl, resolveUploadedFileUrlMap } from "../uploads/uploads.helpers";
import { uploadsRepo } from "../uploads/upload.repo";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { socialService } from "../social/social.service";
import { buildCommentThreads } from "../../lib/comment-serializer";
import { rankRatingTargetsByDynamicScore } from "./ranking-score";
import {
  canInspectRatingTarget,
  canManageRanking,
  canManageRatingTarget,
  toRankingViewer
} from "./ranking-permissions";
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
const DEFAULT_RANKINGS_PAGE = 1;
const DEFAULT_RANKINGS_LIMIT = 20;
const MAX_RANKINGS_LIMIT = 50;

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

function mapAuditStatusToRankingStatus(
  status: string | null | undefined
): "pending" | "published" | "rejected" {
  if (status === "passed") {
    return "published";
  }
  if (status === "rejected") {
    return "rejected";
  }
  return "pending";
}

function mapAuditStatusToCommentStatus(
  status: string | null | undefined
): "pending" | "visible" | "hidden" {
  if (status === "passed") {
    return "visible";
  }
  if (status === "rejected") {
    return "hidden";
  }
  return "pending";
}

async function resolveRankingImage(fileId: string | null | undefined) {
  return resolveUploadedFileUrl(fileId ?? null);
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
    imageUrlMap?: Map<string, string | null>;
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
    imageUrl: item.imageFileId
      ? (input.imageUrlMap?.get(item.imageFileId) ?? (await resolveRankingImage(item.imageFileId)))
      : null,
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

async function buildRankingListItems(
  currentUser?: CurrentUser,
  input?: { page?: number; limit?: number }
) {
  const page = Math.max(DEFAULT_RANKINGS_PAGE, input?.page ?? DEFAULT_RANKINGS_PAGE);
  const limit = Math.min(MAX_RANKINGS_LIMIT, Math.max(1, input?.limit ?? DEFAULT_RANKINGS_LIMIT));
  const offset = (page - 1) * limit;
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
  const rankingFileUrlMap = await resolveUploadedFileUrlMap(
    rankings.flatMap((ranking) => [ranking.coverImageFileId ?? null, ranking.author.avatarFileId ?? null])
  );
  const ratingTargetImageUrlMap = await resolveUploadedFileUrlMap(
    Array.from(ratingTargetsByRanking.values())
      .flat()
      .map((item) => item.imageFileId ?? null)
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
            reportedItemIds,
            imageUrlMap: ratingTargetImageUrlMap
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
        coverImageUrl: ranking.coverImageFileId
          ? rankingFileUrlMap.get(ranking.coverImageFileId) ?? null
          : null,
        itemAddPolicy,
        averageScore: average(rankedItems.map((item) => item.averageScore).filter((value) => value > 0)),
        commentCount: ranking.commentCount,
        reportCount: ranking.reportCount ?? 0,
        itemCount: rankedItems.length,
        createdAt: ranking.createdAt.toISOString(),
        author: {
          id: ranking.author.id,
          displayName: ranking.author.displayName,
          avatarUrl: ranking.author.avatarFileId
            ? rankingFileUrlMap.get(ranking.author.avatarFileId) ?? null
            : null,
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

  const officialItems = all.filter((item) => item.type === "official");
  const communityItems = all.filter((item) => item.type === "community");
  const pagedOfficialItems = officialItems.slice(offset, offset + limit);
  const pagedCommunityItems = communityItems.slice(offset, offset + limit);

  return {
    official: pagedOfficialItems,
    community: pagedCommunityItems,
    pagination: {
      official: {
        page,
        limit,
        total: officialItems.length,
        hasMore: offset + pagedOfficialItems.length < officialItems.length
      },
      community: {
        page,
        limit,
        total: communityItems.length,
        hasMore: offset + pagedCommunityItems.length < communityItems.length
      }
    }
  };
}

/**
 * Orchestrates rankings and rating-target domain workflows.
 *
 * Boundaries:
 * - Composes permission checks, score aggregation, dynamic reranking, comment
 *   threading and moderation transitions on top of repo-level data access.
 * - Keeps ranking-level and item-level rules together so list/detail payloads
 *   expose a consistent viewer model across official and community scenarios.
 * - Leaves transport validation to routes and low-level persistence to repos;
 *   this layer focuses on domain invariants and side effects.
 */
export const rankingsService = {
  async listRankings(currentUser?: CurrentUser, input?: { page?: number; limit?: number }) {
    return buildRankingListItems(currentUser, input);
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
    const aiReviewEnabled = input.type === "community" ? settings.rankingModerationEnabled : false;
    const rankingStatus = input.type === "official" ? "published" : "pending";
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

    const itemStatus: RatingTargetStatus = "pending";
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

    let payload = await this.getRankingDetail(ranking.id, currentUser);
    if (!payload) {
      return { kind: "internal_error" as const };
    }

    if (aiReviewEnabled) {
      const audit = await qiniuAuditService.reviewText({
        domain: "ranking",
        entityId: ranking.id,
        text: input.title
      });
      const moderated = await this.applyRankingStatusInternal({
        rankingId: ranking.id,
        status: mapAuditStatusToRankingStatus(audit?.status),
        rejectionReason: audit?.status === "rejected" ? "Rejected by qiniu text audit." : null,
        viewer: currentUser
      });
      if (moderated.kind === "ok") {
        payload = moderated.payload;
      }
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
    const aiReviewEnabled = rankingType === "community" ? settings.rankingModerationEnabled : false;
    const nextItemStatus: RatingTargetStatus = "pending";
    const nextRankingStatus =
      rankingType === "community" && ranking.status !== "hidden"
        ? "pending"
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

    let payload = await this.getRankingDetail(rankingId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    if (aiReviewEnabled) {
      const audit = await qiniuAuditService.reviewText({
        domain: "ranking",
        entityId: rankingId,
        text: input.title
      });
      const moderated = await this.applyRankingStatusInternal({
        rankingId,
        status: mapAuditStatusToRankingStatus(audit?.status),
        rejectionReason: audit?.status === "rejected" ? "Rejected by qiniu text audit." : null,
        viewer: currentUser
      });
      if (moderated.kind === "ok") {
        payload = moderated.payload;
      }
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
    const aiReviewEnabled =
      rankingType === "community" && (await siteSettingsService.isAiReviewEnabledForRatingTarget());
    const status: RatingTargetStatus = "pending";
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

    let payload = await this.getRankingDetail(rankingId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    if (aiReviewEnabled) {
      const createdItem = payload.item.items.find(
        (item) => item.authorId === currentUser.id && item.title === input.title
      );
      if (createdItem) {
        const audit = await qiniuAuditService.reviewText({
          domain: "rating_target",
          entityId: createdItem.id,
          text: `${input.title}\n${input.summary ?? ""}`
        });
        await this.applyRatingTargetStatusInternal({
          id: createdItem.id,
          status: mapAuditStatusToRankingStatus(audit?.status),
          rejectionReason: audit?.status === "rejected" ? "Rejected by qiniu text audit." : null,
          viewer: currentUser
        });
        const refreshed = await this.getRankingDetail(rankingId, currentUser);
        if (refreshed) {
          payload = refreshed;
        }
      }
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
    const aiReviewEnabled =
      rankingType === "community" && (await siteSettingsService.isAiReviewEnabledForRatingTarget());
    const nextStatus: RatingTargetStatus = item.status === "hidden" ? "hidden" : "pending";
    await rankingsRepo.updateRatingTarget(id, {
      title: input.title,
      summary: input.summary,
      imageFileId: input.imageFileId ?? null,
      brandName: input.brandName,
      linkedModelId: input.linkedModelSlug ? modelBySlug.get(input.linkedModelSlug)?.id ?? null : null,
      status: nextStatus,
      rejectionReason: null
    });

    let payload = await this.getRatingTargetDetail(id, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    if (aiReviewEnabled && nextStatus !== "hidden") {
      const audit = await qiniuAuditService.reviewText({
        domain: "rating_target",
        entityId: id,
        text: `${input.title}\n${input.summary ?? ""}`
      });
      const moderated = await this.applyRatingTargetStatusInternal({
        id,
        status: mapAuditStatusToRankingStatus(audit?.status),
        rejectionReason: audit?.status === "rejected" ? "Rejected by qiniu text audit." : null,
        viewer: currentUser
      });
      if (moderated.kind === "ok") {
        payload = moderated.payload;
      }
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
        currentUser?.role === "admin" ||
        currentUser?.id === ranking.author.id ||
        (Boolean(currentUser) && ranking.itemAddPolicy === "public");
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

  async listAdminRatingTargets(
    currentUser: CurrentUser,
    status?: "pending" | "published" | "rejected" | "hidden"
  ) {
    if (currentUser.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const rankings = (await rankingsRepo.listRankings()).filter((ranking) => ranking.type === "community");
    const rankingById = new Map(rankings.map((ranking) => [ranking.id, ranking]));
    const sourceItems = (
      await rankingsRepo.listRatingTargetsByRankingIds(rankings.map((ranking) => ranking.id))
    ).filter((item) => (status ? item.status === status : true));
    const aggregates = await rankingsRepo.listRatingTargetRatingAggregates(
      sourceItems.map((item) => item.id)
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
    const imageUrlMap = await resolveUploadedFileUrlMap(
      sourceItems.map((item) => item.imageFileId ?? null)
    );

    return {
      kind: "ok" as const,
      payload: {
        items: await Promise.all(
          sourceItems.map(async (item) => {
            const ranking = rankingById.get(item.rankingId);
            if (!ranking) {
              return null;
            }

            const serialized = await serializeRatingTarget(item, aggregateMap, new Map(), {
              currentUser,
              rankingType: "community",
              rankingAuthorId: ranking.author.id,
              reportedItemIds: new Set(),
              imageUrlMap
            });

            return {
              ...serialized,
              rankingTitle: ranking.title,
              rankingAuthorName: ranking.author.displayName
            };
          })
        ).then((items) => items.filter((item): item is NonNullable<typeof item> => item !== null))
      }
    };
  },

  async applyRankingStatusInternal(input: {
    rankingId: string;
    status: "pending" | "published" | "rejected" | "hidden";
    rejectionReason?: string | null;
    viewer?: CurrentUser;
  }) {
    const ranking = await rankingsRepo.getRankingById(input.rankingId);
    if (!ranking) {
      return { kind: "not_found" as const };
    }

    const rankingType = isValidRankingType(ranking.type) ? ranking.type : "community";
    if (rankingType !== "community") {
      return { kind: "forbidden" as const };
    }
    if (input.status === "pending") {
      const payload = await this.getRankingDetail(input.rankingId, input.viewer);
      return payload ? { kind: "ok" as const, payload } : { kind: "not_found" as const };
    }

    const previousStatus = ranking.status;
    await rankingsRepo.updateRankingStatus(input.rankingId, input.status, input.rejectionReason ?? null);
    const payload = await this.getRankingDetail(input.rankingId, input.viewer);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    if (previousStatus !== input.status) {
      const statusLabel =
        input.status === "published"
          ? "已发布"
          : input.status === "rejected"
            ? "未通过审核"
            : "已下架";
      await socialService.recordSystemNotification({
        userId: ranking.author.id,
        type: "ranking_audit_result",
        title: input.status === "published" ? "榜单审核通过" : "榜单状态更新",
        summary: `榜单《${ranking.title}》当前状态：${statusLabel}`,
        target: {
          type: "ranking",
          id: ranking.id,
          title: ranking.title,
          status: input.status,
          href: `/rankings/${ranking.id}`
        },
        metadata: {
          fromStatus: previousStatus,
          toStatus: input.status,
          rejectionReason: input.status === "rejected" ? input.rejectionReason ?? null : null
        }
      });
    }

    return { kind: "ok" as const, payload };
  },

  async applyRatingTargetStatusInternal(input: {
    id: string;
    status: "pending" | "published" | "rejected" | "hidden";
    rejectionReason?: string | null;
    viewer?: CurrentUser | string;
  }) {
    const item = await rankingsRepo.getRatingTargetById(input.id);
    if (!item) {
      return { kind: "not_found" as const };
    }
    if (input.status === "pending") {
      const payload = await this.getRatingTargetDetail(input.id, input.viewer);
      return payload ? { kind: "ok" as const, payload } : { kind: "not_found" as const };
    }

    const previousStatus = item.status;
    await rankingsRepo.updateRatingTargetStatus(input.id, {
      status: input.status,
      rejectionReason: input.status === "rejected" ? input.rejectionReason ?? null : null
    });
    const payload = await this.getRatingTargetDetail(input.id, input.viewer);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    if (previousStatus !== input.status) {
      const statusLabel =
        input.status === "published"
          ? "已发布"
          : input.status === "rejected"
            ? "未通过审核"
            : "已下架";
      await socialService.recordSystemNotification({
        userId: item.authorId,
        type: "rating_target_audit_result",
        title: input.status === "published" ? "榜单条目审核通过" : "榜单条目状态更新",
        summary: `条目《${item.title}》当前状态：${statusLabel}`,
        target: {
          type: "rating_target",
          id: item.id,
          title: item.title,
          status: input.status,
          href: `/rankings/items/${item.id}`
        },
        metadata: {
          rankingId: item.rankingId,
          fromStatus: previousStatus,
          toStatus: input.status,
          rejectionReason: input.status === "rejected" ? input.rejectionReason ?? null : null
        }
      });
    }

    return { kind: "ok" as const, payload };
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

    return this.applyRankingStatusInternal({
      rankingId,
      status,
      rejectionReason,
      viewer: currentUser
    });
  },

  async createRankingComment(rankingId: string, currentUserId: string, content: string) {
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (!ranking) {
      return null;
    }

    const aiReviewEnabled = await siteSettingsService.isAiReviewEnabledForComment();
    const item = await rankingsRepo.createRankingComment({
      rankingId,
      authorId: currentUserId,
      content,
      status: "pending"
    });

    if (!item) {
      return null;
    }

    let currentItem = item;
    if (aiReviewEnabled) {
      const audit = await qiniuAuditService.reviewText({
        domain: "ranking_comment",
        entityId: item.id,
        text: content
      });
      const nextStatus = mapAuditStatusToCommentStatus(audit?.status);
      if (nextStatus !== "pending") {
        const moderated = await rankingsRepo.updateRankingCommentStatus(item.id, nextStatus);
        if (moderated) {
          currentItem = moderated;
        }
      }
    }

    if (currentItem.status === "visible" && ranking.author.id !== currentUserId) {
      await socialService.recordNotification({
        userId: ranking.author.id,
        actorId: currentUserId,
        type: "post_commented",
        commentId: currentItem.id,
        target: {
          type: "ranking",
          id: ranking.id,
          title: ranking.title,
          href: `/rankings/${ranking.id}`
        },
        title: "榜单收到新评论",
        summary: `有人评论了你的榜单《${ranking.title}》`
      });
    }

    return { item: await serializeRankingComment(currentItem, { id: currentUserId, role: "user" }) };
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

    const aiReviewEnabled = await siteSettingsService.isAiReviewEnabledForComment();
    await rankingsRepo.upsertRatingTargetReview({
      ratingTargetId: id,
      authorId: currentUserId,
      rating: input.rating,
      content: input.content,
      status: "pending"
    });

    const reviewComments = await rankingsRepo.listRatingTargetComments(id);
    const myRootComment = reviewComments.find(
      (comment) => comment.author.id === currentUserId && comment.parentCommentId === null
    );

    let finalStatus: "pending" | "visible" | "hidden" = "pending";
    if (aiReviewEnabled && myRootComment) {
      const audit = await qiniuAuditService.reviewText({
        domain: "rating_target_comment",
        entityId: myRootComment.id,
        text: input.content
      });
      finalStatus = mapAuditStatusToCommentStatus(audit?.status);
      if (finalStatus !== "pending") {
        await rankingsRepo.updateRatingTargetCommentStatus(myRootComment.id, finalStatus);
      }
    }

    if (finalStatus === "visible" && existing.authorId !== currentUserId) {
      await socialService.recordNotification({
        userId: existing.authorId,
        actorId: currentUserId,
        type: "post_commented",
        commentId: myRootComment?.id ?? null,
        target: {
          type: "rating_target",
          id: existing.id,
          title: existing.title,
          href: `/rating-targets/${existing.id}`
        },
        title: "榜单条目收到新评论",
        summary: `有人评论了你的榜单条目《${existing.title}》`
      });
    }

    return this.getRatingTargetDetail(id, currentUserId);
  },

  async submitRatingTargetRating(id: string, currentUserId: string, rating: number) {
    const existing = await rankingsRepo.getRatingTargetById(id);
    if (!existing) {
      return null;
    }

    await rankingsRepo.upsertRatingTargetRating({
      ratingTargetId: id,
      userId: currentUserId,
      rating
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

    return this.applyRatingTargetStatusInternal({
      id,
      status,
      rejectionReason,
      viewer: currentUser
    });
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
      if (
        !parentComment ||
        parentComment.ratingTargetId !== id ||
        parentComment.status !== "visible"
      ) {
        return null;
      }

      parentCommentId = parentComment.parentCommentId ?? parentComment.id;
      replyToCommentId = parentComment.id;
      replyToUserId = parentComment.author.id;
    }

    const aiReviewEnabled = await siteSettingsService.isAiReviewEnabledForComment();
    const status = "pending";
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

    let currentCommentStatus = created.status;
    if (aiReviewEnabled) {
      const audit = await qiniuAuditService.reviewText({
        domain: "rating_target_comment",
        entityId: created.id,
        text: input.content
      });
      const nextStatus = mapAuditStatusToCommentStatus(audit?.status);
      if (nextStatus !== "pending") {
        const moderated = await rankingsRepo.updateRatingTargetCommentStatus(created.id, nextStatus);
        if (moderated) {
          currentCommentStatus = moderated.status;
        }
      }
    }

    if (currentCommentStatus === "visible") {
      const targetUserId = parentComment ? parentComment.author.id : item.authorId;
      if (targetUserId !== currentUserId) {
        await socialService.recordNotification({
          userId: targetUserId,
          actorId: currentUserId,
          type: parentComment ? "comment_replied" : "post_commented",
          commentId: created.id,
          target: {
            type: "rating_target",
            id: item.id,
            title: item.title,
            href: `/rating-targets/${item.id}`
          },
          title: parentComment ? "榜单条目评论收到回复" : "榜单条目收到新评论",
          summary: parentComment
            ? `有人回复了你在《${item.title}》下的评论`
            : `有人评论了你的榜单条目《${item.title}》`
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
    const selectedComment = allComments.find((entry) => entry.id === created.id) ?? null;
    return selectedComment ? { item: selectedComment } : null;
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
    const aiReviewEnabled = await siteSettingsService.isAiReviewEnabledForComment();
    if (comment.status === "visible") {
      await rankingsRepo.updateRatingTargetCommentStatus(commentId, "pending");
    }
    if (aiReviewEnabled) {
      const audit = await qiniuAuditService.reviewText({
        domain: "rating_target_comment",
        entityId: commentId,
        text: input.content
      });
      const nextStatus = mapAuditStatusToCommentStatus(audit?.status);
      if (nextStatus !== "pending") {
        await rankingsRepo.updateRatingTargetCommentStatus(commentId, nextStatus);
      }
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
          commentId,
          target: {
            type: "rating_target",
            id: target.id,
            title: target.title,
            href: `/rating-targets/${target.id}`
          },
          title: "榜单条目评论收到点赞",
          summary: `有人点赞了你在《${target.title}》下的评论`
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
