import { reviewsRepo } from "./reviews.repo";
import { resolveUploadedFileUrl, resolveUploadedFileUrls } from "../uploads/uploads.helpers";
import { uploadsRepo } from "../uploads/upload.repo";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { socialService } from "../social/social.service";
import { buildReplyToUserMapAsync, buildCommentThreads } from "../../lib/comment-serializer";
import { isValidAuthRole, isValidReviewCommentStatus } from "../../lib/type-guards";

async function resolveAuthorAvatar<T extends { avatarFileId?: string | null }>(author: T) {
  return resolveUploadedFileUrl(author.avatarFileId ?? null);
}

function serializeReview<T extends { createdAt: Date; updatedAt: Date }>(review: T) {
  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  };
}

function buildStateSet<T extends { [key: string]: string }>(
  rows: T[],
  key: keyof T
) {
  return new Set(rows.map((row) => String(row[key])));
}

async function buildReplyToUserMap(
  users: Awaited<ReturnType<typeof reviewsRepo.listUsersByIds>>
) {
  return buildReplyToUserMapAsync(users, async (user) => ({
    id: user.id,
    displayName: user.displayName,
    avatarUrl: await resolveAuthorAvatar(user),
    // Database text column constrained to valid AuthRole values at insert time
    role: isValidAuthRole(user.role) ? user.role : ("user" as "user" | "admin")
  }));
}

type ReviewComment = Awaited<ReturnType<typeof reviewsRepo.getReviewCommentById>>;

