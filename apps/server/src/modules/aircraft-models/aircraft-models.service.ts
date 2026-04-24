import {
  resolvePublicUploadedFileUrl,
  resolvePublicUploadedFileUrlMap,
  resolveUploadedFileUrl,
  resolveUploadedFileUrls
} from "../uploads/uploads.helpers";
import { uploadsRepo } from "../uploads/upload.repo";
import { categoriesService } from "../categories/categories.service";
import { brandsService } from "../brands/brands.service";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { socialService } from "../social/social.service";
import { evaluateTextModeration } from "../audits/text-moderation.service";
import { aircraftModelsRepo } from "./aircraft-models.repo";
import { shouldCountUniqueView } from "../../lib/view-tracking";
import { sortModelsByHotScore } from "./model-hot-score";
import { usersService } from "../users/users.service";

type ListFilters = {
  categorySlugs?: string[];
  brandSlugs?: string[];
  powerTypes?: string[];
  keyword?: string;
  sort?: "hot" | "latest";
  limit?: number;
  page?: number;
};
const DEFAULT_MODELS_PAGE = 1;
const DEFAULT_MODELS_LIMIT = 20;

type ModelCommentUserSummary = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  ipLocationLabel: string | null;
  role: "user" | "admin";
};

type ModelOwnerSummary = ModelCommentUserSummary;

type SerializedModelComment = {
  id: string;
  modelId: string;
  parentCommentId: string | null;
  replyToCommentId: string | null;
  content: string;
  status: "pending" | "visible" | "hidden";
  likeCount: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  author: ModelCommentUserSummary;
  replyToUser: ModelCommentUserSummary | null;
  viewer: {
    canEdit: boolean;
    canDelete: boolean;
    hasLiked: boolean;
    hasReported: boolean;
  };
};

type SerializedModelCommentThread = SerializedModelComment & {
  replyCount: number;
  replies: SerializedModelComment[];
};

function buildStateSet<T extends Record<string, string>>(rows: T[], key: keyof T) {
  return new Set(rows.map((row) => row[key]));
}

async function buildReplyToUserMap(
  users: Awaited<ReturnType<typeof aircraftModelsRepo.listUsersByIds>>,
  ipLocationLabelMap?: ReadonlyMap<string, string | null>
) {
  const entries = await Promise.all(
    users.map(async (user) => [
      user.id,
      {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: await resolveUploadedFileUrl(user.avatarFileId ?? null),
        ipLocationLabel: ipLocationLabelMap?.get(user.id) ?? null,
        role: user.role as "user" | "admin"
      }
    ] as const)
  );

  return new Map(entries);
}

async function buildModelOwnerSummary(
  ownerId: string | null | undefined
): Promise<ModelOwnerSummary | null> {
  if (!ownerId) {
    return null;
  }

  const [owner] = await aircraftModelsRepo.listUsersByIds([ownerId]);
  if (!owner) {
    return null;
  }

  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([owner.id]);

  return {
    id: owner.id,
    displayName: owner.displayName,
    avatarUrl: await resolvePublicUploadedFileUrl(owner.avatarFileId ?? null),
    ipLocationLabel: ipLocationLabelMap.get(owner.id) ?? null,
    role: owner.role as "user" | "admin"
  };
}

async function serializeModelComment(
  item: Awaited<ReturnType<typeof aircraftModelsRepo.getModelCommentById>>,
  replyToUserMap: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; ipLocationLabel: string | null; role: "user" | "admin" }
  >,
  input?: {
    currentUserId?: string;
    likedCommentIds?: Set<string>;
    reportedCommentIds?: Set<string>;
    ipLocationLabelMap?: ReadonlyMap<string, string | null>;
  }
): Promise<SerializedModelComment | null> {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    modelId: item.modelId,
    parentCommentId: item.parentCommentId,
    replyToCommentId: item.replyToCommentId,
    content: item.content,
    status: item.status as "pending" | "visible" | "hidden",
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      avatarUrl: await resolvePublicUploadedFileUrl(item.author.avatarFileId ?? null),
      ipLocationLabel: input?.ipLocationLabelMap?.get(item.author.id) ?? null,
      role: item.author.role as "user" | "admin"
    },
    replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null,
    viewer: {
      canEdit: input?.currentUserId === item.author.id,
      canDelete: input?.currentUserId === item.author.id,
      hasLiked: input?.likedCommentIds?.has(item.id) ?? false,
      hasReported: input?.reportedCommentIds?.has(item.id) ?? false
    }
  };
}

