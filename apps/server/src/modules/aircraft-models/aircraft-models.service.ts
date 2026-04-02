import { resolveUploadedFileUrl, resolveUploadedFileUrls } from "../uploads/uploads.helpers";
import { uploadsRepo } from "../uploads/upload.repo";
import { categoriesService } from "../categories/categories.service";
import { brandsService } from "../brands/brands.service";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { aircraftModelsRepo } from "./aircraft-models.repo";

type ListFilters = {
  categorySlugs?: string[];
  brandSlugs?: string[];
  powerTypes?: string[];
  keyword?: string;
};

function buildStateSet<T extends { [key: string]: string }>(rows: T[], key: keyof T) {
  return new Set(rows.map((row) => String(row[key])));
}

async function buildReplyToUserMap(
  users: Awaited<ReturnType<typeof aircraftModelsRepo.listUsersByIds>>
) {
  const entries = await Promise.all(
    users.map(async (user) => [
      user.id,
      {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: await resolveUploadedFileUrl(user.avatarFileId ?? null),
        role: user.role as "user" | "admin"
      }
    ] as const)
  );

  return new Map(entries);
}

async function serializeModelComment(
  item: Awaited<ReturnType<typeof aircraftModelsRepo.getModelCommentById>>,
  replyToUserMap: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; role: "user" | "admin" }
  >,
  input?: {
    currentUserId?: string;
    likedCommentIds?: Set<string>;
    reportedCommentIds?: Set<string>;
  }
) {
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
      avatarUrl: await resolveUploadedFileUrl(item.author.avatarFileId ?? null),
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
    { id: string; displayName: string; avatarUrl: string | null; role: "user" | "admin" }
  >,
  input?: {
    currentUserId?: string;
    likedCommentIds?: Set<string>;
    reportedCommentIds?: Set<string>;
  }
) {
  const repliesByRootId = new Map<string, Array<any>>();
  const roots: Array<any> = [];

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
        avatarUrl: await resolveUploadedFileUrl(comment.author.avatarFileId ?? null),
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

  return roots.map((root) => ({
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
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export const aircraftModelsService = {
  async listModels(filters: ListFilters) {
    const [items, categories, brands] = await Promise.all([
      aircraftModelsRepo.list(filters),
      categoriesService.listCategories(),
      brandsService.listBrands()
    ]);

    return {
      items,
      total: items.length,
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

    const [interactionSummary, viewer, reportedRows] = await Promise.all([
      aircraftModelsRepo.getInteractionSummary(item.id),
      aircraftModelsRepo.getViewerInteractionState(item.id, currentUserId ?? null),
      currentUserId ? aircraftModelsRepo.listViewerModelReports([item.id], currentUserId) : Promise.resolve([])
    ]);

    return {
      ...item,
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
    summary: string | null;
    description: string | null;
    priceMin: number | null;
    priceMax: number | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
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
    summary: string | null;
    description: string | null;
    priceMin: number | null;
    priceMax: number | null;
    maxFlightTimeMinutes: number | null;
      maxRangeKilometers: number | null;
      maxSpeedKph: number | null;
      takeoffWeightGrams: number | null;
      isPublished: boolean;
    }
  ) {
    return aircraftModelsRepo.update(id, input);
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

    return {
      item: {
        type,
        active: result.active,
        summary,
        viewer
      }
    };
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

    return {
      items: await serializeModelCommentThreads(comments, await buildReplyToUserMap(replyToUsers), {
        currentUserId,
        likedCommentIds: buildStateSet(likedRows, "commentId"),
        reportedCommentIds: buildStateSet(reportedRows, "commentId")
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

    const status = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled
      ? "pending"
      : "visible";

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
    const serialized = await serializeModelComment(created, await buildReplyToUserMap(replyToUsers), {
      currentUserId: currentUser.id
    });
    if (!serialized) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, item: serialized };
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

    const shouldModerate = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled;
    const refreshed =
      shouldModerate && updated.status === "visible"
        ? ((await aircraftModelsRepo.updateModelCommentStatus(commentId, "pending")),
          await aircraftModelsRepo.getModelCommentById(commentId))
        : updated;
    if (!refreshed) {
      return { kind: "not_found" as const };
    }
    const replyToUsers = refreshed?.replyToUserId
      ? await aircraftModelsRepo.listUsersByIds([refreshed.replyToUserId])
      : [];
    const serialized = await serializeModelComment(refreshed, await buildReplyToUserMap(replyToUsers), {
      currentUserId: currentUser.id
    });
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

    await aircraftModelsRepo.toggleModelCommentLike(commentId, currentUser.id);
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
