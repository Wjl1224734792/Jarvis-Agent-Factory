import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  aircraftCategoriesTable,
  aircraftModelInteractionsTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  aircraftSubmissionsTable,
  brandsTable,
  contentCategoriesTable,
  filesTable,
  notificationsTable,
  postCommentsTable,
  postInteractionsTable,
  postsTable,
  rankingCommentsTable,
  ratingTargetCommentsTable,
  ratingTargetRatingsTable,
  ratingTargetsTable,
  rankingsTable,
  userFollowsTable,
  usersTable
} from "./schema.js";
import { createId, hashPassword } from "./helpers.js";
import { RUNTIME_SEED_ASSETS } from "./runtime-seed.js";

const USER_IDS = {
  skyline: "seed_user_skyline",
  canyon: "seed_user_canyon",
  ranking: "seed_user_ranking",
  review: "seed_user_review",
  aero: "seed_user_aero",
  night: "seed_user_night",
  followerA: "seed_user_follower_a",
  followerB: "seed_user_follower_b",
  submitterA: "seed_user_submitter_a",
  submitterB: "seed_user_submitter_b"
} as const;

const CONTENT_CATEGORY_IDS = {
  news: "seed_ccat_news",
  review: "seed_ccat_review",
  aerial: "seed_ccat_aerial",
  tech: "seed_ccat_tech",
  guide: "seed_ccat_guide"
} as const;

const AIRCRAFT_CATEGORY_IDS = {
  drone: "seed_cat_drone",
  evtol: "seed_cat_evtol",
  helicopter: "seed_cat_helicopter",
  businessJet: "seed_cat_business_jet"
} as const;

const BRAND_IDS = {
  dji: "seed_brand_dji",
  autel: "seed_brand_autel",
  ehang: "seed_brand_ehang",
  joby: "seed_brand_joby",
  robinson: "seed_brand_robinson",
  cirrus: "seed_brand_cirrus"
} as const;

const MODEL_IDS = {
  mini4: "seed_model_mini_4_pro",
  mavic3: "seed_model_mavic_3_pro",
  autelLite: "seed_model_autel_evo_lite_plus",
  eh216: "seed_model_ehang_eh216_s",
  jobyS4: "seed_model_joby_s4",
  visionJet: "seed_model_vision_jet_g2_plus"
} as const;

const POST_IDS = {
  officialLaunch: "seed_post_official_launch",
  officialGuide: "seed_post_official_guide",
  skylineArticle: "seed_post_skyline_article",
  reviewArticle: "seed_post_review_article",
  pendingArticle: "seed_post_pending_article",
  rejectedArticle: "seed_post_rejected_article",
  coastMoment: "seed_post_coast_moment",
  valleyMoment: "seed_post_valley_moment",
  hiddenMoment: "seed_post_hidden_moment"
} as const;

const POST_IMAGE_IDS = {
  officialLaunch: "seed_image_official_launch",
  officialGuide: "seed_image_official_guide",
  skylineArticle: "seed_image_skyline_article",
  reviewArticle: "seed_image_review_article",
  coastMoment: "seed_image_coast_moment",
  valleyMoment: "seed_image_valley_moment",
  pendingArticle: "seed_image_pending_article"
} as const;

const VIDEO_IDS = {
  officialGuide: "seed_video_official_guide",
  valleyMoment: "seed_video_valley_moment"
} as const;

const FILE_IDS = {
  rankingCommunityCover: "seed_file_ranking_community_cover",
  rankingOfficialCover: "seed_file_ranking_official_cover",
  rankingCommunityMini: "seed_file_ranking_community_mini",
  rankingCommunityMavic: "seed_file_ranking_community_mavic",
  rankingCommunityAutel: "seed_file_ranking_community_autel",
  rankingOfficialMini: "seed_file_ranking_official_mini",
  rankingOfficialMavic: "seed_file_ranking_official_mavic",
  submissionSubmittedCover: "seed_file_submission_submitted_cover",
  submissionApprovedCover: "seed_file_submission_approved_cover",
  submissionRejectedCover: "seed_file_submission_rejected_cover"
} as const;

const COMMENT_IDS = {
  skylineRoot: "seed_comment_skyline_root",
  skylineReply: "seed_comment_skyline_reply",
  officialRoot: "seed_comment_official_root",
  valleyRoot: "seed_comment_valley_root"
} as const;

const RANKING_IDS = {
  community: "seed_ranking_community_city",
  official: "seed_ranking_official_endurance"
} as const;

const RANKING_ITEM_IDS = {
  communityMini: "seed_rtarget_community_mini",
  communityMavic: "seed_rtarget_community_mavic",
  communityAutel: "seed_rtarget_community_autel",
  officialMini: "seed_rtarget_official_mini",
  officialMavic: "seed_rtarget_official_mavic"
} as const;

const SUBMISSION_IDS = {
  submitted: "seed_submission_submitted",
  approved: "seed_submission_approved",
  rejected: "seed_submission_rejected"
} as const;

function seededDate(day: number, hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 2, day, hour, minute, 0));
}

