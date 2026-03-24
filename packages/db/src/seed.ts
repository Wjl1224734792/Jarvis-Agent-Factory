import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  brandsTable,
  postCommentsTable,
  postsTable,
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
  const categorySeeds = [
    { slug: "drone", name: "无人机", sortOrder: 1 },
    { slug: "evtol", name: "eVTOL", sortOrder: 2 },
    { slug: "helicopter", name: "直升机", sortOrder: 3 },
    { slug: "business-jet", name: "公务机", sortOrder: 4 }
  ] as const;
  const brandSeeds = [
    { slug: "dji", name: "DJI", categorySlug: "drone", sortOrder: 1 },
    { slug: "autel", name: "Autel", categorySlug: "drone", sortOrder: 2 },
    { slug: "ehang", name: "EHang", categorySlug: "evtol", sortOrder: 3 },
    { slug: "joby", name: "Joby", categorySlug: "evtol", sortOrder: 4 },
    { slug: "robinson", name: "Robinson", categorySlug: "helicopter", sortOrder: 5 },
    { slug: "cirrus", name: "Cirrus", categorySlug: "business-jet", sortOrder: 6 }
  ] as const;
  const modelSeeds = [
    {
      slug: "mini-4-pro",
      name: "DJI Mini 4 Pro",
      categorySlug: "drone",
      brandSlug: "dji",
      powerType: "electric",
      summary: "轻量级航拍无人机，适合城市记录与旅拍。",
      description: "便携机身配合成熟避障与跟拍能力，适合需要高频带出门的飞友。",
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 18,
      maxSpeedKph: 58,
      takeoffWeightGrams: 249
    },
    {
      slug: "mavic-3-pro",
      name: "DJI Mavic 3 Pro",
      categorySlug: "drone",
      brandSlug: "dji",
      powerType: "electric",
      summary: "多摄旗舰航拍机型，兼顾画质、续航与专业创作。",
      description: "适合追求镜头覆盖和后期空间的用户，是高强度内容创作的常见主力机。",
      maxFlightTimeMinutes: 43,
      maxRangeKilometers: 28,
      maxSpeedKph: 75,
      takeoffWeightGrams: 958
    },
    {
      slug: "evo-lite-plus",
      name: "Autel EVO Lite+",
      categorySlug: "drone",
      brandSlug: "autel",
      powerType: "electric",
      summary: "强调夜景与长续航的消费级无人机。",
      description: "更适合看重色彩和续航平衡的用户，属于稳扎稳打的高可用机型。",
      maxFlightTimeMinutes: 40,
      maxRangeKilometers: 24,
      maxSpeedKph: 68,
      takeoffWeightGrams: 835
    },
    {
      slug: "eh216-s",
      name: "EHang EH216-S",
      categorySlug: "evtol",
      brandSlug: "ehang",
      powerType: "electric",
      summary: "双座自动驾驶载人飞行器，聚焦低空通勤试点。",
      description: "是当前低空经济讨论度极高的 eVTOL 之一，更偏向城市短途试运营场景。",
      maxFlightTimeMinutes: 25,
      maxRangeKilometers: 35,
      maxSpeedKph: 130,
      takeoffWeightGrams: null
    },
    {
      slug: "joby-s4",
      name: "Joby S4",
      categorySlug: "evtol",
      brandSlug: "joby",
      powerType: "electric",
      summary: "聚焦商业化低空出行的五座 eVTOL 方案。",
      description: "适合长期观察低空商业化路线的用户，目前公开口碑还在持续积累中。",
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 240,
      maxSpeedKph: 320,
      takeoffWeightGrams: null
    },
    {
      slug: "r44-raven-ii",
      name: "Robinson R44 Raven II",
      categorySlug: "helicopter",
      brandSlug: "robinson",
      powerType: "fuel",
      summary: "经典轻型直升机，训练与通航场景都很常见。",
      description: "长期活跃在通航训练与巡检场景，是理解传统旋翼机口碑的常见样本。",
      maxFlightTimeMinutes: 180,
      maxRangeKilometers: 560,
      maxSpeedKph: 240,
      takeoffWeightGrams: null
    },
    {
      slug: "vision-jet-g2-plus",
      name: "Cirrus Vision Jet G2+",
      categorySlug: "business-jet",
      brandSlug: "cirrus",
      powerType: "fuel",
      summary: "单发轻型公务机，强调个人航空体验与易上手。",
      description: "适合把固定翼个人航空纳入对比视野的用户，是低空出行之外的现实参考样本。",
      maxFlightTimeMinutes: 300,
      maxRangeKilometers: 2300,
      maxSpeedKph: 576,
      takeoffWeightGrams: null
    }
  ] as const;

  await db.transaction(async (tx) => {
    const existingModel = await tx
      .select()
      .from(aircraftModelsTable)
      .where(eq(aircraftModelsTable.slug, "mini-4-pro"))
      .limit(1);

    if (existingModel.length > 0) {
      return;
    }

    await tx
      .insert(aircraftCategoriesTable)
      .values(
        categorySeeds.map((item) => ({
          id: createId("cat"),
          slug: item.slug,
          name: item.name,
          sortOrder: item.sortOrder,
          isEnabled: true
        }))
      )
      .onConflictDoNothing();

    const persistedCategories = await tx
      .select()
      .from(aircraftCategoriesTable)
      .where(inArray(aircraftCategoriesTable.slug, categorySeeds.map((item) => item.slug)));
    const categoryIdBySlug = new Map(
      persistedCategories.map((item) => [item.slug, item.id])
    );

    await tx
      .insert(brandsTable)
      .values(
        brandSeeds.map((item) => ({
          id: createId("brand"),
          slug: item.slug,
          name: item.name,
          categoryId: categoryIdBySlug.get(item.categorySlug) ?? null,
          sortOrder: item.sortOrder,
          isEnabled: true
        }))
      )
      .onConflictDoNothing();

    const persistedBrands = await tx
      .select()
      .from(brandsTable)
      .where(inArray(brandsTable.slug, brandSeeds.map((item) => item.slug)));
    const brandIdBySlug = new Map(persistedBrands.map((item) => [item.slug, item.id]));

    await tx
      .insert(aircraftModelsTable)
      .values(
        modelSeeds.map((item) => ({
          id: createId("model"),
          slug: item.slug,
          name: item.name,
          categoryId: categoryIdBySlug.get(item.categorySlug)!,
          brandId: brandIdBySlug.get(item.brandSlug)!,
          powerType: item.powerType,
          summary: item.summary,
          description: item.description,
          maxFlightTimeMinutes: item.maxFlightTimeMinutes,
          maxRangeKilometers: item.maxRangeKilometers,
          maxSpeedKph: item.maxSpeedKph,
          takeoffWeightGrams: item.takeoffWeightGrams,
          isPublished: true
        }))
      )
      .onConflictDoNothing();
  });
}

