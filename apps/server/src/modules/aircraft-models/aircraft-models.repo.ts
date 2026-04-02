import {
  aircraftCategoriesTable,
  aircraftModelCommentLikesTable,
  aircraftModelCommentReportsTable,
  aircraftModelCommentsTable,
  aircraftModelReportsTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  brandsTable,
  createId,
  db,
  usersTable
} from "@feijia/db";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

type ListFilters = {
  categorySlugs?: string[];
  brandSlugs?: string[];
  powerTypes?: string[];
  keyword?: string;
};

export const aircraftModelsRepo = {
  async list(filters: ListFilters) {
    const conditions = [eq(aircraftModelsTable.isPublished, true)];

    if (filters.categorySlugs?.length) {
      conditions.push(inArray(aircraftCategoriesTable.slug, filters.categorySlugs));
    }

    if (filters.brandSlugs?.length) {
      conditions.push(inArray(brandsTable.slug, filters.brandSlugs));
    }

    if (filters.powerTypes?.length) {
      conditions.push(inArray(aircraftModelsTable.powerType, filters.powerTypes));
    }

    if (filters.keyword) {
      const keyword = `%${filters.keyword}%`;
      conditions.push(
        or(
          ilike(aircraftModelsTable.name, keyword),
          ilike(brandsTable.name, keyword),
          ilike(aircraftModelsTable.summary, keyword),
          ilike(aircraftModelsTable.description, keyword)
        )!
      );
    }

    const query = db
      .select({
        id: aircraftModelsTable.id,
        slug: aircraftModelsTable.slug,
        name: aircraftModelsTable.name,
        summary: aircraftModelsTable.summary,
        priceMin: aircraftModelsTable.priceMin,
        priceMax: aircraftModelsTable.priceMax,
        powerType: aircraftModelsTable.powerType,
        reviewSummary: {
          totalReviews: sql<number>`cast(coalesce(count(case when ${aircraftReviewsTable.status} = 'visible' then 1 end), 0) as int)`
        },
        ownerId: aircraftModelsTable.ownerId,
        sourceSubmissionId: aircraftModelsTable.sourceSubmissionId,
        reportCount: aircraftModelsTable.reportCount,
        category: {
          id: aircraftCategoriesTable.id,
          slug: aircraftCategoriesTable.slug,
          name: aircraftCategoriesTable.name
        },
        brand: {
          id: brandsTable.id,
          slug: brandsTable.slug,
          name: brandsTable.name,
          logoUrl: brandsTable.logoUrl
        }
      })
      .from(aircraftModelsTable)
      .innerJoin(
        aircraftCategoriesTable,
        eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id)
      )
      .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .leftJoin(aircraftReviewsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .groupBy(
        aircraftModelsTable.id,
        aircraftCategoriesTable.id,
        brandsTable.id
      );

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  },
  async findBySlug(slug: string) {
    const items = await db
      .select({
        id: aircraftModelsTable.id,
        slug: aircraftModelsTable.slug,
        name: aircraftModelsTable.name,
        summary: aircraftModelsTable.summary,
        description: aircraftModelsTable.description,
        priceMin: aircraftModelsTable.priceMin,
        priceMax: aircraftModelsTable.priceMax,
        powerType: aircraftModelsTable.powerType,
        isPublished: aircraftModelsTable.isPublished,
        ownerId: aircraftModelsTable.ownerId,
        sourceSubmissionId: aircraftModelsTable.sourceSubmissionId,
        reportCount: aircraftModelsTable.reportCount,
        reviewSummary: {
          totalReviews: sql<number>`cast(coalesce(count(case when ${aircraftReviewsTable.status} = 'visible' then 1 end), 0) as int)`
        },
        maxFlightTimeMinutes: aircraftModelsTable.maxFlightTimeMinutes,
        maxRangeKilometers: aircraftModelsTable.maxRangeKilometers,
        maxSpeedKph: aircraftModelsTable.maxSpeedKph,
        takeoffWeightGrams: aircraftModelsTable.takeoffWeightGrams,
        category: {
          id: aircraftCategoriesTable.id,
          slug: aircraftCategoriesTable.slug,
          name: aircraftCategoriesTable.name
        },
        brand: {
          id: brandsTable.id,
          slug: brandsTable.slug,
          name: brandsTable.name,
          logoUrl: brandsTable.logoUrl
        }
      })
      .from(aircraftModelsTable)
      .innerJoin(
        aircraftCategoriesTable,
        eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id)
      )
      .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .leftJoin(aircraftReviewsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .where(eq(aircraftModelsTable.slug, slug))
      .groupBy(
        aircraftModelsTable.id,
        aircraftCategoriesTable.id,
        brandsTable.id
      )
      .limit(1);

    return items[0] ?? null;
  },
  async getInteractionSummary(modelId: string) {
    const rows = await db.execute(
      sql<{ type: "interested" | "favorite" | "share"; count: number }>`
      select "type", cast(count(*) as int) as "count"
      from "aircraft_model_interactions"
      where "model_id" = ${modelId}
      group by "type"
    `
    );

    const counts = {
      interested: 0,
      favorite: 0,
      share: 0
    };

    for (const row of rows.rows) {
      if (row.type === "interested" || row.type === "favorite" || row.type === "share") {
        counts[row.type] = Number(row.count ?? 0);
      }
    }

    return {
      interestCount: counts.interested,
      favoriteCount: counts.favorite,
      shareCount: counts.share
    };
  },
  async getViewerInteractionState(modelId: string, userId?: string | null) {
    if (!userId) {
      return {
        isInterested: false,
        isFavorited: false,
        hasShared: false
      };
    }

    const rows = await db.execute(
      sql<{ type: "interested" | "favorite" | "share" }>`
      select "type"
      from "aircraft_model_interactions"
      where "model_id" = ${modelId} and "user_id" = ${userId}
    `
    );
    const types = new Set(rows.rows.map((row) => row.type));

    return {
      isInterested: types.has("interested"),
      isFavorited: types.has("favorite"),
      hasShared: types.has("share")
    };
  },
  async toggleModelInteraction(input: {
    modelId: string;
    userId: string;
    type: "interested" | "favorite";
  }) {
    const existing = await db.execute(sql<{ id: string }>`
      select "id"
      from "aircraft_model_interactions"
      where
        "model_id" = ${input.modelId}
        and "user_id" = ${input.userId}
        and "type" = ${input.type}
      limit 1
    `);

    let active = false;
    if (existing.rows[0]?.id) {
      await db.execute(sql`
        delete from "aircraft_model_interactions"
        where "id" = ${existing.rows[0].id}
      `);
    } else {
      await db.execute(sql`
        insert into "aircraft_model_interactions" (
          "id",
          "model_id",
          "user_id",
          "type",
          "created_at",
          "updated_at"
        )
        values (
          ${createId("mint")},
          ${input.modelId},
          ${input.userId},
          ${input.type},
          now(),
          now()
        )
      `);
      active = true;
    }

    return { active };
  },
  async createShareInteraction(modelId: string, userId: string) {
    await db.execute(sql`
      insert into "aircraft_model_interactions" (
        "id",
        "model_id",
        "user_id",
        "type",
        "created_at",
        "updated_at"
      )
      values (
        ${createId("mint")},
        ${modelId},
        ${userId},
        'share',
        now(),
        now()
      )
      on conflict ("model_id", "user_id", "type") do nothing
    `);

    return { active: true };
  },
  async create(input: {
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
    const id = createId("model");

    await db.insert(aircraftModelsTable).values({
      id,
      slug: input.slug,
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId,
      ownerId: input.ownerId ?? null,
      sourceSubmissionId: input.sourceSubmissionId ?? null,
      powerType: input.powerType,
      summary: input.summary,
      description: input.description,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      maxFlightTimeMinutes: input.maxFlightTimeMinutes,
      maxRangeKilometers: input.maxRangeKilometers,
      maxSpeedKph: input.maxSpeedKph,
      takeoffWeightGrams: input.takeoffWeightGrams,
      isPublished: input.isPublished
    });

    return this.findById(id);
  },
  async update(
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
    await db
      .update(aircraftModelsTable)
      .set({
        slug: input.slug,
        name: input.name,
        categoryId: input.categoryId,
        brandId: input.brandId,
        ownerId: input.ownerId ?? undefined,
        sourceSubmissionId: input.sourceSubmissionId ?? undefined,
        powerType: input.powerType,
        summary: input.summary,
        description: input.description,
        priceMin: input.priceMin,
        priceMax: input.priceMax,
        maxFlightTimeMinutes: input.maxFlightTimeMinutes,
        maxRangeKilometers: input.maxRangeKilometers,
        maxSpeedKph: input.maxSpeedKph,
        takeoffWeightGrams: input.takeoffWeightGrams,
        isPublished: input.isPublished
      })
      .where(eq(aircraftModelsTable.id, id));

    return this.findById(id);
  },
  async findById(id: string) {
    const items = await db
      .select({
        id: aircraftModelsTable.id,
        slug: aircraftModelsTable.slug,
        name: aircraftModelsTable.name,
        summary: aircraftModelsTable.summary,
        description: aircraftModelsTable.description,
        priceMin: aircraftModelsTable.priceMin,
        priceMax: aircraftModelsTable.priceMax,
        powerType: aircraftModelsTable.powerType,
        isPublished: aircraftModelsTable.isPublished,
        ownerId: aircraftModelsTable.ownerId,
        sourceSubmissionId: aircraftModelsTable.sourceSubmissionId,
        reportCount: aircraftModelsTable.reportCount,
        reviewSummary: {
          totalReviews: sql<number>`cast(coalesce(count(case when ${aircraftReviewsTable.status} = 'visible' then 1 end), 0) as int)`
        },
        maxFlightTimeMinutes: aircraftModelsTable.maxFlightTimeMinutes,
        maxRangeKilometers: aircraftModelsTable.maxRangeKilometers,
        maxSpeedKph: aircraftModelsTable.maxSpeedKph,
        takeoffWeightGrams: aircraftModelsTable.takeoffWeightGrams,
        category: {
          id: aircraftCategoriesTable.id,
          slug: aircraftCategoriesTable.slug,
          name: aircraftCategoriesTable.name
        },
        brand: {
          id: brandsTable.id,
          slug: brandsTable.slug,
          name: brandsTable.name,
          logoUrl: brandsTable.logoUrl
        }
      })
      .from(aircraftModelsTable)
      .innerJoin(
        aircraftCategoriesTable,
        eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id)
      )
      .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
      .leftJoin(aircraftReviewsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .where(eq(aircraftModelsTable.id, id))
      .groupBy(
        aircraftModelsTable.id,
        aircraftCategoriesTable.id,
        brandsTable.id
      )
      .limit(1);

    return items[0] ?? null;
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
  async listModelComments(modelId: string) {
    return db
      .select({
        id: aircraftModelCommentsTable.id,
        modelId: aircraftModelCommentsTable.modelId,
        authorId: aircraftModelCommentsTable.authorId,
        parentCommentId: aircraftModelCommentsTable.parentCommentId,
        replyToCommentId: aircraftModelCommentsTable.replyToCommentId,
        replyToUserId: aircraftModelCommentsTable.replyToUserId,
        content: aircraftModelCommentsTable.content,
        status: aircraftModelCommentsTable.status,
        likeCount: aircraftModelCommentsTable.likeCount,
        reportCount: aircraftModelCommentsTable.reportCount,
        createdAt: aircraftModelCommentsTable.createdAt,
        updatedAt: aircraftModelCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(aircraftModelCommentsTable)
      .innerJoin(usersTable, eq(aircraftModelCommentsTable.authorId, usersTable.id))
      .where(eq(aircraftModelCommentsTable.modelId, modelId))
      .orderBy(asc(aircraftModelCommentsTable.createdAt));
  },
  async getModelCommentById(id: string) {
    const rows = await db
      .select({
        id: aircraftModelCommentsTable.id,
        modelId: aircraftModelCommentsTable.modelId,
        authorId: aircraftModelCommentsTable.authorId,
        parentCommentId: aircraftModelCommentsTable.parentCommentId,
        replyToCommentId: aircraftModelCommentsTable.replyToCommentId,
        replyToUserId: aircraftModelCommentsTable.replyToUserId,
        content: aircraftModelCommentsTable.content,
        status: aircraftModelCommentsTable.status,
        likeCount: aircraftModelCommentsTable.likeCount,
        reportCount: aircraftModelCommentsTable.reportCount,
        createdAt: aircraftModelCommentsTable.createdAt,
        updatedAt: aircraftModelCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(aircraftModelCommentsTable)
      .innerJoin(usersTable, eq(aircraftModelCommentsTable.authorId, usersTable.id))
      .where(eq(aircraftModelCommentsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async createModelComment(input: {
    modelId: string;
    authorId: string;
    parentCommentId: string | null;
    replyToCommentId: string | null;
    replyToUserId: string | null;
    content: string;
    status: "pending" | "visible" | "hidden";
  }) {
    const id = createId("mcomment");
    await db.insert(aircraftModelCommentsTable).values({
      id,
      modelId: input.modelId,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId,
      replyToCommentId: input.replyToCommentId,
      replyToUserId: input.replyToUserId,
      content: input.content,
      status: input.status
    });

    return this.getModelCommentById(id);
  },
  async updateModelComment(id: string, content: string) {
    await db
      .update(aircraftModelCommentsTable)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(aircraftModelCommentsTable.id, id));

    return this.getModelCommentById(id);
  },
  async listAdminModelComments(status?: "pending" | "visible" | "hidden") {
    return db
      .select({
        id: aircraftModelCommentsTable.id,
        modelId: aircraftModelCommentsTable.modelId,
        parentCommentId: aircraftModelCommentsTable.parentCommentId,
        replyToCommentId: aircraftModelCommentsTable.replyToCommentId,
        replyToUserId: aircraftModelCommentsTable.replyToUserId,
        content: aircraftModelCommentsTable.content,
        status: aircraftModelCommentsTable.status,
        likeCount: aircraftModelCommentsTable.likeCount,
        reportCount: aircraftModelCommentsTable.reportCount,
        createdAt: aircraftModelCommentsTable.createdAt,
        updatedAt: aircraftModelCommentsTable.updatedAt,
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
      .from(aircraftModelCommentsTable)
      .innerJoin(aircraftModelsTable, eq(aircraftModelCommentsTable.modelId, aircraftModelsTable.id))
      .innerJoin(usersTable, eq(aircraftModelCommentsTable.authorId, usersTable.id))
      .where(status ? eq(aircraftModelCommentsTable.status, status) : sql`true`)
      .orderBy(desc(aircraftModelCommentsTable.updatedAt));
  },
  async updateModelCommentStatus(id: string, status: "pending" | "visible" | "hidden") {
    const existing = await this.getModelCommentById(id);
    if (!existing) {
      return null;
    }

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .update(aircraftModelCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(aircraftModelCommentsTable.modelId, existing.modelId),
          or(eq(aircraftModelCommentsTable.id, rootId), eq(aircraftModelCommentsTable.parentCommentId, rootId))
        )
      );

    const rows = await this.listAdminModelComments();
    return rows.find((item) => item.id === id) ?? null;
  },
  async syncModelCommentLikeReportCounts(commentId: string) {
    const [likes, reports] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(aircraftModelCommentLikesTable)
        .where(eq(aircraftModelCommentLikesTable.commentId, commentId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(aircraftModelCommentReportsTable)
        .where(eq(aircraftModelCommentReportsTable.commentId, commentId))
    ]);

    await db
      .update(aircraftModelCommentsTable)
      .set({
        likeCount: Number(likes[0]?.count ?? 0),
        reportCount: Number(reports[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(aircraftModelCommentsTable.id, commentId));
  },
  async toggleModelCommentLike(commentId: string, userId: string) {
    const existing = await db
      .select({ id: aircraftModelCommentLikesTable.id })
      .from(aircraftModelCommentLikesTable)
      .where(
        and(
          eq(aircraftModelCommentLikesTable.commentId, commentId),
          eq(aircraftModelCommentLikesTable.userId, userId)
        )
      )
      .limit(1);

    let active = false;
    if (existing.length > 0) {
      await db
        .delete(aircraftModelCommentLikesTable)
        .where(eq(aircraftModelCommentLikesTable.id, existing[0].id));
    } else {
      await db.insert(aircraftModelCommentLikesTable).values({
        id: createId("mcomment_like"),
        commentId,
        userId
      });
      active = true;
    }

    await this.syncModelCommentLikeReportCounts(commentId);
    return { active };
  },
  async reportModelComment(input: {
    commentId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    await db
      .insert(aircraftModelCommentReportsTable)
      .values({
        id: createId("mcomment_report"),
        commentId: input.commentId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    await this.syncModelCommentLikeReportCounts(input.commentId);
  },
  async listModelCommentReports(commentId: string) {
    return db
      .select({
        id: aircraftModelCommentReportsTable.id,
        reason: aircraftModelCommentReportsTable.reason,
        imageFileIds: aircraftModelCommentReportsTable.imageFileIds,
        createdAt: aircraftModelCommentReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(aircraftModelCommentReportsTable)
      .innerJoin(usersTable, eq(aircraftModelCommentReportsTable.reporterId, usersTable.id))
      .where(eq(aircraftModelCommentReportsTable.commentId, commentId))
      .orderBy(desc(aircraftModelCommentReportsTable.createdAt));
  },
  async listViewerModelCommentLikes(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({ commentId: aircraftModelCommentLikesTable.commentId })
      .from(aircraftModelCommentLikesTable)
      .where(
        and(
          eq(aircraftModelCommentLikesTable.userId, userId),
          inArray(aircraftModelCommentLikesTable.commentId, commentIds)
        )
      );
  },
  async listViewerModelCommentReports(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({ commentId: aircraftModelCommentReportsTable.commentId })
      .from(aircraftModelCommentReportsTable)
      .where(
        and(
          eq(aircraftModelCommentReportsTable.reporterId, userId),
          inArray(aircraftModelCommentReportsTable.commentId, commentIds)
        )
      );
  },
  async deleteModelCommentThread(modelId: string, commentId: string) {
    const existing = await this.getModelCommentById(commentId);
    if (!existing || existing.modelId !== modelId) {
      return 0;
    }

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .delete(aircraftModelCommentsTable)
      .where(
        and(
          eq(aircraftModelCommentsTable.modelId, modelId),
          or(eq(aircraftModelCommentsTable.id, rootId), eq(aircraftModelCommentsTable.parentCommentId, rootId))
        )
      );

    return 1;
  },
  async reportModel(input: { modelId: string; reporterId: string; reason: string; imageFileIds: string }) {
    await db
      .insert(aircraftModelReportsTable)
      .values({
        id: createId("mreport"),
        modelId: input.modelId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    const totals = await db
      .select({ count: sql<number>`count(*)` })
      .from(aircraftModelReportsTable)
      .where(eq(aircraftModelReportsTable.modelId, input.modelId));

    await db
      .update(aircraftModelsTable)
      .set({
        reportCount: Number(totals[0]?.count ?? 0)
      })
      .where(eq(aircraftModelsTable.id, input.modelId));
  },
  async listModelReports(modelId: string) {
    return db
      .select({
        id: aircraftModelReportsTable.id,
        reason: aircraftModelReportsTable.reason,
        imageFileIds: aircraftModelReportsTable.imageFileIds,
        createdAt: aircraftModelReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(aircraftModelReportsTable)
      .innerJoin(usersTable, eq(aircraftModelReportsTable.reporterId, usersTable.id))
      .where(eq(aircraftModelReportsTable.modelId, modelId))
      .orderBy(desc(aircraftModelReportsTable.createdAt));
  },
  async listViewerModelReports(modelIds: string[], userId: string) {
    if (modelIds.length === 0) {
      return [];
    }

    return db
      .select({ modelId: aircraftModelReportsTable.modelId })
      .from(aircraftModelReportsTable)
      .where(
        and(
          eq(aircraftModelReportsTable.reporterId, userId),
          inArray(aircraftModelReportsTable.modelId, modelIds)
        )
      );
  },
  async delete(id: string) {
    await db.delete(aircraftModelsTable).where(eq(aircraftModelsTable.id, id));
    return true;
  }
};
