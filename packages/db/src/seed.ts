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
    displayName: "系统管理员",
    phone: null,
    account: "admin",
    passwordHash: hashPassword("Admin#123")
  });
}

async function seedContentCategories() {
  const seeds = [
    { slug: "news", name: "资讯", sortOrder: 1 },
    { slug: "review", name: "测评", sortOrder: 2 },
    { slug: "aerial", name: "航拍", sortOrder: 3 },
    { slug: "tech", name: "技术", sortOrder: 4 },
    { slug: "guide", name: "指南", sortOrder: 5 }
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
      summary: "轻量旗舰航拍无人机。",
      description: "适合城市记录、轻旅行与高频随身航拍。",
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
      summary: "多镜头旗舰航拍机型。",
      description: "更适合商业航拍和专业内容制作。",
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
      summary: "兼顾画质与续航的消费级机型。",
      description: "适合重视色彩表现与稳定飞行体验的用户。",
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
      summary: "低空通勤话题 eVTOL。",
      description: "适合关注低空经济与城市通勤场景的用户。",
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
      summary: "商业化路线较成熟的五座 eVTOL。",
      description: "适合长期观察低空商业化发展路径。",
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
      summary: "个人航空体验代表机型。",
      description: "适合作为通航与低空出行的横向对比样本。",
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
    { phone: "13800138101", displayName: "飞友星野" },
    { phone: "13800138102", displayName: "飞友海崖" },
    { phone: "13800138103", displayName: "飞友洛川" },
    { phone: "13800138104", displayName: "飞友白帆" },
    { phone: "13800138105", displayName: "飞友向北" },
    { phone: "13800138106", displayName: "飞友南栀" }
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
    ["mini-4-pro", "13800138101", 5, "轻巧稳定，旅行和随拍体验都很好。"],
    ["mini-4-pro", "13800138102", 4, "风稍大时需要保守一些，但整体很好上手。"],
    ["mavic-3-pro", "13800138103", 5, "多镜头覆盖很强，商业拍摄很省心。"],
    ["mavic-3-pro", "13800138104", 5, "综合能力几乎拉满。"],
    ["evo-lite-plus", "13800138105", 4, "夜景表现很稳，适合进阶用户。"],
    ["eh216-s", "13800138106", 4, "低空通勤想象力很强，值得持续关注。"],
    ["joby-s4", "13800138101", 5, "工程化成熟度最值得长期追踪。"],
    ["vision-jet-g2-plus", "13800138102", 4, "个人航空体验很完整，但门槛高。"]
  ] as const;

  await db
    .insert(aircraftReviewsTable)
    .values(
    reviewSeeds.map(([slug, phone, rating, content], index) => ({
      id: createId("review"),
      modelId: modelIdBySlug.get(slug)!,
      userId: userIdByPhone.get(phone)!,
      rating,
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
        displayName: "飞友8007",
        phone: "13800138087",
        account: null,
        passwordHash: null
      },
      {
        id: momentAuthorId,
        role: "user",
        displayName: "飞友阿澜",
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
      title: "深度解析：2024款全球领先 eVTOL 飞行器气动布局优化报告",
      content:
        "随着低空经济的爆发，eVTOL 技术正在经历前所未有的快速更迭。\n\n本文从螺旋桨布局、机翼矢量推力以及碳纤维复合材料三个角度分析这代机型的关键改进。",
      contentHtml:
        "<p>随着低空经济的爆发，eVTOL 技术正在经历前所未有的快速更迭。</p><p>本文从螺旋桨布局、机翼矢量推力以及碳纤维复合材料三个角度分析这代机型的关键改进。</p>",
      contentPlainText:
        "随着低空经济的爆发，eVTOL 技术正在经历前所未有的快速更迭。本文从螺旋桨布局、机翼矢量推力以及碳纤维复合材料三个角度分析这代机型的关键改进。",
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
      title: "在喜马拉雅山脉进行高海拔无人机摄影的5个实用技巧",
      content:
        "高海拔地区的空气稀薄和极端低温对无人机的电池性能和飞行稳定性是巨大的挑战。\n\n上周我在大本营附近进行了为期三天的实地测试，总结了几条最有效的参数调整经验。",
      contentHtml:
        "<p>高海拔地区的空气稀薄和极端低温对无人机的电池性能和飞行稳定性是巨大的挑战。</p><p>上周我在大本营附近进行了为期三天的实地测试，总结了几条最有效的参数调整经验。</p>",
      contentPlainText:
        "高海拔地区的空气稀薄和极端低温对无人机的电池性能和飞行稳定性是巨大的挑战。上周我在大本营附近进行了为期三天的实地测试，总结了几条最有效的参数调整经验。",
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
      title: "海边试飞日志",
      content: "今天在海边试飞，侧风偏大，但返航和悬停都很稳。",
      contentHtml: null,
      contentPlainText: "今天在海边试飞，侧风偏大，但返航和悬停都很稳。",
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
      title: "树线风场记录",
      content: "山谷风切明显，下降时需要更早预留缓冲高度。",
      contentHtml: null,
      contentPlainText: "山谷风切明显，下降时需要更早预留缓冲高度。",
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
      content: "这份分析很有参考价值，尤其是对旋翼布局的比较。",
      status: "visible"
    },
    {
      id: replyCommentId,
      postId: articleOneId,
      authorId: articleAuthorId,
      parentCommentId: rootCommentId,
      replyToCommentId: rootCommentId,
      replyToUserId: commenterId,
      content: "@飞友北斗 后续我会把低速姿态下的数据图也补上。",
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
        displayName: "飞友排行官",
        phone: "13800138111",
        account: null,
        passwordHash: null
      },
      {
        id: commenterId,
        role: "user",
        displayName: "飞友评分员",
        phone: "13800138112",
        account: null,
        passwordHash: null
      }
    ])
    .onConflictDoNothing();

  const models = await db.select().from(aircraftModelsTable);
  const modelBySlug = new Map(models.map((item) => [item.slug, item]));

  const rankingId = createId("ranking");
  const itemOneId = createId("ritem");
  const itemTwoId = createId("ritem");
  const itemThreeId = createId("ritem");

  await db.insert(rankingsTable).values({
    id: rankingId,
    authorId,
    type: "community",
    title: "2026 城市航拍装备推荐榜",
    description: "围绕城市航拍、便携性和稳定性做的一份混合条目榜单。",
    coverImageUrl: null,
    itemAddPolicy: "owner",
    commentCount: 1
  });

  await db.insert(rankingItemsTable).values([
    {
      id: itemOneId,
      rankingId,
      linkedModelId: modelBySlug.get("mini-4-pro")?.id ?? null,
      rank: 1,
      title: "DJI Mini 4 Pro",
      summary: "便携性与画质的平衡点。",
      imageUrl: null,
      brandName: "DJI",
      commentCount: 1
    },
    {
      id: itemTwoId,
      rankingId,
      linkedModelId: modelBySlug.get("mavic-3-pro")?.id ?? null,
      rank: 2,
      title: "DJI Mavic 3 Pro",
      summary: "多镜头系统适合高完成度商业内容。",
      imageUrl: null,
      brandName: "DJI",
      commentCount: 0
    },
    {
      id: itemThreeId,
      rankingId,
      linkedModelId: null,
      rank: 3,
      title: "海岸线定制挂载方案",
      summary: "用户自定义的混合拍摄条目，不绑定现有飞行器。",
      imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=900&q=80",
      brandName: "Custom",
      commentCount: 0
    }
  ]);

  await db.insert(rankingCommentsTable).values({
    id: createId("rcomment"),
    rankingId,
    authorId: commenterId,
    content: "这份榜单很实用，尤其适合从轻量机型升级的用户。"
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
    }
  ]);

  await db.insert(rankingItemCommentsTable).values({
    id: createId("ricom"),
    rankingItemId: itemOneId,
    authorId: commenterId,
    content: "Mini 4 Pro 在城市环境里的安全边界控制确实更好。"
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
      displayName: "机库投稿员",
      phone: "13800138121",
      account: null,
      passwordHash: null
    })
    .onConflictDoNothing();

  const approvedModel = await db
    .select()
    .from(aircraftModelsTable)
    .where(eq(aircraftModelsTable.slug, "mini-4-pro"))
    .limit(1);

  await db.insert(aircraftSubmissionsTable).values({
    id: createId("submit"),
    authorId,
    status: "approved",
    brandName: "DJI",
    modelName: "Mini 4 Pro",
    aircraftType: "无人机",
    powerType: "electric",
    summary: "用于示例的投稿记录。",
    description: "默认自动通过的投稿样本，便于联调页面状态。",
    coverImageUrl: null,
    galleryImageUrls: "[]",
    videoUrl: null,
    maxFlightTimeMinutes: 45,
    maxRangeKilometers: 18,
    maxSpeedKph: 58,
    takeoffWeightGrams: 249,
    approvedModelId: approvedModel[0]?.id ?? null
  });
}

export async function resetDatabaseState() {
  await db.execute(
    sql.raw(
      'TRUNCATE TABLE "notifications", "post_interactions", "user_follows", "post_images", "post_reports", "post_comments", "posts", "ranking_item_comments", "ranking_item_ratings", "ranking_comments", "ranking_items", "rankings", "aircraft_submissions", "aircraft_reviews", "aircraft_models", "brands", "content_categories", "aircraft_categories", "sessions", "users" RESTART IDENTITY CASCADE;'
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
