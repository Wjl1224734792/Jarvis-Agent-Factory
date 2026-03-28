import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  brandsTable,
  createId,
  db
} from "@feijia/db";
import { and, eq, inArray, sql } from "drizzle-orm";

type ListFilters = {
  categorySlug?: string;
  brandSlug?: string;
  powerTypes?: string[];
};

export const aircraftModelsRepo = {
  async list(filters: ListFilters) {
    const conditions = [];

    if (filters.categorySlug) {
      conditions.push(eq(aircraftCategoriesTable.slug, filters.categorySlug));
    }

    if (filters.brandSlug) {
      conditions.push(eq(brandsTable.slug, filters.brandSlug));
    }

    if (filters.powerTypes?.length) {
      conditions.push(inArray(aircraftModelsTable.powerType, filters.powerTypes));
    }

    const query = db
      .select({
        id: aircraftModelsTable.id,
        slug: aircraftModelsTable.slug,
        name: aircraftModelsTable.name,
        summary: aircraftModelsTable.summary,
        powerType: aircraftModelsTable.powerType,
        reviewSummary: {
          totalReviews: sql<number>`cast(coalesce(count(case when ${aircraftReviewsTable.status} = 'visible' then 1 end), 0) as int)`
        },
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
        powerType: aircraftModelsTable.powerType,
        isPublished: aircraftModelsTable.isPublished,
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
          name: brandsTable.name
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
    powerType: string;
    summary: string | null;
    description: string | null;
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
      powerType: input.powerType,
      summary: input.summary,
      description: input.description,
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
      powerType: string;
      summary: string | null;
      description: string | null;
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
        powerType: input.powerType,
        summary: input.summary,
        description: input.description,
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
        powerType: aircraftModelsTable.powerType,
        isPublished: aircraftModelsTable.isPublished,
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
          name: brandsTable.name
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
  }
};
