import { describe, expect, it } from "vitest";
import {
  getNotificationNavTone,
  hasUnreadNotifications,
  NOTIFICATIONS_QUERY_KEY
} from "../src/features/auth/notification-state";

describe("notification-state", () => {
  it("treats only positive unread counts as unread state", () => {
    expect(hasUnreadNotifications(undefined)).toBe(false);
    expect(hasUnreadNotifications(0)).toBe(false);
    expect(hasUnreadNotifications(2)).toBe(true);
  });

  it("returns the correct tone for message navigation", () => {
    expect(getNotificationNavTone(0)).toBe("default");
    expect(getNotificationNavTone(1)).toBe("unread");
  });

  it("uses a single shared query key for all notification surfaces", () => {
    expect(NOTIFICATIONS_QUERY_KEY).toEqual(["notifications"]);
  });
});
