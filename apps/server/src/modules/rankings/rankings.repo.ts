import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  brandsTable,
  createId,
  db,
  rankingCommentsTable,
  rankingItemCommentsTable,
  rankingItemRatingsTable,
  rankingItemsTable,
  rankingsTable,
  usersTable
} from "@feijia/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

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
        title: rankingsTable.title,
        description: rankingsTable.description,
        coverImageUrl: rankingsTable.coverImageUrl,
        commentCount: rankingsTable.commentCount,
        createdAt: rankingsTable.createdAt,
        updatedAt: rankingsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
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
        title: rankingsTable.title,
        description: rankingsTable.description,
        coverImageUrl: rankingsTable.coverImageUrl,
        commentCount: rankingsTable.commentCount,
        createdAt: rankingsTable.createdAt,
        updatedAt: rankingsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
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
    title: string;
    description: string;
    coverImageUrl: string | null;
  }) {
    const id = createId("ranking");
    await db.insert(rankingsTable).values({
      id,
      authorId: input.authorId,
      type: "community",
      title: input.title,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      commentCount: 0
    });

    return this.getRankingById(id);
  },
  async createRankingItems(
    rankingId: string,
    items: Array<{
      rank: number;
      title: string;
      summary: string | null;
      imageUrl: string | null;
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
        rank: item.rank,
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        brandName: item.brandName,
        linkedModelId: item.linkedModelId,
        commentCount: 0
      }))
    );
  },
  async listRankingItems(rankingId: string) {
    return db
      .select({
        id: rankingItemsTable.id,
        rankingId: rankingItemsTable.rankingId,
        rank: rankingItemsTable.rank,
        title: rankingItemsTable.title,
        summary: rankingItemsTable.summary,
        imageUrl: rankingItemsTable.imageUrl,
        brandName: rankingItemsTable.brandName,
        commentCount: rankingItemsTable.commentCount,
        linkedModel: {
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
        }
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
        rank: rankingItemsTable.rank,
        title: rankingItemsTable.title,
        summary: rankingItemsTable.summary,
        imageUrl: rankingItemsTable.imageUrl,
        brandName: rankingItemsTable.brandName,
        commentCount: rankingItemsTable.commentCount,
        linkedModel: {
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
        }
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
      .where(and(eq(rankingItemRatingsTable.userId, userId), inArray(rankingItemRatingsTable.rankingItemId, rankingItemIds)));
  },
  async upsertRankingItemRating(input: {
    rankingItemId: string;
    userId: string;
    rating: number;
  }) {
    const existing = await db
      .select({ id: rankingItemRatingsTable.id })
      .from(rankingItemRatingsTable)
      .where(and(eq(rankingItemRatingsTable.rankingItemId, input.rankingItemId), eq(rankingItemRatingsTable.userId, input.userId)))
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
  async listRankingComments(rankingId: string) {
    return db
      .select({
        id: rankingCommentsTable.id,
        rankingId: rankingCommentsTable.rankingId,
        content: rankingCommentsTable.content,
        createdAt: rankingCommentsTable.createdAt,
        updatedAt: rankingCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
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
      content: input.content
    });

    await this.syncRankingCommentCount(input.rankingId);
    return this.listRankingComments(input.rankingId).then((items) => items.at(-1) ?? null);
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
  async listRankingItemComments(rankingItemId: string) {
    return db
      .select({
        id: rankingItemCommentsTable.id,
        rankingItemId: rankingItemCommentsTable.rankingItemId,
        content: rankingItemCommentsTable.content,
        createdAt: rankingItemCommentsTable.createdAt,
        updatedAt: rankingItemCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          role: usersTable.role
        }
      })
      .from(rankingItemCommentsTable)
      .innerJoin(usersTable, eq(rankingItemCommentsTable.authorId, usersTable.id))
      .where(eq(rankingItemCommentsTable.rankingItemId, rankingItemId))
      .orderBy(asc(rankingItemCommentsTable.createdAt));
  },
  async createRankingItemComment(input: {
    rankingItemId: string;
    authorId: string;
    content: string;
  }) {
    await db.insert(rankingItemCommentsTable).values({
      id: createId("ricom"),
      rankingItemId: input.rankingItemId,
      authorId: input.authorId,
      content: input.content
    });

    await this.syncRankingItemCommentCount(input.rankingItemId);
    return this.listRankingItemComments(input.rankingItemId).then((items) => items.at(-1) ?? null);
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
  }
};
