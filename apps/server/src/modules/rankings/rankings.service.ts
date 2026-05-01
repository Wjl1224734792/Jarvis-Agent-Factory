import type { RankingDetail, RankingListItem } from "@feijia/schemas";
import { rankingsRepo } from "./rankings.repo";
import { evaluateTextModeration } from "../audits/text-moderation.service";
import {
  resolvePublicUploadedFileUrlMap,
  resolveUploadedFileUrl,
  resolveUploadedFileUrlMap
} from "../uploads/uploads.helpers";
import { uploadsRepo } from "../uploads/upload.repo";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { socialService } from "../social/social.service";
import {
  serializeAdminRankingCommentList,
  serializeAdminRankingCommentStatusItem,
  serializeAdminRatingTargetCommentList,
  serializeAdminRatingTargetCommentStatusItem
} from "./rankings-admin-comment-presenters";
import {
  average,
  buildPublicUserSummary,
  buildRatingBreakdownFromRows,
  buildRatingTargetCommentThreads,
  resolveRankingImage,
  serializeRankingComment,
  serializeRatingTarget
} from "./rankings-presenters";
import {
  createRankingsCommentWorkflow,
  normalizePersistedCommentStatus
} from "./rankings-comment-workflow";
import { rankRatingTargetsByDynamicScore } from "./ranking-score";
import { usersService } from "../users/users.service";
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
  isValidRatingTargetAddPolicy
} from "../../lib/type-guards";

type CurrentUser = {
  id: string;
  role: "user" | "admin";
};

type RatingTargetStatus = "pending" | "published" | "rejected" | "hidden";
const DEFAULT_RANKINGS_PAGE = 1;
const DEFAULT_RANKINGS_LIMIT = 20;
const MAX_RANKINGS_LIMIT = 50;
const rankingsCommentWorkflow = createRankingsCommentWorkflow();

function buildViewer(currentUserId: string): CurrentUser {
  return {
    id: currentUserId,
    role: "user"
  };
}

function canInteractWithRanking(input: {
  ranking: {
    type: string;
    status: string;
    author: { id: string };
  };
  currentUser: CurrentUser;
}) {
  if (input.ranking.status === "published") {
    return true;
  }

  return canManageRanking({
    currentUser: input.currentUser,
    rankingType: isValidRankingType(input.ranking.type) ? input.ranking.type : "community",
    rankingAuthorId: input.ranking.author.id
  });
}