function buildSeedFile(input: {
  id: string;
  ownerId: string;
  postId?: string | null;
  bizType:
    | "post-image"
    | "post-video"
    | "ranking-cover-image"
    | "ranking-item-image"
    | "aircraft-cover-image";
  mediaKind: "image" | "video";
  objectKey: string;
  fileName: string;
  mimeType: "image/png" | "video/mp4";
  byteSize: number;
  createdAt: Date;
}) {
  return {
    id: input.id,
    ownerId: input.ownerId,
    postId: input.postId ?? null,
    bizType: input.bizType,
    mediaKind: input.mediaKind,
    provider: "minio",
    bucket: process.env.STORAGE_BUCKET?.trim() || "feijia-media",
    region: process.env.STORAGE_REGION?.trim() || "us-east-1",
    objectKey: input.objectKey,
    filename: input.fileName,
    contentType: input.mimeType,
    size: input.byteSize,
    etag: null,
    status: "uploaded",
    visibility: "public",
    createdAt: input.createdAt,
    uploadedAt: input.createdAt,
    deletedAt: null
  };
}

async function ensureAdminUser() {
  const existing = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.account, "admin"))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].displayName === "System Admin") {
      await db
        .update(usersTable)
        .set({
          displayName: "系统管理员"
        })
        .where(eq(usersTable.id, existing[0].id));
    }
    return existing[0].id;
  }

  const id = createId("admin");
  await db.insert(usersTable).values({
    id,
    role: "admin",
    displayName: "系统管理员",
    phone: null,
    account: "admin",
    passwordHash: hashPassword("Admin#123")
  });

  return id;
}

async function seedContentCategories() {
  await db
    .insert(contentCategoriesTable)
    .values([
      { id: CONTENT_CATEGORY_IDS.news, slug: "news", name: "资讯", sortOrder: 1, isEnabled: true },
      { id: CONTENT_CATEGORY_IDS.review, slug: "review", name: "评测", sortOrder: 2, isEnabled: true },
      { id: CONTENT_CATEGORY_IDS.aerial, slug: "aerial", name: "航拍", sortOrder: 3, isEnabled: true },
      { id: CONTENT_CATEGORY_IDS.tech, slug: "tech", name: "技术", sortOrder: 4, isEnabled: true },
      { id: CONTENT_CATEGORY_IDS.guide, slug: "guide", name: "指南", sortOrder: 5, isEnabled: true }
    ])
    .onConflictDoNothing();
}

async function seedAircraftCatalog() {
  await db
    .insert(aircraftCategoriesTable)
    .values([
      { id: AIRCRAFT_CATEGORY_IDS.drone, slug: "drone", name: "无人机", sortOrder: 1, isEnabled: true },
      { id: AIRCRAFT_CATEGORY_IDS.evtol, slug: "evtol", name: "电动垂直起降", sortOrder: 2, isEnabled: true },
      { id: AIRCRAFT_CATEGORY_IDS.helicopter, slug: "helicopter", name: "直升机", sortOrder: 3, isEnabled: true },
      { id: AIRCRAFT_CATEGORY_IDS.businessJet, slug: "business-jet", name: "公务机", sortOrder: 4, isEnabled: true }
    ])
    .onConflictDoNothing();

  await db
    .insert(brandsTable)
    .values([
      { id: BRAND_IDS.dji, slug: "dji", name: "DJI", logoUrl: null, categoryId: AIRCRAFT_CATEGORY_IDS.drone, sortOrder: 1, isEnabled: true },
      { id: BRAND_IDS.autel, slug: "autel", name: "Autel", logoUrl: null, categoryId: AIRCRAFT_CATEGORY_IDS.drone, sortOrder: 2, isEnabled: true },
      { id: BRAND_IDS.ehang, slug: "ehang", name: "EHang", logoUrl: null, categoryId: AIRCRAFT_CATEGORY_IDS.evtol, sortOrder: 3, isEnabled: true },
      { id: BRAND_IDS.joby, slug: "joby", name: "Joby", logoUrl: null, categoryId: AIRCRAFT_CATEGORY_IDS.evtol, sortOrder: 4, isEnabled: true },
      { id: BRAND_IDS.robinson, slug: "robinson", name: "Robinson", logoUrl: null, categoryId: AIRCRAFT_CATEGORY_IDS.helicopter, sortOrder: 5, isEnabled: true },
      { id: BRAND_IDS.cirrus, slug: "cirrus", name: "Cirrus", logoUrl: null, categoryId: AIRCRAFT_CATEGORY_IDS.businessJet, sortOrder: 6, isEnabled: true }
    ])
    .onConflictDoNothing();

  await db
    .insert(aircraftModelsTable)
    .values([
      { id: MODEL_IDS.mini4, slug: "mini-4-pro", name: "DJI Mini 4 Pro", categoryId: AIRCRAFT_CATEGORY_IDS.drone, brandId: BRAND_IDS.dji, powerType: "electric", summary: "Compact and stable flight model.", description: "Suitable for travel and everyday aerial shooting.", priceMin: 4999, priceMax: 6999, maxFlightTimeMinutes: 45, maxRangeKilometers: 18, maxSpeedKph: 58, takeoffWeightGrams: 249, isPublished: true },
      { id: MODEL_IDS.mavic3, slug: "mavic-3-pro", name: "DJI Mavic 3 Pro", categoryId: AIRCRAFT_CATEGORY_IDS.drone, brandId: BRAND_IDS.dji, powerType: "electric", summary: "Multi-lens flagship for commercial workflows.", description: "High-end model for demanding image capture.", priceMin: 13888, priceMax: 17688, maxFlightTimeMinutes: 43, maxRangeKilometers: 28, maxSpeedKph: 75, takeoffWeightGrams: 958, isPublished: true },
      { id: MODEL_IDS.autelLite, slug: "evo-lite-plus", name: "Autel EVO Lite+", categoryId: AIRCRAFT_CATEGORY_IDS.drone, brandId: BRAND_IDS.autel, powerType: "electric", summary: "Balanced image quality and endurance.", description: "Good low-light and stable handling.", priceMin: 7299, priceMax: 8599, maxFlightTimeMinutes: 40, maxRangeKilometers: 24, maxSpeedKph: 68, takeoffWeightGrams: 835, isPublished: true },
      { id: MODEL_IDS.eh216, slug: "eh216-s", name: "EHang EH216-S", categoryId: AIRCRAFT_CATEGORY_IDS.evtol, brandId: BRAND_IDS.ehang, powerType: "electric", summary: "Representative urban eVTOL sample.", description: "Used as low-altitude mobility benchmark data.", priceMin: null, priceMax: null, maxFlightTimeMinutes: 25, maxRangeKilometers: 35, maxSpeedKph: 130, takeoffWeightGrams: null, isPublished: true },
      { id: MODEL_IDS.jobyS4, slug: "joby-s4", name: "Joby S4", categoryId: AIRCRAFT_CATEGORY_IDS.evtol, brandId: BRAND_IDS.joby, powerType: "electric", summary: "Commercial-route eVTOL reference.", description: "Long-term tracking target for eVTOL progress.", priceMin: null, priceMax: null, maxFlightTimeMinutes: 45, maxRangeKilometers: 240, maxSpeedKph: 320, takeoffWeightGrams: null, isPublished: true },
      { id: MODEL_IDS.visionJet, slug: "vision-jet-g2-plus", name: "Cirrus Vision Jet G2+", categoryId: AIRCRAFT_CATEGORY_IDS.businessJet, brandId: BRAND_IDS.cirrus, powerType: "fuel", summary: "General aviation personal jet sample.", description: "Cross-category baseline for low-altitude transport.", priceMin: null, priceMax: null, maxFlightTimeMinutes: 300, maxRangeKilometers: 2300, maxSpeedKph: 576, takeoffWeightGrams: null, isPublished: true }
    ])
    .onConflictDoNothing();
}

