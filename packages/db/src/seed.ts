import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  brandsTable,
  postCommentsTable,
  postsTable,
  postReportsTable,
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

  await db
    .insert(usersTable)
    .values({
      id: createId("admin"),
      role: "admin",
      displayName: "系统管理员",
      phone: null,
      account: "admin",
      passwordHash: hashPassword("Admin#123")
    })
    .onConflictDoNothing();
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

    await tx
      .insert(aircraftCategoriesTable)
      .values({
        id: categoryId,
        slug: "drone",
        name: "无人机",
        sortOrder: 1,
        isEnabled: true
      })
      .onConflictDoNothing();

    const persistedCategory = await tx
      .select()
      .from(aircraftCategoriesTable)
      .where(eq(aircraftCategoriesTable.slug, "drone"))
      .limit(1);

    const persistedCategoryId = persistedCategory[0]?.id;

    await tx
      .insert(brandsTable)
      .values({
        id: brandId,
        slug: "dji",
        name: "DJI",
        categoryId: persistedCategoryId ?? null,
        sortOrder: 1,
        isEnabled: true
      })
      .onConflictDoNothing();

    const persistedBrand = await tx
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.slug, "dji"))
      .limit(1);

    const persistedBrandId = persistedBrand[0]?.id;

    if (!persistedCategoryId || !persistedBrandId) {
      return;
    }

    await tx
      .insert(aircraftModelsTable)
      .values({
        id: modelId,
        slug: "mini-4-pro",
        name: "DJI Mini 4 Pro",
        categoryId: persistedCategoryId,
        brandId: persistedBrandId,
        powerType: "electric",
        summary: "轻量级航拍无人机",
        description: "适合轻量化航拍场景",
        maxFlightTimeMinutes: 45,
        maxRangeKilometers: 18,
        maxSpeedKph: 58,
        takeoffWeightGrams: 249,
        isPublished: true
      })
      .onConflictDoNothing();
  });
}

async function ensureCommunitySeed() {
  const authorId = createId("user");
  const commenterId = createId("user");
  const publishedPostId = createId("post");
  const pendingPostId = createId("post");
  const commentId = createId("comment");

  await db.transaction(async (tx) => {
    const existingPost = await tx.select().from(postsTable).limit(1);

    if (existingPost.length > 0) {
      return;
    }

    await tx.insert(usersTable).values([
      {
        id: authorId,
        role: "user",
        displayName: "飞友阿澈",
        phone: "13800138088",
        account: null,
        passwordHash: null
      },
      {
        id: commenterId,
        role: "user",
        displayName: "飞友北斗",
        phone: "13800138089",
        account: null,
        passwordHash: null
      }
    ]);

    const publishedAt = new Date();

    await tx.insert(postsTable).values([
      {
        id: publishedPostId,
        authorId,
        title: "海边试飞日志",
        content: "今天在海边试飞，侧风偏大，但返航和悬停都很稳。",
        status: "published",
        commentCount: 1,
        reportCount: 0,
        publishedAt
      },
      {
        id: pendingPostId,
        authorId: commenterId,
        title: "周末练习计划",
        content: "准备周末去空旷草地继续练习绕点飞行。",
        status: "pending",
        commentCount: 0,
        reportCount: 0,
        publishedAt: null
      }
    ]);

    await tx.insert(postCommentsTable).values({
      id: commentId,
      postId: publishedPostId,
      authorId: commenterId,
      parentCommentId: null,
      content: "这条经验很实用，下次我也试试海边风场。",
      status: "visible"
    });
  });
}

export async function resetDatabaseState() {
  await db.execute(
    sql.raw(
      'TRUNCATE TABLE "post_reports", "post_comments", "posts", "aircraft_reviews", "aircraft_models", "brands", "aircraft_categories", "sessions", "users" RESTART IDENTITY CASCADE;'
    )
  );
}

export async function seedAuthDatabase() {
  await ensureAdminUser();
}

export async function seedDatabase() {
  await seedAuthDatabase();
  await ensureAircraftSeed();
  await ensureCommunitySeed();
}
