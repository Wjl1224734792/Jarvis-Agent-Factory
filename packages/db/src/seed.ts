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
  const category = await db
    .select()
    .from(aircraftCategoriesTable)
    .where(eq(aircraftCategoriesTable.slug, "drone"))
    .limit(1);

  let categoryId = category[0]?.id;

  if (!categoryId) {
    categoryId = createId("cat");
    await db.insert(aircraftCategoriesTable).values({
      id: categoryId,
      slug: "drone",
      name: "无人机",
      sortOrder: 1,
      isEnabled: true
    });

    const insertedCategory = await db
      .select()
      .from(aircraftCategoriesTable)
      .where(eq(aircraftCategoriesTable.slug, "drone"))
      .limit(1);

    categoryId = insertedCategory[0]?.id;
  }

  const brand = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.slug, "dji"))
    .limit(1);

  let brandId = brand[0]?.id;

  if (!brandId) {
    brandId = createId("brand");
    await db.insert(brandsTable).values({
      id: brandId,
      slug: "dji",
      name: "DJI",
      categoryId,
      sortOrder: 1,
      isEnabled: true
    });

    const insertedBrand = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.slug, "dji"))
      .limit(1);

    brandId = insertedBrand[0]?.id;
  }

  const model = await db
    .select()
    .from(aircraftModelsTable)
    .where(eq(aircraftModelsTable.slug, "mini-4-pro"))
    .limit(1);

  if (model.length === 0) {
    await db.insert(aircraftModelsTable).values({
      id: createId("model"),
      slug: "mini-4-pro",
      name: "DJI Mini 4 Pro",
      categoryId,
      brandId,
      powerType: "electric",
      summary: "轻量级航拍无人机",
      isPublished: true
    });
  }
}

export async function resetDatabaseState() {
  await db.execute(
    sql.raw(
      'TRUNCATE TABLE "aircraft_models", "brands", "aircraft_categories", "sessions", "users" RESTART IDENTITY CASCADE;'
    )
  );
}

export async function seedDatabase() {
  await ensureAdminUser();
  await ensureAircraftSeed();
}