async function seedUsers() {
  await db
    .insert(usersTable)
    .values([
      { id: USER_IDS.skyline, role: "user", displayName: "Skyline Pilot", phone: "13800138101", account: null, passwordHash: null },
      { id: USER_IDS.canyon, role: "user", displayName: "Canyon Flyer", phone: "13800138102", account: null, passwordHash: null },
      { id: USER_IDS.ranking, role: "user", displayName: "Ranking Owner", phone: "13800138103", account: null, passwordHash: null },
      { id: USER_IDS.review, role: "user", displayName: "Review Engineer", phone: "13800138104", account: null, passwordHash: null },
      { id: USER_IDS.aero, role: "user", displayName: "Aero Notes", phone: "13800138105", account: null, passwordHash: null },
      { id: USER_IDS.night, role: "user", displayName: "Night Survey", phone: "13800138106", account: null, passwordHash: null },
      { id: USER_IDS.followerA, role: "user", displayName: "Flyer 7007", phone: "13800138107", account: null, passwordHash: null },
      { id: USER_IDS.followerB, role: "user", displayName: "Flyer 7008", phone: "13800138108", account: null, passwordHash: null },
      { id: USER_IDS.submitterA, role: "user", displayName: "Submission Pilot", phone: "13800138109", account: null, passwordHash: null },
      { id: USER_IDS.submitterB, role: "user", displayName: "Hangar Observer", phone: "13800138110", account: null, passwordHash: null }
    ])
    .onConflictDoNothing();
}

async function seedReviewsAndModelFavorites() {
  await db
    .insert(aircraftReviewsTable)
    .values([
      { id: "seed_review_mini_a", modelId: MODEL_IDS.mini4, userId: USER_IDS.skyline, rating: null, content: "Lightweight, stable, and easy to carry for daily routes.", status: "visible", createdAt: seededDate(20, 8), updatedAt: seededDate(20, 9) },
      { id: "seed_review_mini_b", modelId: MODEL_IDS.mini4, userId: USER_IDS.aero, rating: null, content: "Very forgiving for city takeoff and recovery drills.", status: "visible", createdAt: seededDate(20, 10), updatedAt: seededDate(20, 11) },
      { id: "seed_review_mavic", modelId: MODEL_IDS.mavic3, userId: USER_IDS.review, rating: null, content: "Image quality remains the benchmark for compact commercial rigs.", status: "visible", createdAt: seededDate(21, 8), updatedAt: seededDate(21, 9) },
      { id: "seed_review_autel", modelId: MODEL_IDS.autelLite, userId: USER_IDS.night, rating: null, content: "Good endurance and low-light confidence on field jobs.", status: "visible", createdAt: seededDate(21, 10), updatedAt: seededDate(21, 11) },
      { id: "seed_review_evtol", modelId: MODEL_IDS.jobyS4, userId: USER_IDS.ranking, rating: null, content: "Still the clearest long-range eVTOL reference in the dataset.", status: "visible", createdAt: seededDate(22, 8), updatedAt: seededDate(22, 9) }
    ])
    .onConflictDoNothing();

  await db
    .insert(aircraftModelInteractionsTable)
    .values([
      { id: "seed_model_favorite_mini", modelId: MODEL_IDS.mini4, userId: USER_IDS.followerA, type: "favorite" },
      { id: "seed_model_favorite_joby", modelId: MODEL_IDS.jobyS4, userId: USER_IDS.skyline, type: "favorite" },
      { id: "seed_model_favorite_mavic", modelId: MODEL_IDS.mavic3, userId: USER_IDS.aero, type: "favorite" }
    ])
    .onConflictDoNothing();
}

