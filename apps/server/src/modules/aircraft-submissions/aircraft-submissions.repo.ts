import {
  aircraftCategoriesTable,
  aircraftSubmissionsTable,
  brandsTable,
  createId,
  db,
  usersTable
} from "@feijia/db";
import { desc, eq } from "drizzle-orm";
import { uploadsRepo } from "../uploads/upload.repo";

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
    coverImageFileId: aircraftSubmissionsTable.coverImageFileId,
    galleryImageFileIds: aircraftSubmissionsTable.galleryImageFileIds,
    videoFileId: aircraftSubmissionsTable.videoFileId,
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
  async getOwnedVideoAsset(ownerId: string, videoFileId: string) {
    const file = await uploadsRepo.getOwnedFileById(ownerId, videoFileId);
    return file?.mediaKind === "video" ? file : null;
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
    coverImageFileId: string | null;
    galleryImageFileIds: string;
    videoFileId: string | null;
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
