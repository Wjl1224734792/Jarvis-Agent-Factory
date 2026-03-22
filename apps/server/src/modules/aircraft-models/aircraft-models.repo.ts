import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  brandsTable,
  createId,
  db
} from "@feijia/db";
import { and, eq, inArray } from "drizzle-orm";

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
      .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id));

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
      .where(eq(aircraftModelsTable.slug, slug))
      .limit(1);

    return items[0] ?? null;
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
      .where(eq(aircraftModelsTable.id, id))
      .limit(1);

    return items[0] ?? null;
  }
};