async function seedPosts(adminUserId: string) {
  await db
    .insert(postsTable)
    .values([
      { id: POST_IDS.officialLaunch, authorId: adminUserId, type: "article", title: "Official Low-Altitude Weekly", content: "The official weekly brief collects low-altitude mobility updates, ranking changes, and community highlights for the home feed.", contentHtml: "<p>The official weekly brief collects low-altitude mobility updates, ranking changes, and community highlights for the home feed.</p>", contentPlainText: "The official weekly brief collects low-altitude mobility updates, ranking changes, and community highlights for the home feed.", contentCategoryId: CONTENT_CATEGORY_IDS.news, status: "published", commentCount: 1, reportCount: 0, likeCount: 2, favoriteCount: 2, shareCount: 1, createdAt: seededDate(24, 8), updatedAt: seededDate(24, 9), publishedAt: seededDate(24, 8) },
      { id: POST_IDS.officialGuide, authorId: adminUserId, type: "article", title: "Official Preflight Checklist", content: "This official guide summarizes preflight checks, low-altitude pattern work, and return-to-home confirmation steps.", contentHtml: "<p>This official guide summarizes preflight checks, low-altitude pattern work, and return-to-home confirmation steps.</p>", contentPlainText: "This official guide summarizes preflight checks, low-altitude pattern work, and return-to-home confirmation steps.", contentCategoryId: CONTENT_CATEGORY_IDS.guide, status: "published", commentCount: 0, reportCount: 0, likeCount: 1, favoriteCount: 1, shareCount: 1, createdAt: seededDate(24, 12), updatedAt: seededDate(24, 13), publishedAt: seededDate(24, 12) },
      { id: POST_IDS.skylineArticle, authorId: USER_IDS.skyline, type: "article", title: "2026 eVTOL aerodynamic snapshot", content: "A concise summary of current eVTOL aerodynamic updates.", contentHtml: "<p>A concise summary of current eVTOL aerodynamic updates.</p>", contentPlainText: "A concise summary of current eVTOL aerodynamic updates.", contentCategoryId: CONTENT_CATEGORY_IDS.news, status: "published", commentCount: 2, reportCount: 0, likeCount: 3, favoriteCount: 2, shareCount: 1, createdAt: seededDate(23, 10), updatedAt: seededDate(23, 11), publishedAt: seededDate(23, 10) },
      { id: POST_IDS.reviewArticle, authorId: USER_IDS.review, type: "article", title: "High-altitude drone checklist", content: "Five practical checks before high-altitude flights.", contentHtml: "<p>Five practical checks before high-altitude flights.</p>", contentPlainText: "Five practical checks before high-altitude flights.", contentCategoryId: CONTENT_CATEGORY_IDS.review, status: "published", commentCount: 0, reportCount: 0, likeCount: 2, favoriteCount: 1, shareCount: 1, createdAt: seededDate(22, 9), updatedAt: seededDate(22, 10), publishedAt: seededDate(22, 9) },
      { id: POST_IDS.pendingArticle, authorId: USER_IDS.canyon, type: "article", title: "Pending canyon observation", content: "This article stays pending so admin can verify the queue.", contentHtml: "<p>This article stays pending so admin can verify the queue.</p>", contentPlainText: "This article stays pending so admin can verify the queue.", contentCategoryId: CONTENT_CATEGORY_IDS.tech, status: "pending", commentCount: 0, reportCount: 0, likeCount: 0, favoriteCount: 0, shareCount: 0, createdAt: seededDate(25, 8), updatedAt: seededDate(25, 8), publishedAt: null },
      { id: POST_IDS.rejectedArticle, authorId: USER_IDS.night, type: "article", title: "Rejected sample article", content: "Rejected sample article for admin review history.", contentHtml: "<p>Rejected sample article for admin review history.</p>", contentPlainText: "Rejected sample article for admin review history.", contentCategoryId: CONTENT_CATEGORY_IDS.tech, status: "rejected", commentCount: 0, reportCount: 1, likeCount: 0, favoriteCount: 0, shareCount: 0, createdAt: seededDate(25, 9), updatedAt: seededDate(25, 9), publishedAt: null },
      { id: POST_IDS.coastMoment, authorId: USER_IDS.canyon, type: "moment", title: "Coastline test log", content: "Wind was stronger than expected but return-to-home stayed stable.", contentHtml: null, contentPlainText: "Wind was stronger than expected but return-to-home stayed stable.", contentCategoryId: null, status: "published", commentCount: 0, reportCount: 0, likeCount: 2, favoriteCount: 1, shareCount: 0, createdAt: seededDate(25, 6), updatedAt: seededDate(25, 6), publishedAt: seededDate(25, 6) },
      { id: POST_IDS.valleyMoment, authorId: USER_IDS.review, type: "moment", title: "Valley wind note", content: "Reserve extra height before final descent in crosswind valleys.", contentHtml: null, contentPlainText: "Reserve extra height before final descent in crosswind valleys.", contentCategoryId: null, status: "published", commentCount: 1, reportCount: 0, likeCount: 1, favoriteCount: 0, shareCount: 0, createdAt: seededDate(24, 14), updatedAt: seededDate(24, 14), publishedAt: seededDate(24, 14) },
      { id: POST_IDS.hiddenMoment, authorId: USER_IDS.night, type: "moment", title: "Hidden sample moment", content: "Hidden sample moment for moderation history.", contentHtml: null, contentPlainText: "Hidden sample moment for moderation history.", contentCategoryId: null, status: "hidden", commentCount: 0, reportCount: 1, likeCount: 0, favoriteCount: 0, shareCount: 0, createdAt: seededDate(23, 18), updatedAt: seededDate(23, 18), publishedAt: seededDate(23, 18) }
    ])
    .onConflictDoNothing();
}

