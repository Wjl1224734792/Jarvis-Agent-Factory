import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  brandsTable,
  createId,
  db,
  rankingCommentsTable,
  rankingItemCommentLikesTable,
  rankingItemCommentReportsTable,
  rankingItemCommentsTable,
  rankingItemRatingsTable,
  rankingItemReportsTable,
  rankingItemsTable,
  rankingReportsTable,
  rankingsTable,
  usersTable
} from "@feijia/db";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

export const rankingsRepo = {
  async listPublishedModels() {
    return db
      .select({
        id: aircraftModelsTable.id,
        slug: aircraftModelsTable.slug,
        name: aircraftModelsTable.name,
        summary: aircraftModelsTable.summary,
        powerType: aircraftModelsTable.powerType,
        category: {
          id: aircraftCategoriesTable.id,
          slug: aircraftCategoriesTable.slug,
          name: aircraftCategoriesTable.name
        },
        brand: {
          id: brandsTable.id,
          slug: brandsTable.slug,
          name: brandsTable.name
        }
      })
      .from(aircraftModelsTable)
      .innerJoin(aircraftCategoriesTable, eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id))
      .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .where(eq(aircraftModelsTable.isPublished, true))
      .orderBy(
        asc(aircraftCategoriesTable.sortOrder),
        asc(brandsTable.sortOrder),
        asc(aircraftModelsTable.createdAt)
      );
  },
  async listVisibleReviewAggregates() {
    return db
      .select({
        modelId: aircraftReviewsTable.modelId,
        totalReviews: sql<number>`count(*)`,
        averageRaw: sql<number>`coalesce(avg(${aircraftReviewsTable.rating}), 0)`
      })
      .from(aircraftReviewsTable)
      .where(eq(aircraftReviewsTable.status, "visible"))
      .groupBy(aircraftReviewsTable.modelId);
  },
  async listUserRatings(userId: string) {
    return db
      .select({
        modelId: aircraftReviewsTable.modelId,
        rating: aircraftReviewsTable.rating
      })
      .from(aircraftReviewsTable)
      .where(eq(aircraftReviewsTable.userId, userId));
  },
  async listRankings() {
    return db
      .select({
        id: rankingsTable.id,
        type: rankingsTable.type,
        status: rankingsTable.status,
        title: rankingsTable.title,
        description: rankingsTable.description,
        coverImageFileId: rankingsTable.coverImageFileId,
        itemAddPolicy: rankingsTable.itemAddPolicy,
        commentCount: rankingsTable.commentCount,
        reportCount: rankingsTable.reportCount,
        createdAt: rankingsTable.createdAt,
        updatedAt: rankingsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingsTable)
      .innerJoin(usersTable, eq(rankingsTable.authorId, usersTable.id))
      .orderBy(desc(rankingsTable.updatedAt));
  },
  async getRankingById(id: string) {
    const rows = await db
      .select({
        id: rankingsTable.id,
        type: rankingsTable.type,
        status: rankingsTable.status,
        title: rankingsTable.title,
        description: rankingsTable.description,
        coverImageFileId: rankingsTable.coverImageFileId,
        itemAddPolicy: rankingsTable.itemAddPolicy,
        commentCount: rankingsTable.commentCount,
        reportCount: rankingsTable.reportCount,
        createdAt: rankingsTable.createdAt,
        updatedAt: rankingsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingsTable)
      .innerJoin(usersTable, eq(rankingsTable.authorId, usersTable.id))
      .where(eq(rankingsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async createRanking(input: {
    authorId: string;
    type: "official" | "community";
    status: "pending" | "published" | "rejected" | "hidden";
    title: string;
    description: string;
    coverImageFileId: string | null;
    itemAddPolicy: "public" | "owner";
  }) {
    const id = createId("ranking");
    await db.insert(rankingsTable).values({
      id,
      authorId: input.authorId,
      type: input.type,
      status: input.status,
      title: input.title,
      description: input.description,
      coverImageFileId: input.coverImageFileId,
      itemAddPolicy: input.itemAddPolicy,
      commentCount: 0,
      reportCount: 0
    });

    return this.getRankingById(id);
  },
  async updateRanking(
    id: string,
    input: {
      title: string;
      description: string;
      coverImageFileId: string | null;
      itemAddPolicy: "public" | "owner";
    }
  ) {
    await db
      .update(rankingsTable)
      .set({
        title: input.title,
        description: input.description,
        coverImageFileId: input.coverImageFileId,
        itemAddPolicy: input.itemAddPolicy,
        updatedAt: new Date()
      })
      .where(eq(rankingsTable.id, id));

    return this.getRankingById(id);
  },
  async updateRankingStatus(id: string, status: "published" | "rejected" | "hidden") {
    await db
      .update(rankingsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(rankingsTable.id, id));

    return this.getRankingById(id);
  },
  async deleteRankingItems(rankingId: string) {
    await db.delete(rankingItemsTable).where(eq(rankingItemsTable.rankingId, rankingId));
  },
  async createRankingItems(
    rankingId: string,
    items: Array<{
      authorId: string;
      status: "pending" | "published" | "rejected" | "hidden";
      rank: number;
      title: string;
      summary: string | null;
      imageFileId: string | null;
      brandName: string | null;
      linkedModelId: string | null;
    }>
  ) {
    if (items.length === 0) {
      return;
    }

    await db.insert(rankingItemsTable).values(
      items.map((item) => ({
        id: createId("ritem"),
        rankingId,
        authorId: item.authorId,
        status: item.status,
        rank: item.rank,
        title: item.title,
        summary: item.summary,
        imageFileId: item.imageFileId,
        brandName: item.brandName,
        linkedModelId: item.linkedModelId,
        commentCount: 0,
        likeCount: 0,
        reportCount: 0
      }))
    );
  },
  async countRankingItems(rankingId: string) {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(rankingItemsTable)
      .where(eq(rankingItemsTable.rankingId, rankingId));

    return Number(rows[0]?.count ?? 0);
  },
  async addRankingItem(input: {
    rankingId: string;
    authorId: string;
    status: "pending" | "published" | "rejected" | "hidden";
    title: string;
    summary: string | null;
    imageFileId: string | null;
    brandName: string | null;
    linkedModelId: string | null;
  }) {
    const rank = (await this.countRankingItems(input.rankingId)) + 1;
    const id = createId("ritem");
    await db.insert(rankingItemsTable).values({
      id,
      rankingId: input.rankingId,
      authorId: input.authorId,
      status: input.status,
      linkedModelId: input.linkedModelId,
      rank,
      title: input.title,
      summary: input.summary,
      imageFileId: input.imageFileId,
      brandName: input.brandName,
      commentCount: 0,
      likeCount: 0,
      reportCount: 0
    });

    return this.getRankingItemById(id);
  },
  async updateRankingItem(
    id: string,
    input: {
      title: string;
      summary: string | null;
      imageFileId: string | null;
      brandName: string | null;
      linkedModelId: string | null;
      status?: "pending" | "published" | "rejected" | "hidden";
    }
  ) {
    await db
      .update(rankingItemsTable)
      .set({
        title: input.title,
        summary: input.summary,
        imageFileId: input.imageFileId,
        brandName: input.brandName,
        linkedModelId: input.linkedModelId,
        status: input.status ?? undefined,
        updatedAt: new Date()
      })
      .where(eq(rankingItemsTable.id, id));

    return this.getRankingItemById(id);
  },
  async deleteRankingItem(id: string) {
    await db.delete(rankingItemsTable).where(eq(rankingItemsTable.id, id));
  },
  async listRankingItems(rankingId: string) {
    return db
      .select({
        id: rankingItemsTable.id,
        rankingId: rankingItemsTable.rankingId,
        authorId: rankingItemsTable.authorId,
        status: rankingItemsTable.status,
        rank: rankingItemsTable.rank,
        title: rankingItemsTable.title,
        summary: rankingItemsTable.summary,
        imageFileId: rankingItemsTable.imageFileId,
        brandName: rankingItemsTable.brandName,
        commentCount: rankingItemsTable.commentCount,
        likeCount: rankingItemsTable.likeCount,
        reportCount: rankingItemsTable.reportCount,
        linkedModelId: aircraftModelsTable.id,
        linkedModelSlug: aircraftModelsTable.slug,
        linkedModelName: aircraftModelsTable.name,
        linkedModelSummary: aircraftModelsTable.summary,
        linkedModelPowerType: aircraftModelsTable.powerType,
        linkedModelCategoryId: aircraftCategoriesTable.id,
        linkedModelCategorySlug: aircraftCategoriesTable.slug,
        linkedModelCategoryName: sql<string | null>`${aircraftCategoriesTable.name}`,
        linkedModelBrandId: brandsTable.id,
        linkedModelBrandSlug: brandsTable.slug,
        linkedModelBrandName: sql<string | null>`${brandsTable.name}`
      })
      .from(rankingItemsTable)
      .leftJoin(aircraftModelsTable, eq(rankingItemsTable.linkedModelId, aircraftModelsTable.id))
      .leftJoin(aircraftCategoriesTable, eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id))
      .leftJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .where(eq(rankingItemsTable.rankingId, rankingId))
      .orderBy(asc(rankingItemsTable.rank), asc(rankingItemsTable.createdAt));
  },
  async getRankingItemById(id: string) {
    const rows = await db
      .select({
        id: rankingItemsTable.id,
        rankingId: rankingItemsTable.rankingId,
        authorId: rankingItemsTable.authorId,
        status: rankingItemsTable.status,
        rank: rankingItemsTable.rank,
        title: rankingItemsTable.title,
        summary: rankingItemsTable.summary,
        imageFileId: rankingItemsTable.imageFileId,
        brandName: rankingItemsTable.brandName,
        commentCount: rankingItemsTable.commentCount,
        likeCount: rankingItemsTable.likeCount,
        reportCount: rankingItemsTable.reportCount,
        linkedModelId: aircraftModelsTable.id,
        linkedModelSlug: aircraftModelsTable.slug,
        linkedModelName: aircraftModelsTable.name,
        linkedModelSummary: aircraftModelsTable.summary,
        linkedModelPowerType: aircraftModelsTable.powerType,
        linkedModelCategoryId: aircraftCategoriesTable.id,
        linkedModelCategorySlug: aircraftCategoriesTable.slug,
        linkedModelCategoryName: sql<string | null>`${aircraftCategoriesTable.name}`,
        linkedModelBrandId: brandsTable.id,
        linkedModelBrandSlug: brandsTable.slug,
        linkedModelBrandName: sql<string | null>`${brandsTable.name}`
      })
      .from(rankingItemsTable)
      .leftJoin(aircraftModelsTable, eq(rankingItemsTable.linkedModelId, aircraftModelsTable.id))
      .leftJoin(aircraftCategoriesTable, eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id))
      .leftJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .where(eq(rankingItemsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listRankingItemRatingAggregates(rankingItemIds: string[]) {
    if (rankingItemIds.length === 0) {
      return [];
    }

    return db
      .select({
        rankingItemId: rankingItemRatingsTable.rankingItemId,
        totalRatings: sql<number>`count(*)`,
        averageRaw: sql<number>`coalesce(avg(${rankingItemRatingsTable.rating}), 0)`
      })
      .from(rankingItemRatingsTable)
      .where(inArray(rankingItemRatingsTable.rankingItemId, rankingItemIds))
      .groupBy(rankingItemRatingsTable.rankingItemId);
  },
  async listRankingItemRatingBreakdown(rankingItemId: string) {
    return db
      .select({
        score: rankingItemRatingsTable.rating,
        count: sql<number>`count(*)`
      })
      .from(rankingItemRatingsTable)
      .where(eq(rankingItemRatingsTable.rankingItemId, rankingItemId))
      .groupBy(rankingItemRatingsTable.rating);
  },
  async listUserRankingItemRatings(userId: string, rankingItemIds: string[]) {
    if (rankingItemIds.length === 0) {
      return [];
    }

    return db
      .select({
        rankingItemId: rankingItemRatingsTable.rankingItemId,
        rating: rankingItemRatingsTable.rating
      })
      .from(rankingItemRatingsTable)
      .where(
        and(
          eq(rankingItemRatingsTable.userId, userId),
          inArray(rankingItemRatingsTable.rankingItemId, rankingItemIds)
        )
      );
  },
  async getUserRankingItemRating(rankingItemId: string, userId: string) {
    const rows = await db
      .select({
        rating: rankingItemRatingsTable.rating
      })
      .from(rankingItemRatingsTable)
      .where(
        and(
          eq(rankingItemRatingsTable.rankingItemId, rankingItemId),
          eq(rankingItemRatingsTable.userId, userId)
        )
      )
      .limit(1);

    return rows[0]?.rating ?? null;
  },
  async upsertRankingItemRating(input: {
    rankingItemId: string;
    userId: string;
    rating: number;
  }) {
    const existing = await db
      .select({ id: rankingItemRatingsTable.id })
      .from(rankingItemRatingsTable)
      .where(
        and(
          eq(rankingItemRatingsTable.rankingItemId, input.rankingItemId),
          eq(rankingItemRatingsTable.userId, input.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(rankingItemRatingsTable)
        .set({ rating: input.rating, updatedAt: new Date() })
        .where(eq(rankingItemRatingsTable.id, existing[0].id));
      return;
    }

    await db.insert(rankingItemRatingsTable).values({
      id: createId("rir"),
      rankingItemId: input.rankingItemId,
      userId: input.userId,
      rating: input.rating
    });
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
  async listRankingComments(rankingId: string) {
    return db
      .select({
        id: rankingCommentsTable.id,
        rankingId: rankingCommentsTable.rankingId,
        content: rankingCommentsTable.content,
        createdAt: rankingCommentsTable.createdAt,
        updatedAt: rankingCommentsTable.updatedAt,
        likeCount: rankingCommentsTable.likeCount,
        reportCount: rankingCommentsTable.reportCount,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingCommentsTable)
      .innerJoin(usersTable, eq(rankingCommentsTable.authorId, usersTable.id))
      .where(eq(rankingCommentsTable.rankingId, rankingId))
      .orderBy(asc(rankingCommentsTable.createdAt));
  },
  async createRankingComment(input: { rankingId: string; authorId: string; content: string }) {
    await db.insert(rankingCommentsTable).values({
      id: createId("rcomment"),
      rankingId: input.rankingId,
      authorId: input.authorId,
      content: input.content,
      likeCount: 0,
      reportCount: 0
    });

    await this.syncRankingCommentCount(input.rankingId);
    return this.listRankingComments(input.rankingId).then((items) => items.at(-1) ?? null);
  },
  async createRankingReport(input: { rankingId: string; reporterId: string; reason: string }) {
    await db
      .insert(rankingReportsTable)
      .values({
        id: createId("rreport"),
        rankingId: input.rankingId,
        reporterId: input.reporterId,
        reason: input.reason
      })
      .onConflictDoNothing();

    await this.syncRankingReportCount(input.rankingId);
  },
  async syncRankingCommentCount(rankingId: string) {
    const totals = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(rankingCommentsTable)
      .where(eq(rankingCommentsTable.rankingId, rankingId));

    await db
      .update(rankingsTable)
      .set({
        commentCount: Number(totals[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(rankingsTable.id, rankingId));
  },
  async syncRankingReportCount(rankingId: string) {
    const totals = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(rankingReportsTable)
      .where(eq(rankingReportsTable.rankingId, rankingId));

    await db
      .update(rankingsTable)
      .set({
        reportCount: Number(totals[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(rankingsTable.id, rankingId));
  },
  async listViewerRankingReports(rankingIds: string[], userId: string) {
    if (rankingIds.length === 0) {
      return [];
    }

    return db
      .select({
        rankingId: rankingReportsTable.rankingId
      })
      .from(rankingReportsTable)
      .where(
        and(
          eq(rankingReportsTable.reporterId, userId),
          inArray(rankingReportsTable.rankingId, rankingIds)
        )
      );
  },
  async getRankingItemCommentById(commentId: string) {
    const rows = await db
      .select({
        id: rankingItemCommentsTable.id,
        rankingItemId: rankingItemCommentsTable.rankingItemId,
        authorId: rankingItemCommentsTable.authorId,
        parentCommentId: rankingItemCommentsTable.parentCommentId,
        replyToCommentId: rankingItemCommentsTable.replyToCommentId,
        replyToUserId: rankingItemCommentsTable.replyToUserId,
        content: rankingItemCommentsTable.content,
        likeCount: rankingItemCommentsTable.likeCount,
        reportCount: rankingItemCommentsTable.reportCount,
        createdAt: rankingItemCommentsTable.createdAt,
        updatedAt: rankingItemCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingItemCommentsTable)
      .innerJoin(usersTable, eq(rankingItemCommentsTable.authorId, usersTable.id))
      .where(eq(rankingItemCommentsTable.id, commentId))
      .limit(1);

    return rows[0] ?? null;
  },
  async listRankingItemComments(rankingItemId: string) {
    return db
      .select({
        id: rankingItemCommentsTable.id,
        rankingItemId: rankingItemCommentsTable.rankingItemId,
        authorId: rankingItemCommentsTable.authorId,
        parentCommentId: rankingItemCommentsTable.parentCommentId,
        replyToCommentId: rankingItemCommentsTable.replyToCommentId,
        replyToUserId: rankingItemCommentsTable.replyToUserId,
        content: rankingItemCommentsTable.content,
        likeCount: rankingItemCommentsTable.likeCount,
        reportCount: rankingItemCommentsTable.reportCount,
        createdAt: rankingItemCommentsTable.createdAt,
        updatedAt: rankingItemCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingItemCommentsTable)
      .innerJoin(usersTable, eq(rankingItemCommentsTable.authorId, usersTable.id))
      .where(eq(rankingItemCommentsTable.rankingItemId, rankingItemId))
      .orderBy(asc(rankingItemCommentsTable.createdAt));
  },
  async upsertRankingItemReview(input: {
    rankingItemId: string;
    authorId: string;
    rating: number;
    content: string;
  }) {
    await this.upsertRankingItemRating({
      rankingItemId: input.rankingItemId,
      userId: input.authorId,
      rating: input.rating
    });

    const existingComment = await db
      .select({ id: rankingItemCommentsTable.id })
      .from(rankingItemCommentsTable)
      .where(
        and(
          eq(rankingItemCommentsTable.rankingItemId, input.rankingItemId),
          eq(rankingItemCommentsTable.authorId, input.authorId),
          isNull(rankingItemCommentsTable.parentCommentId)
        )
      )
      .limit(1);

    if (existingComment.length > 0) {
      await db
        .update(rankingItemCommentsTable)
        .set({
          content: input.content,
          updatedAt: new Date()
        })
        .where(eq(rankingItemCommentsTable.id, existingComment[0].id));
    } else {
      await db.insert(rankingItemCommentsTable).values({
        id: createId("ricom"),
        rankingItemId: input.rankingItemId,
        authorId: input.authorId,
        parentCommentId: null,
        replyToCommentId: null,
        replyToUserId: null,
        content: input.content,
        likeCount: 0,
        reportCount: 0
      });
    }

    await this.syncRankingItemCommentCount(input.rankingItemId);
  },
  async createRankingItemComment(input: {
    rankingItemId: string;
    authorId: string;
    parentCommentId: string | null;
    replyToCommentId: string | null;
    replyToUserId: string | null;
    content: string;
  }) {
    await db.insert(rankingItemCommentsTable).values({
      id: createId("ricom"),
      rankingItemId: input.rankingItemId,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId,
      replyToCommentId: input.replyToCommentId,
      replyToUserId: input.replyToUserId,
      content: input.content,
      likeCount: 0,
      reportCount: 0
    });

    await this.syncRankingItemCommentCount(input.rankingItemId);
    return this.listRankingItemComments(input.rankingItemId).then((items) => items.at(-1) ?? null);
  },
  async updateRankingItemComment(commentId: string, content: string) {
    await db
      .update(rankingItemCommentsTable)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(rankingItemCommentsTable.id, commentId));

    return this.getRankingItemCommentById(commentId);
  },
  async deleteRankingItemCommentThread(rankingItemId: string, commentId: string) {
    const existing = await this.getRankingItemCommentById(commentId);
    if (!existing || existing.rankingItemId !== rankingItemId) {
      return 0;
    }

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .delete(rankingItemCommentsTable)
      .where(
        and(
          eq(rankingItemCommentsTable.rankingItemId, rankingItemId),
          or(
            eq(rankingItemCommentsTable.id, rootId),
            eq(rankingItemCommentsTable.parentCommentId, rootId)
          )
        )
      );

    await this.syncRankingItemCommentCount(rankingItemId);
    return 1;
  },
  async syncRankingItemCommentCount(rankingItemId: string) {
    const totals = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(rankingItemCommentsTable)
      .where(eq(rankingItemCommentsTable.rankingItemId, rankingItemId));

    await db
      .update(rankingItemsTable)
      .set({
        commentCount: Number(totals[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(rankingItemsTable.id, rankingItemId));
  },
  async syncRankingItemCommentEngagementCounts(commentId: string) {
    const [likes, reports] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(rankingItemCommentLikesTable)
        .where(eq(rankingItemCommentLikesTable.commentId, commentId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(rankingItemCommentReportsTable)
        .where(eq(rankingItemCommentReportsTable.commentId, commentId))
    ]);

    await db
      .update(rankingItemCommentsTable)
      .set({
        likeCount: Number(likes[0]?.count ?? 0),
        reportCount: Number(reports[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(rankingItemCommentsTable.id, commentId));
  },
  async toggleRankingItemCommentLike(commentId: string, userId: string) {
    const existing = await db
      .select({ id: rankingItemCommentLikesTable.id })
      .from(rankingItemCommentLikesTable)
      .where(
        and(
          eq(rankingItemCommentLikesTable.commentId, commentId),
          eq(rankingItemCommentLikesTable.userId, userId)
        )
      )
      .limit(1);

    let active = false;
    if (existing.length > 0) {
      await db
        .delete(rankingItemCommentLikesTable)
        .where(eq(rankingItemCommentLikesTable.id, existing[0].id));
    } else {
      await db.insert(rankingItemCommentLikesTable).values({
        id: createId("rilike"),
        commentId,
        userId
      });
      active = true;
    }

    await this.syncRankingItemCommentEngagementCounts(commentId);
    return { active };
  },
  async createRankingItemCommentReport(input: {
    commentId: string;
    reporterId: string;
    reason: string;
  }) {
    await db
      .insert(rankingItemCommentReportsTable)
      .values({
        id: createId("rireport"),
        commentId: input.commentId,
        reporterId: input.reporterId,
        reason: input.reason
      })
      .onConflictDoNothing();

    await this.syncRankingItemCommentEngagementCounts(input.commentId);
  },
  async createRankingItemReport(input: {
    rankingItemId: string;
    reporterId: string;
    reason: string;
  }) {
    await db
      .insert(rankingItemReportsTable)
      .values({
        id: createId("ritreport"),
        rankingItemId: input.rankingItemId,
        reporterId: input.reporterId,
        reason: input.reason
      })
      .onConflictDoNothing();

    await this.syncRankingItemReportCount(input.rankingItemId);
  },
  async syncRankingItemReportCount(rankingItemId: string) {
    const totals = await db
      .select({ count: sql<number>`count(*)` })
      .from(rankingItemReportsTable)
      .where(eq(rankingItemReportsTable.rankingItemId, rankingItemId));

    await db
      .update(rankingItemsTable)
      .set({
        reportCount: Number(totals[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(rankingItemsTable.id, rankingItemId));
  },
  async listViewerRankingItemCommentLikes(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({
        commentId: rankingItemCommentLikesTable.commentId
      })
      .from(rankingItemCommentLikesTable)
      .where(
        and(
          eq(rankingItemCommentLikesTable.userId, userId),
          inArray(rankingItemCommentLikesTable.commentId, commentIds)
        )
      );
  },
  async listViewerRankingItemCommentReports(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({
        commentId: rankingItemCommentReportsTable.commentId
      })
      .from(rankingItemCommentReportsTable)
      .where(
        and(
          eq(rankingItemCommentReportsTable.reporterId, userId),
          inArray(rankingItemCommentReportsTable.commentId, commentIds)
        )
      );
  },
  async listViewerRankingItemReports(rankingItemIds: string[], userId: string) {
    if (rankingItemIds.length === 0) {
      return [];
    }

    return db
      .select({
        rankingItemId: rankingItemReportsTable.rankingItemId
      })
      .from(rankingItemReportsTable)
      .where(
        and(
          eq(rankingItemReportsTable.reporterId, userId),
          inArray(rankingItemReportsTable.rankingItemId, rankingItemIds)
        )
      );
  }
};
