import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  aircraftSubmissionsTable,
  brandsTable,
  contentCategoriesTable,
  postCommentsTable,
  postsTable,
  rankingCommentsTable,
  rankingItemCommentsTable,
  rankingItemRatingsTable,
  rankingItemsTable,
  rankingsTable,
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
    displayName: "System Admin",
    phone: null,
    account: "admin",
    passwordHash: hashPassword("Admin#123")
  });
}

async function seedContentCategories() {
  const seeds = [
    { slug: "news", name: "News", sortOrder: 1 },
    { slug: "review", name: "Review", sortOrder: 2 },
    { slug: "aerial", name: "Aerial", sortOrder: 3 },
    { slug: "tech", name: "Tech", sortOrder: 4 },
    { slug: "guide", name: "Guide", sortOrder: 5 }
  ] as const;

  const existing = await db.select().from(contentCategoriesTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  await db.insert(contentCategoriesTable).values(
    seeds.map((item) => ({
      id: createId("ccat"),
      slug: item.slug,
      name: item.name,
      sortOrder: item.sortOrder,
      isEnabled: true
    }))
  );
}

async function seedAircraftCatalog() {
  const categorySeeds = [
    { slug: "drone", name: "Drone", sortOrder: 1 },
    { slug: "evtol", name: "eVTOL", sortOrder: 2 },
    { slug: "helicopter", name: "Helicopter", sortOrder: 3 },
    { slug: "business-jet", name: "Business Jet", sortOrder: 4 }
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
      summary: "Compact and stable flight model.",
      description: "Suitable for travel and everyday aerial shooting.",
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
      summary: "Multi-lens flagship for commercial workflows.",
      description: "High-end model for demanding image capture.",
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
      summary: "Balanced image quality and endurance.",
      description: "Good low-light and stable handling.",
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
      summary: "Representative urban eVTOL sample.",
      description: "Used as low-altitude mobility benchmark data.",
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
      summary: "Commercial-route eVTOL reference.",
      description: "Long-term tracking target for eVTOL progress.",
      maxFlightTimeMinutes: 45,
      maxRangeKilometers: 240,
      maxSpeedKph: 320,
      takeoffWeightGrams: null
    },
    {
      slug: "vision-jet-g2-plus",
      name: "Cirrus Vision Jet G2+",
      categorySlug: "business-jet",
      brandSlug: "cirrus",
      powerType: "fuel",
      summary: "General aviation personal jet sample.",
      description: "Cross-category baseline for low-altitude transport.",
      maxFlightTimeMinutes: 300,
      maxRangeKilometers: 2300,
      maxSpeedKph: 576,
      takeoffWeightGrams: null
    }
  ] as const;

  const existing = await db.select().from(aircraftModelsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  await db
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

  const categories = await db
    .select()
    .from(aircraftCategoriesTable)
    .where(inArray(aircraftCategoriesTable.slug, categorySeeds.map((item) => item.slug)));
  const categoryIdBySlug = new Map(categories.map((item) => [item.slug, item.id]));

  await db
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

  const brands = await db
    .select()
    .from(brandsTable)
    .where(inArray(brandsTable.slug, brandSeeds.map((item) => item.slug)));
  const brandIdBySlug = new Map(brands.map((item) => [item.slug, item.id]));

  await db
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
}

async function seedUsersAndReviews() {
  const existing = await db.select().from(aircraftReviewsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  const userSeeds = [
    { phone: "13800138101", displayName: "Pilot One" },
    { phone: "13800138102", displayName: "Pilot Two" },
    { phone: "13800138103", displayName: "Pilot Three" },
    { phone: "13800138104", displayName: "Pilot Four" },
    { phone: "13800138105", displayName: "Pilot Five" },
    { phone: "13800138106", displayName: "Pilot Six" }
  ] as const;

  await db
    .insert(usersTable)
    .values(
      userSeeds.map((item) => ({
        id: createId("user"),
        role: "user",
        displayName: item.displayName,
        phone: item.phone,
        account: null,
        passwordHash: null
      }))
    )
    .onConflictDoNothing();

  const users = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.phone, userSeeds.map((item) => item.phone)));
  const userIdByPhone = new Map(users.map((item) => [item.phone, item.id]));

  const models = await db.select().from(aircraftModelsTable);
  const modelIdBySlug = new Map(models.map((item) => [item.slug, item.id]));

  const reviewSeeds = [
    ["mini-4-pro", "13800138101", "Lightweight and very stable."],
    ["mini-4-pro", "13800138102", "Good for beginners."],
    ["mavic-3-pro", "13800138103", "Great for commercial output."],
    ["mavic-3-pro", "13800138104", "Top overall performance."],
    ["evo-lite-plus", "13800138105", "Solid all-around option."],
    ["eh216-s", "13800138106", "Interesting low-altitude mobility sample."],
    ["joby-s4", "13800138101", "Most mature engineering route."],
    ["vision-jet-g2-plus", "13800138102", "Great personal jet experience."]
  ] as const;

  await db
    .insert(aircraftReviewsTable)
    .values(
      reviewSeeds.map(([slug, phone, content], index) => ({
        id: createId("review"),
        modelId: modelIdBySlug.get(slug)!,
        userId: userIdByPhone.get(phone)!,
        rating: null,
        content,
        status: "visible",
        createdAt: new Date(Date.UTC(2026, 2, 20, 8, index, 0)),
        updatedAt: new Date(Date.UTC(2026, 2, 20, 12, index, 0))
      }))
    )
    .onConflictDoNothing();
}