async function ensureAircraftReviewSeed() {
  const reviewUserSeeds = [
    { phone: "13800138101", displayName: "飞友星野" },
    { phone: "13800138102", displayName: "飞友海岚" },
    { phone: "13800138103", displayName: "飞友洛川" },
    { phone: "13800138104", displayName: "飞友白帆" },
    { phone: "13800138105", displayName: "飞友向北" },
    { phone: "13800138106", displayName: "飞友南栀" }
  ] as const;
  const reviewSeeds = [
    { modelSlug: "mini-4-pro", userPhone: "13800138101", rating: 5, content: "轻巧稳定，旅拍几乎没有带出门负担。" },
    { modelSlug: "mini-4-pro", userPhone: "13800138102", rating: 5, content: "跟拍和避障成熟，属于安心上手的类型。" },
    { modelSlug: "mini-4-pro", userPhone: "13800138103", rating: 4, content: "风大时还是要保守一些，但总体很稳。" },
    { modelSlug: "mavic-3-pro", userPhone: "13800138101", rating: 5, content: "画质和镜头覆盖都很强，商业拍摄很省心。" },
    { modelSlug: "mavic-3-pro", userPhone: "13800138103", rating: 5, content: "综合体验几乎拉满，尤其适合高频内容产出。" },
    { modelSlug: "mavic-3-pro", userPhone: "13800138104", rating: 5, content: "多镜头切换带来的容错率非常高。" },
    { modelSlug: "mavic-3-pro", userPhone: "13800138106", rating: 4, content: "机身不算轻，但专业能力确实强。" },
    { modelSlug: "evo-lite-plus", userPhone: "13800138102", rating: 4, content: "续航和画质平衡不错，属于稳妥选择。" },
    { modelSlug: "evo-lite-plus", userPhone: "13800138105", rating: 4, content: "夜景表现在线，适合不想盲从大牌的用户。" },
    { modelSlug: "evo-lite-plus", userPhone: "13800138106", rating: 4, content: "没有明显短板，整体完成度比较均衡。" },
    { modelSlug: "eh216-s", userPhone: "13800138103", rating: 5, content: "低空通勤想象力很强，话题性拉满。" },
    { modelSlug: "eh216-s", userPhone: "13800138104", rating: 4, content: "更像是行业样本机，值得持续关注试点进展。" },
    { modelSlug: "eh216-s", userPhone: "13800138105", rating: 4, content: "目前看更适合关注趋势的人，而不是只看消费体验。" },
    { modelSlug: "r44-raven-ii", userPhone: "13800138104", rating: 4, content: "传统通航里很有代表性，维护生态成熟。" },
    { modelSlug: "r44-raven-ii", userPhone: "13800138105", rating: 3, content: "体验扎实，但噪音和舒适性并不轻松。" },
    { modelSlug: "vision-jet-g2-plus", userPhone: "13800138106", rating: 4, content: "个人航空体验很完整，但成本门槛确实高。" }
  ] as const;

  const existingReview = await db.select().from(aircraftReviewsTable).limit(1);

  if (existingReview.length > 0) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(usersTable)
      .values(
        reviewUserSeeds.map((item) => ({
          id: createId("user"),
          role: "user",
          displayName: item.displayName,
          phone: item.phone,
          account: null,
          passwordHash: null
        }))
      )
      .onConflictDoNothing();

    const persistedUsers = await tx
      .select()
      .from(usersTable)
      .where(inArray(usersTable.phone, reviewUserSeeds.map((item) => item.phone)));
    const userIdByPhone = new Map(persistedUsers.map((item) => [item.phone, item.id]));

    const modelSlugs = Array.from(new Set(reviewSeeds.map((item) => item.modelSlug)));
    const persistedModels = await tx
      .select()
      .from(aircraftModelsTable)
      .where(inArray(aircraftModelsTable.slug, modelSlugs));
    const modelIdBySlug = new Map(persistedModels.map((item) => [item.slug, item.id]));

    await tx.insert(aircraftReviewsTable).values(
      reviewSeeds.map((item, index) => ({
        id: createId("review"),
        modelId: modelIdBySlug.get(item.modelSlug)!,
        userId: userIdByPhone.get(item.userPhone)!,
        rating: item.rating,
        content: item.content,
        status: "visible",
        createdAt: new Date(Date.UTC(2026, 2, 20, 8, index, 0)),
        updatedAt: new Date(Date.UTC(2026, 2, 20, 12, index, 0))
      }))
    );
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
      'TRUNCATE TABLE "notifications", "post_interactions", "user_follows", "post_images", "post_reports", "post_comments", "posts", "aircraft_reviews", "aircraft_models", "brands", "aircraft_categories", "sessions", "users" RESTART IDENTITY CASCADE;'
    )
  );
}

export async function seedAuthDatabase() {
  await ensureAdminUser();
}

export async function seedDatabase() {
  await seedAuthDatabase();
  await ensureAircraftSeed();
  await ensureAircraftReviewSeed();
  await ensureCommunitySeed();
}
