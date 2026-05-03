/**
 * 类型守卫工具函数
 *
 * 用于替代 `as` 类型断言，在运行时验证枚举值合法性，
 * 避免非法值绕过 TypeScript 类型检查导致运行时错误。
 *
 * 所有守卫均为纯函数，不产生副作用。
 */

import type {
  AuthRole,
  PostType,
  PostStatus,
  PostCommentStatus,
  PostInteractionType,
  FeedTab,
  RankingType,
  RankingStatus,
  RatingTargetAddPolicy,
  NotificationType,
  ProfileVisibility,
  AircraftSubmissionStatus,
  BrandApplicationStatus
} from "@feijia/schemas";
import type { ReviewStatus } from "@feijia/schemas";

// 以下类型未从 @feijia/schemas 导出，但在后端多处使用，在此本地定义
type CommentSort = "hot" | "latest";
type RankingCommentStatus = "pending" | "visible" | "hidden";
type ReviewCommentStatus = "pending" | "visible" | "hidden";

// ─────────────────────────────────────────────
// 基础类型守卫
// ─────────────────────────────────────────────

const AUTH_ROLE_VALUES: readonly AuthRole[] = ["user", "admin"];

/** 验证值是否为合法的 AuthRole */
export function isValidAuthRole(value: unknown): value is AuthRole {
  return typeof value === "string" && (AUTH_ROLE_VALUES as readonly string[]).includes(value);
}

const POST_TYPE_VALUES: readonly PostType[] = ["article", "moment"];

/** 验证值是否为合法的 PostType */
export function isValidPostType(value: unknown): value is PostType {
  return typeof value === "string" && (POST_TYPE_VALUES as readonly string[]).includes(value);
}

const POST_STATUS_VALUES: readonly PostStatus[] = ["pending", "published", "rejected", "hidden"];

/** 验证值是否为合法的 PostStatus */
export function isValidPostStatus(value: unknown): value is PostStatus {
  return typeof value === "string" && (POST_STATUS_VALUES as readonly string[]).includes(value);
}

const POST_COMMENT_STATUS_VALUES: readonly PostCommentStatus[] = ["pending", "visible", "hidden"];

/** 验证值是否为合法的 PostCommentStatus */
export function isValidPostCommentStatus(value: unknown): value is PostCommentStatus {
  return typeof value === "string" && (POST_COMMENT_STATUS_VALUES as readonly string[]).includes(value);
}

const POST_INTERACTION_TYPE_VALUES: readonly PostInteractionType[] = ["like", "favorite", "share"];

/** 验证值是否为合法的 PostInteractionType */
export function isValidPostInteractionType(value: unknown): value is PostInteractionType {
  return typeof value === "string" && (POST_INTERACTION_TYPE_VALUES as readonly string[]).includes(value);
}

const FEED_TAB_VALUES: readonly FeedTab[] = ["recommended", "latest", "following"];

/** 验证值是否为合法的 FeedTab */
export function isValidFeedTab(value: unknown): value is FeedTab {
  return typeof value === "string" && (FEED_TAB_VALUES as readonly string[]).includes(value);
}

const COMMENT_SORT_VALUES: readonly CommentSort[] = ["hot", "latest"];

