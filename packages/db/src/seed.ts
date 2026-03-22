import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  brandsTable,
  sessionsTable,
  usersTable
} from "./schema.js";
import { createId, hashPassword } from "./helpers.js";

async function ensureAdminUser() {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.account, "admin"))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(usersTable).values({
    id: createId("admin"),
    role: "admin",
    displayName: "系统管理员",
    phone: null,
    account: "admin",
    passwordHash: hashPassword("Admin#123")
  });
}

async function ensureAircraftSeed() {
  const categoryId = createId("cat");
  const brandId = createId("brand");
  const modelId = createId("model");

  await db.transaction(async (tx) => {
    const model = await tx
      .select()
      .from(aircraftModelsTable)
      .where(eq(aircraftModelsTable.slug, "mini-4-pro"))
      .limit(1);

    if (model.length > 0) {
      return;
    }

    await tx.insert(aircraftCategoriesTable).values({
      id: categoryId,
      slug: "drone",
      name: "无人机",
      sortOrder: 1,
      isEnabled: true
    });

    await tx.insert(brandsTable).values({
      id: brandId,
      slug: "dji",
      name: "DJI",
      categoryId,
      sortOrder: 1,
      isEnabled: true
    });

    await tx.insert(aircraftModelsTable).values({
      id: modelId,
      slug: "mini-4-pro",
      name: "DJI Mini 4 Pro",
      categoryId,
      brandId,
      powerType: "electric",
      summary: "轻量级航拍无人机",
      description: "适合轻量化航拍场景",
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 18,
      maxSpeedKph: 58,
      takeoffWeightGrams: 249,
      isPublished: true
    });
  });
}

export async function resetDatabaseState() {
  await db.execute(
    sql.raw(
      'TRUNCATE TABLE "aircraft_models", "brands", "aircraft_categories", "sessions", "users" RESTART IDENTITY CASCADE;'
    )
  );
}

export async function seedAuthDatabase() {
  await ensureAdminUser();
}

export async function seedDatabase() {
  await seedAuthDatabase();
  await ensureAircraftSeed();
}