async function seedPostsAndComments() {
  const existing = await db.select().from(postsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  const articleAuthorId = createId("user");
  const momentAuthorId = createId("user");
  const commenterId = createId("user");

  await db
    .insert(usersTable)
    .values([
      {
        id: articleAuthorId,
        role: "user",
        displayName: "Author 8007",
        phone: "13800138087",
        account: null,
        passwordHash: null
      },
      {
        id: momentAuthorId,
        role: "user",
        displayName: "Moment Author",
        phone: "13800138088",
        account: null,
        passwordHash: null
      },
      {
        id: commenterId,
        role: "user",
        displayName: "Comment Pilot",
        phone: "13800138089",
        account: null,
        passwordHash: null
      }
    ])
    .onConflictDoNothing();

  const categories = await db.select().from(contentCategoriesTable);
  const categoryIdBySlug = new Map(categories.map((item) => [item.slug, item.id]));

  const articleOneId = createId("post");
  const articleTwoId = createId("post");
  const momentOneId = createId("post");
  const momentTwoId = createId("post");
  const rootCommentId = createId("comment");
  const replyCommentId = createId("comment");

  await db.insert(postsTable).values([
    {
      id: articleOneId,
      authorId: articleAuthorId,
      type: "article",
      title: "2026 eVTOL aerodynamic snapshot",
      content: "A concise summary of current eVTOL aerodynamic updates.",
      contentHtml: "<p>A concise summary of current eVTOL aerodynamic updates.</p>",
      contentPlainText: "A concise summary of current eVTOL aerodynamic updates.",
      contentCategoryId: categoryIdBySlug.get("news") ?? null,
      status: "published",
      commentCount: 2,
      reportCount: 0,
      likeCount: 1200,
      favoriteCount: 234,
      shareCount: 86,
      publishedAt: new Date(Date.UTC(2026, 2, 24, 10, 0, 0))
    },
    {
      id: articleTwoId,
      authorId: articleAuthorId,
      type: "article",
      title: "High-altitude drone checklist",
      content: "Five practical checks before high-altitude flights.",
      contentHtml: "<p>Five practical checks before high-altitude flights.</p>",
      contentPlainText: "Five practical checks before high-altitude flights.",
      contentCategoryId: categoryIdBySlug.get("guide") ?? null,
      status: "published",
      commentCount: 0,
      reportCount: 0,
      likeCount: 3500,
      favoriteCount: 1100,
      shareCount: 412,
      publishedAt: new Date(Date.UTC(2026, 2, 23, 9, 0, 0))
    },
    {
      id: momentOneId,
      authorId: momentAuthorId,
      type: "moment",
      title: "Coastline test log",
      content: "Wind was stronger than expected but return-to-home stayed stable.",
      contentHtml: null,
      contentPlainText: "Wind was stronger than expected but return-to-home stayed stable.",
      contentCategoryId: null,
      status: "published",
      commentCount: 0,
      reportCount: 0,
      likeCount: 32,
      favoriteCount: 5,
      shareCount: 2,
      publishedAt: new Date(Date.UTC(2026, 2, 25, 6, 0, 0))
    },
    {
      id: momentTwoId,
      authorId: momentAuthorId,
      type: "moment",
      title: "Valley wind note",
      content: "Reserve extra height before final descent in crosswind valleys.",
      contentHtml: null,
      contentPlainText: "Reserve extra height before final descent in crosswind valleys.",
      contentCategoryId: null,
      status: "published",
      commentCount: 0,
      reportCount: 0,
      likeCount: 18,
      favoriteCount: 3,
      shareCount: 1,
      publishedAt: new Date(Date.UTC(2026, 2, 24, 14, 0, 0))
    }
  ]);

  await db.insert(postCommentsTable).values([
    {
      id: rootCommentId,
      postId: articleOneId,
      authorId: commenterId,
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      content: "Useful overview and clear structure.",
      status: "visible"
    },
    {
      id: replyCommentId,
      postId: articleOneId,
      authorId: articleAuthorId,
      parentCommentId: rootCommentId,
      replyToCommentId: rootCommentId,
      replyToUserId: commenterId,
      content: "Thanks, I will add more low-speed test data.",
      status: "visible"
    }
  ]);
}

async function seedRankingsAndItems() {
  const existing = await db.select().from(rankingsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  const authorId = createId("user");
  const commenterId = createId("user");

  await db
    .insert(usersTable)
    .values([
      {
        id: authorId,
        role: "user",
        displayName: "Ranking Owner",
        phone: "13800138111",
        account: null,
        passwordHash: null
      },
      {
        id: commenterId,
        role: "user",
        displayName: "Ranking Reviewer",
        phone: "13800138112",
        account: null,
        passwordHash: null
      }
    ])
    .onConflictDoNothing();

  const models = await db.select().from(aircraftModelsTable);
  const modelBySlug = new Map(models.map((item) => [item.slug, item]));

  const adminUser = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.account, "admin"))
    .limit(1);
  const officialAuthorId = adminUser[0]?.id ?? authorId;

  const communityRankingId = createId("ranking");
  const officialRankingId = createId("ranking");
  const itemOneId = createId("ritem");
  const itemTwoId = createId("ritem");
  const itemThreeId = createId("ritem");
  const officialItemOneId = createId("ritem");
  const officialItemTwoId = createId("ritem");

  await db.insert(rankingsTable).values([
    {
      id: communityRankingId,
      authorId,
      type: "community",
      title: "2026 City Aerial Picks",
      description: "Community shortlist for urban aerial workflows.",
      coverImageUrl: null,
      itemAddPolicy: "owner",
      commentCount: 1
    },
    {
      id: officialRankingId,
      authorId: officialAuthorId,
      type: "official",
      title: "Official Endurance Ranking",
      description: "Official board based on reviewed flight performance.",
      coverImageUrl: null,
      itemAddPolicy: "owner",
      commentCount: 0
    }
  ]);

  await db.insert(rankingItemsTable).values([
    {
      id: itemOneId,
      rankingId: communityRankingId,
      linkedModelId: modelBySlug.get("mini-4-pro")?.id ?? null,
      rank: 1,
      title: "DJI Mini 4 Pro",
      summary: "Portable and balanced.",
      imageUrl: null,
      brandName: "DJI",
      commentCount: 1
    },
    {
      id: itemTwoId,
      rankingId: communityRankingId,
      linkedModelId: modelBySlug.get("mavic-3-pro")?.id ?? null,
      rank: 2,
      title: "DJI Mavic 3 Pro",
      summary: "Strong production output.",
      imageUrl: null,
      brandName: "DJI",
      commentCount: 0
    },
    {
      id: itemThreeId,
      rankingId: communityRankingId,
      linkedModelId: null,
      rank: 3,
      title: "Custom coastal setup",
      summary: "Community custom mixed item.",
      imageUrl:
        "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=900&q=80",
      brandName: "Custom",
      commentCount: 0
    },
    {
      id: officialItemOneId,
      rankingId: officialRankingId,
      linkedModelId: modelBySlug.get("mini-4-pro")?.id ?? null,
      rank: 1,
      title: "DJI Mini 4 Pro",
      summary: "Official reviewed item.",
      imageUrl: null,
      brandName: "DJI",
      commentCount: 0
    },
    {
      id: officialItemTwoId,
      rankingId: officialRankingId,
      linkedModelId: modelBySlug.get("mavic-3-pro")?.id ?? null,
      rank: 2,
      title: "DJI Mavic 3 Pro",
      summary: "Official reviewed item.",
      imageUrl: null,
      brandName: "DJI",
      commentCount: 0
    }
  ]);

  await db.insert(rankingCommentsTable).values({
    id: createId("rcomment"),
    rankingId: communityRankingId,
    authorId: commenterId,
    content: "Practical ranking for daily pilots."
  });

  await db.insert(rankingItemRatingsTable).values([
    {
      id: createId("rir"),
      rankingItemId: itemOneId,
      userId: commenterId,
      rating: 5
    },
    {
      id: createId("rir"),
      rankingItemId: itemTwoId,
      userId: authorId,
      rating: 4
    },
    {
      id: createId("rir"),
      rankingItemId: officialItemOneId,
      userId: commenterId,
      rating: 5
    }
  ]);

  await db.insert(rankingItemCommentsTable).values({
    id: createId("ricom"),
    rankingItemId: itemOneId,
    authorId: commenterId,
    content: "Mini 4 Pro feels very safe in dense urban routes."
  });
}