/** 验证值是否为合法的 CommentSort */
export function isValidCommentSort(value: unknown): value is CommentSort {
  return typeof value === "string" && (COMMENT_SORT_VALUES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────
// 评测相关类型守卫
// ─────────────────────────────────────────────

const REVIEW_STATUS_VALUES: readonly ReviewStatus[] = ["pending", "visible", "hidden"];

/** 验证值是否为合法的 ReviewStatus */
export function isValidReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && (REVIEW_STATUS_VALUES as readonly string[]).includes(value);
}

const REVIEW_COMMENT_STATUS_VALUES: readonly ReviewCommentStatus[] = ["pending", "visible", "hidden"];

/** 验证值是否为合法的 ReviewCommentStatus */
export function isValidReviewCommentStatus(value: unknown): value is ReviewCommentStatus {
  return typeof value === "string" && (REVIEW_COMMENT_STATUS_VALUES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────
// 排行相关类型守卫
// ─────────────────────────────────────────────

const RANKING_TYPE_VALUES: readonly RankingType[] = ["official", "community"];

/** 验证值是否为合法的 RankingType */
export function isValidRankingType(value: unknown): value is RankingType {
  return typeof value === "string" && (RANKING_TYPE_VALUES as readonly string[]).includes(value);
}

const RANKING_STATUS_VALUES: readonly RankingStatus[] = ["pending", "published", "rejected", "hidden"];

/** 验证值是否为合法的 RankingStatus */
export function isValidRankingStatus(value: unknown): value is RankingStatus {
  return typeof value === "string" && (RANKING_STATUS_VALUES as readonly string[]).includes(value);
}

const RANKING_COMMENT_STATUS_VALUES: readonly RankingCommentStatus[] = ["pending", "visible", "hidden"];

/** 验证值是否为合法的 RankingCommentStatus */
export function isValidRankingCommentStatus(value: unknown): value is RankingCommentStatus {
  return typeof value === "string" && (RANKING_COMMENT_STATUS_VALUES as readonly string[]).includes(value);
}

const RATING_TARGET_ADD_POLICY_VALUES: readonly RatingTargetAddPolicy[] = ["public", "owner"];

/** 验证值是否为合法的 RatingTargetAddPolicy */
export function isValidRatingTargetAddPolicy(value: unknown): value is RatingTargetAddPolicy {
  return typeof value === "string" && (RATING_TARGET_ADD_POLICY_VALUES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────
// 社交相关类型守卫
// ─────────────────────────────────────────────

const NOTIFICATION_TYPE_VALUES: readonly NotificationType[] = [
  "followed",
  "post_liked",
  "post_favorited",
  "post_shared",
  "post_commented",
  "comment_replied",
  "post_status_changed",
  "ranking_status_changed",
  "rating_target_status_changed",
  "aircraft_submission_status_changed",
  "brand_application_status_changed",
  "post_audit_result",
  "review_audit_result",
  "ranking_audit_result",
  "rating_target_audit_result",
  "aircraft_submission_audit_result",
  "brand_application_audit_result"
];

/** 验证值是否为合法的 NotificationType */
export function isValidNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && (NOTIFICATION_TYPE_VALUES as readonly string[]).includes(value);
}

const PROFILE_VISIBILITY_VALUES: readonly ProfileVisibility[] = ["community", "followers", "private"];

/** 验证值是否为合法的 ProfileVisibility */
export function isValidProfileVisibility(value: unknown): value is ProfileVisibility {
  return typeof value === "string" && (PROFILE_VISIBILITY_VALUES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────
// 机型/品牌相关类型守卫
// ─────────────────────────────────────────────

const AIRCRAFT_SUBMISSION_STATUS_VALUES: readonly AircraftSubmissionStatus[] = [
  "draft",
  "submitted",
  "approved",
  "rejected"
];

/** 验证值是否为合法的 AircraftSubmissionStatus */
export function isValidAircraftSubmissionStatus(value: unknown): value is AircraftSubmissionStatus {
  return typeof value === "string" && (AIRCRAFT_SUBMISSION_STATUS_VALUES as readonly string[]).includes(value);
}

const BRAND_APPLICATION_STATUS_VALUES: readonly BrandApplicationStatus[] = [
  "pending",
  "approved",
  "rejected"
];

/** 验证值是否为合法的 BrandApplicationStatus */
export function isValidBrandApplicationStatus(value: unknown): value is BrandApplicationStatus {
  return typeof value === "string" && (BRAND_APPLICATION_STATUS_VALUES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────
// 本地类型守卫（非 @feijia/schemas 导出）
// ─────────────────────────────────────────────

const SESSION_SCOPE_VALUES: readonly string[] = ["web", "admin", "app"];

/** 验证值是否为合法的 SessionScope */
export function isValidSessionScope(value: unknown): value is "web" | "admin" | "app" {
  return typeof value === "string" && SESSION_SCOPE_VALUES.includes(value);
}

// ─────────────────────────────────────────────
// 安全断言辅助
// ─────────────────────────────────────────────

/**
 * 安全地将字符串断言为指定联合类型。
 *
 * 当值不合法时返回 fallback（默认第一个合法值），而非抛出异常。
 * 适用于数据库 text 字段转枚举等需要容错的场景。
 */
export function safeAssertEnum<T extends string>(
  value: unknown,
  validValues: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && validValues.includes(value as T)
    ? (value as T)
    : fallback;
}