async function seedPostMedia(adminUserId: string) {
  await db
    .insert(filesTable)
    .values([
      buildSeedFile({ id: POST_IMAGE_IDS.officialLaunch, ownerId: adminUserId, postId: POST_IDS.officialLaunch, bizType: "post-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.officialLaunch.key, fileName: "official-launch.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 8, 1) }),
      buildSeedFile({ id: POST_IMAGE_IDS.officialGuide, ownerId: adminUserId, postId: POST_IDS.officialGuide, bizType: "post-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.officialGuide.key, fileName: "official-guide.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 12, 1) }),
      buildSeedFile({ id: POST_IMAGE_IDS.skylineArticle, ownerId: USER_IDS.skyline, postId: POST_IDS.skylineArticle, bizType: "post-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.cityRoute.key, fileName: "city-route.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(23, 10, 1) }),
      buildSeedFile({ id: POST_IMAGE_IDS.reviewArticle, ownerId: USER_IDS.review, postId: POST_IDS.reviewArticle, bizType: "post-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.droneChecklist.key, fileName: "drone-checklist.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(22, 9, 1) }),
      buildSeedFile({ id: POST_IMAGE_IDS.coastMoment, ownerId: USER_IDS.canyon, postId: POST_IDS.coastMoment, bizType: "post-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.coastPatrol.key, fileName: "coast-patrol.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(25, 6, 1) }),
      buildSeedFile({ id: POST_IMAGE_IDS.valleyMoment, ownerId: USER_IDS.review, postId: POST_IDS.valleyMoment, bizType: "post-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.valleyFlight.key, fileName: "valley-flight.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 14, 1) }),
      buildSeedFile({ id: POST_IMAGE_IDS.pendingArticle, ownerId: USER_IDS.canyon, postId: POST_IDS.pendingArticle, bizType: "post-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.hotCircleEvtol.key, fileName: "pending-canyon.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(25, 8, 1) }),
      buildSeedFile({ id: FILE_IDS.rankingCommunityCover, ownerId: USER_IDS.ranking, bizType: "ranking-cover-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.rankingCommunity.key, fileName: "community-ranking-cover.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(23, 8) }),
      buildSeedFile({ id: FILE_IDS.rankingOfficialCover, ownerId: adminUserId, bizType: "ranking-cover-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.rankingOfficial.key, fileName: "official-ranking-cover.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 8) }),
      buildSeedFile({ id: FILE_IDS.rankingCommunityMini, ownerId: USER_IDS.ranking, bizType: "ranking-item-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.rankingMini.key, fileName: "dji-mini-4-pro.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(23, 8, 10) }),
      buildSeedFile({ id: FILE_IDS.rankingCommunityMavic, ownerId: USER_IDS.ranking, bizType: "ranking-item-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.rankingMavic.key, fileName: "dji-mavic-3-pro.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(23, 8, 11) }),
      buildSeedFile({ id: FILE_IDS.rankingCommunityAutel, ownerId: USER_IDS.ranking, bizType: "ranking-item-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.rankingAutel.key, fileName: "autel-evo-lite-plus.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(23, 8, 12) }),
      buildSeedFile({ id: FILE_IDS.rankingOfficialMini, ownerId: adminUserId, bizType: "ranking-item-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.rankingMini.key, fileName: "dji-mini-4-pro.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 8, 10) }),
      buildSeedFile({ id: FILE_IDS.rankingOfficialMavic, ownerId: adminUserId, bizType: "ranking-item-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.rankingMavic.key, fileName: "dji-mavic-3-pro.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 8, 11) }),
      buildSeedFile({ id: FILE_IDS.submissionSubmittedCover, ownerId: USER_IDS.submitterA, bizType: "aircraft-cover-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.submissionMini.key, fileName: "mini-4-pro-submission.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 16) }),
      buildSeedFile({ id: FILE_IDS.submissionApprovedCover, ownerId: USER_IDS.submitterB, bizType: "aircraft-cover-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.submissionVtol.key, fileName: "vtol-proposal.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 17) }),
      buildSeedFile({ id: FILE_IDS.submissionRejectedCover, ownerId: USER_IDS.submitterA, bizType: "aircraft-cover-image", mediaKind: "image", objectKey: RUNTIME_SEED_ASSETS.images.submissionMini.key, fileName: "mini-4-pro-submission.png", mimeType: "image/png", byteSize: 68, createdAt: seededDate(24, 18) })
    ])
    .onConflictDoNothing();

  await db
    .insert(filesTable)
    .values([
      buildSeedFile({ id: VIDEO_IDS.officialGuide, ownerId: adminUserId, postId: POST_IDS.officialGuide, bizType: "post-video", mediaKind: "video", objectKey: RUNTIME_SEED_ASSETS.videos.officialBriefing.key, fileName: "official-briefing.mp4", mimeType: "video/mp4", byteSize: 12, createdAt: seededDate(24, 12, 2) }),
      buildSeedFile({ id: VIDEO_IDS.valleyMoment, ownerId: USER_IDS.review, postId: POST_IDS.valleyMoment, bizType: "post-video", mediaKind: "video", objectKey: RUNTIME_SEED_ASSETS.videos.hangarWalkthrough.key, fileName: "hangar-walkthrough.mp4", mimeType: "video/mp4", byteSize: 12, createdAt: seededDate(24, 14, 2) })
    ])
    .onConflictDoNothing();
}

