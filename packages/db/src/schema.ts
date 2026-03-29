import {
  boolean,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    phone: text("phone"),
    account: text("account"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    displayNameUnique: uniqueIndex("users_display_name_unique").on(table.displayName),
    phoneUnique: uniqueIndex("users_phone_unique").on(table.phone),
    accountUnique: uniqueIndex("users_account_unique").on(table.account)
  })
);

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  scope: text("scope").notNull(),
  clientIp: text("client_ip"),
  userAgent: text("user_agent"),
  deviceLabel: text("device_label"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  refreshTokenHash: text("refresh_token_hash"),
  refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const userSettingsTable = pgTable(
  "user_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    profileVisibility: text("profile_visibility").default("community").notNull(),
    notifyComments: boolean("notify_comments").default(true).notNull(),
    notifyMentions: boolean("notify_mentions").default(true).notNull(),
    sessionAlerts: boolean("session_alerts").default(true).notNull(),
    emailDigest: boolean("email_digest").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    userUnique: uniqueIndex("user_settings_user_unique").on(table.userId)
  })
);

export const siteSettingsTable = pgTable("site_settings", {
  id: text("id").primaryKey(),
  postModerationEnabled: boolean("post_moderation_enabled").default(true).notNull(),
  commentModerationEnabled: boolean("comment_moderation_enabled").default(false).notNull(),
  reviewModerationEnabled: boolean("review_moderation_enabled").default(false).notNull(),
  submissionModerationEnabled: boolean("submission_moderation_enabled").default(true).notNull(),
  rankingModerationEnabled: boolean("ranking_moderation_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const aircraftCategoriesTable = pgTable(
  "aircraft_categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("aircraft_categories_slug_unique").on(table.slug)
  })
);

export const brandsTable = pgTable(
  "brands",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    categoryId: text("category_id").references(() => aircraftCategoriesTable.id, {
      onDelete: "set null"
    }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("brands_slug_unique").on(table.slug)
  })
);

export const aircraftModelsTable = pgTable(
  "aircraft_models",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => aircraftCategoriesTable.id, { onDelete: "restrict" }),
    brandId: text("brand_id")
      .notNull()
      .references(() => brandsTable.id, { onDelete: "restrict" }),
    powerType: text("power_type").notNull(),
    summary: text("summary"),
    description: text("description"),
    maxFlightTimeMinutes: integer("max_flight_time_minutes"),
    maxRangeKilometers: integer("max_range_kilometers"),
    maxSpeedKph: integer("max_speed_kph"),
    takeoffWeightGrams: integer("takeoff_weight_grams"),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("aircraft_models_slug_unique").on(table.slug)
  })
);

export const contentCategoriesTable = pgTable(
  "content_categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("content_categories_slug_unique").on(table.slug)
  })
);

export const aircraftReviewsTable = pgTable(
  "aircraft_reviews",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull()
      .references(() => aircraftModelsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    rating: integer("rating"),
    content: text("content"),
    status: text("status").default("visible").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    modelUserUnique: uniqueIndex("aircraft_reviews_model_user_unique").on(
      table.modelId,
      table.userId
    )
  })
);

export const aircraftModelInteractionsTable = pgTable(
  "aircraft_model_interactions",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull()
      .references(() => aircraftModelsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    modelUserTypeUnique: uniqueIndex("aircraft_model_interactions_model_user_type_unique").on(
      table.modelId,
      table.userId,
      table.type
    )
  })
);

export const reviewCommentsTable = pgTable(
  "review_comments",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => aircraftReviewsTable.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    parentCommentId: text("parent_comment_id"),
    replyToCommentId: text("reply_to_comment_id"),
    replyToUserId: text("reply_to_user_id").references(() => usersTable.id, {
      onDelete: "set null"
    }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    parentCommentFk: foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id]
    }).onDelete("cascade"),
    replyToCommentFk: foreignKey({
      columns: [table.replyToCommentId],
      foreignColumns: [table.id]
    }).onDelete("cascade")
  })
);

