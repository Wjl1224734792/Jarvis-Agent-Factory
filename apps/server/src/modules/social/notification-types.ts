export type NotificationCategory =
  | "likes_and_favorites"
  | "new_followers"
  | "comments_and_mentions"
  | "system";

export type NotificationType =
  | "followed"
  | "post_liked"
  | "post_favorited"
  | "post_shared"
  | "post_commented"
  | "comment_replied"
  | "post_status_changed"
  | "review_status_changed"
  | "ranking_status_changed"
  | "rating_target_status_changed"
  | "aircraft_submission_status_changed"
  | "brand_application_status_changed";

export type NotificationTargetType =
  | "user"
  | "post"
  | "comment"
  | "ranking"
  | "rating_target"
  | "aircraft_submission"
  | "brand_application"
  | "status";

export const NOTIFICATION_CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  followed: "new_followers",
  post_liked: "likes_and_favorites",
  post_favorited: "likes_and_favorites",
  post_shared: "likes_and_favorites",
  post_commented: "comments_and_mentions",
  comment_replied: "comments_and_mentions",
  post_status_changed: "system",
  review_status_changed: "system",
  ranking_status_changed: "system",
  rating_target_status_changed: "system",
  aircraft_submission_status_changed: "system",
  brand_application_status_changed: "system"
};

const NOTIFICATION_TYPES = Object.keys(
  NOTIFICATION_CATEGORY_BY_TYPE
) as NotificationType[];

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && NOTIFICATION_TYPES.includes(value as NotificationType);
}

export function normalizeCategory(
  value: unknown,
  type: NotificationType
): NotificationCategory {
  if (
    value === "likes_and_favorites" ||
    value === "new_followers" ||
    value === "comments_and_mentions" ||
    value === "system"
  ) {
    return value;
  }

  return NOTIFICATION_CATEGORY_BY_TYPE[type];
}