async function seedAircraftSubmission() {
  const existing = await db.select().from(aircraftSubmissionsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  const authorId = createId("user");
  await db
    .insert(usersTable)
    .values({
      id: authorId,
      role: "user",
      displayName: "Submission Pilot",
      phone: "13800138121",
      account: null,
      passwordHash: null
    })
    .onConflictDoNothing();

  const category = await db
    .select({ id: aircraftCategoriesTable.id })
    .from(aircraftCategoriesTable)
    .where(eq(aircraftCategoriesTable.slug, "drone"))
    .limit(1);
  const brand = await db
    .select({ id: brandsTable.id })
    .from(brandsTable)
    .where(eq(brandsTable.slug, "dji"))
    .limit(1);

  await db.insert(aircraftSubmissionsTable).values({
    id: createId("submit"),
    authorId,
    status: "submitted",
    categoryId: category[0]?.id ?? "",
    brandId: brand[0]?.id ?? null,
    proposedBrandName: null,
    modelName: "Mini 4 Pro",
    powerType: "electric",
    summary: "Seeded submission sample.",
    description: "Default sample remains submitted until admin review.",
    coverImageUrl: null,
    galleryImageUrls: "[]",
    videoAssetId: null,
    maxFlightTimeMinutes: 45,
    maxRangeKilometers: 18,
    maxSpeedKph: 58,
    takeoffWeightGrams: 249,
    approvedModelId: null
  });
}

export async function resetDatabaseState() {
  await db.execute(
    sql.raw(
      'TRUNCATE TABLE "notifications", "post_interactions", "user_follows", "video_assets", "post_images", "post_reports", "post_comments", "posts", "review_comments", "ranking_item_comments", "ranking_item_ratings", "ranking_comments", "ranking_items", "rankings", "aircraft_submissions", "aircraft_reviews", "aircraft_models", "brands", "content_categories", "aircraft_categories", "sessions", "users" RESTART IDENTITY CASCADE;'
    )
  );
}

export async function seedAuthDatabase() {
  await ensureAdminUser();
}

export async function seedDatabase() {
  await seedAuthDatabase();
  await seedContentCategories();
  await seedAircraftCatalog();
  await seedUsersAndReviews();
  await seedPostsAndComments();
  await seedRankingsAndItems();
  await seedAircraftSubmission();
}
