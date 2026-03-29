import { reviewsRepo } from "./reviews.repo";
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";
import { siteSettingsService } from "../site-settings/site-settings.service";

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
  const pairs = await Promise.all(
    users.map(async (user) => [
      user.id,
      {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: await resolveAuthorAvatar(user),
        role: user.role as "user" | "admin"
      }
    ] as const)
  );

  return new Map(pairs);
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

  return {
    id: item.id,
    reviewId: item.reviewId,
    parentCommentId: item.parentCommentId,
    replyToCommentId: item.replyToCommentId,
    content: item.content,
    status: (item.status ?? "visible") as "pending" | "visible" | "hidden",
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      avatarUrl: await resolveAuthorAvatar(item.author),
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
  const repliesByRootId = new Map<string, Array<any>>();
  const roots: Array<any> = [];

  for (const comment of comments) {
    const base = {
      id: comment.id,
      reviewId: comment.reviewId,
      parentCommentId: comment.parentCommentId,
      replyToCommentId: comment.replyToCommentId,
      content: comment.content,
      status: (comment.status ?? "visible") as "pending" | "visible" | "hidden",
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      likeCount: comment.likeCount ?? 0,
      reportCount: comment.reportCount ?? 0,
      author: {
        id: comment.author.id,
        displayName: comment.author.displayName,
        avatarUrl: await resolveAuthorAvatar(comment.author),
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

    const reviewId = await reviewsRepo.upsertReview({
      modelId: model.id,
      userId,
      content: input.content,
      status: (await siteSettingsService.getResolvedSettings()).reviewModerationEnabled ? "pending" : "visible"
    });

    const [item, summary] = await Promise.all([
      reviewsRepo.getUserReview(model.id, userId),
      this.listModelReviews(slug, userId)
    ]);

    if (!item || !summary) {
      return null;
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

    await reviewsRepo.toggleReviewLike(reviewId, currentUser.id);
    return { kind: "ok" as const };
  },
  async reportReview(
    reviewId: string,
    currentUser: { id: string; role: "user" | "admin" },
    reason: string
  ) {
    const review = await reviewsRepo.getReviewById(reviewId);
    if (!review || review.status !== "visible") {
      return { kind: "not_found" as const };
    }

    await reviewsRepo.reportReview({
      reviewId,
      reporterId: currentUser.id,
      reason
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

    await reviewsRepo.toggleReviewCommentLike(commentId, currentUser.id);
    return { kind: "ok" as const };
  },
  async reportReviewComment(
    reviewId: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" },
    reason: string
  ) {
    const comment = await reviewsRepo.getReviewCommentById(commentId);
    if (!comment || comment.reviewId !== reviewId || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    await reviewsRepo.reportReviewComment({
      commentId,
      reporterId: currentUser.id,
      reason
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
          status: item.status as "pending" | "visible" | "hidden",
          likeCount: item.likeCount ?? 0,
          reportCount: item.reportCount ?? 0,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          author: {
            id: item.author.id,
            displayName: item.author.displayName,
            avatarUrl: await resolveAuthorAvatar(item.author),
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
      status: item.status as "pending" | "visible" | "hidden",
      likeCount: item.likeCount ?? 0,
      reportCount: item.reportCount ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        avatarUrl: await resolveAuthorAvatar(item.author),
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
  }
};