function canInteractWithRatingTarget(input: {
  item: {
    authorId: string;
    status: string;
  };
  ranking: {
    type: string;
    status: string;
    author: { id: string };
  };
  currentUser: CurrentUser;
}) {
  const rankingType = isValidRankingType(input.ranking.type) ? input.ranking.type : "community";
  const itemStatus = isValidRankingStatus(input.item.status)
    ? input.item.status
    : ("published" satisfies RatingTargetStatus);

  return (
    canInteractWithRanking({
      ranking: input.ranking,
      currentUser: input.currentUser
    }) &&
    canInspectRatingTarget({
      currentUser: input.currentUser,
      rankingType,
      rankingAuthorId: input.ranking.author.id,
      itemAuthorId: input.item.authorId,
      itemStatus
    })
  );
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
  const publicUserIds = [
    ...rankings.map((ranking) => ranking.author.id),
    ...Array.from(ratingTargetsByRanking.values())
      .flat()
      .map((item) => item.author.id)
  ];
  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap(publicUserIds);
  const rankingFileUrlMap = await resolvePublicUploadedFileUrlMap(
    rankings.flatMap((ranking) => [ranking.coverImageFileId ?? null, ranking.author.avatarFileId ?? null])
  );
  const ratingTargetImageUrlMap = await resolvePublicUploadedFileUrlMap(
    Array.from(ratingTargetsByRanking.values())
      .flat()
      .flatMap((item) => [item.imageFileId ?? null, item.author.avatarFileId ?? null])
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
            imageUrlMap: ratingTargetImageUrlMap,
            avatarUrlMap: ratingTargetImageUrlMap,
            ipLocationLabelMap
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
          ...buildPublicUserSummary(ranking.author, {
            avatarUrlMap: rankingFileUrlMap,
            ipLocationLabelMap
          })
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

    if (input.type === "community") {
      const moderation = await evaluateTextModeration({
        mode: await siteSettingsService.getRankingModerationMode(),
        domain: "ranking",
        entityId: ranking.id,
        text: input.title
      });
      if (moderation.action === "approve" || moderation.action === "reject") {
        const moderated = await this.applyRankingStatusInternal({
          rankingId: ranking.id,
          status: moderation.action === "approve" ? "published" : "rejected",
          rejectionReason: moderation.rejectionReason,
          viewer: currentUser
        });
        if (moderated.kind === "ok") {
          payload = moderated.payload;
        }
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

    if (rankingType === "community") {
      const moderation = await evaluateTextModeration({
        mode: await siteSettingsService.getRankingModerationMode(),
        domain: "ranking",
        entityId: rankingId,
        text: input.title
      });
      if (moderation.action === "approve" || moderation.action === "reject") {
        const moderated = await this.applyRankingStatusInternal({
          rankingId,
          status: moderation.action === "approve" ? "published" : "rejected",
          rejectionReason: moderation.rejectionReason,
          viewer: currentUser
        });
        if (moderated.kind === "ok") {
          payload = moderated.payload;
        }
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

    if (rankingType === "community") {
      const createdItem = payload.item.items.find(
        (item) => item.authorId === currentUser.id && item.title === input.title
      );
      if (createdItem) {
        const moderation = await evaluateTextModeration({
          mode: await siteSettingsService.getRatingTargetModerationMode(),
          domain: "rating_target",
          entityId: createdItem.id,
          text: `${input.title}\n${input.summary ?? ""}`
        });
        if (moderation.action === "approve" || moderation.action === "reject") {
          await this.applyRatingTargetStatusInternal({
            id: createdItem.id,
            status: moderation.action === "approve" ? "published" : "rejected",
            rejectionReason: moderation.rejectionReason,
            viewer: currentUser
          });
        }
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

    if (rankingType === "community" && nextStatus !== "hidden") {
      const moderation = await evaluateTextModeration({
        mode: await siteSettingsService.getRatingTargetModerationMode(),
        domain: "rating_target",
        entityId: id,
        text: `${input.title}\n${input.summary ?? ""}`
      });
      if (moderation.action === "approve" || moderation.action === "reject") {
        const moderated = await this.applyRatingTargetStatusInternal({
          id,
          status: moderation.action === "approve" ? "published" : "rejected",
          rejectionReason: moderation.rejectionReason,
          viewer: currentUser
        });
        if (moderated.kind === "ok") {
          payload = moderated.payload;
        }
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
    const mediaAudience: "internal" | "public" =
      rankingType === "community" && ranking.status !== "published" && canInspectUnpublished
        ? "internal"
        : "public";

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
    const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
      ranking.author.id,
      ...items.map((entry) => entry.author.id),
      ...comments.map((comment) => comment.author.id)
    ]);
    const assetUrlMap =
      mediaAudience === "public"
        ? await resolvePublicUploadedFileUrlMap([
            ranking.coverImageFileId ?? null,
            ranking.author.avatarFileId ?? null,
            ...items.flatMap((entry) => [entry.imageFileId ?? null, entry.author.avatarFileId ?? null]),
            ...comments.map((comment) => comment.author.avatarFileId ?? null)
          ])
        : await resolveUploadedFileUrlMap([
            ranking.coverImageFileId ?? null,
            ranking.author.avatarFileId ?? null,
            ...items.flatMap((entry) => [entry.imageFileId ?? null, entry.author.avatarFileId ?? null]),
            ...comments.map((comment) => comment.author.avatarFileId ?? null)
          ]);
    const serializedItems = await Promise.all(
      items.map((entry) =>
        serializeRatingTarget(entry, aggregateMap, userRatingMap, {
          currentUser,
          rankingType,
          rankingAuthorId: ranking.author.id,
          reportedItemIds,
          imageUrlMap: assetUrlMap,
          avatarUrlMap: assetUrlMap,
          ipLocationLabelMap
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
        coverImageUrl: await resolveRankingImage(ranking.coverImageFileId, mediaAudience),
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
        author: buildPublicUserSummary(ranking.author, {
          avatarUrlMap: assetUrlMap,
          ipLocationLabelMap
        }),
        comments: await Promise.all(comments.map((comment) => serializeRankingComment(comment, currentUser, ipLocationLabelMap))),
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
    const currentUser = buildViewer(currentUserId);
    const ranking = await rankingsRepo.getRankingById(rankingId);
    if (
      !ranking ||
      !canInteractWithRanking({
        ranking,
        currentUser
      })
    ) {
      return null;
    }

    return rankingsCommentWorkflow.createRankingComment({
      rankingId,
      rankingTitle: ranking.title,
      rankingAuthorId: ranking.author.id,
      currentUserId,
      content,
    });
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

    const mediaAudience: "internal" | "public" = canInspectRatingTarget({
      currentUser: undefined,
      rankingType,
      rankingAuthorId: ranking.author.id,
      itemAuthorId: item.authorId,
      itemStatus: isValidRankingStatus(item.status) ? item.status : ("published" satisfies RatingTargetStatus)
    })
      ? "public"
      : "internal";
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
    const publicUserIds = [
      item.author.id,
      ...replyToUserIds,
      ...comments.map((comment) => comment.author.id)
    ];
    const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap(publicUserIds);
    const assetUrlMap =
      mediaAudience === "public"
        ? await resolvePublicUploadedFileUrlMap([
            item.author.avatarFileId ?? null,
            item.imageFileId ?? null,
            ...replyUsers.map((user) => user.avatarFileId ?? null),
            ...comments.map((comment) => comment.author.avatarFileId ?? null)
          ])
        : await resolveUploadedFileUrlMap([
            item.author.avatarFileId ?? null,
            item.imageFileId ?? null,
            ...replyUsers.map((user) => user.avatarFileId ?? null),
            ...comments.map((comment) => comment.author.avatarFileId ?? null)
          ]);
    const serializedItem = await serializeRatingTarget(item, aggregateMap, userRatingMap, {
      currentUser,
      rankingType,
      rankingAuthorId: ranking.author.id,
      reportedItemIds,
      imageUrlMap: assetUrlMap,
      avatarUrlMap: assetUrlMap,
      ipLocationLabelMap
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
            avatarUrl: user.avatarFileId ? assetUrlMap.get(user.avatarFileId) ?? null : null,
            ipLocationLabel: ipLocationLabelMap.get(user.id) ?? null,
            role: isValidAuthRole(user.role) ? user.role : ("user" as "user" | "admin")
          }
        ])
      ),
      likedCommentIds: buildSet(likedRows as Array<{ commentId: string }>, "commentId"),
      reportedCommentIds: buildSet(
        reportedCommentRows as Array<{ commentId: string }>,
        "commentId"
      ),
      ipLocationLabelMap
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
    const currentUser = buildViewer(currentUserId);
    const ranking = existing ? await rankingsRepo.getRankingById(existing.rankingId) : null;
    if (
      !existing ||
      !ranking ||
      !canInteractWithRatingTarget({
        item: existing,
        ranking,
        currentUser
      })
    ) {
      return null;
    }

    const submitted = await rankingsCommentWorkflow.submitRatingTargetReview({
      item: {
        id: existing.id,
        authorId: existing.authorId,
        title: existing.title
      },
      currentUserId,
      rating: input.rating,
      content: input.content
    });
    if (!submitted) {
      return null;
    }

    return this.getRatingTargetDetail(id, currentUserId);
  },

  async submitRatingTargetRating(id: string, currentUserId: string, rating: number) {
    const existing = await rankingsRepo.getRatingTargetById(id);
    const currentUser = buildViewer(currentUserId);
    const ranking = existing ? await rankingsRepo.getRankingById(existing.rankingId) : null;
    if (
      !existing ||
      !ranking ||
      !canInteractWithRatingTarget({
        item: existing,
        ranking,
        currentUser
      })
    ) {
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
        createdAt: payload.item.createdAt,
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
    const currentUser = buildViewer(currentUserId);
    const ranking = item ? await rankingsRepo.getRankingById(item.rankingId) : null;
    if (
      !item ||
      !ranking ||
      !canInteractWithRatingTarget({
        item,
        ranking,
        currentUser
      })
    ) {
      return null;
    }

    let parentComment: Awaited<ReturnType<typeof rankingsRepo.getRatingTargetCommentById>> | null = null;

    if (input.parentCommentId) {
      parentComment = await rankingsRepo.getRatingTargetCommentById(input.parentCommentId);
      if (
        !parentComment ||
        parentComment.ratingTargetId !== id ||
        parentComment.status !== "visible"
      ) {
        return null;
      }
    }

    const rating = parentComment ? null : (input.rating ?? null);
    const created = await rankingsCommentWorkflow.createRatingTargetComment({
      item: {
        id: item.id,
        authorId: item.authorId,
        title: item.title
      },
      currentUserId,
      content: input.content,
      rating,
      parentComment
    });
    if (!created) {
      return null;
    }

    const payload = await this.getRatingTargetDetail(id, currentUserId);
    if (!payload) {
      return null;
    }

    const allComments = [
      ...payload.item.comments,
      ...payload.item.comments.flatMap((entry) => entry.replies)
    ];
    const selectedComment = allComments.find((entry) => entry.id === created.commentId) ?? null;
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

    const didUpdate = await rankingsCommentWorkflow.updateRatingTargetComment({
      commentId,
      content: input.content,
      previousStatus: normalizePersistedCommentStatus(comment.status)
    });
    if (!didUpdate) {
      return { kind: "not_found" as const };
    }

    const payload = await this.getRatingTargetDetail(itemId, currentUser);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    const allComments = [
      ...payload.item.comments,
      ...payload.item.comments.flatMap((entry) => entry.replies)
    ];
    const updatedComment = allComments.find((entry) => entry.id === commentId) ?? null;
    return updatedComment ? { kind: "ok" as const, item: updatedComment } : { kind: "not_found" as const };
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
    return serializeAdminRankingCommentList(items);
  },
  async updateRankingCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const item = await rankingsRepo.updateRankingCommentStatus(id, status);
    if (!item) {
      return null;
    }

    return serializeAdminRankingCommentStatusItem(item);
  },
  async listAdminRatingTargetComments(status?: "pending" | "visible" | "hidden") {
    const items = await rankingsRepo.listAdminRatingTargetComments(status);
    return serializeAdminRatingTargetCommentList(items);
  },
  async updateRatingTargetCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const item = await rankingsRepo.updateRatingTargetCommentStatus(id, status);
    if (!item) {
      return null;
    }

    return serializeAdminRatingTargetCommentStatusItem(item);
  }
};
