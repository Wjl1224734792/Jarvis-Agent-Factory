import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  brandsTable,
  createId,
  db,
  rankingCommentsTable,
  rankingCommentReportsTable,
  ratingTargetCommentLikesTable,
  ratingTargetCommentReportsTable,
  ratingTargetCommentsTable,
  ratingTargetRatingsTable,
  ratingTargetReportsTable,
  ratingTargetsTable,
  rankingReportsTable,
  rankingsTable,
  usersTable
} from "@feijia/db";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const replyUsers = alias(usersTable, "ranking_comment_reply_users");

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
        rejectionReason: rankingsTable.rejectionReason,
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
        rejectionReason: rankingsTable.rejectionReason,
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
    rejectionReason?: string | null;
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
      rejectionReason: input.rejectionReason ?? null,
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
      status?: "pending" | "published" | "rejected" | "hidden";
      rejectionReason?: string | null;
      title: string;
      description: string;
      coverImageFileId: string | null;
      itemAddPolicy: "public" | "owner";
    }
  ) {
    await db
      .update(rankingsTable)
      .set({
        status: input.status ?? undefined,
        rejectionReason: Object.prototype.hasOwnProperty.call(input, "rejectionReason")
          ? input.rejectionReason ?? null
          : undefined,
        title: input.title,
        description: input.description,
        coverImageFileId: input.coverImageFileId,
        itemAddPolicy: input.itemAddPolicy,
        updatedAt: new Date()
      })
      .where(eq(rankingsTable.id, id));

    return this.getRankingById(id);
  },
  async updateRankingStatus(
    id: string,
    status: "published" | "rejected" | "hidden",
    rejectionReason?: string | null
  ) {
    await db
      .update(rankingsTable)
      .set({
        status,
        rejectionReason: status === "rejected" ? rejectionReason ?? null : null,
        updatedAt: new Date()
      })
      .where(eq(rankingsTable.id, id));

    return this.getRankingById(id);
  },
  async deleteRatingTargets(rankingId: string) {
    await db.delete(ratingTargetsTable).where(eq(ratingTargetsTable.rankingId, rankingId));
  },
  async createRatingTargets(
    rankingId: string,
    items: Array<{
      authorId: string;
      status: "pending" | "published" | "rejected" | "hidden";
      rejectionReason?: string | null;
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

    await db.insert(ratingTargetsTable).values(
      items.map((item) => ({
        id: createId("ritem"),
        rankingId,
        authorId: item.authorId,
        status: item.status,
        rejectionReason: item.rejectionReason ?? null,
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
  async countRatingTargets(rankingId: string) {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(ratingTargetsTable)
      .where(eq(ratingTargetsTable.rankingId, rankingId));

    return Number(rows[0]?.count ?? 0);
  },
  async addRatingTarget(input: {
    rankingId: string;
    authorId: string;
    status: "pending" | "published" | "rejected" | "hidden";
    rejectionReason?: string | null;
    title: string;
    summary: string | null;
    imageFileId: string | null;
    brandName: string | null;
    linkedModelId: string | null;
  }) {
    const rank = (await this.countRatingTargets(input.rankingId)) + 1;
    const id = createId("ritem");
    await db.insert(ratingTargetsTable).values({
      id,
      rankingId: input.rankingId,
      authorId: input.authorId,
      status: input.status,
      rejectionReason: input.rejectionReason ?? null,
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

    return this.getRatingTargetById(id);
  },
  async updateRatingTarget(
    id: string,
    input: {
      title: string;
      summary: string | null;
      imageFileId: string | null;
      brandName: string | null;
      linkedModelId: string | null;
      status?: "pending" | "published" | "rejected" | "hidden";
      rejectionReason?: string | null;
    }
  ) {
    await db
      .update(ratingTargetsTable)
      .set({
        title: input.title,
        summary: input.summary,
        imageFileId: input.imageFileId,
        brandName: input.brandName,
        linkedModelId: input.linkedModelId,
        status: input.status ?? undefined,
        rejectionReason: Object.prototype.hasOwnProperty.call(input, "rejectionReason")
          ? input.rejectionReason ?? null
          : undefined,
        updatedAt: new Date()
      })
      .where(eq(ratingTargetsTable.id, id));

    return this.getRatingTargetById(id);
  },
  async updateRatingTargetStatus(
    id: string,
    input: {
      status: "published" | "rejected" | "hidden";
      rejectionReason?: string | null;
    }
  ) {
    await db
      .update(ratingTargetsTable)
      .set({
        status: input.status,
        rejectionReason: input.status === "rejected" ? input.rejectionReason ?? null : null,
        updatedAt: new Date()
      })
      .where(eq(ratingTargetsTable.id, id));

    return this.getRatingTargetById(id);
  },
  async deleteRatingTarget(id: string) {
    await db.delete(ratingTargetsTable).where(eq(ratingTargetsTable.id, id));
  },
  async listRatingTargets(rankingId: string) {
    return db
      .select({
        id: ratingTargetsTable.id,
        rankingId: ratingTargetsTable.rankingId,
        authorId: ratingTargetsTable.authorId,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        },
        status: ratingTargetsTable.status,
        rejectionReason: ratingTargetsTable.rejectionReason,
        rank: ratingTargetsTable.rank,
        title: ratingTargetsTable.title,
        summary: ratingTargetsTable.summary,
        imageFileId: ratingTargetsTable.imageFileId,
        brandName: ratingTargetsTable.brandName,
        commentCount: ratingTargetsTable.commentCount,
        likeCount: ratingTargetsTable.likeCount,
        reportCount: ratingTargetsTable.reportCount,
        createdAt: ratingTargetsTable.createdAt,
        updatedAt: ratingTargetsTable.updatedAt,
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
      .from(ratingTargetsTable)
      .innerJoin(usersTable, eq(ratingTargetsTable.authorId, usersTable.id))
      .leftJoin(aircraftModelsTable, eq(ratingTargetsTable.linkedModelId, aircraftModelsTable.id))
      .leftJoin(aircraftCategoriesTable, eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id))
      .leftJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .where(eq(ratingTargetsTable.rankingId, rankingId))
      .orderBy(asc(ratingTargetsTable.rank), asc(ratingTargetsTable.createdAt));
  },
  async listRatingTargetsByRankingIds(rankingIds: string[]) {
    if (rankingIds.length === 0) {
      return [];
    }

    return db
      .select({
        id: ratingTargetsTable.id,
        rankingId: ratingTargetsTable.rankingId,
        authorId: ratingTargetsTable.authorId,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        },
        status: ratingTargetsTable.status,
        rejectionReason: ratingTargetsTable.rejectionReason,
        rank: ratingTargetsTable.rank,
        title: ratingTargetsTable.title,
        summary: ratingTargetsTable.summary,
        imageFileId: ratingTargetsTable.imageFileId,
        brandName: ratingTargetsTable.brandName,
        commentCount: ratingTargetsTable.commentCount,
        likeCount: ratingTargetsTable.likeCount,
        reportCount: ratingTargetsTable.reportCount,
        createdAt: ratingTargetsTable.createdAt,
        updatedAt: ratingTargetsTable.updatedAt,
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
      .from(ratingTargetsTable)
      .innerJoin(usersTable, eq(ratingTargetsTable.authorId, usersTable.id))
      .leftJoin(aircraftModelsTable, eq(ratingTargetsTable.linkedModelId, aircraftModelsTable.id))
      .leftJoin(aircraftCategoriesTable, eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id))
      .leftJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .where(inArray(ratingTargetsTable.rankingId, rankingIds))
      .orderBy(asc(ratingTargetsTable.rankingId), asc(ratingTargetsTable.rank), asc(ratingTargetsTable.createdAt));
  },
  async getRatingTargetById(id: string) {
    const rows = await db
      .select({
        id: ratingTargetsTable.id,
        rankingId: ratingTargetsTable.rankingId,
        authorId: ratingTargetsTable.authorId,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        },
        status: ratingTargetsTable.status,
        rejectionReason: ratingTargetsTable.rejectionReason,
        rank: ratingTargetsTable.rank,
        title: ratingTargetsTable.title,
        summary: ratingTargetsTable.summary,
        imageFileId: ratingTargetsTable.imageFileId,
        brandName: ratingTargetsTable.brandName,
        commentCount: ratingTargetsTable.commentCount,
        likeCount: ratingTargetsTable.likeCount,
        reportCount: ratingTargetsTable.reportCount,
        createdAt: ratingTargetsTable.createdAt,
        updatedAt: ratingTargetsTable.updatedAt,
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
      .from(ratingTargetsTable)
      .innerJoin(usersTable, eq(ratingTargetsTable.authorId, usersTable.id))
      .leftJoin(aircraftModelsTable, eq(ratingTargetsTable.linkedModelId, aircraftModelsTable.id))
      .leftJoin(aircraftCategoriesTable, eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id))
      .leftJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .where(eq(ratingTargetsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listRatingTargetRatingAggregates(ratingTargetIds: string[]) {
    if (ratingTargetIds.length === 0) {
      return [];
    }

    return db
      .select({
        ratingTargetId: ratingTargetRatingsTable.ratingTargetId,
        totalRatings: sql<number>`count(*)`,
        averageRaw: sql<number>`coalesce(avg(${ratingTargetRatingsTable.rating}), 0)`
      })
      .from(ratingTargetRatingsTable)
      .where(inArray(ratingTargetRatingsTable.ratingTargetId, ratingTargetIds))
      .groupBy(ratingTargetRatingsTable.ratingTargetId);
  },
  async listRatingTargetRatingBreakdown(ratingTargetId: string) {
    return db
      .select({
        score: ratingTargetRatingsTable.rating,
        count: sql<number>`count(*)`
      })
      .from(ratingTargetRatingsTable)
      .where(eq(ratingTargetRatingsTable.ratingTargetId, ratingTargetId))
      .groupBy(ratingTargetRatingsTable.rating);
  },
  async listUserRatingTargetRatings(userId: string, ratingTargetIds: string[]) {
    if (ratingTargetIds.length === 0) {
      return [];
    }

    return db
      .select({
        ratingTargetId: ratingTargetRatingsTable.ratingTargetId,
        rating: ratingTargetRatingsTable.rating
      })
      .from(ratingTargetRatingsTable)
      .where(
        and(
          eq(ratingTargetRatingsTable.userId, userId),
          inArray(ratingTargetRatingsTable.ratingTargetId, ratingTargetIds)
        )
      );
  },
  async getUserRatingTargetRating(ratingTargetId: string, userId: string) {
    const rows = await db
      .select({
        rating: ratingTargetRatingsTable.rating
      })
      .from(ratingTargetRatingsTable)
      .where(
        and(
          eq(ratingTargetRatingsTable.ratingTargetId, ratingTargetId),
          eq(ratingTargetRatingsTable.userId, userId)
        )
      )
      .limit(1);

    return rows[0]?.rating ?? null;
  },
  async upsertRatingTargetRating(input: {
    ratingTargetId: string;
    userId: string;
    rating: number;
  }) {
    const existing = await db
      .select({ id: ratingTargetRatingsTable.id })
      .from(ratingTargetRatingsTable)
      .where(
        and(
          eq(ratingTargetRatingsTable.ratingTargetId, input.ratingTargetId),
          eq(ratingTargetRatingsTable.userId, input.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(ratingTargetRatingsTable)
        .set({ rating: input.rating, updatedAt: new Date() })
        .where(eq(ratingTargetRatingsTable.id, existing[0].id));
      return;
    }

    await db.insert(ratingTargetRatingsTable).values({
      id: createId("rir"),
      ratingTargetId: input.ratingTargetId,
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
        status: rankingCommentsTable.status,
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
  async createRankingComment(input: {
    rankingId: string;
    authorId: string;
    content: string;
    status: "pending" | "visible" | "hidden";
  }) {
    await db.insert(rankingCommentsTable).values({
      id: createId("rcomment"),
      rankingId: input.rankingId,
      authorId: input.authorId,
      content: input.content,
      status: input.status,
      likeCount: 0,
      reportCount: 0
    });

    await this.syncRankingCommentCount(input.rankingId);
    return this.listRankingComments(input.rankingId).then((items) => items.at(-1) ?? null);
  },
  async createRankingReport(input: {
    rankingId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    await db
      .insert(rankingReportsTable)
      .values({
        id: createId("rreport"),
        rankingId: input.rankingId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    await this.syncRankingReportCount(input.rankingId);
  },
  async listRankingReports(rankingId: string) {
    return db
      .select({
        id: rankingReportsTable.id,
        reason: rankingReportsTable.reason,
        imageFileIds: rankingReportsTable.imageFileIds,
        createdAt: rankingReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingReportsTable)
      .innerJoin(usersTable, eq(rankingReportsTable.reporterId, usersTable.id))
      .where(eq(rankingReportsTable.rankingId, rankingId))
      .orderBy(desc(rankingReportsTable.createdAt));
  },
  async syncRankingCommentCount(rankingId: string) {
    const totals = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(rankingCommentsTable)
      .where(
        and(
          eq(rankingCommentsTable.rankingId, rankingId),
          eq(rankingCommentsTable.status, "visible")
        )
      );

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
  async getRatingTargetCommentById(commentId: string) {
    const rows = await db
      .select({
        id: ratingTargetCommentsTable.id,
        ratingTargetId: ratingTargetCommentsTable.ratingTargetId,
        authorId: ratingTargetCommentsTable.authorId,
        parentCommentId: ratingTargetCommentsTable.parentCommentId,
        replyToCommentId: ratingTargetCommentsTable.replyToCommentId,
        replyToUserId: ratingTargetCommentsTable.replyToUserId,
        content: ratingTargetCommentsTable.content,
        rating: ratingTargetCommentsTable.rating,
        status: ratingTargetCommentsTable.status,
        likeCount: ratingTargetCommentsTable.likeCount,
        reportCount: ratingTargetCommentsTable.reportCount,
        createdAt: ratingTargetCommentsTable.createdAt,
        updatedAt: ratingTargetCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(ratingTargetCommentsTable)
      .innerJoin(usersTable, eq(ratingTargetCommentsTable.authorId, usersTable.id))
      .where(eq(ratingTargetCommentsTable.id, commentId))
      .limit(1);

    return rows[0] ?? null;
  },
  async listRatingTargetComments(ratingTargetId: string) {
    return db
      .select({
        id: ratingTargetCommentsTable.id,
        ratingTargetId: ratingTargetCommentsTable.ratingTargetId,
        authorId: ratingTargetCommentsTable.authorId,
        parentCommentId: ratingTargetCommentsTable.parentCommentId,
        replyToCommentId: ratingTargetCommentsTable.replyToCommentId,
        replyToUserId: ratingTargetCommentsTable.replyToUserId,
        content: ratingTargetCommentsTable.content,
        rating: ratingTargetCommentsTable.rating,
        status: ratingTargetCommentsTable.status,
        likeCount: ratingTargetCommentsTable.likeCount,
        reportCount: ratingTargetCommentsTable.reportCount,
        createdAt: ratingTargetCommentsTable.createdAt,
        updatedAt: ratingTargetCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(ratingTargetCommentsTable)
      .innerJoin(usersTable, eq(ratingTargetCommentsTable.authorId, usersTable.id))
      .where(eq(ratingTargetCommentsTable.ratingTargetId, ratingTargetId))
      .orderBy(asc(ratingTargetCommentsTable.createdAt));
  },
  async listVisibleRatingTargetCommentRatings(ratingTargetIds: string[]) {
    if (ratingTargetIds.length === 0) {
      return [];
    }

    return db
      .select({
        ratingTargetId: ratingTargetCommentsTable.ratingTargetId,
        commentId: ratingTargetCommentsTable.id,
        authorId: ratingTargetCommentsTable.authorId,
        rating: ratingTargetCommentsTable.rating,
        createdAt: ratingTargetCommentsTable.createdAt
      })
      .from(ratingTargetCommentsTable)
      .where(
        and(
          inArray(ratingTargetCommentsTable.ratingTargetId, ratingTargetIds),
          isNull(ratingTargetCommentsTable.parentCommentId),
          eq(ratingTargetCommentsTable.status, "visible")
        )
      )
      .orderBy(desc(ratingTargetCommentsTable.createdAt));
  },
  async upsertRatingTargetReview(input: {
    ratingTargetId: string;
    authorId: string;
    rating: number;
    content: string;
    status: "pending" | "visible" | "hidden";
  }) {
    await this.upsertRatingTargetRating({
      ratingTargetId: input.ratingTargetId,
      userId: input.authorId,
      rating: input.rating
    });
    const existing = await db
      .select({ id: ratingTargetCommentsTable.id })
      .from(ratingTargetCommentsTable)
      .where(
        and(
          eq(ratingTargetCommentsTable.ratingTargetId, input.ratingTargetId),
          eq(ratingTargetCommentsTable.authorId, input.authorId),
          isNull(ratingTargetCommentsTable.parentCommentId)
        )
      )
      .orderBy(desc(ratingTargetCommentsTable.updatedAt), desc(ratingTargetCommentsTable.createdAt))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(ratingTargetCommentsTable)
        .set({
          content: input.content,
          rating: input.rating,
          status: input.status,
          updatedAt: new Date()
        })
        .where(eq(ratingTargetCommentsTable.id, existing[0].id));
      await this.syncRatingTargetCommentCount(input.ratingTargetId);
      return;
    }

    await this.createRatingTargetComment({
      ratingTargetId: input.ratingTargetId,
      authorId: input.authorId,
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: input.content,
      rating: input.rating,
      status: input.status
    });
  },
  async createRatingTargetComment(input: {
    ratingTargetId: string;
    authorId: string;
    parentCommentId: string | null;
    replyToCommentId: string | null;
    replyToUserId: string | null;
    content: string;
    rating: number | null;
    status: "pending" | "visible" | "hidden";
  }) {
    await db.insert(ratingTargetCommentsTable).values({
      id: createId("ricom"),
      ratingTargetId: input.ratingTargetId,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId,
      replyToCommentId: input.replyToCommentId,
      replyToUserId: input.replyToUserId,
      content: input.content,
      rating: input.rating,
      status: input.status,
      likeCount: 0,
      reportCount: 0
    });

    await this.syncRatingTargetCommentCount(input.ratingTargetId);
    return this.listRatingTargetComments(input.ratingTargetId).then((items) => items.at(-1) ?? null);
  },
  async updateRatingTargetComment(commentId: string, content: string) {
    await db
      .update(ratingTargetCommentsTable)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(ratingTargetCommentsTable.id, commentId));

    return this.getRatingTargetCommentById(commentId);
  },
  async listAdminRankingComments(status?: "pending" | "visible" | "hidden") {
    return db
      .select({
        id: rankingCommentsTable.id,
        rankingId: rankingCommentsTable.rankingId,
        rankingTitle: rankingsTable.title,
        content: rankingCommentsTable.content,
        status: rankingCommentsTable.status,
        likeCount: rankingCommentsTable.likeCount,
        reportCount: rankingCommentsTable.reportCount,
        createdAt: rankingCommentsTable.createdAt,
        updatedAt: rankingCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingCommentsTable)
      .innerJoin(rankingsTable, eq(rankingCommentsTable.rankingId, rankingsTable.id))
      .innerJoin(usersTable, eq(rankingCommentsTable.authorId, usersTable.id))
      .where(status ? eq(rankingCommentsTable.status, status) : sql`true`)
      .orderBy(desc(rankingCommentsTable.updatedAt));
  },
  async listRankingCommentReports(commentId: string) {
    return db
      .select({
        id: rankingCommentReportsTable.id,
        reason: rankingCommentReportsTable.reason,
        imageFileIds: rankingCommentReportsTable.imageFileIds,
        createdAt: rankingCommentReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(rankingCommentReportsTable)
      .innerJoin(usersTable, eq(rankingCommentReportsTable.reporterId, usersTable.id))
      .where(eq(rankingCommentReportsTable.commentId, commentId))
      .orderBy(desc(rankingCommentReportsTable.createdAt));
  },
  async updateRankingCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const existing = await db
      .select({
        id: rankingCommentsTable.id,
        rankingId: rankingCommentsTable.rankingId
      })
      .from(rankingCommentsTable)
      .where(eq(rankingCommentsTable.id, id))
      .limit(1);
    if (existing.length === 0) {
      return null;
    }

    await db
      .update(rankingCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(rankingCommentsTable.id, id));
    await this.syncRankingCommentCount(existing[0].rankingId);

    const rows = await this.listAdminRankingComments();
    return rows.find((item) => item.id === id) ?? null;
  },
  async listAdminRatingTargetComments(status?: "pending" | "visible" | "hidden") {
    return db
      .select({
        id: ratingTargetCommentsTable.id,
        ratingTargetId: ratingTargetCommentsTable.ratingTargetId,
        ratingTargetTitle: ratingTargetsTable.title,
        rankingTitle: rankingsTable.title,
        parentCommentId: ratingTargetCommentsTable.parentCommentId,
        replyToCommentId: ratingTargetCommentsTable.replyToCommentId,
        content: ratingTargetCommentsTable.content,
        rating: ratingTargetCommentsTable.rating,
        status: ratingTargetCommentsTable.status,
        likeCount: ratingTargetCommentsTable.likeCount,
        reportCount: ratingTargetCommentsTable.reportCount,
        createdAt: ratingTargetCommentsTable.createdAt,
        updatedAt: ratingTargetCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        },
        replyToUser: {
          id: replyUsers.id,
          displayName: replyUsers.displayName,
          avatarFileId: replyUsers.avatarFileId,
          role: replyUsers.role
        }
      })
      .from(ratingTargetCommentsTable)
      .innerJoin(ratingTargetsTable, eq(ratingTargetCommentsTable.ratingTargetId, ratingTargetsTable.id))
      .innerJoin(rankingsTable, eq(ratingTargetsTable.rankingId, rankingsTable.id))
      .innerJoin(usersTable, eq(ratingTargetCommentsTable.authorId, usersTable.id))
      .leftJoin(replyUsers, eq(ratingTargetCommentsTable.replyToUserId, replyUsers.id))
      .where(status ? eq(ratingTargetCommentsTable.status, status) : sql`true`)
      .orderBy(desc(ratingTargetCommentsTable.updatedAt));
  },
  async updateRatingTargetCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const existing = await this.getRatingTargetCommentById(id);
    if (!existing) {
      return null;
    }

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .update(ratingTargetCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(ratingTargetCommentsTable.ratingTargetId, existing.ratingTargetId),
          or(eq(ratingTargetCommentsTable.id, rootId), eq(ratingTargetCommentsTable.parentCommentId, rootId))
        )
      );
    await this.syncRatingTargetCommentCount(existing.ratingTargetId);

    const rows = await this.listAdminRatingTargetComments();
    return rows.find((item) => item.id === id) ?? null;
  },
  async deleteRatingTargetCommentThread(ratingTargetId: string, commentId: string) {
    const existing = await this.getRatingTargetCommentById(commentId);
    if (!existing || existing.ratingTargetId !== ratingTargetId) {
      return 0;
    }

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .delete(ratingTargetCommentsTable)
      .where(
        and(
          eq(ratingTargetCommentsTable.ratingTargetId, ratingTargetId),
          or(
            eq(ratingTargetCommentsTable.id, rootId),
            eq(ratingTargetCommentsTable.parentCommentId, rootId)
          )
        )
      );

    await this.syncRatingTargetCommentCount(ratingTargetId);
    return 1;
  },
  async syncRatingTargetCommentCount(ratingTargetId: string) {
    const totals = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(ratingTargetCommentsTable)
      .where(
        and(
          eq(ratingTargetCommentsTable.ratingTargetId, ratingTargetId),
          eq(ratingTargetCommentsTable.status, "visible")
        )
      );

    await db
      .update(ratingTargetsTable)
      .set({
        commentCount: Number(totals[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(ratingTargetsTable.id, ratingTargetId));
  },
  async syncRatingTargetCommentEngagementCounts(commentId: string) {
    const [likes, reports] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(ratingTargetCommentLikesTable)
        .where(eq(ratingTargetCommentLikesTable.commentId, commentId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(ratingTargetCommentReportsTable)
        .where(eq(ratingTargetCommentReportsTable.commentId, commentId))
    ]);

    await db
      .update(ratingTargetCommentsTable)
      .set({
        likeCount: Number(likes[0]?.count ?? 0),
        reportCount: Number(reports[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(ratingTargetCommentsTable.id, commentId));
  },
  async toggleRatingTargetCommentLike(commentId: string, userId: string) {
    const existing = await db
      .select({ id: ratingTargetCommentLikesTable.id })
      .from(ratingTargetCommentLikesTable)
      .where(
        and(
          eq(ratingTargetCommentLikesTable.commentId, commentId),
          eq(ratingTargetCommentLikesTable.userId, userId)
        )
      )
      .limit(1);

    let active = false;
    if (existing.length > 0) {
      await db
        .delete(ratingTargetCommentLikesTable)
        .where(eq(ratingTargetCommentLikesTable.id, existing[0].id));
    } else {
      await db.insert(ratingTargetCommentLikesTable).values({
        id: createId("rilike"),
        commentId,
        userId
      });
      active = true;
    }

    await this.syncRatingTargetCommentEngagementCounts(commentId);
    return { active };
  },
  async createRatingTargetCommentReport(input: {
    commentId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    await db
      .insert(ratingTargetCommentReportsTable)
      .values({
        id: createId("rireport"),
        commentId: input.commentId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    await this.syncRatingTargetCommentEngagementCounts(input.commentId);
  },
  async listRatingTargetCommentReports(commentId: string) {
    return db
      .select({
        id: ratingTargetCommentReportsTable.id,
        reason: ratingTargetCommentReportsTable.reason,
        imageFileIds: ratingTargetCommentReportsTable.imageFileIds,
        createdAt: ratingTargetCommentReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(ratingTargetCommentReportsTable)
      .innerJoin(usersTable, eq(ratingTargetCommentReportsTable.reporterId, usersTable.id))
      .where(eq(ratingTargetCommentReportsTable.commentId, commentId))
      .orderBy(desc(ratingTargetCommentReportsTable.createdAt));
  },
  async createRatingTargetReport(input: {
    ratingTargetId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    await db
      .insert(ratingTargetReportsTable)
      .values({
        id: createId("ritreport"),
        ratingTargetId: input.ratingTargetId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    await this.syncRatingTargetReportCount(input.ratingTargetId);
  },
  async listRatingTargetReports(ratingTargetId: string) {
    return db
      .select({
        id: ratingTargetReportsTable.id,
        reason: ratingTargetReportsTable.reason,
        imageFileIds: ratingTargetReportsTable.imageFileIds,
        createdAt: ratingTargetReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(ratingTargetReportsTable)
      .innerJoin(usersTable, eq(ratingTargetReportsTable.reporterId, usersTable.id))
      .where(eq(ratingTargetReportsTable.ratingTargetId, ratingTargetId))
      .orderBy(desc(ratingTargetReportsTable.createdAt));
  },
  async syncRatingTargetReportCount(ratingTargetId: string) {
    const totals = await db
      .select({ count: sql<number>`count(*)` })
      .from(ratingTargetReportsTable)
      .where(eq(ratingTargetReportsTable.ratingTargetId, ratingTargetId));

    await db
      .update(ratingTargetsTable)
      .set({
        reportCount: Number(totals[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(ratingTargetsTable.id, ratingTargetId));
  },
  async listViewerRatingTargetCommentLikes(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({
        commentId: ratingTargetCommentLikesTable.commentId
      })
      .from(ratingTargetCommentLikesTable)
      .where(
        and(
          eq(ratingTargetCommentLikesTable.userId, userId),
          inArray(ratingTargetCommentLikesTable.commentId, commentIds)
        )
      );
  },
  async listViewerRatingTargetCommentReports(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({
        commentId: ratingTargetCommentReportsTable.commentId
      })
      .from(ratingTargetCommentReportsTable)
      .where(
        and(
          eq(ratingTargetCommentReportsTable.reporterId, userId),
          inArray(ratingTargetCommentReportsTable.commentId, commentIds)
        )
      );
  },
  async listViewerRatingTargetReports(ratingTargetIds: string[], userId: string) {
    if (ratingTargetIds.length === 0) {
      return [];
    }

    return db
      .select({
        ratingTargetId: ratingTargetReportsTable.ratingTargetId
      })
      .from(ratingTargetReportsTable)
      .where(
        and(
          eq(ratingTargetReportsTable.reporterId, userId),
          inArray(ratingTargetReportsTable.ratingTargetId, ratingTargetIds)
        )
      );
  }
};
