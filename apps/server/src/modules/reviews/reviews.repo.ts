import {
  aircraftModelsTable,
  reviewCommentsTable,
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
  }) {
    const id = createId("rcomment");

    await db.insert(reviewCommentsTable).values({
      id,
      reviewId: input.reviewId,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId,
      replyToCommentId: input.replyToCommentId,
      replyToUserId: input.replyToUserId,
      content: input.content
    });

    return this.getReviewCommentById(id);
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
