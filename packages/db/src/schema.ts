import {
  boolean,
  check,  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    displayName: text("display_name").notNull(),
    avatarFileId: text("avatar_file_id"),
    coverImageFileId: text("cover_image_file_id"),
    bio: text("bio"),
    phone: text("phone"),
    // 仅预留微信身份标识，后续真正接入微信登录时再补完整鉴权流程。
    wechatOpenId: text("wechat_open_id"),
    wechatUnionId: text("wechat_union_id"),
    account: text("account"),
    passwordHash: text("password_hash"),
    status: text("status").default("active").notNull(),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    bannedUntil: timestamp("banned_until", { withTimezone: true }),
    banReason: text("ban_reason"),
    bannedBy: text("banned_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    displayNameUnique: uniqueIndex("users_display_name_unique").on(table.displayName),
    phoneUnique: uniqueIndex("users_phone_unique").on(table.phone),
    wechatOpenIdUnique: uniqueIndex("users_wechat_open_id_unique").on(
      table.wechatOpenId
    ),
    wechatUnionIdUnique: uniqueIndex("users_wechat_union_id_unique").on(
      table.wechatUnionId
    ),
    accountUnique: uniqueIndex("users_account_unique").on(table.account),
    statusIdx: index("users_status_idx").on(table.status),
    roleCheck: check("users_role_check", sql`${table.role} IN ('user', 'admin')`),
    statusCheck: check("users_status_check", sql`${table.status} IN ('active', 'banned')`)
  })
);

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull(),
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
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  scopeCheck: check("sessions_scope_check", sql`${table.scope} IN ('web', 'app', 'admin')`)
}));

export const devicesTable = pgTable("devices", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull(),
  deviceType: text("device_type").notNull(),
  deviceLabel: text("device_label"),
  pushToken: text("push_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  userPushTokenUnique: uniqueIndex("devices_user_push_token_idx").on(table.userId, table.pushToken)
}));

export const userSettingsTable = pgTable(
  "user_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull(),
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
  articleModerationEnabled: boolean("article_moderation_enabled").default(true).notNull(),
  momentModerationEnabled: boolean("moment_moderation_enabled").default(true).notNull(),
  brandModerationEnabled: boolean("brand_moderation_enabled").default(true).notNull(),
  modelModerationEnabled: boolean("model_moderation_enabled").default(true).notNull(),
  ratingTargetModerationEnabled: boolean("rating_target_moderation_enabled")
    .default(true)
    .notNull(),
  moderationModes: text("moderation_modes").default("{}").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const auditRecordsTable = pgTable("audit_records", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull(),
  entityId: text("entity_id").notNull(),
  contentType: text("content_type").notNull(),
  provider: text("provider").default("qiniu").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  suggestion: text("suggestion"),
  scene: text("scene"),
  requestId: text("request_id"),
  taskId: text("task_id"),
  detailLabels: text("detail_labels").default("[]").notNull(),
  sceneSuggestions: text("scene_suggestions").default("{}").notNull(),
  rawPayload: text("raw_payload").default("{}").notNull(),
  errorMessage: text("error_message"),
  callbackReceivedAt: timestamp("callback_received_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  domainEntityIdx: index("audit_records_domain_entity_idx").on(table.domain, table.entityId),
  statusIdx: index("audit_records_status_idx").on(table.status),
  providerIdx: index("audit_records_provider_idx").on(table.provider),
  contentTypeCheck: check(
    "audit_records_content_type_check",
    sql`${table.contentType} IN ('text', 'image', 'video', 'mixed')`
  ),
  providerCheck: check(
    "audit_records_provider_check",
    sql`${table.provider} IN ('qiniu')`
  ),
  modeCheck: check(
    "audit_records_mode_check",
    sql`${table.mode} IN ('ai', 'manual', 'automatic')`
  ),
  statusCheck: check(
    "audit_records_status_check",
    sql`${table.status} IN ('queued', 'running', 'passed', 'rejected', 'needs_manual_review', 'failed', 'manual_passed', 'manual_rejected')`
  )
}));

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
    categoryId: text("category_id"),
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

export const brandApplicationsTable = pgTable("brand_applications", {
  id: text("id").primaryKey(),
  applicantId: text("applicant_id")
    .notNull(),
  status: text("status").default("pending").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  rejectionReason: text("rejection_reason"),
  approvedBrandId: text("approved_brand_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  statusCheck: check("brand_applications_status_check", sql`${table.status} IN ('pending', 'approved', 'rejected')`)
}));

