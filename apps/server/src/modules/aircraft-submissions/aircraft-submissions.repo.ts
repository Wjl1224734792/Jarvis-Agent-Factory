import {
  aircraftCategoriesTable,
  aircraftSubmissionsTable,
  brandsTable,
  createId,
  db,
  videoAssetsTable,
  usersTable
} from "@feijia/db";
import { and, desc, eq, sql } from "drizzle-orm";

function selection() {
  return {
    id: aircraftSubmissionsTable.id,
    status: aircraftSubmissionsTable.status,
    categoryId: aircraftSubmissionsTable.categoryId,
    brandId: aircraftSubmissionsTable.brandId,
    proposedBrandName: aircraftSubmissionsTable.proposedBrandName,
    modelName: aircraftSubmissionsTable.modelName,
    powerType: aircraftSubmissionsTable.powerType,
    summary: aircraftSubmissionsTable.summary,
    description: aircraftSubmissionsTable.description,
    coverImageUrl: aircraftSubmissionsTable.coverImageUrl,
    galleryImageUrls: aircraftSubmissionsTable.galleryImageUrls,
    videoAsset: {
      id: videoAssetsTable.id,
      url: videoAssetsTable.dataUrl,
      fileName: videoAssetsTable.fileName,
      mimeType: videoAssetsTable.mimeType,
      byteSize: videoAssetsTable.byteSize
    },
    approvedModelId: aircraftSubmissionsTable.approvedModelId,
    maxFlightTimeMinutes: aircraftSubmissionsTable.maxFlightTimeMinutes,
    maxRangeKilometers: aircraftSubmissionsTable.maxRangeKilometers,
    maxSpeedKph: aircraftSubmissionsTable.maxSpeedKph,
    takeoffWeightGrams: aircraftSubmissionsTable.takeoffWeightGrams,
    createdAt: aircraftSubmissionsTable.createdAt,
    updatedAt: aircraftSubmissionsTable.updatedAt,
    author: {
      id: usersTable.id,
      displayName: usersTable.displayName,
      role: usersTable.role
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
  };
}

export const aircraftSubmissionsRepo = {
  async getOwnedVideoAsset(ownerId: string, videoAssetId: string) {
    const rows = await db
      .select({
        id: videoAssetsTable.id
      })
      .from(videoAssetsTable)
      .where(
        and(
          eq(videoAssetsTable.id, videoAssetId),
          eq(videoAssetsTable.ownerId, ownerId),
          sql`${videoAssetsTable.postId} is null`
        )
      )
      .limit(1);
    return rows[0] ?? null;
  },
  async create(input: {
    authorId: string;
    status: string;
    categoryId: string;
    brandId: string | null;
    proposedBrandName: string | null;
    modelName: string;
    powerType: string;
    summary: string | null;
    description: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string;
    videoAssetId: string | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
    approvedModelId: string | null;
  }) {
    const id = createId("submit");
    await db.insert(aircraftSubmissionsTable).values({
      id,
      ...input
    });

    return this.findById(id);
  },
  async findById(id: string) {
    const rows = await db
      .select(selection())
      .from(aircraftSubmissionsTable)
      .innerJoin(usersTable, eq(aircraftSubmissionsTable.authorId, usersTable.id))
      .innerJoin(
        aircraftCategoriesTable,
        eq(aircraftSubmissionsTable.categoryId, aircraftCategoriesTable.id)
      )
      .leftJoin(brandsTable, eq(aircraftSubmissionsTable.brandId, brandsTable.id))
      .leftJoin(videoAssetsTable, eq(aircraftSubmissionsTable.videoAssetId, videoAssetsTable.id))
      .where(eq(aircraftSubmissionsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listAdmin() {
    return db
      .select(selection())
      .from(aircraftSubmissionsTable)
      .innerJoin(usersTable, eq(aircraftSubmissionsTable.authorId, usersTable.id))
      .innerJoin(
        aircraftCategoriesTable,
        eq(aircraftSubmissionsTable.categoryId, aircraftCategoriesTable.id)
      )
      .leftJoin(brandsTable, eq(aircraftSubmissionsTable.brandId, brandsTable.id))
      .leftJoin(videoAssetsTable, eq(aircraftSubmissionsTable.videoAssetId, videoAssetsTable.id))
      .orderBy(desc(aircraftSubmissionsTable.updatedAt));
  },
  async updateStatusOnly(id: string, status: string) {
    await db
      .update(aircraftSubmissionsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(aircraftSubmissionsTable.id, id));

    return this.findById(id);
  },
  async approveSubmission(id: string, approvedModelId: string, brandId: string | null) {
    await db
      .update(aircraftSubmissionsTable)
      .set({
        status: "approved",
        approvedModelId,
        brandId,
        updatedAt: new Date()
      })
      .where(eq(aircraftSubmissionsTable.id, id));

    return this.findById(id);
  }
};