async function seedPostCommentsAndInteractions() {
  await db
    .insert(postCommentsTable)
    .values([
      { id: COMMENT_IDS.skylineRoot, postId: POST_IDS.skylineArticle, authorId: USER_IDS.aero, parentCommentId: null, replyToCommentId: null, replyToUserId: null, content: "Useful overview and clear structure.", status: "visible", createdAt: seededDate(23, 12), updatedAt: seededDate(23, 12) },
      { id: COMMENT_IDS.skylineReply, postId: POST_IDS.skylineArticle, authorId: USER_IDS.skyline, parentCommentId: COMMENT_IDS.skylineRoot, replyToCommentId: COMMENT_IDS.skylineRoot, replyToUserId: USER_IDS.aero, content: "Thanks, I will add more low-speed test data.", status: "visible", createdAt: seededDate(23, 13), updatedAt: seededDate(23, 13) },
      { id: COMMENT_IDS.officialRoot, postId: POST_IDS.officialLaunch, authorId: USER_IDS.followerA, parentCommentId: null, replyToCommentId: null, replyToUserId: null, content: "Please keep the official ranking summary updated next week as well.", status: "visible", createdAt: seededDate(24, 9, 30), updatedAt: seededDate(24, 9, 30) },
      { id: COMMENT_IDS.valleyRoot, postId: POST_IDS.valleyMoment, authorId: USER_IDS.followerB, parentCommentId: null, replyToCommentId: null, replyToUserId: null, content: "This return-height reminder is very useful.", status: "visible", createdAt: seededDate(24, 15), updatedAt: seededDate(24, 15) }
    ])
    .onConflictDoNothing();

  await db
    .insert(postInteractionsTable)
    .values([
      { id: "seed_like_official_a", postId: POST_IDS.officialLaunch, userId: USER_IDS.followerA, type: "like", createdAt: seededDate(24, 10) },
      { id: "seed_like_official_b", postId: POST_IDS.officialLaunch, userId: USER_IDS.followerB, type: "like", createdAt: seededDate(24, 10, 5) },
      { id: "seed_favorite_official_a", postId: POST_IDS.officialLaunch, userId: USER_IDS.skyline, type: "favorite", createdAt: seededDate(24, 10, 10) },
      { id: "seed_favorite_official_b", postId: POST_IDS.officialLaunch, userId: USER_IDS.aero, type: "favorite", createdAt: seededDate(24, 10, 15) },
      { id: "seed_share_official", postId: POST_IDS.officialLaunch, userId: USER_IDS.review, type: "share", createdAt: seededDate(24, 10, 20) },
      { id: "seed_like_guide", postId: POST_IDS.officialGuide, userId: USER_IDS.followerA, type: "like", createdAt: seededDate(24, 13) },
      { id: "seed_favorite_guide", postId: POST_IDS.officialGuide, userId: USER_IDS.skyline, type: "favorite", createdAt: seededDate(24, 13, 10) },
      { id: "seed_share_guide", postId: POST_IDS.officialGuide, userId: USER_IDS.followerB, type: "share", createdAt: seededDate(24, 13, 20) },
      { id: "seed_like_skyline_a", postId: POST_IDS.skylineArticle, userId: USER_IDS.followerA, type: "like", createdAt: seededDate(23, 11) },
      { id: "seed_like_skyline_b", postId: POST_IDS.skylineArticle, userId: USER_IDS.followerB, type: "like", createdAt: seededDate(23, 11, 5) },
      { id: "seed_like_skyline_c", postId: POST_IDS.skylineArticle, userId: USER_IDS.review, type: "like", createdAt: seededDate(23, 11, 10) },
      { id: "seed_favorite_skyline_a", postId: POST_IDS.skylineArticle, userId: USER_IDS.aero, type: "favorite", createdAt: seededDate(23, 11, 15) },
      { id: "seed_favorite_skyline_b", postId: POST_IDS.skylineArticle, userId: USER_IDS.night, type: "favorite", createdAt: seededDate(23, 11, 20) },
      { id: "seed_share_skyline", postId: POST_IDS.skylineArticle, userId: USER_IDS.ranking, type: "share", createdAt: seededDate(23, 11, 25) },
      { id: "seed_like_review_a", postId: POST_IDS.reviewArticle, userId: USER_IDS.skyline, type: "like", createdAt: seededDate(22, 10) },
      { id: "seed_like_review_b", postId: POST_IDS.reviewArticle, userId: USER_IDS.followerA, type: "like", createdAt: seededDate(22, 10, 5) },
      { id: "seed_favorite_review", postId: POST_IDS.reviewArticle, userId: USER_IDS.followerB, type: "favorite", createdAt: seededDate(22, 10, 10) },
      { id: "seed_share_review", postId: POST_IDS.reviewArticle, userId: USER_IDS.aero, type: "share", createdAt: seededDate(22, 10, 15) },
      { id: "seed_like_coast_a", postId: POST_IDS.coastMoment, userId: USER_IDS.followerA, type: "like", createdAt: seededDate(25, 6, 30) },
      { id: "seed_like_coast_b", postId: POST_IDS.coastMoment, userId: USER_IDS.skyline, type: "like", createdAt: seededDate(25, 6, 40) },
      { id: "seed_favorite_coast", postId: POST_IDS.coastMoment, userId: USER_IDS.review, type: "favorite", createdAt: seededDate(25, 6, 50) },
      { id: "seed_like_valley", postId: POST_IDS.valleyMoment, userId: USER_IDS.followerA, type: "like", createdAt: seededDate(24, 14, 30) }
    ])
    .onConflictDoNothing();
}