async function serializeCommentBase(
  item: NonNullable<ReviewComment>,
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
  return {
    id: item.id,
    reviewId: item.reviewId,
    parentCommentId: item.parentCommentId,
    replyToCommentId: item.replyToCommentId,
    content: item.content,
    status: isValidReviewCommentStatus(item.status ?? "visible") ? (item.status ?? "visible") : ("visible" as "pending" | "visible" | "hidden"),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      avatarUrl: await resolveAuthorAvatar(item.author),
      // Database text column constrained to valid AuthRole values at insert time
      role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
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

async function serializeComment(
  item: Awaited<ReturnType<typeof reviewsRepo.getReviewCommentById>>,
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

  return serializeCommentBase(item, replyToUserMap, input);
}

async function serializeCommentThreads(
  comments: Awaited<ReturnType<typeof reviewsRepo.listReviewComments>>,
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
  const serialized = await Promise.all(
    comments.map((c) => serializeCommentBase(c, replyToUserMap, input))
  );

  return buildCommentThreads(serialized);
}

async function validateOwnedReportImages(ownerId: string, imageIds: string[]) {
  return uploadsRepo.listOwnedUploadedFiles({
    ownerId,
    fileIds: imageIds,
    mediaKind: "image",
    bizType: "report-image"
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

export const reviewsService = {
  async listModelReviews(slug: string, currentUserId?: string) {
    const model = await reviewsRepo.findModelBySlug(slug);

    if (!model) {
      return null;
    }

    const [items, aggregate, myReview] = await Promise.all([
      reviewsRepo.listReviewsForViewer(model.id, currentUserId),
      reviewsRepo.getReviewAggregate(model.id),
      currentUserId ? reviewsRepo.getUserReview(model.id, currentUserId) : Promise.resolve(null)
    ]);
    const reviewIds = Array.from(
      new Set([
        ...items.map((item) => item.id),
        ...(myReview ? [myReview.id] : [])
      ])
    );
    const [likedReviews, reportedReviews] = await Promise.all([
      currentUserId ? reviewsRepo.listViewerReviewLikes(reviewIds, currentUserId) : [],
      currentUserId ? reviewsRepo.listViewerReviewReports(reviewIds, currentUserId) : []
    ]);
    const likedReviewIds = buildStateSet(likedReviews, "reviewId");
    const reportedReviewIds = buildStateSet(reportedReviews, "reviewId");

    return {
      items: await Promise.all(items.map(async (item) => ({
        ...serializeReview(item),
        likeCount: item.likeCount ?? 0,
        reportCount: item.reportCount ?? 0,
        author: {
          ...item.author,
          avatarUrl: await resolveAuthorAvatar(item.author)
        },
        viewer: {
          canEdit: currentUserId === item.author.id,
          canDelete: currentUserId === item.author.id,
          hasLiked: likedReviewIds.has(item.id),
          hasReported: reportedReviewIds.has(item.id)
        }
      }))),
      summary: {
        totalReviews: Number(aggregate.totalReviews ?? 0),
        myReview: myReview
          ? {
              ...serializeReview(myReview),
              likeCount: myReview.likeCount ?? 0,
              reportCount: myReview.reportCount ?? 0,
              author: {
                ...myReview.author,
                avatarUrl: await resolveAuthorAvatar(myReview.author)
              },
              viewer: {
                canEdit: currentUserId === myReview.author.id,
                canDelete: currentUserId === myReview.author.id,
                hasLiked: likedReviewIds.has(myReview.id),
                hasReported: reportedReviewIds.has(myReview.id)
              }
            }
          : null
      }
    };
  },
  async submitReview(
    slug: string,
    userId: string,
    input: {
      content: string;
    }
  ) {
    const model = await reviewsRepo.findModelBySlug(slug);

    if (!model) {
      return null;
    }

    const status = (await siteSettingsService.getResolvedSettings()).reviewModerationEnabled
      ? "pending"
      : "visible";
    await reviewsRepo.upsertReview({
      modelId: model.id,
      userId,
      content: input.content,
      status
    });

    const [item, summary] = await Promise.all([
      reviewsRepo.getUserReview(model.id, userId),
      this.listModelReviews(slug, userId)
    ]);

    if (!item || !summary) {
      return null;
    }
    if (status === "visible" && model.ownerId && model.ownerId !== userId) {
      await socialService.recordNotification({
        userId: model.ownerId,
        actorId: userId,
        type: "post_commented",
        target: {
          type: "status",
          id: model.id,
          title: model.name,
          href: `/models/${model.slug}`
        },
        title: "机型收到新评测",
        summary: `有人发布了机型《${model.name}》的评测`
      });
    }

    return {
      item: {
        ...serializeReview(item),
        likeCount: item.likeCount ?? 0,
        reportCount: item.reportCount ?? 0,
        author: {
          ...item.author,
          avatarUrl: await resolveAuthorAvatar(item.author)
        },
        viewer: {
          canEdit: userId === item.author.id,
          canDelete: userId === item.author.id,
          hasLiked: false,
          hasReported: false
        }
      },
      summary: summary.summary
    };
  },
  async listAdminReviews() {
    return {
      items: await Promise.all(
        (await reviewsRepo.listAdminReviews()).map(async (item) => ({
          ...serializeReview(item),
          likeCount: item.likeCount ?? 0,
          reportCount: item.reportCount ?? 0,
          author: {
            ...item.author,
            avatarUrl: await resolveAuthorAvatar(item.author)
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
  async updateReviewStatus(id: string, status: "pending" | "visible" | "hidden") {
    const item = await reviewsRepo.updateReviewStatus(id, status);
    return item
      ? {
          ...serializeReview(item),
          likeCount: item.likeCount ?? 0,
          reportCount: item.reportCount ?? 0,
          author: {
            ...item.author,
            avatarUrl: await resolveAuthorAvatar(item.author)
          },
          viewer: {
            canEdit: false,
            canDelete: false,
            hasLiked: false,
            hasReported: false
          }
        }
      : null;
  },
  async listReviewComments(reviewId: string, currentUserId?: string) {
    const review = await reviewsRepo.getReviewById(reviewId);
    if (!review) {
      return null;
    }

    const comments = (await reviewsRepo.listReviewComments(reviewId)).filter((comment) =>
      comment.status === "visible" || currentUserId === comment.author.id
    );
    const replyToUserIds = Array.from(
      new Set(comments.map((comment) => comment.replyToUserId).filter((value): value is string => Boolean(value)))
    );
    const commentIds = comments.map((comment) => comment.id);
    const [replyToUsers, likedComments, reportedComments] = await Promise.all([
      reviewsRepo.listUsersByIds(replyToUserIds),
      currentUserId ? reviewsRepo.listViewerReviewCommentLikes(commentIds, currentUserId) : [],
      currentUserId ? reviewsRepo.listViewerReviewCommentReports(commentIds, currentUserId) : []
    ]);
    const likedCommentIds = buildStateSet(likedComments, "commentId");
    const reportedCommentIds = buildStateSet(reportedComments, "commentId");

    return {
      items: await serializeCommentThreads(comments, await buildReplyToUserMap(replyToUsers), {
        currentUserId,
        likedCommentIds,
        reportedCommentIds
      })
    };
  },
  async createReviewComment(
    reviewId: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { content: string; parentCommentId?: string }
  ) {
    const review = await reviewsRepo.getReviewById(reviewId);
    if (!review || review.status !== "visible") {
      return { kind: "not_found" as const };
    }

    let parentComment: Awaited<ReturnType<typeof reviewsRepo.getReviewCommentById>> | null = null;
    let threadRootId: string | null = null;
    let replyToCommentId: string | null = null;
    let replyToUserId: string | null = null;

    if (input.parentCommentId) {
      parentComment = await reviewsRepo.getReviewCommentById(input.parentCommentId);
      if (!parentComment || parentComment.reviewId !== reviewId || parentComment.status !== "visible") {
        return { kind: "not_found" as const };
      }

      threadRootId = parentComment.parentCommentId ?? parentComment.id;
      replyToCommentId = parentComment.id;
      replyToUserId = parentComment.author.id;
    }

    const shouldModerate = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled;
    const status = shouldModerate ? "pending" : "visible";

    const item = await reviewsRepo.createReviewComment({
      reviewId,
      authorId: currentUser.id,
      parentCommentId: threadRootId,
      replyToCommentId,
      replyToUserId,
      content: input.content,
      status
    });
    const replyToUsers = replyToUserId ? await reviewsRepo.listUsersByIds([replyToUserId]) : [];
    const serialized = await serializeComment(item, await buildReplyToUserMap(replyToUsers), {
      currentUserId: currentUser.id
    });

    if (!serialized) {
      return { kind: "not_found" as const };
    }
    if (status === "visible") {
      const targetUserId = parentComment ? parentComment.author.id : review.author.id;
      if (targetUserId !== currentUser.id) {
        await socialService.recordNotification({
          userId: targetUserId,
          actorId: currentUser.id,
          type: parentComment ? "comment_replied" : "post_commented",
          commentId: item.id,
          target: {
            type: "status",
            id: review.model.id,
            title: review.model.name,
            href: `/models/${review.model.slug}`
          },
          title: parentComment ? "评测评论收到回复" : "评测收到新评论",
          summary: parentComment
            ? `有人回复了你在《${review.model.name}》评测下的评论`
            : `有人评论了你发布的《${review.model.name}》评测`
        });
      }
    }

    return { kind: "ok" as const, item: serialized };
  },
  async deleteReviewComment(
    reviewId: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const comment = await reviewsRepo.getReviewCommentById(commentId);
    if (!comment || comment.reviewId !== reviewId) {
      return { kind: "not_found" as const };
    }

    const canDelete = currentUser.role === "admin" || currentUser.id === comment.author.id;
    if (!canDelete) {
      return { kind: "forbidden" as const };
    }

    await reviewsRepo.deleteReviewCommentThread(reviewId, commentId);
    return { kind: "ok" as const };
  },
  async toggleReviewLike(
    reviewId: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const review = await reviewsRepo.getReviewById(reviewId);
    if (!review || review.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const result = await reviewsRepo.toggleReviewLike(reviewId, currentUser.id);
    if (result.active && review.author.id !== currentUser.id) {
      await socialService.recordNotification({
        userId: review.author.id,
        actorId: currentUser.id,
        type: "post_liked",
        target: {
          type: "status",
          id: review.model.id,
          title: review.model.name,
          href: `/models/${review.model.slug}`
        },
        title: "评测收到点赞",
        summary: `有人点赞了你发布的《${review.model.name}》评测`
      });
    }
    return { kind: "ok" as const };
  },
  async reportReview(
    reviewId: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { reason: string; imageIds: string[] }
  ) {
    const review = await reviewsRepo.getReviewById(reviewId);
    if (!review || review.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await reviewsRepo.reportReview({
      reviewId,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },
  async updateReviewComment(
    reviewId: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { content: string }
  ) {
    const comment = await reviewsRepo.getReviewCommentById(commentId);
    if (!comment || comment.reviewId !== reviewId) {
      return { kind: "not_found" as const };
    }

    const canEdit = currentUser.role === "admin" || currentUser.id === comment.author.id;
    if (!canEdit) {
      return { kind: "forbidden" as const };
    }

    const item = await reviewsRepo.updateReviewComment(commentId, input.content);
    if (!item) {
      return { kind: "not_found" as const };
    }

    const shouldModerate = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled;
    const refreshed =
      shouldModerate && item.status === "visible"
        ? await reviewsRepo.updateReviewCommentStatus(commentId, "pending")
        : item;
    if (!refreshed) {
      return { kind: "not_found" as const };
    }
    const replyToUsers = refreshed?.replyToUserId
      ? await reviewsRepo.listUsersByIds([refreshed.replyToUserId])
      : [];
    const serialized = await serializeComment(refreshed, await buildReplyToUserMap(replyToUsers), {
      currentUserId: currentUser.id
    });
    if (!serialized) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, item: serialized };
  },
  async toggleReviewCommentLike(
    reviewId: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const comment = await reviewsRepo.getReviewCommentById(commentId);
    if (!comment || comment.reviewId !== reviewId || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const result = await reviewsRepo.toggleReviewCommentLike(commentId, currentUser.id);
    if (result.active && comment.author.id !== currentUser.id) {
      const review = await reviewsRepo.getReviewById(reviewId);
      if (review) {
        await socialService.recordNotification({
          userId: comment.author.id,
          actorId: currentUser.id,
          type: "post_liked",
          commentId,
          target: {
            type: "status",
            id: review.model.id,
            title: review.model.name,
            href: `/models/${review.model.slug}`
          },
          title: "评测评论收到点赞",
          summary: `有人点赞了你在《${review.model.name}》评测下的评论`
        });
      }
    }
    return { kind: "ok" as const };
  },
  async reportReviewComment(
    reviewId: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: { reason: string; imageIds: string[] }
  ) {
    const comment = await reviewsRepo.getReviewCommentById(commentId);
    if (!comment || comment.reviewId !== reviewId || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await reviewsRepo.reportReviewComment({
      commentId,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },
  async listAdminReviewComments(status?: "pending" | "visible" | "hidden") {
    const items = await reviewsRepo.listAdminReviewComments(status);
    const replyToUserIds = Array.from(
      new Set(items.map((item) => item.replyToUserId).filter((value): value is string => Boolean(value)))
    );
    const replyToUserMap = await buildReplyToUserMap(await reviewsRepo.listUsersByIds(replyToUserIds));

    return {
      items: await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          reviewId: item.reviewId,
          reviewTitle: item.reviewTitle,
          model: item.model,
          parentCommentId: item.parentCommentId,
          replyToCommentId: item.replyToCommentId,
          content: item.content,
          status: isValidReviewCommentStatus(item.status) ? item.status : ("visible" as "pending" | "visible" | "hidden"),
          likeCount: item.likeCount ?? 0,
          reportCount: item.reportCount ?? 0,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          author: {
            id: item.author.id,
            displayName: item.author.displayName,
            avatarUrl: await resolveAuthorAvatar(item.author),
            // Database text column constrained to valid AuthRole values at insert time
            role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
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
  async listReviewReports(reviewId: string) {
    const reports = await reviewsRepo.listReviewReports(reviewId);
    return {
      items: await Promise.all(
        reports.map(async (report) => ({
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt.toISOString(),
          reporter: {
            id: report.reporter.id,
            displayName: report.reporter.displayName,
            avatarUrl: await resolveAuthorAvatar(report.reporter),
            // Database text column constrained to valid AuthRole values at insert time
            role: isValidAuthRole(report.reporter.role) ? report.reporter.role : ("user" as "user" | "admin")
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
  async listReviewCommentReports(commentId: string) {
    const reports = await reviewsRepo.listReviewCommentReports(commentId);
    return {
      items: await Promise.all(
        reports.map(async (report) => ({
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt.toISOString(),
          reporter: {
            id: report.reporter.id,
            displayName: report.reporter.displayName,
            avatarUrl: await resolveAuthorAvatar(report.reporter),
            // Database text column constrained to valid AuthRole values at insert time
            role: isValidAuthRole(report.reporter.role) ? report.reporter.role : ("user" as "user" | "admin")
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
  async updateReviewCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const item = await reviewsRepo.updateAdminReviewCommentStatus(id, status);
    if (!item) {
      return null;
    }

    const replyToUserMap = await buildReplyToUserMap(
      await reviewsRepo.listUsersByIds(item.replyToUserId ? [item.replyToUserId] : [])
    );
    return {
      id: item.id,
      reviewId: item.reviewId,
      reviewTitle: item.reviewTitle,
      model: item.model,
      parentCommentId: item.parentCommentId,
      replyToCommentId: item.replyToCommentId,
      content: item.content,
      status: isValidReviewCommentStatus(item.status) ? item.status : ("visible" as "pending" | "visible" | "hidden"),
      likeCount: item.likeCount ?? 0,
      reportCount: item.reportCount ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        avatarUrl: await resolveAuthorAvatar(item.author),
        // Database text column constrained to valid AuthRole values at insert time
        role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
      },
      replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null,
      viewer: {
        canEdit: false,
        canDelete: false,
        hasLiked: false,
        hasReported: false
      }
    };
  }
};
