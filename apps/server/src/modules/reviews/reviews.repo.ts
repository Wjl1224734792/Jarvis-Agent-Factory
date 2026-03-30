import {
  aircraftModelsTable,
  aircraftReviewLikesTable,
  aircraftReviewReportsTable,
  reviewCommentsTable,
  reviewCommentLikesTable,
  reviewCommentReportsTable,
  aircraftReviewsTable,
  createId,
  db,
  usersTable
} from "@feijia/db";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";

export const reviewsRepo = {
  async findModelBySlug(slug: string) {
    const rows = await db
      .select({
        id: aircraftModelsTable.id,
        slug: aircraftModelsTable.slug,
        name: aircraftModelsTable.name
      })
      .from(aircraftModelsTable)
      .where(eq(aircraftModelsTable.slug, slug))
      .limit(1);

    return rows[0] ?? null;
  },
  async upsertReview(input: {
    modelId: string;
    userId: string;
    content: string | null;
    status: "pending" | "visible" | "hidden";
  }) {
    const existing = await db
      .select()
      .from(aircraftReviewsTable)
      .where(
        and(
          eq(aircraftReviewsTable.modelId, input.modelId),
          eq(aircraftReviewsTable.userId, input.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(aircraftReviewsTable)
        .set({
          rating: null,
          content: input.content,
          status: input.status,
          updatedAt: new Date()
        })
        .where(eq(aircraftReviewsTable.id, existing[0].id));

      return existing[0].id;
    }

    const id = createId("review");

    await db.insert(aircraftReviewsTable).values({
      id,
      modelId: input.modelId,
      userId: input.userId,
      rating: null,
      content: input.content,
      status: input.status
    });

    return id;
  },
  async getReviewById(id: string) {
    const rows = await db
      .select({
        id: aircraftReviewsTable.id,
        content: aircraftReviewsTable.content,
        status: aircraftReviewsTable.status,
        likeCount: aircraftReviewsTable.likeCount,
        reportCount: aircraftReviewsTable.reportCount,
        createdAt: aircraftReviewsTable.createdAt,
        updatedAt: aircraftReviewsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        },
        model: {
          id: aircraftModelsTable.id,
          slug: aircraftModelsTable.slug,
          name: aircraftModelsTable.name
        }
      })
      .from(aircraftReviewsTable)
      .innerJoin(usersTable, eq(aircraftReviewsTable.userId, usersTable.id))
      .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .where(eq(aircraftReviewsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listReviewsForViewer(modelId: string, viewerId?: string) {
    const visibilityCondition = viewerId
      ? or(
          eq(aircraftReviewsTable.status, "visible"),
          and(eq(aircraftReviewsTable.status, "pending"), eq(aircraftReviewsTable.userId, viewerId))
        )
      : eq(aircraftReviewsTable.status, "visible");

    return db
      .select({
        id: aircraftReviewsTable.id,
        content: aircraftReviewsTable.content,
        status: aircraftReviewsTable.status,
        likeCount: aircraftReviewsTable.likeCount,
        reportCount: aircraftReviewsTable.reportCount,
        createdAt: aircraftReviewsTable.createdAt,
        updatedAt: aircraftReviewsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(aircraftReviewsTable)
      .innerJoin(usersTable, eq(aircraftReviewsTable.userId, usersTable.id))
      .where(and(eq(aircraftReviewsTable.modelId, modelId), visibilityCondition))
      .orderBy(desc(aircraftReviewsTable.updatedAt));
  },
  async getUserReview(modelId: string, userId: string) {
    const rows = await db
      .select({
        id: aircraftReviewsTable.id,
        content: aircraftReviewsTable.content,
        status: aircraftReviewsTable.status,
        likeCount: aircraftReviewsTable.likeCount,
        reportCount: aircraftReviewsTable.reportCount,
        createdAt: aircraftReviewsTable.createdAt,
        updatedAt: aircraftReviewsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(aircraftReviewsTable)
      .innerJoin(usersTable, eq(aircraftReviewsTable.userId, usersTable.id))
      .where(
        and(
          eq(aircraftReviewsTable.modelId, modelId),
          eq(aircraftReviewsTable.userId, userId)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  },
  async getReviewAggregate(modelId: string) {
    const rows = await db
      .select({
        totalReviews: sql<number>`count(*)`
      })
      .from(aircraftReviewsTable)
      .where(
        and(
          eq(aircraftReviewsTable.modelId, modelId),
          eq(aircraftReviewsTable.status, "visible")
        )
      );

    return rows[0] ?? { totalReviews: 0 };
  },
  async listAdminReviews() {
    return db
      .select({
        id: aircraftReviewsTable.id,
        content: aircraftReviewsTable.content,
        status: aircraftReviewsTable.status,
        likeCount: aircraftReviewsTable.likeCount,
        reportCount: aircraftReviewsTable.reportCount,
        createdAt: aircraftReviewsTable.createdAt,
        updatedAt: aircraftReviewsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        },
        model: {
          id: aircraftModelsTable.id,
          slug: aircraftModelsTable.slug,
          name: aircraftModelsTable.name
        }
      })
      .from(aircraftReviewsTable)
      .innerJoin(usersTable, eq(aircraftReviewsTable.userId, usersTable.id))
      .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .orderBy(desc(aircraftReviewsTable.updatedAt));
  },
  async updateReviewStatus(id: string, status: "pending" | "visible" | "hidden") {
    await db
      .update(aircraftReviewsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(aircraftReviewsTable.id, id));

    return this.getReviewById(id);
  },
  async listUsersByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarFileId: usersTable.avatarFileId,
        role: usersTable.role
      })
      .from(usersTable)
      .where(inArray(usersTable.id, ids));
  },
  async listReviewComments(reviewId: string) {
    return db
      .select({
        id: reviewCommentsTable.id,
        reviewId: reviewCommentsTable.reviewId,
        authorId: reviewCommentsTable.authorId,
        parentCommentId: reviewCommentsTable.parentCommentId,
        replyToCommentId: reviewCommentsTable.replyToCommentId,
        replyToUserId: reviewCommentsTable.replyToUserId,
        content: reviewCommentsTable.content,
        status: reviewCommentsTable.status,
        likeCount: reviewCommentsTable.likeCount,
        reportCount: reviewCommentsTable.reportCount,
        createdAt: reviewCommentsTable.createdAt,
        updatedAt: reviewCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(reviewCommentsTable)
      .innerJoin(usersTable, eq(reviewCommentsTable.authorId, usersTable.id))
      .where(eq(reviewCommentsTable.reviewId, reviewId))
      .orderBy(asc(reviewCommentsTable.createdAt));
  },
  async getReviewCommentById(id: string) {
    const rows = await db
      .select({
        id: reviewCommentsTable.id,
        reviewId: reviewCommentsTable.reviewId,
        authorId: reviewCommentsTable.authorId,
        parentCommentId: reviewCommentsTable.parentCommentId,
        replyToCommentId: reviewCommentsTable.replyToCommentId,
        replyToUserId: reviewCommentsTable.replyToUserId,
        content: reviewCommentsTable.content,
        status: reviewCommentsTable.status,
        likeCount: reviewCommentsTable.likeCount,
        reportCount: reviewCommentsTable.reportCount,
        createdAt: reviewCommentsTable.createdAt,
        updatedAt: reviewCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(reviewCommentsTable)
      .innerJoin(usersTable, eq(reviewCommentsTable.authorId, usersTable.id))
      .where(eq(reviewCommentsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async createReviewComment(input: {
    reviewId: string;
    authorId: string;
    parentCommentId: string | null;
    replyToCommentId: string | null;
    replyToUserId: string | null;
    content: string;
    status: "pending" | "visible" | "hidden";
  }) {
    const id = createId("rcomment");

    await db.insert(reviewCommentsTable).values({
      id,
      reviewId: input.reviewId,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId,
      replyToCommentId: input.replyToCommentId,
      replyToUserId: input.replyToUserId,
      content: input.content,
      status: input.status
    });

    return this.getReviewCommentById(id);
  },
  async updateReviewComment(id: string, content: string) {
    await db
      .update(reviewCommentsTable)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(reviewCommentsTable.id, id));

    return this.getReviewCommentById(id);
  },
  async listAdminReviewComments(status?: "pending" | "visible" | "hidden") {
    return db
      .select({
        id: reviewCommentsTable.id,
        reviewId: reviewCommentsTable.reviewId,
        reviewTitle: sql<string>`concat(${aircraftModelsTable.name}, ' 评测')`,
        model: {
          id: aircraftModelsTable.id,
          slug: aircraftModelsTable.slug,
          name: aircraftModelsTable.name
        },
        parentCommentId: reviewCommentsTable.parentCommentId,
        replyToCommentId: reviewCommentsTable.replyToCommentId,
        replyToUserId: reviewCommentsTable.replyToUserId,
        content: reviewCommentsTable.content,
        status: reviewCommentsTable.status,
        likeCount: reviewCommentsTable.likeCount,
        reportCount: reviewCommentsTable.reportCount,
        createdAt: reviewCommentsTable.createdAt,
        updatedAt: reviewCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(reviewCommentsTable)
      .innerJoin(aircraftReviewsTable, eq(reviewCommentsTable.reviewId, aircraftReviewsTable.id))
      .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .innerJoin(usersTable, eq(reviewCommentsTable.authorId, usersTable.id))
      .where(status ? eq(reviewCommentsTable.status, status) : sql`true`)
      .orderBy(desc(reviewCommentsTable.updatedAt));
  },
  async updateReviewCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const existing = await this.getReviewCommentById(id);
    if (!existing) {
      return null;
    }

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .update(reviewCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(reviewCommentsTable.reviewId, existing.reviewId),
          or(eq(reviewCommentsTable.id, rootId), eq(reviewCommentsTable.parentCommentId, rootId))
        )
      );

    return this.getReviewCommentById(id);
  },
  async updateAdminReviewCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const existing = await this.getReviewCommentById(id);
    if (!existing) {
      return null;
    }

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .update(reviewCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(reviewCommentsTable.reviewId, existing.reviewId),
          or(eq(reviewCommentsTable.id, rootId), eq(reviewCommentsTable.parentCommentId, rootId))
        )
      );

    const rows = await this.listAdminReviewComments();
    return rows.find((item) => item.id === id) ?? null;
  },
  async syncReviewLikeReportCounts(reviewId: string) {
    const [likes, reports] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(aircraftReviewLikesTable)
        .where(eq(aircraftReviewLikesTable.reviewId, reviewId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(aircraftReviewReportsTable)
        .where(eq(aircraftReviewReportsTable.reviewId, reviewId))
    ]);

    await db
      .update(aircraftReviewsTable)
      .set({
        likeCount: Number(likes[0]?.count ?? 0),
        reportCount: Number(reports[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(aircraftReviewsTable.id, reviewId));
  },
  async toggleReviewLike(reviewId: string, userId: string) {
    const existing = await db
      .select({ id: aircraftReviewLikesTable.id })
      .from(aircraftReviewLikesTable)
      .where(
        and(
          eq(aircraftReviewLikesTable.reviewId, reviewId),
          eq(aircraftReviewLikesTable.userId, userId)
        )
      )
      .limit(1);

    let active = false;
    if (existing.length > 0) {
      await db.delete(aircraftReviewLikesTable).where(eq(aircraftReviewLikesTable.id, existing[0].id));
    } else {
      await db.insert(aircraftReviewLikesTable).values({
        id: createId("review_like"),
        reviewId,
        userId
      });
      active = true;
    }

    await this.syncReviewLikeReportCounts(reviewId);
    return { active };
  },
  async reportReview(input: {
    reviewId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    await db
      .insert(aircraftReviewReportsTable)
      .values({
        id: createId("review_report"),
        reviewId: input.reviewId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    await this.syncReviewLikeReportCounts(input.reviewId);
    return true;
  },
  async listReviewReports(reviewId: string) {
    return db
      .select({
        id: aircraftReviewReportsTable.id,
        reason: aircraftReviewReportsTable.reason,
        imageFileIds: aircraftReviewReportsTable.imageFileIds,
        createdAt: aircraftReviewReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(aircraftReviewReportsTable)
      .innerJoin(usersTable, eq(aircraftReviewReportsTable.reporterId, usersTable.id))
      .where(eq(aircraftReviewReportsTable.reviewId, reviewId))
      .orderBy(desc(aircraftReviewReportsTable.createdAt));
  },
  async syncReviewCommentLikeReportCounts(commentId: string) {
    const [likes, reports] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(reviewCommentLikesTable)
        .where(eq(reviewCommentLikesTable.commentId, commentId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(reviewCommentReportsTable)
        .where(eq(reviewCommentReportsTable.commentId, commentId))
    ]);

    await db
      .update(reviewCommentsTable)
      .set({
        likeCount: Number(likes[0]?.count ?? 0),
        reportCount: Number(reports[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(reviewCommentsTable.id, commentId));
  },
  async toggleReviewCommentLike(commentId: string, userId: string) {
    const existing = await db
      .select({ id: reviewCommentLikesTable.id })
      .from(reviewCommentLikesTable)
      .where(
        and(
          eq(reviewCommentLikesTable.commentId, commentId),
          eq(reviewCommentLikesTable.userId, userId)
        )
      )
      .limit(1);

    let active = false;
    if (existing.length > 0) {
      await db.delete(reviewCommentLikesTable).where(eq(reviewCommentLikesTable.id, existing[0].id));
    } else {
      await db.insert(reviewCommentLikesTable).values({
        id: createId("review_comment_like"),
        commentId,
        userId
      });
      active = true;
    }

    await this.syncReviewCommentLikeReportCounts(commentId);
    return { active };
  },
  async reportReviewComment(input: {
    commentId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    await db
      .insert(reviewCommentReportsTable)
      .values({
        id: createId("review_comment_report"),
        commentId: input.commentId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    await this.syncReviewCommentLikeReportCounts(input.commentId);
    return true;
  },
  async listReviewCommentReports(commentId: string) {
    return db
      .select({
        id: reviewCommentReportsTable.id,
        reason: reviewCommentReportsTable.reason,
        imageFileIds: reviewCommentReportsTable.imageFileIds,
        createdAt: reviewCommentReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(reviewCommentReportsTable)
      .innerJoin(usersTable, eq(reviewCommentReportsTable.reporterId, usersTable.id))
      .where(eq(reviewCommentReportsTable.commentId, commentId))
      .orderBy(desc(reviewCommentReportsTable.createdAt));
  },
  async listViewerReviewLikes(reviewIds: string[], userId: string) {
    if (reviewIds.length === 0) {
      return [];
    }

    return db
      .select({ reviewId: aircraftReviewLikesTable.reviewId })
      .from(aircraftReviewLikesTable)
      .where(
        and(
          eq(aircraftReviewLikesTable.userId, userId),
          inArray(aircraftReviewLikesTable.reviewId, reviewIds)
        )
      );
  },
  async listViewerReviewReports(reviewIds: string[], userId: string) {
    if (reviewIds.length === 0) {
      return [];
    }

    return db
      .select({ reviewId: aircraftReviewReportsTable.reviewId })
      .from(aircraftReviewReportsTable)
      .where(
        and(
          eq(aircraftReviewReportsTable.reporterId, userId),
          inArray(aircraftReviewReportsTable.reviewId, reviewIds)
        )
      );
  },
  async listViewerReviewCommentLikes(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({ commentId: reviewCommentLikesTable.commentId })
      .from(reviewCommentLikesTable)
      .where(
        and(
          eq(reviewCommentLikesTable.userId, userId),
          inArray(reviewCommentLikesTable.commentId, commentIds)
        )
      );
  },
  async listViewerReviewCommentReports(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({ commentId: reviewCommentReportsTable.commentId })
      .from(reviewCommentReportsTable)
      .where(
        and(
          eq(reviewCommentReportsTable.reporterId, userId),
          inArray(reviewCommentReportsTable.commentId, commentIds)
        )
      );
  },
  async deleteReviewCommentThread(reviewId: string, commentId: string) {
    const existing = await this.getReviewCommentById(commentId);
    if (!existing || existing.reviewId !== reviewId) {
      return 0;
    }

    const rootId = existing.parentCommentId ?? existing.id;

    await db
      .delete(reviewCommentsTable)
      .where(
        and(
          eq(reviewCommentsTable.reviewId, reviewId),
          or(eq(reviewCommentsTable.id, rootId), eq(reviewCommentsTable.parentCommentId, rootId))
        )
      );

    return 1;
  }
};