async function seedSocialGraph(adminUserId: string) {
  await db
    .insert(userFollowsTable)
    .values([
      { id: "seed_follow_a_skyline", followerId: USER_IDS.followerA, followeeId: USER_IDS.skyline, createdAt: seededDate(22, 8) },
      { id: "seed_follow_a_canyon", followerId: USER_IDS.followerA, followeeId: USER_IDS.canyon, createdAt: seededDate(22, 9) },
      { id: "seed_follow_b_skyline", followerId: USER_IDS.followerB, followeeId: USER_IDS.skyline, createdAt: seededDate(22, 10) },
      { id: "seed_follow_b_review", followerId: USER_IDS.followerB, followeeId: USER_IDS.review, createdAt: seededDate(22, 11) }
    ])
    .onConflictDoNothing();

  await db
    .insert(notificationsTable)
    .values([
      { id: "seed_notification_followed", userId: USER_IDS.skyline, actorId: USER_IDS.followerA, type: "followed", postId: null, commentId: null, isRead: false, createdAt: seededDate(24, 7) },
      { id: "seed_notification_post_commented", userId: adminUserId, actorId: USER_IDS.followerA, type: "post_commented", postId: POST_IDS.officialLaunch, commentId: COMMENT_IDS.officialRoot, isRead: false, createdAt: seededDate(24, 9, 35) },
      { id: "seed_notification_comment_replied", userId: USER_IDS.aero, actorId: USER_IDS.skyline, type: "comment_replied", postId: POST_IDS.skylineArticle, commentId: COMMENT_IDS.skylineReply, isRead: true, createdAt: seededDate(23, 13, 5) }
    ])
    .onConflictDoNothing();
}

async function seedRankings(adminUserId: string) {
  await db
    .insert(rankingsTable)
    .values([
      { id: RANKING_IDS.community, authorId: USER_IDS.ranking, type: "community", title: "2026 City Aerial Picks", description: "Community shortlist for urban aerial workflows.", coverImageFileId: FILE_IDS.rankingCommunityCover, itemAddPolicy: "owner", commentCount: 1, createdAt: seededDate(23, 8), updatedAt: seededDate(23, 9) },
      { id: RANKING_IDS.official, authorId: adminUserId, type: "official", title: "Official Endurance Ranking", description: "Official board based on reviewed flight performance.", coverImageFileId: FILE_IDS.rankingOfficialCover, itemAddPolicy: "owner", commentCount: 0, createdAt: seededDate(24, 8), updatedAt: seededDate(24, 9) }
    ])
    .onConflictDoNothing();

  await db
    .insert(ratingTargetsTable)
    .values([
      { id: RANKING_ITEM_IDS.communityMini, rankingId: RANKING_IDS.community, authorId: USER_IDS.ranking, linkedModelId: MODEL_IDS.mini4, status: "published", rank: 1, title: "DJI Mini 4 Pro", summary: "Portable and balanced.", imageFileId: FILE_IDS.rankingCommunityMini, brandName: "DJI", commentCount: 1 },
      { id: RANKING_ITEM_IDS.communityMavic, rankingId: RANKING_IDS.community, authorId: USER_IDS.ranking, linkedModelId: MODEL_IDS.mavic3, status: "published", rank: 2, title: "DJI Mavic 3 Pro", summary: "Strong production output.", imageFileId: FILE_IDS.rankingCommunityMavic, brandName: "DJI", commentCount: 0 },
      { id: RANKING_ITEM_IDS.communityAutel, rankingId: RANKING_IDS.community, authorId: USER_IDS.ranking, linkedModelId: MODEL_IDS.autelLite, status: "published", rank: 3, title: "Autel EVO Lite+", summary: "Balanced image quality and endurance.", imageFileId: FILE_IDS.rankingCommunityAutel, brandName: "Autel", commentCount: 0 },
      { id: RANKING_ITEM_IDS.officialMini, rankingId: RANKING_IDS.official, authorId: adminUserId, linkedModelId: MODEL_IDS.mini4, status: "published", rank: 1, title: "DJI Mini 4 Pro", summary: "Official reviewed item.", imageFileId: FILE_IDS.rankingOfficialMini, brandName: "DJI", commentCount: 0 },
      { id: RANKING_ITEM_IDS.officialMavic, rankingId: RANKING_IDS.official, authorId: adminUserId, linkedModelId: MODEL_IDS.mavic3, status: "published", rank: 2, title: "DJI Mavic 3 Pro", summary: "Official reviewed item.", imageFileId: FILE_IDS.rankingOfficialMavic, brandName: "DJI", commentCount: 0 }
    ])
    .onConflictDoNothing();

  await db
    .insert(rankingCommentsTable)
    .values([
      { id: "seed_ranking_comment_city", rankingId: RANKING_IDS.community, authorId: USER_IDS.aero, content: "Practical ranking for daily pilots.", createdAt: seededDate(23, 9, 20), updatedAt: seededDate(23, 9, 20) }
    ])
    .onConflictDoNothing();

  await db
    .insert(ratingTargetRatingsTable)
    .values([
      { id: "seed_rating_city_mini_a", ratingTargetId: RANKING_ITEM_IDS.communityMini, userId: USER_IDS.aero, rating: 5, createdAt: seededDate(23, 10) },
      { id: "seed_rating_city_mini_b", ratingTargetId: RANKING_ITEM_IDS.communityMini, userId: USER_IDS.night, rating: 4, createdAt: seededDate(23, 10, 5) },
      { id: "seed_rating_city_mavic", ratingTargetId: RANKING_ITEM_IDS.communityMavic, userId: USER_IDS.ranking, rating: 4, createdAt: seededDate(23, 10, 10) },
      { id: "seed_rating_official_mini", ratingTargetId: RANKING_ITEM_IDS.officialMini, userId: USER_IDS.aero, rating: 5, createdAt: seededDate(24, 10) },
      { id: "seed_rating_official_mavic", ratingTargetId: RANKING_ITEM_IDS.officialMavic, userId: USER_IDS.review, rating: 4, createdAt: seededDate(24, 10, 5) }
    ])
    .onConflictDoNothing();

  await db
    .insert(ratingTargetCommentsTable)
    .values([
      { id: "seed_ranking_item_comment_mini", ratingTargetId: RANKING_ITEM_IDS.communityMini, authorId: USER_IDS.aero, content: "Mini 4 Pro feels very safe in dense urban routes.", createdAt: seededDate(23, 10, 30), updatedAt: seededDate(23, 10, 30) }
    ])
    .onConflictDoNothing();
}

