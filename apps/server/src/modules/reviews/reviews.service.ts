import { reviewsRepo } from "./reviews.repo";

function serializeReview<T extends { createdAt: Date; updatedAt: Date }>(review: T) {
  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  };
}

function buildReplyToUserMap(
  users: Awaited<ReturnType<typeof reviewsRepo.listUsersByIds>>
) {
  return new Map(
    users.map((user) => [
      user.id,
      {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role as "user" | "admin"
      }
    ])
  );
}

function serializeComment(
  item: Awaited<ReturnType<typeof reviewsRepo.getReviewCommentById>>,
  replyToUserMap: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; role: "user" | "admin" }
  >
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
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      avatarUrl: item.author.avatarUrl ?? null,
      role: item.author.role as "user" | "admin"
    },
    replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null
  };
}

function serializeCommentThreads(
  comments: Awaited<ReturnType<typeof reviewsRepo.listReviewComments>>,
  replyToUserMap: Map<
    string,
    { id: string; displayName: string; avatarUrl: string | null; role: "user" | "admin" }
  >
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
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: {
        id: comment.author.id,
        displayName: comment.author.displayName,
        avatarUrl: comment.author.avatarUrl ?? null,
        role: comment.author.role as "user" | "admin"
      },
      replyToUser: comment.replyToUserId ? replyToUserMap.get(comment.replyToUserId) ?? null : null
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
      reviewsRepo.listVisibleReviewsByModel(model.id),
      reviewsRepo.getReviewAggregate(model.id),
      currentUserId ? reviewsRepo.getUserReview(model.id, currentUserId) : Promise.resolve(null)
    ]);

    return {
      items: items.map((item) => serializeReview(item)),
      summary: {
        totalReviews: Number(aggregate.totalReviews ?? 0),
        myReview: myReview ? serializeReview(myReview) : null
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
      content: input.content
    });

    const [item, summary] = await Promise.all([
      reviewsRepo.getUserReview(model.id, userId),
      this.listModelReviews(slug, userId)
    ]);

    if (!item || !summary) {
      return null;
    }

    return {
      item: serializeReview(item),
      summary: summary.summary
    };
  },
  async listAdminReviews() {
    return {
      items: (await reviewsRepo.listAdminReviews()).map((item) => serializeReview(item))
    };
  },
  async updateReviewStatus(id: string, status: "visible" | "hidden") {
    const item = await reviewsRepo.updateReviewStatus(id, status);
    return item ? serializeReview(item) : null;
  },
  async listReviewComments(reviewId: string) {
    const review = await reviewsRepo.getReviewById(reviewId);
    if (!review) {
      return null;
    }

    const comments = await reviewsRepo.listReviewComments(reviewId);
    const replyToUserIds = Array.from(
      new Set(comments.map((comment) => comment.replyToUserId).filter((value): value is string => Boolean(value)))
    );
    const replyToUsers = await reviewsRepo.listUsersByIds(replyToUserIds);

    return {
      items: serializeCommentThreads(comments, buildReplyToUserMap(replyToUsers))
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
      if (!parentComment || parentComment.reviewId !== reviewId) {
        return { kind: "not_found" as const };
      }

      threadRootId = parentComment.parentCommentId ?? parentComment.id;
      replyToCommentId = parentComment.id;
      replyToUserId = parentComment.author.id;
    }

    const item = await reviewsRepo.createReviewComment({
      reviewId,
      authorId: currentUser.id,
      parentCommentId: threadRootId,
      replyToCommentId,
      replyToUserId,
      content: input.content
    });
    const replyToUsers = replyToUserId ? await reviewsRepo.listUsersByIds([replyToUserId]) : [];
    const serialized = serializeComment(item, buildReplyToUserMap(replyToUsers));

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
  }
};
