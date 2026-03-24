import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  brandsTable,
  db
} from "@feijia/db";
import { asc, eq, sql } from "drizzle-orm";

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
      .innerJoin(
        aircraftCategoriesTable,
        eq(aircraftModelsTable.categoryId, aircraftCategoriesTable.id)
      )
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
  }
};