async function seedAircraftSubmissions() {
  await db
    .insert(aircraftSubmissionsTable)
    .values([
      { id: SUBMISSION_IDS.submitted, authorId: USER_IDS.submitterA, status: "submitted", categoryId: AIRCRAFT_CATEGORY_IDS.drone, brandId: BRAND_IDS.dji, proposedBrandName: null, modelName: "Mini 4 Pro Coastal Kit", powerType: "electric", summary: "Seeded submission sample.", description: "Default sample remains submitted until admin review.", coverImageFileId: FILE_IDS.submissionSubmittedCover, galleryImageFileIds: JSON.stringify([FILE_IDS.submissionSubmittedCover]), videoFileId: null, priceMin: 5699, priceMax: 6299, maxFlightTimeMinutes: 45, maxRangeKilometers: 18, maxSpeedKph: 58, takeoffWeightGrams: 249, approvedModelId: null },
      { id: SUBMISSION_IDS.approved, authorId: USER_IDS.submitterB, status: "approved", categoryId: AIRCRAFT_CATEGORY_IDS.evtol, brandId: null, proposedBrandName: "Blue Harbor Air", modelName: "Blue Harbor S1", powerType: "electric", summary: "Approved sample for admin history.", description: "Approved seed submission for operations verification.", coverImageFileId: FILE_IDS.submissionApprovedCover, galleryImageFileIds: JSON.stringify([FILE_IDS.submissionApprovedCover]), videoFileId: null, priceMin: 780000, priceMax: 860000, maxFlightTimeMinutes: 32, maxRangeKilometers: 60, maxSpeedKph: 140, takeoffWeightGrams: null, approvedModelId: MODEL_IDS.jobyS4 },
      { id: SUBMISSION_IDS.rejected, authorId: USER_IDS.submitterA, status: "rejected", categoryId: AIRCRAFT_CATEGORY_IDS.drone, brandId: BRAND_IDS.autel, proposedBrandName: null, modelName: "Autel Concept X", powerType: "electric", summary: "Rejected sample for moderation history.", description: "Rejected seed submission for admin operations review.", coverImageFileId: FILE_IDS.submissionRejectedCover, galleryImageFileIds: JSON.stringify([]), videoFileId: null, priceMin: 8999, priceMax: 9999, maxFlightTimeMinutes: 36, maxRangeKilometers: 20, maxSpeedKph: 62, takeoffWeightGrams: 900, approvedModelId: null }
    ])
    .onConflictDoNothing();
}

export async function resetDatabaseState() {
  await db.execute(
    sql.raw(
      'TRUNCATE TABLE "site_settings", "notifications", "post_interactions", "post_comment_likes", "post_comment_reports", "user_follows", "files", "post_reports", "post_comments", "posts", "review_comment_likes", "review_comment_reports", "review_comments", "aircraft_review_likes", "aircraft_review_reports", "aircraft_model_comment_likes", "aircraft_model_comment_reports", "aircraft_model_comments", "rating_target_comment_likes", "rating_target_comment_reports", "rating_target_comments", "rating_target_ratings", "rating_target_reports", "ranking_comment_likes", "ranking_comment_reports", "ranking_comments", "rating_targets", "ranking_reports", "rankings", "aircraft_submissions", "aircraft_model_interactions", "aircraft_model_reports", "aircraft_reviews", "aircraft_models", "brand_applications", "brands", "content_categories", "aircraft_categories", "sessions", "users" RESTART IDENTITY CASCADE;'
    )
  );
}

export async function seedAuthDatabase() {
  await ensureAdminUser();
}

export async function seedDatabase(options?: { reset?: boolean }) {
  if (options?.reset !== false) {
    await resetDatabaseState();
  }
  const adminUserId = await ensureAdminUser();
  await seedContentCategories();
  await seedAircraftCatalog();
  await seedUsers();
  await seedReviewsAndModelFavorites();
  await seedPosts(adminUserId);
  await seedPostMedia(adminUserId);
  await seedPostCommentsAndInteractions();
  await seedSocialGraph(adminUserId);
  await seedRankings(adminUserId);
  await seedAircraftSubmissions();
}
