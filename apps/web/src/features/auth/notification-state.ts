export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function hasUnreadNotifications(unreadCount?: number) {
  return typeof unreadCount === "number" && unreadCount > 0;
}

export function shouldFetchNotifications(
  authStatus: "idle" | "loading" | "authenticated" | "anonymous",
  isBootstrapped: boolean
) {
  return isBootstrapped && authStatus === "authenticated";
}

export function getNotificationNavTone(unreadCount?: number) {
  return hasUnreadNotifications(unreadCount) ? "unread" : "default";
}