export const aircraftModelsTable = pgTable(
  "aircraft_models",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categoryId: text("category_id")
      .notNull(),
    brandId: text("brand_id")
      .notNull(),
    ownerId: text("owner_id"),
    sourceSubmissionId: text("source_submission_id"),
    powerType: text("power_type").notNull(),
    lifecycleStatus: text("lifecycle_status").default("unreleased").notNull(),
    summary: text("summary"),
    description: text("description"),
    priceMin: integer("price_min"),
    priceMax: integer("price_max"),
    maxFlightTimeMinutes: integer("max_flight_time_minutes"),
    maxRangeKilometers: integer("max_range_kilometers"),
    maxSpeedKph: integer("max_speed_kph"),
    takeoffWeightGrams: integer("takeoff_weight_grams"),
    coverImageFileId: text("cover_image_file_id"),
    galleryImageFileIds: text("gallery_image_file_ids").default("[]").notNull(),
    videoFileId: text("video_file_id"),
    reportCount: integer("report_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("aircraft_models_slug_unique").on(table.slug)
  })
);

export const aircraftModelReportsTable = pgTable(
  "aircraft_model_reports",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    modelReporterUnique: uniqueIndex("aircraft_model_reports_model_reporter_unique").on(
      table.modelId,
      table.reporterId
    )
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
      .notNull(),
    userId: text("user_id")
      .notNull(),
    rating: integer("rating"),
    content: text("content"),
    status: text("status").default("visible").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    reportCount: integer("report_count").default(0).notNull(),
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
    ),
    statusCheck: check("aircraft_reviews_status_check", sql`${table.status} IN ('pending', 'visible', 'hidden')`)
  })
);

export const aircraftReviewLikesTable = pgTable(
  "aircraft_review_likes",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    reviewUserUnique: uniqueIndex("aircraft_review_likes_review_user_unique").on(
      table.reviewId,
      table.userId
    )
  })
);

export const aircraftReviewReportsTable = pgTable(
  "aircraft_review_reports",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    reviewReporterUnique: uniqueIndex("aircraft_review_reports_review_reporter_unique").on(
      table.reviewId,
      table.reporterId
    )
  })
);

export const aircraftModelInteractionsTable = pgTable(
  "aircraft_model_interactions",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
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
      .notNull(),
    authorId: text("author_id")
      .notNull(),
    parentCommentId: text("parent_comment_id"),
    replyToCommentId: text("reply_to_comment_id"),
    replyToUserId: text("reply_to_user_id"),
    content: text("content").notNull(),
    status: text("status").default("visible").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    reportCount: integer("report_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    statusCheck: check("review_comments_status_check", sql`${table.status} IN ('pending', 'visible', 'hidden')`)
  })
);

export const reviewCommentLikesTable = pgTable(
  "review_comment_likes",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentUserUnique: uniqueIndex("review_comment_likes_comment_user_unique").on(
      table.commentId,
      table.userId
    )
  })
);

export const reviewCommentReportsTable = pgTable(
  "review_comment_reports",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentReporterUnique: uniqueIndex("review_comment_reports_comment_reporter_unique").on(
      table.commentId,
      table.reporterId
    )
  })
);

export const postsTable = pgTable("posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull(),
  type: text("type").default("moment").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentHtml: text("content_html"),
  contentPlainText: text("content_plain_text"),
  sourceLabel: text("source_label"),
  sourceUrl: text("source_url"),
  contentCategoryId: text("content_category_id"),
  coverImageFileId: text("cover_image_file_id"),
  status: text("status").default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  commentCount: integer("comment_count").default(0).notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  favoriteCount: integer("favorite_count").default(0).notNull(),
  shareCount: integer("share_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  typeCheck: check("posts_type_check", sql`${table.type} IN ('article', 'moment')`),
  statusCheck: check("posts_status_check", sql`${table.status} IN ('pending', 'published', 'rejected', 'hidden')`),
  feedStatusTypeSeekIdx: index("posts_feed_status_type_seek_idx").on(
    table.type,
    sql`coalesce(${table.publishedAt}, ${table.createdAt}) desc`,
    table.id.desc()
  ).where(sql`${table.status} = 'published'`),
  feedCategoryStatusTypeSeekIdx: index("posts_feed_category_status_type_seek_idx").on(
    table.contentCategoryId,
    table.type,
    sql`coalesce(${table.publishedAt}, ${table.createdAt}) desc`,
    table.id.desc()
  ).where(sql`${table.status} = 'published'`)
}));

export const postCommentsTable = pgTable(
  "post_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull(),
    authorId: text("author_id")
      .notNull(),
    parentCommentId: text("parent_comment_id"),
    replyToCommentId: text("reply_to_comment_id"),
    replyToUserId: text("reply_to_user_id"),
    content: text("content").notNull(),
    status: text("status").default("visible").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    reportCount: integer("report_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    statusCheck: check("post_comments_status_check", sql`${table.status} IN ('pending', 'visible', 'hidden')`)
  })
);