async function serializeModelCommentThreads(
  comments: Awaited<ReturnType<typeof aircraftModelsRepo.listModelComments>>,
  replyToUserMap: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; ipLocationLabel: string | null; role: "user" | "admin" }
  >,
  input?: {
    currentUserId?: string;
    likedCommentIds?: Set<string>;
    reportedCommentIds?: Set<string>;
    ipLocationLabelMap?: ReadonlyMap<string, string | null>;
  }
) {
  const repliesByRootId = new Map<string, SerializedModelComment[]>();
  const roots: SerializedModelCommentThread[] = [];

  for (const comment of comments) {
    const base = {
      id: comment.id,
      modelId: comment.modelId,
      parentCommentId: comment.parentCommentId,
      replyToCommentId: comment.replyToCommentId,
      content: comment.content,
      status: comment.status as "pending" | "visible" | "hidden",
      likeCount: comment.likeCount ?? 0,
      reportCount: comment.reportCount ?? 0,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: {
        id: comment.author.id,
        displayName: comment.author.displayName,
        avatarUrl: await resolvePublicUploadedFileUrl(comment.author.avatarFileId ?? null),
        ipLocationLabel: input?.ipLocationLabelMap?.get(comment.author.id) ?? null,
        role: comment.author.role as "user" | "admin"
      },
      replyToUser: comment.replyToUserId ? replyToUserMap.get(comment.replyToUserId) ?? null : null,
      viewer: {
        canEdit: input?.currentUserId === comment.author.id,
        canDelete: input?.currentUserId === comment.author.id,
        hasLiked: input?.likedCommentIds?.has(comment.id) ?? false,
        hasReported: input?.reportedCommentIds?.has(comment.id) ?? false
      }
    };

    if (!comment.parentCommentId) {
      roots.push({
        ...base,
        replyCount: 0,
        replies: []
      });
      continue;
    }

    const bucket = repliesByRootId.get(comment.parentCommentId) ?? [];
    bucket.push(base);
    repliesByRootId.set(comment.parentCommentId, bucket);
  }

  return roots.map<SerializedModelCommentThread>((root) => ({
    ...root,
    replies: repliesByRootId.get(root.id) ?? [],
    replyCount: (repliesByRootId.get(root.id) ?? []).length
  }));
}

async function validateOwnedReportImages(ownerId: string, imageIds: string[]) {
  const files = await Promise.all(imageIds.map((id) => uploadsRepo.getOwnedFileById(ownerId, id)));
  return files.filter((file): file is NonNullable<typeof file> => {
    if (!file) {
      return false;
    }

    return file.status === "uploaded" && file.mediaKind === "image" && file.bizType === "report-image";
  });
}

function parseFileIdArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export const aircraftModelsService = {
  async listModels(filters: ListFilters) {
    const [rows, categories, brands] = await Promise.all([
      aircraftModelsRepo.list(filters),
      categoriesService.listCategories(),
      brandsService.listBrands()
    ]);

    const orderedRows =
      filters.sort === "hot"
        ? sortModelsByHotScore(
            rows.map((row) => ({
              ...row,
              reviewCount: row.reviewSummary.totalReviews
            }))
          )
        : [...rows].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const page = Math.max(DEFAULT_MODELS_PAGE, filters.page ?? DEFAULT_MODELS_PAGE);
    const limit = Math.max(1, filters.limit ?? DEFAULT_MODELS_LIMIT);
    const offset = (page - 1) * limit;
    const pagedRows = orderedRows.slice(offset, offset + limit);

    const fileUrlMap = await resolvePublicUploadedFileUrlMap(
      pagedRows.flatMap((row) => [row.coverImageFileId ?? null, row.videoFileId ?? null])
    );
    const items = pagedRows.map((row) => {
      const { coverImageFileId, videoFileId, ...rest } = row;
      return {
        ...rest,
        coverImageUrl: coverImageFileId ? fileUrlMap.get(coverImageFileId) ?? null : null,
        coverVideoUrl: videoFileId ? fileUrlMap.get(videoFileId) ?? null : null
      };
    });

    return {
      items,
      total: orderedRows.length,
      pagination: {
        page,
        limit,
        hasMore: offset + items.length < orderedRows.length
      },
      filters: {
        categories,
        brands,
        powerTypes: ["electric", "fuel", "hybrid", "other"] as const
      }
    };
  },
  async getModelDetail(slug: string, currentUserId?: string) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    if (!item) {
      return null;
    }
    if (!item.isPublished && item.ownerId !== currentUserId) {
      return null;
    }

    const [interactionSummary, viewer, reportedRows, owner] = await Promise.all([
      aircraftModelsRepo.getInteractionSummary(item.id),
      aircraftModelsRepo.getViewerInteractionState(item.id, currentUserId ?? null),
      currentUserId ? aircraftModelsRepo.listViewerModelReports([item.id], currentUserId) : Promise.resolve([]),
      buildModelOwnerSummary(item.ownerId)
    ]);

    const { coverImageFileId, galleryImageFileIds, videoFileId, ...rest } = item;
    const internalAudience = Boolean(item.ownerId && currentUserId && item.ownerId === currentUserId);
    const [coverImageUrl, coverVideoUrl, galleryImageUrls] = await Promise.all([
      (internalAudience ? resolveUploadedFileUrl : resolvePublicUploadedFileUrl)(coverImageFileId ?? null),
      (internalAudience ? resolveUploadedFileUrl : resolvePublicUploadedFileUrl)(videoFileId ?? null),
      Promise.all(
        parseFileIdArray(galleryImageFileIds).map((id) =>
          (internalAudience ? resolveUploadedFileUrl : resolvePublicUploadedFileUrl)(id)
        )
      ).then((urls) =>
        urls.filter((url): url is string => Boolean(url))
      )
    ]);

    return {
      ...rest,
      coverImageFileId: coverImageFileId ?? null,
      galleryImageFileIds: parseFileIdArray(galleryImageFileIds),
      videoFileId: videoFileId ?? null,
      coverImageUrl,
      coverVideoUrl,
      galleryImageUrls,
      owner,
      interactionSummary,
      viewer: {
        ...viewer,
        hasReported: buildStateSet(reportedRows as Array<{ modelId: string }>, "modelId").has(item.id),
        canEdit: Boolean(currentUserId && item.ownerId && item.ownerId === currentUserId),
        canDelete: Boolean(currentUserId && item.ownerId && item.ownerId === currentUserId)
      }
    };
  },
  async getModelDetailById(id: string) {
    const item = await aircraftModelsRepo.findById(id);
    return item;
  },
  async createModel(input: {
    slug: string;
    name: string;
    categoryId: string;
    brandId: string;
    ownerId?: string | null;
    sourceSubmissionId?: string | null;
    powerType: string;
    lifecycleStatus: string;
    summary: string | null;
    description: string | null;
    priceMin: number | null;
    priceMax: number | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
    coverImageFileId?: string | null;
    galleryImageFileIds?: string[];
    videoFileId?: string | null;
    isPublished: boolean;
  }) {
    return aircraftModelsRepo.create(input);
  },
  async updateModel(
    id: string,
    input: {
      slug: string;
      name: string;
      categoryId: string;
      brandId: string;
      ownerId?: string | null;
      sourceSubmissionId?: string | null;
      powerType: string;
      lifecycleStatus: string;
      summary: string | null;
      description: string | null;
      priceMin: number | null;
      priceMax: number | null;
      maxFlightTimeMinutes: number | null;
      maxRangeKilometers: number | null;
      maxSpeedKph: number | null;
      takeoffWeightGrams: number | null;
      coverImageFileId?: string | null;
      galleryImageFileIds?: string[];
      videoFileId?: string | null;
      isPublished: boolean;
    }
  ) {
    return aircraftModelsRepo.update(id, input);
  },
  async resolveModelGalleryForResponse(row: {
    coverImageFileId: string | null;
    galleryImageFileIds: string;
    videoFileId: string | null;
  }) {
    const coverImageUrl = await resolveUploadedFileUrl(row.coverImageFileId ?? null);
    const coverVideoUrl = await resolveUploadedFileUrl(row.videoFileId ?? null);
    const galleryImageUrls = (
      await Promise.all(parseFileIdArray(row.galleryImageFileIds).map((id) => resolveUploadedFileUrl(id)))
    ).filter((url): url is string => Boolean(url));
    return { coverImageUrl, coverVideoUrl, galleryImageUrls };
  },
  async buildAdminModelResponseItem(
    item: NonNullable<Awaited<ReturnType<typeof aircraftModelsRepo.findById>>>
  ) {
    const {
      coverImageFileId,
      galleryImageFileIds,
      videoFileId,
      maxFlightTimeMinutes,
      maxRangeKilometers,
      maxSpeedKph,
      takeoffWeightGrams,
      ...rest
    } = item;
    const { coverImageUrl, coverVideoUrl, galleryImageUrls } = await this.resolveModelGalleryForResponse({
      coverImageFileId: coverImageFileId ?? null,
      galleryImageFileIds,
      videoFileId: videoFileId ?? null
    });
    return {
      ...rest,
      coverImageFileId: coverImageFileId ?? null,
      galleryImageFileIds: parseFileIdArray(galleryImageFileIds),
      videoFileId: videoFileId ?? null,
      coverImageUrl,
      coverVideoUrl,
      galleryImageUrls,
      parameters: {
        maxFlightTimeMinutes,
        maxRangeKilometers,
        maxSpeedKph,
        takeoffWeightGrams
      },
      interactionSummary: {
        interestCount: 0,
        favoriteCount: 0,
        shareCount: 0
      },
      viewer: {
        isInterested: false,
        isFavorited: false,
        hasShared: false,
        hasReported: false,
        canEdit: false,
        canDelete: false
      }
    };
  },
  async interactModel(
    slug: string,
    userId: string,
    type: "interested" | "favorite" | "share"
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    if (!item) {
      return null;
    }

    const result =
      type === "share"
        ? await aircraftModelsRepo.createShareInteraction(item.id, userId)
        : await aircraftModelsRepo.toggleModelInteraction({
            modelId: item.id,
            userId,
            type
          });
    const [summary, viewer] = await Promise.all([
      aircraftModelsRepo.getInteractionSummary(item.id),
      aircraftModelsRepo.getViewerInteractionState(item.id, userId)
    ]);
    if (result.active && item.ownerId && item.ownerId !== userId) {
      const notificationTypeByInteraction = {
        interested: "post_liked",
        favorite: "post_favorited",
        share: "post_shared"
      } as const;
      const titleByInteraction = {
        interested: "机型收到关注",
        favorite: "机型收到收藏",
        share: "机型被分享"
      } as const;
      await socialService.recordNotification({
        userId: item.ownerId,
        actorId: userId,
        type: notificationTypeByInteraction[type],
        target: {
          type: "status",
          id: item.id,
          title: item.name,
          href: `/models/${item.slug}`
        },
        title: titleByInteraction[type],
        summary: `有人与你互动了机型《${item.name}》`
      });
    }

    return {
      item: {
        type,
        active: result.active,
        summary,
        viewer
      }
    };
  },
  async recordModelView(
    slug: string,
    input?: {
      currentUserId?: string | null;
      sessionId?: string | null;
      viewerFingerprint?: string | null;
    }
  ) {
    const item = await aircraftModelsRepo.getModelViewStateBySlug(slug);
    if (!item || !item.isPublished) {
      return { kind: "not_found" as const };
    }

    const shouldIncrement = await shouldCountUniqueView({
      contentType: "model",
      contentId: item.id,
      sessionId: input?.sessionId ?? null,
      viewerId: input?.currentUserId ?? null,
      viewerFingerprint: input?.viewerFingerprint ?? null
    });

    if (shouldIncrement) {
      await aircraftModelsRepo.incrementModelViewCount(item.id);
    }

    return { kind: "ok" as const };
  },
  async listModelComments(slug: string, currentUserId?: string) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    if (!item || (!item.isPublished && item.ownerId !== currentUserId)) {
      return null;
    }

    const comments = (await aircraftModelsRepo.listModelComments(item.id)).filter(
      (comment) =>
        comment.status === "visible" ||
        (comment.status === "pending" && currentUserId === comment.author.id)
    );
    const commentIds = comments.map((comment) => comment.id);
    const replyToUserIds = Array.from(
      new Set(comments.map((comment) => comment.replyToUserId).filter((value): value is string => Boolean(value)))
    );
    const [replyToUsers, likedRows, reportedRows] = await Promise.all([
      aircraftModelsRepo.listUsersByIds(replyToUserIds),
      currentUserId ? aircraftModelsRepo.listViewerModelCommentLikes(commentIds, currentUserId) : [],
      currentUserId ? aircraftModelsRepo.listViewerModelCommentReports(commentIds, currentUserId) : []
    ]);
    const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
      ...comments.map((comment) => comment.author.id),
      ...replyToUserIds
    ]);

    return {
      items: await serializeModelCommentThreads(
        comments,
        await buildReplyToUserMap(replyToUsers, ipLocationLabelMap),
        {
        currentUserId,
        likedCommentIds: buildStateSet(likedRows, "commentId"),
        reportedCommentIds: buildStateSet(reportedRows, "commentId"),
        ipLocationLabelMap
      })
    };
  },
  async createModelComment(
    slug: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { content: string; parentCommentId?: string }
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    if (!item || (!item.isPublished && item.ownerId !== currentUser.id)) {
      return { kind: "not_found" as const };
    }

    let parentComment: Awaited<ReturnType<typeof aircraftModelsRepo.getModelCommentById>> | null = null;
    let threadRootId: string | null = null;
    let replyToCommentId: string | null = null;
    let replyToUserId: string | null = null;

    if (input.parentCommentId) {
      parentComment = await aircraftModelsRepo.getModelCommentById(input.parentCommentId);
      if (!parentComment || parentComment.modelId !== item.id || parentComment.status !== "visible") {
        return { kind: "not_found" as const };
      }
      threadRootId = parentComment.parentCommentId ?? parentComment.id;
      replyToCommentId = parentComment.id;
      replyToUserId = parentComment.author.id;
    }

    const status = "pending";

    const created = await aircraftModelsRepo.createModelComment({
      modelId: item.id,
      authorId: currentUser.id,
      parentCommentId: threadRootId,
      replyToCommentId,
      replyToUserId,
      content: input.content,
      status
    });

    const replyToUsers = replyToUserId ? await aircraftModelsRepo.listUsersByIds([replyToUserId]) : [];
    const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
      currentUser.id,
      ...(replyToUserId ? [replyToUserId] : [])
    ]);
    const serialized = await serializeModelComment(
      created,
      await buildReplyToUserMap(replyToUsers, ipLocationLabelMap),
      {
        currentUserId: currentUser.id,
        ipLocationLabelMap
      }
    );
    if (!serialized) {
      return { kind: "not_found" as const };
    }
    let currentItem = serialized;
    const moderation = await evaluateTextModeration({
      mode: await siteSettingsService.getCommentModerationMode(),
      domain: "comment",
      entityId: created.id,
      text: input.content
    });
    if (moderation.action !== "manual_review") {
      const nextStatus = moderation.action === "approve" ? "visible" : "hidden";
      const refreshed = await aircraftModelsRepo.updateModelCommentStatus(created.id, nextStatus);
      const refreshedComment = refreshed
        ? await aircraftModelsRepo.getModelCommentById(created.id)
        : null;
      const nextSerialized = refreshedComment
        ? await serializeModelComment(
            refreshedComment,
            await buildReplyToUserMap(replyToUsers, ipLocationLabelMap),
            {
              currentUserId: currentUser.id,
              ipLocationLabelMap
            }
          )
        : null;
      if (nextSerialized) {
        currentItem = nextSerialized;
      }
    }
    if (currentItem.status === "visible") {
      const targetUserId = parentComment ? parentComment.author.id : item.ownerId;
      const notificationType = parentComment ? "comment_replied" : "post_commented";
      const notificationTitle = parentComment ? "机型评论收到回复" : "机型收到新评论";
      const notificationSummary = parentComment
        ? `有人回复了你在机型《${item.name}》下的评论`
        : `有人评论了你的机型《${item.name}》`;
      if (targetUserId && targetUserId !== currentUser.id) {
        await socialService.recordNotification({
          userId: targetUserId,
          actorId: currentUser.id,
          type: notificationType,
          commentId: created.id,
          target: {
            type: "status",
            id: item.id,
            title: item.name,
            href: `/models/${slug}`
          },
          title: notificationTitle,
          summary: notificationSummary
        });
      }
    }

    return { kind: "ok" as const, item: currentItem };
  },
  async updateModelComment(
    slug: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { content: string }
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    const comment = await aircraftModelsRepo.getModelCommentById(commentId);
    if (!item || !comment || comment.modelId !== item.id) {
      return { kind: "not_found" as const };
    }

    const canEdit = currentUser.role === "admin" || currentUser.id === comment.author.id;
    if (!canEdit) {
      return { kind: "forbidden" as const };
    }

    const updated = await aircraftModelsRepo.updateModelComment(commentId, input.content);
    if (!updated) {
      return { kind: "not_found" as const };
    }

    const pendingUpdate = await aircraftModelsRepo.updateModelCommentStatus(commentId, "pending");
    if (!pendingUpdate) {
      return { kind: "not_found" as const };
    }
    const pending = await aircraftModelsRepo.getModelCommentById(commentId);
    if (!pending) {
      return { kind: "not_found" as const };
    }
    let finalComment = pending;
    const moderation = await evaluateTextModeration({
      mode: await siteSettingsService.getCommentModerationMode(),
      domain: "comment",
      entityId: commentId,
      text: input.content
    });
    if (moderation.action !== "manual_review") {
      const nextStatus = moderation.action === "approve" ? "visible" : "hidden";
      const moderated = await aircraftModelsRepo.updateModelCommentStatus(commentId, nextStatus);
      if (moderated) {
        const reloaded = await aircraftModelsRepo.getModelCommentById(commentId);
        if (reloaded) {
          finalComment = reloaded;
        }
      }
    }
    const replyToUsers = finalComment.replyToUserId
      ? await aircraftModelsRepo.listUsersByIds([finalComment.replyToUserId])
      : [];
    const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
      finalComment.author.id,
      ...(finalComment.replyToUserId ? [finalComment.replyToUserId] : [])
    ]);
    const serialized = await serializeModelComment(
      finalComment,
      await buildReplyToUserMap(replyToUsers, ipLocationLabelMap),
      {
        currentUserId: currentUser.id,
        ipLocationLabelMap
      }
    );
    if (!serialized) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, item: serialized };
  },
  async deleteModelComment(
    slug: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    const comment = await aircraftModelsRepo.getModelCommentById(commentId);
    if (!item || !comment || comment.modelId !== item.id) {
      return { kind: "not_found" as const };
    }

    const canDelete = currentUser.role === "admin" || currentUser.id === comment.author.id;
    if (!canDelete) {
      return { kind: "forbidden" as const };
    }

    await aircraftModelsRepo.deleteModelCommentThread(item.id, commentId);
    return { kind: "ok" as const };
  },
  async toggleModelCommentLike(
    slug: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    const comment = await aircraftModelsRepo.getModelCommentById(commentId);
    if (!item || !comment || comment.modelId !== item.id || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const result = await aircraftModelsRepo.toggleModelCommentLike(commentId, currentUser.id);
    if (result.active && comment.author.id !== currentUser.id) {
      await socialService.recordNotification({
        userId: comment.author.id,
        actorId: currentUser.id,
        type: "post_liked",
        commentId,
        target: {
          type: "status",
          id: item.id,
          title: item.name,
          href: `/models/${slug}`
        },
        title: "机型评论收到点赞",
        summary: `有人点赞了你在机型《${item.name}》下的评论`
      });
    }
    return { kind: "ok" as const };
  },
  async reportModelComment(
    slug: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { reason: string; imageIds: string[] }
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    const comment = await aircraftModelsRepo.getModelCommentById(commentId);
    if (!item || !comment || comment.modelId !== item.id || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await aircraftModelsRepo.reportModelComment({
      commentId,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },
  async listAdminModelComments(status?: "pending" | "visible" | "hidden") {
    const items = await aircraftModelsRepo.listAdminModelComments(status);
    const replyToUserMap = await buildReplyToUserMap(
      await aircraftModelsRepo.listUsersByIds(
        Array.from(new Set(items.map((item) => item.replyToUserId).filter((value): value is string => Boolean(value))))
      )
    );

    return {
      items: await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          modelId: item.model.id,
          model: item.model,
          parentCommentId: item.parentCommentId,
          replyToCommentId: item.replyToCommentId,
          content: item.content,
          status: item.status as "pending" | "visible" | "hidden",
          likeCount: item.likeCount ?? 0,
          reportCount: item.reportCount ?? 0,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          author: {
            id: item.author.id,
            displayName: item.author.displayName,
            avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
            role: item.author.role as "user" | "admin"
          },
          replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null,
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
  async updateModelCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const item = await aircraftModelsRepo.updateModelCommentStatus(id, status);
    if (!item) {
      return null;
    }

    const replyToUserMap = await buildReplyToUserMap(
      await aircraftModelsRepo.listUsersByIds(item.replyToUserId ? [item.replyToUserId] : [])
    );

    return {
      id: item.id,
      modelId: item.model.id,
      model: item.model,
      parentCommentId: item.parentCommentId,
      replyToCommentId: item.replyToCommentId,
      content: item.content,
      status: item.status as "pending" | "visible" | "hidden",
      likeCount: item.likeCount ?? 0,
      reportCount: item.reportCount ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
        role: item.author.role as "user" | "admin"
      },
      replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null,
      viewer: {
        canEdit: false,
        canDelete: false,
        hasLiked: false,
        hasReported: false
      }
    };
  },
  async reportModel(
    slug: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { reason: string; imageIds: string[] }
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    if (!item || !item.isPublished) {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await aircraftModelsRepo.reportModel({
      modelId: item.id,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },
  async listModelReports(id: string) {
    const reports = await aircraftModelsRepo.listModelReports(id);
    return {
      items: await Promise.all(
        reports.map(async (report) => ({
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt.toISOString(),
          reporter: {
            id: report.reporter.id,
            displayName: report.reporter.displayName,
            avatarUrl: await resolveUploadedFileUrl(report.reporter.avatarFileId ?? null),
            role: report.reporter.role as "user" | "admin"
          },
          evidenceImages: (await resolveUploadedFileUrls(parseFileIdArray(report.imageFileIds))).map((url, index) => ({
            id: `${report.id}-${index}`,
            url,
            fileName: `report-${index + 1}.png`,
            mimeType: "image/png",
            byteSize: 0
          }))
        }))
      )
    };
  },
  async listModelCommentReports(commentId: string) {
    const reports = await aircraftModelsRepo.listModelCommentReports(commentId);
    return {
      items: await Promise.all(
        reports.map(async (report) => ({
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt.toISOString(),
          reporter: {
            id: report.reporter.id,
            displayName: report.reporter.displayName,
            avatarUrl: await resolveUploadedFileUrl(report.reporter.avatarFileId ?? null),
            role: report.reporter.role as "user" | "admin"
          },
          evidenceImages: (await resolveUploadedFileUrls(parseFileIdArray(report.imageFileIds))).map((url, index) => ({
            id: `${report.id}-${index}`,
            url,
            fileName: `report-${index + 1}.png`,
            mimeType: "image/png",
            byteSize: 0
          }))
        }))
      )
    };
  },
  async deleteModel(id: string) {
    return aircraftModelsRepo.delete(id);
  }
};