export const postsTable = pgTable("posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").default("moment").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentHtml: text("content_html"),
  contentPlainText: text("content_plain_text"),
  contentCategoryId: text("content_category_id").references(() => contentCategoriesTable.id, {
    onDelete: "set null"
  }),
  status: text("status").default("pending").notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  favoriteCount: integer("favorite_count").default(0).notNull(),
  shareCount: integer("share_count").default(0).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const postCommentsTable = pgTable(
  "post_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    parentCommentId: text("parent_comment_id"),
    replyToCommentId: text("reply_to_comment_id"),
    replyToUserId: text("reply_to_user_id").references(() => usersTable.id, {
      onDelete: "set null"
    }),
    content: text("content").notNull(),
    status: text("status").default("visible").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    parentCommentFk: foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id]
    }).onDelete("cascade"),
    replyToCommentFk: foreignKey({
      columns: [table.replyToCommentId],
      foreignColumns: [table.id]
    }).onDelete("cascade")
  })
);

export const postReportsTable = pgTable(
  "post_reports",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    postReporterUnique: uniqueIndex("post_reports_post_reporter_unique").on(
      table.postId,
      table.reporterId
    )
  })
);

export const postImagesTable = pgTable("post_images", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => postsTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  dataUrl: text("data_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const videoAssetsTable = pgTable("video_assets", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => postsTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  dataUrl: text("data_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const userFollowsTable = pgTable(
  "user_follows",
  {
    id: text("id").primaryKey(),
    followerId: text("follower_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    followeeId: text("followee_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    followerFolloweeUnique: uniqueIndex("user_follows_follower_followee_unique").on(
      table.followerId,
      table.followeeId
    )
  })
);

export const postInteractionsTable = pgTable(
  "post_interactions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    postUserTypeUnique: uniqueIndex("post_interactions_post_user_type_unique").on(
      table.postId,
      table.userId,
      table.type
    )
  })
);

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  actorId: text("actor_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  postId: text("post_id").references(() => postsTable.id, { onDelete: "cascade" }),
  commentId: text("comment_id").references(() => postCommentsTable.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const aircraftSubmissionsTable = pgTable("aircraft_submissions", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").default("submitted").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => aircraftCategoriesTable.id, { onDelete: "restrict" }),
  brandId: text("brand_id").references(() => brandsTable.id, {
    onDelete: "set null"
  }),
  proposedBrandName: text("proposed_brand_name"),
  modelName: text("model_name").notNull(),
  powerType: text("power_type").notNull(),
  summary: text("summary"),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  galleryImageUrls: text("gallery_image_urls").default("[]").notNull(),
  videoAssetId: text("video_asset_id").references(() => videoAssetsTable.id, {
    onDelete: "set null"
  }),
  maxFlightTimeMinutes: integer("max_flight_time_minutes"),
  maxRangeKilometers: integer("max_range_kilometers"),
  maxSpeedKph: integer("max_speed_kph"),
  takeoffWeightGrams: integer("takeoff_weight_grams"),
  approvedModelId: text("approved_model_id").references(() => aircraftModelsTable.id, {
    onDelete: "set null"
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const rankingsTable = pgTable("rankings", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").default("community").notNull(),
  status: text("status").default("published").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverImageUrl: text("cover_image_url"),
  itemAddPolicy: text("item_add_policy").default("owner").notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const rankingItemsTable = pgTable("ranking_items", {
  id: text("id").primaryKey(),
  rankingId: text("ranking_id")
    .notNull()
    .references(() => rankingsTable.id, { onDelete: "cascade" }),
  linkedModelId: text("linked_model_id").references(() => aircraftModelsTable.id, {
    onDelete: "set null"
  }),
  rank: integer("rank").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  imageUrl: text("image_url"),
  brandName: text("brand_name"),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const rankingCommentsTable = pgTable("ranking_comments", {
  id: text("id").primaryKey(),
  rankingId: text("ranking_id")
    .notNull()
    .references(() => rankingsTable.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const rankingItemRatingsTable = pgTable(
  "ranking_item_ratings",
  {
    id: text("id").primaryKey(),
    rankingItemId: text("ranking_item_id")
      .notNull()
      .references(() => rankingItemsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    rankingItemUserUnique: uniqueIndex("ranking_item_ratings_item_user_unique").on(
      table.rankingItemId,
      table.userId
    )
  })
);

export const rankingItemCommentsTable = pgTable(
  "ranking_item_comments",
  {
    id: text("id").primaryKey(),
    rankingItemId: text("ranking_item_id")
      .notNull()
      .references(() => rankingItemsTable.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    rankingItemAuthorUnique: uniqueIndex("ranking_item_comments_item_author_unique").on(
      table.rankingItemId,
      table.authorId
    )
  })
);