export const postCommentLikesTable = pgTable(
  "post_comment_likes",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentUserUnique: uniqueIndex("post_comment_likes_comment_user_unique").on(
      table.commentId,
      table.userId
    )
  })
);

export const postCommentReportsTable = pgTable(
  "post_comment_reports",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentReporterUnique: uniqueIndex("post_comment_reports_comment_reporter_unique").on(
      table.commentId,
      table.reporterId
    )
  })
);

export const postReportsTable = pgTable(
  "post_reports",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
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

export const userFollowsTable = pgTable(
  "user_follows",
  {
    id: text("id").primaryKey(),
    followerId: text("follower_id")
      .notNull(),
    followeeId: text("followee_id")
      .notNull(),
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
      .notNull(),
    userId: text("user_id")
      .notNull(),
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
  userId: text("user_id").notNull(),
  actorId: text("actor_id"),
  category: text("category").default("comments_and_mentions").notNull(),
  type: text("type").notNull(),
  targetType: text("target_type").default("status").notNull(),
  targetId: text("target_id").default("status").notNull(),
  targetTitle: text("target_title").default("状态更新").notNull(),
  targetStatus: text("target_status"),
  title: text("title").default("系统消息").notNull(),
  summary: text("summary").default("状态已更新").notNull(),
  preview: text("preview"),
  metadata: text("metadata").default("{}").notNull(),
  postId: text("post_id"),
  commentId: text("comment_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const aircraftSubmissionsTable = pgTable("aircraft_submissions", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull(),
  status: text("status").default("submitted").notNull(),
  categoryId: text("category_id")
    .notNull(),
  brandId: text("brand_id"),
  proposedBrandName: text("proposed_brand_name"),
  modelName: text("model_name").notNull(),
  powerType: text("power_type").notNull(),
  lifecycleStatus: text("lifecycle_status").default("unreleased").notNull(),
  summary: text("summary"),
  description: text("description"),
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  rejectionReason: text("rejection_reason"),
  coverImageFileId: text("cover_image_file_id"),
  galleryImageFileIds: text("gallery_image_file_ids").default("[]").notNull(),
  videoFileId: text("video_file_id"),
  maxFlightTimeMinutes: integer("max_flight_time_minutes"),
  maxRangeKilometers: integer("max_range_kilometers"),
  maxSpeedKph: integer("max_speed_kph"),
  takeoffWeightGrams: integer("takeoff_weight_grams"),
  approvedModelId: text("approved_model_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  statusCheck: check("aircraft_submissions_status_check", sql`${table.status} IN ('submitted', 'approved', 'rejected')`)
}));

export const rankingsTable = pgTable("rankings", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull(),
  type: text("type").default("community").notNull(),
  status: text("status").default("published").notNull(),
  rejectionReason: text("rejection_reason"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverImageFileId: text("cover_image_file_id"),
  itemAddPolicy: text("item_add_policy").default("owner").notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  typeCheck: check("rankings_type_check", sql`${table.type} IN ('community', 'official')`),
  statusCheck: check("rankings_status_check", sql`${table.status} IN ('pending', 'published', 'rejected', 'hidden')`)
}));

export const rankingReportsTable = pgTable(
  "ranking_reports",
  {
    id: text("id").primaryKey(),
    rankingId: text("ranking_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    rankingReporterUnique: uniqueIndex("ranking_reports_ranking_reporter_unique").on(
      table.rankingId,
      table.reporterId
    )
  })
);

export const ratingTargetsTable = pgTable("rating_targets", {
  id: text("id").primaryKey(),
  rankingId: text("ranking_id")
    .notNull(),
  authorId: text("author_id")
    .notNull(),
  linkedModelId: text("linked_model_id"),
  status: text("status").default("published").notNull(),
  rejectionReason: text("rejection_reason"),
  rank: integer("rank").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  imageFileId: text("image_file_id"),
  brandName: text("brand_name"),
  commentCount: integer("comment_count").default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  statusCheck: check("rating_targets_status_check", sql`${table.status} IN ('pending', 'published', 'rejected', 'hidden')`)
}));

export const ratingTargetReportsTable = pgTable(
  "rating_target_reports",
  {
    id: text("id").primaryKey(),
    ratingTargetId: text("rating_target_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    ratingTargetReporterUnique: uniqueIndex("rating_target_reports_target_reporter_unique").on(
      table.ratingTargetId,
      table.reporterId
    )
  })
);

export const rankingCommentsTable = pgTable("ranking_comments", {
  id: text("id").primaryKey(),
  rankingId: text("ranking_id")
    .notNull(),
  authorId: text("author_id")
    .notNull(),
  content: text("content").notNull(),
  status: text("status").default("visible").notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  statusCheck: check("ranking_comments_status_check", sql`${table.status} IN ('pending', 'visible', 'hidden')`)
}));

