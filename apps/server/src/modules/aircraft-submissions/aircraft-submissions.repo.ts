import {
  aircraftSubmissionsTable,
  createId,
  db,
  usersTable
} from "@feijia/db";
import { desc, eq } from "drizzle-orm";

function selection() {
  return {
    id: aircraftSubmissionsTable.id,
    status: aircraftSubmissionsTable.status,
    brandName: aircraftSubmissionsTable.brandName,
    modelName: aircraftSubmissionsTable.modelName,
    aircraftType: aircraftSubmissionsTable.aircraftType,
    powerType: aircraftSubmissionsTable.powerType,
    summary: aircraftSubmissionsTable.summary,
    description: aircraftSubmissionsTable.description,
    coverImageUrl: aircraftSubmissionsTable.coverImageUrl,
    galleryImageUrls: aircraftSubmissionsTable.galleryImageUrls,
    videoUrl: aircraftSubmissionsTable.videoUrl,
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
    }
  };
}

export const aircraftSubmissionsRepo = {
  async create(input: {
    authorId: string;
    status: string;
    brandName: string;
    modelName: string;
    aircraftType: string;
    powerType: string;
    summary: string | null;
    description: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string;
    videoUrl: string | null;
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
      .where(eq(aircraftSubmissionsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listAdmin() {
    return db
      .select(selection())
      .from(aircraftSubmissionsTable)
      .innerJoin(usersTable, eq(aircraftSubmissionsTable.authorId, usersTable.id))
      .orderBy(desc(aircraftSubmissionsTable.updatedAt));
  },
  async updateStatus(id: string, status: string, approvedModelId: string | null) {
    await db
      .update(aircraftSubmissionsTable)
      .set({
        status,
        approvedModelId,
        updatedAt: new Date()
      })
      .where(eq(aircraftSubmissionsTable.id, id));

    return this.findById(id);
  }
};