export const rankingCommentLikesTable = pgTable(
  "ranking_comment_likes",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentUserUnique: uniqueIndex("ranking_comment_likes_comment_user_unique").on(
      table.commentId,
      table.userId
    )
  })
);

export const rankingCommentReportsTable = pgTable(
  "ranking_comment_reports",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentReporterUnique: uniqueIndex("ranking_comment_reports_comment_reporter_unique").on(
      table.commentId,
      table.reporterId
    )
  })
);

export const ratingTargetRatingsTable = pgTable(
  "rating_target_ratings",
  {
    id: text("id").primaryKey(),
    ratingTargetId: text("rating_target_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    ratingTargetUserUnique: uniqueIndex("rating_target_ratings_target_user_unique").on(
      table.ratingTargetId,
      table.userId
    )
  })
);

export const ratingTargetCommentsTable = pgTable(
  "rating_target_comments",
  {
    id: text("id").primaryKey(),
    ratingTargetId: text("rating_target_id")
      .notNull(),
    authorId: text("author_id")
      .notNull(),
    parentCommentId: text("parent_comment_id"),
    replyToCommentId: text("reply_to_comment_id"),
    replyToUserId: text("reply_to_user_id"),
    content: text("content").notNull(),
    rating: integer("rating"),
    status: text("status").default("visible").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    reportCount: integer("report_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    statusCheck: check("rating_target_comments_status_check", sql`${table.status} IN ('pending', 'visible', 'hidden')`)
  })
);

export const ratingTargetCommentLikesTable = pgTable(
  "rating_target_comment_likes",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentUserUnique: uniqueIndex("rating_target_comment_likes_comment_user_unique").on(
      table.commentId,
      table.userId
    )
  })
);

export const ratingTargetCommentReportsTable = pgTable(
  "rating_target_comment_reports",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentReporterUnique: uniqueIndex("rating_target_comment_reports_comment_reporter_unique").on(
      table.commentId,
      table.reporterId
    )
  })
);

export const aircraftModelCommentsTable = pgTable(
  "aircraft_model_comments",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull(),
    authorId: text("author_id")
      .notNull(),
    parentCommentId: text("parent_comment_id"),
    replyToCommentId: text("reply_to_comment_id"),
    replyToUserId: text("reply_to_user_id"),
    content: text("content").notNull(),
    status: text("status").default("visible").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    reportCount: integer("report_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    statusCheck: check("aircraft_model_comments_status_check", sql`${table.status} IN ('pending', 'visible', 'hidden')`)
  })
);

export const aircraftModelCommentLikesTable = pgTable(
  "aircraft_model_comment_likes",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    userId: text("user_id")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentUserUnique: uniqueIndex("aircraft_model_comment_likes_comment_user_unique").on(
      table.commentId,
      table.userId
    )
  })
);

export const aircraftModelCommentReportsTable = pgTable(
  "aircraft_model_comment_reports",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull(),
    reporterId: text("reporter_id")
      .notNull(),
    reason: text("reason").notNull(),
    imageFileIds: text("image_file_ids").default("[]").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    commentReporterUnique: uniqueIndex("aircraft_model_comment_reports_comment_reporter_unique").on(
      table.commentId,
      table.reporterId
    )
  })
);

export const filesTable = pgTable("files", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull(),
  postId: text("post_id"),
  bizType: text("biz_type").notNull(),
  mediaKind: text("media_kind").notNull(),
  provider: text("provider").notNull(),
  bucket: text("bucket").notNull(),
  region: text("region"),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  etag: text("etag"),
  status: text("status").notNull(),
  currentAuditRecordId: text("current_audit_record_id"),
  currentAuditStatus: text("current_audit_status"),
  currentAuditUpdatedAt: timestamp("current_audit_updated_at", { withTimezone: true }),
  visibility: text("visibility").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
}, (table) => ({
  statusCheck: check("files_status_check", sql`${table.status} IN ('pending', 'uploaded', 'failed', 'deleted')`),
  visibilityCheck: check("files_visibility_check", sql`${table.visibility} IN ('public', 'private')`),
  mediaKindCheck: check("files_media_kind_check", sql`${table.mediaKind} IN ('image', 'video', 'document')`),
  currentAuditStatusCheck: check(
    "files_current_audit_status_check",
    sql`${table.currentAuditStatus} IS NULL OR ${table.currentAuditStatus} IN ('queued', 'running', 'passed', 'rejected', 'needs_manual_review', 'failed', 'manual_passed', 'manual_rejected')`
  )
}));
